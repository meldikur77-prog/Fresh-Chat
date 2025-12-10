
import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { AppScreen, User, Message, Coordinates, FriendStatus } from './types';
import { calculateDistance } from './utils';
import { InterstitialAd } from './components/InterstitialAd';
import { DataService } from './services/database';
import { AdMobService } from './services/admobService';
import { AdMobConfig } from './config/admob';
import { ProfileSetup } from './pages/ProfileSetup';
import { NearbyList } from './pages/NearbyList';
import { Chat } from './pages/Chat';
import { ProfileEdit } from './pages/ProfileEdit';
import { UserDetail } from './pages/UserDetail';

// CONSTANTS
const AD_ACTION_THRESHOLD = 15;

export default function App() {
  // --- STATE ---
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.PROFILE_SETUP);
  
  // My Profile State
  const [myProfile, setMyProfile] = useState<User>({ 
    id: '', 
    name: '', 
    gender: 'Male',
    age: 25,
    bio: '',
    photoUrl: 'https://picsum.photos/seed/setup/200/200',
    interests: [],
    album: [],
    location: { latitude: 0, longitude: 0 },
    friendStatus: FriendStatus.NONE,
    authMethod: 'guest'
  });

  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  
  const [isPremium, setIsPremium] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [listTab, setListTab] = useState<'NEARBY' | 'FRIENDS'>('NEARBY');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [actionCount, setActionCount] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);
  
  // Subscription Refs
  const usersUnsubscribe = useRef<(() => void) | null>(null);
  const chatUnsubscribe = useRef<(() => void) | null>(null);

  // --- EFFECTS ---

  // 1. Initialize AdMob (Native)
  useEffect(() => {
    AdMobService.initialize();
  }, []);

  // 2. Initialize User
  useEffect(() => {
    const savedId = sessionStorage.getItem('fresh_chat_my_id');
    if (savedId) {
      setMyProfile(prev => ({ ...prev, id: savedId }));
      setCurrentScreen(AppScreen.NEARBY_LIST);
    }
  }, []);

  // 3. Subscribe to Users
  useEffect(() => {
    if (!myProfile.id) return;

    usersUnsubscribe.current = DataService.subscribeToUsers(myProfile.id, (users) => {
      const currentId = myProfile.id;
      // Filter out myself
      const others = users.filter(u => u.id !== currentId);
      
      // Update my profile if it changed on server
      const meOnServer = users.find(u => u.id === currentId);
      if (meOnServer) {
        setMyProfile(prev => ({...prev, ...meOnServer}));
      }

      const processedUsers = others.map(u => {
        const chatId = DataService.getChatId(currentId, u.id);
        return {
          ...u,
          distance: calculateDistance(myProfile.location, u.location),
          friendStatus: DataService.getFriendStatus(currentId, u.id),
          unreadCount: DataService.getUnreadCountSync(chatId, currentId)
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setNearbyUsers(processedUsers);
    });

    return () => {
      if (usersUnsubscribe.current) usersUnsubscribe.current();
    };
  }, [myProfile.id, myProfile.location]);


  // 4. Subscribe to Chat Messages
  useEffect(() => {
    if (chatUser && myProfile.id) {
      const chatId = DataService.getChatId(myProfile.id, chatUser.id);
      
      if (chatUnsubscribe.current) chatUnsubscribe.current();

      chatUnsubscribe.current = DataService.subscribeToMessages(chatId, (msgs) => {
        setCurrentChatMessages(msgs);
        
        // Auto Mark Read
        if (currentScreen === AppScreen.CHAT) {
           DataService.markAsRead(chatId, myProfile.id);
        }
      });
    }

    return () => {
      if (chatUnsubscribe.current) chatUnsubscribe.current();
    };
  }, [chatUser?.id, myProfile.id, currentScreen]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- ACTIONS ---

  const trackAction = () => {
    if (isPremium) return;
    setActionCount(prev => {
      const next = prev + 1;
      if (next >= AD_ACTION_THRESHOLD) {
        setShowInterstitial(true);
        AdMobService.showInterstitial(); 
        return 0;
      }
      return next;
    });
  };

  const handleLoginSuccess = (user: User) => {
    DataService.upsertUser(user);
    sessionStorage.setItem('fresh_chat_my_id', user.id);
    setMyProfile(user);
    setCurrentScreen(AppScreen.NEARBY_LIST);
  };

  const openChat = (user: User) => {
    trackAction();
    setChatUser(user);
    setCurrentScreen(AppScreen.CHAT);
  };

  const openUserProfile = (user: User) => {
    trackAction();
    setSelectedUser(user);
    setCurrentScreen(AppScreen.USER_DETAIL);
  };

  const handleAddFriend = (targetUser: User) => {
    trackAction();
    DataService.updateFriendStatus(myProfile.id, targetUser.id, FriendStatus.PENDING);
    setToastMessage(`Friend request sent to ${targetUser.name}`);
  };

  const handleConfirmFriend = (targetUser: User) => {
    trackAction();
    DataService.updateFriendStatus(myProfile.id, targetUser.id, FriendStatus.FRIEND);
    setToastMessage(`You are now friends with ${targetUser.name}!`);
  };

  const sendMessage = (type: 'text' | 'location' = 'text', content?: string | Coordinates) => {
    if (!chatUser || !myProfile.id) return;
    
    trackAction();

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: myProfile.id,
      text: type === 'text' ? (content as string || '') : 'Shared location',
      type: type,
      location: type === 'location' ? (content as Coordinates) : undefined,
      timestamp: Date.now()
    };

    const chatId = DataService.getChatId(myProfile.id, chatUser.id);
    DataService.sendMessage(chatId, newMessage);
  };

  const shareLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendMessage('location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => alert("Unable to retrieve location.")
      );
    }
  };

  const togglePremium = () => {
    setIsPremium(!isPremium);
    if (!isPremium) {
      AdMobService.hideBanner();
    } else {
      AdMobService.showBanner();
    }
  };

  const saveProfileChanges = (updatedUser: User) => {
    setMyProfile(updatedUser);
    DataService.upsertUser(updatedUser);
    trackAction();
    setCurrentScreen(AppScreen.NEARBY_LIST);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('fresh_chat_my_id');
    setMyProfile({ 
      id: '', 
      name: '', 
      gender: 'Male',
      age: 25,
      bio: '',
      photoUrl: 'https://picsum.photos/seed/setup/200/200',
      interests: [],
      album: [],
      location: { latitude: 0, longitude: 0 },
      friendStatus: FriendStatus.NONE,
      authMethod: 'guest'
    });
    setChatUser(null);
    setCurrentScreen(AppScreen.PROFILE_SETUP);
  };

  // --- RENDER ---
  
  return (
    <>
      {showInterstitial && (
        <InterstitialAd 
          onClose={() => setShowInterstitial(false)} 
          adUnitId={AdMobConfig.INTERSTITIAL_ID}
        />
      )}
      
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Check size={12} className="text-emerald-400" /> {toastMessage}
        </div>
      )}

      {currentScreen === AppScreen.PROFILE_SETUP && (
        <ProfileSetup 
          myProfile={myProfile} 
          setMyProfile={setMyProfile} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {currentScreen === AppScreen.NEARBY_LIST && (
        <NearbyList
          myProfile={myProfile}
          nearbyUsers={nearbyUsers}
          isPremium={isPremium}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
          listTab={listTab}
          setListTab={setListTab}
          togglePremium={togglePremium}
          setCurrentScreen={setCurrentScreen}
          openUserProfile={openUserProfile}
          openChat={openChat}
          handleAddFriend={handleAddFriend}
          handleConfirmFriend={handleConfirmFriend}
          trackAction={trackAction}
        />
      )}

      {currentScreen === AppScreen.CHAT && chatUser && (
        <Chat
          myProfile={myProfile}
          chatUser={chatUser}
          messages={currentChatMessages}
          onBack={() => setCurrentScreen(AppScreen.NEARBY_LIST)}
          onSendMessage={sendMessage}
          onShareLocation={shareLocation}
        />
      )}

      {currentScreen === AppScreen.PROFILE_EDIT && (
        <ProfileEdit 
          user={myProfile} 
          onSave={saveProfileChanges} 
          onCancel={() => setCurrentScreen(AppScreen.NEARBY_LIST)} 
          onLogout={handleLogout} 
        />
      )}

      {currentScreen === AppScreen.USER_DETAIL && selectedUser && (
        <UserDetail 
          user={selectedUser} 
          onBack={() => setCurrentScreen(AppScreen.NEARBY_LIST)} 
          onChat={openChat} 
          onAddFriend={handleAddFriend} 
        />
      )}
    </>
  );
}

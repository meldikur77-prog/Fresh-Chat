
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Heart, WifiOff, AlertTriangle, Trophy } from 'lucide-react';
import { AppScreen, User, Message, Coordinates, FriendStatus, FriendshipData } from './types';
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
import { isFirebaseConfigured } from './config/firebase';

// CONSTANTS
const AD_ACTION_THRESHOLD = 15;
const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// --- REPORT MODAL ---
const ReportModal: React.FC<{ 
  user: User; 
  onClose: () => void; 
  onConfirm: (reason: string) => void;
}> = ({ user, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
         <div className="flex items-center gap-2 text-amber-600 font-bold mb-4">
            <AlertTriangle size={20} /> Report User
         </div>
         <p className="text-sm text-slate-600 mb-4">
            Please tell us why you are reporting <strong>{user.name}</strong>. We review all reports within 24 hours.
         </p>
         <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-slate-50 border rounded-xl text-sm mb-4 h-24 resize-none outline-none focus:border-amber-500"
            placeholder="e.g., Harassment, Inappropriate Content..."
         />
         <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl">Cancel</button>
            <button 
              disabled={!reason.trim()}
              onClick={() => onConfirm(reason)} 
              className={`flex-1 py-3 font-bold text-white rounded-xl ${!reason.trim() ? 'bg-slate-300' : 'bg-amber-500'}`}
            >
              Submit Report
            </button>
         </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- STATE ---
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.PROFILE_SETUP);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    authMethod: 'guest',
    hearts: 0,
    views: 0,
    xp: 0,
    level: 1,
    badges: [],
    lastActive: Date.now(),
    blockedUsers: []
  });

  const [rawUsers, setRawUsers] = useState<User[]>([]);
  const [friendships, setFriendships] = useState<Record<string, FriendshipData>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  
  const [isPremium, setIsPremium] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  
  // UPDATED: Added 'CHATS' to the allowed tab types
  const [listTab, setListTab] = useState<'NEARBY' | 'FRIENDS' | 'CHATS'>('NEARBY');
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  const [actionCount, setActionCount] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [reportModalUser, setReportModalUser] = useState<User | null>(null);
  
  // Subscription Refs
  const usersUnsubscribe = useRef<(() => void) | null>(null);
  const friendsUnsubscribe = useRef<(() => void) | null>(null);
  const chatUnsubscribe = useRef<(() => void) | null>(null);
  const unreadUnsubscribe = useRef<(() => void) | null>(null);
  const prevLevelRef = useRef(1);

  // --- EFFECTS ---

  useEffect(() => {
    AdMobService.initialize();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const savedId = sessionStorage.getItem('fresh_chat_my_id');
    if (savedId) {
      setMyProfile(prev => ({ ...prev, id: savedId }));
      setCurrentScreen(AppScreen.NEARBY_LIST);
      DataService.updateLastActive(savedId);
    }
  }, []);

  // LEVEL UP LISTENER
  useEffect(() => {
    if (myProfile.level && myProfile.level > prevLevelRef.current) {
       setLevelUpMessage(`LEVEL UP! You reached Level ${myProfile.level}`);
       setTimeout(() => setLevelUpMessage(null), 4000);
    }
    if (myProfile.level) {
       prevLevelRef.current = myProfile.level;
    }
  }, [myProfile.level]);

  useEffect(() => {
    if (!myProfile.id) return;

    DataService.requestNotificationPermission(myProfile.id);

    // 1. Users Listener
    usersUnsubscribe.current = DataService.subscribeToUsers(myProfile.id, (users) => {
      const meOnServer = users.find(u => u.id === myProfile.id);
      if (meOnServer) {
        setMyProfile(prev => ({...prev, ...meOnServer, blockedUsers: meOnServer.blockedUsers || []}));
      }
      // FILTER LOGIC: Filter out users inactive for more than 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const activeUsers = users.filter(u => (u.lastActive || 0) > sevenDaysAgo);
      setRawUsers(activeUsers);
    });

    // 2. Relationships Listener
    friendsUnsubscribe.current = DataService.subscribeToRelationships(myProfile.id, (rels) => {
      setFriendships(rels);
    });

    // 3. Unread Counts Listener
    unreadUnsubscribe.current = DataService.subscribeToUnreadCounts(myProfile.id, (counts) => {
      setUnreadCounts(counts);
    });

    return () => {
      if (usersUnsubscribe.current) usersUnsubscribe.current();
      if (friendsUnsubscribe.current) friendsUnsubscribe.current();
      if (unreadUnsubscribe.current) unreadUnsubscribe.current();
    };
  }, [myProfile.id]);

  // OPTIMIZED: Derive nearbyUsers with useMemo to prevent double renders
  const nearbyUsers = useMemo(() => {
    if (!myProfile.id) return [];

    const currentId = myProfile.id;
    const blockedList = myProfile.blockedUsers || [];
    
    const others = rawUsers.filter(u => u.id !== currentId && !blockedList.includes(u.id));
    const now = Date.now();

    return others.map(u => {
      const relationship = friendships[u.id] || { status: FriendStatus.NONE };
      const unread = isFirebaseConfigured() 
         ? (unreadCounts[u.id] || 0) 
         : DataService.getUnreadCountSync(DataService.getChatId(currentId, u.id), currentId);
      
      return {
        ...u,
        hearts: u.hearts ?? 0,
        views: u.views ?? 0,
        lastActive: u.lastActive ?? 0,
        xp: u.xp ?? 0,
        level: u.level ?? 1,
        badges: u.badges ?? [],
        distance: calculateDistance(myProfile.location, u.location),
        friendStatus: relationship.status,
        friendRequestInitiator: relationship.initiatedBy,
        streak: relationship.streak || 0, // MERGE STREAK DATA
        unreadCount: unread
      };
    }).sort((a, b) => {
      const aActive = (a.lastActive || 0) > (now - ACTIVE_THRESHOLD_MS);
      const bActive = (b.lastActive || 0) > (now - ACTIVE_THRESHOLD_MS);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (a.distance || 0) - (b.distance || 0);
    });
  }, [rawUsers, friendships, unreadCounts, myProfile.id, myProfile.location, myProfile.blockedUsers]);

  useEffect(() => {
    if (chatUser && myProfile.id) {
      const chatId = DataService.getChatId(myProfile.id, chatUser.id);
      
      if (chatUnsubscribe.current) chatUnsubscribe.current();

      chatUnsubscribe.current = DataService.subscribeToMessages(chatId, (msgs) => {
        setCurrentChatMessages(msgs);
        if (currentScreen === AppScreen.CHAT) {
           DataService.markAsRead(chatId, myProfile.id);
        }
      });
    }
    return () => { if (chatUnsubscribe.current) chatUnsubscribe.current(); };
  }, [chatUser?.id, myProfile.id, currentScreen]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- ACTIONS ---

  const trackAction = () => {
    if (myProfile.id) DataService.updateLastActive(myProfile.id);
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
    const newUser: User = { 
      ...user, 
      hearts: user.hearts ?? 0, 
      views: user.views ?? 0, 
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      badges: user.badges ?? [],
      lastActive: Date.now(),
      blockedUsers: user.blockedUsers ?? []
    };
    DataService.upsertUser(newUser);
    sessionStorage.setItem('fresh_chat_my_id', newUser.id);
    setMyProfile(newUser);
    setCurrentScreen(AppScreen.NEARBY_LIST);
  };

  const openChat = (user: User) => {
    trackAction();
    const relationship = friendships[user.id] || { status: FriendStatus.NONE };
    const updatedUser = { 
      ...user, 
      friendStatus: relationship.status,
      friendRequestInitiator: relationship.initiatedBy
    };
    setChatUser(updatedUser);
    setCurrentScreen(AppScreen.CHAT);
  };

  const openUserProfile = (user: User) => {
    trackAction();
    const relationship = friendships[user.id] || { status: FriendStatus.NONE };
    const updatedUser = { 
      ...user, 
      friendStatus: relationship.status,
      friendRequestInitiator: relationship.initiatedBy,
      streak: relationship.streak || 0
    };
    setSelectedUser(updatedUser);
    setCurrentScreen(AppScreen.USER_DETAIL);
  };

  const handleAddFriend = (targetUser: User) => {
    trackAction();
    DataService.updateFriendStatus(myProfile.id, targetUser.id, FriendStatus.PENDING);
    setToastMessage(`Friend request sent to ${targetUser.name}`);
  };

  const handleSendHeart = (targetUser: User) => {
    trackAction();
    DataService.sendHeart(targetUser.id);
    setToastMessage(`You sent a Heart to ${targetUser.name}!`);
  };

  const handleProfileVisit = (targetUser: User) => {
    if (targetUser.id !== myProfile.id) {
       DataService.trackProfileVisit(targetUser.id);
    }
  };

  const handleConfirmFriend = (targetUser: User) => {
    trackAction();
    DataService.updateFriendStatus(myProfile.id, targetUser.id, FriendStatus.FRIEND);
    setToastMessage(`You are now friends with ${targetUser.name}!`);
  };

  const handleBlockUser = (targetUser: User) => {
    if (confirm(`Block ${targetUser.name}? You won't see them anymore.`)) {
      DataService.blockUser(myProfile.id, targetUser.id);
      setToastMessage(`Blocked ${targetUser.name}`);
      setCurrentScreen(AppScreen.NEARBY_LIST);
    }
  };

  const handleReportUserClick = (targetUser: User) => setReportModalUser(targetUser);

  const submitReport = (reason: string) => {
    if (reportModalUser) {
      DataService.reportUser(myProfile.id, reportModalUser.id, reason);
      setToastMessage("Report submitted. Thank you for keeping us safe.");
      setReportModalUser(null);
    }
  };

  const sendMessage = (type: 'text' | 'location' | 'image' = 'text', content?: string | Coordinates) => {
    if (!chatUser || !myProfile.id) return;
    trackAction();

    let textPreview = 'Sent an image';
    if (type === 'text') textPreview = content as string || '';
    if (type === 'location') textPreview = 'Shared location';

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: myProfile.id,
      text: textPreview,
      type: type,
      location: type === 'location' ? (content as Coordinates) : undefined,
      imageUrl: type === 'image' ? (content as string) : undefined,
      timestamp: Date.now(),
      isRead: false
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
    if (!isPremium) AdMobService.hideBanner();
    else AdMobService.showBanner();
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
      id: '', name: '', gender: 'Male', age: 25, bio: '',
      photoUrl: 'https://picsum.photos/seed/setup/200/200',
      interests: [], album: [], location: { latitude: 0, longitude: 0 },
      friendStatus: FriendStatus.NONE, authMethod: 'guest', blockedUsers: [],
      xp: 0, level: 1, badges: []
    });
    setChatUser(null);
    setCurrentScreen(AppScreen.PROFILE_SETUP);
  };

  const activeSelectedUser = selectedUser ? nearbyUsers.find(u => u.id === selectedUser.id) || selectedUser : null;
  const activeChatUser = chatUser ? nearbyUsers.find(u => u.id === chatUser.id) || chatUser : null;

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold text-center py-1 z-[100] flex items-center justify-center gap-2">
           <WifiOff size={12} /> You are currently offline. Reconnecting...
        </div>
      )}
      
      {/* LEVEL UP NOTIFICATION */}
      {levelUpMessage && (
        <div className="fixed top-12 left-0 right-0 z-[100] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4">
           <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full font-extrabold shadow-xl border-2 border-white flex items-center gap-3 animate-bounce">
              <Trophy size={24} className="fill-yellow-100 text-yellow-800" />
              {levelUpMessage}
           </div>
        </div>
      )}

      {showInterstitial && (
        <InterstitialAd onClose={() => setShowInterstitial(false)} adUnitId={AdMobConfig.INTERSTITIAL_ID} />
      )}
      {reportModalUser && (
        <ReportModal user={reportModalUser} onClose={() => setReportModalUser(null)} onConfirm={submitReport} />
      )}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Check size={12} className="text-emerald-400" /> {toastMessage}
        </div>
      )}
      {currentScreen === AppScreen.PROFILE_SETUP && (
        <ProfileSetup myProfile={myProfile} setMyProfile={setMyProfile} onLoginSuccess={handleLoginSuccess} />
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
      {currentScreen === AppScreen.CHAT && activeChatUser && (
        <Chat
          myProfile={myProfile}
          chatUser={activeChatUser}
          messages={currentChatMessages}
          onBack={() => setCurrentScreen(AppScreen.NEARBY_LIST)}
          onSendMessage={sendMessage}
          onShareLocation={shareLocation}
        />
      )}
      {currentScreen === AppScreen.PROFILE_EDIT && (
        <ProfileEdit user={myProfile} onSave={saveProfileChanges} onCancel={() => setCurrentScreen(AppScreen.NEARBY_LIST)} onLogout={handleLogout} />
      )}
      {currentScreen === AppScreen.USER_DETAIL && activeSelectedUser && (
        <UserDetail 
          user={activeSelectedUser} 
          onBack={() => setCurrentScreen(AppScreen.NEARBY_LIST)} 
          onChat={openChat} 
          onAddFriend={handleAddFriend}
          onSendHeart={handleSendHeart}
          onVisit={handleProfileVisit}
          onBlock={() => handleBlockUser(activeSelectedUser)}
          onReport={() => handleReportUserClick(activeSelectedUser)}
        />
      )}
    </>
  );
}
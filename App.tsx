import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  MessageCircle, 
  User as UserIcon, 
  Settings, 
  Send, 
  ChevronLeft, 
  Crown, 
  Filter,
  Check,
  Camera,
  Save,
  Plus,
  X,
  SlidersHorizontal,
  UserPlus,
  UserCheck,
  Clock,
  Users,
  Image as ImageIcon,
  Trash2,
  Navigation,
  Sparkles,
  Heart,
  MoreVertical,
  LogOut,
  RefreshCcw,
  Shield,
  Smartphone
} from 'lucide-react';
import { AppScreen, User, Message, Coordinates, FriendStatus } from './types';
import { calculateDistance } from './utils';
import { AdBanner } from './components/AdBanner';
import { InterstitialAd } from './components/InterstitialAd';
import { DataService } from './services/database';
import { AdMobService } from './services/admobService';
import { AdMobConfig } from './admobConfig';
import { isFirebaseConfigured } from './firebaseConfig';

// CONSTANTS
const AD_ACTION_THRESHOLD = 15;

// GOOGLE ICON COMPONENT
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

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

  // Login State
  const [setupMode, setSetupMode] = useState<'LANDING' | 'GUEST_FORM'>('LANDING');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [newInterest, setNewInterest] = useState('');
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [listTab, setListTab] = useState<'NEARBY' | 'FRIENDS'>('NEARBY');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [actionCount, setActionCount] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      // If we have an ID, we try to fetch from DataService. 
      // Note: DataService.subscribeToUsers will eventually give us the user list
      // For now, we assume we are re-entering.
      setMyProfile(prev => ({ ...prev, id: savedId }));
      setCurrentScreen(AppScreen.NEARBY_LIST);
    }
  }, []);

  // 3. Subscribe to Users
  useEffect(() => {
    // Only subscribe if we are logged in
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
          // In Real Firebase mode, friendStatus/unread would come from a separate listener
          // We use the sync helper here which works for Local, but returns defaults for Firebase (async)
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
      
      // Cleanup previous chat listener
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


  // Smart Scrolling Logic
  useEffect(() => {
    if (currentScreen === AppScreen.CHAT) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === AppScreen.CHAT) {
      const container = chatContainerRef.current;
      if (!container) return;

      const { scrollHeight, scrollTop, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      
      const lastMsg = currentChatMessages[currentChatMessages.length - 1];
      const isMine = lastMsg?.senderId === myProfile.id;

      if (isMine || isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [currentChatMessages, myProfile.id]);

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
        // Trigger Interstitial
        setShowInterstitial(true);
        // Also try native interstitial
        AdMobService.showInterstitial(); 
        return 0;
      }
      return next;
    });
  };

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    // Simulate API Network Delay for guest/web mode
    setTimeout(() => {
      const userId = `google_${Date.now()}`;
      const baseUser: User = {
        ...myProfile,
        id: userId,
        name: "Google User",
        photoUrl: "https://lh3.googleusercontent.com/d/1_9X9_9X9_9X9_9X9_9X9_9X9_9X9_9X9", 
        authMethod: 'google',
        location: { latitude: 0, longitude: 0 },
        friendStatus: FriendStatus.NONE
      };
      baseUser.photoUrl = `https://ui-avatars.com/api/?name=Google+User&background=4285F4&color=fff&size=200`;
      finishLogin(baseUser);
    }, 1500);
  };

  const handleGuestLogin = () => {
    setLoadingLocation(true);
    const userId = myProfile.id || `guest_${Date.now()}`;
    
    let finalPhoto = myProfile.photoUrl;
    if (finalPhoto.includes('seed/setup')) {
      finalPhoto = `https://picsum.photos/seed/${myProfile.name + userId}/200/200`;
    }

    const newUser: User = {
      ...myProfile,
      id: userId,
      photoUrl: finalPhoto,
      authMethod: 'guest',
      location: { latitude: 0, longitude: 0 },
      friendStatus: FriendStatus.NONE
    };

    finishLogin(newUser);
  };

  const finishLogin = (user: User) => {
    setLoadingLocation(true);
    
    const finalize = (coords: Coordinates) => {
      const finalUser = { ...user, location: coords };
      
      // Save to DataService (Cloud or Local)
      DataService.upsertUser(finalUser);
      
      sessionStorage.setItem('fresh_chat_my_id', finalUser.id);
      setMyProfile(finalUser);
      setLoadingLocation(false);
      setIsLoggingIn(false);
      setCurrentScreen(AppScreen.NEARBY_LIST);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => finalize({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => {
          finalize({ latitude: 40.7128, longitude: -74.0060 });
        }
      );
    } else {
      finalize({ latitude: 40.7128, longitude: -74.0060 });
    }
  };

  const openChat = (user: User) => {
    trackAction();
    setChatUser(user);
    setCurrentScreen(AppScreen.CHAT);
    // Message subscription handles fetching
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
    if (type === 'text' && !inputText.trim()) return;
    
    trackAction();

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: myProfile.id,
      text: type === 'text' ? (content as string || inputText) : 'Shared location',
      type: type,
      location: type === 'location' ? (content as Coordinates) : undefined,
      timestamp: Date.now()
    };

    const chatId = DataService.getChatId(myProfile.id, chatUser.id);
    DataService.sendMessage(chatId, newMessage);
    
    if (type === 'text') setInputText('');
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
      // If turning premium ON, hide banners
      AdMobService.hideBanner();
    } else {
      AdMobService.showBanner();
    }
  };

  // Profile Edit
  const addInterest = () => {
    if (newInterest.trim() && !myProfile.interests.includes(newInterest.trim())) {
      const updated = { ...myProfile, interests: [...myProfile.interests, newInterest.trim()] };
      setMyProfile(updated);
      DataService.upsertUser(updated);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    const updated = { ...myProfile, interests: myProfile.interests.filter(i => i !== interest) };
    setMyProfile(updated);
    DataService.upsertUser(updated);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...myProfile, album: [...myProfile.album, reader.result as string] };
        setMyProfile(updated);
        DataService.upsertUser(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    const updated = { ...myProfile, album: myProfile.album.filter((_, i) => i !== index) };
    setMyProfile(updated);
    DataService.upsertUser(updated);
  };

  const saveProfileChanges = () => {
    DataService.upsertUser(myProfile);
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
    setSetupMode('LANDING');
  };

  // --- RENDERERS ---

  const renderProfileSetup = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-50"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl w-full max-w-md relative z-10 border border-white">
        
        {/* Header Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition duration-500">
            <Sparkles size={40} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-center text-slate-800 mb-2 tracking-tight">Fresh Chat</h1>
        <p className="text-center text-slate-500 mb-8 font-medium">Real-Time. Location-Based.</p>
        
        {!isFirebaseConfigured() && (
           <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium text-center">
             Using Local Simulation Mode.<br/>Add keys to <code>firebaseConfig.ts</code> for global access.
           </div>
        )}

        {/* LOADING STATE */}
        {(loadingLocation || isLoggingIn) && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium text-sm animate-pulse">
              {isLoggingIn ? 'Connecting to Google...' : 'Finding nearby users...'}
            </p>
          </div>
        )}

        {/* LANDING SCREEN */}
        {!loadingLocation && !isLoggingIn && setupMode === 'LANDING' && (
          <div className="space-y-4">
             <button
               onClick={handleGoogleLogin}
               className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition active:scale-[0.98] group"
             >
               <GoogleIcon />
               <span className="font-bold text-slate-700 group-hover:text-slate-900">Sign in with Google</span>
             </button>

             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-300 text-xs font-bold uppercase">Or</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
               onClick={() => setSetupMode('GUEST_FORM')}
               className="w-full py-4 bg-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-200 transition active:scale-[0.98]"
             >
               <UserIcon size={20} className="text-slate-500" />
               <span className="font-bold text-slate-600">Continue as Guest</span>
             </button>
             
             <p className="text-center text-[10px] text-slate-400 mt-4 px-8">
               By continuing, you agree to our Terms of Service and Privacy Policy.
             </p>
          </div>
        )}

        {/* GUEST FORM SCREEN */}
        {!loadingLocation && !isLoggingIn && setupMode === 'GUEST_FORM' && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setSetupMode('LANDING')} className="flex items-center gap-1 text-slate-400 text-xs font-bold mb-6 hover:text-slate-600">
              <ChevronLeft size={14} /> Back to Login
            </button>

            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Guest Name</label>
            <input
              type="text"
              value={myProfile.name}
              onChange={(e) => setMyProfile({ ...myProfile, name: e.target.value })}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-5 focus:border-emerald-500 focus:ring-0 outline-none transition font-medium text-slate-700"
              placeholder="Enter your name"
            />

            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Gender</label>
            <div className="relative mb-8">
              <select
                value={myProfile.gender}
                onChange={(e) => setMyProfile({ ...myProfile, gender: e.target.value as any })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl appearance-none outline-none font-medium text-slate-700"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronLeft size={20} className="-rotate-90" />
              </div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={!myProfile.name}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all
              ${!myProfile.name
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
              }`}
            >
              Start Chatting <ChevronLeft className="rotate-180" size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderNearbyList = () => {
    let filtered = nearbyUsers;
    if (genderFilter !== 'All') {
      filtered = filtered.filter(u => u.gender === genderFilter);
    }
    if (listTab === 'FRIENDS') {
      filtered = filtered.filter(u => u.friendStatus === FriendStatus.FRIEND);
    }

    return (
      <div className="flex flex-col h-screen bg-slate-50 relative">
        {/* Header */}
        <div className="pt-safe-top pb-2 px-6 bg-white sticky top-0 z-20 shadow-sm">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3" onClick={() => setCurrentScreen(AppScreen.PROFILE_EDIT)}>
              <img src={myProfile.photoUrl} alt="Me" className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 object-cover" />
              <div>
                <h2 className="font-bold text-lg text-slate-800 leading-tight">Fresh Chat</h2>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                  <MapPin size={10} className="fill-emerald-500" /> Current Location
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFilterModal(!showFilterModal)} className={`p-2.5 rounded-full transition ${genderFilter !== 'All' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                <Filter size={20} />
              </button>
              <button 
                onClick={togglePremium} 
                className={`p-2.5 rounded-full transition ${isPremium ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
              >
                <Crown size={20} className={isPremium ? 'fill-amber-600' : ''} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mt-2 mb-2">
            <button 
              onClick={() => { setListTab('NEARBY'); trackAction(); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${listTab === 'NEARBY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
            >
              Nearby
            </button>
            <button 
              onClick={() => { setListTab('FRIENDS'); trackAction(); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${listTab === 'FRIENDS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
            >
              Friends
            </button>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="absolute top-28 right-6 z-30 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 w-48 animate-in fade-in slide-in-from-top-4">
             <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Filter Gender</div>
             {['All', 'Male', 'Female'].map(opt => (
               <button
                 key={opt}
                 onClick={() => { setGenderFilter(opt as any); setShowFilterModal(false); }}
                 className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 flex justify-between items-center ${genderFilter === opt ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 {opt} {genderFilter === opt && <Check size={14} />}
               </button>
             ))}
             {!isPremium && <div className="mt-2 pt-2 border-t text-[10px] text-slate-400 text-center">Unlock more with Premium</div>}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Users size={48} className="mb-2 opacity-50" />
               <p>No users found nearby.</p>
               {listTab === 'NEARBY' && <p className="text-xs mt-2">Check back later or invite friends!</p>}
            </div>
          ) : (
            filtered.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform flex items-center gap-4">
                <div className="relative shrink-0" onClick={() => openUserProfile(user)}>
                   <img src={user.photoUrl} className="w-16 h-16 rounded-2xl object-cover bg-slate-100" alt={user.name} />
                   <div className="absolute -bottom-2 -right-2 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                     <span className="text-[10px] font-bold text-slate-600">{user.age}</span>
                   </div>
                </div>
                
                <div className="flex-1 min-w-0" onClick={() => openChat(user)}>
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold text-slate-800 truncate flex items-center gap-1">
                      {user.name} 
                      {user.authMethod === 'google' && <div className="text-blue-500" title="Verified Google User"><Shield size={12} className="fill-blue-500 text-white" /></div>}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                        {user.distance} km
                      </span>
                      {user.unreadCount && user.unreadCount > 0 ? (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm">
                          {user.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2">{user.bio || 'No bio available'}</p>
                  <div className="flex gap-1 flex-wrap">
                     {user.interests.slice(0, 3).map(tag => (
                       <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">#{tag}</span>
                     ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                   {user.friendStatus === FriendStatus.FRIEND ? (
                     <button onClick={() => openChat(user)} className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                       <MessageCircle size={18} />
                     </button>
                   ) : user.friendStatus === FriendStatus.PENDING ? (
                     <button onClick={() => handleConfirmFriend(user)} className="w-9 h-9 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                       <Clock size={18} />
                     </button>
                   ) : (
                     <button onClick={() => handleAddFriend(user)} className="w-9 h-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                       <UserPlus size={18} />
                     </button>
                   )}
                </div>
              </div>
            ))
          )}
          <div className="h-16" /> {/* Spacer */}
        </div>

        <AdBanner isPremium={isPremium} adUnitId={AdMobConfig.BANNER_ID} />
      </div>
    );
  };

  const renderChat = () => {
    if (!chatUser) return null;
    return (
      <div className="flex flex-col h-screen bg-white">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentScreen(AppScreen.NEARBY_LIST)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
              <ChevronLeft size={24} />
            </button>
            <div className="relative">
              <img src={chatUser.photoUrl} className="w-10 h-10 rounded-full border border-slate-100" alt={chatUser.name} />
              {chatUser.friendStatus === FriendStatus.FRIEND && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{chatUser.name}</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-slate-400 font-medium">Online</span>
              </div>
            </div>
          </div>
          <button className="text-slate-300">
             <MoreVertical size={20} />
          </button>
        </div>

        {/* Messages */}
        <div 
           ref={chatContainerRef}
           className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
        >
           {currentChatMessages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50">
               <MessageCircle size={64} className="mb-2" />
               <p className="text-sm font-medium">Say hello to {chatUser.name}!</p>
             </div>
           )}
           {currentChatMessages.map((msg, idx) => {
             const isMe = msg.senderId === myProfile.id;
             return (
               <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[75%] p-3.5 rounded-2xl shadow-sm text-sm font-medium leading-relaxed relative ${
                   isMe 
                     ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-none' 
                     : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                 }`}>
                   {msg.type === 'location' ? (
                     <a 
                       href={`https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`}
                       target="_blank"
                       rel="noreferrer" 
                       className="flex items-center gap-2 underline decoration-white/30"
                     >
                       <MapPin size={16} /> Shared Location
                     </a>
                   ) : (
                     msg.text
                   )}
                   <span className={`text-[9px] absolute bottom-1 right-2 opacity-60 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                     {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                 </div>
               </div>
             );
           })}
           <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 pb-safe-bottom">
          {chatUser.friendStatus === FriendStatus.FRIEND && (
            <button onClick={shareLocation} className="p-3 text-slate-400 bg-slate-50 rounded-full hover:bg-emerald-50 hover:text-emerald-500 transition">
              <MapPin size={20} />
            </button>
          )}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-slate-50 border-none rounded-full py-3 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-100 outline-none placeholder:text-slate-400"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
          </div>
          <button 
            onClick={() => sendMessage()} 
            disabled={!inputText.trim()}
            className={`p-3 rounded-full transition-all shadow-md flex items-center justify-center ${
              inputText.trim() ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-300'
            }`}
          >
            <Send size={20} className={inputText.trim() ? 'translate-x-0.5' : ''} />
          </button>
        </div>
      </div>
    );
  };

  const renderProfileEdit = () => (
    <div className="bg-slate-50 min-h-screen flex flex-col">
       <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-100 flex items-center justify-between pt-safe-top">
         <button onClick={() => setCurrentScreen(AppScreen.NEARBY_LIST)} className="flex items-center gap-1 text-slate-500 font-bold">
           <ChevronLeft size={20} /> Back
         </button>
         <h2 className="font-bold text-slate-800">Edit Profile</h2>
         <button onClick={saveProfileChanges} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-full">Save</button>
       </div>

       <div className="p-6 space-y-6 overflow-y-auto pb-20">
         {/* Avatar */}
         <div className="flex flex-col items-center">
            <div className="relative">
              <img src={myProfile.photoUrl} alt="Me" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover" />
              <button className="absolute bottom-0 right-0 bg-slate-800 text-white p-2 rounded-full shadow-lg border-2 border-white">
                <Camera size={14} />
              </button>
            </div>
            <button onClick={handleLogout} className="mt-4 flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
               <LogOut size={12} /> Log Out
            </button>
         </div>

         {/* Fields */}
         <div className="space-y-4">
           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1">Display Name</label>
             <input 
               className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 mt-1 focus:border-emerald-500 outline-none" 
               value={myProfile.name}
               onChange={e => setMyProfile({...myProfile, name: e.target.value})}
             />
           </div>
           
           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1">About Me</label>
             <textarea 
               className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 mt-1 h-24 focus:border-emerald-500 outline-none resize-none" 
               value={myProfile.bio}
               onChange={e => setMyProfile({...myProfile, bio: e.target.value})}
               placeholder="Write something about yourself..."
             />
           </div>

           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Interests</label>
             <div className="flex flex-wrap gap-2 mb-3">
               {myProfile.interests.map(int => (
                 <span key={int} className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   {int} <button onClick={() => removeInterest(int)}><X size={12} className="text-slate-400 hover:text-red-500" /></button>
                 </span>
               ))}
             </div>
             <div className="flex gap-2">
               <input 
                 className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none" 
                 placeholder="Add interest (e.g. Hiking)"
                 value={newInterest}
                 onChange={e => setNewInterest(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && addInterest()}
               />
               <button onClick={addInterest} className="p-3 bg-slate-800 text-white rounded-xl">
                 <Plus size={20} />
               </button>
             </div>
           </div>

           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block flex justify-between">
               <span>My Album</span>
               <span onClick={() => fileInputRef.current?.click()} className="text-emerald-500 cursor-pointer flex items-center gap-1">
                 <Plus size={12} /> Add Photo
               </span>
             </label>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
             <div className="grid grid-cols-3 gap-2">
               {myProfile.album.map((img, idx) => (
                 <div key={idx} className="aspect-square relative group">
                   <img src={img} className="w-full h-full object-cover rounded-xl bg-slate-200" />
                   <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                     <Trash2 size={12} />
                   </button>
                 </div>
               ))}
               {myProfile.album.length === 0 && (
                 <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-white hover:border-emerald-300 transition">
                    <ImageIcon size={20} />
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
    </div>
  );

  const renderUserDetail = () => {
    if (!selectedUser) return null;
    return (
      <div className="bg-white min-h-screen relative">
         {/* Full Screen Image Header */}
         <div className="h-96 w-full relative">
           <img src={selectedUser.photoUrl} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
           <button onClick={() => setCurrentScreen(AppScreen.NEARBY_LIST)} className="absolute top-4 left-4 text-white bg-black/20 backdrop-blur-md p-2 rounded-full pt-safe-top">
             <ChevronLeft size={24} />
           </button>
           
           <div className="absolute bottom-0 left-0 w-full p-6 text-white">
             <h1 className="text-3xl font-extrabold flex items-center gap-2">
               {selectedUser.name}, {selectedUser.age}
               {selectedUser.gender === 'Female' && <span className="text-pink-400 text-xl">♀</span>}
               {selectedUser.gender === 'Male' && <span className="text-blue-400 text-xl">♂</span>}
               {selectedUser.authMethod === 'google' && <Shield size={20} className="fill-blue-500 text-white" />}
             </h1>
             <p className="text-slate-300 font-medium flex items-center gap-1 mt-1">
               <MapPin size={14} /> {selectedUser.distance} km away
             </p>
           </div>
         </div>

         <div className="p-6 -mt-6 bg-white rounded-t-[2rem] relative z-10 min-h-[50vh]">
            <div className="flex gap-3 mb-6">
              {selectedUser.friendStatus === FriendStatus.FRIEND ? (
                 <button onClick={() => openChat(selectedUser)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2">
                    <MessageCircle size={20} /> Chat Now
                 </button>
              ) : selectedUser.friendStatus === FriendStatus.PENDING ? (
                 <button className="flex-1 bg-amber-100 text-amber-600 py-3 rounded-xl font-bold cursor-default flex items-center justify-center gap-2">
                    <Clock size={20} /> Pending
                 </button>
              ) : (
                 <button onClick={() => handleAddFriend(selectedUser)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
                    <UserPlus size={20} /> Add Friend
                 </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">About</h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {selectedUser.bio || "This user hasn't written a bio yet."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                   {selectedUser.interests.length > 0 ? selectedUser.interests.map(i => (
                     <span key={i} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                       {i}
                     </span>
                   )) : <span className="text-slate-400 text-xs italic">No interests listed</span>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Gallery ({selectedUser.album.length})</h3>
                <div className="grid grid-cols-3 gap-2">
                   {selectedUser.album.map((img, idx) => (
                     <img key={idx} src={img} className="aspect-square rounded-xl object-cover bg-slate-100" />
                   ))}
                </div>
                {selectedUser.album.length === 0 && (
                  <p className="text-slate-400 text-xs italic">No photos in album.</p>
                )}
              </div>
            </div>
         </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  
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

      {currentScreen === AppScreen.PROFILE_SETUP && renderProfileSetup()}
      {currentScreen === AppScreen.NEARBY_LIST && renderNearbyList()}
      {currentScreen === AppScreen.CHAT && renderChat()}
      {currentScreen === AppScreen.PROFILE_EDIT && renderProfileEdit()}
      {currentScreen === AppScreen.USER_DETAIL && renderUserDetail()}
    </>
  );
}
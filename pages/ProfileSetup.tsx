
import React, { useState } from 'react';
import { Sparkles, User as UserIcon, ChevronLeft } from 'lucide-react';
import { User, FriendStatus, Coordinates } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { GoogleIcon } from '../components/common/GoogleIcon';

interface ProfileSetupProps {
  myProfile: User;
  setMyProfile: (u: User) => void;
  onLoginSuccess: (u: User) => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ myProfile, setMyProfile, onLoginSuccess }) => {
  const [setupMode, setSetupMode] = useState<'LANDING' | 'GUEST_FORM'>('LANDING');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

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
      onLoginSuccess(finalUser);
      setLoadingLocation(false);
      setIsLoggingIn(false);
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

  return (
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
};

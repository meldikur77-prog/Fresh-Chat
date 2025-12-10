
import React, { useState } from 'react';
import { Sparkles, User as UserIcon, ChevronLeft, MapPin, X, FileText, Lock, AlertTriangle, Apple, AlertCircle, Copy } from 'lucide-react';
import { User, FriendStatus, Coordinates } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { GoogleIcon } from '../components/common/GoogleIcon';
import { DataService } from '../services/database';

interface ProfileSetupProps {
  myProfile: User;
  setMyProfile: (u: User) => void;
  onLoginSuccess: (u: User) => void;
}

// --- LEGAL MODALS (UPDATED FOR STORE COMPLIANCE) ---
const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-2xl flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18}/> Terms & EULA</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4">
        <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-xs text-red-800 font-bold mb-2 flex gap-2 items-start">
           <AlertTriangle size={16} className="shrink-0 mt-0.5" />
           <span>This app contains User Generated Content (UGC). We strictly enforce a Zero Tolerance Policy for objectionable content.</span>
        </div>

        <p><strong>1. End User License Agreement (EULA)</strong></p>
        <p>By creating an account, you agree to the following:</p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>No Abusive Content:</strong> You will not post content that is offensive, pornographic, defamatory, hateful, or illegal.</li>
          <li><strong>No Harassment:</strong> You will not harass, bully, or threaten other users.</li>
          <li><strong>Moderation:</strong> We monitor content. Objectionable content reported by users will be removed within 24 hours.</li>
          <li><strong>Termination:</strong> We reserve the right to ban any user who violates these terms immediately and without notice.</li>
          <li><strong>Age Requirement:</strong> You must be 18 years or older to use this service.</li>
        </ul>

        <p><strong>2. Safety Features</strong></p>
        <p className="text-xs">You acknowledge that you can <strong>Block</strong> and <strong>Report</strong> any user from their profile page if they violate these terms.</p>
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
        <button onClick={onClose} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-[0.98] transition">I Agree & Understand</button>
      </div>
    </div>
  </div>
);

const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-2xl flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Lock size={18}/> Privacy Policy</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4">
        <p><strong>Data We Collect</strong></p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Location Data:</strong> Used strictly to calculate distance to other users. We do not track your history.</li>
          <li><strong>User Content:</strong> Photos and messages you send are stored on our secure servers (Firebase).</li>
          <li><strong>Device Info:</strong> Used for app functionality and notifications.</li>
        </ul>

        <p><strong>How We Use Data</strong></p>
        <p className="text-xs">Your data is used to match you with nearby users. We do not sell your personal data to third parties.</p>

        <p><strong>Account Deletion</strong></p>
        <p className="text-xs">You can permanently delete your account and all associated data at any time by going to <strong>Edit Profile {'>'} Delete Account</strong>.</p>
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
        <button onClick={onClose} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-[0.98] transition">I Understand</button>
      </div>
    </div>
  </div>
);

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ myProfile, setMyProfile, onLoginSuccess }) => {
  const [setupMode, setSetupMode] = useState<'LANDING' | 'GUEST_FORM'>('LANDING');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Store Compliance States
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [highlightCheckbox, setHighlightCheckbox] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authErrorType, setAuthErrorType] = useState<string | null>(null);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // 1. Trigger Login Flow
  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
       shakeCheckbox();
       return;
    }
    
    setLoginError(null);
    setAuthErrorType(null);
    setIsLoggingIn(true);
    try {
      const user = await DataService.loginWithGoogle();
      setPendingUser(user);
      setIsLoggingIn(false);
      setShowLocationDisclosure(true);
    } catch (error: any) {
      console.error("Google Login Error", error);
      setIsLoggingIn(false);
      
      if (error && error.code === 'auth/unauthorized-domain') {
        setAuthErrorType('unauthorized-domain');
        setLoginError("Setup Required: Add this domain (fresh-chat.pages.dev) to 'Authorized Domains' in Firebase Console > Auth > Settings.");
      } else if (error && error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login cancelled.");
      } else {
        setLoginError(error.message || "Sign in failed. Please try again.");
      }
    }
  };

  const handleAppleLogin = async () => {
    if (!agreedToTerms) {
       shakeCheckbox();
       return;
    }
    
    setLoginError(null);
    setIsLoggingIn(true);
    try {
       const user = await DataService.loginWithApple();
       setPendingUser(user);
       setIsLoggingIn(false);
       setShowLocationDisclosure(true);
    } catch (error: any) {
      console.error("Apple Login Error", error);
      setIsLoggingIn(false);
      setLoginError(error.message || "Apple Sign In failed. Ensure it is enabled in Firebase Console.");
    }
  };

  const handleGuestLogin = () => {
    if (!agreedToTerms) {
       shakeCheckbox();
       return;
    }

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

    setPendingUser(newUser);
    setShowLocationDisclosure(true);
  };

  // 2. Handle Location Permission (After Disclosure)
  const handlePermissionGrant = () => {
    if (!pendingUser) return;
    setShowLocationDisclosure(false);
    setLoadingLocation(true);
    
    const finalize = (coords: Coordinates) => {
      const finalUser = { ...pendingUser, location: coords };
      onLoginSuccess(finalUser);
      setLoadingLocation(false);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => finalize({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (err) => {
          console.warn("Location denied or error", err);
          finalize({ latitude: 40.7128, longitude: -74.0060 });
        },
        { timeout: 5000 }
      );
    } else {
      finalize({ latitude: 40.7128, longitude: -74.0060 });
    }
  };

  const shakeCheckbox = () => {
    setHighlightCheckbox(true); 
    setTimeout(() => setHighlightCheckbox(false), 500);
  };

  const copyDomain = () => {
    navigator.clipboard.writeText("fresh-chat.pages.dev");
    alert("Copied: fresh-chat.pages.dev\nPaste this in Firebase Console.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 relative overflow-y-auto">
      {/* Modals */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl w-full max-w-md relative z-10 border border-white my-auto">
        
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
        
        {loginError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 font-medium leading-relaxed break-words">
                {loginError}
              </div>
            </div>
            {authErrorType === 'unauthorized-domain' && (
              <button 
                onClick={copyDomain}
                className="mt-3 w-full py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-red-200 transition"
              >
                <Copy size={12} /> Copy Domain (fresh-chat.pages.dev)
              </button>
            )}
            {authErrorType === 'unauthorized-domain' && (
              <div className="mt-3 pt-3 border-t border-red-100 text-[10px] text-red-600">
                 <p className="font-bold mb-1">How to fix:</p>
                 <ol className="list-decimal pl-4 space-y-1">
                   <li>Go to Firebase Console</li>
                   <li>Go to Authentication &gt; Settings &gt; Authorized domains</li>
                   <li>Click Add Domain</li>
                   <li>Paste: <strong>fresh-chat.pages.dev</strong></li>
                 </ol>
              </div>
            )}
          </div>
        )}

        {/* LOADING STATE */}
        {(loadingLocation || isLoggingIn) && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium text-sm animate-pulse">
              {isLoggingIn ? 'Connecting...' : 'Finding nearby users...'}
            </p>
          </div>
        )}

        {/* LOCATION DISCLOSURE (MANDATORY FOR PLAY STORE) */}
        {showLocationDisclosure && !loadingLocation && (
          <div className="animate-in fade-in zoom-in duration-300">
             <div className="bg-emerald-50 p-4 rounded-2xl mb-6 border border-emerald-100">
                <div className="flex justify-center mb-3">
                   <div className="bg-white p-3 rounded-full shadow-sm">
                      <MapPin className="text-emerald-500" size={24} />
                   </div>
                </div>
                <h3 className="text-center font-bold text-slate-800 mb-2">Location Access Needed</h3>
                <p className="text-center text-xs text-slate-600 leading-relaxed mb-1">
                   <strong>Fresh Chat</strong> collects location data to enable the 
                   <strong>"Find Nearby Friends"</strong> feature even when the app is in use.
                </p>
                <p className="text-center text--[10px] text-slate-400">
                   This data is also used to support location-based ads.
                </p>
             </div>
             <button 
                onClick={handlePermissionGrant}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition"
             >
                I Understand, Continue
             </button>
             <button 
                onClick={() => { setShowLocationDisclosure(false); setPendingUser(null); }}
                className="w-full py-3 mt-2 text-slate-400 font-bold text-xs"
             >
                Cancel
             </button>
          </div>
        )}

        {/* LANDING SCREEN */}
        {!loadingLocation && !isLoggingIn && !showLocationDisclosure && setupMode === 'LANDING' && (
          <div className="space-y-5">
             {/* EULA CHECKBOX (MANDATORY - PLACED FRONT) */}
             <div className={`p-3 rounded-xl border flex gap-3 items-start transition-all duration-300 shrink-0 ${highlightCheckbox ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                <div className="pt-0.5 shrink-0">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <label htmlFor="terms" className="text-[11px] text-slate-500 leading-tight cursor-pointer select-none">
                   I agree to the <button onClick={() => setShowTerms(true)} className="underline text-emerald-600 font-bold hover:text-emerald-700">Terms of Service</button> & <button onClick={() => setShowPrivacy(true)} className="underline text-emerald-600 font-bold hover:text-emerald-700">Privacy Policy</button>. 
                   I confirm I am 18+ and will not post abusive content.
                </label>
             </div>

             {/* GOOGLE LOGIN */}
             <button
               onClick={handleGoogleLogin}
               className={`w-full py-3.5 border rounded-2xl flex items-center justify-center gap-3 transition group relative overflow-hidden
                 ${agreedToTerms 
                   ? 'bg-white border-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer' 
                   : 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed'}`}
             >
               <GoogleIcon />
               <span className={`font-bold ${agreedToTerms ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-400'}`}>Sign in with Google</span>
               {!agreedToTerms && <div className="absolute inset-0 z-10" onClick={shakeCheckbox}></div>}
             </button>

             {/* APPLE LOGIN (REQUIRED FOR IOS) */}
             <button
               onClick={handleAppleLogin}
               className={`w-full py-3.5 border rounded-2xl flex items-center justify-center gap-3 transition group relative overflow-hidden
                 ${agreedToTerms 
                   ? 'bg-black text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] cursor-pointer' 
                   : 'bg-slate-800 text-slate-400 opacity-60 grayscale cursor-not-allowed'}`}
             >
               <Apple size={20} className="fill-current" />
               <span className="font-bold">Sign in with Apple</span>
               {!agreedToTerms && <div className="absolute inset-0 z-10" onClick={shakeCheckbox}></div>}
             </button>

             <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-300 text-xs font-bold uppercase">Or</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
               onClick={() => agreedToTerms ? setSetupMode('GUEST_FORM') : shakeCheckbox()}
               className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 transition active:scale-[0.98] relative
                ${agreedToTerms
                  ? 'bg-slate-100 hover:bg-slate-200 cursor-pointer'
                  : 'bg-slate-50 opacity-60 cursor-not-allowed'}`}
             >
               <UserIcon size={20} className={agreedToTerms ? "text-slate-500" : "text-slate-300"} />
               <span className={`font-bold ${agreedToTerms ? 'text-slate-600' : 'text-slate-400'}`}>Continue as Guest</span>
             </button>
          </div>
        )}

        {/* GUEST FORM SCREEN */}
        {!loadingLocation && !isLoggingIn && !showLocationDisclosure && setupMode === 'GUEST_FORM' && (
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
            
            {/* EULA CHECKBOX REPEATED FOR GUEST FORM TO ENSURE COMPLIANCE */}
             <div className="mb-6 flex gap-3 items-start px-2">
                <div className="pt-0.5 shrink-0">
                  <input 
                    type="checkbox" 
                    id="termsGuest" 
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <label htmlFor="termsGuest" className="text-[10px] text-slate-500 leading-tight cursor-pointer">
                   I agree to the <button onClick={() => setShowTerms(true)} className="underline text-emerald-600 font-bold">Terms</button> & <button onClick={() => setShowPrivacy(true)} className="underline text-emerald-600 font-bold">Privacy Policy</button>.
                </label>
             </div>

            <button
              onClick={handleGuestLogin}
              disabled={!myProfile.name || !agreedToTerms}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all
              ${(!myProfile.name || !agreedToTerms)
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

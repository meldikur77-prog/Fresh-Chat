
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-[32px] flex flex-col shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-lg"><FileText className="text-emerald-500" size={24}/> Terms & EULA</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
      </div>
      <div className="p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-5 bg-slate-50/50">
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-800 font-bold flex gap-3 items-start shadow-sm">
           <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-500" />
           <span>This app contains User Generated Content (UGC). We strictly enforce a Zero Tolerance Policy for objectionable content.</span>
        </div>

        <div>
          <p className="font-bold text-slate-900 mb-1">1. End User License Agreement (EULA)</p>
          <p className="mb-2">By creating an account, you agree to the following:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-500 marker:text-emerald-500">
            <li><strong>No Abusive Content:</strong> You will not post content that is offensive, pornographic, defamatory, hateful, or illegal.</li>
            <li><strong>No Harassment:</strong> You will not harass, bully, or threaten other users.</li>
            <li><strong>Moderation:</strong> We monitor content. Objectionable content reported by users will be removed within 24 hours.</li>
            <li><strong>Termination:</strong> We reserve the right to ban any user who violates these terms immediately and without notice.</li>
            <li><strong>Age Requirement:</strong> You must be 18 years or older to use this service.</li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-slate-900 mb-1">2. Safety Features</p>
          <p className="text-xs">You acknowledge that you can <strong>Block</strong> and <strong>Report</strong> any user from their profile page if they violate these terms.</p>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100 bg-white z-10">
        <button onClick={onClose} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl active:scale-[0.98] transition shadow-lg shadow-emerald-200">I Agree & Understand</button>
      </div>
    </div>
  </div>
);

const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-[32px] flex flex-col shadow-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-lg"><Lock className="text-emerald-500" size={24}/> Privacy Policy</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
      </div>
      <div className="p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-5 bg-slate-50/50">
        <div>
          <p className="font-bold text-slate-900 mb-1">Data We Collect</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-500 marker:text-emerald-500">
            <li><strong>Location Data:</strong> Used strictly to calculate distance to other users. We do not track your history.</li>
            <li><strong>User Content:</strong> Photos and messages you send are stored on our secure servers (Firebase).</li>
            <li><strong>Device Info:</strong> Used for app functionality and notifications.</li>
          </ul>
        </div>

        <div>
           <p className="font-bold text-slate-900 mb-1">How We Use Data</p>
           <p className="text-xs">Your data is used to match you with nearby users. We do not sell your personal data to third parties.</p>
        </div>

        <div>
           <p className="font-bold text-slate-900 mb-1">Account Deletion</p>
           <p className="text-xs">You can permanently delete your account and all associated data at any time by going to <strong>Edit Profile {'>'} Delete Account</strong>.</p>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100 bg-white z-10">
        <button onClick={onClose} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl active:scale-[0.98] transition shadow-lg shadow-emerald-200">I Understand</button>
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
    alert("Copied: fresh-chat.pages.dev");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      {/* Modals */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {/* Animated Mesh Background */}
      <div className="absolute inset-0 bg-[#f0fdfa] z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-20%] w-[600px] h-[600px] bg-teal-200/40 rounded-full blur-[120px] animate-pulse delay-700"></div>
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-blue-200/30 rounded-full blur-[80px] animate-pulse delay-1000"></div>
      </div>

      <div className="glass-panel backdrop-blur-2xl p-8 rounded-[40px] shadow-2xl w-full max-w-md relative z-10 border border-white/60 mx-4 my-auto flex flex-col">
        
        {/* Header Logo */}
        <div className="flex justify-center mb-8 animate-float">
          <div className="w-28 h-28 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-[32px] flex items-center justify-center shadow-emerald-200 shadow-2xl rotate-3">
            <Sparkles size={48} className="text-white drop-shadow-md" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-center text-slate-800 mb-2 tracking-tight">Fresh Chat</h1>
        <p className="text-center text-slate-500 mb-10 font-medium text-lg">Real-Time. Location-Based.</p>
        
        {!isFirebaseConfigured() && (
           <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-2xl text-xs text-amber-700 font-bold text-center backdrop-blur-sm">
             ⚠️ Local Simulation Mode
           </div>
        )}
        
        {loginError && (
          <div className="mb-6 p-4 bg-red-50/90 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 font-semibold leading-relaxed break-words">
                {loginError}
              </div>
            </div>
            {authErrorType === 'unauthorized-domain' && (
              <button 
                onClick={copyDomain}
                className="mt-3 w-full py-3 bg-white text-red-600 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition shadow-sm"
              >
                <Copy size={14} /> Copy Domain
              </button>
            )}
          </div>
        )}

        {/* LOADING STATE */}
        {(loadingLocation || isLoggingIn) && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative w-16 h-16 mb-4">
               <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 font-bold text-sm animate-pulse tracking-wide">
              {isLoggingIn ? 'Authenticating...' : 'Locating Nearby Users...'}
            </p>
          </div>
        )}

        {/* LOCATION DISCLOSURE */}
        {showLocationDisclosure && !loadingLocation && (
          <div className="animate-in fade-in zoom-in duration-300">
             <div className="bg-emerald-50/80 p-6 rounded-3xl mb-6 border border-emerald-100/50">
                <div className="flex justify-center mb-4">
                   <div className="bg-white p-4 rounded-full shadow-md shadow-emerald-100">
                      <MapPin className="text-emerald-500" size={28} />
                   </div>
                </div>
                <h3 className="text-center font-extrabold text-slate-800 mb-3 text-lg">Location Access</h3>
                <p className="text-center text-xs text-slate-600 leading-relaxed mb-1 font-medium">
                   <strong>Fresh Chat</strong> collects location data to enable the 
                   <strong>"Find Nearby Friends"</strong> feature even when the app is in use.
                </p>
             </div>
             <button 
                onClick={handlePermissionGrant}
                className="w-full py-4 bg-emerald-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition"
             >
                Allow & Continue
             </button>
             <button 
                onClick={() => { setShowLocationDisclosure(false); setPendingUser(null); }}
                className="w-full py-4 mt-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition"
             >
                Cancel
             </button>
          </div>
        )}

        {/* LANDING SCREEN */}
        {!loadingLocation && !isLoggingIn && !showLocationDisclosure && setupMode === 'LANDING' && (
          <div className="space-y-4">
             {/* EULA CHECKBOX */}
             <div 
               className={`p-4 rounded-2xl border transition-all duration-300 shrink-0 flex gap-3 items-start
               ${highlightCheckbox ? 'bg-red-50 border-red-200 animate-pulse ring-2 ring-red-100' : 'bg-slate-50/50 border-white hover:bg-white'}`}
             >
                <div className="pt-0.5 shrink-0">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 rounded-md border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <label htmlFor="terms" className="text-[11px] text-slate-500 leading-tight cursor-pointer select-none font-medium">
                   I agree to the <button onClick={() => setShowTerms(true)} className="underline text-emerald-600 font-bold hover:text-emerald-700">Terms of Service</button> & <button onClick={() => setShowPrivacy(true)} className="underline text-emerald-600 font-bold hover:text-emerald-700">Privacy Policy</button>. 
                   I confirm I am 18+ and will not post abusive content.
                </label>
             </div>

             {/* GOOGLE LOGIN */}
             <button
               onClick={handleGoogleLogin}
               className={`w-full py-4 border rounded-2xl flex items-center justify-center gap-3 transition-all group relative overflow-hidden
                 ${agreedToTerms 
                   ? 'bg-white border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer' 
                   : 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed'}`}
             >
               <GoogleIcon />
               <span className={`font-bold text-lg ${agreedToTerms ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-400'}`}>Sign in with Google</span>
               {!agreedToTerms && <div className="absolute inset-0 z-10" onClick={shakeCheckbox}></div>}
             </button>

             {/* APPLE LOGIN */}
             <button
               onClick={handleAppleLogin}
               className={`w-full py-4 border rounded-2xl flex items-center justify-center gap-3 transition-all group relative overflow-hidden
                 ${agreedToTerms 
                   ? 'bg-black text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer' 
                   : 'bg-slate-800 text-slate-400 opacity-60 grayscale cursor-not-allowed'}`}
             >
               <Apple size={22} className="fill-current pb-0.5" />
               <span className="font-bold text-lg">Sign in with Apple</span>
               {!agreedToTerms && <div className="absolute inset-0 z-10" onClick={shakeCheckbox}></div>}
             </button>

             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-300 text-xs font-bold uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
               onClick={() => agreedToTerms ? setSetupMode('GUEST_FORM') : shakeCheckbox()}
               className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative
                ${agreedToTerms
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 cursor-pointer'
                  : 'bg-slate-50 opacity-60 text-slate-400 cursor-not-allowed'}`}
             >
               <UserIcon size={20} />
               <span className="font-bold">Continue as Guest</span>
             </button>
          </div>
        )}

        {/* GUEST FORM SCREEN */}
        {!loadingLocation && !isLoggingIn && !showLocationDisclosure && setupMode === 'GUEST_FORM' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setSetupMode('LANDING')} className="flex items-center gap-1 text-slate-400 text-xs font-bold mb-8 hover:text-slate-600 transition-colors pl-1">
              <ChevronLeft size={16} /> Back to Login
            </button>

            <label className="block text-sm font-extrabold text-slate-700 mb-2 ml-1">Guest Name</label>
            <input
              type="text"
              value={myProfile.name}
              onChange={(e) => setMyProfile({ ...myProfile, name: e.target.value })}
              className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl mb-6 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 outline-none transition font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
              placeholder="Enter your name"
            />

            <label className="block text-sm font-extrabold text-slate-700 mb-2 ml-1">Gender</label>
            <div className="relative mb-8">
              <select
                value={myProfile.gender}
                onChange={(e) => setMyProfile({ ...myProfile, gender: e.target.value as any })}
                className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl appearance-none outline-none font-bold text-slate-800 shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronLeft size={20} className="-rotate-90" />
              </div>
            </div>
            
             <div className="mb-8 flex gap-3 items-start px-2 opacity-70">
                <div className="pt-0.5 shrink-0">
                  <input 
                    type="checkbox" 
                    checked={agreedToTerms}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <label className="text-[10px] text-slate-500 leading-tight">
                   Agreed to Terms & Privacy.
                </label>
             </div>

            <button
              onClick={handleGuestLogin}
              disabled={!myProfile.name || !agreedToTerms}
              className={`w-full py-5 rounded-2xl text-white font-extrabold text-lg shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all
              ${(!myProfile.name || !agreedToTerms)
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 hover:-translate-y-1'
              }`}
            >
              Start Chatting <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
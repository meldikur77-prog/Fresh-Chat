
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { AdMobService } from '../services/admobService';

interface InterstitialAdProps {
  onClose: () => void;
  adUnitId: string;
}

export const InterstitialAd: React.FC<InterstitialAdProps> = ({ onClose, adUnitId }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if we can show native ad
    const native = window.Capacitor?.isNativePlatform();
    setIsNative(!!native);

    if (native) {
      // Native ads handle their own close events / UI
      // We just trigger it, and when done, we close our React state
      // Note: Real implementation would listen to AdMob listeners for 'onDismiss'
      AdMobService.showInterstitial().then(() => {
        // Optional: Close this wrapper immediately if native takes over, 
        // OR keep it as a backup if native fails.
      });
    }

    // Timer for the Web Simulation
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // If native, we render nothing (invisible), allowing the Native UI to take over
  // But we keep the component mounted to handle logic if needed.
  if (isNative) return null;

  // --- WEB SIMULATION ---
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
      
      <div className="absolute top-4 right-4 z-50">
         <button 
            onClick={onClose}
            disabled={timeLeft > 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all
              ${timeLeft > 0 
                ? 'border-white/30 text-white/50 cursor-not-allowed' 
                : 'border-white text-white hover:bg-white/20'}`}
          >
            {timeLeft > 0 ? <span className="text-xs">{timeLeft}</span> : <X size={20} />}
          </button>
      </div>

      <div className="w-full h-full max-w-md bg-white flex flex-col relative">
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[9px] p-1 text-center font-mono opacity-50 z-10">
          AdMob Test Mode (Web)
        </div>

        <div className="flex-1 bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-8 text-white text-center">
           <ShieldCheck size={80} className="mb-6 opacity-90" />
           <h1 className="text-3xl font-extrabold mb-2">Secure VPN</h1>
           <p className="text-blue-100 font-medium text-lg mb-8">Protect your browsing privacy today.</p>
           
           <button className="bg-white text-blue-700 px-8 py-3 rounded-full font-bold shadow-xl active:scale-95 transition flex items-center gap-2">
             Install Now <ExternalLink size={18} />
           </button>

           <div className="mt-8 flex items-center gap-2 text-xs text-blue-200/60">
             <span className="bg-white/20 px-1 rounded">Ad</span>
             <span>Provided by Google</span>
           </div>
        </div>
      </div>
    </div>
  );
};

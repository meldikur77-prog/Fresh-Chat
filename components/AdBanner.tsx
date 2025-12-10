import React, { useEffect } from 'react';
import { AdMobService } from '../services/admobService';

interface AdBannerProps {
  isPremium: boolean;
  adUnitId: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ isPremium, adUnitId }) => {
  // --- NATIVE ADMOB LOGIC ---
  useEffect(() => {
    // If premium, always hide
    if (isPremium) {
      AdMobService.hideBanner();
      return;
    }

    // Try showing native banner
    // AdMobService checks internally if it's native platform
    AdMobService.showBanner();
    
    // Cleanup on unmount (optional, depends on if you want it sticky)
    // return () => { AdMobService.hideBanner(); };
  }, [isPremium]);

  // If premium, render nothing
  if (isPremium) return null;

  // --- WEB FALLBACK ---
  // If we are NOT on native (Web Browser), show the CSS simulation
  // We determine this by checking Capacitor presence
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

  if (isNative) {
    // Native banner is an overlay, we just need a spacer div at the bottom
    // so content doesn't get covered by the native ad view
    return <div className="w-full h-[50px] shrink-0 bg-transparent" />;
  }

  // Web Simulation
  return (
    <div className="w-full h-[50px] bg-slate-100 border-t border-slate-300 flex flex-col items-center justify-center relative overflow-hidden shrink-0 select-none">
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50">
        <div className="flex items-center gap-1">
          <span className="bg-[#4285F4] text-white text-[10px] font-bold px-1 rounded-sm">Ad</span>
          <span className="text-xs font-bold text-slate-500">Google AdMob</span>
        </div>
        <p className="text-[9px] text-slate-400 font-mono mt-0.5">Test Mode: Web</p>
      </div>
    </div>
  );
};
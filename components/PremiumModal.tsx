
import React, { useState } from 'react';
import { X, Check, Crown, Star, Heart, Zap, Shield } from 'lucide-react';

interface PremiumModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  isPremium: boolean;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onUpgrade, isPremium }) => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
    setLoading(true);
    // Simulate API call to Google Play Billing / Apple StoreKit
    setTimeout(() => {
      setLoading(false);
      onUpgrade();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header Image / Gradient */}
        <div className="h-32 bg-gradient-to-br from-amber-300 to-orange-500 relative flex items-center justify-center overflow-hidden">
           <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
           
           <div className="text-center relative z-10 animate-bounce">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-2 rotate-3">
                 <Crown size={32} className="fill-amber-500 text-amber-600" />
              </div>
           </div>
           
           <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-full transition backdrop-blur-md">
             <X size={20} />
           </button>
        </div>

        <div className="p-8">
           <div className="text-center mb-8">
             <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
               {isPremium ? 'You are a VIP Member!' : 'Upgrade to Premium'}
             </h2>
             <p className="text-slate-500 text-sm font-medium">
               {isPremium ? 'Enjoy your exclusive benefits.' : 'Unlock the full Fresh Chat experience.'}
             </p>
           </div>

           <div className="space-y-4 mb-8">
              <FeatureRow icon={<Zap size={18} className="fill-blue-400 text-blue-500" />} text="Remove All Ads" />
              <FeatureRow icon={<Star size={18} className="fill-yellow-400 text-yellow-500" />} text="VIP Crown Badge on Profile" />
              <FeatureRow icon={<Heart size={18} className="fill-rose-400 text-rose-500" />} text="Unlimited Likes & Hearts" />
              <FeatureRow icon={<Shield size={18} className="fill-emerald-400 text-emerald-500" />} text="See Who Viewed Your Profile" />
           </div>

           {isPremium ? (
             <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <p className="text-emerald-700 font-bold text-sm">Active Subscription</p>
                <p className="text-emerald-600/70 text-xs mt-1">Renews automatically. Cancel anytime.</p>
             </div>
           ) : (
             <>
               <button 
                 onClick={handleSubscribe}
                 disabled={loading}
                 className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-orange-200 active:scale-[0.98] transition relative overflow-hidden group"
               >
                 {loading ? (
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       Processing...
                    </div>
                 ) : (
                    <>
                      Subscribe for $4.99/mo
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </>
                 )}
               </button>
               <p className="text-center text-[10px] text-slate-400 mt-4 px-4 leading-tight">
                 Payment will be charged to your iTunes/Play Store Account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
               </p>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

const FeatureRow = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
    <div className="bg-white p-2 rounded-lg shadow-sm">
      {icon}
    </div>
    <span className="font-bold text-slate-700 text-sm">{text}</span>
    <Check size={16} className="text-emerald-500 ml-auto" />
  </div>
);

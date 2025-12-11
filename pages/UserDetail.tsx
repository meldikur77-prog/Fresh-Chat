
import React, { useEffect } from 'react';
import { ChevronLeft, Shield, MapPin, MessageCircle, Clock, UserPlus, Heart, Eye, AlertTriangle, Check, ArrowLeft, Trophy, Star } from 'lucide-react';
import { User, FriendStatus } from '../types';
import { calculateLevelProgress } from '../utils';

interface UserDetailProps {
  user: User;
  onBack: () => void;
  onChat: (u: User) => void;
  onAddFriend: (u: User) => void;
  onSendHeart: (u: User) => void;
  onVisit: (u: User) => void;
  onBlock: () => void;
  onReport: () => void;
}

export const UserDetail: React.FC<UserDetailProps> = ({ 
  user, onBack, onChat, onAddFriend, onSendHeart, onVisit, onBlock, onReport 
}) => {
  
  useEffect(() => {
    onVisit(user);
  }, []);

  const renderFriendButton = () => {
    if (user.friendStatus === FriendStatus.FRIEND) {
      return (
        <button onClick={() => onChat(user)} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2 text-lg">
           <MessageCircle size={24} className="fill-white/20" /> Chat
        </button>
      );
    } 
    
    if (user.friendStatus === FriendStatus.PENDING) {
      const theyInitiated = user.friendRequestInitiator === user.id;

      if (theyInitiated) {
         return (
            <button onClick={() => onAddFriend(user)} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2 animate-pulse">
               <Check size={24} /> Accept Request
            </button>
         );
      } else {
         return (
            <button className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-bold cursor-default flex items-center justify-center gap-2">
               <Clock size={24} /> Request Sent
            </button>
         );
      }
    }

    return (
       <button onClick={() => onAddFriend(user)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-300 active:scale-95 transition flex items-center justify-center gap-2 text-lg">
          <UserPlus size={24} /> Add Friend
       </button>
    );
  };
  
  const levelProgress = calculateLevelProgress(user.xp || 0);

  return (
    <div className="bg-white min-h-screen relative flex flex-col">
       {/* Massive Curved Header Image */}
       <div className="h-[45vh] w-full relative group shrink-0">
         <img src={user.photoUrl} className="w-full h-full object-cover rounded-b-[48px]" alt={user.name} />
         <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 rounded-b-[48px]"></div>
         
         <button onClick={onBack} className="absolute top-4 left-4 text-white bg-white/20 backdrop-blur-md p-3 rounded-full pt-safe-top hover:bg-white/30 transition">
           <ArrowLeft size={24} />
         </button>
         
         {/* User Info Overlay */}
         <div className="absolute bottom-0 left-0 w-full p-8 pb-10 text-white">
           <h1 className="text-4xl font-extrabold flex items-center gap-2 drop-shadow-md">
             {user.name}, {user.age}
             {user.authMethod === 'google' && <Shield size={24} className="fill-blue-500 text-white" />}
             {user.authMethod === 'apple' && <Shield size={24} className="fill-black text-white" />}
           </h1>
           <p className="text-white/90 font-bold flex items-center gap-2 mt-2 text-lg drop-shadow-sm">
             <MapPin size={18} /> {user.distance} km away
           </p>
         </div>
       </div>

       {/* Floating Heart FAB */}
       <div className="relative -mt-8 px-8 flex justify-end z-20">
         <button 
           onClick={() => onSendHeart(user)}
           className="w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform group"
         >
           <Heart size={32} className="text-rose-500 fill-rose-500 group-hover:animate-ping-slow" />
         </button>
       </div>

       <div className="px-6 pb-20 -mt-2">
       
          {/* GAMIFICATION CARD */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 mb-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
             
             <div className="flex justify-between items-start mb-4">
               <div>
                  <h2 className="text-2xl font-extrabold flex items-center gap-2">
                     Level {user.level || 1}
                     <Trophy size={20} className="text-yellow-300 fill-yellow-300" />
                  </h2>
                  <p className="text-indigo-100 text-xs font-medium">Freshness Score</p>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-bold">{user.xp || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Total XP</div>
               </div>
             </div>

             {/* Progress Bar */}
             <div className="w-full h-3 bg-black/20 rounded-full mb-4 overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-yellow-300 to-amber-500 rounded-full transition-all duration-1000" 
                 style={{ width: `${levelProgress}%` }}
               ></div>
             </div>

             {/* Badges */}
             <div className="flex gap-2 flex-wrap">
                {user.badges?.includes('popular') && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm border border-white/10">
                    <Heart size={10} className="fill-rose-400 text-rose-400" /> Popular
                  </span>
                )}
                {user.badges?.includes('veteran') && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm border border-white/10">
                    <Star size={10} className="fill-yellow-300 text-yellow-300" /> Veteran
                  </span>
                )}
                {user.badges?.includes('superstar') && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm border border-white/10">
                    <Trophy size={10} className="fill-yellow-300 text-yellow-300" /> Superstar
                  </span>
                )}
                {(!user.badges || user.badges.length === 0) && (
                   <span className="text-[10px] opacity-60 italic">Chat to unlock badges...</span>
                )}
             </div>
          </div>

          {/* Stats Pills */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-rose-500">
                <Heart size={20} className="fill-rose-500" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-rose-900">{user.hearts || 0}</div>
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Hearts</div>
              </div>
            </div>
            <div className="flex-1 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-500">
                <Eye size={20} />
              </div>
              <div>
                <div className="text-xl font-extrabold text-emerald-900">{user.views || 0}</div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Views</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            {renderFriendButton()}
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide opacity-50">About</h3>
              <p className="text-slate-600 leading-relaxed text-base font-medium">
                {user.bio || "This user hasn't written a bio yet."}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide opacity-50">Interests</h3>
              <div className="flex flex-wrap gap-2">
                 {user.interests.length > 0 ? user.interests.map(i => (
                   <span key={i} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold border border-slate-200">
                     {i}
                   </span>
                 )) : <span className="text-slate-400 text-sm italic">No interests listed</span>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide opacity-50">Gallery</h3>
              <div className="grid grid-cols-3 gap-2">
                 {user.album.map((img, idx) => (
                   <img key={idx} src={img} className="aspect-square rounded-2xl object-cover bg-slate-100 border border-slate-100" />
                 ))}
              </div>
              {user.album.length === 0 && (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-sm font-medium">
                   No photos added yet
                </div>
              )}
            </div>

            {/* Safety Actions */}
            <div className="pt-8 border-t border-slate-100 flex justify-center gap-8">
               <button onClick={onReport} className="text-slate-400 hover:text-amber-500 flex items-center gap-2 text-xs font-bold transition uppercase tracking-widest">
                 <AlertTriangle size={14} /> Report
               </button>
               <button onClick={onBlock} className="text-slate-400 hover:text-red-500 flex items-center gap-2 text-xs font-bold transition uppercase tracking-widest">
                 <Shield size={14} /> Block
               </button>
            </div>
            <div className="h-safe-bottom"></div>
          </div>
       </div>
    </div>
  );
};
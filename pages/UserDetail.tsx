import React, { useEffect } from 'react';
import { ChevronLeft, Shield, MapPin, MessageCircle, Clock, UserPlus, Heart, Eye, AlertTriangle, Check } from 'lucide-react';
import { User, FriendStatus } from '../types';

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
  
  // Track visit on mount
  useEffect(() => {
    onVisit(user);
  }, []);

  // Determine friendship button state
  const renderFriendButton = () => {
    if (user.friendStatus === FriendStatus.FRIEND) {
      return (
        <button onClick={() => onChat(user)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2">
           <MessageCircle size={20} /> Chat Now
        </button>
      );
    } 
    
    if (user.friendStatus === FriendStatus.PENDING) {
      // If I sent it, show disabled "Request Sent"
      // If ID is available, check it. If undefined (legacy data), default to disabled to be safe.
      const iSentIt = user.friendRequestInitiator === undefined || user.friendRequestInitiator !== user.id; // Heuristic: if initiator is NOT them, it's me.
      
      // Better check: passed from App.tsx where logic handles myProfile.id comparison
      // But here we might not have myId easily accessible without props drilling. 
      // Ideally, pass 'isIncomingRequest' prop. 
      // However, we can infer: if friendRequestInitiator matches THIS user's ID, then THEY sent it.
      if (user.friendRequestInitiator === user.id) {
         // They sent it -> Show Accept
         return (
            <button onClick={() => onAddFriend(user)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2 animate-pulse">
               <Check size={20} /> Accept Request
            </button>
         );
      } else {
         // I sent it -> Show Waiting
         return (
            <button className="flex-1 bg-slate-100 text-slate-400 py-3 rounded-xl font-bold cursor-default flex items-center justify-center gap-2">
               <Clock size={20} /> Request Sent
            </button>
         );
      }
    }

    return (
       <button onClick={() => onAddFriend(user)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
          <UserPlus size={20} /> Add Friend
       </button>
    );
  };

  return (
    <div className="bg-white min-h-screen relative">
       {/* Full Screen Image Header */}
       <div className="h-96 w-full relative group">
         <img src={user.photoUrl} className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
         <button onClick={onBack} className="absolute top-4 left-4 text-white bg-black/20 backdrop-blur-md p-2 rounded-full pt-safe-top">
           <ChevronLeft size={24} />
         </button>
         
         {/* Floating Heart Button */}
         <button 
           onClick={() => onSendHeart(user)}
           className="absolute bottom-32 right-6 bg-rose-500 text-white p-4 rounded-full shadow-2xl shadow-rose-400/50 hover:scale-110 active:scale-90 transition-transform z-20"
         >
           <Heart size={28} className="fill-white" />
         </button>

         <div className="absolute bottom-0 left-0 w-full p-6 text-white pb-12">
           <h1 className="text-3xl font-extrabold flex items-center gap-2">
             {user.name}, {user.age}
             {user.gender === 'Female' && <span className="text-pink-400 text-xl">♀</span>}
             {user.gender === 'Male' && <span className="text-blue-400 text-xl">♂</span>}
             {user.authMethod === 'google' && <Shield size={20} className="fill-blue-500 text-white" />}
           </h1>
           <p className="text-slate-300 font-medium flex items-center gap-1 mt-1">
             <MapPin size={14} /> {user.distance} km away
           </p>
         </div>
       </div>

       <div className="p-6 -mt-8 bg-white rounded-t-[2rem] relative z-10 min-h-[50vh]">
          {/* Stats Bar */}
          <div className="flex gap-6 mb-6 px-2">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-800 flex items-center gap-1">
                {user.hearts || 0} <Heart size={16} className="text-rose-500 fill-rose-500" />
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hearts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-800 flex items-center gap-1">
                {user.views || 0} <Eye size={16} className="text-emerald-500" />
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Views</span>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            {renderFriendButton()}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">About</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {user.bio || "This user hasn't written a bio yet."}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                 {user.interests.length > 0 ? user.interests.map(i => (
                   <span key={i} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                     {i}
                   </span>
                 )) : <span className="text-slate-400 text-xs italic">No interests listed</span>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Gallery ({user.album.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                 {user.album.map((img, idx) => (
                   <img key={idx} src={img} className="aspect-square rounded-xl object-cover bg-slate-100" />
                 ))}
              </div>
              {user.album.length === 0 && (
                <p className="text-slate-400 text-xs italic">No photos in album.</p>
              )}
            </div>

            {/* Safety Options */}
            <div className="pt-8 mt-8 border-t border-slate-100 flex justify-center gap-6">
               <button onClick={onReport} className="text-slate-400 hover:text-amber-500 flex items-center gap-1 text-xs font-bold transition">
                 <AlertTriangle size={14} /> Report
               </button>
               <button onClick={onBlock} className="text-red-400 hover:text-red-600 flex items-center gap-1 text-xs font-bold transition">
                 <Shield size={14} /> Block User
               </button>
            </div>
            <div className="h-10"></div>
          </div>
       </div>
    </div>
  );
};
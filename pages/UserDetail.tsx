
import React from 'react';
import { ChevronLeft, Shield, MapPin, MessageCircle, Clock, UserPlus } from 'lucide-react';
import { User, FriendStatus } from '../types';

interface UserDetailProps {
  user: User;
  onBack: () => void;
  onChat: (u: User) => void;
  onAddFriend: (u: User) => void;
}

export const UserDetail: React.FC<UserDetailProps> = ({ user, onBack, onChat, onAddFriend }) => {
  return (
    <div className="bg-white min-h-screen relative">
       {/* Full Screen Image Header */}
       <div className="h-96 w-full relative">
         <img src={user.photoUrl} className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
         <button onClick={onBack} className="absolute top-4 left-4 text-white bg-black/20 backdrop-blur-md p-2 rounded-full pt-safe-top">
           <ChevronLeft size={24} />
         </button>
         
         <div className="absolute bottom-0 left-0 w-full p-6 text-white">
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

       <div className="p-6 -mt-6 bg-white rounded-t-[2rem] relative z-10 min-h-[50vh]">
          <div className="flex gap-3 mb-6">
            {user.friendStatus === FriendStatus.FRIEND ? (
               <button onClick={() => onChat(user)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition flex items-center justify-center gap-2">
                  <MessageCircle size={20} /> Chat Now
               </button>
            ) : user.friendStatus === FriendStatus.PENDING ? (
               <button className="flex-1 bg-amber-100 text-amber-600 py-3 rounded-xl font-bold cursor-default flex items-center justify-center gap-2">
                  <Clock size={20} /> Pending
               </button>
            ) : (
               <button onClick={() => onAddFriend(user)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
                  <UserPlus size={20} /> Add Friend
               </button>
            )}
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
          </div>
       </div>
    </div>
  );
};

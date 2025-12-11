
import React, { useState } from 'react';
import { MapPin, Filter, Crown, Check, Users, Shield, MessageCircle, Clock, UserPlus, Flame, Trophy, Radio, Activity } from 'lucide-react';
import { User, AppScreen, FriendStatus } from '../types';
import { AdBanner } from '../components/AdBanner';
import { AdMobConfig } from '../config/admob';

interface NearbyListProps {
  myProfile: User;
  nearbyUsers: User[];
  isPremium: boolean;
  genderFilter: 'All' | 'Male' | 'Female';
  setGenderFilter: (v: 'All' | 'Male' | 'Female') => void;
  listTab: 'NEARBY' | 'FRIENDS' | 'CHATS';
  setListTab: (v: 'NEARBY' | 'FRIENDS' | 'CHATS') => void;
  togglePremium: () => void;
  setCurrentScreen: (s: AppScreen) => void;
  openUserProfile: (u: User) => void;
  openChat: (u: User) => void;
  handleAddFriend: (u: User) => void;
  handleConfirmFriend: (u: User) => void;
  trackAction: () => void;
}

const ACTIVE_THRESHOLD = 15 * 60 * 1000; // 15 Minutes
const AWAY_THRESHOLD = 60 * 60 * 1000; // 1 Hour

const SkeletonUser = () => (
  <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-4 animate-pulse">
    <div className="w-[72px] h-[72px] rounded-[20px] bg-slate-100 shrink-0" />
    <div className="flex-1 min-w-0 py-1">
      <div className="h-5 bg-slate-100 rounded-lg w-2/3 mb-3" />
      <div className="h-3 bg-slate-100 rounded-full w-1/2 mb-3" />
      <div className="flex gap-2">
        <div className="h-4 bg-slate-100 rounded-md w-12" />
        <div className="h-4 bg-slate-100 rounded-md w-8" />
      </div>
    </div>
  </div>
);

// OPTIMIZATION: Memoized User Card to prevent re-rendering entire list when one user updates
const UserCard = React.memo(({ 
  user, myProfile, timeStatus, openUserProfile, openChat, handleAddFriend, handleConfirmFriend 
}: { 
  user: User; 
  myProfile: User;
  timeStatus: 'ONLINE' | 'AWAY' | 'OFFLINE';
  openUserProfile: (u: User) => void;
  openChat: (u: User) => void;
  handleAddFriend: (u: User) => void;
  handleConfirmFriend: (u: User) => void;
}) => {
  return (
    <div className="group relative bg-white/80 backdrop-blur-sm p-4 rounded-[28px] shadow-sm hover:shadow-lg transition-all border border-white flex items-center gap-4">
      {/* Avatar */}
      <div className="relative shrink-0 cursor-pointer" onClick={() => openUserProfile(user)}>
         <img 
           src={user.photoUrl} 
           className="w-[72px] h-[72px] rounded-[24px] object-cover bg-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-300" 
           alt={user.name}
           loading="lazy" 
           decoding="async"
         />
         {timeStatus === 'ONLINE' && (
           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-[3px] border-white z-10 animate-pulse-glow flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
           </div>
         )}
         {timeStatus === 'AWAY' && (
           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-[3px] border-white z-10 flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
           </div>
         )}
         {/* Level Badge */}
         <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-slate-800 text-yellow-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm border border-slate-600 flex items-center gap-0.5 z-20">
            <Trophy size={8} className="fill-yellow-400" /> {user.level || 1}
         </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openChat(user)}>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-extrabold text-lg text-slate-800 truncate flex items-center gap-1.5">
            {user.name} 
            {user.authMethod === 'google' && <Shield size={14} className="fill-blue-500 text-white" />}
            {user.authMethod === 'apple' && <Shield size={14} className="fill-black text-white" />}
            {user.isPremium && <Crown size={14} className="fill-amber-500 text-amber-600" />}
          </h3>
          <div className="flex items-center gap-1.5">
            
            {/* STREAK INDICATOR */}
            {(user.streak || 0) > 0 && (
               <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                  <Flame size={10} className="fill-orange-500" /> {user.streak}
               </span>
            )}

            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap border border-emerald-100">
              {user.distance} km
            </span>
            {user.unreadCount && user.unreadCount > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg shadow-rose-200 animate-bounce">
                {user.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
        
        {timeStatus === 'ONLINE' ? (
          <p className="text-xs text-emerald-600 truncate mb-3 font-bold opacity-90">Online Now</p>
        ) : timeStatus === 'AWAY' ? (
          <p className="text-xs text-amber-500 truncate mb-3 font-bold opacity-90">Away {user.lastActive ? Math.floor((Date.now() - user.lastActive) / 60000) : 0}m ago</p>
        ) : (
          <p className="text-xs text-slate-400 truncate mb-3 font-medium opacity-80">{user.bio || 'New to Fresh Chat'}</p>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex gap-1 overflow-hidden h-6 mask-gradient-r">
             {user.interests.slice(0, 3).map(tag => (
               <span key={tag} className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-md font-bold uppercase tracking-wide">
                 {tag}
               </span>
             ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-col gap-2 shrink-0 self-center pl-2 border-l border-slate-100">
         {user.friendStatus === FriendStatus.FRIEND ? (
           <button onClick={() => openChat(user)} className="w-10 h-10 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200 rounded-2xl flex items-center justify-center active:scale-90 transition">
             <MessageCircle size={20} className="fill-white/20" />
           </button>
         ) : user.friendStatus === FriendStatus.PENDING ? (
            (user.friendRequestInitiator === undefined || user.friendRequestInitiator === myProfile.id) ? (
              <div className="flex flex-col items-center gap-1">
                <button disabled className="w-10 h-10 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center cursor-default">
                  <Clock size={20} />
                </button>
                <span className="text-[9px] text-slate-400 font-bold">Sent</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => handleConfirmFriend(user)} className="w-10 h-10 bg-emerald-500 text-white shadow-lg shadow-emerald-200 rounded-2xl flex items-center justify-center animate-pulse">
                  <Check size={20} />
                </button>
                <span className="text-[9px] text-emerald-600 font-bold">Accept</span>
              </div>
            )
         ) : (
           <button onClick={() => handleAddFriend(user)} className="w-10 h-10 bg-white text-slate-400 border-2 border-slate-100 rounded-2xl flex items-center justify-center hover:border-emerald-200 hover:text-emerald-500 transition active:scale-90">
             <UserPlus size={20} />
           </button>
         )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.user.id === next.user.id &&
    prev.user.friendStatus === next.user.friendStatus &&
    prev.user.unreadCount === next.user.unreadCount &&
    prev.user.lastActive === next.user.lastActive &&
    prev.user.level === next.user.level &&
    prev.user.streak === next.user.streak &&
    prev.timeStatus === next.timeStatus
  );
});

export const NearbyList: React.FC<NearbyListProps> = ({
  myProfile, nearbyUsers, isPremium, genderFilter, setGenderFilter,
  listTab, setListTab, togglePremium, setCurrentScreen, openUserProfile,
  openChat, handleAddFriend, handleConfirmFriend, trackAction
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const getTimeStatus = (timestamp?: number): 'ONLINE' | 'AWAY' | 'OFFLINE' => {
    if (!timestamp) return 'OFFLINE';
    const diff = Date.now() - timestamp;
    if (diff < ACTIVE_THRESHOLD) return 'ONLINE';
    if (diff < AWAY_THRESHOLD) return 'AWAY';
    return 'OFFLINE';
  };

  let filtered = nearbyUsers;
  
  if (genderFilter !== 'All') {
    filtered = filtered.filter(u => u.gender === genderFilter);
  }
  
  if (listTab === 'FRIENDS') {
    filtered = filtered.filter(u => u.friendStatus === FriendStatus.FRIEND);
  } else if (listTab === 'CHATS') {
    // LIVE Tab: Active in last 24h AND (Friend OR has Unread)
    filtered = filtered.filter(u => {
      const active24h = (Date.now() - (u.lastActive || 0)) < (24 * 60 * 60 * 1000);
      if (!active24h) return false;
      const isChatting = u.friendStatus === FriendStatus.FRIEND || (u.unreadCount || 0) > 0;
      return isChatting;
    });
  }

  return (
    <div className="flex flex-col h-screen relative bg-transparent">
      {/* Floating Glass Header */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe-top pointer-events-none">
        <div className="mx-4 mt-2 bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 rounded-[28px] p-2 flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-3 cursor-pointer pl-1" onClick={() => setCurrentScreen(AppScreen.PROFILE_EDIT)}>
            <div className="relative">
               <img src={myProfile.photoUrl} alt="Me" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
               <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
               {/* My Level Badge */}
               <div className="absolute -bottom-2 -left-1 bg-slate-800 text-yellow-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm border border-white z-20 flex items-center gap-0.5">
                   <Trophy size={6} className="fill-yellow-400" /> {myProfile.level || 1}
               </div>
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 leading-none mb-0.5">Fresh Chat</h2>
              <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                <MapPin size={10} className="fill-emerald-600" /> Location On
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowFilterModal(!showFilterModal)} 
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${genderFilter !== 'All' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <Filter size={20} />
            </button>
            <button 
              onClick={togglePremium} 
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${isPremium ? 'bg-amber-100 text-amber-500 shadow-md shadow-amber-100' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <Crown size={20} className={isPremium ? 'fill-amber-500' : ''} />
            </button>
          </div>
        </div>
        
        {/* Floating Tabs */}
        <div className="flex justify-center mt-3 pointer-events-auto px-4">
           <div className="bg-white/60 backdrop-blur-md p-1 rounded-2xl flex shadow-sm border border-white/40 w-full max-w-sm">
             <button 
                onClick={() => { setListTab('NEARBY'); trackAction(); }}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-wide rounded-xl transition-all ${listTab === 'NEARBY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Nearby
              </button>
              <button 
                onClick={() => { setListTab('FRIENDS'); trackAction(); }}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-wide rounded-xl transition-all ${listTab === 'FRIENDS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Friends
              </button>
              <button 
                onClick={() => { setListTab('CHATS'); trackAction(); }}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1 ${listTab === 'CHATS' ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Activity size={10} className={listTab === 'CHATS' ? "animate-pulse" : ""} /> LIVE
              </button>
           </div>
        </div>
      </div>

      {showFilterModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowFilterModal(false)}></div>
          <div className="absolute top-20 right-6 z-50 bg-white/90 backdrop-blur-xl p-2 rounded-[24px] shadow-2xl border border-white/50 w-48 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-[10px] font-bold text-slate-400 mb-1 px-3 pt-2 uppercase tracking-wide">Show Me</div>
              {(['All', 'Male', 'Female'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setGenderFilter(opt); setShowFilterModal(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold mb-1 flex justify-between items-center transition-colors ${genderFilter === opt ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {opt} {genderFilter === opt && <Check size={16} />}
                </button>
              ))}
          </div>
        </>
      )}

      {/* Main List */}
      <div className="flex-1 overflow-y-auto px-4 pt-36 pb-20 space-y-4 no-scrollbar">
        {nearbyUsers.length === 0 && !filtered.length && (
           <>
             <SkeletonUser />
             <SkeletonUser />
             <SkeletonUser />
           </>
        )}

        {nearbyUsers.length > 0 && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300 animate-in fade-in duration-500">
             {listTab === 'CHATS' ? (
                <>
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                     <Activity size={32} className="text-rose-300" />
                  </div>
                  <p className="font-bold text-lg text-slate-400">No Live Chats</p>
                  <p className="text-sm text-center max-w-[200px] mt-2">Only friends who are currently Online or active in the last 24h will appear here.</p>
                </>
             ) : (
                <>
                  <Users size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg">No matches found</p>
                  {listTab === 'NEARBY' && <p className="text-sm">Adjust your filters to see more.</p>}
                </>
             )}
          </div>
        ) : (
          filtered.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              myProfile={myProfile} 
              timeStatus={getTimeStatus(user.lastActive)}
              openUserProfile={openUserProfile}
              openChat={openChat}
              handleAddFriend={handleAddFriend}
              handleConfirmFriend={handleConfirmFriend}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-t border-white">
        <AdBanner isPremium={isPremium} adUnitId={AdMobConfig.BANNER_ID} />
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { MapPin, Filter, Crown, Check, Users, Shield, MessageCircle, Clock, UserPlus } from 'lucide-react';
import { User, AppScreen, FriendStatus } from '../types';
import { AdBanner } from '../components/AdBanner';
import { AdMobConfig } from '../config/admob';

interface NearbyListProps {
  myProfile: User;
  nearbyUsers: User[];
  isPremium: boolean;
  genderFilter: 'All' | 'Male' | 'Female';
  setGenderFilter: (v: 'All' | 'Male' | 'Female') => void;
  listTab: 'NEARBY' | 'FRIENDS';
  setListTab: (v: 'NEARBY' | 'FRIENDS') => void;
  togglePremium: () => void;
  setCurrentScreen: (s: AppScreen) => void;
  openUserProfile: (u: User) => void;
  openChat: (u: User) => void;
  handleAddFriend: (u: User) => void;
  handleConfirmFriend: (u: User) => void;
  trackAction: () => void;
}

export const NearbyList: React.FC<NearbyListProps> = ({
  myProfile, nearbyUsers, isPremium, genderFilter, setGenderFilter,
  listTab, setListTab, togglePremium, setCurrentScreen, openUserProfile,
  openChat, handleAddFriend, handleConfirmFriend, trackAction
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);

  let filtered = nearbyUsers;
  if (genderFilter !== 'All') {
    filtered = filtered.filter(u => u.gender === genderFilter);
  }
  if (listTab === 'FRIENDS') {
    filtered = filtered.filter(u => u.friendStatus === FriendStatus.FRIEND);
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* Header */}
      <div className="pt-safe-top pb-2 px-6 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3" onClick={() => setCurrentScreen(AppScreen.PROFILE_EDIT)}>
            <img src={myProfile.photoUrl} alt="Me" className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 object-cover" />
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">Fresh Chat</h2>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                <MapPin size={10} className="fill-emerald-500" /> Current Location
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilterModal(!showFilterModal)} className={`p-2.5 rounded-full transition ${genderFilter !== 'All' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Filter size={20} />
            </button>
            <button 
              onClick={togglePremium} 
              className={`p-2.5 rounded-full transition ${isPremium ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
            >
              <Crown size={20} className={isPremium ? 'fill-amber-600' : ''} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mt-2 mb-2">
          <button 
            onClick={() => { setListTab('NEARBY'); trackAction(); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${listTab === 'NEARBY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            Nearby
          </button>
          <button 
            onClick={() => { setListTab('FRIENDS'); trackAction(); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${listTab === 'FRIENDS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            Friends
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="absolute top-28 right-6 z-30 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 w-48 animate-in fade-in slide-in-from-top-4">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Filter Gender</div>
            {['All', 'Male', 'Female'].map(opt => (
              <button
                key={opt}
                onClick={() => { setGenderFilter(opt as any); setShowFilterModal(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 flex justify-between items-center ${genderFilter === opt ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {opt} {genderFilter === opt && <Check size={14} />}
              </button>
            ))}
            {!isPremium && <div className="mt-2 pt-2 border-t text-[10px] text-slate-400 text-center">Unlock more with Premium</div>}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <Users size={48} className="mb-2 opacity-50" />
             <p>No users found nearby.</p>
             {listTab === 'NEARBY' && <p className="text-xs mt-2">Check back later or invite friends!</p>}
          </div>
        ) : (
          filtered.map(user => (
            <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform flex items-center gap-4">
              <div className="relative shrink-0" onClick={() => openUserProfile(user)}>
                 <img src={user.photoUrl} className="w-16 h-16 rounded-2xl object-cover bg-slate-100" alt={user.name} />
                 <div className="absolute -bottom-2 -right-2 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                   <span className="text-[10px] font-bold text-slate-600">{user.age}</span>
                 </div>
              </div>
              
              <div className="flex-1 min-w-0" onClick={() => openChat(user)}>
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-slate-800 truncate flex items-center gap-1">
                    {user.name} 
                    {user.authMethod === 'google' && <div className="text-blue-500" title="Verified Google User"><Shield size={12} className="fill-blue-500 text-white" /></div>}
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {user.distance} km
                    </span>
                    {user.unreadCount && user.unreadCount > 0 ? (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm">
                        {user.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-slate-500 truncate mb-2">{user.bio || 'No bio available'}</p>
                <div className="flex gap-1 flex-wrap">
                   {user.interests.slice(0, 3).map(tag => (
                     <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">#{tag}</span>
                   ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                 {user.friendStatus === FriendStatus.FRIEND ? (
                   <button onClick={() => openChat(user)} className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                     <MessageCircle size={18} />
                   </button>
                 ) : user.friendStatus === FriendStatus.PENDING ? (
                   <button onClick={() => handleConfirmFriend(user)} className="w-9 h-9 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                     <Clock size={18} />
                   </button>
                 ) : (
                   <button onClick={() => handleAddFriend(user)} className="w-9 h-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                     <UserPlus size={18} />
                   </button>
                 )}
              </div>
            </div>
          ))
        )}
        <div className="h-16" /> {/* Spacer */}
      </div>

      <AdBanner isPremium={isPremium} adUnitId={AdMobConfig.BANNER_ID} />
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, LogOut, X, Plus, Trash2, ImageIcon, AlertTriangle, FileText, Lock, HelpCircle, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { compressImage } from '../utils';
import { DataService } from '../services/database';

interface ProfileEditProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
  onLogout: () => void;
}

export const ProfileEdit: React.FC<ProfileEditProps> = ({ user, onSave, onCancel, onLogout }) => {
  const [profile, setProfile] = useState<User>(user);
  const [newInterest, setNewInterest] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({ ...profile, interests: [...profile.interests, newInterest.trim()] });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile({ ...profile, interests: profile.interests.filter(i => i !== interest) });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoadingImage(true);
      try {
        const compressedBase64 = await compressImage(file);
        setProfile(prev => ({ ...prev, album: [...prev.album, compressedBase64] }));
      } catch (err) {
        console.error("Compression Failed", err);
        alert("Failed to process image. Try a smaller one.");
      } finally {
        setLoadingImage(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setProfile({ ...profile, album: profile.album.filter((_, i) => i !== index) });
  };

  const handleDeleteAccount = async () => {
    try {
      await DataService.deleteAccount(profile.id);
      onLogout();
    } catch (error) {
      alert("Failed to delete account. You may need to re-login recently.");
    }
  };

  const handleRestorePurchases = () => {
    alert("No purchases to restore.");
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col relative">
       {/* Delete Confirmation Modal */}
       {showDeleteModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
               <AlertTriangle className="text-red-500" size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Account?</h3>
             <p className="text-sm text-slate-500 mb-6">
               This action is permanent. All your chats, matches, and photos will be erased immediately.
             </p>
             <button 
               onClick={handleDeleteAccount}
               className="w-full py-3 bg-red-500 text-white font-bold rounded-xl mb-3 hover:bg-red-600 transition"
             >
               Yes, Delete Everything
             </button>
             <button 
               onClick={() => setShowDeleteModal(false)}
               className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
             >
               Cancel
             </button>
           </div>
         </div>
       )}

       <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-100 flex items-center justify-between pt-safe-top">
         <button onClick={onCancel} className="flex items-center gap-1 text-slate-500 font-bold">
           <ChevronLeft size={20} /> Back
         </button>
         <h2 className="font-bold text-slate-800">Edit Profile</h2>
         <button onClick={() => onSave(profile)} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-full">Save</button>
       </div>

       <div className="p-6 space-y-6 overflow-y-auto pb-20">
         {/* Avatar */}
         <div className="flex flex-col items-center">
            <div className="relative">
              <img src={profile.photoUrl} alt="Me" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover" />
              <button className="absolute bottom-0 right-0 bg-slate-800 text-white p-2 rounded-full shadow-lg border-2 border-white">
                <Camera size={14} />
              </button>
            </div>
            <button onClick={onLogout} className="mt-4 flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
               <LogOut size={12} /> Log Out
            </button>
         </div>

         {/* Fields */}
         <div className="space-y-4">
           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1">Display Name</label>
             <input 
               className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 mt-1 focus:border-emerald-500 outline-none" 
               value={profile.name}
               onChange={e => setProfile({...profile, name: e.target.value})}
             />
           </div>
           
           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1">About Me</label>
             <textarea 
               className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 mt-1 h-24 focus:border-emerald-500 outline-none resize-none" 
               value={profile.bio}
               onChange={e => setProfile({...profile, bio: e.target.value})}
               placeholder="Write something about yourself..."
             />
           </div>

           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Interests</label>
             <div className="flex flex-wrap gap-2 mb-3">
               {profile.interests.map(int => (
                 <span key={int} className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   {int} <button onClick={() => removeInterest(int)}><X size={12} className="text-slate-400 hover:text-red-500" /></button>
                 </span>
               ))}
             </div>
             <div className="flex gap-2">
               <input 
                 className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none" 
                 placeholder="Add interest (e.g. Hiking)"
                 value={newInterest}
                 onChange={e => setNewInterest(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && addInterest()}
               />
               <button onClick={addInterest} className="p-3 bg-slate-800 text-white rounded-xl">
                 <Plus size={20} />
               </button>
             </div>
           </div>

           <div>
             <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block flex justify-between">
               <span>My Album</span>
               <span onClick={() => fileInputRef.current?.click()} className="text-emerald-500 cursor-pointer flex items-center gap-1">
                 <Plus size={12} /> {loadingImage ? 'Compressing...' : 'Add Photo'}
               </span>
             </label>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
             <div className="grid grid-cols-3 gap-2">
               {profile.album.map((img, idx) => (
                 <div key={idx} className="aspect-square relative group">
                   <img src={img} className="w-full h-full object-cover rounded-xl bg-slate-200" />
                   <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                     <Trash2 size={12} />
                   </button>
                 </div>
               ))}
               {profile.album.length === 0 && !loadingImage && (
                 <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-white hover:border-emerald-300 transition">
                    <ImageIcon size={20} />
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                 </div>
               )}
               {loadingImage && (
                 <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center animate-pulse">
                   <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
               )}
             </div>
           </div>

           {/* Legal & Compliance (Required for App Store) */}
           <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
             <a href="https://fresh-chat.pages.dev/privacy" target="_blank" className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-200 transition">
               <span className="flex items-center gap-2"><Lock size={16} /> Privacy Policy</span>
               <ChevronLeft className="rotate-180" size={16} />
             </a>
             <a href="https://fresh-chat.pages.dev/terms" target="_blank" className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-200 transition">
               <span className="flex items-center gap-2"><FileText size={16} /> Terms of Service</span>
               <ChevronLeft className="rotate-180" size={16} />
             </a>
             
             {/* RESTORE PURCHASES (REQUIRED FOR APPLE) */}
             <button onClick={handleRestorePurchases} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-200 transition">
               <span className="flex items-center gap-2"><RefreshCw size={16} /> Restore Purchases</span>
               <ChevronLeft className="rotate-180" size={16} />
             </button>

             {/* CONTACT SUPPORT (REQUIRED) */}
             <a href="mailto:support@freshchat.com" className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-200 transition">
               <span className="flex items-center gap-2"><HelpCircle size={16} /> Contact Support</span>
               <ChevronLeft className="rotate-180" size={16} />
             </a>
           </div>

           {/* Danger Zone */}
           <div className="mt-4">
             <button onClick={() => setShowDeleteModal(true)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition">
               <AlertTriangle size={18} /> Delete Account
             </button>
             <p className="text-center text-[10px] text-slate-400 mt-2">
               Permanently delete your account and all data.
             </p>
           </div>
         </div>
       </div>
    </div>
  );
};
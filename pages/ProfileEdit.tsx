
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, LogOut, X, Plus, Trash2, ImageIcon } from 'lucide-react';
import { User } from '../types';

interface ProfileEditProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
  onLogout: () => void;
}

export const ProfileEdit: React.FC<ProfileEditProps> = ({ user, onSave, onCancel, onLogout }) => {
  const [profile, setProfile] = useState<User>(user);
  const [newInterest, setNewInterest] = useState('');
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, album: [...profile.album, reader.result as string] });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setProfile({ ...profile, album: profile.album.filter((_, i) => i !== index) });
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
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
                 <Plus size={12} /> Add Photo
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
               {profile.album.length === 0 && (
                 <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-white hover:border-emerald-300 transition">
                    <ImageIcon size={20} />
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};

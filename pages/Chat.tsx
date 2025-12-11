
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, MoreVertical, MessageCircle, MapPin, Send, Image as ImageIcon, Check, CheckCheck } from 'lucide-react';
import { User, Message, AppScreen, FriendStatus, Coordinates } from '../types';
import { DataService } from '../services/database';
import { compressImage } from '../utils';

interface ChatProps {
  myProfile: User;
  chatUser: User;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (type: 'text' | 'location' | 'image', content?: string | Coordinates) => void;
  onShareLocation: () => void;
}

export const Chat: React.FC<ChatProps> = ({ 
  myProfile, chatUser, messages, onBack, onSendMessage, onShareLocation 
}) => {
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = DataService.getChatId(myProfile.id, chatUser.id);

  // Auto-scroll on mount
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 50);
  }, []);

  // Subscribe to Typing Status
  useEffect(() => {
    const unsub = DataService.subscribeToTyping(chatId, (usersTyping) => {
       const othersTyping = usersTyping.filter(uid => uid !== myProfile.id);
       setIsOtherTyping(othersTyping.length > 0);
    });
    return () => unsub && unsub();
  }, [chatId, myProfile.id]);

  // Handle Input Change (Emit Typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Set Typing True
    DataService.setTypingStatus(chatId, myProfile.id, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to false
    typingTimeoutRef.current = setTimeout(() => {
       DataService.setTypingStatus(chatId, myProfile.id, false);
    }, 2000);
  };

  // Smart Scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    
    const lastMsg = messages[messages.length - 1];
    const isMine = lastMsg?.senderId === myProfile.id;

    if (isMine || isNearBottom || isOtherTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, myProfile.id, isOtherTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage('text', inputText);
      setInputText('');
      DataService.setTypingStatus(chatId, myProfile.id, false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoadingImage(true);
      try {
        const compressedBase64 = await compressImage(file);
        onSendMessage('image', compressedBase64);
      } catch (err) {
        console.error("Compression Failed", err);
        alert("Failed to send image.");
      } finally {
        setLoadingImage(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {/* Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      {/* Glass Header */}
      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20 pt-safe-top shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="relative cursor-pointer">
            <img src={chatUser.photoUrl} className="w-10 h-10 rounded-full border border-slate-100 object-cover" alt={chatUser.name} />
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{chatUser.name}</h3>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button className="text-slate-400 p-2 hover:bg-slate-50 rounded-full">
           <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div 
         ref={chatContainerRef}
         className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10"
      >
         {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full text-slate-300">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <MessageCircle size={32} className="text-slate-300" />
             </div>
             <p className="text-sm font-bold text-slate-400">Say hello to {chatUser.name}!</p>
             <p className="text-xs text-slate-300 mt-1">Start the conversation...</p>
           </div>
         )}
         {messages.map((msg, idx) => {
           const isMe = msg.senderId === myProfile.id;
           return (
             <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
               <div className={`max-w-[75%] p-3.5 shadow-sm text-sm font-medium leading-relaxed relative group
                 ${isMe 
                   ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-[20px] rounded-tr-none shadow-emerald-200' 
                   : 'bg-white text-slate-700 border border-slate-100 rounded-[20px] rounded-tl-none shadow-slate-100'
               }`}>
                 {msg.type === 'image' && msg.imageUrl ? (
                   <img src={msg.imageUrl} alt="Sent" className="rounded-xl w-full max-w-[240px] mb-1 bg-black/10" />
                 ) : msg.type === 'location' ? (
                   <a 
                     href={`https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`}
                     target="_blank"
                     rel="noreferrer" 
                     className="flex items-center gap-2 underline decoration-white/30 font-bold"
                   >
                     <MapPin size={16} /> Shared Location
                   </a>
                 ) : (
                   msg.text
                 )}
                 
                 <div className={`flex items-center justify-end gap-1 mt-1 opacity-70 ${isMe ? 'text-blue-50' : 'text-slate-300'}`}>
                   <span className="text-[9px] font-bold tracking-wide">
                     {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                   {isMe && (
                     <span>
                       {msg.isRead ? <CheckCheck size={14} className="text-white" /> : <Check size={14} />}
                     </span>
                   )}
                 </div>
               </div>
             </div>
           );
         })}
         
         {/* Typing Bubble */}
         {isOtherTyping && (
           <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1">
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-[20px] rounded-tl-none flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
           </div>
         )}

         <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Island */}
      <div className="p-4 bg-transparent sticky bottom-0 z-20 pb-safe-bottom">
         <div className="glass-panel p-2 rounded-[28px] shadow-2xl shadow-slate-200/50 flex items-center gap-2 border border-white/60">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            
            {chatUser.friendStatus === FriendStatus.FRIEND && (
              <>
                <button onClick={onShareLocation} className="w-10 h-10 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full flex items-center justify-center transition">
                  <MapPin size={20} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full flex items-center justify-center transition">
                  {loadingImage ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <ImageIcon size={20} />}
                </button>
              </>
            )}
            
            <div className="flex-1">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="w-full bg-transparent border-none py-2 px-2 text-sm font-medium focus:ring-0 outline-none placeholder:text-slate-400 text-slate-700"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                inputText.trim() 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 active:scale-90' 
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              <Send size={18} className={inputText.trim() ? 'translate-x-0.5 translate-y-0.5' : ''} />
            </button>
         </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, MoreVertical, MessageCircle, MapPin, Send } from 'lucide-react';
import { User, Message, AppScreen, FriendStatus, Coordinates } from '../types';

interface ChatProps {
  myProfile: User;
  chatUser: User;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (type: 'text' | 'location', content?: string | Coordinates) => void;
  onShareLocation: () => void;
}

export const Chat: React.FC<ChatProps> = ({ 
  myProfile, chatUser, messages, onBack, onSendMessage, onShareLocation 
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on mount
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 50);
  }, []);

  // Smart Scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    
    const lastMsg = messages[messages.length - 1];
    const isMine = lastMsg?.senderId === myProfile.id;

    if (isMine || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, myProfile.id]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage('text', inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-safe-top">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div className="relative">
            <img src={chatUser.photoUrl} className="w-10 h-10 rounded-full border border-slate-100" alt={chatUser.name} />
            {chatUser.friendStatus === FriendStatus.FRIEND && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{chatUser.name}</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-400 font-medium">Online</span>
            </div>
          </div>
        </div>
        <button className="text-slate-300">
           <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div 
         ref={chatContainerRef}
         className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
      >
         {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50">
             <MessageCircle size={64} className="mb-2" />
             <p className="text-sm font-medium">Say hello to {chatUser.name}!</p>
           </div>
         )}
         {messages.map((msg, idx) => {
           const isMe = msg.senderId === myProfile.id;
           return (
             <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[75%] p-3.5 rounded-2xl shadow-sm text-sm font-medium leading-relaxed relative ${
                 isMe 
                   ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-none' 
                   : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
               }`}>
                 {msg.type === 'location' ? (
                   <a 
                     href={`https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`}
                     target="_blank"
                     rel="noreferrer" 
                     className="flex items-center gap-2 underline decoration-white/30"
                   >
                     <MapPin size={16} /> Shared Location
                   </a>
                 ) : (
                   msg.text
                 )}
                 <span className={`text-[9px] absolute bottom-1 right-2 opacity-60 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
             </div>
           );
         })}
         <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 pb-safe-bottom">
        {chatUser.friendStatus === FriendStatus.FRIEND && (
          <button onClick={onShareLocation} className="p-3 text-slate-400 bg-slate-50 rounded-full hover:bg-emerald-50 hover:text-emerald-500 transition">
            <MapPin size={20} />
          </button>
        )}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-50 border-none rounded-full py-3 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-100 outline-none placeholder:text-slate-400"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={!inputText.trim()}
          className={`p-3 rounded-full transition-all shadow-md flex items-center justify-center ${
            inputText.trim() ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-300'
          }`}
        >
          <Send size={20} className={inputText.trim() ? 'translate-x-0.5' : ''} />
        </button>
      </div>
    </div>
  );
};


import { User, Message, FriendStatus } from '../types';

// Keys for LocalStorage
const USERS_KEY = 'fc_users';
const MESSAGES_KEY = 'fc_messages';

// Helper to get data
const getStoredUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

const getStoredMessages = (): Record<string, Message[]> => {
  const data = localStorage.getItem(MESSAGES_KEY);
  return data ? JSON.parse(data) : {};
};

// --- PUBSUB SYSTEM FOR REALTIME UPDATES ---
type Listener = () => void;
const listeners: Listener[] = [];

const notifyListeners = () => {
  listeners.forEach(l => l());
};

// Listen for changes from OTHER tabs
window.addEventListener('storage', (e) => {
  if (e.key === USERS_KEY || e.key === MESSAGES_KEY || e.key.startsWith('rel_') || e.key.startsWith('last_read_')) {
    notifyListeners();
  }
});

// --- API ---

export const LocalDb = {
  subscribe: (callback: Listener) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  },

  upsertUser: (user: User) => {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    notifyListeners();
  },

  getUsers: (): User[] => {
    return getStoredUsers();
  },

  getMessages: (chatId: string): Message[] => {
    const all = getStoredMessages();
    return all[chatId] || [];
  },

  sendMessage: (chatId: string, message: Message) => {
    const all = getStoredMessages();
    const chatMsgs = all[chatId] || [];
    chatMsgs.push(message);
    all[chatId] = chatMsgs;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
    notifyListeners();
  },

  // Helper to generate a consistent Chat ID between two users
  getChatId: (user1Id: string, user2Id: string) => {
    return [user1Id, user2Id].sort().join('_');
  },

  updateFriendStatus: (myId: string, targetUserId: string, status: FriendStatus) => {
    const key = `rel_${[myId, targetUserId].sort().join('_')}`;
    localStorage.setItem(key, status);
    notifyListeners();
  },

  getFriendStatus: (myId: string, targetUserId: string): FriendStatus => {
    const key = `rel_${[myId, targetUserId].sort().join('_')}`;
    return (localStorage.getItem(key) as FriendStatus) || FriendStatus.NONE;
  },

  markAsRead: (chatId: string, userId: string) => {
    const key = `last_read_${chatId}_${userId}`;
    localStorage.setItem(key, Date.now().toString());
    notifyListeners();
  },

  getUnreadCount: (chatId: string, userId: string): number => {
    const key = `last_read_${chatId}_${userId}`;
    const lastRead = parseInt(localStorage.getItem(key) || '0');
    const allMessages = LocalDb.getMessages(chatId);
    // Count messages NOT sent by me that are newer than my last read time
    return allMessages.filter(m => m.senderId !== userId && m.timestamp > lastRead).length;
  },
  
  clearData: () => {
    localStorage.clear();
    notifyListeners();
  }
};

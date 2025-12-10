import { User, Message, FriendStatus, FriendshipData } from '../types';

// Keys for LocalStorage
const USERS_KEY = 'fc_users';
const MESSAGES_KEY = 'fc_messages';
const TYPING_KEY_PREFIX = 'typing_';

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
  if (!e.key) return;
  if (e.key === USERS_KEY || e.key === MESSAGES_KEY || e.key.startsWith('rel_') || e.key.startsWith('last_read_') || e.key.startsWith(TYPING_KEY_PREFIX)) {
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

  getChatId: (user1Id: string, user2Id: string) => {
    return [user1Id, user2Id].sort().join('_');
  },

  updateFriendStatus: (myId: string, targetUserId: string, status: FriendStatus) => {
    const key = `rel_${[myId, targetUserId].sort().join('_')}`;
    const data: FriendshipData = { status, initiatedBy: status === FriendStatus.PENDING ? myId : undefined };
    localStorage.setItem(key, JSON.stringify(data));
    notifyListeners();
  },

  getFriendStatus: (myId: string, targetUserId: string): FriendStatus => {
    const key = `rel_${[myId, targetUserId].sort().join('_')}`;
    const raw = localStorage.getItem(key);
    if (!raw) return FriendStatus.NONE;
    try {
      // Handle legacy string format or new JSON object
      const parsed = JSON.parse(raw);
      return parsed.status || FriendStatus.NONE;
    } catch {
      return raw as FriendStatus;
    }
  },

  getAllFriendships: (userId: string): Record<string, FriendshipData> => {
    const result: Record<string, FriendshipData> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rel_')) {
        const raw = localStorage.getItem(key);
        let val: FriendshipData = { status: FriendStatus.NONE };
        try {
            const parsed = JSON.parse(raw || '{}');
            val = { status: parsed.status, initiatedBy: parsed.initiatedBy };
        } catch {
            val = { status: raw as FriendStatus };
        }

        const idString = key.substring(4);
        
        if (idString.startsWith(userId + '_')) {
            const otherId = idString.substring(userId.length + 1);
            result[otherId] = val;
        } 
        else if (idString.endsWith('_' + userId)) {
            const otherId = idString.substring(0, idString.length - userId.length - 1);
            result[otherId] = val;
        }
      }
    }
    return result;
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
    return allMessages.filter(m => m.senderId !== userId && m.timestamp > lastRead).length;
  },

  // Typing
  setTypingStatus: (chatId: string, userId: string, isTyping: boolean) => {
    const key = `${TYPING_KEY_PREFIX}${chatId}`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    if (isTyping) {
      current[userId] = true;
    } else {
      delete current[userId];
    }
    localStorage.setItem(key, JSON.stringify(current));
    notifyListeners();
  },

  getTypingUsers: (chatId: string): string[] => {
    const key = `${TYPING_KEY_PREFIX}${chatId}`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.keys(current);
  },

  blockUser: (myId: string, targetId: string) => {
    const users = getStoredUsers();
    const me = users.find(u => u.id === myId);
    if (me) {
      if (!me.blockedUsers) me.blockedUsers = [];
      if (!me.blockedUsers.includes(targetId)) {
        me.blockedUsers.push(targetId);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        notifyListeners();
      }
    }
  },
  
  clearData: () => {
    localStorage.clear();
    notifyListeners();
  }
};
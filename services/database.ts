import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  onSnapshot, query, where, orderBy, addDoc, updateDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { User, Message, FriendStatus } from '../types';
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig';
import { LocalDb } from './localDb';

// --- FIREBASE INITIALIZATION ---
let db: any;
let auth: any;

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  // Auto sign-in anonymously to allow DB access
  signInAnonymously(auth).catch(console.error);
}

// --- HYBRID SERVICE ---
// This service checks if Firebase is configured. 
// If YES: It uses the Cloud (Real Multi-User).
// If NO: It uses LocalDb (Single Device Simulation).

export const DataService = {
  
  subscribeToUsers: (currentUserId: string, callback: (users: User[]) => void) => {
    if (isFirebaseConfigured()) {
      // Real Firebase Listener
      const q = query(collection(db, 'users'));
      return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        callback(users);
      });
    } else {
      // Local Storage Listener
      const update = () => callback(LocalDb.getUsers());
      const unsub = LocalDb.subscribe(update);
      update(); // Initial call
      return unsub;
    }
  },

  subscribeToMessages: (chatId: string, callback: (msgs: Message[]) => void) => {
    if (isFirebaseConfigured()) {
      const q = query(
        collection(db, 'chats', chatId, 'messages'), 
        orderBy('timestamp', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        callback(msgs);
      });
    } else {
      const update = () => callback(LocalDb.getMessages(chatId));
      const unsub = LocalDb.subscribe(update);
      update();
      return unsub;
    }
  },

  upsertUser: async (user: User) => {
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'users', user.id), user);
    } else {
      LocalDb.upsertUser(user);
    }
  },

  sendMessage: async (chatId: string, message: Message) => {
    if (isFirebaseConfigured()) {
      // Create chat doc if not exists
      await setDoc(doc(db, 'chats', chatId), { lastUpdated: Date.now() }, { merge: true });
      // Add message
      await addDoc(collection(db, 'chats', chatId, 'messages'), message);
    } else {
      LocalDb.sendMessage(chatId, message);
    }
  },

  updateFriendStatus: async (myId: string, targetUserId: string, status: FriendStatus) => {
    if (isFirebaseConfigured()) {
      // In Firestore, we store relationships in a subcollection or separate collection
      // For simplicity, we'll use a composite ID document in a 'relationships' collection
      const relId = [myId, targetUserId].sort().join('_');
      await setDoc(doc(db, 'relationships', relId), {
        [myId]: status, // Simplified logic for demo
        status: status,
        users: [myId, targetUserId]
      }, { merge: true });
    } else {
      LocalDb.updateFriendStatus(myId, targetUserId, status);
    }
  },
  
  getChatId: (u1: string, u2: string) => {
    return [u1, u2].sort().join('_');
  },

  // Helpers for synchronous reads (only used in LocalMode usually, 
  // but we adapt for Firebase by defaulting to empty or handling async elsewhere)
  getFriendStatus: (myId: string, targetUserId: string): FriendStatus => {
    if (isFirebaseConfigured()) {
       // Firebase is async, so UI should ideally subscribe. 
       // For this prototype refactor, we rely on LocalDb for immediate values 
       // or assume the React State holds the truth from subscriptions.
       return FriendStatus.NONE; 
    }
    return LocalDb.getFriendStatus(myId, targetUserId);
  },

  markAsRead: async (chatId: string, userId: string) => {
    if (isFirebaseConfigured()) {
       // Store read receipt in chat metadata
       // Implementation omitted for brevity in hybrid mode
    } else {
      LocalDb.markAsRead(chatId, userId);
    }
  },
  
  getUnreadCountSync: (chatId: string, userId: string): number => {
    if (isFirebaseConfigured()) return 0; // Handled by subscription in real app
    return LocalDb.getUnreadCount(chatId, userId);
  }
};
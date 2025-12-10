import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  onSnapshot, query, where, orderBy, addDoc, updateDoc,
  Firestore, getDoc, increment, arrayUnion, deleteDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, GoogleAuthProvider, signInWithPopup, deleteUser } from 'firebase/auth';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { User, Message, FriendStatus, FriendshipData } from '../types';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';
import { LocalDb } from './localDb';

// --- FIREBASE INITIALIZATION ---
// Explicitly type as any or the correct type to avoid noImplicitAny build errors
let db: Firestore | any;
let auth: Auth | any;
let messaging: Messaging | any;

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  messaging = getMessaging(app);
  
  // Auto sign-in anonymously to allow DB access (only if not already signed in)
  auth.onAuthStateChanged((user: any) => {
    if (!user) {
      signInAnonymously(auth).catch(console.error);
    }
  });
}

// --- HYBRID SERVICE ---

export const DataService = {
  
  requestNotificationPermission: async (userId: string) => {
    if (!isFirebaseConfigured()) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE' // You need to generate this in Firebase Console -> Cloud Messaging
        });
        
        if (token) {
          // Save token to user profile
          await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true });
        }
      }
    } catch (error) {
      console.warn("Notification permission failed", error);
    }
  },

  deleteAccount: async (userId: string) => {
    if (isFirebaseConfigured()) {
       try {
         // 1. Delete Firestore Data
         await deleteDoc(doc(db, 'users', userId));
         
         // 2. Delete Auth Account
         if (auth.currentUser) {
           await deleteUser(auth.currentUser);
         }
       } catch (error) {
         console.error("Error deleting account", error);
         throw error;
       }
    } else {
      // Local Simulation
      const users = LocalDb.getUsers().filter(u => u.id !== userId);
      localStorage.setItem('fc_users', JSON.stringify(users));
    }
  },

  loginWithGoogle: async (): Promise<User> => {
    if (isFirebaseConfigured()) {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        
        // Check if user exists in DB to preserve data
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Return existing user data
          return { id: userDoc.id, ...userDoc.data() } as User;
        }
        
        // Return new user based on Google Profile
        return {
          id: fbUser.uid,
          name: fbUser.displayName || 'Google User',
          photoUrl: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'User')}&background=4285F4&color=fff`,
          gender: 'Other',
          age: 25,
          bio: '',
          interests: [],
          album: [],
          location: { latitude: 0, longitude: 0 },
          friendStatus: FriendStatus.NONE,
          authMethod: 'google',
          unreadCount: 0,
          hearts: 0,
          views: 0,
          lastActive: Date.now(),
          blockedUsers: []
        };
      } catch (error) {
        // Error handling is done in the UI component
        throw error;
      }
    } else {
      // Simulation Fallback
      return new Promise((resolve) => {
        setTimeout(() => {
           const userId = `google_${Date.now()}`;
           resolve({
             id: userId,
             name: "Google User (Sim)",
             photoUrl: `https://ui-avatars.com/api/?name=Google+User&background=4285F4&color=fff`,
             gender: 'Other',
             age: 25,
             bio: '',
             interests: [],
             album: [],
             location: { latitude: 0, longitude: 0 },
             friendStatus: FriendStatus.NONE,
             authMethod: 'google',
             unreadCount: 0,
             hearts: 0,
             views: 0,
             lastActive: Date.now(),
             blockedUsers: []
           });
        }, 1500);
      });
    }
  },

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

  subscribeToRelationships: (currentUserId: string, callback: (relationships: Record<string, FriendshipData>) => void) => {
    if (isFirebaseConfigured()) {
       // In Firestore, we listen to the relationships collection where currentUserId is in 'users' array
       const q = query(collection(db, 'relationships'), where('users', 'array-contains', currentUserId));
       return onSnapshot(q, (snapshot) => {
          const rels: Record<string, FriendshipData> = {};
          snapshot.docs.forEach(doc => {
             const data = doc.data();
             // Find the other user ID
             const otherId = data.users.find((uid: string) => uid !== currentUserId);
             if (otherId) {
                rels[otherId] = {
                  status: data.status as FriendStatus,
                  initiatedBy: data.initiatedBy
                };
             }
          });
          callback(rels);
       });
    } else {
      const update = () => callback(LocalDb.getAllFriendships(currentUserId));
      const unsub = LocalDb.subscribe(update);
      update();
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
    // Clean data (Nuclear Option)
    // Firestore crashes if fields are undefined. JSON.stringify removes undefined fields.
    const cleanUser = JSON.parse(JSON.stringify(user));

    if (isFirebaseConfigured()) {
      // Ensure specific fields are present (safety defaults)
      if (cleanUser.hearts === undefined) cleanUser.hearts = 0;
      if (cleanUser.views === undefined) cleanUser.views = 0;
      if (cleanUser.blockedUsers === undefined) cleanUser.blockedUsers = [];
      
      await setDoc(doc(db, 'users', user.id), cleanUser, { merge: true });
    } else {
      LocalDb.upsertUser(cleanUser);
    }
  },

  // --- SAFETY FEATURES ---

  blockUser: async (myId: string, targetId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', myId);
      await setDoc(ref, { blockedUsers: arrayUnion(targetId) }, { merge: true });
      
      // Also block reports collection logic if needed
      await addDoc(collection(db, 'reports'), {
        reporterId: myId,
        targetId: targetId,
        reason: 'Blocked by user',
        timestamp: Date.now()
      });
    } else {
      LocalDb.blockUser(myId, targetId);
    }
  },

  reportUser: async (myId: string, targetId: string, reason: string) => {
    if (isFirebaseConfigured()) {
      await addDoc(collection(db, 'reports'), {
        reporterId: myId,
        targetId: targetId,
        reason: reason,
        timestamp: Date.now()
      });
    }
    // No local implementation for reporting
  },

  // --- TYPING INDICATORS ---

  setTypingStatus: async (chatId: string, userId: string, isTyping: boolean) => {
     if (isFirebaseConfigured()) {
       const ref = doc(db, 'chats', chatId);
       await setDoc(ref, { 
         [`typing.${userId}`]: isTyping 
       }, { merge: true });
     } else {
       LocalDb.setTypingStatus(chatId, userId, isTyping);
     }
  },

  subscribeToTyping: (chatId: string, callback: (typingUsers: string[]) => void) => {
    if (isFirebaseConfigured()) {
      return onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
        const data = docSnap.data();
        const typing: string[] = [];
        if (data && data.typing) {
          Object.keys(data.typing).forEach(uid => {
            if (data.typing[uid] === true) typing.push(uid);
          });
        }
        callback(typing);
      });
    } else {
      const update = () => callback(LocalDb.getTypingUsers(chatId));
      const unsub = LocalDb.subscribe(update);
      return unsub;
    }
  },

  // --- ENGAGEMENT FEATURES ---

  updateLastActive: async (userId: string) => {
    if (!userId) return;
    const now = Date.now();
    if (isFirebaseConfigured()) {
       try {
         // FIX: Use setDoc with merge instead of updateDoc to prevent crashes if doc doesn't exist yet
         await setDoc(doc(db, 'users', userId), { lastActive: now }, { merge: true });
       } catch (e) {
         console.warn("Failed to update active status", e);
       }
    } else {
       // Local DB logic: read, update, write
       const users = LocalDb.getUsers();
       const u = users.find(u => u.id === userId);
       if (u) {
         u.lastActive = now;
         LocalDb.upsertUser(u);
       }
    }
  },

  trackProfileVisit: async (targetUserId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', targetUserId);
      await setDoc(ref, { views: increment(1) }, { merge: true });
    } else {
      const users = LocalDb.getUsers();
      const u = users.find(u => u.id === targetUserId);
      if (u) {
        u.views = (u.views || 0) + 1;
        LocalDb.upsertUser(u);
      }
    }
  },

  sendHeart: async (targetUserId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', targetUserId);
      await setDoc(ref, { hearts: increment(1) }, { merge: true });
    } else {
      const users = LocalDb.getUsers();
      const u = users.find(u => u.id === targetUserId);
      if (u) {
        u.hearts = (u.hearts || 0) + 1;
        LocalDb.upsertUser(u);
      }
    }
  },

  // --- MESSAGING ---

  sendMessage: async (chatId: string, message: Message) => {
    // Sanitize message to remove undefined fields
    const payload = JSON.parse(JSON.stringify(message));
    
    if (isFirebaseConfigured()) {
      try {
        // Create chat doc if not exists
        await setDoc(doc(db, 'chats', chatId), { lastUpdated: Date.now() }, { merge: true });
        // Add message
        await addDoc(collection(db, 'chats', chatId, 'messages'), payload);
      } catch (e) {
        console.error("Error sending message:", e);
      }
    } else {
      LocalDb.sendMessage(chatId, message);
    }
  },

  updateFriendStatus: async (myId: string, targetUserId: string, status: FriendStatus) => {
    if (isFirebaseConfigured()) {
      // Store relationships in a 'relationships' collection
      const relId = [myId, targetUserId].sort().join('_');
      await setDoc(doc(db, 'relationships', relId), {
        status: status,
        users: [myId, targetUserId],
        initiatedBy: status === FriendStatus.PENDING ? myId : null
      }, { merge: true });
    } else {
      LocalDb.updateFriendStatus(myId, targetUserId, status);
    }
  },
  
  getChatId: (u1: string, u2: string) => {
    return [u1, u2].sort().join('_');
  },

  getFriendStatus: (myId: string, targetUserId: string): FriendStatus => {
    if (isFirebaseConfigured()) return FriendStatus.NONE; 
    return LocalDb.getFriendStatus(myId, targetUserId);
  },

  markAsRead: async (chatId: string, userId: string) => {
    if (isFirebaseConfigured()) {
       try {
         await setDoc(doc(db, 'chats', chatId), { 
           [`lastRead_${userId}`]: Date.now() 
         }, { merge: true });
       } catch (e) {
         console.error("Error marking read:", e);
       }
    } else {
      LocalDb.markAsRead(chatId, userId);
    }
  },
  
  getUnreadCountSync: (chatId: string, userId: string): number => {
    if (isFirebaseConfigured()) return 0;
    return LocalDb.getUnreadCount(chatId, userId);
  }
};
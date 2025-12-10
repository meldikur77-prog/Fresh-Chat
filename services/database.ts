
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  onSnapshot, query, where, orderBy, addDoc, updateDoc,
  Firestore, getDoc, increment, arrayUnion, deleteDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, GoogleAuthProvider, signInWithPopup, deleteUser, OAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { User, Message, FriendStatus, FriendshipData } from '../types';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';
import { LocalDb } from './localDb';

// --- FIREBASE INITIALIZATION ---
let db: Firestore | any;
let auth: Auth | any;
let messaging: Messaging | any;

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  messaging = getMessaging(app);
  
  auth.onAuthStateChanged((user: any) => {
    if (!user) {
      // signInAnonymously(auth).catch(console.error); 
      // Commented out anonymous auth as we prefer explicit guest/google login flow
    }
  });
}

export const DataService = {
  
  requestNotificationPermission: async (userId: string) => {
    if (!isFirebaseConfigured()) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE' 
        });
        if (token) {
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
         await deleteDoc(doc(db, 'users', userId));
         if (auth.currentUser) {
           await deleteUser(auth.currentUser);
         }
       } catch (error) {
         console.error("Error deleting account", error);
         throw error;
       }
    } else {
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
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          return { id: userDoc.id, ...userDoc.data() } as User;
        }
        
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
        throw error;
      }
    } else {
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

  loginWithApple: async (): Promise<User> => {
    if (isFirebaseConfigured()) {
      const provider = new OAuthProvider('apple.com');
      try {
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          return { id: userDoc.id, ...userDoc.data() } as User;
        }
        
        return {
          id: fbUser.uid,
          name: fbUser.displayName || 'Apple User',
          photoUrl: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'User')}&background=000000&color=fff`,
          gender: 'Other',
          age: 25,
          bio: '',
          interests: [],
          album: [],
          location: { latitude: 0, longitude: 0 },
          friendStatus: FriendStatus.NONE,
          authMethod: 'apple',
          unreadCount: 0,
          hearts: 0,
          views: 0,
          lastActive: Date.now(),
          blockedUsers: []
        };
      } catch (error) {
        throw error;
      }
    } else {
       // Simulation
       const userId = `apple_${Date.now()}`;
       return {
          id: userId,
          name: "Apple User (Sim)",
          photoUrl: `https://ui-avatars.com/api/?name=Apple+User&background=000000&color=fff`,
          gender: 'Other',
          age: 25,
          bio: '',
          interests: [],
          album: [],
          location: { latitude: 0, longitude: 0 },
          friendStatus: FriendStatus.NONE,
          authMethod: 'apple',
          unreadCount: 0,
          hearts: 0,
          views: 0,
          lastActive: Date.now(),
          blockedUsers: []
       };
    }
  },

  subscribeToUsers: (currentUserId: string, callback: (users: User[]) => void) => {
    if (isFirebaseConfigured()) {
      const q = query(collection(db, 'users'));
      return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        callback(users);
      });
    } else {
      const update = () => callback(LocalDb.getUsers());
      const unsub = LocalDb.subscribe(update);
      update();
      return unsub;
    }
  },

  subscribeToRelationships: (currentUserId: string, callback: (relationships: Record<string, FriendshipData>) => void) => {
    if (isFirebaseConfigured()) {
       const q = query(collection(db, 'relationships'), where('users', 'array-contains', currentUserId));
       return onSnapshot(q, (snapshot) => {
          const rels: Record<string, FriendshipData> = {};
          snapshot.docs.forEach(doc => {
             const data = doc.data();
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

  subscribeToUnreadCounts: (myId: string, callback: (counts: Record<string, number>) => void) => {
    if (isFirebaseConfigured()) {
      const q = query(collection(db, 'chats'));
      return onSnapshot(q, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (doc.id.includes(myId)) {
            const parts = doc.id.split('_');
            const otherId = parts[0] === myId ? parts[1] : parts[0];
            const count = data[`unread_${myId}`] || 0;
            if (count > 0) {
              counts[otherId] = count;
            }
          }
        });
        callback(counts);
      });
    } else {
      return () => {};
    }
  },

  upsertUser: async (user: User) => {
    // NUCLEAR SANITIZATION: Strip undefined values to prevent Firestore crashes
    const cleanUser = JSON.parse(JSON.stringify(user));

    if (isFirebaseConfigured()) {
      // Default initial values for stats if missing
      if (cleanUser.hearts === undefined) cleanUser.hearts = 0;
      if (cleanUser.views === undefined) cleanUser.views = 0;
      if (cleanUser.blockedUsers === undefined) cleanUser.blockedUsers = [];
      
      // Use setDoc with merge:true to be safe against race conditions
      await setDoc(doc(db, 'users', user.id), cleanUser, { merge: true });
    } else {
      LocalDb.upsertUser(cleanUser);
    }
  },

  blockUser: async (myId: string, targetId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', myId);
      await setDoc(ref, { blockedUsers: arrayUnion(targetId) }, { merge: true });
      await addDoc(collection(db, 'reports'), {
        reporterId: myId, targetId: targetId, reason: 'Blocked by user', timestamp: Date.now()
      });
    } else {
      LocalDb.blockUser(myId, targetId);
    }
  },

  reportUser: async (myId: string, targetId: string, reason: string) => {
    if (isFirebaseConfigured()) {
      await addDoc(collection(db, 'reports'), {
        reporterId: myId, targetId: targetId, reason: reason, timestamp: Date.now()
      });
    }
  },

  setTypingStatus: async (chatId: string, userId: string, isTyping: boolean) => {
     if (isFirebaseConfigured()) {
       const ref = doc(db, 'chats', chatId);
       await setDoc(ref, { [`typing.${userId}`]: isTyping }, { merge: true });
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

  updateLastActive: async (userId: string) => {
    if (!userId) return;
    const now = Date.now();
    if (isFirebaseConfigured()) {
       try {
         await setDoc(doc(db, 'users', userId), { lastActive: now }, { merge: true });
       } catch (e) { console.warn("Failed to update active status", e); }
    } else {
       const users = LocalDb.getUsers();
       const u = users.find(u => u.id === userId);
       if (u) { u.lastActive = now; LocalDb.upsertUser(u); }
    }
  },

  trackProfileVisit: async (targetUserId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', targetUserId);
      await setDoc(ref, { views: increment(1) }, { merge: true });
    } else {
      const users = LocalDb.getUsers();
      const u = users.find(u => u.id === targetUserId);
      if (u) { u.views = (u.views || 0) + 1; LocalDb.upsertUser(u); }
    }
  },

  sendHeart: async (targetUserId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', targetUserId);
      await setDoc(ref, { hearts: increment(1) }, { merge: true });
    } else {
      const users = LocalDb.getUsers();
      const u = users.find(u => u.id === targetUserId);
      if (u) { u.hearts = (u.hearts || 0) + 1; LocalDb.upsertUser(u); }
    }
  },

  sendMessage: async (chatId: string, message: Message) => {
    const payload = JSON.parse(JSON.stringify(message));
    
    if (isFirebaseConfigured()) {
      try {
        const parts = chatId.split('_');
        const receiverId = parts[0] === message.senderId ? parts[1] : parts[0];

        // 1. Update Chat Meta (Last Update & Increment Unread for Receiver)
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, { 
          lastUpdated: Date.now(),
          [`unread_${receiverId}`]: increment(1) // Atomic increment
        }, { merge: true });

        // 2. Add Message
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
         // Reset unread count for this user to 0
         await setDoc(doc(db, 'chats', chatId), { 
           [`lastRead_${userId}`]: Date.now(),
           [`unread_${userId}`]: 0 
         }, { merge: true });
       } catch (e) {
         console.error("Error marking read:", e);
       }
    } else {
      LocalDb.markAsRead(chatId, userId);
    }
  },
  
  getUnreadCountSync: (chatId: string, userId: string): number => {
    // For local DB only. Firebase uses subscription.
    if (isFirebaseConfigured()) return 0;
    return LocalDb.getUnreadCount(chatId, userId);
  }
};

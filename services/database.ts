
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  onSnapshot, query, where, orderBy, addDoc, updateDoc,
  Firestore, getDoc, increment, arrayUnion, deleteDoc, writeBatch, runTransaction
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, GoogleAuthProvider, signInWithPopup, deleteUser, OAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { User, Message, FriendStatus, FriendshipData } from '../types';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';
import { LocalDb } from './localDb';
import { calculateLevel, isConsecutiveDay, isSameDay } from '../utils';

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
    }
  });
}

export const DataService = {
  
  requestNotificationPermission: async (userId: string) => {
    if (!isFirebaseConfigured()) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // NOTE: You need to generate a VAPID key in Firebase Console -> Cloud Messaging
        // and replace the string below for Web Push to work.
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
          blockedUsers: [],
          xp: 0,
          level: 1,
          badges: []
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
             blockedUsers: [],
             xp: 0,
             level: 1,
             badges: []
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
          blockedUsers: [],
          xp: 0,
          level: 1,
          badges: []
        };
      } catch (error) {
        throw error;
      }
    } else {
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
          blockedUsers: [],
          xp: 0,
          level: 1,
          badges: []
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
             const otherId = data.users?.find((uid: string) => uid !== currentUserId);
             if (otherId) {
                rels[otherId] = {
                  status: data.status as FriendStatus,
                  initiatedBy: data.initiatedBy,
                  streak: data.streak || 0,
                  lastInteraction: data.lastInteraction
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
      // Note: This listens to ALL chats collection. For production scale, you would want a more targeted query
      // or a separate subcollection for user notifications.
      const q = query(collection(db, 'chats'));
      return onSnapshot(q, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Check if this chat doc relates to me
          if (doc.id.includes(myId)) {
            const parts = doc.id.split('_');
            // If my ID is part of the key
            if (parts.includes(myId)) {
                const otherId = parts[0] === myId ? parts[1] : parts[0];
                const count = data[`unread_${myId}`] || 0;
                if (count > 0) {
                counts[otherId] = count;
                }
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
    // SANITIZATION: Remove undefined fields that crash Firestore
    const cleanUser = JSON.parse(JSON.stringify(user));

    if (isFirebaseConfigured()) {
      // Default Values if missing
      if (cleanUser.hearts === undefined) cleanUser.hearts = 0;
      if (cleanUser.views === undefined) cleanUser.views = 0;
      if (cleanUser.xp === undefined) cleanUser.xp = 0;
      if (cleanUser.level === undefined) cleanUser.level = 1;
      if (cleanUser.badges === undefined) cleanUser.badges = [];
      if (cleanUser.blockedUsers === undefined) cleanUser.blockedUsers = [];
      
      await setDoc(doc(db, 'users', user.id), cleanUser, { merge: true });
    } else {
      LocalDb.upsertUser(cleanUser);
    }
  },

  // --- GAMIFICATION: AWARD XP ---
  awardXP: async (userId: string, amount: number) => {
    if (isFirebaseConfigured()) {
      const userRef = doc(db, 'users', userId);
      try {
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) return;

          const data = userDoc.data();
          const currentXP = data.xp || 0;
          const newXP = currentXP + amount;
          const currentLevel = calculateLevel(currentXP);
          const newLevel = calculateLevel(newXP);
          
          let badges = data.badges || [];
          const hearts = data.hearts || 0;

          // Unlock Badges
          if (!badges.includes('popular') && hearts >= 10) badges.push('popular');
          if (!badges.includes('superstar') && hearts >= 50) badges.push('superstar');
          if (!badges.includes('veteran') && newLevel >= 5) badges.push('veteran');

          transaction.update(userRef, { 
            xp: newXP, 
            level: newLevel,
            badges: badges
          });
        });
      } catch (e) {
        console.error("Error awarding XP", e);
      }
    } else {
       const users = LocalDb.getUsers();
       const u = users.find(u => u.id === userId);
       if (u) {
         u.xp = (u.xp || 0) + amount;
         u.level = calculateLevel(u.xp);
         LocalDb.upsertUser(u);
       }
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
       // Use setDoc with merge to prevent crashes if doc doesn't exist
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

  markUserOffline: async (userId: string) => {
    if (!userId) return;
    const offlineTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
    if (isFirebaseConfigured()) {
       try {
         await setDoc(doc(db, 'users', userId), { lastActive: offlineTime }, { merge: true });
       } catch (e) { console.warn("Failed to mark user offline", e); }
    } else {
       const users = LocalDb.getUsers();
       const u = users.find(u => u.id === userId);
       if (u) { u.lastActive = offlineTime; LocalDb.upsertUser(u); }
    }
  },

  trackProfileVisit: async (targetUserId: string) => {
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'users', targetUserId);
      await setDoc(ref, { views: increment(1) }, { merge: true });
      DataService.awardXP(targetUserId, 2); // Small XP for being visited
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
      DataService.awardXP(targetUserId, 10); // Big XP for heart
    } else {
      const users = LocalDb.getUsers();
      const u = users.find(u => u.id === targetUserId);
      if (u) { u.hearts = (u.hearts || 0) + 1; LocalDb.upsertUser(u); }
    }
  },

  sendMessage: async (chatId: string, message: Message) => {
    // SANITIZATION
    const payload = JSON.parse(JSON.stringify(message));
    
    if (isFirebaseConfigured()) {
      try {
        const parts = chatId.split('_');
        const receiverId = parts[0] === message.senderId ? parts[1] : parts[0];

        // 1. AWARD XP
        DataService.awardXP(message.senderId, 5);

        // 2. HANDLE STREAK LOGIC
        const relId = [message.senderId, receiverId].sort().join('_');
        const relRef = doc(db, 'relationships', relId);
        const relSnap = await getDoc(relRef);
        
        if (relSnap.exists()) {
           const data = relSnap.data();
           const lastInteraction = data.lastInteraction || 0;
           let streak = data.streak || 0;
           const now = Date.now();

           if (isConsecutiveDay(lastInteraction, now)) {
              streak += 1;
           } else if (!isSameDay(lastInteraction, now)) {
              streak = 1; // Reset if broken (but ignore if same day)
           }
           
           await updateDoc(relRef, { streak: streak, lastInteraction: now });
        }

        // 3. Update Chat Meta
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, { 
          lastUpdated: Date.now(),
          [`unread_${receiverId}`]: increment(1) 
        }, { merge: true });

        // 4. Add Message
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
        initiatedBy: status === FriendStatus.PENDING ? myId : null,
        streak: 0,
        lastInteraction: Date.now()
      }, { merge: true });
      
      if (status === FriendStatus.FRIEND) {
         DataService.awardXP(myId, 50);
         DataService.awardXP(targetUserId, 50);
      }
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
           [`lastRead_${userId}`]: Date.now(),
           [`unread_${userId}`]: 0 
         }, { merge: true });

         // OPTIMIZED QUERY: Use '==' to avoid Composite Index errors
         const parts = chatId.split('_');
         const otherUserId = parts[0] === userId ? parts[1] : parts[0];

         const messagesRef = collection(db, 'chats', chatId, 'messages');
         const q = query(messagesRef, where('senderId', '==', otherUserId), where('isRead', '==', false));
         const snapshot = await getDocs(q);
         
         if (!snapshot.empty) {
           const batch = writeBatch(db);
           snapshot.docs.forEach(docSnap => {
             batch.update(docSnap.ref, { isRead: true });
           });
           await batch.commit();
         }
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

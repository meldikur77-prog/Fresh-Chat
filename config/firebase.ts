// --- FIREBASE CONFIGURATION ---
// To make this app work with REAL users across different devices,
// you must create a Firebase Project and paste your keys here.

// IMPORTANT: Since you are deployed at https://fresh-chat.pages.dev/,
// you MUST add "fresh-chat.pages.dev" to your Authorized Domains in Firebase.
// Go to: Firebase Console -> Authentication -> Settings -> Authorized Domains -> Add Domain

export const firebaseConfig = {
  apiKey: "AIzaSyAXO2OwZShGH7uhaV1ZPXIH8PbGPCSxVz8",
  authDomain: "fresh-chat-6abe5.firebaseapp.com",
  projectId: "fresh-chat-6abe5",
  storageBucket: "fresh-chat-6abe5.firebasestorage.app",
  messagingSenderId: "480382643112",
  appId: "1:480382643112:web:b39d2aba412c74fd3c4b9d",
  measurementId: "G-D9756LQ6YL"
};

// Helper to check if config is present
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;
};
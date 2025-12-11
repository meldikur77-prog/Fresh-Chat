
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export enum FriendStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  FRIEND = 'FRIEND'
}

export interface User {
  id: string;
  name: string;
  photoUrl: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  bio: string;
  interests: string[];
  album: string[];
  location: Coordinates;
  distance?: number; // Calculated distance in km
  isPremium?: boolean;
  
  friendStatus: FriendStatus;
  friendRequestInitiator?: string; // ID of user who sent request

  unreadCount?: number;
  authMethod?: 'google' | 'guest' | 'apple';
  
  // Engagement Stats
  hearts?: number;
  views?: number;
  lastActive?: number; // Timestamp
  
  // Gamification
  xp?: number;
  level?: number;
  badges?: string[]; // e.g. 'popular', 'verified', 'veteran', 'friendly'
  streak?: number;   // Calculated from relationship

  // Safety
  blockedUsers?: string[];
}

export interface FriendshipData {
  status: FriendStatus;
  initiatedBy?: string;
  streak?: number;
  lastInteraction?: number;
}

export interface Message {
  id: string;
  senderId: string; // 'me' or user.id
  text: string;
  type?: 'text' | 'location' | 'image';
  location?: Coordinates;
  imageUrl?: string;
  isRead?: boolean;
  timestamp: number;
}

export enum AppScreen {
  PROFILE_SETUP = 'PROFILE_SETUP',
  NEARBY_LIST = 'NEARBY_LIST',
  CHAT = 'CHAT',
  PREMIUM_UPGRADE = 'PREMIUM_UPGRADE',
  PROFILE_EDIT = 'PROFILE_EDIT',
  USER_DETAIL = 'USER_DETAIL'
}

// Support for AdMob Capacitor types
export interface AdMobPlugin {
  initialize: () => Promise<void>;
  showBanner: (options: any) => Promise<void>;
  hideBanner: () => Promise<void>;
  prepareInterstitial: (options: any) => Promise<void>;
  showInterstitial: () => Promise<void>;
}

// Global declaration to fix window.Capacitor build errors
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins: {
        AdMob: AdMobPlugin;
      };
    };
  }
}
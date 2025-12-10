
import { AdMobConfig } from '../config/admob';
import { AdMobPlugin } from '../types';

// Access the global capacitor object
const getAdMob = (): AdMobPlugin | undefined => {
  return window.Capacitor?.Plugins?.AdMob;
};

// Check if running in a native Android/iOS shell
const isNative = (): boolean => {
  return window.Capacitor?.isNativePlatform() || false;
};

export const AdMobService = {
  initialize: async () => {
    if (!isNative()) return;
    try {
      await getAdMob()?.initialize();
    } catch (e) {
      console.error('AdMob init failed', e);
    }
  },

  showBanner: async () => {
    if (!isNative()) return;
    try {
      await getAdMob()?.showBanner({
        adId: AdMobConfig.BANNER_ID,
        position: 'BOTTOM_CENTER',
        margin: 0,
      });
    } catch (e) {
      console.error('Show Banner failed', e);
    }
  },

  hideBanner: async () => {
    if (!isNative()) return;
    try {
      await getAdMob()?.hideBanner();
    } catch (e) {
      console.error('Hide Banner failed', e);
    }
  },

  showInterstitial: async () => {
    if (!isNative()) return;
    try {
      const admob = getAdMob();
      if (admob) {
        await admob.prepareInterstitial({
          adId: AdMobConfig.INTERSTITIAL_ID,
          isTesting: false
        });
        await admob.showInterstitial();
      }
    } catch (e) {
      console.error('Show Interstitial failed', e);
    }
  }
};

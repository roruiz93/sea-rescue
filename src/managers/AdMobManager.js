/**
 * AdMobManager — integración con @capacitor-community/admob
 *
 * En web/dev: todas las funciones son no-op silenciosas.
 * En Android con Capacitor: accede al plugin via el bridge nativo.
 */

const AD_UNITS = {
  banner:       'ca-app-pub-6295806554028984/9599964513',
  interstitial: 'ca-app-pub-6295806554028984/1844750118',
  rewarded:     'ca-app-pub-6295806554028984/7992415558',

  // IDs de TEST — descomentar para desarrollo local
  // banner:       'ca-app-pub-3940256099942544/6300978111',
  // interstitial: 'ca-app-pub-3940256099942544/1033173712',
  // rewarded:     'ca-app-pub-3940256099942544/5224354917',
};

const BannerAdSize     = { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' };
const BannerAdPosition = { BOTTOM_CENTER: 'BOTTOM_CENTER' };

let initialized       = false;
let interstitialReady = false;
let rewardedReady     = false;

function getPlugin() {
  try {
    return window?.Capacitor?.Plugins?.AdMob ?? null;
  } catch {
    return null;
  }
}

export const AdMobManager = {

  async initialize() {
    const plugin = getPlugin();
    if (!plugin) {
      console.log('[AdMob] Web mode — AdMob not available');
      return;
    }
    try {
      await plugin.initialize({
        initializeForTesting:         false,
        testingDevices:               [],
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent:      false,
      });
      initialized = true;
      console.log('[AdMob] Initialized');
      await this.prepareInterstitial();
      await this.prepareRewarded();
    } catch (e) { console.warn('[AdMob] Init error:', e); }
  },

  // ── BANNER ──────────────────────────────────────────────────
  async showBanner() {
    const plugin = getPlugin();
    if (!plugin || !initialized) return;
    try {
      await plugin.showBanner({
        adId:     AD_UNITS.banner,
        adSize:   BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin:   0,
      });
    } catch (e) { console.warn('[AdMob] Banner error:', e); }
  },

  async hideBanner() {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.hideBanner(); } catch {}
  },

  async removeBanner() {
    const plugin = getPlugin();
    if (!plugin) return;
    try { await plugin.removeBanner(); } catch {}
  },

  // ── INTERSTITIAL ────────────────────────────────────────────
  async prepareInterstitial() {
    const plugin = getPlugin();
    if (!plugin || !initialized) return;
    try {
      await plugin.prepareInterstitial({ adId: AD_UNITS.interstitial });
      interstitialReady = true;
    } catch (e) { console.warn('[AdMob] Interstitial prepare error:', e); }
  },

  async showInterstitial() {
    const plugin = getPlugin();
    if (!plugin || !interstitialReady) return false;
    try {
      await plugin.showInterstitial();
      interstitialReady = false;
      setTimeout(() => this.prepareInterstitial(), 2000);
      return true;
    } catch (e) {
      console.warn('[AdMob] Interstitial show error:', e);
      return false;
    }
  },

  // ── REWARDED ────────────────────────────────────────────────
  async prepareRewarded() {
    const plugin = getPlugin();
    if (!plugin || !initialized) return;
    try {
      await plugin.prepareRewardVideoAd({ adId: AD_UNITS.rewarded });
      rewardedReady = true;
    } catch (e) { console.warn('[AdMob] Rewarded prepare error:', e); }
  },

  async showRewarded(onReward) {
    const plugin = getPlugin();
    if (!plugin || !rewardedReady) {
      console.log('[AdMob] Web mode — simulating reward');
      if (typeof onReward === 'function') onReward();
      return true;
    }
    return new Promise(async (resolve) => {
      try {
        plugin.addListener('onRewardedVideoAdRewarded', () => {
          if (typeof onReward === 'function') onReward();
          resolve(true);
        });
        plugin.addListener('onRewardedVideoAdClosed', () => {
          rewardedReady = false;
          setTimeout(() => this.prepareRewarded(), 2000);
          resolve(false);
        });
        await plugin.showRewardVideoAd();
      } catch (e) {
        console.warn('[AdMob] Rewarded show error:', e);
        resolve(false);
      }
    });
  },

  isInitialized()       { return initialized; },
  isInterstitialReady() { return interstitialReady; },
  isRewardedReady()     { return rewardedReady; },
};

/* ============================================================
 *  native-admob.js — real AdMob banner for the packaged app
 * ------------------------------------------------------------
 *  Google's AdSense terms don't allow AdSense inside a wrapped
 *  native app — a real ad SDK is required there instead. On the
 *  web/PWA this file no-ops immediately and ads.js keeps serving
 *  AdSense (see ads-config.js) exactly as before.
 *
 *  Loaded synchronously, BEFORE ads.js, so ads.js can see the
 *  window.__BST_NATIVE_ADS__ flag before it boots and skip every
 *  AdSense path. House promos and direct-sold campaigns are
 *  unaffected — they're your own content, not a Google network.
 *
 *  Ad-unit ids live in ads-config.js (`AdsConfig.admob`), the same
 *  file that already holds the AdSense ids — one place to edit.
 * ============================================================ */
(function () {
  "use strict";

  function isNative() {
    try {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform &&
                window.Capacitor.isNativePlatform());
    } catch (e) { return false; }
  }
  if (!isNative()) return;

  window.__BST_NATIVE_ADS__ = true;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else { fn(); }
  }

  ready(function () {
    // The DOM ad slot is superseded by a real native overlay below —
    // hide it and mark it handled so ads.js's scan() skips it.
    var webSlot = document.querySelector('[data-admob-placement="sticky-bottom"]');
    if (webSlot) {
      webSlot.setAttribute("data-ad-state", "filled");
      webSlot.setAttribute("data-ad-kind", "native-admob");
      webSlot.hidden = true;
    }

    var platform = (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || "android";
    // The app shell is hosted remotely, so the npm plugin needs a small
    // bundled registration script (admob-plugin.js) before this file runs.
    // Keep the legacy registry fallback for already-published app shells.
    var Plugins = window.Capacitor && window.Capacitor.Plugins;
    var AdMob = window.BSTAdMob || (Plugins && Plugins.AdMob);
    if (!AdMob) return; // plugin not installed in this native build yet

    // GDPR: let users change or withdraw their ads consent later. The app's
    // "Cookie choices" link calls this instead of the web consent banner.
    window.__BST_ADMOB_PRIVACY__ = function () {
      return AdMob.showPrivacyOptionsForm().catch(function () {});
    };

    var CFG = (window.AdsConfig && window.AdsConfig.admob) || {};
    var testing = CFG.testing !== false; // default true until real ids are pasted in
    var adId = (CFG.banner && CFG.banner[platform]) ||
               "ca-app-pub-3940256099942544/6300978111"; // Google TEST banner unit

    function showBanner() {
      AdMob.showBanner({
        adId: adId,
        adSize: "ADAPTIVE_BANNER",
        position: "BOTTOM_CENTER",
        margin: 64, // clears the mobile-nav tab bar; adjust after a real-device check
        isTesting: testing
      }).catch(function () {});
    }

    /* -------- Interstitial ad plumbing ---------------------
     * Shown at natural transition points (listing detail close,
     * after a post, etc.) — never during active scrolling.
     * All throttles are enforced here, in the native layer, so
     * UI code can call show() freely without caring about limits. */
    var interstitialAdId = (CFG.interstitial && CFG.interstitial[platform]) || "";
    var interOpts = CFG.interstitialOptions || {};
    var COOLDOWN_MS = interOpts.cooldownMs == null ? 180000 : interOpts.cooldownMs;
    var FIRST_DELAY_MS = interOpts.firstSessionDelayMs == null ? 90000 : interOpts.firstSessionDelayMs;
    var MAX_PER_SESSION = interOpts.maxPerSession == null ? 5 : interOpts.maxPerSession;
    // Count foreground time only; an app left in the background must not
    // make an interstitial immediately eligible when the user returns.
    var activeMs = 0;
    var lastTickAt = Date.now();
    function accrueActiveTime() {
      var now = Date.now();
      if (document.visibilityState !== "hidden") activeMs += Math.max(0, now - lastTickAt);
      lastTickAt = now;
    }
    document.addEventListener("visibilitychange", accrueActiveTime);
    setInterval(accrueActiveTime, 1000);
    var lastShownActiveMs = -COOLDOWN_MS;
    var shownThisSession = 0;
    var isPrepared = false;
    var isPreparing = false;

    function prepareInterstitial() {
      if (!interstitialAdId || isPrepared || isPreparing) return;
      isPreparing = true;
      AdMob.prepareInterstitial({
        adId: interstitialAdId,
        isTesting: testing
      }).then(function () {
        isPrepared = true;
        isPreparing = false;
      }).catch(function () {
        isPreparing = false;
        // Soft retry after 30s so a one-off network blip doesn't kill
        // interstitials for the rest of the session.
        setTimeout(prepareInterstitial, 30000);
      });
    }

    // Expose a single call that the web UI can fire at any transition
    // point. Returns true if the ad was shown, false if throttled.
    window.__BST_ADMOB_INTERSTITIAL__ = function () {
      if (!interstitialAdId || !isPrepared) return false;
      accrueActiveTime();
      if (activeMs < FIRST_DELAY_MS) return false;
      if (activeMs - lastShownActiveMs < COOLDOWN_MS) return false;
      if (shownThisSession >= MAX_PER_SESSION) return false;
      lastShownActiveMs = activeMs;
      shownThisSession += 1;
      isPrepared = false;
      AdMob.showInterstitial().catch(function () {});
      // Preload the next one immediately so the following transition
      // doesn't have to wait on a network round-trip.
      setTimeout(prepareInterstitial, 1500);
      return true;
    };

    AdMob.initialize({
      testingDevices: CFG.testingDevices || [],
      initializeForTesting: testing
    })
      .then(function () { return AdMob.requestConsentInfo(); })
      .then(function (consentInfo) {
        if (consentInfo && !consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
          return AdMob.showConsentForm();
        }
        return consentInfo;
      })
      // Only request ads once Google's consent SDK says it may (EU/GDPR:
      // French Saint-Martin is in the EU). If the consent check itself
      // fails, show no ad rather than one without a valid consent state.
      .then(function (consentInfo) {
        if (consentInfo && consentInfo.canRequestAds) {
          // ATT is optional; ask only after Google's privacy choices. If
          // declined, consent-eligible contextual ads can still be requested.
          if (platform === "ios") {
            return AdMob.trackingAuthorizationStatus().catch(function () { return null; })
              .then(function (status) {
                if (status && status.status === "notDetermined") {
                  return AdMob.requestTrackingAuthorization().catch(function () {});
                }
              })
              .then(function () { showBanner(); prepareInterstitial(); });
          }
          showBanner();
          prepareInterstitial();
        }
      })
      .catch(function () {});
  });
})();

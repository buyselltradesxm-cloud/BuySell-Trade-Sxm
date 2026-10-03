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
    // iOS ships without ads for now: no AdMob, no tracking prompt. The flag
    // above still keeps AdSense out of the app's web view. See Info.plist.
    if (platform === "ios") return;

    var Plugins = window.Capacitor && window.Capacitor.Plugins;
    var AdMob = Plugins && Plugins.AdMob;
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

    AdMob.initialize({
      testingDevices: CFG.testingDevices || [],
      initializeForTesting: testing
    })
      .then(function () {
        // iOS 14+: ask App Tracking Transparency before requesting consent,
        // so personalised ads can be considered where the user allows it.
        return AdMob.trackingAuthorizationStatus().catch(function () { return null; });
      })
      .then(function (t) {
        if (t && t.status === "notDetermined") {
          return AdMob.requestTrackingAuthorization().catch(function () {});
        }
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
        if (consentInfo && consentInfo.canRequestAds) showBanner();
      })
      .catch(function () {});
  });
})();

/* Website acquisition measurement only; native app installs come from store reports. */
(function () {
  'use strict';
  var id = window.AdsConfig && AdsConfig.analytics && AdsConfig.analytics.ga4;
  var native = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
  var googleApplies = null, googleAllowed = false, counted = false;
  function permitted() {
    if (native || !id) return false;
    if (typeof window.__tcfapi === 'function' && googleApplies === null) return false;
    if (googleApplies) return googleAllowed;
    return !!(window.BstConsent && BstConsent.granted());
  }
  function cleanUrl() { return location.origin + location.pathname; }
  function start() {
    if (!permitted()) {
      window['ga-disable-' + id] = true;
      if (window.__bstGA) gtag('consent', 'update', {analytics_storage:'denied'});
      return;
    }
    window['ga-disable-' + id] = false;
    if (!window.__bstGA) {
      window.__bstGA = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      gtag('consent', 'default', {analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      gtag('js', new Date());
      gtag('config', id, {send_page_view:false, page_location:cleanUrl(), page_referrer:'', allow_google_signals:false, allow_ad_personalization_signals:false});
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
      document.head.appendChild(script);
    } else { gtag('consent', 'update', {analytics_storage:'granted'}); }
    if (!counted) {
      counted = true;
      track('page_view', {});
      if (/\/app(?:-fr)?\.html$/.test(location.pathname)) track('app_download_page_view', {});
    }
  }
  function track(name, params) {
    if (!permitted() || !window.__bstGA) return;
    // Never send search text, listing titles, account IDs, query strings or fragments.
    gtag('event', name, Object.assign({}, params, {page_location:cleanUrl(), page_referrer:'', page_title:'Buy Sell Trade SXM', language:document.documentElement.lang || 'en'}));
  }
  window.BstAnalytics = {start:start, track:track, permitted:permitted};
  window.addEventListener('bst:consent', start);
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-store]');
    if (link) track('app_store_click', {store:link.getAttribute('data-store'), placement:link.getAttribute('data-placement') || 'website'});
    var choices = event.target.closest && event.target.closest('[data-cookie-choices]');
    if (choices && window.BstConsent) { event.preventDefault(); BstConsent.open(); }
  });
  function cmpReady() {
    if (typeof window.__tcfapi !== 'function') { start(); return; }
    window.__tcfapi('addEventListener', 2, function (data, ok) {
      if (!ok || !data) return;
      googleApplies = data.gdprApplies;
      googleAllowed = !!(data.purpose && data.purpose.consents && data.purpose.consents[1] && data.purpose.consents[10] && data.vendor && data.vendor.consents && data.vendor.consents[755]);
      start();
    });
  }
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({CONSENT_API_READY:cmpReady});
  cmpReady();
})();

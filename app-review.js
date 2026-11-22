/* Called only after a listing was successfully published, never on a failed write. */
(function () {
  'use strict';
  window.BstReview = {success:function () {
    try {
      var cap = window.Capacitor;
      if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return Promise.resolve(false);
      var name = cap.getPlatform() === 'ios' ? 'SXMNative' : 'SXMLayout';
      var plugin = (cap.Plugins || {})[name] || cap.registerPlugin(name);
      return Promise.resolve(plugin.requestReview()).then(function (result) { return !!result.requested; }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); /* Older installed builds. */ }
  }};
})();

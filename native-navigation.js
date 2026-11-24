(function () {
  "use strict";
  function markNativeTabs() {
    if (window.SXMNativeInfo?.tabs ||
        (window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === "android")) {
      document.documentElement.classList.add("sxm-native-tabs");
    }
  }
  markNativeTabs();
  document.addEventListener("DOMContentLoaded", markNativeTabs, { once: true });
}());

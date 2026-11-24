(function () {
  "use strict";
  var agent = navigator.userAgent;
  var platform = navigator.userAgentData?.platform || navigator.platform;
  var isAndroid = /Android/i.test(agent) || platform === "Android";
  // iPad Safari can identify itself as a Mac when requesting desktop sites.
  var isAppleMobile = /iPhone|iPad|iPod/i.test(agent) ||
    (/Mac/i.test(platform) && navigator.maxTouchPoints > 1);
  if (isAndroid || isAppleMobile) {
    var store = document.getElementById(isAndroid ? "google-play" : "app-store");
    window.location.replace(store.href);
  }
}());

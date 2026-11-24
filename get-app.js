(function () {
  "use strict";
  var agent = navigator.userAgent;
  var platform = navigator.userAgentData?.platform || navigator.platform;
  var isAndroid = /Android/i.test(agent) || platform === "Android";
  // iPad Safari can identify itself as a Mac when requesting desktop sites.
  var isAppleMobile = /iPhone|iPad|iPod/i.test(agent) ||
    (/Mac/i.test(platform) && navigator.maxTouchPoints > 1);
  var store = isAndroid || isAppleMobile
    ? document.getElementById(isAndroid ? "google-play" : "app-store")
    : null;
  var video = document.getElementById("app-preview");
  if (store) {
    document.querySelectorAll(".actions a").forEach(function (link) {
      link.hidden = link !== store;
    });
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (store) video.addEventListener("ended", function () {
    window.location.replace(store.href);
  }, { once: true });
  video.play().catch(function () {});
}());

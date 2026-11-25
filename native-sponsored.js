(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var root = document.documentElement;
  root.lang = params.get("lang") === "fr" ? "fr" : "en";
  root.dataset.adVisible = "false";
  var slot = document.getElementById("sponsored");
  var placement = params.get("placement");
  if (!["content-1", "feed", "restaurant"].includes(placement)) return;
  slot.className = placement === "feed" ? "feed-ad" : "content-ad";
  slot.setAttribute("data-ad-placement", placement);

  window.setSponsoredVisibility = function (visible) {
    window.__BST_AD_VISIBLE__ = visible === true;
    root.dataset.adVisible = String(window.__BST_AD_VISIBLE__);
    window.dispatchEvent(new Event("bst:native-ad-visibility"));
  };

  new ResizeObserver(function () {
    var bridge = window.webkit?.messageHandlers?.sponsoredHeight;
    var height = Math.ceil(slot.getBoundingClientRect().height);
    if (bridge) bridge.postMessage(height);
    else window.AndroidSponsored?.setHeight(height);
  }).observe(slot);
}());

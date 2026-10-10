/* consent.js — lightweight cookie / ads consent notice
 * ------------------------------------------------------------
 *  Stores the visitor's choice and exposes window.BstConsent.
 *  - "granted"  : analytics + personalized-capable ads allowed
 *  - "denied"   : no analytics; ads still request NON-personalized
 *  Until a choice is made, treat as "denied" (ads.js already forces
 *  requestNonPersonalizedAds = 1, so ads still fill).
 *
 *  For full EEA/UK compliance, ALSO enable Google's certified CMP in
 *  AdSense (Privacy & messaging > GDPR). If a TCF CMP (__tcfapi) is
 *  detected this banner stays hidden and defers to it.
 */
(function () {
  "use strict";
  var KEY = "bst_consent";

  // The iOS app ships without ads or analytics (see native-admob.js and the
  // App Privacy answers in App Store Connect). There is nothing to consent
  // to there: no notice is shown and the answer is always "denied".
  var IOS_APP = (function () {
    try {
      var cap = window.Capacitor;
      return !!(cap && cap.isNativePlatform && cap.isNativePlatform() &&
                cap.getPlatform && cap.getPlatform() === "ios");
    } catch (e) { return false; }
  })();

  function read() {
    if (IOS_APP) return "denied";
    try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    fire(v);
  }
  function fire(v) {
    try { window.dispatchEvent(new CustomEvent("bst:consent", { detail: { state: v } })); } catch (e) {}
  }

  var listeners = [];
  window.BstConsent = {
    state: function () { return read() || "unset"; },
    granted: function () { return read() === "granted"; },
    set: function (v) { hide(); write(v === "granted" ? "granted" : "denied"); },
    onChange: function (cb) { if (typeof cb === "function") listeners.push(cb); },
    open: function () { show(true); }
  };
  window.addEventListener("bst:consent", function (e) {
    listeners.forEach(function (cb) { try { cb(e.detail.state); } catch (x) {} });
  });

  function lang() {
    var l = "";
    try { l = localStorage.getItem("bst_lang") || ""; } catch (e) {}
    l = (l || document.documentElement.lang || navigator.language || "fr").toLowerCase();
    return l.indexOf("en") === 0 ? "en" : l.indexOf("nl") === 0 ? "nl" : "fr";
  }
  var T = {
    fr: { msg: "Nous utilisons des cookies pour faire fonctionner le site, mesurer l’audience et afficher des publicités.",
          ok: "Accepter", no: "Refuser", more: "En savoir plus" },
    en: { msg: "We use cookies to run the site, measure traffic, and show ads.",
          ok: "Accept", no: "Decline", more: "Learn more" },
    nl: { msg: "We gebruiken cookies om de site te laten werken, verkeer te meten en advertenties te tonen.",
          ok: "Accepteren", no: "Weigeren", more: "Meer info" }
  };
  function t(k) { return (T[lang()] || T.fr)[k]; }

  function styles() {
    if (document.getElementById("bst-consent-css")) return;
    var s = document.createElement("style");
    s.id = "bst-consent-css";
    s.textContent =
      "#bst-consent{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));" +
      "z-index:10000;max-width:560px;margin:0 auto;background:#fff;color:#132A2E;" +
      "border:2px solid #132A2E;border-radius:12px;padding:13px 15px;" +
      "box-shadow:0 12px 34px rgba(19,42,46,.24);font:inherit;font-size:13px;line-height:1.4;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:10px}" +
      "@media (max-width:900px){#bst-consent{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}" +
      "#bst-consent p{margin:0;flex:1 1 220px}" +
      "#bst-consent a{color:#0B6E7F;font-weight:700}" +
      "#bst-consent .bst-c-row{display:flex;gap:8px;flex:0 0 auto}" +
      "#bst-consent button{font:inherit;font-size:13px;font-weight:700;cursor:pointer;" +
      "border-radius:8px;padding:8px 14px;border:2px solid #132A2E;background:#fff;color:#132A2E}" +
      "#bst-consent .bst-c-ok{background:#0B6E7F;border-color:#0B6E7F;color:#fff}";
    document.head.appendChild(s);
  }

  function hide() { var el = document.getElementById("bst-consent"); if (el) el.remove(); }

  function show(force) {
    if (IOS_APP) return;
    if (document.getElementById("bst-consent")) return;
    if (!force && read()) return;                       // already chose
    if (!force && window.__tcfapi) return;              // a real CMP is handling it
    styles();
    var box = document.createElement("div");
    box.id = "bst-consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Cookies");

    var p = document.createElement("p");
    p.textContent = t("msg") + " ";
    var a = document.createElement("a");
    a.href = "/privacy.html"; a.textContent = t("more");
    p.appendChild(a);
    box.appendChild(p);

    var row = document.createElement("div");
    row.className = "bst-c-row";
    var no = document.createElement("button");
    no.textContent = t("no");
    no.addEventListener("click", function () { window.BstConsent.set("denied"); });
    var ok = document.createElement("button");
    ok.className = "bst-c-ok";
    ok.textContent = t("ok");
    ok.addEventListener("click", function () { window.BstConsent.set("granted"); });
    row.appendChild(no); row.appendChild(ok);
    box.appendChild(row);

    (document.body || document.documentElement).appendChild(box);
  }

  // Give a real TCF CMP (Google's certified GDPR message, etc.) up to ~2.8s
  // to load and register __tcfapi before falling back to this simple notice —
  // otherwise EEA visitors briefly see two banners.
  function maybeShow(attempt) {
    if (document.getElementById("bst-consent")) return;
    if (read()) return;                 // visitor already chose
    if (window.__tcfapi) return;        // a certified CMP is present — defer to it
    if (attempt < 4) { setTimeout(function () { maybeShow(attempt + 1); }, 700); return; }
    show(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { maybeShow(0); });
  } else {
    maybeShow(0);
  }
})();

/* Buy Sell Trade Sxm — Cloudflare Turnstile tokens for Supabase Auth.
 *
 * Supabase Auth requires a CAPTCHA token on sign-up, password login,
 * resend-code and password reset (Dashboard > Authentication > Attack
 * Protection). Captcha.token() returns a fresh single-use token. The widget
 * stays invisible unless Cloudflare decides the visitor must interact, in
 * which case a small box appears at the bottom of the screen.
 *
 * On localhost the Turnstile test key is used (always passes), so local QA
 * keeps working without touching the production widget.
 */
(function () {
  "use strict";
  var PROD_SITE_KEY = "0x4AAAAAAFMae7Jlebc0gmUY";
  var TEST_SITE_KEY = "1x00000000000000000000AA";
  var SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var host = window.location.hostname;
  var siteKey = host === "localhost" || host === "127.0.0.1" ? TEST_SITE_KEY : PROD_SITE_KEY;

  var scriptPromise = null;
  var widgetId = null;
  var box = null;
  var pending = null;

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { scriptPromise = null; reject(new Error("captcha_unavailable")); };
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  function settle(err, token) {
    var p = pending;
    pending = null;
    if (box) box.style.display = "none";
    if (!p) return;
    clearTimeout(p.timer);
    if (err) p.reject(err); else p.resolve(token);
  }

  function ensureWidget() {
    if (widgetId !== null) return;
    box = document.createElement("div");
    box.id = "bst-captcha";
    box.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;display:none;";
    document.body.appendChild(box);
    widgetId = window.turnstile.render(box, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      "before-interactive-callback": function () { box.style.display = "block"; },
      "after-interactive-callback": function () { box.style.display = "none"; },
      callback: function (token) { settle(null, token); },
      "error-callback": function () { settle(new Error("captcha_failed")); return true; },
      "expired-callback": function () { settle(new Error("captcha_expired")); },
      "timeout-callback": function () { settle(new Error("captcha_timeout")); }
    });
  }

  function token() {
    return loadScript().then(function () {
      ensureWidget();
      if (pending) settle(new Error("captcha_superseded"));
      return new Promise(function (resolve, reject) {
        pending = {
          resolve: resolve,
          reject: reject,
          timer: setTimeout(function () { settle(new Error("captcha_timeout")); }, 120000)
        };
        // Tokens are single-use: always start from a fresh challenge.
        window.turnstile.reset(widgetId);
        window.turnstile.execute(widgetId);
      });
    });
  }

  window.Captcha = { token: token };
})();

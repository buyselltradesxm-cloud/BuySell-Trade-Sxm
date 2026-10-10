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

  function isFrench() {
    return (document.documentElement.lang || "fr").indexOf("fr") === 0;
  }

  function ensureWidget() {
    if (widgetId !== null) return;
    box = document.createElement("div");
    box.id = "bst-captcha";
    // Center the interaction challenge in the visible viewport. Anchoring it
    // to the bottom clipped the checkbox on short screens and inside dialogs.
    box.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:none;place-items:center;place-content:center;gap:14px;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;padding:16px;background:rgba(15,35,40,.22);backdrop-filter:blur(2px);";
    var slot = document.createElement("div");
    // The overlay covers the whole screen and the iOS / Android apps have no
    // reload button, so a challenge that will not complete needs a way out.
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.style.cssText = "min-height:44px;padding:0 22px;border:0;border-radius:999px;background:#fff;color:#132A2E;font:600 15px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 2px 10px rgba(15,35,40,.25);cursor:pointer;";
    cancel.addEventListener("click", function () { settle(new Error("captcha_cancelled")); });
    box.appendChild(slot);
    box.appendChild(cancel);
    document.body.appendChild(box);
    widgetId = window.turnstile.render(slot, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      // One challenge per token() call. Left on "auto", a failed or expired
      // challenge restarts by itself and re-opens the overlay with nothing
      // waiting for its token.
      retry: "never",
      "refresh-expired": "never",
      "refresh-timeout": "never",
      "before-interactive-callback": function () {
        if (!pending) return;
        cancel.textContent = isFrench() ? "Annuler" : "Cancel";
        box.style.display = "grid";
      },
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

  // Shown under the sign-in form when the anti-bot check did not complete, so
  // it is not mistaken for a wrong password. Google / Apple sign-in never
  // needs this check, which makes them the way forward when it keeps failing.
  // TODO(human): adjust the wording for your customers if you want.
  function failureMessage(lang) {
    return lang === "fr"
      ? "La vérification anti-robot n'a pas abouti. Réessayez, ou connectez-vous avec Google ou Apple."
      : "The anti-bot check did not complete. Try again, or sign in with Google or Apple.";
  }

  window.Captcha = { token: token, failureMessage: failureMessage };
})();

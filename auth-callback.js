/* iOS app sign-in return page (see SB.signInWithOAuth in supabase-api.js).
   Supabase only redirects to addresses on its allow-list, and this site's own
   host is always allowed. So the app asks to come back here, and this page
   hands the result on to the app's custom URL scheme, which closes the
   sign-in sheet. Only the PKCE code or the error is forwarded — the code is
   useless without the verifier that never leaves the app. */
(function () {
  "use strict";
  var fr = (navigator.language || "").toLowerCase().indexOf("fr") === 0;
  var title = document.getElementById("title");
  var text = document.getElementById("text");
  var link = document.getElementById("link");
  var source = new URLSearchParams(window.location.search);
  var forwarded = new URLSearchParams();
  ["code", "error", "error_code", "error_description"].forEach(function (name) {
    var value = source.get(name);
    if (value) forwarded.set(name, value);
  });

  if (!forwarded.has("code") && !forwarded.has("error")) {
    title.textContent = fr ? "Rien à faire ici" : "Nothing to do here";
    text.textContent = fr ? "Cette page sert uniquement à la connexion depuis l’application." : "This page is only used when signing in from the app.";
    link.textContent = fr ? "Aller au site" : "Go to the site";
    link.hidden = false;
    return;
  }

  var target = "buyselltradesxm://auth/callback?" + forwarded.toString();
  if (fr) {
    title.textContent = "Connexion en cours…";
    text.textContent = "Retour à l’application Buy Sell Trade Sxm.";
    link.textContent = "Retourner à l’application";
  }
  link.href = target;
  link.hidden = false;
  window.location.replace(target);
})();

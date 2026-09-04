/* ============================================================
 *  Configuration Supabase
 *  Remplace les deux valeurs ci-dessous par celles de ton projet :
 *  Supabase → Project Settings → API
 *
 *  La clé "anon public" EST faite pour être dans le code frontend.
 *  Ne mets JAMAIS la clé "service_role" ici.
 * ============================================================ */
window.SUPABASE_URL = "https://ujykgiitlcuqiiepsyiz.supabase.co";
// Clé "publishable" (nouveau format) — sûre pour le navigateur si la RLS est activée.
window.SUPABASE_ANON_KEY = "sb_publishable_5fm__ewJT9UVii8lcmeZlQ_aC84_N0q";

/* OAuth social login.
 * Mets un provider a true seulement APRES l'avoir active dans:
 * Supabase -> Authentication -> Providers.
 * Tant que c'est false, l'app affiche un message propre au lieu d'envoyer
 * l'utilisateur vers l'erreur "Unsupported provider".
 */
window.SUPABASE_OAUTH_PROVIDERS = {
  google: false,
  facebook: false
};

/* Crée le client `db` seulement si la config est remplie ET si la
 * librairie CDN a bien chargé. Sinon l'app retombe sur son mode local
 * (données de démo + faux comptes) sans planter. */
window.db = null;
(function () {
  var params = new URLSearchParams(window.location.search || "");
  var isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (isLocalHost && (params.has("local") || params.has("demo"))) {
    console.info("[Supabase] désactivé pour ce test local.");
    return;
  }

  var configured =
    window.SUPABASE_URL &&
    window.SUPABASE_URL.indexOf("http") === 0 &&
    window.SUPABASE_ANON_KEY &&
    window.SUPABASE_ANON_KEY.length > 20;

  if (!configured) {
    console.info("[Supabase] non configuré — l'app tourne en mode local.");
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.warn("[Supabase] librairie CDN non chargée — mode local.");
    return;
  }
  window.db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  console.info("[Supabase] client prêt.");
})();

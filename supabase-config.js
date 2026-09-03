/* ============================================================
 *  Configuration Supabase
 *  Remplace les deux valeurs ci-dessous par celles de ton projet :
 *  Supabase → Project Settings → API
 *
 *  La clé "anon public" EST faite pour être dans le code frontend.
 *  Ne mets JAMAIS la clé "service_role" ici.
 * ============================================================ */
window.SUPABASE_URL = "PASTE_YOUR_PROJECT_URL";      // ex : https://abcdxyz.supabase.co
window.SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY";    // ex : eyJhbGciOiJIUzI1NiI...

/* Crée le client `db` seulement si la config est remplie ET si la
 * librairie CDN a bien chargé. Sinon l'app retombe sur son mode local
 * (données de démo + faux comptes) sans planter. */
window.db = null;
(function () {
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

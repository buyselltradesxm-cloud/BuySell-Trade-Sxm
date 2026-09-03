/* ============================================================
 *  Pont entre l'app (marketplace.html) et Supabase.
 *  Exposé sous window.SB. Toutes les fonctions sont "safe" :
 *  si Supabase n'est pas configuré, elles renvoient null / no-op
 *  et l'app garde son comportement local.
 *
 *  Chargé APRÈS supabase-config.js et AVANT le <script> principal.
 * ============================================================ */
(function () {
  "use strict";

  /* ---- conversion  ligne DB  <->  objet annonce de l'app ---- */
  function rowToListing(r) {
    var created = r.created_at ? new Date(r.created_at).getTime() : Date.now();
    var hours = Math.max(1, Math.round((Date.now() - created) / 3600000));
    var photos = Array.isArray(r.photos) ? r.photos : [];
    return {
      id: r.id,
      t: r.title,
      cat: r.category,
      sub: r.subcategory || undefined,
      side: r.side,
      area: r.area,
      cond: r.condition,
      cur: r.currency || "eur",
      eur: Number(r.price_eur) || 0,
      usd: Number(r.price_usd) || 0,
      ph: hours,
      pics: photos.length,
      photos: photos,
      desc: r.description || "",
      delivery: r.delivery || undefined,
      negotiable: !!r.negotiable,
      pro: !!r.is_pro,
      urgent: !!r.is_urgent,
      feat: !!r.is_featured,
      drop: !!r.price_dropped,
      salary: !!r.is_salary,
      reserved: r.status === "reserved",
      sold: r.status === "sold",
      sellerId: r.seller_id || null
    };
  }

  function listingToRow(o, sellerId) {
    return {
      seller_id: sellerId || null,
      title: o.t,
      category: o.cat,
      subcategory: o.sub || null,
      side: o.side || null,
      area: o.area || null,
      condition: o.cond || null,
      currency: o.cur || "eur",
      price_eur: o.eur || 0,
      price_usd: o.usd || 0,
      description: o.desc || null,
      delivery: o.delivery || null,
      negotiable: !!o.negotiable,
      is_pro: !!o.pro,
      is_urgent: !!o.urgent,
      is_featured: !!o.feat,
      price_dropped: !!o.drop,
      is_salary: !!o.salary,
      photos: o.photos || [],
      status: o.sold ? "sold" : o.reserved ? "reserved" : "active"
    };
  }

  var SB = {
    /* Supabase est-il utilisable ? */
    enabled: function () {
      return !!window.db;
    },

    /* --------- ANNONCES --------- */

    // renvoie un tableau d'objets "annonce" prêts pour l'app, ou null
    fetchListings: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) {
        console.warn("[SB] fetchListings:", res.error.message);
        return null;
      }
      return res.data.map(rowToListing);
    },

    // insère une annonce pour l'utilisateur connecté ; renvoie l'objet créé ou null
    insertListing: async function (listingObj) {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user) {
        console.warn("[SB] insertListing: pas connecté");
        return null;
      }
      var res = await window.db
        .from("listings")
        .insert(listingToRow(listingObj, user.id))
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] insertListing:", res.error.message);
        return null;
      }
      return rowToListing(res.data);
    },

    // recharge L depuis la base puis rafraîchit l'affichage
    hydrate: async function () {
      var rows = await SB.fetchListings();
      if (!rows || typeof L === "undefined") return false;
      L.length = 0;
      rows.forEach(function (r) { L.push(r); });
      if (typeof render === "function") render();
      if (typeof buildCats === "function") buildCats();
      return true;
    },

    /* --------- AUTHENTIFICATION --------- */

    signUp: async function (email, password, name) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: name || "" } }
      });
    },

    signIn: async function (email, password) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: async function () {
      if (!window.db) return;
      return window.db.auth.signOut();
    },

    currentUser: async function () {
      if (!window.db) return null;
      var res = await window.db.auth.getUser();
      return (res && res.data && res.data.user) || null;
    },

    // charge le profil (nom, type de compte…) associé à l'utilisateur
    fetchProfile: async function (userId) {
      if (!window.db || !userId) return null;
      var res = await window.db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (res.error) return null;
      return res.data;
    },

    // rappelée à chaque connexion / déconnexion ; cb(user|null)
    onAuthChange: function (cb) {
      if (!window.db) return;
      window.db.auth.onAuthStateChange(function (_event, session) {
        cb(session ? session.user : null);
      });
    },

    /* --------- MESSAGES --------- */

    markMessageRead: async function (msgId) {
      if (!window.db) return;
      return window.db.rpc("mark_message_read", { msg_id: msgId });
    }
  };

  SB._rowToListing = rowToListing;
  SB._listingToRow = listingToRow;
  window.SB = SB;
})();

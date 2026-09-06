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
      expiresAt: r.expires_at || null,
      renewalRequestedAt: r.renewal_requested_at || null,
      renewalResponseAt: r.renewal_response_at || null,
      expiredAt: r.expired_at || null,
      vehicle: r.vehicle || null,
      delivery: r.delivery || undefined,
      negotiable: !!r.negotiable,
      pro: !!r.is_pro,
      urgent: !!r.is_urgent,
      feat: !!r.is_featured,
      drop: !!r.price_dropped,
      salary: !!r.is_salary,
      boosted: !!r.is_boosted,
      boost: r.boost_days ? {
        days: r.boost_days,
        eur: Number(r.boost_price_eur) || 0,
        usd: Number(r.boost_price_usd) || 0,
        paid: !!r.is_boosted,
        startedAt: r.boost_started_at || null
      } : null,
      reserved: r.status === "reserved",
      sold: r.status === "sold",
      createdAt: r.created_at || null,
      sellerId: r.seller_id || null,
      // l'app filtre "mes annonces" sur `ownerId` : on aligne les deux noms
      ownerId: r.seller_id || null,
      sellerName: (r.profiles && r.profiles.name) || r.seller_name || undefined
    };
  }

  function listingToRow(o, sellerId) {
    var row = {
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
      vehicle: o.vehicle || null,
      delivery: o.delivery || null,
      negotiable: !!o.negotiable,
      is_pro: !!o.pro,
      is_urgent: !!o.urgent,
      is_featured: !!o.feat,
      price_dropped: !!o.drop,
      is_salary: !!o.salary,
      is_boosted: !!o.boosted,
      boost_days: o.boost && o.boost.days ? o.boost.days : null,
      boost_price_eur: o.boost && o.boost.eur ? o.boost.eur : null,
      boost_price_usd: o.boost && o.boost.usd ? o.boost.usd : null,
      boost_started_at: o.boost && o.boost.startedAt ? o.boost.startedAt : null,
      photos: o.photos || [],
      status: o.sold ? "sold" : o.reserved ? "reserved" : (o.status || "active")
    };
    if (o.expiresAt) row.expires_at = o.expiresAt;
    if (o.renewalRequestedAt !== undefined) row.renewal_requested_at = o.renewalRequestedAt;
    if (o.renewalResponseAt !== undefined) row.renewal_response_at = o.renewalResponseAt;
    if (o.expiredAt !== undefined) row.expired_at = o.expiredAt;
    row.seller_name = o.sellerName || null;
    return row;
  }

  function withoutSellerName(row) {
    var copy = Object.assign({}, row);
    delete copy.seller_name;
    return copy;
  }

  function isMissingSellerNameColumn(error) {
    return !!error && /seller_name|column/i.test(error.message || "");
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
      var rows = res.data || [];
      var listings = rows.map(function (r) { return rowToListing(r); });
      var missingSellerIds = rows
        .filter(function (r) { return r.seller_id && !r.seller_name; })
        .map(function (r) { return r.seller_id; });
      var sellerIds = Array.from(new Set(missingSellerIds));
      var profilesById = {};
      if (sellerIds.length) {
        var prof = await window.db
          .from("profiles")
          .select("id,name,business_name")
          .in("id", sellerIds);
        if (!prof.error && prof.data) {
          prof.data.forEach(function (p) {
            profilesById[p.id] = p.business_name || p.name || "";
          });
        }
      }
      return listings.map(function (listing) {
        if (listing.sellerId && profilesById[listing.sellerId]) listing.sellerName = profilesById[listing.sellerId];
        return listing;
      });
    },

    // upload d'un lot de fichiers image dans le bucket public "listing-photos".
    // Reçoit des File (input type=file) ; renvoie un tableau d'URLs publiques.
    uploadPhotos: async function (files) {
      if (!window.db || !files || !files.length) return [];
      var user = await SB.currentUser();
      if (!user) return [];
      var bucket = window.db.storage.from("listing-photos");
      var urls = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file || typeof file.name === "undefined") continue;
        var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        var path =
          user.id + "/" + Date.now() + "-" + i + "-" +
          Math.random().toString(36).slice(2, 8) + "." + ext;
        var up = await bucket.upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg"
        });
        if (up.error) {
          console.warn("[SB] uploadPhotos:", up.error.message);
          continue;
        }
        urls.push(bucket.getPublicUrl(path).data.publicUrl);
      }
      return urls;
    },

    // insère une annonce pour l'utilisateur connecté ; renvoie l'objet créé ou null
    insertListing: async function (listingObj) {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user) {
        console.warn("[SB] insertListing: pas connecté");
        return null;
      }
      var row = listingToRow(listingObj, user.id);
      var res = await window.db
        .from("listings")
        .insert(row)
        .select()
        .single();
      if (res.error && isMissingSellerNameColumn(res.error)) {
        res = await window.db
          .from("listings")
          .insert(withoutSellerName(row))
          .select()
          .single();
      }
      if (res.error) {
        console.warn("[SB] insertListing:", res.error.message);
        return null;
      }
      return rowToListing(res.data);
    },

    // met à jour une annonce existante. Les règles Supabase autorisent le
    // propriétaire, et le schéma ajoute aussi l'accès aux admins.
    updateListing: async function (listingObj) {
      if (!window.db || !listingObj || !listingObj.id) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var row = listingToRow(listingObj, listingObj.sellerId || listingObj.ownerId || null);
      var res = await window.db
        .from("listings")
        .update(row)
        .eq("id", listingObj.id)
        .select()
        .single();
      if (res.error && isMissingSellerNameColumn(res.error)) {
        res = await window.db
          .from("listings")
          .update(withoutSellerName(row))
          .eq("id", listingObj.id)
          .select()
          .single();
      }
      if (res.error) {
        console.warn("[SB] updateListing:", res.error.message);
        return null;
      }
      return rowToListing(res.data);
    },

    // confirme qu'une annonce est toujours disponible et repousse son
    // expiration de 30 jours. Si la RPC n'est pas encore installée, l'app
    // retombe sur updateListing().
    confirmListingAvailable: async function (id) {
      if (!window.db || !id) return null;
      var rpc = await window.db.rpc("confirm_listing_available", { listing_id: id });
      if (!rpc.error && rpc.data) return rowToListing(rpc.data);
      console.warn("[SB] confirmListingAvailable:", rpc.error && rpc.error.message);
      return null;
    },

    // supprime une annonce. Côté base, réservé au propriétaire ou à un admin.
    deleteListing: async function (id) {
      if (!window.db || !id) return false;
      var user = await SB.currentUser();
      if (!user) return false;
      var rpc = await window.db.rpc("admin_delete_listing", { listing_id: id });
      if (!rpc.error) return !!rpc.data;
      var res = await window.db
        .from("listings")
        .delete()
        .eq("id", id);
      if (res.error) {
        console.warn("[SB] deleteListing:", res.error.message);
        return false;
      }
      return true;
    },

    adminSetListingStatus: async function (id, status) {
      if (!window.db || !id || !status) return null;
      var res = await window.db.rpc("admin_set_listing_status", {
        listing_id: id,
        new_status: status
      });
      if (res.error) {
        console.warn("[SB] adminSetListingStatus:", res.error.message);
        return null;
      }
      return res.data ? rowToListing(res.data) : null;
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

    signUp: async function (email, password, profile) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      var meta = typeof profile === "object" ? profile : { name: profile || "" };
      return window.db.auth.signUp({
        email: email,
        password: password,
        options: { data: meta }
      });
    },

    signIn: async function (email, password) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.signInWithPassword({ email: email, password: password });
    },

    // Valide le code à 6 chiffres reçu par email après signUp() et ouvre
    // la session si le code est correct. type "signup" = confirmation d'inscription.
    verifyOtp: async function (email, token) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.verifyOtp({ email: email, token: token, type: "signup" });
    },

    // Renvoie un nouveau code de confirmation à la même adresse.
    resendSignupOtp: async function (email) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.resend({ type: "signup", email: email });
    },

    // provider: "google" | tout provider OAuth activé côté Supabase.
    // Redirige le navigateur ; onAuthChange() reprend la main au retour (session
    // détectée automatiquement dans l'URL par supabase-js).
    signInWithOAuth: async function (provider) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
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

    // écrit / met à jour les champs de profil de l'utilisateur connecté.
    // `fields` : { name, account_type, account_plan, business_name, phone }
    upsertProfile: async function (fields) {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var row = Object.assign({ id: user.id }, fields || {});
      var res = await window.db
        .from("profiles")
        .upsert(row, { onConflict: "id" })
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] upsertProfile:", res.error.message);
        return null;
      }
      return res.data;
    },

    /* --------- ADMIN / MODERATION --------- */

    logAdminEvent: async function (action, targetType, targetId, metadata) {
      if (!window.db || !action) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var res = await window.db
        .from("admin_events")
        .insert({
          admin_id: user.id,
          action: action,
          target_type: targetType || null,
          target_id: targetId == null ? null : String(targetId),
          metadata: metadata || null
        })
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] logAdminEvent:", res.error.message);
        return null;
      }
      return res.data;
    },

    fetchReports: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) {
        console.warn("[SB] fetchReports:", res.error.message);
        return null;
      }
      return res.data || [];
    },

    createReport: async function (listingId, reason, notes) {
      if (!window.db || !listingId) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var res = await window.db
        .from("reports")
        .insert({
          listing_id: listingId,
          reporter_id: user.id,
          reason: reason || "Listing reported",
          notes: notes || null
        })
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] createReport:", res.error.message);
        return null;
      }
      return res.data;
    },

    resolveReport: async function (id) {
      if (!window.db || !id) return null;
      var res = await window.db
        .from("reports")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] resolveReport:", res.error.message);
        return null;
      }
      await SB.logAdminEvent("resolve_report", "report", id, {});
      return res.data;
    },

    fetchBannedUsers: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("banned_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) {
        console.warn("[SB] fetchBannedUsers:", res.error.message);
        return null;
      }
      return res.data || [];
    },

    banUser: async function (userId, reason) {
      if (!window.db || !userId) return null;
      var admin = await SB.currentUser();
      if (!admin) return null;
      var res = await window.db
        .from("banned_users")
        .upsert({
          user_id: userId,
          reason: reason || "Admin moderation",
          banned_by: admin.id
        }, { onConflict: "user_id" })
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] banUser:", res.error.message);
        return null;
      }
      await SB.logAdminEvent("ban_user", "user", userId, { reason: reason || null });
      return res.data;
    },

    unbanUser: async function (userId) {
      if (!window.db || !userId) return false;
      var res = await window.db
        .from("banned_users")
        .delete()
        .eq("user_id", userId);
      if (res.error) {
        console.warn("[SB] unbanUser:", res.error.message);
        return false;
      }
      await SB.logAdminEvent("unban_user", "user", userId, {});
      return true;
    },

    fetchProfiles: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) {
        console.warn("[SB] fetchProfiles:", res.error.message);
        return null;
      }
      return res.data || [];
    },

    fetchNotifications: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("app_notifications")
        .select("*")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(40);
      if (res.error) {
        console.warn("[SB] fetchNotifications:", res.error.message);
        return null;
      }
      return res.data || [];
    },

    markNotificationRead: async function (notificationId) {
      if (!window.db || !notificationId) return false;
      var res = await window.db
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (res.error) {
        console.warn("[SB] markNotificationRead:", res.error.message);
        return false;
      }
      return true;
    },

    updateUserRole: async function (userId, role) {
      if (!window.db || !userId || !role) return null;
      var res = await window.db
        .from("profiles")
        .update({ role: role })
        .eq("id", userId)
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] updateUserRole:", res.error.message);
        return null;
      }
      await SB.logAdminEvent("update_user_role", "user", userId, { role: role });
      return res.data;
    },

    fetchAdminSettings: async function (key) {
      if (!window.db || !key) return null;
      var res = await window.db
        .from("admin_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (res.error) {
        console.warn("[SB] fetchAdminSettings:", res.error.message);
        return null;
      }
      return res.data ? res.data.value : null;
    },

    saveAdminSettings: async function (key, value) {
      if (!window.db || !key) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var res = await window.db
        .from("admin_settings")
        .upsert({
          key: key,
          value: value || {},
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" })
        .select()
        .single();
      if (res.error) {
        console.warn("[SB] saveAdminSettings:", res.error.message);
        return null;
      }
      await SB.logAdminEvent("save_admin_settings", "admin_settings", key, value || {});
      return res.data;
    },

    // session courante (ou null) — synchrone côté cache du client
    currentSession: async function () {
      if (!window.db) return null;
      var res = await window.db.auth.getSession();
      return (res && res.data && res.data.session) || null;
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
    },

    // marque lus tous les messages non lus d'une conversation (ceux qui me sont
    // adressés). `messages` = le tableau conv.messages renvoyé par fetchInbox.
    markConversationRead: async function (messages) {
      if (!window.db || !Array.isArray(messages)) return 0;
      var user = await SB.currentUser();
      if (!user) return 0;
      var unread = messages.filter(function (m) {
        return m && !m.read && m.recipient_id === user.id;
      });
      for (var i = 0; i < unread.length; i++) {
        try { await window.db.rpc("mark_message_read", { msg_id: unread[i].id }); }
        catch (e) { /* ignore : RLS ou message déjà lu */ }
      }
      return unread.length;
    },

    // envoie un message ; renvoie la ligne créée ou null.
    // `sender_name` est dénormalisé pour afficher le nom dans la boîte de
    // réception sans lire la table profiles (RLS = profil privé). Si la colonne
    // n'existe pas encore, on renvoie l'insert sans elle.
    sendMessage: async function (opts) {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user || !opts || !opts.recipientId || !opts.body) return null;
      var base = {
        listing_id: opts.listingId || null,
        sender_id: user.id,
        recipient_id: opts.recipientId,
        body: opts.body
      };
      var row = Object.assign({}, base, { sender_name: opts.senderName || null });
      var res = await window.db.from("messages").insert(row).select().single();
      if (res.error && /sender_name|column/i.test(res.error.message || "")) {
        res = await window.db.from("messages").insert(base).select().single();
      }
      if (res.error) {
        console.warn("[SB] sendMessage:", res.error.message);
        return null;
      }
      return res.data;
    },

    // tous les messages où l'utilisateur est impliqué, ordre chronologique
    fetchMessages: async function () {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var res = await window.db
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (res.error) {
        console.warn("[SB] fetchMessages:", res.error.message);
        return null;
      }
      return res.data;
    },

    // regroupe les messages en conversations { key, listingId, otherId, messages[], unread }
    fetchInbox: async function () {
      if (!window.db) return null;
      var user = await SB.currentUser();
      var rows = await SB.fetchMessages();
      if (!rows || !user) return null;
      var threads = {};
      rows.forEach(function (m) {
        var otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        var key = (m.listing_id || "0") + ":" + otherId;
        if (!threads[key]) {
          threads[key] = {
            key: key,
            listingId: m.listing_id || null,
            otherId: otherId,
            otherName: "",
            lastBody: "",
            lastAt: null,
            messages: [],
            unread: 0
          };
        }
        var t = threads[key];
        t.messages.push(m);
        t.lastBody = m.body;
        t.lastAt = m.created_at;
        if (m.sender_id === otherId && m.sender_name) t.otherName = m.sender_name;
        if (!m.read && m.recipient_id === user.id) t.unread++;
      });
      return Object.keys(threads)
        .map(function (k) { return threads[k]; })
        .sort(function (a, b) { return String(b.lastAt || "").localeCompare(String(a.lastAt || "")); });
    },

    // abonnement realtime : cb(message) à chaque nouveau message reçu.
    // renvoie une fonction pour se désabonner (ou no-op).
    subscribeInbox: function (cb) {
      if (!window.db) return function () {};
      var channel = window.db
        .channel("inbox-" + Math.random().toString(36).slice(2))
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          function (payload) { cb && cb(payload.new); }
        )
        .subscribe();
      return function () { window.db.removeChannel(channel); };
    }
  };

  SB._rowToListing = rowToListing;
  SB._listingToRow = listingToRow;
  window.SB = SB;
})();

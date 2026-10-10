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

  // Client validation gives users fast feedback. The bucket policy in
  // security-hardening-v2.sql is the authoritative server-side control.
  var ALLOWED_IMAGE_TYPES = {
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true
  };
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  // ids the signed-in user has blocked; kept in step by fetchBlocks /
  // blockUser / unblockUser so fetchInbox can drop those conversations.
  var blockedIds = {};

  // A missing token is not fatal here: Supabase decides. While CAPTCHA
  // protection is off it ignores the token; once on, it answers with a
  // captcha error, which friendlyCaptchaError() turns into a clear message.
  async function captchaTokenOrNull() {
    if (!window.Captcha) return null;
    try { return await window.Captcha.token(); }
    catch (e) { console.warn("[SB] captcha:", e && e.message); return null; }
  }

  /* ---- Android app: provider sign-in in a Chrome Custom Tab ---- */

  // Browser + App Capacitor plugins, only inside the Android app build that
  // ships them. Older builds (and the web) fall back to the in-page redirect.
  function androidAuthPlugins() {
    var cap = window.Capacitor;
    if (!cap || !cap.getPlatform || cap.getPlatform() !== "android") return null;
    if (!cap.isNativePlatform || !cap.isNativePlatform()) return null;
    var p = cap.Plugins || {};
    return p.Browser && p.App ? { Browser: p.Browser, App: p.App } : null;
  }

  function isAuthCallback(url) {
    return typeof url === "string" && url.indexOf("buyselltradesxm://auth/callback") === 0;
  }

  var pendingAuthCallback = null; // resolver for the sign-in in progress

  // Opens the provider page and resolves with the buyselltradesxm:// callback
  // URL. Rejects with code CANCELLED if the user closes the tab instead.
  function waitForAndroidAuthCallback(android, providerUrl) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var finishedHandle = null;
      function done(fn, value) {
        if (settled) return;
        settled = true;
        pendingAuthCallback = null;
        if (finishedHandle && finishedHandle.remove) finishedHandle.remove();
        try { android.Browser.close(); } catch (e) { /* already closed */ }
        fn(value);
      }
      pendingAuthCallback = function (url) { done(resolve, url); };
      Promise.resolve(android.Browser.addListener("browserFinished", function () {
        // Returning through the callback link also closes the tab, and that
        // event can arrive first: give the link a moment before calling it
        // a cancellation.
        setTimeout(function () {
          var err = new Error("Sign-in cancelled");
          err.code = "CANCELLED";
          done(reject, err);
        }, 2000);
      })).then(function (h) { finishedHandle = h; });
      android.Browser.open({ url: providerUrl }).catch(function (e) { done(reject, e); });
    });
  }

  async function exchangeAuthCallback(callbackUrl) {
    var url = new URL(callbackUrl);
    var code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error_description") || "Sign-in did not complete");
    return await window.db.auth.exchangeCodeForSession(code);
  }

  // One listener for the app's lifetime. It hands the callback to the
  // sign-in in progress; if there is none (Android restarted the app while
  // the user was in the tab), it exchanges the code itself and onAuthChange
  // picks up the new session.
  (function listenForAndroidAuthCallbacks() {
    var android = androidAuthPlugins();
    if (!android) return;
    function handle(url) {
      if (!isAuthCallback(url)) return;
      if (pendingAuthCallback) { pendingAuthCallback(url); return; }
      if (window.db) exchangeAuthCallback(url).catch(function (e) { console.warn("[SB] auth callback:", e && e.message); });
    }
    android.App.addListener("appUrlOpen", function (event) { handle(event && event.url); });
    Promise.resolve(android.App.getLaunchUrl()).then(function (launch) { handle(launch && launch.url); }).catch(function () {});
  })();

  function friendlyCaptchaError(result) {
    if (result && result.error && /captcha/i.test(result.error.message || "")) {
      var fr = (document.documentElement.lang || "fr").indexOf("fr") === 0;
      result.error.code = "captcha_failed";
      result.error.message = fr
        ? "Vérification anti-robot échouée. Rechargez la page et réessayez."
        : "Anti-bot check failed. Reload the page and try again.";
    }
    return result;
  }

  function isAllowedImage(file) {
    return !!file && ALLOWED_IMAGE_TYPES[file.type] === true &&
      Number(file.size || 0) > 0 && Number(file.size || 0) <= MAX_IMAGE_BYTES;
  }

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
        paid: !!r.is_boosted && r.boost_source !== "included_auto",
        startedAt: r.boost_started_at || null,
        auto: r.boost_source === "included_auto",
        included: r.boost_source === "included_auto",
        month: r.boost_month || null,
        plan: r.boost_plan || null
      } : null,
      reserved: r.status === "reserved",
      sold: r.status === "sold",
      status: r.status || "active",
      moderationStatus: r.moderation_status || "approved",
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
      boost_source: o.boost && o.boost.auto ? "included_auto" : (o.boost && o.boost.paid ? "paid" : null),
      boost_month: o.boost && o.boost.month ? o.boost.month : null,
      boost_plan: o.boost && o.boost.plan ? o.boost.plan : null,
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
        if (!isAllowedImage(file)) {
          console.warn("[SB] uploadPhotos: rejected unsupported or oversized image");
          continue;
        }
        // Never derive a stored extension from attacker-controlled filenames.
        var ext = file.type === "image/png" ? "png" : (file.type === "image/webp" ? "webp" : "jpg");
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

    // upload (remplace) la photo de profil de l'utilisateur connecté dans le
    // bucket public "avatars" ; reçoit un Blob/File déjà recadré côté client,
    // Each version is a new object: existing Storage policies permit INSERT,
    // not UPDATE. The profile switches URLs only after its save succeeds.
    uploadAvatar: async function (blob) {
      if (!window.db || !blob || !isAllowedImage(blob)) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var bucket = window.db.storage.from("avatars");
      var version = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
      var path = user.id + "/avatar-" + version + ".jpg";
      var up = await bucket.upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg"
      });
      if (up.error) {
        console.warn("[SB] uploadAvatar:", up.error.message);
        return null;
      }
      return bucket.getPublicUrl(path).data.publicUrl;
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
    // expiration de 30 jours. Renvoie null si la RPC échoue ; le client
    // conserve alors l'annonce et le rappel pour permettre une nouvelle tentative.
    confirmListingAvailable: async function (id) {
      if (!window.db || !id) return null;
      var rpc = await window.db.rpc("confirm_listing_available", { listing_id: id });
      if (!rpc.error && rpc.data) return rowToListing(rpc.data);
      console.warn("[SB] confirmListingAvailable:", rpc.error && rpc.error.message);
      return null;
    },

    // Unsubscribe link target for the listing-renewal reminder email.
    // Deliberately works without being signed in -- callable by anon,
    // keyed on the seller's private unsubscribe token from the email
    // (never the profile id, which is public as listings.seller_id).
    unsubscribeRenewalEmails: async function (token) {
      if (!window.db || !token) return false;
      var rpc = await window.db.rpc("unsubscribe_renewal_by_token", { p_token: token });
      if (!rpc.error) return rpc.data === true;
      console.warn("[SB] unsubscribeRenewalEmails:", rpc.error.message);
      return false;
    },

    // Older emails carry ?uid=<profile id> instead of a token. That only
    // works for the signed-in owner: RLS limits the update to their own row.
    unsubscribeOwnRenewalEmails: async function (userId) {
      if (!window.db || !userId) return false;
      var res = await window.db.from("profiles")
        .update({ renewal_emails_enabled: false })
        .eq("id", userId)
        .select("id");
      if (!res.error) return (res.data || []).length === 1;
      console.warn("[SB] unsubscribeOwnRenewalEmails:", res.error.message);
      return false;
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
        .eq("id", id)
        .select("id");
      if (res.error) {
        console.warn("[SB] deleteListing:", res.error.message);
        return false;
      }
      // RLS can silently affect zero rows. HTTP success alone is not proof
      // that this seller's listing was deleted.
      return Array.isArray(res.data) && res.data.length === 1;
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
      // Optional seed records have no seller_id and cannot receive real
      // messages or ownership actions. Keep them available for administration
      // but never expose them to customers on the production domain.
      var host = String(window.location.hostname || "").toLowerCase();
      var productionHost = host === "buyselltradesxm.com" || host === "www.buyselltradesxm.com";
      if (productionHost) rows = rows.filter(function (listing) { return !!listing.sellerId; });
      L.length = 0;
      rows.forEach(function (r) { L.push(r); });
      if (typeof render === "function") render();
      if (typeof buildCats === "function") buildCats();
      return true;
    },

    /* --------- AUTHENTIFICATION --------- */
    // Sign-up, password login, resend-code and password reset carry a
    // Cloudflare Turnstile token (captcha.js); Supabase Auth rejects them
    // without one once CAPTCHA protection is on.

    signUp: async function (email, password, profile) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      var meta = typeof profile === "object" ? profile : { name: profile || "" };
      var captchaToken = await captchaTokenOrNull();
      return friendlyCaptchaError(await window.db.auth.signUp({
        email: email,
        password: password,
        options: { data: meta, captchaToken: captchaToken || undefined }
      }));
    },

    signUpWithCode: async function (email, password, profile) {
      var meta = typeof profile === "object" ? profile : { name: profile || "" };
      var captchaToken = (await captchaTokenOrNull()) || "";
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/signup-code", { method: "POST", headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY || "" }, body: JSON.stringify({ action: "start", email: email, password: password, ...meta, captcha_token: captchaToken }) });
      var data = await response.json().catch(function () { return {}; });
      return response.ok ? { data: data, error: null } : { data: null, error: { message: data.error || "Signup could not be completed", code: data.code || "", status: response.status } };
    },
    signIn: async function (email, password) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      var captchaToken = await captchaTokenOrNull();
      return friendlyCaptchaError(await window.db.auth.signInWithPassword({
        email: email,
        password: password,
        options: { captchaToken: captchaToken || undefined }
      }));
    },

    // Valide le code à 6 chiffres reçu par email après signUp() et ouvre
    // la session si le code est correct. type "signup" = confirmation d'inscription.
    verifyOtp: async function (email, token) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      return window.db.auth.verifyOtp({ email: email, token: token, type: "signup" });
    },

    verifySignupCode: async function (email, userId, token) {
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/signup-code", { method: "POST", headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY || "" }, body: JSON.stringify({ action: "verify", email: email, user_id: userId, code: token }) });
      var data = await response.json().catch(function () { return {}; });
      return response.ok ? { data: data, error: null } : { data: null, error: { message: data.error || "Invalid or expired code", code: data.code || "", status: response.status } };
    },
    // Renvoie un nouveau code de confirmation à la même adresse.
    resendSignupOtp: async function (email) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      var captchaToken = await captchaTokenOrNull();
      return friendlyCaptchaError(await window.db.auth.resend({
        type: "signup",
        email: email,
        options: { captchaToken: captchaToken || undefined }
      }));
    },

    resendSignupCode: async function (email, userId) {
      var captchaToken = (await captchaTokenOrNull()) || "";
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/signup-code", { method: "POST", headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY || "" }, body: JSON.stringify({ action: "resend", email: email, user_id: userId, captcha_token: captchaToken }) });
      var data = await response.json().catch(function () { return {}; });
      return response.ok ? { data: data, error: null } : { data: null, error: { message: data.error || "Could not resend code", code: data.code || "", status: response.status } };
    },
    // provider: "google" | tout provider OAuth activé côté Supabase.
    // Redirige le navigateur ; onAuthChange() reprend la main au retour (session
    // détectée automatiquement dans l'URL par supabase-js).
    signInWithOAuth: async function (provider) {
      if (!window.db) return { error: { message: "Supabase non configuré" } };
      if (window.SXM && SXM.isIOS()) {
        try {
          const result = await window.db.auth.signInWithOAuth({
            provider: provider,
            // Retour via une page du site (toujours acceptée par Supabase) qui
            // relaie le code vers buyselltradesxm://auth/callback.
            options: { redirectTo: "https://buyselltradesxm.com/auth-callback.html", skipBrowserRedirect: true }
          });
          if (result.error) return result;
          const callback = await SXM.plugin().authenticate({ url: result.data.url });
          const url = new URL(callback.url);
          if (url.protocol !== "buyselltradesxm:" || url.host !== "auth" || url.pathname !== "/callback") throw new Error("Invalid sign-in callback");
          const code = url.searchParams.get("code");
          if (!code) throw new Error(url.searchParams.get("error_description") || "Sign-in did not complete");
          return await window.db.auth.exchangeCodeForSession(code);
        } catch (error) {
          return { error: { message: error.code === "CANCELLED" ? "" : error.message, code: error.code } };
        }
      }
      // Android app: Google refuses sign-in inside a WebView
      // ("disallowed_useragent"), so the provider page opens in a Chrome
      // Custom Tab. auth-callback.html then sends the result back through
      // buyselltradesxm://auth/callback (intent filter in AndroidManifest),
      // and the code is exchanged here, in the WebView that holds the PKCE
      // verifier.
      var android = androidAuthPlugins();
      if (android) {
        try {
          const result = await window.db.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: "https://buyselltradesxm.com/auth-callback.html", skipBrowserRedirect: true }
          });
          if (result.error) return result;
          const callbackUrl = await waitForAndroidAuthCallback(android, result.data.url);
          return await exchangeAuthCallback(callbackUrl);
        } catch (error) {
          return { error: { message: error.code === "CANCELLED" ? "" : error.message, code: error.code } };
        }
      }
      return window.db.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
    },

    signOut: async function () {
      if (!window.db) return;
      return window.db.auth.signOut();
    },

    requestPasswordReset: async function (email) {
      if (!window.db) return { error: { message: "Authentication unavailable" } };
      var captchaToken = (await captchaTokenOrNull()) || "";
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: String(email || ""),
          client_pkce: true,
          captcha_token: captchaToken
        })
      });
      if (!response.ok && response.status !== 202) return { error: { message: "Unable to request reset" } };
      var gate = await response.json().catch(function () { return {}; });
      if (!gate.allowed) return { data: { accepted: true }, error: null };

      // Start recovery from the browser so the PKCE verifier is created and
      // stored by the same Supabase client that will exchange the email link.
      // Calling /auth/v1/recover from the Edge Function skips that verifier.
      return await window.db.auth.resetPasswordForEmail(String(email || "").trim(), {
        redirectTo: window.location.origin + "/?reset=1",
        captchaToken: captchaToken || undefined
      });
    },

    updatePasswordAndRevokeSessions: async function (password) {
      if (!window.db) return { error: { message: "Authentication unavailable" } };
      var result;
      try {
        result = await window.db.auth.updateUser({ password: password });
      } catch (error) {
        return { error: error || { message: "Password update failed" } };
      }
      if (result.error) return result;
      // A reset must invalidate other devices. Supabase revokes the current
      // browser too, so the user must sign in with the new password. The
      // password change is already committed at this point: a transient error
      // while revoking sessions must not tell the user the change failed.
      var revocationError = null;
      try {
        var revocation = await window.db.auth.signOut({ scope: "global" });
        revocationError = revocation && revocation.error || null;
      } catch (error) {
        revocationError = error;
      }
      if (revocationError) {
        result.sessionRevocationWarning = true;
        console.warn("[SB] Password changed, but global session revocation could not be confirmed.", revocationError.message);
      }
      return result;
    },

    createSecureCheckout: async function (plan) {
      if (!window.db) return { error: { message: "Authentication unavailable" } };
      var session = await SB.currentSession();
      if (!session || !session.access_token) return { error: { message: "Not authenticated" } };
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ plan: plan })
      });
      var body = await response.json().catch(function () { return {}; });
      return response.ok && body.url ? { data: body, error: null } : { data: null, error: { message: "Checkout unavailable" } };
    },

    // One-time Stripe payment for a boost on one of the caller's listings.
    // The boost itself is applied by the webhook once Stripe confirms payment.
    createBoostCheckout: async function (listingId, days) {
      if (!window.db) return { error: { message: "Authentication unavailable" } };
      var session = await SB.currentSession();
      if (!session || !session.access_token) return { error: { message: "Not authenticated" } };
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ boost: { listingId: String(listingId), days: days } })
      });
      var body = await response.json().catch(function () { return {}; });
      return response.ok && body.url ? { data: body, error: null } : { data: null, error: { message: "Checkout unavailable" } };
    },

    // Stripe Customer Portal (cancel / update card). Server looks up the
    // customer id from the caller's own profile.
    openBillingPortal: async function () {
      if (!window.db) return { error: { message: "Authentication unavailable" } };
      var session = await SB.currentSession();
      if (!session || !session.access_token) return { error: { message: "Not authenticated" } };
      var response = await fetch(window.SUPABASE_URL + "/functions/v1/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
        body: "{}"
      });
      var body = await response.json().catch(function () { return {}; });
      return response.ok && body.url ? { data: body, error: null } : { data: null, error: { message: "Portal unavailable" } };
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

    // Web Push: upsert this browser's subscription for the current user.
    // `sub` is { endpoint, p256dh, auth, user_agent }.
    savePushSubscription: async function (sub) {
      if (!window.db || !sub || !sub.endpoint) return false;
      var user = await SB.currentUser();
      if (!user) return false;
      var res = await window.db
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: sub.user_agent || null,
          last_seen: new Date().toISOString()
        }, { onConflict: "endpoint" });
      if (res.error) {
        console.warn("[SB] savePushSubscription:", res.error.message);
        return false;
      }
      return true;
    },

    deletePushSubscription: async function (endpoint) {
      if (!window.db || !endpoint) return false;
      var res = await window.db
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
      if (res.error) {
        console.warn("[SB] deletePushSubscription:", res.error.message);
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
      if (!window.db || !msgId) return false;
      try {
        var res = await window.db.rpc("mark_message_read", { msg_id: msgId });
        return !!res && !res.error;
      } catch (e) { return false; }
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
      var done = 0;
      for (var i = 0; i < unread.length; i++) {
        if (await SB.markMessageRead(unread[i].id)) {
          unread[i].read = true;
          done++;
        }
      }
      return done;
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
        if (blockedIds[otherId]) return;
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
    },

    /* ---------------- BLOCKED USERS ---------------- */

    // users the caller has blocked: [{ id, name }] ; null on error.
    fetchBlocks: async function () {
      if (!window.db) return null;
      var user = await SB.currentUser();
      if (!user) return null;
      var res = await window.db
        .from("user_blocks")
        .select("blocked_id, blocked_name")
        .order("created_at", { ascending: true });
      if (res.error) {
        console.warn("[SB] fetchBlocks:", res.error.message);
        return null;
      }
      blockedIds = {};
      return (res.data || []).map(function (r) {
        blockedIds[r.blocked_id] = true;
        return { id: r.blocked_id, name: r.blocked_name || "" };
      });
    },

    // the message policy (user-blocks.sql) is what stops messages; this
    // only records the block. true on success.
    blockUser: async function (blockedId, name) {
      if (!window.db || !blockedId) return false;
      var user = await SB.currentUser();
      if (!user) return false;
      var res = await window.db
        .from("user_blocks")
        .upsert(
          { blocker_id: user.id, blocked_id: blockedId, blocked_name: String(name || "").slice(0, 80) || null },
          { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
        );
      if (res.error) {
        console.warn("[SB] blockUser:", res.error.message);
        return false;
      }
      blockedIds[blockedId] = true;
      return true;
    },

    unblockUser: async function (blockedId) {
      if (!window.db || !blockedId) return false;
      var res = await window.db.from("user_blocks").delete().eq("blocked_id", blockedId);
      if (res.error) {
        console.warn("[SB] unblockUser:", res.error.message);
        return false;
      }
      delete blockedIds[blockedId];
      return true;
    },

    /* ---------------- ADMIN: moderation queue ---------------- */

    // annonces en attente de validation (ou toutes, pour l'onglet "À valider")
    fetchPendingListings: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("listings")
        .select("*")
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: false });
      if (res.error) { console.warn("[SB] fetchPendingListings:", res.error.message); return null; }
      return (res.data || []).map(rowToListing);
    },

    // approuve / rejette une annonce ; admin uniquement (RLS), le trigger
    // laisse passer la valeur car appelée par un admin (is_admin() = true).
    setListingModerationStatus: async function (listingId, status) {
      if (!window.db) return false;
      var res = await window.db
        .from("listings")
        .update({ moderation_status: status })
        .eq("id", listingId)
        .select("id");
      if (res.error) { console.warn("[SB] setListingModerationStatus:", res.error.message); return false; }
      if (!Array.isArray(res.data) || res.data.length !== 1) return false;
      await SB.logAdminEvent("set_moderation_status", "listing", listingId, { status: status });
      return true;
    },

    fetchModerationRules: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("moderation_rules")
        .select("categories, keywords")
        .eq("id", true)
        .maybeSingle();
      if (res.error) { console.warn("[SB] fetchModerationRules:", res.error.message); return null; }
      return res.data || { categories: [], keywords: [] };
    },

    saveModerationRules: async function (categories, keywords) {
      if (!window.db) return false;
      var user = await SB.currentUser();
      var res = await window.db
        .from("moderation_rules")
        .update({
          categories: categories || [],
          keywords: keywords || [],
          updated_by: user ? user.id : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", true)
        .select("id");
      if (res.error) { console.warn("[SB] saveModerationRules:", res.error.message); return false; }
      return Array.isArray(res.data) && res.data.length === 1;
    },

    /* ---------------- ADMIN: users ---------------- */

    // supprime définitivement un compte (Edge Function, clé service_role).
    adminDeleteUser: async function (userId) {
      if (!window.db) return { error: "not connected" };
      var res = await window.db.functions.invoke("admin-delete-user", { body: { user_id: userId } });
      if (res.error) { console.warn("[SB] adminDeleteUser:", res.error.message); return { error: res.error.message }; }
      return res.data || { ok: true };
    },

    // Suppression de compte en libre-service (droit à l'effacement / GDPR).
    deleteMyAccount: async function () {
      if (!window.db) return { error: "not connected" };
      var res = await window.db.functions.invoke("delete-my-account", { body: {} });
      if (res.error) { console.warn("[SB] deleteMyAccount:", res.error.message); return { error: res.error.message }; }
      return res.data || { ok: true };
    },

    // demande à l'Edge Function moderate-photo (AWS Rekognition) d'analyser une photo.
    moderatePhoto: async function (imageUrl) {
      if (!window.db) return { error: "not connected" };
      var res = await window.db.functions.invoke("moderate-photo", { body: { image_url: imageUrl } });
      if (res.error) { console.warn("[SB] moderatePhoto:", res.error.message); return { error: res.error.message }; }
      return res.data || {};
    },

    /* ---------------- ADMIN: direct-sold ad campaigns ---------------- */

    fetchAdCampaigns: async function () {
      if (!window.db) return null;
      var res = await window.db
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) { console.warn("[SB] fetchAdCampaigns:", res.error.message); return null; }
      return res.data || [];
    },

    upsertAdCampaign: async function (row) {
      if (!window.db || !row || !row.id) return false;
      var user = await SB.currentUser();
      var payload = Object.assign({}, row, {
        created_by: row.created_by || (user ? user.id : null),
        updated_at: new Date().toISOString()
      });
      var res = await window.db.from("ad_campaigns").upsert(payload);
      if (res.error) { console.warn("[SB] upsertAdCampaign:", res.error.message); return false; }
      return true;
    },

    deleteAdCampaign: async function (id) {
      if (!window.db || !id) return false;
      var res = await window.db.from("ad_campaigns").delete().eq("id", id).select("id");
      if (res.error) { console.warn("[SB] deleteAdCampaign:", res.error.message); return false; }
      return Array.isArray(res.data) && res.data.length === 1;
    },

    /* ---------------- ADMIN: stats ---------------- */

    fetchDailyCounts: async function (days) {
      if (!window.db) return null;
      var res = await window.db.rpc("admin_daily_counts", { days: days || 14 });
      if (res.error) { console.warn("[SB] fetchDailyCounts:", res.error.message); return null; }
      return res.data || [];
    },

    // { days: [{day, visits, views, app_views}], errors: [...] } ; null on error.
    fetchSiteStats: async function (days) {
      if (!window.db) return null;
      var res = await window.db.rpc("admin_site_stats", { days: days || 14 });
      if (res.error) { console.warn("[SB] fetchSiteStats:", res.error.message); return null; }
      return res.data || null;
    }
  };

  SB._rowToListing = rowToListing;
  SB._listingToRow = listingToRow;
  window.SB = SB;
})();

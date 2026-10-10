/* iOS-only authentication and StoreKit bridge. Web and Android keep their own flows. */
(function () {
  "use strict";
  const prefix = "com.korekdigitalmarketing.buyselltradesxm.";
  const ids = {
    "pro-starter": prefix + "pro_starter_monthly",
    "pro-business": prefix + "pro_business_monthly",
    "pro-premium": prefix + "pro_premium_monthly",
    "pro-elite": prefix + "pro_elite_monthly",
    "pro-unlimited": prefix + "pro_unlimited_monthly",
    "boost-3": prefix + "boost_3_days",
    "boost-7": prefix + "boost_7_days",
    "boost-14": prefix + "boost_14_days"
  };
  let bridge, catalog, catalogRequest, buying = false, syncing = false, listening = false;
  const fr = () => document.documentElement.lang === "fr";
  const isIOS = () => !!(window.Capacitor && Capacitor.getPlatform() === "ios");
  function plugin() {
    if (!isIOS()) throw new Error("iOS is required");
    if (!bridge) bridge = Capacitor.Plugins?.SXMNative || (Capacitor.registerPlugin && Capacitor.registerPlugin("SXMNative"));
    if (!bridge) throw new Error(fr() ? "Mettez l’application à jour pour continuer." : "Please update the app to continue.");
    return bridge;
  }
  function message(error) {
    if (error?.code === "CANCELLED") return;
    const value = error?.message || (fr() ? "Service indisponible. Réessayez." : "Service unavailable. Please try again.");
    if (typeof showToast === "function") showToast(value);
  }
  async function api(body) {
    const session = await window.db?.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error(fr() ? "Connectez-vous avant de continuer." : "Please sign in first.");
    const response = await fetch(window.SUPABASE_URL + "/functions/v1/apple-purchases", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Purchase verification is temporarily unavailable. Use Restore Purchases to retry.");
    return result;
  }
  async function products() {
    if (catalog) return catalog;
    if (!catalogRequest) catalogRequest = plugin().products().then(result => {
      catalog = Object.fromEntries(result.products.map(product => [product.id, product]));
      return catalog;
    }).finally(() => { catalogRequest = null; });
    return catalogRequest;
  }
  function price(key) {
    const product = catalog?.[ids[key]];
    return product ? product.price + (key.startsWith("pro-") ? (fr() ? " / mois" : " / month") : "")
      : (fr() ? "Indisponible sur l’App Store" : "Unavailable in the App Store");
  }
  async function refreshPrices() {
    if (!isIOS()) return;
    const loading = fr() ? "Chargement du prix Apple…" : "Loading Apple price…";
    const update = () => {
      document.querySelectorAll('[data-click="chooseProPlan"]').forEach(button => {
        let key; try { key = JSON.parse(button.dataset.clickArgs)[0]; } catch (_) { return; }
        const card = button.closest(".pricing-card");
        if (card) { const label = card.querySelector(".pricing-price"); if (label) label.textContent = catalog ? price(key) : loading; }
      });
      [3, 7, 14].forEach(days => document.querySelectorAll('[data-i18n="boost' + days + 'Price"]').forEach(el => { el.textContent = catalog ? price("boost-" + days) : loading; }));
      const plan = typeof pendingSelectedProPlan !== "undefined" ? pendingSelectedProPlan : null;
      const amount = document.getElementById("paymentPlanPrice");
      if (amount && plan) amount.textContent = catalog ? price(plan) : loading;
      const renewalTerms = document.getElementById("paymentRenewalTerms");
      if (renewalTerms && plan && typeof renewalDisclosure === "function") {
        renewalTerms.textContent = catalog ? renewalDisclosure(plan, price(plan)) : loading;
      }
      const boostAmount = document.getElementById("boostCheckoutAmount");
      if (boostAmount) boostAmount.textContent = catalog ? price("boost-" + (typeof pendingBoostDays !== "undefined" ? pendingBoostDays : 7)) : loading;
      document.querySelectorAll('[data-i18n="paymentDemoTitle"]').forEach(el => { el.textContent = fr() ? "Paiement Apple" : "Apple payment"; });
      document.querySelectorAll('[data-i18n="paymentDemoText"]').forEach(el => {
        el.textContent = fr() ? "Abonnement mensuel à renouvellement automatique. Paiement via votre compte Apple. Annulez dans les réglages Apple avant le renouvellement." : "Monthly auto-renewing subscription. Payment is charged to your Apple account. Cancel in Apple settings before renewal.";
      });
      document.querySelectorAll('[data-i18n="paymentConfirm"], [data-i18n="boostConfirm"]').forEach(el => { el.textContent = fr() ? "Acheter avec Apple" : "Buy with Apple"; });
      document.querySelectorAll("[data-apple-only]").forEach(el => { el.hidden = false; });
    };
    update();
    try { await products(); update(); } catch (error) { catalog = null; message(error); }
  }
  async function deliver(signedTransaction) {
    const result = await api({ action: "verify", signedTransaction });
    await plugin().finish({ transactionId: result.transactionId });
    return result;
  }
  async function refreshAccount() {
    const session = await window.db?.auth.getSession();
    const user = session?.data?.session?.user;
    if (user && typeof applySupabaseUser === "function") await applySupabaseUser(user);
    if (window.SB) await SB.hydrate();
    if (typeof render === "function") render();
    if (document.getElementById("profileModal")?.classList.contains("open")) renderProfile();
  }
  async function buy(key, listingId) {
    if (buying) return false;
    buying = true;
    try {
      if (!ids[key]) throw new Error("Unknown product");
      const available = await products();
      if (!available[ids[key]]) throw new Error(fr() ? "Produit indisponible sur l’App Store." : "Product unavailable in the App Store.");
      const intent = await api({ action: "prepare", productId: ids[key], listingId: listingId == null ? null : String(listingId) });
      const result = await plugin().purchase({ productId: ids[key], appAccountToken: intent.appAccountToken });
      if (result.cancelled) return false;
      if (result.pending) { message({ message: fr() ? "Achat en attente d’approbation Apple." : "Purchase is awaiting Apple approval." }); return false; }
      await deliver(result.signedTransaction);
      await refreshAccount();
      return true;
    } catch (error) { message(error); return false; }
    finally { buying = false; }
  }
  async function sync(restore = false) {
    if (!isIOS() || syncing) return;
    syncing = true;
    try {
      const session = await window.db?.auth.getSession();
      if (!session?.data?.session) return;
      if (!listening) {
        listening = true;
        await plugin().addListener("transaction", async result => {
          try { await deliver(result.signedTransaction); await refreshAccount(); } catch (error) { message(error); }
        });
      }
      const result = await (restore ? plugin().restore() : plugin().pending());
      let failed = false;
      for (const signed of result.transactions) {
        try { await deliver(signed); } catch (error) { failed = true; if (restore) message(error); }
      }
      if (result.transactions.length) await refreshAccount();
      if (restore && !failed) message({ message: result.transactions.length
        ? (fr() ? "Achats restaurés." : "Purchases restored.")
        : (fr() ? "Aucun achat à restaurer pour ce compte Apple." : "No purchases to restore for this Apple account.") });
    } catch (error) { if (restore) message(error); }
    finally { syncing = false; }
  }
  /* ---- Native shell: tab bar, pull to refresh (SXMRootViewController.swift) ----
     Builds that have it announce themselves through window.SXMNativeInfo
     before any script runs; older builds and browsers never set it. */
  const shell = () => (isIOS() && window.SXMNativeInfo) || {};
  const tabModals = { postModal: "post", messagesModal: "messages", profileModal: "profile" };
  let wantedTab = "browse", sentTabs = "";
  function currentTab() {
    for (const modal of document.querySelectorAll(".modal.open")) if (tabModals[modal.id]) return tabModals[modal.id];
    const panel = document.getElementById("notifPanel");
    if (panel && !panel.hidden) return "alerts";
    // The login screen opened from a tab keeps that tab lit.
    if (document.querySelector("#accountModal.open")) return wantedTab;
    wantedTab = "browse";
    return "browse";
  }
  function unread(id) {
    const el = document.getElementById(id);
    return el && !el.hidden ? parseInt(el.textContent, 10) || 0 : 0;
  }
  // The bar shows the page's own words, so a wording change on the site
  // reaches the app without a new build.
  function tabTitles() {
    if (typeof t !== "function") return {};
    const words = t();
    return { browse: words.browseLabel, post: words.postShort, messages: words.messages, alerts: words.notifLabel, profile: words.profileLabel };
  }
  function syncTabs() {
    const tabs = { selected: currentTab(), lang: document.documentElement.lang || "fr",
      badges: { messages: unread("msgCount"), alerts: unread("notifCount") }, titles: tabTitles() };
    const key = JSON.stringify(tabs);
    if (key === sentTabs) return;
    sentTabs = key;
    try { plugin().setTabs(tabs).catch(() => {}); } catch (_) {}
  }
  function showTab(tab) {
    document.querySelectorAll(".modal.open").forEach(modal => closeModal(modal.id));
    const panel = document.getElementById("notifPanel");
    if (panel && !panel.hidden) toggleNotifPanel();
    toggleFilters(false);
    wantedTab = tab;
    if (tab === "post") openPostModal();
    else if (tab === "messages") openMessages();
    else if (tab === "alerts") toggleNotifPanel();
    else if (tab === "profile") openProfile();
    else window.scrollTo({ top: 0, behavior: "smooth" });
    syncTabs();
  }
  async function refreshFromPull() {
    try {
      if (document.querySelector("#messagesModal.open") && typeof loadInbox === "function") await loadInbox();
      else if (window.SB) await SB.hydrate();
      if (typeof refreshMessageBadge === "function") refreshMessageBadge();
    } catch (_) {}
    try { plugin().refreshDone().catch(() => {}); } catch (_) {}
  }
  function startShell() {
    if (!shell().tabs) return;
    // The native bar replaces the page's own bottom navigation.
    const style = document.createElement("style");
    style.textContent = "html.sxm-native-tabs .mobile-nav{display:none!important}" +
      "html.sxm-native-tabs body{padding-bottom:0!important}" +
      "@media (max-width:900px){html.sxm-native-tabs .notif-panel{bottom:12px!important}}";
    document.head.appendChild(style);
    document.documentElement.classList.add("sxm-native-tabs");
    window.addEventListener("sxmTab", event => { if (event.tab) showTab(event.tab); });
    window.addEventListener("sxmRefresh", refreshFromPull);
    const watch = new MutationObserver(syncTabs);
    document.querySelectorAll(".modal").forEach(modal => watch.observe(modal, { attributes: true, attributeFilter: ["class"] }));
    ["notifPanel", "msgCount", "notifCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) watch.observe(el, { attributes: true, attributeFilter: ["hidden"], childList: true, characterData: true, subtree: true });
    });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    syncTabs();
    // A tab chosen before the page was ready (home screen shortcut).
    try {
      plugin().ready().then(result => { if (result && result.tab) setTimeout(() => showTab(result.tab), 600); }).catch(() => {});
    } catch (_) {}
  }
  /* ---- Push notifications in builds that can register with Apple (APNs) ----
     Same contract as push-notifications.js, which serves browsers: the rest
     of the app only knows window.Push. The device token is stored like a
     browser subscription, as "apns:<token>", and send-push delivers to it. */
  function nativePush() {
    const endpoint = token => "apns:" + token;
    const save = token => SB.savePushSubscription({ endpoint: endpoint(token), p256dh: "-", auth: "-", user_agent: "ios-app" });
    const state = () => plugin().pushStatus();
    return {
      supported: () => true,
      status: () => state().then(r => r.status === "denied" ? "denied" : r.status !== "granted" ? "default" : r.on ? "on" : "ready").catch(() => "default"),
      enable: () => plugin().pushEnable().then(async r => {
        if (!r.token) return { ok: false, status: r.status === "denied" ? "denied" : "error" };
        if (!(window.SB && SB.savePushSubscription)) return { ok: false, status: "ready", reason: "no-backend" };
        if (await save(r.token)) return { ok: true, status: "on" };
        // Without the saved token nothing can be delivered: stay off.
        await plugin().pushDisable().catch(() => {});
        return { ok: false, status: "ready", reason: "save-failed" };
      }).catch(error => ({ ok: false, status: "error", reason: String(error && error.message || error) })),
      disable: () => plugin().pushDisable().then(r => r.token && window.SB && SB.deletePushSubscription ? SB.deletePushSubscription(endpoint(r.token)) : true)
        .then(saved => ({ ok: saved !== false })).catch(() => ({ ok: false })),
      // Apple can change the token: refresh the stored one when notifications are on.
      syncEndpoint: () => state().then(r => r.on ? plugin().pushEnable().then(x => x.token && window.SB && SB.savePushSubscription ? save(x.token) : null) : null).catch(() => {})
    };
  }
  function startPush() { if (shell().push) window.Push = nativePush(); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { startShell(); startPush(); });
  else { startShell(); startPush(); }

  window.SXM = { isIOS, shell, plugin, ids, buy, refreshPrices, sync, message,
    restore: () => sync(true),
    manage: () => plugin().manageSubscriptions().catch(message)
  };
  document.addEventListener("click", event => {
    if (event.target.closest("[data-apple-restore]")) SXM.restore();
    if (event.target.closest("[data-apple-manage]")) SXM.manage();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
})();

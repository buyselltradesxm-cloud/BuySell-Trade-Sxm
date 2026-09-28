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
    if (catalog && Object.keys(catalog).length) return catalog;
    if (!catalogRequest) catalogRequest = plugin().products().then(result => {
      // StoreKit can temporarily return no products during provisioning or an
      // outage. Let the next attempt refresh instead of caching that forever.
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
        await plugin().addListener("transaction", async result => {
          try { await deliver(result.signedTransaction); await refreshAccount(); } catch (error) { message(error); }
        });
        listening = true;
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
  window.SXM = { isIOS, plugin, ids, buy, refreshPrices, sync, message,
    restore: () => sync(true),
    manage: () => plugin().manageSubscriptions().catch(message)
  };
  document.addEventListener("click", event => {
    if (event.target.closest("[data-apple-restore]")) SXM.restore();
    if (event.target.closest("[data-apple-manage]")) SXM.manage();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
})();

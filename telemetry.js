/* ============================================================
 *  Anonymous visit counts + JavaScript error reports.
 *  Sent to this site's own Supabase project (supabase/site-telemetry.sql)
 *  and shown in the admin panel's Statistics tab. No cookie, no visitor
 *  id: a visit is "the first page load of the day in this browser",
 *  remembered as a date in localStorage.
 *
 *  Loaded first so errors in later scripts are caught. supabase-config.js
 *  loads after it, so nothing is sent before the page's load event.
 * ============================================================ */
(function () {
  "use strict";
  // Silent during local development, unless a test opts in with ?telemetry=1.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]telemetry=1/.test(location.search)) return;

  var MAX_REPORTS = 5;         // per page load
  var queue = [];
  var seen = {};
  var ready = false;

  function surface() {
    try {
      var platform = window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform();
      if (platform === "android" || platform === "ios") return platform;
      if (window.matchMedia && matchMedia("(display-mode: standalone)").matches) return "pwa";
    } catch (e) { /* fall through */ }
    return "web";
  }

  function rpc(name, body) {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
    try {
      fetch(window.SUPABASE_URL + "/rest/v1/rpc/" + name, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: "Bearer " + window.SUPABASE_ANON_KEY },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) { /* reporting must never break the page */ }
  }

  function sameOrigin(source) {
    return !source || source.indexOf(location.origin) === 0;
  }

  function report(message, source, line, col, stack) {
    message = String(message || "");
    // "Script error." is all a browser reveals about third-party (ad) scripts.
    if (!message || message === "Script error." || !sameOrigin(source)) return;
    var key = message + "|" + source + "|" + line;
    if (seen[key] || Object.keys(seen).length >= MAX_REPORTS) return;
    seen[key] = true;
    var entry = {
      message: message, source: source || "", line: line || null, col: col || null,
      stack: String(stack || "").slice(0, 2000), page: location.pathname,
      surface: surface(), user_agent: navigator.userAgent
    };
    if (ready) rpc("log_client_error", { p: entry }); else queue.push(entry);
  }

  window.addEventListener("error", function (e) {
    // Failed images/scripts fire "error" with no message; those are not bugs.
    if (e && e.message) report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e && e.reason;
    report("Unhandled rejection: " + ((reason && reason.message) || reason), "", null, null, reason && reason.stack);
  });

  window.addEventListener("load", function () {
    ready = true;
    queue.splice(0).forEach(function (entry) { rpc("log_client_error", { p: entry }); });

    var today = new Date().toISOString().slice(0, 10);
    var newVisit = true;
    try {
      newVisit = localStorage.getItem("bst_visit_day") !== today;
      if (newVisit) localStorage.setItem("bst_visit_day", today);
    } catch (e) { /* storage blocked: count the view, treat as a visit */ }
    rpc("track_site_view", { surface: surface(), new_visit: newVisit });
  });
})();

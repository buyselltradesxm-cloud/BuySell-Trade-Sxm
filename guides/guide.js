/* English by default; the language chosen on the marketplace or here wins. */
(function () {
  var root = document.documentElement, lang = "";
  try { lang = (JSON.parse(localStorage.getItem("bstsxm-state") || "{}") || {}).lang || localStorage.getItem("lang"); } catch (e) {}
  function set(l) { root.setAttribute("data-lang", l); root.lang = l; }
  set(lang === "fr" ? "fr" : "en");
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("lang").addEventListener("click", function () {
      var next = root.lang === "fr" ? "en" : "fr";
      set(next);
      try { localStorage.setItem("lang", next); } catch (e) {}
    });
  });
})();

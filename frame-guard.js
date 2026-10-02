/* Buy Sell Trade Sxm — clickjacking guard.
 *
 * GitHub Pages cannot send X-Frame-Options / frame-ancestors, and a <meta>
 * CSP ignores frame-ancestors. Until the site sits behind an edge that sets
 * those headers (SECURITY_DEPLOYMENT.md §4), refuse to run inside another
 * site's frame: break out, or hide the page if the parent blocks that.
 */
(function () {
  if (window.top === window.self) return;
  try {
    window.top.location = window.self.location.href;
  } catch (_e) {
    document.documentElement.style.display = "none";
  }
})();

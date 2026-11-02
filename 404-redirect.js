/* 404 page: send /admin to the admin view, a listing page not built yet to
   that listing, everything else to the home page. */
(function () {
  var path = location.pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/admin") {
    location.replace("/?admin=1");
    return;
  }
  var listing = /^\/[ls]\/([\w-]+)\.html$/.exec(location.pathname);
  location.replace(listing ? "/?listing=" + listing[1] : "/");
})();

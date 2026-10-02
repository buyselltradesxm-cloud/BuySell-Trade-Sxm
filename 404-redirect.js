/* 404 page: send /admin to the admin view, everything else to the home page. */
(function () {
  var path = location.pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/admin") {
    location.replace("/?admin=1");
    return;
  }
  location.replace("/");
})();

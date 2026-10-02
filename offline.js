/* Offline page: retry button + auto-reload as soon as the connection comes back. */
(function () {
  var retry = document.getElementById("retryBtn");
  if (retry) retry.addEventListener("click", function () { location.reload(); });
  window.addEventListener("online", function () { location.reload(); });
})();

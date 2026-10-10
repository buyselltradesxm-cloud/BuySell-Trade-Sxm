// Serves this checkout to the iOS simulator smoke test (mobile-ios-cloud.yml).
// The pages' CSP says "upgrade-insecure-requests"; WebKit applies that to
// http://localhost too, so every script and image would be refetched over
// https and fail. The directive is dropped here, for this test only.
//
// Run: node scripts/ios-smoke-server.js [port]
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || 8080;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2"
};

http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end("not found"); return; }
    const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(type.startsWith("text/html") ? data.toString("utf8").replace(/;\s*upgrade-insecure-requests/g, "") : data);
  });
}).listen(port, "127.0.0.1", () => console.log("smoke server on http://localhost:" + port));

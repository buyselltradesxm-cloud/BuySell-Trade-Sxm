const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["scripts/admob-plugin-entry.js"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  outfile: "admob-plugin.js",
  legalComments: "none"
});

console.log("Built AdMob Capacitor bridge for the hosted app shell.");

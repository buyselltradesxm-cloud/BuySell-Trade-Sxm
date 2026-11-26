// Checks the launch ("app open") timing in native-admob.js with a fake AdMob plugin:
// shown once when ready inside [minLoadMs, coldWindowMs], never after a tap or after the window.
// Run: node scripts/app-open-check.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'native-admob.js'), 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function launch({ loadMs, tapAtMs }) {
  let shown = 0;
  const listeners = {};
  const doc = {
    readyState: 'complete', visibilityState: 'visible', hidden: false,
    documentElement: { classList: { add() {} } },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  };
  const AdMob = {
    addListener() {}, initialize: async () => {}, requestConsentInfo: async () => ({ canRequestAds: true }),
    showBanner: async () => {}, hideBanner: async () => {}, resumeBanner: async () => {}, removeBanner: async () => {},
    prepareInterstitial: async () => {}, showAppOpen: async () => { shown += 1; },
    loadAppOpen: () => wait(loadMs),
  };
  const win = {
    Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false, Plugins: {} },
    BSTAdMob: AdMob,
    AdsConfig: { admob: { testing: true, banner: { android: 'b' }, appOpen: { android: 'o' },
      appOpenOptions: { minLoadMs: 150, coldWindowMs: 600, resumeAfterMs: 30000, cooldownMs: 60000, maxPerSession: 6 } } },
    performance: { timeOrigin: Date.now() },
    addEventListener() {},
  };
  const context = Object.assign(win, {
    window: win, document: doc, setTimeout, clearTimeout, setInterval: () => 0, Date, Math, Promise, Number, String,
    MutationObserver: class { observe() {} },
  });
  vm.runInNewContext(source, context);
  if (tapAtMs != null) setTimeout(() => (listeners.pointerdown || []).forEach(fn => fn()), tapAtMs);
  await wait(900);
  return shown;
}

(async () => {
  assert.equal(await launch({ loadMs: 20 }), 1, 'fast ad: shown once after minLoadMs');
  assert.equal(await launch({ loadMs: 350 }), 1, 'ad ready after minLoadMs but inside the window: shown');
  assert.equal(await launch({ loadMs: 800 }), 0, 'ad ready after the window: not shown');
  assert.equal(await launch({ loadMs: 350, tapAtMs: 200 }), 0, 'user tapped before the ad was ready: not shown');
  console.log('app-open-check: 4 checks passed');
})().catch(e => { console.error(e.message); process.exit(1); });

// Isolated store fixtures: no accounts, network requests, or real purchases.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(platform = 'ios') {
  const calls = [], timers = new Map();
  let timerId = 0;
  const plugin = {
    products: async () => ({products: [{id: platform === 'ios' ? 'com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly' : 'pro_starter_monthly', price: '$9.99'}]}),
    addListener: async () => { calls.push('listen'); },
    pending: async () => ({transactions: []}),
    restore: async () => ({transactions: []}),
    purchase: async () => { calls.push('purchase'); return {signedTransaction: 'fixture', purchaseToken: 'fixture'}; },
    finish: async () => { calls.push('finish'); }
  };
  const context = {
    console, AbortController, TextEncoder, crypto: require('node:crypto').webcrypto,
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
    clearTimeout: id => timers.delete(id),
    document: {readyState: 'loading', documentElement: {lang: 'en'}, addEventListener() {}, querySelectorAll() { return []; }, getElementById() { return null; }},
    Capacitor: {getPlatform: () => platform, Plugins: {SXMNative: plugin, PlayBilling: plugin}},
    db: {auth: {getSession: async () => ({data: {session: {access_token: 'fixture', user: {id: 'fixture'}}}})}},
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'fixture',
    showToast: value => calls.push(value),
    fetch: async (_url, options) => {
      const action = JSON.parse(options.body).action;
      calls.push(action);
      return {ok: true, json: async () => action === 'prepare' ? {appAccountToken: 'fixture'} : {transactionId: 'fixture'}};
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('native-ios.js', 'utf8'), context);
  return {context, plugin, calls, timers};
}

(async () => {
  const listener = fixture();
  listener.plugin.addListener = async () => {
    listener.calls.push('listen');
    if (listener.calls.filter(value => value === 'listen').length === 1) throw new Error('Bridge temporarily unavailable');
  };
  await listener.context.SXM.sync();
  await listener.context.SXM.restore();
  assert.equal(listener.calls.filter(value => value === 'listen').length, 2, 'Retry transaction registration after a bridge failure');
  await listener.context.SXM.sync();
  assert.equal(listener.calls.filter(value => value === 'listen').length, 2, 'Keep only one successful transaction listener');
  console.log('PASS transaction listener recovery');

  for (const platform of ['ios', 'android']) for (const stalledAction of [platform === 'ios' ? 'prepare' : 'ready', 'verify']) {
    const test = fixture(platform);
    const originalFetch = test.context.fetch;
    let stalled = false;
    test.context.fetch = async (url, options) => {
      if (JSON.parse(options.body).action !== stalledAction) return originalFetch(url, options);
      stalled = true;
      assert.ok(options.signal, 'Purchase verification must have an abort signal');
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true}));
    };
    const attempt = test.context.SXM.buy('pro-starter');
    for (let step = 0; step < 30 && !stalled; step++) await new Promise(setImmediate);
    assert.ok(stalled, 'Reach the stalled request');
    const timeout = [...test.timers.values()].find(timer => timer.delay === 30000);
    assert.ok(timeout, 'Bound the request to 30 seconds');
    timeout.callback();
    assert.equal(await attempt, false);
    assert.ok(!test.calls.includes('finish'), 'An unverified purchase stays unfinished for recovery');
    if (stalledAction !== 'verify') assert.ok(!test.calls.includes('purchase'), 'No charge before preparation succeeds');
    assert.ok(test.calls.some(value => /restore purchases/i.test(value)), 'Explain how to recover');
    assert.equal(test.timers.size, 0, 'Clear request timers');
    test.context.fetch = originalFetch;
    assert.equal(await test.context.SXM.buy('pro-starter'), true, 'A failed request must release the purchase lock');
    assert.equal(test.timers.size, 0);
    console.log('PASS ' + platform + ' stalled ' + stalledAction + ' request, safe failure and retry');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

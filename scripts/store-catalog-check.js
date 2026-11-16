const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
let requests = 0;
const context = {
  console, setTimeout, clearTimeout,
  document: {readyState:'loading', documentElement:{lang:'en'}, addEventListener(){}, querySelectorAll(){return [];}, getElementById(){return null;}},
  Capacitor: {getPlatform:()=> 'ios', Plugins:{SXMNative:{products:async()=>{
    requests++;
    return {products: requests === 1 ? [] : [{id:'com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly',price:'$9.99'}]};
  }}}}
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('native-ios.js','utf8'),context);
(async()=>{
  await context.SXM.refreshPrices();
  await context.SXM.refreshPrices();
  assert.equal(requests,2,'An empty StoreKit response must be retried');
  await context.SXM.refreshPrices();
  assert.equal(requests,2,'A populated catalog should remain cached');
  console.log('PASS StoreKit empty catalog recovery and populated catalog caching');
})().catch(error=>{console.error(error);process.exitCode=1;});

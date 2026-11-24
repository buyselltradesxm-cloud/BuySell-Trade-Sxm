const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
function fixture(native = false, tcf = false) {
  let consent = false, callback;
  const scripts = [], events = {}, clicks = {};
  const context = {
    AdsConfig:{analytics:{ga4:'G-TEST123'}},
    location:{origin:'https://buyselltradesxm.com',pathname:'/app.html',search:'?code=SECRET&email=PRIVATE',hash:'#access_token=SECRET'},
    document:{documentElement:{lang:'en'},head:{appendChild:s=>scripts.push(s)},createElement:()=>({}),addEventListener:(name,fn)=>clicks[name]=fn},
    addEventListener:(name,fn)=>events[name]=fn,
    BstConsent:{granted:()=>consent},
    Capacitor:{isNativePlatform:()=>native}
  };
  if (tcf) context.__tcfapi = (_name,_version,fn)=>callback=fn;
  context.window = context;
  vm.runInNewContext(source, context);
  return {context,scripts,click:()=>clicks.click({target:{closest:selector=>selector==='a[data-store]'?{getAttribute:key=>key==='data-store'?'google_play':'download_page'}:null}}),consent:value=>{consent=value;events['bst:consent']();},tcf:data=>callback(data,true)};
}
const web = fixture();
assert.equal(web.scripts.length,0);
web.consent(true);
assert.equal(web.scripts.length,1);
web.click();
const events = web.context.dataLayer.filter(args=>args[0]==='event');
assert.deepEqual(Array.from(events,args=>args[1]),['page_view','app_download_page_view','app_store_click']);
assert(!JSON.stringify(web.context.dataLayer).match(/SECRET|PRIVATE|access_token|email=/));
web.consent(false); web.click();
assert.equal(web.context.dataLayer.filter(args=>args[0]==='event').length,3);
web.consent(true); assert.equal(web.scripts.length,1);
const native = fixture(true); native.consent(true); assert.equal(native.scripts.length,0);
const google = fixture(false,true); google.consent(true); assert.equal(google.scripts.length,0);
google.tcf({gdprApplies:true,purpose:{consents:{1:true,10:true}},vendor:{consents:{755:true}}});
assert.equal(google.scripts.length,1);
google.tcf({gdprApplies:true,purpose:{consents:{}},vendor:{consents:{}}});
const before = google.context.dataLayer.length; google.click(); assert.equal(google.context.dataLayer.length,before);
for (const file of ['app.html','app-fr.html']) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  assert(html.includes('data-store="google_play"'));
  assert.match(html, /data-store="app_store"[^>]*href="https:\/\/apps\.apple\.com\/app\/id6809964445"/);
  assert(html.includes('hreflang="en"') && html.includes('hreflang="fr"'));
}
for (const file of ['index.html','marketplace.html']) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html, /data-store="app_store"[^>]*href="https:\/\/apps\.apple\.com\/app\/id6809964445"/);
}
const links = JSON.parse(fs.readFileSync(path.join(root,'.well-known/assetlinks.json')));
assert.equal(links[0].target.package_name,'com.korekdigitalmarketing.buyselltradesxm');
assert.match(links[0].target.sha256_cert_fingerprints[0],/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
JSON.parse(fs.readFileSync(path.join(root,'.well-known/apple-app-site-association')));
(async()=>{
  const old = {Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',Plugins:{SXMNative:{requestReview:()=>Promise.reject(new Error('unimplemented'))}}}};
  old.window = old; vm.runInNewContext(fs.readFileSync(path.join(root,'app-review.js'),'utf8'),old);
  assert.equal(await old.BstReview.success(),false);
  old.Capacitor.Plugins.SXMNative.requestReview = ()=>Promise.resolve({requested:true});
  assert.equal(await old.BstReview.success(),true);
  console.log('App growth checks passed: consent grant/withdrawal, TCF, native exclusion, sanitized events, store links and older-app review fallback.');
})().catch(error=>{console.error(error);process.exit(1)});

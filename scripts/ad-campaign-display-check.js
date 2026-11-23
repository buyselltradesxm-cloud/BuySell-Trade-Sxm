const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();try{for(const lang of ['fr','en'])for(const width of [390,1280]){
const p=await b.newPage({viewport:{width,height:900}});await p.route('**/*',r=>r.request().url().endsWith('/ads/majesty-prices.jpeg')?r.fulfill({body:fs.readFileSync(path.resolve('ads/majesty-prices.jpeg')),contentType:'image/jpeg'}):r.fulfill({body:''}));
await p.goto('http://127.0.0.1/fixture');await p.setContent('<html lang="'+lang+'"><style>*{box-sizing:border-box}</style><body><section data-ad-placement="home-top"></section><section data-ad-placement="content-1"></section></body></html>');
await p.addScriptTag({path:path.resolve('ads-config.js')});await p.evaluate(()=>{AdsConfig.adsense.pageLevel=false;AdsConfig.analytics={};window.SB={enabled:()=>true,fetchAdCampaigns:()=>new Promise(resolve=>window.deliverCampaign=resolve)};});
await p.addScriptTag({path:path.resolve('ads.js')});assert.equal(await p.locator('[data-ad-placement=home-top]').getAttribute('data-ad-kind'),'network');
await p.evaluate(()=>deliverCampaign([{id:'majesty-car-rental',active:true,placements:['home-top'],weight:1,sponsor:'Majesty Car Rental',url:'https://wa.me/17215503417',image:'/ads/majesty-prices.jpeg',headline_fr:'Louez votre voiture à SXM',headline_en:'Rent your car in SXM',cta_fr:'Demander un devis sur WhatsApp',cta_en:'Get a quote on WhatsApp'}]));
await p.locator('.ad-campaign.ad-portrait').waitFor();assert.equal(await p.locator('[data-ad-placement=content-1]').getAttribute('data-ad-kind'),'network');assert.equal(await p.locator('.ad-campaign').getAttribute('href'),'https://wa.me/17215503417');
assert.equal(await p.locator('.ad-media').evaluate(el=>getComputedStyle(el).objectFit),'contain');assert.match(await p.locator('.ad-head').innerText(),lang==='fr'?/Louez/:/Rent/);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log(lang+' '+width+'px: async campaign priority, portrait image and WhatsApp link passed');await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});

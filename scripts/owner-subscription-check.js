const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch();try{
for(const file of ['index.html','marketplace.html'])for(const lang of ['en','fr']){
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.route('**/*',route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+u.pathname);return u.hostname==='127.0.0.1'&&f.startsWith(root+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile()?route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'}):route.fulfill({body:''});});
 await page.goto('http://127.0.0.1/'+file+'?local=1');
 const result=await page.evaluate(lang=>{
 state.lang=lang;
 const owner=normalizeUser({id:'owner-test',role:'admin',accountType:'business',accountPlan:'pro-unlimited',subscriptionStatus:'active',subscriptionStarted:'2026-11-02T00:00:00Z',subscriptionCurrentPeriodEnd:null});
 state.user=owner;
 const free=subscriptionDashboardHTML(owner,[]);
 const paid={...owner,subscriptionProvider:'stripe',stripeCustomerId:'customer-test',subscriptionCurrentPeriodEnd:'2099-01-02T00:00:00Z'};
 const paying=subscriptionDashboardHTML(paid,[]);
 return {free,paying,period:subscriptionPeriodEndFor(owner),paidPeriod:subscriptionPeriodEndFor(paid),limit:listingLimitFor(owner)===Infinity};
 },lang);
 assert.equal(result.period,null);assert.equal(result.paidPeriod,'2099-01-02T00:00:00Z');assert.equal(result.limit,true);
 assert.match(result.free,lang==='fr'?/Offert — aucun paiement/:/Complimentary — no payment/);
 assert.match(result.free,lang==='fr'?/Sans expiration/:/No expiration/);
 assert.doesNotMatch(result.free,/199|manageSubscription|closeProfileModalThenPricing|Renewal|Renouvellement/);
 assert.match(result.paying,/199/);assert.match(result.paying,/manageSubscription/);
 await page.evaluate(()=>{renderProfile();openModal('profileModal');});
 if(file==='index.html'&&lang==='fr')await page.locator('#profileModal').screenshot({path:path.join(root,'scripts/artifacts/owner-unlimited-profile.png')});
 console.log(file+' '+lang+': complimentary owner display and paid subscription preserved');await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

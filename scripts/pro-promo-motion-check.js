const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const width of [390,1280])for(const lang of ['en','fr'])for(const reducedMotion of ['no-preference','reduce']){
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion});
   await page.route('**/*',r=>r.fulfill({body:''}));
   await page.goto('http://127.0.0.1/motion-test');
   await page.setContent('<html lang="'+lang+'"><body style="margin:18px;background:#fbf7ef"><section class="content-ad" data-ad-placement="content-1"></section></body></html>');
   await page.addScriptTag({path:path.resolve('ads-config.js')});
   await page.evaluate(()=>{AdsConfig.adsense={};AdsConfig.analytics={};AdsConfig.campaigns=[];AdsConfig.house.promos=AdsConfig.house.promos.filter(p=>p.id==='pro');window.openPricingInfo=()=>window.planOpened=true;});
   await page.addScriptTag({path:path.resolve('ads.js')});
   const promo=page.locator('.ad-house-pro');await promo.waitFor();
   assert.match(await promo.innerText(),lang==='fr'?/Passez en compte Pro/:/Go Pro for your business/);
   const motion=await promo.evaluate(el=>({animations:el.getAnimations({subtree:true}).map(a=>a.effect.getComputedTiming().endTime),light:getComputedStyle(el,'::before').animationName,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(motion.overflow,false);
   if(reducedMotion==='reduce'){assert.equal(motion.animations.length,0);assert.equal(motion.light,'none');}
   else{assert.ok(motion.animations.length>=5);assert.ok(motion.animations.every(end=>end<=4000));await promo.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));}
   await promo.click();assert.equal(await page.evaluate(()=>window.planOpened),true);
   console.log(width+'px '+lang+' '+reducedMotion+': finite animation, readable layout and Pro action passed');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{for(const route of ['/','/marketplace.html']){const page=await browser.newPage();await page.goto('http://127.0.0.1:5173'+route+'?local=1');const checks=await page.evaluate(async()=>{
const now=Date.now();const user=normalizeUser({id:'trial-test',accountType:'business',accountPlan:'pro-trial',subscriptionStatus:'active',subscriptionCurrentPeriodEnd:new Date(now+45*86400000).toISOString(),proTrialStartedAt:new Date(now).toISOString()});
const valid=proTrialActive(user),limit=listingLimitFor(user);const text=proTrialOfferHTML(user);const expired={...user,subscriptionCurrentPeriodEnd:new Date(now-1).toISOString()};
state.user=normalizeUser({id:'trial-test',accountType:'personal',provider:'supabase'});window.SB={enabled:()=>true,upsertProfile:async()=>null};await activateProTrial();
return {valid,limit,noCard:/No card|Aucune carte/.test(text),expired:proTrialActive(expired),noRepeat:proTrialOfferHTML(expired)==='',failClosed:state.user.accountType==='personal'};
});assert.deepEqual(checks,{valid:true,limit:20,noCard:true,expired:false,noRepeat:true,failClosed:true});console.log(route+': 45-day display, 20-offer quota, expiry, no repeat offer and failed activation passed');await page.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

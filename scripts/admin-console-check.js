const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
(async()=>{const browser=await chromium.launch();try{
 for(const file of ['index.html','marketplace.html'])for(const lang of ['fr','en'])for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('bst_consent','denied'));
  await page.route('**/*',route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+u.pathname);if(u.hostname==='127.0.0.1'&&f.startsWith(root+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({body:fs.readFileSync(f),contentType:mime[path.extname(f)]||'application/octet-stream'});return route.fulfill({body:''});});
  await page.goto('http://127.0.0.1/'+file+'?local=1');
  await page.evaluate(async lang=>{
   setLang(lang);state.user=normalizeUser({id:'ab4ea321-1f75-4466-899e-9858bd23c111',name:'Owner',email:'owner@example.invalid',provider:'supabase',role:'admin',accountType:'business',accountPlan:'pro-unlimited',subscriptionStatus:'active'});
   L.splice(0,L.length);adminProfiles=[];window.serverSettings={notice_enabled:false,notice_fr:'',notice_en:'',posting_paused:false,revision:0};window.savedCalls=0;window.saveMode='ok';
   window.fixtureSnapshot=()=>({checked_at:'2026-11-23T15:00:00Z',settings:{...serverSettings},stats:{users:23,active:17,pending:2,reports:3,photos:46},health:{failing_jobs:[],emails_failed_24h:0,emails_stuck_pending:0,stripe_events_failed_24h:0},activity:[{id:1,action:'console_settings_saved',actor:'<img src=x onerror=alert(1)>',created_at:'2026-11-23T15:00:00Z'}]});
   window.db={rpc:async(name,args)=>{
    if(name==='admin_console_snapshot'){if(window.delaySnapshot)return await new Promise(resolve=>window.resolveSnapshot=resolve);return window.snapshotError?{error:{message:'offline'}}:{data:fixtureSnapshot()};}
    if(name==='public_console_settings')return {data:serverSettings};
    if(name==='admin_console_save_settings'){savedCalls++;if(saveMode==='conflict')return {error:{code:'40001'}};if(saveMode==='offline')throw new Error('offline');serverSettings={...args.payload,revision:serverSettings.revision+1};return {data:serverSettings};}
   }};
   window.SB={enabled:()=>true,fetchReports:async()=>[],fetchBannedUsers:async()=>[],fetchProfiles:async()=>[],fetchAdminSettings:async()=>({}),fetchModerationRules:async()=>({}),fetchAdCampaigns:async()=>[],fetchDailyCounts:async()=>[],fetchSiteStats:async()=>({days:[],errors:[]}),fetchListings:async()=>[{id:'private-pending',t:'Pending private fixture',sellerId:'fixture-seller',ownerId:'fixture-seller',cat:'elec',area:'Marigot',cur:'usd',usd:10,photos:[],moderationStatus:'pending'}]};
   await openAdmin();
  },lang);
  await page.locator('.ac-workspace').waitFor();assert.equal(await page.locator('.ac-nav').count(),13);
  assert.match(await page.locator('.ac-metrics').innerText(),/23/);
  assert.equal(await page.evaluate(()=>L.some(l=>l.id==='private-pending')),false,'Private moderation records must stay out of public listings');
  assert.equal(await page.locator('.ac-activity img').count(),0,'Activity actor must be escaped');
  if(file==='index.html')await page.screenshot({path:path.join(root,'scripts/artifacts/admin-console-'+lang+'-'+width+'.png')});
  const tabs=['overview','listings','moderation','reports','users','ads','boosts','categories','settings','system','activity','stats','guide'];
  for(let i=0;i<13;i++){
   if(width<701)await page.locator('.ac-mobile-menu select').selectOption(tabs[i]);else await page.locator('.ac-nav').nth(i).click();
   assert.ok((await page.locator('.ac-content').innerText()).trim().length>0);
   if(i===2)assert.match(await page.locator('.ac-content').innerText(),/Pending private fixture/);
   if(i===1){await page.locator('#adminListingResults').waitFor();await page.locator('.admin-search').fill('Pending private fixture');assert.match(await page.locator('#adminListingResults').innerText(),/Pending private fixture/);}
   assert.equal(await page.locator('.ac-main').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Admin tab must fit the viewport');
  }
  await page.evaluate(async()=>{SB.setListingModerationStatus=async()=>false;await setModerationStatusAdmin('private-pending','approved');if(findAdminListing('private-pending').moderationStatus!=='pending')throw new Error('Failed moderation changed private state');SB.setListingModerationStatus=async()=>true;await setModerationStatusAdmin('private-pending','approved');if(!L.some(l=>l.id==='private-pending'))throw new Error('Approved listing missing from public cache');await setModerationStatusAdmin('private-pending','rejected');if(L.some(l=>l.id==='private-pending'))throw new Error('Rejected listing leaked into public cache');});
  if(width<701)await page.locator('.ac-mobile-menu select').selectOption('settings');else await page.locator('.ac-nav').nth(8).click();
  await page.locator('[name=notice_enabled]').check();await page.locator('[name=notice_fr]').fill('<script>message</script>');await page.locator('[name=notice_en]').fill('Our public message');
  await page.locator('#adminConsoleSettings [type=submit]').click();
  await page.waitForFunction(()=>savedCalls===1&&serverSettings.notice_enabled);
  assert.match(await page.locator('#adminConsoleSaveStatus').innerText(),lang==='fr'?/enregistrés/:/saved/);
  assert.equal(await page.locator('#siteConsoleNotice script').count(),0);
  await page.evaluate(()=>saveMode='conflict');await page.locator('[name=notice_fr]').fill('Keep this unsaved message');
  await page.locator('#adminConsoleSettings [type=submit]').click();await page.waitForFunction(()=>savedCalls===2);
  assert.equal(await page.locator('[name=notice_fr]').getAttribute('maxlength'),'280');
  assert.equal(await page.locator('[name=notice_fr]').evaluate(el=>el.value),'Keep this unsaved message');
  assert.match(await page.locator('#adminConsoleSaveStatus').innerText(),lang==='fr'?/autre administrateur/:/Another admin/);
  await page.evaluate(()=>saveMode='offline');await page.locator('#adminConsoleSettings [type=submit]').click();await page.waitForFunction(()=>savedCalls===3);
  assert.match(await page.locator('#adminConsoleSaveStatus').innerText(),lang==='fr'?/interrompue/:/interrupted/);
  await page.evaluate(()=>{clearAccountMessaging();state.user=normalizeUser({id:'ordinary-user',provider:'supabase',role:'user'});renderAdmin('overview');});
  assert.equal(await page.locator('#adminBody').innerText(),'');assert.equal(await page.locator('#adminModal').isVisible(),false);
  await page.evaluate(async()=>{state.user=normalizeUser({id:'old-admin',provider:'supabase',role:'admin'});delaySnapshot=true;window.pendingSnapshot=AdminConsole.load();state.user=normalizeUser({id:'new-user',provider:'supabase',role:'user'});AdminConsole.clear();resolveSnapshot({data:fixtureSnapshot()});await pendingSnapshot;renderAdmin('overview');});
  assert.equal(await page.locator('#adminBody').innerText(),'');
  await page.evaluate(async()=>{state.user=normalizeUser({id:'fixture-admin',provider:'supabase',role:'admin'});snapshotError=true;delaySnapshot=false;await AdminConsole.load();renderAdmin('overview');openModal('adminModal');});
  assert.equal(await page.locator('.ac-error').count()>0,true);
  assert.doesNotMatch(await page.locator('.ac-metrics').innerText(),/23|17/);
  assert.deepEqual(errors,[]);console.log(file+' '+lang+' '+width+'px: tabs, server metrics, escaped activity, settings success/conflict/offline, account cleanup and stale reads passed');
  await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

// Exercise real visible controls against isolated fixtures; no subscriptions or messages sent.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const file of ['index.html','marketplace.html'])for(const lang of ['en','fr'])for(const width of [320,390,768,1280]){
   const page=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url()),local=path.resolve(root,'.'+url.pathname);
    if(url.hostname==='127.0.0.1'&&local.startsWith(root+path.sep)&&fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({body:fs.readFileSync(local),contentType:types[path.extname(local)]||'application/octet-stream'});
    return route.fulfill({body:''});
   });
   await page.addInitScript(()=>localStorage.setItem('bst_consent','denied'));
   await page.goto('http://127.0.0.1/'+file+'?local=1');
   await page.evaluate(lang=>{
    setLang(lang);state.user=normalizeUser({id:'a1000000-0000-4000-8000-000000000001',name:'QA',provider:'supabase'});
    notifications=[];window.mockPushStatus='ready';window.pushWrites=0;
    window.Push={supported:()=>true,status:async()=>mockPushStatus,
      enable:async()=>{pushWrites++;mockPushStatus='on';return {ok:true};},disable:async()=>{pushWrites++;mockPushStatus='ready';return {ok:true};}};
   },lang);
   const trigger=page.locator('[data-click="toggleNotifPanel"]:visible').first();
   await trigger.click();await page.locator('#pushControl:not([hidden])').waitFor();
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('.notif-clear').isVisible(),false,'Empty activity has no clear action');
   assert.match(await page.locator('.notif-empty b').innerText(),lang==='fr'?/à jour/:/caught up/);
   assert.equal(await page.locator('#notifPanel').getAttribute('role'),'region');
   const box=await page.locator('#notifPanel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844);
   if(file==='index.html'&&width===390){
    fs.mkdirSync(path.join(root,'scripts/artifacts'),{recursive:true});
    await page.locator('#notifPanel').screenshot({path:path.join(root,'scripts/artifacts/notifications-redesign-'+lang+'.png')});
   }
   assert.equal(await page.locator('#pushToggle').getAttribute('role'),'switch');
   assert.equal(await page.locator('#pushToggle').getAttribute('aria-checked'),'false');
   await page.locator('#pushToggle').click();await page.waitForFunction(()=>pushWrites===1&&document.querySelector('#pushToggle').classList.contains('is-on'));
   assert.equal(await page.locator('#pushToggle').getAttribute('aria-checked'),'true');
   await page.locator('#pushToggle').click();await page.waitForFunction(()=>pushWrites===2&&!document.querySelector('#pushToggle').classList.contains('is-on'));
   assert.equal(await page.locator('#pushToggle').getAttribute('aria-checked'),'false');
   await page.evaluate(async()=>{mockPushStatus='denied';await refreshPushControl();});assert.equal(await page.locator('#pushToggle').isDisabled(),true);
   await page.evaluate(async()=>{mockPushStatus='ready';await refreshPushControl();});
   await page.locator('.notif-close').click();assert.equal(await page.locator('#notifPanel').isVisible(),false);
   assert.equal(await page.locator('[data-click="toggleNotifPanel"][aria-expanded="true"]').count(),0);
   assert.equal(await trigger.evaluate(node=>document.activeElement===node),true);
   await page.evaluate(()=>{notifications=[{id:'qa-message',kind:'message',title:'Message from Léa',text:'Is the apartment still available?',at:new Date().toISOString(),seen:false}];});
   await trigger.click();assert.equal(await page.locator('.notif-clear').isVisible(),true);assert.equal(await page.locator('.notif-open img').getAttribute('src'),'icons/market/mail.svg');
   await page.locator('.notif-clear').click();assert.equal(await page.locator('.notif-empty').isVisible(),true);
   await page.evaluate(()=>{notifications=Array.from({length:30},(_,i)=>({id:'note-'+i,title:'A longer listing update '+i,text:'<script>Untrusted text</script>',kind:'generic',at:new Date().toISOString(),seen:false}));renderNotifPanel();});
   assert.equal(await page.locator('#notifList script').count(),0);
   assert.equal(await page.locator('.notif-panel-body').evaluate(node=>node.scrollHeight>node.clientHeight),true,'Long activity scrolls within the panel');
   await page.locator('.toast.show').waitFor({state:'hidden'});
   await page.locator('.search-alert-entry button').click();await page.locator('#searchAlertsModal.open').waitFor();
   await page.keyboard.press('Escape');
   await trigger.click();await page.keyboard.press('Escape');assert.equal(await page.locator('#notifPanel').isVisible(),false);
   assert.equal(await trigger.evaluate(node=>document.activeElement===node),true);
   assert.equal(await page.locator('[data-click="toggleNotifPanel"][aria-expanded="true"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);console.log(file+' '+lang+' '+width+'px: notification activity, preferences, permission states, scrolling and keyboard passed.');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

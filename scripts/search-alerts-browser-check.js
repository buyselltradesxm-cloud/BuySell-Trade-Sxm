// Local fixtures only; block external requests and never send emails.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),owner='a1000000-0000-4000-8000-000000000001';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
(async()=>{
  const browser=await chromium.launch();
  try{
    for(const file of ['index.html','marketplace.html'])for(const lang of ['en','fr']){
      const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{
        const url=new URL(route.request().url()),local=path.resolve(root,'.'+url.pathname);
        if(url.hostname==='127.0.0.1'&&local.startsWith(root+path.sep)&&fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({body:fs.readFileSync(local),contentType:types[path.extname(local)]||'application/octet-stream'});
        return route.fulfill({body:''});
      });
      await page.goto('http://127.0.0.1/'+file+'?local=1');
      await page.evaluate(({owner,lang})=>{
        setLang(lang);state.user=null;openSearchAlerts();
        if(pendingAuthAction!=='search-alerts')throw new Error('Sign-in continuation missing');
        state.user=normalizeUser({id:owner,name:'QA',provider:'supabase'});
        window.alertRows=[];window.alertCalls=[];window.failAlertSave=false;
        SB.enabled=()=>true;
        window.db={};
        db.from=()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:async()=>({data:structuredClone(alertRows),error:null})};return q;};
        db.rpc=async(name,args)=>{
          alertCalls.push([name,args]);
          if(failAlertSave)return {error:{message:'Offline'}};
          if(name==='delete_search_alert'){alertRows=alertRows.filter(r=>r.id!==args.alert_id);return {data:true};}
          const row={...args.criteria,id:args.alert_id||'alert-'+alertCalls.length,email_enabled:args.consent};
          const index=alertRows.findIndex(r=>r.id===row.id);if(index<0)alertRows.push(row);else alertRows[index]=row;
          return {data:row};
        };
        completeAuth();
      },{owner,lang});
      await page.locator('#searchAlertsModal.open').waitFor();
      await assert.doesNotReject(()=>page.waitForFunction(()=>document.querySelector('#searchAlertsStatus').textContent===''));
      assert.equal(await page.locator('#alertEmail').isChecked(),false,'Opt-in is unchecked');
      await page.selectOption('#alertCategory','immo');await page.selectOption('#alertSubcategory','rent-apartment');await page.selectOption('#alertArea','Marigot');
      await page.fill('#alertMax','900');await page.check('#alertEmail');await page.click('#searchAlertSave');
      await page.waitForFunction(()=>alertCalls.length===1&&document.querySelector('#searchAlertForm').getAttribute('aria-busy')==='false');
      assert.equal(await page.evaluate(()=>alertCalls[0][1].criteria.max_price),900);
      assert.equal(await page.evaluate(()=>alertCalls[0][1].consent),true);
      assert.equal(await page.locator('#searchAlertsList li').count(),1);
      await page.fill('#alertMin','1000');await page.click('#searchAlertSave');
      assert.equal(await page.evaluate(()=>alertCalls.length),1,'Invalid range makes no request');
      assert.equal(await page.locator('#alertMax').getAttribute('aria-invalid'),'true');
      await page.fill('#alertMin','');await page.evaluate(()=>{failAlertSave=true;});await page.fill('#alertKeywords','<script>private</script>');await page.click('#searchAlertSave');
      assert.match(await page.locator('#searchAlertsStatus').innerText(),lang==='fr'?/non confirmé/:/not confirmed/);
      assert.equal(await page.locator('#alertKeywords').inputValue(),'<script>private</script>','Preserve failed draft');
      await page.evaluate(()=>{failAlertSave=false;});await page.uncheck('#alertEmail');await page.click('#searchAlertSave');
      await page.waitForFunction(()=>document.querySelector('#searchAlertForm').getAttribute('aria-busy')==='false');
      assert.equal(await page.evaluate(()=>alertRows[0].email_enabled),false,'Pause without deleting the search');
      assert.equal(await page.locator('#searchAlertsList script').count(),0,'Escape alert content');
      await page.selectOption('#alertCategory','immo');await page.locator('#alertSubcategory').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
      // Reopen because Escape follows the app modal behavior on Chromium.
      if(!await page.locator('#searchAlertsModal.open').count())await page.evaluate(()=>openSearchAlerts());
      await page.waitForFunction(()=>document.querySelector('#searchAlertsStatus').textContent==='');
      await page.screenshot({path:path.join(root,'scripts/artifacts/search-alerts-'+file+'-'+lang+'.png')});
      assert.equal(await page.locator('#searchAlertsModal .dialog').evaluate(x=>x.getBoundingClientRect().width<=innerWidth),true);
      await page.locator('[data-alert-remove]').click();await page.waitForFunction(()=>alertRows.length===0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.evaluate(()=>clearAccountMessaging());
      assert.equal(await page.locator('#searchAlertsModal.open').count(),0,'Logout closes private alert UI');
      assert.equal(await page.locator('#searchAlertsModal').innerText(),'','Logout removes private search content');
      // An old result cannot overwrite a newly reopened dialog for the same account.
      await page.evaluate(async()=>{
        let finish;let count=0;
        db.from=()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>++count===1?new Promise(r=>finish=r):Promise.resolve({data:[]})};return q;};
        const old=openSearchAlerts();await Promise.resolve();
        await openSearchAlerts();finish({data:[{id:'stale',category:'immo',keywords:'Old private search'}]});await old;
      });
      assert.equal(await page.locator('#searchAlertsList').innerText().then(s=>s.includes('Old private search')),false);
      await page.keyboard.press('Escape');
      await page.locator('.market-bell').click();await page.locator('.search-alert-entry button').click();
      await page.locator('#searchAlertsModal.open').waitFor();await page.keyboard.press('Escape');
      assert.equal(await page.locator('.market-bell').evaluate(node=>document.activeElement===node),true,'Return keyboard focus to the visible bell');
      await page.setViewportSize({width:768,height:1024});
      await page.locator('.market-bell').click();await page.locator('.search-alert-entry button').click();
      await page.locator('#searchAlertsModal.open').waitFor();await page.keyboard.press('Escape');
      assert.deepEqual(errors,[]);console.log(file+' '+lang+': opt-in, sign-in, CRUD, budgets, offline, escaping, mobile and session races passed.');
      await page.close();
    }
    const unsub=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});let writes=0;
    await unsub.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/rest/v1/rpc/unsubscribe_search_digests'){writes++;return route.fulfill({contentType:'application/json',body:'true'});}
      const local=path.resolve(root,'.'+url.pathname);
      if(url.hostname==='127.0.0.1'&&local.startsWith(root+path.sep)&&fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({body:fs.readFileSync(local),contentType:types[path.extname(local)]||'application/octet-stream'});
      return route.fulfill({body:''});
    });
    await unsub.goto('http://127.0.0.1/search-unsubscribe.html?token='+owner);
    assert.equal(writes,0,'Unsubscribe GET must not write');assert.ok(!unsub.url().includes('token='),'Private token removed from address');
    await unsub.click('#unsubscribeSearch');await unsub.waitForFunction(()=>document.querySelector('#unsubscribeSearch').hidden);
    assert.equal(writes,1);assert.match(await unsub.locator('#unsubscribeStatus').innerText(),/Search emails stopped/);
    await unsub.goto('http://127.0.0.1/search-unsubscribe.html?token=invalid');assert.equal(await unsub.locator('#unsubscribeSearch').isDisabled(),true);
    assert.equal(writes,1);await unsub.close();console.log('Unsubscribe page: explicit consent, private URL removal, success and invalid-link checks passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

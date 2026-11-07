// Browser fixtures run without a listening server or external account access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
(async()=>{
  const browser=await chromium.launch();
  try {
    for(const filename of ['index.html','marketplace.html']) {
      for(const native of [true,false]) {
        const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/*',async route=>{
          const url=new URL(route.request().url());
          if(['/admob-plugin.js','/native-admob.js'].includes(url.pathname)) return route.fulfill({contentType:'text/javascript',body:''});
          if(url.hostname!=='127.0.0.1') return route.fulfill({status:200,body:''});
          const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
          if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) return route.fulfill({status:404,body:''});
          const body=fs.readFileSync(file);
          await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body});
        });
        await page.addInitScript(native=>{
          window.calls=[];
          window.SXMNativeInfo={shell:native?5:4,tabs:true,nativeWorkflows:native};
          window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,Plugins:{SXMNative:{
            ready:async()=>({}),setTabs:async data=>{calls.push(['tabs',data]);},
            openWorkflow:async data=>{calls.push(['workflow',data]);},
            workflowIdentity:async()=>{},products:async()=>({products:[]}),pending:async()=>({transactions:[]}),addListener:async()=>({})
          }}};
        },native);
        await page.goto('http://127.0.0.1/'+filename+'?local=1');
        await page.evaluate(()=>{state.user=normalizeUser({id:'11111111-1111-4111-8111-111111111111',provider:'supabase',accountType:'personal',name:'QA'});});
        await page.evaluate(()=>openPostModal());
        assert.equal(await page.locator('#postModal.open').count(),native?0:1,JSON.stringify(await page.evaluate(()=>({shell:window.SXM?.shell(),user:state.user?.accountType,calls:window.calls,api:!!window.SXM})))+' '+errors.join(';'));
        if(native) {
          assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='workflow').pop()[1].tab),'post');
          assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='tabs').pop()[1].selected),'post');
        }
        // Subscribed businesses get the same Studio Pro as on the website, in the app too.
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='browse';window.dispatchEvent(e);calls.length=0;
          state.user=normalizeUser({id:'22222222-2222-4222-8222-222222222222',provider:'supabase',accountType:'business',name:'Pro',
            accountPlan:'pro-business',subscriptionStatus:'active',subscriptionCurrentPeriodEnd:'2099-01-01'});openPostModal();});
        assert.equal(await page.locator('#proStudioModal.open').count(),1,'Pro account opens the Studio');
        assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='workflow').length),0,'Pro account skips the native form');
        await page.waitForFunction(()=>calls.filter(c=>c[0]==='tabs').pop()?.[1].selected==='post',null,{timeout:3000}); // Studio keeps the Post tab lit
        await page.evaluate(()=>{closeModal('proStudioModal');state.user=normalizeUser({id:'11111111-1111-4111-8111-111111111111',provider:'supabase',accountType:'personal',name:'QA'});});
        await page.evaluate(()=>{document.querySelectorAll('.modal.open').forEach(m=>closeModal(m.id));SB.fetchInbox=async()=>[];});
        await page.evaluate(()=>openMessages());
        assert.equal(await page.locator('#messagesModal.open').count(),native?0:1);
        if(native) {
          assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='workflow').pop()[1].tab),'messages');
          await page.evaluate(()=>{const e=new Event('sxmContact');e.id='42';window.dispatchEvent(e);});
          assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='workflow').pop()[1].listingId),'42');
          await page.evaluate(()=>{state.user=null;const e=new Event('sxmContact');e.id='84';window.dispatchEvent(e);});
          assert.equal(await page.evaluate(()=>pendingAuthAction),'native-contact:84');
          await page.evaluate(()=>{state.user=normalizeUser({id:'11111111-1111-4111-8111-111111111111',provider:'supabase',accountType:'personal',name:'QA'});completeAuth();});
          assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='workflow').pop()[1].listingId),'84','Seller contact survives sign-in');
        }
        await page.evaluate(()=>{setLang('en');});
        assert.equal(await page.locator('.pricing-legal a[data-apple-only]').getAttribute('href'),'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
        await page.evaluate(()=>{state.user=null;const e=new Event('sxmTab');e.tab='post';window.dispatchEvent(e);});
        assert.equal(await page.locator('#accountModal.open').count(),1,'Signed-out posting still uses existing sign-in');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='browse';window.dispatchEvent(e);});
        assert.equal(await page.locator('#accountModal.open').count(),0);
        assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='tabs').pop()[1].selected),'browse');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='saved';window.dispatchEvent(e);});
        assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='tabs').pop()[1].selected),'saved');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='messages';window.dispatchEvent(e);});
        assert.equal(await page.locator('#accountModal.open').count(),1,'Signed-out messages require sign-in');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='profile';window.dispatchEvent(e);});
        assert.equal(await page.locator('#accountModal.open').count(),1,'Signed-out profile requires sign-in');
        await page.evaluate(()=>{state.user=normalizeUser({id:'11111111-1111-4111-8111-111111111111',provider:'supabase',accountType:'personal',name:'QA'});completeAuth();});
        assert.equal(await page.locator('#profileModal.open').count(),1,'Profile opens after sign-in');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='alerts';window.dispatchEvent(e);});
        assert.equal(await page.locator('#notifPanel').evaluate(el=>el.hidden),false,'Alerts panel opens');
        assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='tabs').pop()[1].selected),'alerts');
        await page.evaluate(()=>{const e=new Event('sxmTab');e.tab='browse';window.dispatchEvent(e);});
        assert.equal(await page.locator('#notifPanel').evaluate(el=>el.hidden),true,'Returning to Browse closes alerts');
        assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='tabs').pop()[1].selected),'browse');
        assert.deepEqual(errors,[]);
        console.log(filename+': '+(native?'native workflows':'legacy web workflows')+' entry points, sign-in, contact and tab state passed.');
        await page.close();
      }
      for(const width of [320,390,1280]) {
        const page=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});
        await page.route('**/*',async route=>{
          const url=new URL(route.request().url());const file=path.resolve(root,'.'+url.pathname);
          if(url.hostname==='127.0.0.1'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()) return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
          return route.fulfill({body:''});
        });
        await page.goto('http://127.0.0.1/'+filename+'?local=1');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.evaluate(()=>{setLang('en');resetFilters();filterByCategory('elec');scrollFavs();});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        fs.mkdirSync(path.join(root,'scripts/artifacts'),{recursive:true});
        await page.screenshot({path:path.join(root,'scripts/artifacts',filename.replace('.html','')+'-'+width+'.png')});
        console.log(filename+': '+width+'px layout and reduced-motion controls passed.');
        await page.close();
      }
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

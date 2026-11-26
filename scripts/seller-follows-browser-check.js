// Local fixtures only: "Suivre" button on a listing + "Vendeurs suivis" list. No network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const me='a1000000-0000-4000-8000-000000000001',seller='b2000000-0000-4000-8000-000000000002';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
(async()=>{
  const browser=await chromium.launch();
  try{
    for(const file of ['index.html','marketplace.html']){
      const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{
        const url=new URL(route.request().url()),local=path.resolve(root,'.'+url.pathname);
        if(url.hostname==='127.0.0.1'&&local.startsWith(root+path.sep)&&fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({body:fs.readFileSync(local),contentType:types[path.extname(local)]||'application/octet-stream'});
        return route.fulfill({body:''});
      });
      await page.goto('http://127.0.0.1/'+file+'?local=1');
      await page.evaluate(({me,seller})=>{
        setLang('fr');state.user=null;
        L.unshift({...L[0],id:9901,sellerId:seller,ownerId:seller,sellerName:'Garage <b>Test</b>',desc:'Ligne\n'.repeat(12)+'Fin de la description.'});
        window.rows=[];window.calls=[];
        SB.enabled=()=>true;window.db={auth:{getUser:async()=>({data:{user:{id:me}},error:null}),getSession:async()=>({data:{session:null},error:null})}};
        // Any query chain is awaitable; only seller_follows returns data.
        db.from=table=>{let result={data:[],error:null};
          const q=new Proxy({},{get:(_,k)=>{
            if(k==='then')return (ok,bad)=>Promise.resolve(result).then(ok,bad);
            if(table==='seller_follows'&&k==='select')result={data:rows.map(seller_id=>({seller_id})),error:null};
            if(table==='seller_follows'&&k==='insert')return row=>{calls.push(['insert',row]);rows.push(row.seller_id);return q;};
            if(table==='seller_follows'&&k==='delete')return ()=>{calls.push(['delete']);rows=[];return q;};
            return ()=>q;}});
          return q;};
        db.rpc=async name=>{calls.push([name]);return {data:rows.map(id=>({seller_id:id,seller_name:'Garage <b>Test</b>',active_listings:1})),error:null};};
        openListing(9901,false);
        window.__me=me;
      },{me,seller});
      // Listing page order: seller card, key information, description with "Voir plus".
      const order=await page.evaluate(()=>[...document.querySelectorAll('#detailBody .ld-seller,#detailBody .ld-section')].map(n=>n.className));
      assert.ok(order[0].includes('ld-seller')&&order.some(c=>c.includes('ld-desc')),'Seller card first, description present: '+order);
      assert.match(await page.locator('#detailBody .ld-keys').innerText(),/État[\s\S]*Très bon état/);
      assert.equal(await page.locator('#detailBody .ld-seller-text b').innerText(),'Garage <b>Test</b>','Seller name escaped in card');
      const more=page.locator('#detailBody .ld-more');
      if(await more.count()){await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');}
      const btn=page.locator('#detailBody [data-follow-seller]');
      assert.equal(await btn.innerText(),'Suivre');
      await btn.click();
      assert.equal(await page.evaluate(()=>pendingAuthAction),'follow:'+seller,'Logged-out click asks to sign in, then follows');
      await page.evaluate(()=>{state.user=normalizeUser({id:__me,name:'QA',provider:'supabase'});completeAuth();});
      await page.waitForFunction(()=>calls.some(c=>c[0]==='insert'));
      assert.deepEqual(await page.evaluate(()=>calls.find(c=>c[0]==='insert')[1]),{follower_id:me,seller_id:seller});
      await page.evaluate(()=>openListing(9901,false));
      await page.waitForFunction(()=>document.querySelector('#detailBody [data-follow-seller]')?.getAttribute('aria-pressed')==='true');
      await btn.click();
      await page.waitForFunction(()=>calls.some(c=>c[0]==='delete')&&document.querySelector('#detailBody [data-follow-seller]').getAttribute('aria-pressed')==='false');
      await btn.click();
      await page.waitForFunction(()=>calls.filter(c=>c[0]==='insert').length===2);
      // Native app bridge: read, toggle off, toggle on, own listing.
      const native=await page.evaluate(async({me,seller})=>{
        SB.currentUser=async()=>({id:me});
        const ask=(sellerId,change)=>SXMNativeWorkflows.request('follow',{sellerId,change,userId:me});
        return [await ask(seller,false),await ask(seller,true),await ask(seller,false),await ask(seller,true),await ask(me,false),await ask('bad',false)];
      },{me,seller});
      assert.deepEqual(native.slice(0,5).map(r=>r.data),[{following:true,own:false},{following:false,own:false},{following:false,own:false},{following:true,own:false},{following:false,own:true}]);
      assert.equal(native[5].ok,false,'Invalid seller id refused');
      // Own listing: no button.
      await page.evaluate(()=>{L.unshift({...L[0],id:9902,sellerId:__me,ownerId:__me});openListing(9902,false);});
      assert.equal(await page.locator('#detailBody [data-follow-seller]').count(),0,'No follow button on own listing');
      assert.equal(await page.locator('#detailBody .ld-owner .owner-btn').count(),3,'Owner manages the listing');
      assert.equal(await page.locator('#detailBody .chat-box').count(),0,'No buyer chat on own listing');
      await page.evaluate(()=>{closeModal('detailModal');openFollowedSellers();});
      await page.locator('#followedSellersModal.open #followedSellersList b').waitFor();
      assert.equal(await page.locator('#followedSellersList b').innerText(),'Garage <b>Test</b>','Seller name is escaped');
      assert.equal(await page.locator('#followedSellersList [data-follow-seller]').getAttribute('aria-pressed'),'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#followedSellersModal.open').count(),0);
      assert.deepEqual(errors,[],file+' page errors');
      await page.close();
    }
    console.log('Seller follows browser check passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

// "Publier une annonce": nothing is preselected, and the form lists everything still missing.
// Local fixtures only (serve the repo on 127.0.0.1:5173). No listing is published.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch();
  try{
    for(const file of ['','marketplace.html']){
      const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.fulfill({body:''}));
      await page.goto('http://127.0.0.1:5173/'+file+'?local=1');
      await page.evaluate(()=>{setLang('fr');state.user=normalizeUser({id:'a1000000-0000-4000-8000-000000000001',name:'QA',provider:'local'});openPostModal();});
      assert.equal(await page.inputValue('#newCat'),'','No category is chosen for the seller');
      const missing=()=>page.locator('#postMissing li').allInnerTexts();
      const before=await page.evaluate(()=>L.length);
      await page.click('#postSubmitBtn');
      let items=await missing();
      assert.ok(items.some(t=>t.startsWith('Catégorie'))&&items.some(t=>t.startsWith('Description'))&&items.some(t=>t.startsWith('Titre')),'Lists category, title, description: '+items);
      assert.equal(await page.locator('#postDescField.missing').count(),1,'Description field is marked');
      await page.selectOption('#newCat','elec');
      assert.equal(await page.inputValue('#newSubcat'),'','No subcategory is chosen for the seller');
      items=await missing();
      assert.ok(items.some(t=>t.startsWith('Sous-catégorie'))&&!items.some(t=>t.startsWith('Catégorie')),'Subcategory now required: '+items);
      await page.fill('#newDesc','Bon état');
      assert.match(await page.innerText('#newDescCount'),/8 \/ 20/);
      assert.ok((await missing()).some(t=>t.startsWith('Description')),'Too short is still missing');
      await page.fill('#newDesc','Très bon état, vendu avec sa coque et son chargeur.');
      assert.match(await page.innerText('#newDescCount'),/✓/);
      await page.selectOption('#newSubcat','phones');
      await page.fill('#newTitle','iPhone 13 128 Go');
      items=await missing();
      assert.ok(!items.some(t=>/^(Catégorie|Sous-catégorie|Description|Titre)/.test(t)),'Fixed items disappear: '+items);
      // Clicking a missing item brings its field into view.
      if(items.length){await page.locator('#postMissing button').first().click();}
      await page.click('#postSubmitBtn');
      assert.equal(await page.evaluate(()=>L.length),before,'Nothing is published while something is missing');
      // Native app bridge (iOS form) names every missing item too.
      const reply=await page.evaluate(async()=>{SB.enabled=()=>true;SB.currentUser=async()=>({id:state.user.id});
        return SXMNativeWorkflows.request('publish',{userId:state.user.id,draft:{title:'iPhone 13',category:'elec',subcategory:'',description:'Bon',area:'Marigot',amount:'10',currency:'eur',condition:'bon',photos:[]}});});
      assert.equal(reply.ok,false);assert.match(reply.error,/sous-catégorie.*description/);
      assert.deepEqual(errors,[],'page errors');
      await page.close();
      console.log((file||'/')+': empty category, subcategory, one-sentence description, live summary and native message passed');
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

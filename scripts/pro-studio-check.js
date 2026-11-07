// Studio Pro: activity forms, multi-offer publishing, validation, escaped
// details on the listing page, editing, and the subscription gate.
// Needs the site served locally (QA_BASE, default http://127.0.0.1:5173).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.QA_BASE||'http://127.0.0.1:5173';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const user=(extra={})=>({id:'qa-biz',name:'Owner',businessName:'Island Pro',accountType:'business',accountPlan:'pro-business',
  subscriptionStatus:'active',subscriptionCurrentPeriodEnd:'2099-01-01',provider:'local',...extra});
(async()=>{const browser=await chromium.launch();try{for(const route of ['/','/marketplace.html']){
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+route+'?local=1');
  await page.locator('.bst-c-ok').click({timeout:4000}).catch(()=>{});
  const setUser=u=>page.evaluate(u=>{state.lang='fr';state.user=normalizeUser(u);L.splice(0,L.length);userListings.splice(0,userListings.length);},u);
  await setUser(user());

  // Posting as a subscribed business opens the Studio, not the simple form.
  await page.evaluate(()=>openPostModal());
  assert.equal(await page.locator('#proStudioModal').isVisible(),true);
  assert.equal(await page.locator('#postModal').isVisible(),false);
  assert.equal(await page.locator('.ps-tile').count(),10);

  // Car rental: one car with a photo, duplicated, published as two listings.
  await page.getByRole('button',{name:/Location de voitures/}).click();
  await page.selectOption('#ps-s0-area','Marigot');
  await page.fill('#ps-i0-title','Toyota Yaris 2021');
  await page.getByRole('button',{name:'Automatique',exact:true}).click();
  await page.fill('#ps-i0-price','45');
  await page.fill('#ps-i0-week','280');
  await page.locator('#psPhotos0').setInputFiles({name:'car.png',mimeType:'image/png',buffer:png});
  await page.locator('.ps-photo img').first().waitFor();
  await page.getByRole('button',{name:'Dupliquer'}).first().click();
  assert.equal(await page.locator('.ps-item, .ps-item-open').count(),2);
  await page.fill('#ps-i1-title','Toyota Yaris 2021 rouge');
  await page.locator('.ps-publish').click();
  await page.locator('#proStudioModal').waitFor({state:'hidden'});
  const cars=await page.evaluate(()=>L.filter(l=>l.cat==='locvoit').map(l=>({t:l.t,amount:l[l.cur],tpl:l.details?.tpl,week:l.details?.f?.week,trans:l.vehicle?.transmission,photos:l.photos.length,area:l.area})));
  assert.equal(cars.length,2);
  assert.deepEqual(cars.map(c=>c.t).sort(),['Toyota Yaris 2021','Toyota Yaris 2021 rouge']);
  cars.forEach(c=>{assert.equal(c.tpl,'location');assert.equal(c.week,280);assert.equal(c.trans,'automatic');assert.equal(c.photos,1);assert.equal(c.amount,45);assert.equal(c.area,'Marigot');});

  // Missing required fields block publishing and say what is missing.
  await page.evaluate(()=>openProStudio());
  await page.getByRole('button',{name:/Taxi & transferts/}).click();
  await page.locator('.ps-publish').click();
  assert.match(await page.locator('.ps-item-open .ps-err').innerText(),/À compléter/);
  assert.equal(await page.evaluate(()=>L.filter(l=>l.cat==='transport').length),0);

  // Taxi page: price grid stored as details and rendered escaped.
  await page.fill('#ps-i0-title','Taxi <img src=x onerror=window.__xss=1>');
  await page.getByRole('button',{name:'Transferts aéroport',exact:true}).click();
  await page.locator('.ps-lines input').nth(0).fill('Aéroport → <b>Marigot</b>');
  await page.locator('.ps-lines input').nth(1).fill('30 $');
  await page.selectOption('#ps-s0-area','Philipsburg');
  await page.locator('.ps-publish').click();
  await page.locator('#proStudioModal').waitFor({state:'hidden'});
  const taxi=await page.evaluate(()=>L.find(l=>l.cat==='transport'));
  assert.equal(taxi.sub,'airport-transfer');assert.equal(taxi.side,'nl');
  assert.deepEqual(taxi.details.f.routes,[['Aéroport → <b>Marigot</b>','30 $']]);
  await page.evaluate(id=>openListing(id),taxi.id);
  const details=page.locator('#detailBody .pro-details');
  await details.waitFor({state:'attached'});
  assert.match(await details.textContent(),/Aéroport → <b>Marigot<\/b>/);
  assert.equal(await page.locator('#detailBody .pro-details b b, #detailBody img[src="x"]').count(),0);
  assert.equal(await page.evaluate(()=>window.__xss),undefined);

  // Editing a Studio listing reopens the Studio with its values and updates in place.
  await page.evaluate(id=>openEditListing(id),taxi.id);
  assert.equal(await page.locator('#proStudioModal').isVisible(),true);
  assert.equal(await page.inputValue('#ps-i0-title'),taxi.t);
  await page.fill('#ps-i0-title','Taxi Jean transferts');
  await page.locator('.ps-publish').click();
  await page.locator('#proStudioModal').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(id=>L.find(l=>String(l.id)===String(id)).t,taxi.id),'Taxi Jean transferts');
  assert.equal(await page.evaluate(()=>L.length),3);

  // Personal accounts keep the simple form; an expired subscription never reaches the Studio.
  await setUser({id:'qa-person',name:'Ana',accountType:'personal',accountPlan:'personal-free',provider:'local'});
  await page.evaluate(()=>openPostModal());
  assert.equal(await page.locator('#postModal').isVisible(),true);
  assert.equal(await page.locator('#proStudioModal').isVisible(),false);
  await page.evaluate(()=>closeModal('postModal'));
  await setUser(user({subscriptionStatus:'inactive'}));
  await page.evaluate(()=>openProStudio());
  assert.equal(await page.locator('#proStudioModal').isVisible(),false);

  assert.deepEqual(errors,[]);
  console.log(route+': studio forms, multi-publish, validation, escaped details, editing and gates passed');
  await page.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

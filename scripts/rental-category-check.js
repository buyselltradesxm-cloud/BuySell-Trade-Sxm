const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
  for(const route of ['/','/marketplace.html']){
    const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
    await page.goto('http://127.0.0.1:5173'+route+'?local=1');
    for(const lang of ['en','fr']){
      const result=await page.evaluate(lang=>{
        state.lang=lang;buildPostForm();
        const items=cat=>SUBCATS[cat].groups.flatMap(g=>g.items);
        document.getElementById('newCat').value='locvoit';buildPostSubcats();applyPostFieldProfile();
        const weekly=document.getElementById('newExtra-week');
        weekly.value='280.50';
        const details=collectPostExtraDetails('locvoit','rental-suv','Rental description',null);
        weekly.value='';fillPostExtraFields({details});
        const tpl=studioTpl('location');
        return {van:items('voit').find(s=>s.id==='van-sale')[lang],body:items('serv').find(s=>s.id==='auto-body-repair')[lang],
          rentals:items('locvoit').length,week:details.f.week,restored:weekly.value,
          label:document.querySelector('label[for="newExtra-week"]').textContent,
          studioSub:tpl.sub({rentalType:'rental-suv'}),
          nativeTypes:items('locvoit').every(s=>document.getElementById('newSubcat').querySelector(`option[value="${s.id}"]`))};
      },lang);
      assert.equal(result.van,lang==='en'?'Vans':'Fourgons et fourgonnettes');
      assert.equal(result.body,lang==='en'?'Auto body repair':'Carrosserie automobile');
      assert.equal(result.rentals,8);assert.equal(result.week,280.5);assert.equal(result.restored,'280.5');
      assert.match(result.label,/7/);assert.equal(result.studioSub,'rental-suv');assert.equal(result.nativeTypes,true);
      console.log('PASS',route,lang,'vehicle/service categories, rental types, weekly rate save and edit');
    }
    await page.close();
  }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

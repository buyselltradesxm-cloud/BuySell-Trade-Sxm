const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async()=>{
  const browser = await chromium.launch();
  try{
    const missing=[];
    for(const [route,bundle] of [['/','app-index.js'],['/marketplace.html','app-marketplace.js']]){
      const source=fs.readFileSync(path.join(__dirname,'..',bundle),'utf8');
      const html=fs.readFileSync(path.join(__dirname,'..',route === '/' ? 'index.html' : 'marketplace.html'),'utf8');
      const keys=[...new Set([
        ...[...source.matchAll(/\bt\(\)\.(\w+)/g)].map(m=>m[1]),
        ...[...html.matchAll(/data-i18n(?:-ph)?=["']([^"']+)["']/g)].map(m=>m[1])
      ])];
      const page=await browser.newPage({serviceWorkers:'block'});
      await page.goto('http://127.0.0.1:5173'+route+'?local=1');
      const result=await page.evaluate(keys=>['en','fr'].flatMap(lang=>keys.filter(key=>!['string','function'].includes(typeof I18N[lang][key])).map(key=>({lang,key}))),keys);
      missing.push(...result.map(r=>({...r,route})));
      const labels=await page.evaluate(()=>{
        state.user=normalizeUser({id:'qa-label-user',name:'QA',provider:'supabase',verifiedEmail:false});
        return ['en','fr'].map(lang=>{
          state.lang=lang;
          renderProfile();
          const button=document.querySelector('.avatar-edit-btn');
          return {lang,label:button.getAttribute('aria-label'),title:button.title};
        });
      });
      for(const label of labels){
        assert.equal(label.label,label.lang === 'fr' ? 'Modifier la photo de profil' : 'Change profile photo');
        assert.equal(label.title,label.label);
      }
      console.log(route+': checked '+keys.length+' translation keys in French and English');
      await page.close();
    }
    assert.deepEqual(missing,[]);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

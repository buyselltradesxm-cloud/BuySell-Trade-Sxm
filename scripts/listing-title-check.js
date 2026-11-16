const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {transformSync} = require('esbuild');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');

async function edgeCase(options = {}) {
  const calls = [];
  let handler;
  const listing = {title:'Canapé gris IKEA 200 €',description:'Très bon état',category:'meub'};
  const translated = {keywords:['canapé','sofa'],title_fr:listing.title,title_en:'Grey IKEA sofa €200',...options.result};
  class Anthropic {
    constructor(settings) { assert.equal(settings.maxRetries,0); }
    messages = {create:async () => ({content:[{type:'text',text:JSON.stringify(translated)}]})};
    static RateLimitError = class extends Error {};
    static APIError = class extends Error {};
  }
  const source = transformSync(fs.readFileSync(path.join(root,'supabase/functions/listing-keywords/index.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
  const context = {module:{exports:{}}, exports:{}, require:()=>Anthropic, Response, Request, AbortSignal, console,
    Deno:{env:{get:name=>({SUPABASE_URL:'https://example.test',PUSH_FUNCTION_SECRET:'fixture-secret',ANTHROPIC_API_KEY:'fixture-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'})[name]},serve:fn=>{handler=fn;}},
    fetch:async(url,init)=>{
      calls.push({url,init});
      if(url.includes('/rpc/')) return new Response(options.race ? 'false' : 'true');
      const row = options.changed && calls.length > 1 ? {...listing,title:'Changed title'} : listing;
      return new Response(JSON.stringify([row]));
    }};
  vm.runInNewContext(source,context);
  const response = await handler(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json','x-push-secret':options.unauthorized?'wrong':'fixture-secret'},body:JSON.stringify({listing_id:123})}));
  return {response,calls,listing};
}

(async()=>{
  let result = await edgeCase();
  assert.equal(result.response.status,200);
  const write = JSON.parse(result.calls.find(c=>c.url.includes('/rpc/')).init.body);
  assert.equal(write.p_title,result.listing.title);
  assert.equal(write.p_title_en,'Grey IKEA sofa €200');
  assert.equal(write.p_title_fr,result.listing.title);
  result = await edgeCase({changed:true});
  assert.equal(result.calls.filter(c=>c.url.includes('/rpc/')).length,0,'Edited titles must not receive stale translations');
  result = await edgeCase({result:{title_en:''}});
  assert.equal(result.response.status,502);
  assert.equal(result.calls.filter(c=>c.url.includes('/rpc/')).length,0);
  result = await edgeCase({unauthorized:true});
  assert.equal(result.response.status,401); assert.equal(result.calls.length,0);
  result = await edgeCase({race:true});
  assert.equal(result.response.status,502,'Atomic save rejection must not report success');
  console.log('PASS translation service: bilingual output, originals, auth, invalid output and stale/racing edits');

  const browser = await chromium.launch();
  try {
    for(const route of ['/','/marketplace.html']) {
      const page = await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
      await page.goto('http://127.0.0.1:5173'+route+'?local=1');
      const values = await page.evaluate(()=>{
        const original='Canapé gris IKEA 200 €';
        const l=SB._rowToListing({id:123,title:original,title_fr:original,title_en:'Grey IKEA sofa €200',category:'meub',status:'active'});
        state.lang='en'; const en=titleFor(l);
        state.lang='fr'; const fr=titleFor(l);
        state.lang='en'; const fallback=titleFor({...l,te:''});
        state.lang='fr'; const reverse=titleFor({...l,t:'Kitchen table',tf:'Table de cuisine',te:'Kitchen table'});
        return {en,fr,fallback,reverse,original:l.t};
      });
      assert.deepEqual(values,{en:'Grey IKEA sofa €200',fr:'Canapé gris IKEA 200 €',fallback:'Canapé gris IKEA 200 €',reverse:'Table de cuisine',original:'Canapé gris IKEA 200 €'});
      console.log('PASS '+route+': French/English titles, reverse translation, original editing value and missing-translation fallback');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

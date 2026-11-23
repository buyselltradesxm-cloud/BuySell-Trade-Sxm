const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {transformSync,buildSync}=require('esbuild');
function load(file,extra={}) {
  const c={module:{exports:{}},URL,Intl,Response,Request,AbortSignal,TextEncoder,crypto,...extra};
  vm.createContext(c);vm.runInContext(transformSync(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code,c);return c.module;
}
const {buildDigestEmail,processDigests}=load('supabase/functions/_shared/search-digest.ts').exports;
const job={id:'job-1',recipient_email:'qa@example.invalid',payload:{language:'fr',unsubscribe_token:'a1000000-0000-4000-8000-000000000001',items:[
  {id:'42',title:'<script>bad</script>',area:'Marigot & Bay',price_eur:800,price_usd:900}
]}};
(async()=>{
  let email=buildDigestEmail(job,'https://buyselltradesxm.com','https://szhaxlmronirhnntlwyb.supabase.co');
  assert.match(email.subject,/nouvelles annonces/);assert.ok(!email.html.includes('<script>'));
  assert.match(email.html,/&lt;script&gt;/);assert.match(email.text,/listing=42/);assert.match(email.text,/search-unsubscribe.html/);
  assert.equal(email.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  email=buildDigestEmail({...job,payload:{...job.payload,language:'en'}},'https://buyselltradesxm.com','https://szhaxlmronirhnntlwyb.supabase.co');
  assert.match(email.subject,/New listings/);assert.match(email.text,/\$900/);
  function fixture(mode){
    const calls=[];let claimed=false;
    return {calls,d:{site:'https://buyselltradesxm.com',api:'https://szhaxlmronirhnntlwyb.supabase.co',pause:async()=>{},
      rpc:async(name,args)=>{calls.push([name,args]);if(name==='claim_search_digests'){if(claimed)return [];claimed=true;return [job];}
        if(name==='finish_search_digest'&&mode==='db-failure')throw new Error('Database unavailable');return true;},
      send:async()=>{calls.push(['send']);if(mode==='timeout')throw new Error('Timeout');if(mode==='quota')return {error:'daily_quota_exceeded'};return {id:'provider-1'};}
    }};
  }
  for(const mode of ['success','timeout','quota']){
    const f=fixture(mode);const result=await processDigests(f.d);
    assert.equal(result.claimed,1);assert.equal(f.calls.filter(c=>c[0]==='send').length,1);
    const outcome=f.calls.find(c=>c[0]==='finish_search_digest')[1].outcome;
    assert.equal(outcome,mode==='success'?'sent':mode==='quota'?'daily_quota_exceeded':'Delivery unconfirmed; inspect provider before retrying');
    if(mode==='quota')assert.equal(f.calls.filter(c=>c[0]==='claim_search_digests').length,1,'Stop immediately at provider quota');
  }
  const f=fixture('db-failure');await assert.rejects(()=>processDigests(f.d));assert.equal(f.calls.filter(c=>c[0]==='send').length,1,'No resend after accepted mail and failed confirmation');
  let handler;let calls=0;
  const token=job.payload.unsubscribe_token;
  load('supabase/functions/search-digest-unsubscribe/index.ts',{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://example.supabase.co':name==='SUPABASE_ANON_KEY'?'test-key':''},serve:fn=>handler=fn},
    fetch:async()=>{calls++;return new Response('true',{status:200});}});
  let response=await handler(new Request('https://example.supabase.co/unsubscribe?token='+token));
  assert.equal(response.status,303);assert.equal(calls,0,'Email scanner GET never unsubscribes');assert.match(response.headers.get('location'),/search-unsubscribe.html/);
  response=await handler(new Request('https://example.supabase.co/unsubscribe?token='+token,{method:'POST',body:'List-Unsubscribe=One-Click'}));
  assert.equal(response.status,200);assert.equal(calls,1);assert.match(await response.text(),/Search emails stopped/);
  response=await handler(new Request('https://example.supabase.co/unsubscribe?token=public-user-id',{method:'POST'}));
  assert.equal(response.status,400);assert.equal(calls,1);
  let worker;let databaseCalls=0;
  const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'private-test-key',EMAIL_QUEUE_SECRET:'private-worker-secret',RESEND_API_KEY:'private-provider-key'};
  const context={module:{exports:{}},URL,Intl,Response,Request,AbortSignal,TextEncoder,crypto,setTimeout,
    Deno:{env:{get:name=>env[name]||''},serve:fn=>worker=fn},
    fetch:async()=>{databaseCalls++;return new Response('[]',{status:200});}};
  vm.createContext(context);vm.runInContext(buildSync({entryPoints:[path.join(__dirname,'../supabase/functions/send-search-digests/index.ts')],bundle:true,format:'cjs',platform:'neutral',write:false}).outputFiles[0].text,context);
  assert.equal((await worker(new Request('https://example.supabase.co/worker'))).status,405);
  assert.equal((await worker(new Request('https://example.supabase.co/worker',{method:'POST'}))).status,401);
  assert.equal(databaseCalls,0,'Reject unauthenticated callers before database access');
  assert.equal((await worker(new Request('https://example.supabase.co/worker',{method:'POST',headers:{'x-email-worker-secret':'private-worker-secret'}}))).status,200);
  assert.equal(databaseCalls,2,'Authenticated empty queue does not contact the provider');
  const listeners={};
  const workerContext={self:{location:{origin:'https://buyselltradesxm.com'},addEventListener:(name,fn)=>listeners[name]=fn},URL,console};
  vm.createContext(workerContext);vm.runInContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),workerContext);
  listeners.fetch({request:new Request('https://buyselltradesxm.com/search-unsubscribe.html?token='+token),respondWith:()=>{throw new Error('Private unsubscribe URL reached service worker cache');}});
  console.log('Search digest email and worker: locale, escaping, unsubscribe, quotas, uncertain delivery and failure recovery passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});

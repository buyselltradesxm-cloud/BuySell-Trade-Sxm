const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../push-notifications.js'),'utf8');

function fixture({registered=true, ready=true, saved=true, backend=true, throws=false}={}){
  let timeout;
  let unsubscribed=false;
  const sub = {endpoint:'https://example.com/qa-endpoint',unsubscribe:async()=>{unsubscribed=true;return true;},
    toJSON:()=>({endpoint:'https://example.com/qa-endpoint',keys:{p256dh:'qa',auth:'qa'}})};
  const reg = {pushManager:{getSubscription:async()=>unsubscribed ? null : sub}};
  const serviceWorker = {ready:ready ? Promise.resolve(reg) : new Promise(()=>{}),
    getRegistration:async()=>registered ? reg : null,addEventListener(){}};
  const window = {PUSH_ENABLED:true,PushManager:{},Notification:{},VAPID_PUBLIC_KEY:'A'.repeat(43),
    location:{origin:'https://example.com'}};
  const context = vm.createContext({window,navigator:{serviceWorker,userAgent:'QA'},
    Notification:{permission:'granted',requestPermission:async()=>'granted'},
    SB:backend ? {savePushSubscription:async()=>{if(throws)throw new Error('QA network');return saved;},deletePushSubscription:async()=>saved} : undefined,
    console:{warn(){}},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout(){},Promise,URL,Uint8Array,atob});
  if(backend) window.SB=context.SB;
  vm.runInContext(source,context);
  return {push:window.Push,expire:()=>timeout()};
}

(async()=>{
  assert.equal((await fixture({registered:false,ready:false}).push.disable()).ok,true);
  assert.equal((await fixture({saved:false}).push.disable()).ok,false);
  assert.equal((await fixture().push.disable()).ok,true);
  assert.equal(await fixture().push.status(),'on');
  assert.equal((await fixture({backend:false}).push.enable()).ok,false);
  assert.equal((await fixture({saved:false}).push.enable()).ok,false);
  assert.equal((await fixture().push.enable()).ok,true);
  for(const config of [{backend:false},{saved:false},{throws:true}]){
    const failed=fixture(config);
    assert.equal((await failed.push.enable()).ok,false);
    assert.equal(await failed.push.status(),'ready');
  }
  const blocked=fixture({ready:false});
  const status=blocked.push.status();
  blocked.expire();
  assert.equal(await status,'default');
  console.log('Push client: 14/14 assertions passed (local fixtures).');
})().catch(error=>{console.error(error);process.exitCode=1;});

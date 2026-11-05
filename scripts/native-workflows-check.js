// Isolated adapter checks: no real accounts, uploads, messages or purchases.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const owner = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'native-workflows.js'), 'utf8');
function fixture() {
  const calls = [], user = {id:owner, name:'Owner', accountType:'personal'};
  const result = {data:[], error:null};
  const query = new Proxy({}, {get:(_, name)=> name === 'then' ? ((resolve)=>resolve(result)) : (...args)=>{
    calls.push([name,...args]); return query;
  }});
  const c = { console, File, Uint8Array, atob, setTimeout, clearTimeout,
    state:{user,lang:'en'}, authProjectionRevision:1,
    CATS:[{id:'all',en:'All'},{id:'elec',en:'Electronics'},{id:'serv',en:'Services'}],
    SUBCATS:{elec:{groups:[{items:[{id:'phones',en:'Phones'}]}]}}, adminCategoryStatus:{},
    AREAS:{fr:['Marigot'],nl:['Marigot','Maho']}, CONDS:[{id:'bon',en:'Good'}],
    postFieldProfile:cat=>({photosRequired:cat!=='serv',price:true,priceRequired:cat!=='serv',condition:cat!=='serv',vehicle:false,urgent:false}),
    listingLimitFor:()=>5, publicationUsageCountFor:()=>0, hasActiveProSubscription:()=>false,
    L:[],userListings:[],render:()=>{}, db:{from:()=>query},
    SB:{enabled:()=>true,currentUser:async()=>user,
      uploadPhotos:async(files,thumbs,id)=>{calls.push(['upload',files.length,id]);return {full:files.map((_,i)=>'https://example.com/'+i),thumbs:[]};},
      insertListing:async(value,id)=>{calls.push(['insert',value,id]);return {...value,id:'42'};},
      fetchBlocks:async()=>[], fetchInbox:async()=>[], markMessageRead:async()=>true,
      sendMessage:async args=>{calls.push(['send',args]); return {id:'5',body:args.body,sender_id:owner,created_at:'2026-11-05T12:00:00Z',read:false};},
      blockUser:async()=>true,createReport:async()=>true}
  };
  c.window=c;
  vm.createContext(c);vm.runInContext(source,c);
  return {c,calls,result,request:(action,payload={})=>c.SXMNativeWorkflows.request(action,{userId:owner,...payload})};
}
const draft=()=>({title:'Good phone',description:'A real phone',category:'elec',subcategory:'phones',area:'Marigot',amount:'12.50',currency:'usd',condition:'bon',photos:[{data:'/9j/2Q=='}]});
(async()=>{
  let f=fixture();
  let r=await f.request('session');assert.equal(r.data.userId,owner);assert.equal(r.data.schema.areas.length,2);
  f.c.SB.currentUser=async()=>null;assert.equal((await f.request('publish',{draft:draft()})).code,'AUTH_REQUIRED');
  f=fixture();assert.equal((await f.request('publish',{userId:peer,draft:draft()})).code,'AUTH_REQUIRED');
  for(const mutation of [d=>d.title='x',d=>d.category='unknown',d=>d.subcategory='fake',d=>d.amount=undefined,d=>d.amount='NaN',d=>d.amount='0x20',d=>d.amount='-1',d=>d.area='elsewhere',d=>d.currency='btc',d=>d.photos=[],d=>d.photos=[{data:'invalid'}]]) {
    f=fixture();const d=draft();mutation(d);assert.equal((await f.request('publish',{draft:d})).ok,false);assert.equal(f.calls.length,0);
  }
  f=fixture();f.c.state.user.accountType='business';assert.equal((await f.request('publish',{draft:draft()})).ok,false);assert.equal(f.calls.length,0);
  f=fixture();f.c.publicationUsageCountFor=()=>5;assert.equal((await f.request('publish',{draft:draft()})).ok,false);assert.equal(f.calls.length,0);
  f=fixture();f.c.SB.uploadPhotos=async()=>({full:[],thumbs:[]});assert.equal((await f.request('publish',{draft:draft()})).ok,false);assert.equal(f.c.L.length,0);
  f=fixture();f.c.SB.insertListing=async()=>null;assert.equal((await f.request('publish',{draft:draft()})).code,'UNCERTAIN_WRITE');assert.equal(f.c.L.length,0);
  f=fixture();f.c.SB.insertListing=async()=>{throw new Error('Connection lost');};assert.equal((await f.request('publish',{draft:draft()})).code,'UNCERTAIN_WRITE');
  f=fixture();r=await f.request('publish',{draft:draft()});assert.equal(r.ok,true);assert.equal(f.calls.find(c=>c[0]==='upload')[2],owner);assert.equal(f.calls.find(c=>c[0]==='insert')[2],owner);assert.equal(f.c.L.length,1);
  f=fixture();const d={...draft(),category:'serv',subcategory:'',photos:[],amount:''};assert.equal((await f.request('publish',{draft:d})).ok,true);
  f=fixture();let release;f.c.SB.uploadPhotos=()=>new Promise(resolve=>{release=resolve;});
  const pending=f.request('publish',{draft:draft()});await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await f.request('publish',{draft:draft()})).ok,false);
  f.c.authProjectionRevision++;release({full:['https://example.com/a.jpg'],thumbs:[]});
  assert.equal((await pending).code,'AUTH_REQUIRED');assert.ok(!f.calls.some(c=>c[0]==='insert'));
  f=fixture();r=await f.request('send',{otherId:peer,listingId:null,body:'Hello'});assert.equal(r.ok,true);assert.equal(f.calls[0][1].expectedUserId,owner);
  f.c.SB.sendMessage=async()=>null;assert.equal((await f.request('send',{otherId:peer,body:'Hello'})).code,'UNCERTAIN_WRITE');
  f.c.SB.sendMessage=async()=>{throw new Error('Connection lost');};assert.equal((await f.request('send',{otherId:peer,body:'Hello'})).code,'UNCERTAIN_WRITE');
  f.c.SB.sendMessage=async()=>({error_code:'free_listing_message_limit_reached'});assert.equal((await f.request('send',{otherId:peer,body:'Hello'})).ok,false);
  assert.equal((await f.request('send',{otherId:peer,body:'x'.repeat(4001)})).ok,false);
  assert.equal((await f.request('thread',{otherId:'1),id.gt.0'})).ok,false);
  f=fixture();f.c.SB.fetchBlocks=async()=>[{id:peer}];assert.equal((await f.request('thread',{otherId:peer})).ok,false);
  f=fixture();f.c.SB.fetchInbox=async()=>null;assert.equal((await f.request('inbox')).ok,false);
  f=fixture();f.result.data=[{id:'5',body:'Hello',sender_id:peer,recipient_id:owner,created_at:'2026-11-05T12:00:00Z',read:false}];
  r=await f.request('thread',{otherId:peer,listingId:'42',before:{at:'2026-11-05T12:01:00Z',id:'6'}});
  assert.equal(r.ok,true);assert.equal(r.data.messages[0].senderId,peer);assert.ok(f.calls.some(c=>c[0]==='limit'&&c[1]===50));
  assert.equal((await f.request('block',{otherId:owner})).ok,false);
  f.c.SB.createReport=async()=>null;assert.equal((await f.request('report',{listingId:'42'})).ok,false);
  // Exercise the real shared API guards as well as the workflow fixture.
  const apiContext={console,window:null};apiContext.window=apiContext;
  apiContext.db={from:()=>{throw new Error('Mismatched account reached a write');},storage:{from:()=>{throw new Error('Mismatched account reached storage');}}};
  vm.createContext(apiContext);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..','supabase-api.js'),'utf8'),apiContext);
  apiContext.SB.currentUser=async()=>({id:peer});
  assert.equal((await apiContext.SB.uploadPhotos([{}],null,owner)).full.length,0);
  assert.equal(await apiContext.SB.insertListing({},owner),null);
  assert.equal(await apiContext.SB.createReport('42','Spam','',owner),null);
  assert.equal(await apiContext.SB.sendMessage({expectedUserId:owner,recipientId:peer,body:'Hello'}),null);
  assert.equal(await apiContext.SB.blockUser(peer,'Peer',owner),false);
  console.log('Native workflows: session isolation, schema, validation, quotas, uploads, duplicate submits, uncertain writes, message limits, blocking and pagination passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});

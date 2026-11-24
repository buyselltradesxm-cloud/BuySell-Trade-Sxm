const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {configure,appleClient} = require('./configure-testflight-internal');
function fixture({internal = true, processing = 'VALID'} = {}) {
  let assigned = false, localization;
  const mutations = [];
  const api = async (route,method='GET',body)=>{
    if (method !== 'GET') mutations.push({route,method});
    if (route.includes('/appStoreVersions?')) return {data:[{id:'public',attributes:{versionString:'1.0.8',appStoreState:'WAITING_FOR_REVIEW'},relationships:{build:{data:{id:'current-public-build'}}}}]};
    if (route.startsWith('/v1/builds?')) return {data:[{id:'new-build',attributes:{version:'1',processingState:processing,expired:false},relationships:{preReleaseVersion:{data:{id:'release'}}}}],included:[{id:'release',type:'preReleaseVersions',attributes:{version:'1.0.9'}}]};
    if (route.startsWith('/v1/betaGroups?')) return {data:[{id:'internal-group',attributes:{name:'SXM Internal Testing',isInternalGroup:internal}}]};
    if (route.includes('/betaBuildLocalizations?')) return {data:localization?[localization]:[]};
    if (route==='/v1/betaBuildLocalizations' && method==='POST') { localization={id:'notes',attributes:body.data.attributes};return {}; }
    if (route==='/v1/betaGroups/internal-group/relationships/builds?limit=200') return {data:assigned?[{id:'new-build'}]:[]};
    if (route==='/v1/betaGroups/internal-group/relationships/builds' && method==='POST') {assert.deepEqual(body.data,[{type:'builds',id:'new-build'}]);assigned=true;return {};}
    if (route.includes('/relationships/betaTesters?')) return {data:[{id:'tester-id-not-in-report'}]};
    if (route.endsWith('/buildBetaDetail')) return {data:{attributes:{internalBuildState:'IN_BETA_TESTING'}}};
    throw new Error('Unexpected API request: '+method+' '+route);
  };
  return {api,mutations};
}
(async()=>{
  const f=fixture();const result=await configure(f.api,'1.0.9','Bilingual notes');
  assert.equal(result.processingState,'VALID');assert.equal(result.testers,1);
  assert.equal(result.publicVersions[0].buildID,'current-public-build');
  assert(!JSON.stringify(result).includes('tester-id-not-in-report'));
  assert.equal(f.mutations.length,2);
  await configure(f.api,'1.0.9','Bilingual notes');assert.equal(f.mutations.length,2,'Reruns do not duplicate writes');
  const external=fixture({internal:false});await assert.rejects(()=>configure(external.api,'1.0.9','notes'),/internal tester group/);assert.equal(external.mutations.length,0);
  const failed=fixture({processing:'INVALID'});await assert.rejects(()=>configure(failed.api,'1.0.9','notes'),/processing failed/);assert.equal(failed.mutations.length,0);
  await assert.rejects(()=>configure(()=>{throw Error('must not call API')},'../../other','notes'),/Invalid version/);
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const original=global.fetch;
  try {
    global.fetch=async(url,options)=>{
      assert.equal(new URL(url).origin,'https://api.appstoreconnect.apple.com');
      assert.equal(options.redirect,'error');
      const [header,payload,signature]=options.headers.Authorization.slice(7).split('.');
      assert(crypto.verify('sha256',Buffer.from(header+'.'+payload),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')));
      const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.exp-claims.iat,120);
      return {status:204};
    };
    await appleClient({APP_STORE_CONNECT_API_KEY_BASE64:Buffer.from(privateKey.export({type:'pkcs8',format:'pem'})).toString('base64'),APP_STORE_CONNECT_KEY_ID:'TEST',APP_STORE_CONNECT_ISSUER_ID:'TEST'})('/v1/apps');
  } finally {global.fetch=original;}
  console.log('TestFlight checks passed: exact version/group, no external invitations or public-build changes, idempotent notes/assignment, processing failure and signed short-lived authentication.');
})().catch(error=>{console.error(error.message);process.exit(1)});

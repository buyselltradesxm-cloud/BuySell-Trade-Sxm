const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const APP = '6809964445';
const GROUP = 'SXM Internal Testing';

function appleClient(env) {
  const key = crypto.createPrivateKey(Buffer.from(env.APP_STORE_CONNECT_API_KEY_BASE64 || '', 'base64'));
  if (!env.APP_STORE_CONNECT_KEY_ID || !env.APP_STORE_CONNECT_ISSUER_ID) throw new Error('Missing Apple release credentials');
  return async function api(route, method = 'GET', body) {
    if (!route.startsWith('/v1/')) throw new Error('Invalid Apple API path');
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = encode({alg:'ES256',kid:env.APP_STORE_CONNECT_KEY_ID,typ:'JWT'}) + '.' +
      encode({iss:env.APP_STORE_CONNECT_ISSUER_ID,iat:now,exp:now+120,aud:'appstoreconnect-v1'});
    const token = unsigned + '.' + crypto.sign('sha256', Buffer.from(unsigned), {key,dsaEncoding:'ieee-p1363'}).toString('base64url');
    const response = await fetch('https://api.appstoreconnect.apple.com' + route, {
      method, headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(30000), redirect:'error'
    });
    if (response.status === 204) return {};
    const result = await response.json();
    if (!response.ok) throw new Error(`Apple ${method} ${route.split('?')[0]}: HTTP ${response.status} ${(result.errors || []).map(e=>e.code).join(',')}`);
    return result;
  };
}

async function configure(api, version, notes, pause = ms => new Promise(resolve=>setTimeout(resolve,ms))) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || !notes || notes.length > 4000) throw new Error('Invalid version or test notes');
  const publicRoute = `/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&include=build&limit=200`;
  const before = await api(publicRoute);
  const publicBuilds = new Map(before.data.map(v=>[v.id,v.relationships?.build?.data?.id]));
  let build;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = await api(`/v1/builds?filter[app]=${APP}&include=preReleaseVersion&sort=-uploadedDate&limit=100`);
    const versions = new Map((result.included || []).filter(r=>r.type==='preReleaseVersions').map(v=>[v.id,v.attributes.version]));
    build = result.data.find(b=>versions.get(b.relationships?.preReleaseVersion?.data?.id)===version && !b.attributes.expired);
    if (build?.attributes.processingState === 'VALID') break;
    if (build && ['FAILED','INVALID'].includes(build.attributes.processingState)) throw new Error('Apple processing failed');
    if (attempt === 29) throw new Error('Build processing is still pending; rerun after Apple finishes');
    await pause(10000);
  }
  const groups = await api(`/v1/betaGroups?filter[app]=${APP}&limit=200`);
  const matches = groups.data.filter(g=>g.attributes.name===GROUP && g.attributes.isInternalGroup===true);
  if (matches.length !== 1) throw new Error('Existing internal tester group was not uniquely identified');
  const group = matches[0], id = encodeURIComponent(build.id), groupID = encodeURIComponent(group.id);
  const localizationRoute = `/v1/builds/${id}/betaBuildLocalizations?limit=200`;
  const localizations = await api(localizationRoute);
  const en = localizations.data.find(l=>l.attributes.locale==='en-US');
  if (en) {
    if (en.attributes.whatsNew !== notes) await api(`/v1/betaBuildLocalizations/${encodeURIComponent(en.id)}`, 'PATCH',
      {data:{type:'betaBuildLocalizations',id:en.id,attributes:{whatsNew:notes}}});
  } else {
    await api('/v1/betaBuildLocalizations','POST',{data:{type:'betaBuildLocalizations',attributes:{locale:'en-US',whatsNew:notes},relationships:{build:{data:{type:'builds',id:build.id}}}}});
  }
  const groupRoute = `/v1/betaGroups/${groupID}/relationships/builds?limit=200`;
  if (!(await api(groupRoute)).data.some(item=>item.id===build.id)) {
    await api(`/v1/betaGroups/${groupID}/relationships/builds`,'POST',{data:[{type:'builds',id:build.id}]});
  }
  if (!(await api(groupRoute)).data.some(item=>item.id===build.id)) throw new Error('Tester-group assignment was not confirmed');
  if (!(await api(localizationRoute)).data.some(l=>l.attributes.locale==='en-US' && l.attributes.whatsNew===notes)) throw new Error('Saved test notes did not match');
  const testers = await api(`/v1/betaGroups/${groupID}/relationships/betaTesters?limit=200`);
  const detail = await api(`/v1/builds/${id}/buildBetaDetail`);
  const after = await api(publicRoute);
  for (const v of after.data) {
    if (publicBuilds.has(v.id) && publicBuilds.get(v.id)!==v.relationships?.build?.data?.id) throw new Error('Public version build selection changed during verification');
  }
  return {app:APP,version,build:build.attributes.version,buildID:build.id,processingState:build.attributes.processingState,
    internalBuildState:detail.data.attributes.internalBuildState,group:GROUP,testers:testers.meta?.paging?.total ?? testers.data.length,
    notesVerified:true,publicVersions:after.data.map(v=>({version:v.attributes.versionString,state:v.attributes.appVersionState || v.attributes.appStoreState,buildID:v.relationships?.build?.data?.id})),
    testFlightUrl:`https://appstoreconnect.apple.com/apps/${APP}/testflight/ios/${build.id}`};
}

module.exports = {configure,appleClient};
if (require.main === module) {
  const version = process.env.TESTFLIGHT_VERSION || '';
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid TestFlight version');
  const notesPath = path.join(__dirname, `testflight-${version}-test-notes.txt`);
  configure(appleClient(process.env), version, fs.readFileSync(notesPath,'utf8')).then(result=>{
    fs.writeFileSync('testflight-internal-result.json',JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }).catch(error=>{console.error(error.message);process.exit(1)});
}

// Offline checks for submit-appstore-review.js with a fake App Store Connect API.
const assert = require('node:assert/strict');
const {submit, whatsNewFor, readNotes} = require('./submit-appstore-review');
function fake({subState, versions}) {
  const calls = [];
  const api = async (route, method = 'GET', body) => {
    calls.push([method, route.split('?')[0], body]);
    if (route.startsWith('/v1/builds?')) return {data: [{id: 'b1', attributes: {version: '1', processingState: 'VALID'}}]};
    if (route.startsWith('/v1/reviewSubmissions?')) return {data: subState ? [{id: 's0', attributes: {state: subState}}] : []};
    if (route.startsWith('/v1/apps/')) return {data: versions};
    if (route === '/v1/appStoreVersions' && method === 'POST') return {data: {id: 'vNew', attributes: {versionString: '1.0.16'}}};
    if (route.includes('/appStoreVersionLocalizations?')) return {data: [{id: 'l1', attributes: {locale: 'fr-FR'}}, {id: 'l2', attributes: {locale: 'en-US'}}]};
    if (route === '/v1/reviewSubmissions' && method === 'POST') return {data: {id: 's1', attributes: {state: 'READY_FOR_REVIEW'}}};
    if (route.endsWith('/items?limit=50')) return {data: []};
    if (route.startsWith('/v1/reviewSubmissions/') && method === 'GET') return {data: {attributes: {state: 'WAITING_FOR_REVIEW'}}};
    return {};
  };
  return {api, calls, writes: () => calls.filter(c => c[0] !== 'GET')};
}
const notes = {fr: 'Nouveautés', en: 'New'};
const live = [{id: 'v9', attributes: {versionString: '1.0.9', appStoreState: 'READY_FOR_SALE'}}];
(async () => {
  assert.equal(whatsNewFor('fr-FR', notes), 'Nouveautés');
  assert.equal(whatsNewFor('en-US', notes), 'New');
  assert.ok(readNotes('1.0.16').fr.includes('vendeurs'));
  let f = fake({versions: live});
  const plan = await submit(f.api, '1.0.16', notes, true);
  assert.equal(f.writes().length, 0, 'Dry run never writes');
  assert.match(plan.steps[0], /create version 1.0.16/);
  f = fake({subState: 'WAITING_FOR_REVIEW', versions: live});
  await assert.rejects(submit(f.api, '1.0.16', notes, false), /already WAITING_FOR_REVIEW/);
  assert.equal(f.writes().length, 0, 'A waiting submission is never touched');
  f = fake({versions: [...live, {id: 'v16', attributes: {versionString: '1.0.16', appStoreState: 'WAITING_FOR_REVIEW'}}]});
  await assert.rejects(submit(f.api, '1.0.16', notes, false), /not editable/);
  f = fake({versions: [...live, {id: 'v15', attributes: {versionString: '1.0.15', appStoreState: 'PREPARE_FOR_SUBMISSION'}}]});
  const done = await submit(f.api, '1.0.16', notes, false);
  assert.ok(f.calls.some(c => c[0] === 'PATCH' && c[1] === '/v1/appStoreVersions/v15' && c[2].data.attributes.versionString === '1.0.16'), 'Renames the editable version');
  assert.ok(f.calls.some(c => c[1] === '/v1/appStoreVersions/v15/relationships/build' && c[2].data.id === 'b1'), 'Attaches the tested build');
  assert.equal(f.calls.filter(c => c[1].startsWith('/v1/appStoreVersionLocalizations/')).length, 2, 'What\'s New on every language');
  assert.equal(done.submission.state, 'WAITING_FOR_REVIEW');
  console.log('App Store submit helper checks passed');
})().catch(e => { console.error(e); process.exit(1); });

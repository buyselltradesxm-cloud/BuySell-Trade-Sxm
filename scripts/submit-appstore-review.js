// Submit an already tested TestFlight build to App Review (App Store Connect API).
// Dry run (default) only reads and prints the plan. A real run:
//   1. uses the one editable App Store version (renamed to VERSION) or creates it,
//   2. attaches the VALID build of VERSION, 3. sets "What's New" on every localization,
//   4. adds the version to a review submission and submits it.
// It stops, changing nothing, when another submission is already waiting or in review
// (a waiting submission is never cancelled) or when the build is not VALID.
const fs = require('node:fs');
const path = require('node:path');
const {appleClient} = require('./configure-testflight-internal');
const APP = '6809964445';
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];
const BUSY = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'];

function whatsNewFor(locale, notes) {
  return locale.toLowerCase().startsWith('fr') ? notes.fr : notes.en;
}

function readNotes(version) {
  const text = fs.readFileSync(path.join(__dirname, `appstore-${version}-whats-new.txt`), 'utf8');
  const fr = (text.match(/FRANÇAIS\s*\n([\s\S]*?)(?:\n\s*ENGLISH|$)/) || [])[1]?.trim();
  const en = (text.match(/ENGLISH\s*\n([\s\S]*?)(?:\n\s*FRANÇAIS|$)/) || [])[1]?.trim();
  if (!fr || !en || fr.length > 4000 || en.length > 4000) throw new Error('What\'s New must have a FRANÇAIS and an ENGLISH part under 4000 characters');
  return {fr, en};
}

async function submit(api, version, notes, dryRun) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid version');
  const plan = {version, dryRun, steps: []};
  const builds = await api(`/v1/builds?filter[app]=${APP}&filter[preReleaseVersion.version]=${version}&sort=-uploadedDate&limit=5`);
  const build = builds.data.find(b => b.attributes.processingState === 'VALID');
  if (!build) throw new Error(`No VALID build for ${version}`);
  plan.build = {id: build.id, number: build.attributes.version, encryption: build.attributes.usesNonExemptEncryption};

  const subs = await api(`/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&limit=20`);
  const busy = subs.data.filter(s => BUSY.includes(s.attributes.state));
  plan.openSubmissions = subs.data.filter(s => s.attributes.state !== 'COMPLETE').map(s => ({id: s.id, state: s.attributes.state}));
  if (busy.length) throw new Error('Another submission is already ' + busy.map(s => s.attributes.state).join(', ') + ' — nothing changed');

  const versions = await api(`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=50`);
  plan.versions = versions.data.map(v => ({id: v.id, version: v.attributes.versionString, state: v.attributes.appStoreState}));
  let target = versions.data.find(v => v.attributes.versionString === version && EDITABLE.includes(v.attributes.appStoreState))
    || versions.data.find(v => EDITABLE.includes(v.attributes.appStoreState));
  if (versions.data.some(v => v.attributes.versionString === version && !EDITABLE.includes(v.attributes.appStoreState)))
    throw new Error(`Version ${version} already exists and is not editable — nothing changed`);
  plan.steps.push(target ? (target.attributes.versionString === version ? `use editable version ${version}` : `rename editable ${target.attributes.versionString} to ${version}`) : `create version ${version}`);
  plan.steps.push(`attach build ${build.attributes.version} (${build.id})`, 'set What\'s New on every localization', 'add to a review submission and submit');
  if (dryRun) return plan;

  if (!target) {
    target = (await api('/v1/appStoreVersions', 'POST', {data: {type: 'appStoreVersions',
      attributes: {platform: 'IOS', versionString: version, releaseType: 'AFTER_APPROVAL'},
      relationships: {app: {data: {type: 'apps', id: APP}}}}})).data;
  } else if (target.attributes.versionString !== version) {
    await api(`/v1/appStoreVersions/${target.id}`, 'PATCH', {data: {type: 'appStoreVersions', id: target.id, attributes: {versionString: version}}});
  }
  await api(`/v1/appStoreVersions/${target.id}/relationships/build`, 'PATCH', {data: {type: 'builds', id: build.id}});

  const locs = await api(`/v1/appStoreVersions/${target.id}/appStoreVersionLocalizations?limit=50`);
  if (!locs.data.length) throw new Error('The version has no localizations; fill the App Store page first');
  for (const loc of locs.data) {
    await api(`/v1/appStoreVersionLocalizations/${loc.id}`, 'PATCH', {data: {type: 'appStoreVersionLocalizations', id: loc.id,
      attributes: {whatsNew: whatsNewFor(loc.attributes.locale, notes)}}});
  }
  plan.locales = locs.data.map(l => l.attributes.locale);

  let draft = subs.data.find(s => s.attributes.state === 'READY_FOR_REVIEW');
  if (!draft) draft = (await api('/v1/reviewSubmissions', 'POST', {data: {type: 'reviewSubmissions',
    attributes: {platform: 'IOS'}, relationships: {app: {data: {type: 'apps', id: APP}}}}})).data;
  const items = await api(`/v1/reviewSubmissions/${draft.id}/items?limit=50`);
  if (!items.data.some(i => i.relationships?.appStoreVersion?.data?.id === target.id)) {
    await api('/v1/reviewSubmissionItems', 'POST', {data: {type: 'reviewSubmissionItems', relationships: {
      reviewSubmission: {data: {type: 'reviewSubmissions', id: draft.id}},
      appStoreVersion: {data: {type: 'appStoreVersions', id: target.id}}}}});
  }
  await api(`/v1/reviewSubmissions/${draft.id}`, 'PATCH', {data: {type: 'reviewSubmissions', id: draft.id, attributes: {submitted: true}}});
  const after = await api(`/v1/reviewSubmissions/${draft.id}`);
  plan.submission = {id: draft.id, state: after.data.attributes.state,
    url: `https://appstoreconnect.apple.com/apps/${APP}/distribution/reviewsubmissions/details/${draft.id}`};
  if (!['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(after.data.attributes.state)) throw new Error('Submission not confirmed: ' + after.data.attributes.state);
  return plan;
}

module.exports = {submit, whatsNewFor, readNotes};
if (require.main === module) {
  const version = process.env.APPSTORE_VERSION || '';
  const dryRun = process.env.APPSTORE_DRY_RUN !== 'false';
  submit(appleClient(process.env), version, readNotes(version), dryRun).then(plan => {
    fs.writeFileSync('appstore-submit-result.json', JSON.stringify(plan, null, 2) + '\n');
    console.log(JSON.stringify(plan, null, 2));
  }).catch(error => { console.error(error.message); process.exit(1); });
}

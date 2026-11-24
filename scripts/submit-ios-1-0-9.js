const { appleClient } = require('./configure-testflight-internal');
const api = appleClient(process.env);
const app = '6809964445';
const version = '1.0.9';
const resource = (type, id) => ({ type, id });
const relationship = (type, id) => ({ data: resource(type, id) });
const en = 'Discover now shows local sponsored carousels on iPhone and iPad. This update also improves where ads appear in the marketplace.';
const fr = 'Découvrez les carrousels sponsorisés locaux dans Découvrir sur iPhone et iPad. Cette mise à jour améliore aussi les emplacements publicitaires.';

async function main() {
  const builds = await api('/v1/builds?filter[app]=' + app + '&filter[version]=3&include=preReleaseVersion&limit=50');
  const pre = builds.included?.find(item => item.type === 'preReleaseVersions' && item.attributes.version === version && item.attributes.platform === 'IOS');
  const build = builds.data.find(item => item.relationships.preReleaseVersion.data.id === pre?.id && !item.attributes.expired);
  if (build?.attributes.processingState !== 'VALID') throw new Error('iOS 1.0.9 build 3 is not valid for submission yet');
  const versions = await api('/v1/apps/' + app + '/appStoreVersions?filter[platform]=IOS&include=build&limit=100');
  const previous = versions.data.find(item => item.attributes.versionString === '1.0.8');
  let target = versions.data.find(item => item.attributes.versionString === version);
  if (target && ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(target.attributes.appVersionState || target.attributes.appStoreState)) {
    if (target.relationships.build.data?.id !== build.id) throw new Error('A different 1.0.9 build is already submitted');
    console.log('Already submitted:', version, 'build 3', target.attributes.appVersionState || target.attributes.appStoreState);
    return;
  }
  if (!target) {
    target = (await api('/v1/appStoreVersions', 'POST', { data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString: version, releaseType: 'AFTER_APPROVAL' },
      relationships: { app: relationship('apps', app) }
    } })).data;
  }
  console.log('Prepared iOS version', version, target.id);
  const route = '/v1/appStoreVersions/' + target.id;
  await api(route + '/relationships/build', 'PATCH', { data: resource('builds', build.id) });
  let localizations = (await api(route + '/appStoreVersionLocalizations?limit=50')).data;
  if (!localizations.length) throw new Error('Apple did not carry over storefront localizations');
  for (const locale of localizations) {
    const whatsNew = locale.attributes.locale.startsWith('fr') ? fr : en;
    await api('/v1/appStoreVersionLocalizations/' + locale.id, 'PATCH', { data: {
      ...resource('appStoreVersionLocalizations', locale.id), attributes: { whatsNew }
    } });
  }
  const review = (await api(route + '/appStoreReviewDetail')).data;
  if (!review) throw new Error('Missing App Review contact information');
  const fields = ['contactFirstName', 'contactLastName', 'contactPhone', 'contactEmail', 'demoAccountName', 'demoAccountPassword', 'demoAccountRequired'];
  if (previous && (!review.attributes.contactEmail || !review.attributes.demoAccountName)) {
    const old = (await api('/v1/appStoreVersions/' + previous.id + '/appStoreReviewDetail')).data;
    const attributes = Object.fromEntries(fields.filter(key => old?.attributes[key] != null).map(key => [key, old.attributes[key]]));
    if (Object.keys(attributes).length) await api('/v1/appStoreReviewDetails/' + review.id, 'PATCH',
      { data: { ...resource('appStoreReviewDetails', review.id), attributes } });
  }
  const submissions = (await api('/v1/apps/' + app + '/reviewSubmissions?filter[platform]=IOS&limit=50')).data;
  let draft;
  let attached = false;
  for (const candidate of submissions.filter(item => item.attributes.state === 'READY_FOR_REVIEW')) {
    const items = (await api('/v1/reviewSubmissions/' + candidate.id + '/items?include=appStoreVersion')).data;
    if (items.length === 1 && items[0].relationships?.appStoreVersion?.data?.id === target.id) {
      draft = candidate;
      attached = true;
      break;
    }
    if (!items.length) draft = candidate;
  }
  if (!draft) draft = (await api('/v1/reviewSubmissions', 'POST', { data: {
    type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: relationship('apps', app) }
  } })).data;
  if (!attached) await api('/v1/reviewSubmissionItems', 'POST', { data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: relationship('reviewSubmissions', draft.id),
      appStoreVersion: relationship('appStoreVersions', target.id)
    }
  } });
  console.log('Attached iOS 1.0.9 build 3 to review submission', draft.id);
  const submitted = (await api('/v1/reviewSubmissions/' + draft.id, 'PATCH', { data: {
    ...resource('reviewSubmissions', draft.id), attributes: { submitted: true }
  } })).data;
  if (!['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(submitted.attributes.state)) {
    throw new Error('Unexpected App Review status: ' + submitted.attributes.state);
  }
  console.log('Apple App Review:', submitted.attributes.state, 'for iOS 1.0.9 build 3');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

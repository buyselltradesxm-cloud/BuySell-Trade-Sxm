// Read-only release check: public entry pages and their versioned assets.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = 'https://buyselltradesxm.com/';
const normalize = value => value.replace(/\r\n/g, '\n');
async function read(url) {
  const response = await fetch(new URL(url, base), {signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, url + ' must be published');
  return response.text();
}
(async () => {
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const version = worker.match(/const ASSET_VERSION = '([^']+)'/)[1];
  const assets = new Map([['sw.js?v=' + version, 'sw.js']]);
  for (const page of ['index.html', 'marketplace.html', 'auth-callback.html']) {
    const html = await read(page);
    const refs = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?([^"']*))?["']/g)]
      .filter(match => !/^(?:https?:|\/\/|data:)/.test(match[1]));
    assert(refs.length > 0, page + ' must reference local assets');
    for (const match of refs) {
      assert.equal(new URLSearchParams(match[2]).get('v'), version, page + ': ' + match[1]);
      assets.set(match[1] + '?' + match[2], match[1].replace(/^\//, ''));
    }
    console.log('PASS published entry page: ' + page);
  }
  const entries = [...assets];
  for (let index = 0; index < entries.length; index += 4) {
    await Promise.all(entries.slice(index, index + 4).map(async ([url, file]) => {
      const live = await read(url);
      const expected = fs.readFileSync(path.join(root, file), 'utf8');
      assert.equal(normalize(live), normalize(expected), file + ' must match the local release');
      console.log('PASS published asset: ' + file);
    }));
  }
  for (const file of ['APP_QA_STATUS.md', 'scripts/version-assets.js', 'supabase/schema.sql']) {
    const response = await fetch(new URL(file, base), {signal: AbortSignal.timeout(30000)});
    assert.equal(response.status, 404, file + ' must not be served');
    console.log('PASS excluded tooling: ' + file);
  }
  console.log('Release ' + version + ': 3 pages, ' + assets.size + ' assets and 3 exclusions verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });

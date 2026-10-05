const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'marketplace.html', 'auth-callback.html'];
const reference = /((?:src|href)=["'])([^"']+\.(?:js|css))(?:\?[^"']*)?(["'])/g;
const local = url => !/^(?:https?:|\/\/|data:)/.test(url);
const assets = new Set(['sw.js']);
const html = new Map();
for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');
  html.set(page, source);
  for (const match of source.matchAll(reference)) {
    if (local(match[2])) assets.add(match[2].replace(/^\//, ''));
  }
}
const hash = crypto.createHash('sha256');
for (const file of [...assets].sort()) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
    .replace(/const ASSET_VERSION = '[^']+';/, "const ASSET_VERSION = '__GENERATED__';");
  hash.update(file + '\0' + source + '\0');
}
for (const [file, source] of html) {
  hash.update(file + '\0' + source.replace(/\r\n/g, '\n')
    .replace(reference, (whole, prefix, url, suffix) => local(url) ? prefix + url + suffix : whole) + '\0');
}
const version = hash.digest('hex').slice(0, 16);
const outputs = new Map([...html].map(([file, source]) => [file, source.replace(reference,
  (whole, prefix, url, suffix) => local(url) ? prefix + url + '?v=' + version + suffix : whole)]));
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!/const ASSET_VERSION = '[^']+';/.test(worker)) throw new Error('Worker asset version marker is missing');
outputs.set('sw.js', worker.replace(/const ASSET_VERSION = '[^']+';/, "const ASSET_VERSION = '" + version + "';"));
const changed = [...outputs].filter(([file, source]) => fs.readFileSync(path.join(root,file),'utf8') !== source);
if (process.argv.includes('--check')) {
  if (changed.length) throw new Error('Asset versions are stale. Run npm run build:assets: ' + changed.map(([file])=>file).join(', '));
} else {
  for (const [file, source] of changed) fs.writeFileSync(path.join(root,file),source);
}
console.log('Asset release ' + version + ': ' + assets.size + ' assets, ' + pages.length + ' pages; ' +
  (process.argv.includes('--check') ? 'verified' : changed.length + ' files updated'));

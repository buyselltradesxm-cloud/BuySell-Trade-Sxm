const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { directoryFor, pageFor, sitemapFor } = require("./build-listing-pages");

const listings = [
  { id: 57, title: 'Car & trailer <sale>', area: 'Marigot', side: 'fr', category: 'voit', price_eur: 1250, currency: 'eur' },
  { id: 'rental-test', title: 'Rental', area: 'Simpson Bay', side: 'nl', category: 'locvoit', price_usd: 45, currency: 'usd' },
  { id: 59, title: '</script><script>alert(1)</script>', category: 'food' }
];
const directory = directoryFor(listings);
for (const listing of listings) {
  assert(directory.includes(`href="/l/${listing.id}.html"`), 'Every listing has a crawlable link');
  assert(pageFor(listing).includes('href="/l/"'), 'Listing pages link back to the directory');
}
assert(directory.includes('Car &amp; trailer &lt;sale&gt;'));
assert(!directory.includes('<script>'), 'Seller titles cannot inject markup');
assert(directory.includes('$45 / day'), 'Rental price states its daily unit');
assert(directory.includes('€'), 'Euro prices retain the currency symbol');
assert(directory.includes('Sint Maarten') && directory.includes('Saint-Martin'));
assert(directoryFor([]).includes('No listings available'), 'Empty catalog still has a useful page');
assert(directory.includes('<link rel="canonical" href="https://buyselltradesxm.com/l/">'));
const sitemap = sitemapFor(listings);
assert(sitemap.includes('<loc>https://buyselltradesxm.com/l/</loc>'));
assert(!sitemap.includes('2026-09-29'), 'Do not publish the obsolete fixed homepage modification date');
assert(!sitemap.includes('/s/'), 'Redirecting social preview pages stay out of the sitemap');
const root = path.join(__dirname, '..');
for (const file of ['index.html', 'marketplace.html']) {
  assert(fs.readFileSync(path.join(root, file), 'utf8').includes('href="/l/"'), `${file} exposes the directory without JavaScript`);
}
console.log('SEO discovery checks passed: homepage → directory → listings; escaping, currencies, rental units, empty state and sitemap.');

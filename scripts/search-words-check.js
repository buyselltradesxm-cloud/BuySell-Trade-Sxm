// French <-> English search: checks search-words.json and the website's translated search.
// Needs the site served locally (QA_BASE, default http://127.0.0.1:5173).
const fs = require('fs'), path = require('path'), assert = require('assert');
const {chromium} = require('playwright');
const base = process.env.QA_BASE || 'http://127.0.0.1:5173';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'search-words.json'), 'utf8'));
for(const group of data.groups){
  assert(group.length > 1, `group with one word: ${group}`);
  assert.strictEqual(new Set(group).size, group.length, `repeated word in ${group}`);
  // The apps fold accents and case themselves, but the list must already be folded to match.
  for(const w of group) assert(/^[a-z0-9]+( [a-z0-9]+)*$/.test(w), `"${w}" must be lowercase, no accents, single spaces`);
}

const cases = [
  // [query, listing, should match]
  ['fridge', {t:'Frigo Samsung', cat:'menag'}, true],
  ['fridges', {t:'Frigo Samsung', cat:'menag'}, true],
  ['frigo', {t:'Fridge for sale', cat:'menag'}, true],
  ['washing machine', {t:'Lave-linge Whirlpool', cat:'menag'}, true],
  ['washing machine samsung', {t:'Lave linge Samsung', cat:'menag'}, true],
  ['washing machine samsung', {t:'Lave linge LG', cat:'menag'}, false],
  ['bed', {t:'Lit double', cat:'meub'}, true],
  ['mattress', {t:'Lit double avec matelas', cat:'meub'}, true],
  ['sea view', {t:'Appartement vue mer', cat:'immo'}, true],
  ['air conditioner', {t:'Climatiseur 12000 BTU', cat:'menag'}, true],
  ['climatiseur', {t:'Accessoires et achat', cat:'elec'}, false],   // "ac" only as a whole word
  ['voiture', {t:'Vends canapé car je déménage', cat:'meub'}, false], // French "car" = because
  ['emploi', {t:'Laptop works great', cat:'elec'}, false],           // "work" is not a translation target
  ['chien', {t:'Puppy and dog toys', cat:'pets'}, true],
  ['stroller', {t:'Poussette Chicco', cat:'autres'}, true],
  ['lave linge', {t:'Lave-linge Whirlpool', cat:'menag'}, true],
  ['house', {t:'Matelas 140x190 et sommier', cat:'meub'}, false],    // not through the category name "Maison & meubles"
  ['room', {t:'Sweat homme, pièce unique', cat:'mode'}, false],
  ['room', {t:'Appartement 2 chambres', cat:'immo'}, true],
  ['bureau', {t:'Ground Floor Office/ Retail Space', cat:'immo'}, true],
  ['hoodie', {t:'Sweat à capuche Jack & Jones', cat:'mode'}, true],
  ['Réfrigérateur', {t:'fridge LG', cat:'autres'}, true],
];

(async()=>{
  const browser = await chromium.launch();
  for(const page of ['/', '/marketplace.html']){
    const p = await browser.newPage({serviceWorkers:'block'});
    await p.goto(base + page + '?local=1', {waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>typeof searchWordMap !== 'undefined' && searchWordMap && searchWordMap.size > 0, null, {timeout:15000});
    const got = await p.evaluate(cases=>cases.map(([q, l])=>listingMatchesQuery({desc:'', area:'Marigot', ...l}, q)), cases);
    cases.forEach(([q, l, want], i)=>assert.strictEqual(got[i], want, `${page}: "${q}" vs "${l.t}" should be ${want}`));
    await p.close();
    console.log(`${page}: ${cases.length} French/English search cases passed`);
  }
  await browser.close();
})().catch(e=>{ console.error(e.message || e); process.exitCode = 1; });

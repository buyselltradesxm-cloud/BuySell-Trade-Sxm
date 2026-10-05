/* Builds one static page per real listing (l/<id>.html) and the sitemap.

   The marketplace is a single page that loads its listings with JavaScript,
   so a search engine sees no listing at all. This writes a small plain-HTML
   page for every active listing that has a seller, and lists them in
   sitemap.xml. Example listings (no seller) are never published.

   Run by .github/workflows/listing-pages.yml. Locally:
     node scripts/build-listing-pages.js                 writes into the repo
     node scripts/build-listing-pages.js --out tmp --samples   preview with the examples
*/
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const outRoot = outArg >= 0 ? path.resolve(args[outArg + 1]) : root;
const includeSamples = args.includes("--samples");

const SITE = "https://buyselltradesxm.com";
const PAGE_SIZE = 1000;
const STATIC_URLS = [
  { loc: `${SITE}/`, lastmod: "2026-09-29" },
  { loc: `${SITE}/privacy.html` },
  { loc: `${SITE}/terms.html` }
];
const CATEGORIES = {
  voit: "Véhicules", immo: "Immobilier", elec: "Électronique", meub: "Maison & meubles",
  mode: "Mode", job: "Emploi", serv: "Services", pets: "Animaux", bat: "Bateaux",
  gaming: "Gaming", beauty: "Beauté", scoot: "Motos & scooters", locvoit: "Locations de voitures",
  menag: "Électroménager", food: "Alimentation & Boissons", lois: "Loisirs",
  billet: "Billetterie", pro: "Matériel pro", bonplan: "Bons plans", autres: "Divers"
};

const config = fs.readFileSync(path.join(root, "supabase-config.js"), "utf8");
const url = /window\.SUPABASE_URL\s*=\s*"([^"]+)"/.exec(config)?.[1];
const anonKey = /window\.SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(config)?.[1];
if (!url || !anonKey) {
  console.error("supabase-config.js has no SUPABASE_URL / SUPABASE_ANON_KEY");
  process.exit(1);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// The public key only returns what any visitor can read: approved listings
// that are not expired.
async function fetchListings() {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const query = new URLSearchParams({
      select: "id,title,description,category,area,side,currency,price_eur,price_usd,photos,created_at,status,seller_id",
      or: "(status.is.null,status.in.(active,reserved))",
      order: "id.asc"
    });
    if (!includeSamples) query.set("seller_id", "not.is.null");
    const res = await fetch(`${url}/rest/v1/listings?${query}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`
      }
    });
    if (!res.ok) throw new Error(`listings request failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function priceOf(l) {
  const usd = l.currency === "usd";
  const amount = Number(usd ? l.price_usd : l.price_eur) || 0;
  if (amount <= 0) return null;
  const text = amount.toLocaleString("fr-FR");
  return { amount, currency: usd ? "USD" : "EUR", label: usd ? `$${text}` : `${text} €` };
}

function firstPhoto(l) {
  const photo = (Array.isArray(l.photos) ? l.photos : []).find(p => typeof p === "string" && p.startsWith("https://"));
  return photo || null;
}

function pageFor(l) {
  const pageUrl = `${SITE}/l/${l.id}.html`;
  const appUrl = `/?listing=${encodeURIComponent(l.id)}`;
  const price = priceOf(l);
  const photo = firstPhoto(l);
  const category = CATEGORIES[l.category] || "";
  const place = [l.area, l.side === "nl" ? "Sint Maarten" : "Saint-Martin"].filter(Boolean).join(", ");
  const description = String(l.description || "").trim();
  const summary = [price?.label, place, description.replace(/\s+/g, " ")].filter(Boolean).join(" · ").slice(0, 160);
  const title = `${l.title}${price ? ` – ${price.label}` : ""} | Buy Sell Trade SXM`;
  const image = photo || `${SITE}/og-image.jpg`;

  const ld = price ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: description || undefined,
    image: photo || undefined,
    category: category || undefined,
    offers: {
      "@type": "Offer",
      url: pageUrl,
      price: price.amount,
      priceCurrency: price.currency,
      availability: "https://schema.org/InStock"
    }
  } : null;
  // "<" is escaped so listing text can never close the script element.
  const ldJson = ld ? JSON.stringify(ld).replace(/</g, "\\u003c") : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self' https:; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="canonical" href="${esc(pageUrl)}">
<meta name="description" content="${esc(summary)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(summary)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:site_name" content="Buy Sell Trade SXM">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="stylesheet" href="/listing-page.css">
${ldJson ? `<script type="application/ld+json">${ldJson}</script>\n` : ""}</head>
<body>
<header><a href="/">Buy Sell Trade SXM</a></header>
<main>
${photo ? `<img class="photo" src="${esc(photo)}" alt="${esc(l.title)}">\n` : ""}<h1>${esc(l.title)}</h1>
${price ? `<p class="price">${esc(price.label)}</p>\n` : ""}<p class="meta">${esc([category, place].filter(Boolean).join(" · "))}</p>
${description ? `<p class="description">${esc(description)}</p>\n` : ""}<p><a class="cta" href="${esc(appUrl)}">Voir l'annonce et contacter le vendeur<br><span lang="en">View the listing and contact the seller</span></a></p>
<p class="more"><a href="/">Toutes les petites annonces de Saint-Martin et Sint Maarten</a></p>
</main>
</body>
</html>
`;
}

function sitemapFor(listings) {
  const entries = STATIC_URLS.concat(listings.map(l => ({
    loc: `${SITE}/l/${l.id}.html`,
    lastmod: l.created_at ? String(l.created_at).slice(0, 10) : undefined
  })));
  const body = entries.map(e =>
    `  <url>\n    <loc>${esc(e.loc)}</loc>\n${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ""}  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

(async () => {
  const listings = (await fetchListings()).filter(l => /^[\w-]+$/.test(String(l.id)) && l.title);
  const dir = path.join(outRoot, "l");
  fs.mkdirSync(dir, { recursive: true });

  const wanted = new Set(listings.map(l => `${l.id}.html`));
  let removed = 0;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".html") && !wanted.has(file)) {
      fs.unlinkSync(path.join(dir, file));
      removed++;
    }
  }
  for (const l of listings) fs.writeFileSync(path.join(dir, `${l.id}.html`), pageFor(l));
  // Git does not track an empty folder; don't leave one behind.
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);

  fs.writeFileSync(path.join(outRoot, "sitemap.xml"), sitemapFor(listings));
  console.log(`${listings.length} listing page(s) written, ${removed} removed, sitemap has ${STATIC_URLS.length + listings.length} URLs`);
})().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

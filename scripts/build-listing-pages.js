/* Builds one static page per real listing (l/<id>.html) and the sitemap,
   plus a share page (s/<id>.html + s/<id>.jpg) whose link preview shows the
   listing photo with the Buy Sell Trade SXM logo on it.

   The marketplace is a single page that loads its listings with JavaScript,
   so a search engine sees no listing at all. This writes a small plain-HTML
   page for every active listing that has a seller, and lists them in
   sitemap.xml. Example listings (no seller) are never published.

   Needs the "sharp" image package (the workflow installs it).
   Run by .github/workflows/listing-pages.yml. Locally:
     node scripts/build-listing-pages.js                 writes into the repo
     node scripts/build-listing-pages.js --out tmp --samples   preview with the examples
*/
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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
  // Food & Drinks listings are menus: the app shows no price for them, so neither do these pages.
  if (l.category === "food") return null;
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

// 1200x630 preview: the whole photo over a blurred copy of itself, logo badge bottom-right
// of the centre square, so it survives apps that crop the preview to a square.
async function shareImage(photoUrl) {
  // Listing rows are seller-written: only fetch from our own photo storage, bounded in time and size.
  if (!photoUrl.startsWith(`${url}/storage/v1/object/public/`)) throw new Error("photo not in project storage");
  const res = await fetch(photoUrl, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`photo ${res.status}`);
  if (Number(res.headers.get("content-length")) > 15e6) throw new Error("photo too large");
  const photo = Buffer.from(await res.arrayBuffer());
  if (photo.length > 15e6) throw new Error("photo too large");
  const W = 1200, H = 630, LOGO = 170, PAD = 24;
  const bg = await sharp(photo).rotate().resize(W, H, { fit: "cover" }).blur(30).modulate({ brightness: 0.7 }).toBuffer();
  const fg = await sharp(photo).rotate().resize(W, H, { fit: "inside" }).toBuffer();
  const circle = Buffer.from(`<svg width="${LOGO}" height="${LOGO}"><circle cx="${LOGO / 2}" cy="${LOGO / 2}" r="${LOGO / 2 - 4}"/></svg>`);
  const logo = await sharp(path.join(root, "icons", "icon-512.png")).resize(LOGO, LOGO)
    .composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  return sharp(bg).composite([
    { input: fg, gravity: "center" },
    { input: logo, left: (W + H) / 2 - LOGO - PAD, top: H - LOGO - PAD }
  ]).jpeg({ quality: 82 }).toBuffer();
}

// Read by WhatsApp/Facebook/etc. for the preview; people are sent straight on to the listing.
function sharePageFor(l, image) {
  const appUrl = `/?listing=${encodeURIComponent(l.id)}`;
  const price = priceOf(l);
  const title = `${l.title}${price ? ` – ${price.label}` : ""} | Buy Sell Trade SXM`;
  const place = [l.area, l.side === "nl" ? "Sint Maarten" : "Saint-Martin"].filter(Boolean).join(", ");
  const summary = [price?.label, place, String(l.description || "").trim().replace(/\s+/g, " ")].filter(Boolean).join(" · ").slice(0, 160);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">
<meta http-equiv="refresh" content="0;url=${esc(appUrl)}">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<link rel="canonical" href="${esc(`${SITE}/l/${l.id}.html`)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(summary)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${esc(`${SITE}/s/${l.id}.html`)}">
<meta property="og:site_name" content="Buy Sell Trade SXM">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
</head>
<body><p><a href="${esc(appUrl)}">${esc(l.title)}</a></p></body>
</html>
`;
}

function pageFor(l, shareImg) {
  const pageUrl = `${SITE}/l/${l.id}.html`;
  const appUrl = `/?listing=${encodeURIComponent(l.id)}`;
  const price = priceOf(l);
  const photo = firstPhoto(l);
  const category = CATEGORIES[l.category] || "";
  const place = [l.area, l.side === "nl" ? "Sint Maarten" : "Saint-Martin"].filter(Boolean).join(", ");
  const description = String(l.description || "").trim();
  const summary = [price?.label, place, description.replace(/\s+/g, " ")].filter(Boolean).join(" · ").slice(0, 160);
  const title = `${l.title}${price ? ` – ${price.label}` : ""} | Buy Sell Trade SXM`;
  const image = shareImg || photo || `${SITE}/og-image.jpg`;

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
  const shareDir = path.join(outRoot, "s");
  fs.mkdirSync(shareDir, { recursive: true });
  const wantedShare = new Set(listings.flatMap(l => [`${l.id}.html`, `${l.id}.jpg`]));
  for (const file of fs.readdirSync(shareDir)) {
    if (!wantedShare.has(file)) fs.unlinkSync(path.join(shareDir, file));
  }

  let branded = 0;
  for (const l of listings) {
    let shareImg = null;
    const photo = firstPhoto(l);
    if (photo) {
      try {
        fs.writeFileSync(path.join(shareDir, `${l.id}.jpg`), await shareImage(photo));
        shareImg = `${SITE}/s/${l.id}.jpg`;
        branded++;
      } catch (err) {
        // A broken photo must not stop the other pages; this one falls back to the plain image.
        console.warn(`listing ${l.id}: no share image (${err.message})`);
        fs.rmSync(path.join(shareDir, `${l.id}.jpg`), { force: true });
      }
    }
    fs.writeFileSync(path.join(dir, `${l.id}.html`), pageFor(l, shareImg));
    fs.writeFileSync(path.join(shareDir, `${l.id}.html`), sharePageFor(l, shareImg || photo || `${SITE}/og-image.jpg`));
  }
  // Git does not track an empty folder; don't leave one behind.
  for (const d of [dir, shareDir]) if (!fs.readdirSync(d).length) fs.rmdirSync(d);

  fs.writeFileSync(path.join(outRoot, "sitemap.xml"), sitemapFor(listings));
  console.log(`${listings.length} listing page(s) written (${branded} share image(s)), ${removed} removed, sitemap has ${STATIC_URLS.length + listings.length} URLs`);
})().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const site = 'https://buyselltradesxm.com';
const apple = 'https://apps.apple.com/app/id6809964445';
const play = 'https://play.google.com/store/apps/details?id=com.korekdigitalmarketing.buyselltradesxm&referrer=' + encodeURIComponent('utm_source=buyselltradesxm&utm_medium=website&utm_campaign=app_download');
for (const lang of ['en','fr']) {
  const fr = lang === 'fr';
  const file = fr ? 'app-fr.html' : 'app.html';
  const title = fr ? 'Application de petites annonces SXM' : 'The local marketplace app for SXM';
  const description = fr ? 'Achetez et vendez à Saint-Martin et Sint Maarten. Consultez les annonces, publiez des photos et échangez avec les vendeurs en français ou en anglais.' : 'Buy and sell across Saint-Martin and Sint Maarten. Browse local listings, post photos and message sellers in English or French.';
  fs.writeFileSync(path.join(root,file), `<!DOCTYPE html>
<html lang="${lang}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.google-analytics.com; connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'none'">
<title>${title} | Buy Sell Trade SXM</title><meta name="description" content="${description}">
<link rel="canonical" href="${site}/${file}"><link rel="alternate" hreflang="en" href="${site}/app.html"><link rel="alternate" hreflang="fr" href="${site}/app-fr.html"><link rel="alternate" hreflang="x-default" href="${site}/app.html">
<meta property="og:title" content="${title} | Buy Sell Trade SXM"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${site}/${file}"><meta property="og:image" content="${site}/og-image.jpg">
<link rel="icon" href="/icons/favicon-32.png"><link rel="stylesheet" href="/app-download.css">
<script src="/ads-config.js" defer></script><script src="/consent.js" defer></script><script src="/analytics.js" defer></script>
</head><body>
<header><nav class="wrap" aria-label="${fr?'Navigation principale':'Main navigation'}"><a class="brand" href="/"><img src="/icons/icon-192.png" alt="" width="48" height="48">Buy Sell Trade SXM</a><a href="/${fr?'app.html':'app-fr.html'}" lang="${fr?'en':'fr'}" hreflang="${fr?'en':'fr'}">${fr?'English':'Français'}</a></nav></header>
<main id="main"><section class="hero wrap"><div><p>Saint-Martin · Sint Maarten</p><h1>${title}</h1><p class="lead">${description}</p>
<div class="actions"><a class="button" data-store="app_store" data-placement="download_page" href="${apple}" target="_blank" rel="noopener">${fr?'Télécharger sur l’App Store':'Download on the App Store'}</a><a class="button" data-store="google_play" data-placement="download_page" href="${play.replace(/&/g,'&amp;')}" target="_blank" rel="noopener">${fr?'Télécharger sur Google Play':'Download on Google Play'}</a></div><p><a href="/#browse">${fr?'Utiliser la marketplace sur le web':'Use the marketplace on the web'}</a></p></div><img class="hero-logo" src="/icons/icon-512.png" alt="Buy Sell Trade SXM" width="512" height="512"></section>
<section class="features"><div class="wrap"><h2>${fr?'Vos annonces, des deux côtés de l’île':'Your listings, both sides of the island'}</h2><ul>
<li>${fr?'Trouvez des véhicules, logements, meubles, appareils, locations et services près de chez vous.':'Find vehicles, property, furniture, electronics, rentals and services nearby.'}</li>
<li>${fr?'Publiez une annonce avec vos photos et un prix en euros ou en dollars.':'Post a listing with your photos and a price in euros or US dollars.'}</li>
<li>${fr?'Gardez vos favoris et contactez les vendeurs dans la messagerie.':'Save favourites and contact sellers through messaging.'}</li></ul>
<p class="note">${fr?'Les annonces des particuliers sont gratuites. Les boosts et abonnements Pro sont payants. Un compte gratuit peut envoyer jusqu’à 5 messages par annonce.':'Personal listings are free. Boosts and Pro subscriptions are paid options. Free accounts can send up to 5 messages per listing.'}</p>
<p><a href="/l/">${fr?'Consulter toutes les annonces locales':'Browse all local listings'}</a></p></div></section></main>
<footer><div class="wrap"><a href="https://buyselltradesxm-cloud.github.io/legal/privacy.html">${fr?'Confidentialité':'Privacy'}</a><a href="/terms.html">${fr?'Conditions d’utilisation':'Terms of use'}</a><button class="link" type="button" data-cookie-choices>${fr?'Choix des cookies':'Cookie choices'}</button></div></footer>
</body></html>\n`);
}

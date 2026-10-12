# AdMob — bannière native (app Android/iOS)

L'app Android/iOS est un wrapper Capacitor qui charge buyselltradesxm.com
dans une WebView (voir `capacitor.config.json`). Le site utilise Google
AdSense (`ads-config.js` → `adsense`), mais AdSense n'est pas autorisé
dans une app native empaquetée — il faut le vrai SDK AdMob à la place.

## Ce qui est déjà en place

```text
Plugin:        @capacitor-community/admob (package.json)
Bannière web:  <aside data-admob-placement="sticky-bottom"> (index.html, marketplace.html)
Bootstrap:     native-admob.js (chargé avant ads.js, no-op hors app native)
Config:        ads-config.js → AdsConfig.admob (id d'annonce bannière)
Android:       AndroidManifest.xml + strings.xml (admob_app_id)
iOS:           Info.plist (GADApplicationIdentifier, ATT, SKAdNetwork)
```

Quand l'app tourne en natif, `native-admob.js` détecte Capacitor, cache le
slot web `sticky-bottom` (l'annonce AdSense n'y va plus) et affiche une
vraie bannière AdMob ancrée au-dessus de la barre d'onglets mobile. Le
reste de la page (`ads.js`) désactive AdSense partout quand ce mode est
actif, mais garde les promos maison et les campagnes vendues en direct.

The Android interstitial is checked only when a listing detail closes. It
becomes eligible after 90 seconds of foreground use, then after each further
3 minutes of foreground use. This avoids timed interruptions while someone is
reading. iOS interstitials remain disabled until the AdMob plugin is included
in the iOS target and a production iOS interstitial unit is configured.

Actuellement les identifiants sont ceux de **TEST** de Google — des
fausses pubs sans danger, aucun risque pour le compte.

## Étapes pour passer en argent réel

1. **admob.google.com** → créer un compte (lié à ton compte Google).
2. **Ajouter l'app** → une fois pour Android, une fois pour iOS. Chaque
   app te donne un **App ID** (`ca-app-pub-XXXX~XXXX`).
3. **Créer un bloc d'annonce Bannière** par plateforme (Ads → Ad units).
   Chaque bloc donne un **Ad unit ID** (`ca-app-pub-XXXX/XXXX`).
4. Coller les **App ID**:
   - Android → `android/app/src/main/res/values/strings.xml` (`admob_app_id`)
   - iOS → `ios/App/App/Info.plist` (`GADApplicationIdentifier`)
5. Coller les **Ad unit ID** dans `ads-config.js` → `AdsConfig.admob.banner`
   (`android` et `ios`). C'est le seul fichier à éditer côté site.
6. Passer `AdsConfig.admob.testing` à `false`.
7. `npx cap sync`, puis rebuild (`npm run cap:open:android` /
   `npm run cap:open:ios`, ou le workflow cloud — voir `IOS_CLOUD_BUILD.md`).

## Règles à respecter (sinon bannissement AdMob)

- Ne jamais cliquer sur ses propres pubs — garder les ID de test tant
  que ce n'est pas prêt pour la review des stores.
- **Consentement RGPD/UMP** : dans la console AdMob → *Confidentialité
  et messages* → créer un message RGPD et un message US, puis publier.
  Sans ça, `AdMob.requestConsentInfo()` ne retourne aucun formulaire.
- **Google Play → Sécurité des données** : déclarer la collecte
  d'identifiants publicitaires (voir `ANDROID_PLAY_SETUP.md`).
- **Seuil de paiement** : AdMob paie à partir d'environ 100 $ cumulés.

## Réglage visuel

Le margin de la bannière (`native-admob.js`, valeur `64`) écarte la pub
de la barre d'onglets mobile. C'est une estimation — à ajuster après un
vrai test sur appareil (`android-emulator-*.png` montre le rendu actuel
de la barre du bas).

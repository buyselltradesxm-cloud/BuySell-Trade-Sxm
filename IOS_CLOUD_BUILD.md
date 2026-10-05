# iOS Cloud Build Sans Mac

Ce projet peut etre compile pour iPhone avec GitHub Actions sur macOS, sans avoir de Mac personnel.

## Ce qui est deja pret

```text
App name: Buy Sell Trade SXM
Bundle ID: com.korekdigitalmarketing.buyselltradesxm
Apple Team ID: CJ7X9S5JDT
App Store Connect ID: 6809964445
GitHub repo: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm
Workflow: .github/workflows/mobile-ios-cloud.yml
```

## Test rapide sans secrets Apple

Dans GitHub:

1. Ouvrir le repo: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm
2. Aller dans `Actions`.
3. Choisir `Mobile iOS Cloud Build`.
4. Cliquer `Run workflow`.
5. Choisir `simulator`.

Ce test verifie que le projet iOS compile dans le cloud. Il ne donne pas une app installable sur iPhone.

## Build iPhone pour TestFlight / App Store

Pour produire un IPA signe et l'envoyer a App Store Connect, GitHub utilise une cle API App Store Connect et la signature automatique Xcode.

Les secrets GitHub requis sont:

```text
APP_STORE_CONNECT_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_BASE64
```

Ensuite:

1. Ouvrir le repo GitHub.
2. Aller dans `Settings` > `Secrets and variables` > `Actions`.
3. Ajouter les secrets.
4. Aller dans `Actions` > `Mobile iOS Cloud Build`.
5. Cliquer `Run workflow`.
6. Choisir `app-store`.

Le workflow cree un IPA signe, le garde comme artifact GitHub, puis l'envoie vers App Store Connect.

## Secrets Apple actuels

Ces secrets ont ete ajoutes dans GitHub pour Buy Sell Trade SXM:

```text
APP_STORE_CONNECT_KEY_ID:
  Y6J4C3L34P

APP_STORE_CONNECT_ISSUER_ID:
  d813053b-d1e0-409c-8b4a-607fd670049e

APP_STORE_CONNECT_API_KEY_BASE64:
  Fichier AuthKey_Y6J4C3L34P.p8 de App Store Connect, converti en base64.
```

## Commande Windows pour convertir une cle API en base64

Depuis PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\AuthKey_KEYID.p8")) | Set-Clipboard
```

Colle ensuite le resultat dans le secret GitHub correspondant.

## Important

Android peut etre build et teste sur ce PC Windows.

iOS peut etre prepare ici, mais Apple exige un build macOS/Xcode. GitHub Actions fournit ce Mac dans le cloud.

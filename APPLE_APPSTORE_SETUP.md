# Connecting Buy Sell Trade SXM to the Apple App Store

The `ios/` project is the same Capacitor webview wrapper as Android — it loads
`https://buyselltradesxm.com`. This is the App Store counterpart of
`ANDROID_PLAY_SETUP.md`.

- App / bundle ID: `com.korekdigitalmarketing.buyselltradesxm`
- GitHub repo: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm
- Apple Team ID: `CJ7X9S5JDT`  ·  App Store Connect app ID: `6809964445`
- Account: `korekdigitalmarketing@gmail.com` (same pro account as Play)
- Build/publish workflow: `.github/workflows/mobile-ios-cloud.yml`
  (Actions → "Mobile iOS Cloud Build" → Run workflow — runs on GitHub's macOS
  runners, no Mac needed)
- FR quick-start + the current key values: `IOS_CLOUD_BUILD.md`

A workflow run with `build_type = app-store` produces a signed IPA artifact and
(unless `upload_to_appstore` is unchecked) sends it to App Store Connect, where
it lands in **TestFlight**. Promotion to the public App Store is a manual
review submission in App Store Connect.

---

## 1. App Store Connect API key (once)

<https://appstoreconnect.apple.com> → **Users and Access** → **Integrations**
(**Keys**) → **App Store Connect API** → **+**:

- Name: `github-ci`
- Access: **App Manager** (Admin also works)
- **Generate**, then **Download** the `AuthKey_XXXXXXXX.p8` — you can only
  download it once. Store it in your password manager.

From that page collect:

| Value | Where |
| --- | --- |
| **Key ID** | the row for the key you just made (e.g. `Y6J4C3L34P`) |
| **Issuer ID** | the UUID shown above the keys table (e.g. `d813053b-…`) |

Base64-encode the `.p8`:

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\AuthKey_KEYID.p8")) | Set-Clipboard
```
```bash
# macOS / Linux
base64 -w0 AuthKey_KEYID.p8
```

---

## 2. GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Value |
| --- | --- |
| `APP_STORE_CONNECT_KEY_ID` | the Key ID from step 1 |
| `APP_STORE_CONNECT_ISSUER_ID` | the Issuer ID from step 1 |
| `APP_STORE_CONNECT_API_KEY_BASE64` | the base64 of the `.p8` |

`IOS_CLOUD_BUILD.md` records the values already provisioned for this project.
With all three set, the `app-store` job archives, signs with **Apple
Distribution** via Xcode automatic signing (`-allowProvisioningUpdates` creates
the provisioning profile on first run), exports, and uploads. Without them the
job fails fast and tells you to use `build_type = simulator` instead.

---

## 3. The app record in App Store Connect

App ID `6809964445` already exists (Sign in with Apple is enabled on it). Before
a build can be **submitted for review** (TestFlight only needs the build), fill
in under that app:

- **App Information**: category, content rights, age rating questionnaire.
- **Privacy Policy URL**: `https://buyselltradesxm.com/privacy.html`
- **App Privacy** ("Data collected"): the app collects account info (email,
  name), user content (listings, messages, photos), and identifiers. Declare
  them honestly — a marketplace with accounts is not "no data collected".
- **Pricing and Availability**: Free, choose territories.
- **Prepare for Submission** (the version page): screenshots (6.7" and 6.5"
  iPhone at minimum), description, keywords, support URL, marketing URL.
- **Export compliance**: already answered in the binary —
  `ITSAppUsesNonExemptEncryption = false` is set in `ios/App/App/Info.plist`
  (HTTPS + standard crypto only), so TestFlight builds are not held on
  "Missing Compliance". If you ever add non-exempt crypto, remove that key.
- **Sign in with Apple**: because Apple sign-in is offered, Apple requires it
  to sit alongside the other third-party sign-in options (Google) — it does.

---

## 4. Run it

Actions → **Mobile iOS Cloud Build** → **Run workflow**:

| Inputs | Result |
| --- | --- |
| `build_type = simulator` | just checks the iOS project compiles in the cloud. No secrets needed. Not installable. |
| `build_type = app-store`, `upload_to_appstore = false` | signed IPA as a downloadable artifact (`BuySellTradeSXM-iOS-IPA`), no upload. |
| `build_type = app-store`, `upload_to_appstore = true` | signed IPA + upload to App Store Connect → appears in **TestFlight** after Apple processes it (5–30 min). |
| `marketing_version = 1.0.1` | optional — overrides `CFBundleShortVersionString`. Build number is auto-managed by App Store Connect (`manageAppVersionAndBuildNumber`). |

First upload for a brand-new provisioning profile can take a few minutes while
`-allowProvisioningUpdates` registers it.

---

## 5. TestFlight → App Store

1. In **TestFlight**, add the build to an internal testing group; install via
   the TestFlight app on a real device and sanity-check it.
2. Complete any "Missing Compliance" / test-info prompts (should be none, given
   step 3).
3. On the version's **Prepare for Submission** page, attach the build →
   **Add for Review** → **Submit**. Apple review for a webview wrapper is the
   riskiest step — see notes.

---

## Notes / risks

- **Guideline 4.2 (minimum functionality).** A thin webview of a website is a
  common rejection. Mitigations: the app has native shell behaviours (splash,
  push), offers real account + messaging value, and isn't just a bookmark.
  Be ready to argue this in the review notes, or add a native touch or two.
- **Guideline 3.1.1 (in-app purchase).** Fine as long as the app sells only
  physical goods / real-world services between users — no digital content or
  subscriptions sold inside the app. Pro subscriptions, if ever sold in-app,
  would need Apple IAP.
- **Native APNs push** is not set up (browser/PWA push works). Not required
  for submission.
- **Android / Play** counterpart: `ANDROID_PLAY_SETUP.md`.

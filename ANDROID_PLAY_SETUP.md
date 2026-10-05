# Connecting Buy Sell Trade SXM to Google Play

The Android project (`android/`) is a Capacitor webview wrapper around
`https://buyselltradesxm.com`. This doc turns it into something Google Play
will accept: a **signed release AAB** built and uploaded by CI.

- App / package ID: `com.korekdigitalmarketing.buyselltradesxm`
- GitHub repo: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm
- Play + Apple are the same pro account: `korekdigitalmarketing@gmail.com`
- Build/publish workflow: `.github/workflows/mobile-android-cloud.yml`
  (manual — Actions → "Mobile Android Cloud Build" → Run workflow)

Everything below is **one-time setup**. After it, every workflow run produces a
signed AAB artifact, and picking a track (`internal` / `alpha` / …) also pushes
it to Play as a **draft** release.

---

## 1. Create the upload keystore (once, keep it forever)

You need a machine with the JDK (`keytool`). Run:

```bash
keytool -genkeypair -v \
  -keystore buyselltradesxm-upload.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Korek Digital Marketing, O=Korek Digital Marketing, C=SX"
```

It asks for a **store password** and a **key password** — use strong ones and
save them in your password manager. **If you lose this file or its passwords you
can never update the app again** (unless you enrol in Play App Signing key reset,
which is slow). Back it up somewhere safe and offline.

> Play App Signing: Google will re-sign with its own app-signing key on their
> side; the `.jks` above is only your *upload* key. That's the normal, safe setup.

Base64-encode it for the GitHub secret:

```bash
# macOS / Linux
base64 -w0 buyselltradesxm-upload.jks > keystore.b64
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("buyselltradesxm-upload.jks")) > keystore.b64
```

---

## 2. GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password from step 1 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the key password from step 1 |
| `PLAY_SERVICE_ACCOUNT_JSON` | the JSON from step 4 (add after you have it) |

With only the first four set, the workflow builds and signs the AAB but skips
the Play upload (choose track `none`, or leave `PLAY_SERVICE_ACCOUNT_JSON`
unset). Add the fifth to enable publishing.

Local builds: instead of env vars you can drop a **git-ignored**
`keystore.properties` at the repo root:

```properties
storeFile=/absolute/path/buyselltradesxm-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

`android/app/build.gradle` reads env vars first, then this file, then falls
back to an unsigned release.

---

## 3. Create the app in Play Console

1. <https://play.google.com/console> → **Create app**
   - App name: **Buy Sell Trade SXM**
   - Default language, App/Game: App, Free
   - Accept the declarations
2. The package name is fixed by the **first upload**, so it must be
   `com.korekdigitalmarketing.buyselltradesxm`.
3. Do the mandatory pre-launch paperwork (Play won't publish without it):
   Privacy policy URL (`https://buyselltradesxm.com/privacy.html`), Data
   safety form, Content rating questionnaire, Target audience, Ads
   declaration, App access (give a test login if content is behind auth),
   Government apps / Financial features as applicable.
4. **First AAB must be uploaded by hand.** Create a **Closed testing →
   Internal testing** release, upload the artifact from a workflow run
   (download `BuySellTradeSXM-android-aab`), and roll it out to internal
   testers. The Play Developer API cannot create the very first release.

> New personal Play accounts must run **closed testing with ≥12 testers for
> 14 days** before production. An **organisation** account is exempt. Check
> which type `korekdigitalmarketing@gmail.com` is under Console → Account
> details before planning the production date.

---

## 4. Service account for API uploads

1. Play Console → **Users & permissions** → **Invite new users**? No — first:
   Console → **Setup → API access** → link a Google Cloud project (create one,
   e.g. "buyselltradesxm-play").
2. In that Cloud project: **APIs & Services** → enable **Google Play Android
   Developer API**.
3. **IAM & Admin → Service Accounts → Create**: name `play-publisher`, no roles
   needed at the Cloud level. Create a **JSON key** and download it.
4. Back in Play Console → **API access** → the new service account appears →
   **Grant access** → give it **Admin (all permissions)** or at minimum:
   *Releases* → "Create and edit draft releases" + "Release to testing tracks".
5. Put the JSON's full contents into the `PLAY_SERVICE_ACCOUNT_JSON` GitHub
   secret. Do **not** commit it.

Propagation can take a few minutes to a few hours before the API accepts it.

---

## 5. Run it

Actions → **Mobile Android Cloud Build** → **Run workflow**:

- `track = none` → just build + sign, download the `.aab` artifact (use this
  for the manual first upload in step 3).
- `track = internal` (after steps 3–4) → build, sign, and push a **draft**
  release to the Internal testing track. Promote/roll out from Play Console.
- `version_name` optional (e.g. `1.0.1`); `versionCode` auto-increments from
  the workflow run number.

---

## What this does NOT set up

- **Native FCM push** for the Android app. Browser/PWA push already works
  (`push-notifications.js` + `send-push` function). A native app needs
  `google-services.json` + the FCM plugin — a separate task, not required to
  get on the Play Store.
- **iOS** — that's `.github/workflows/mobile-ios-cloud.yml` +
  `IOS_CLOUD_BUILD.md`.
- Store listing assets (screenshots, feature graphic, short/long
  description) — done in Play Console, not in the repo.

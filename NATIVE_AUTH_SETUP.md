# Trip Kit — Native Sign-In Setup (Apple / Google) — STATUS: IMPLEMENTED 2026-11-28

The app's web layer uses the Firebase JavaScript SDK. Inside the iOS/Android
WebView, Firebase's JS `signInWithRedirect` does **not** work reliably (Google
blocks OAuth in embedded WebViews, and Firebase redirect needs cross-origin
cookies/iframes on `firebaseapp.com`).

The code signs in through the **native OS account chooser** via
`@capacitor-firebase/authentication`, then bridges the credential into the JS
SDK with `signInWithCredential` (`skipNativeAuth: true`). This is done in
`src/services/googleSignIn.ts` and `src/firebase.ts`.

## ✅ Completed on 2026-11-28 (all done via the logged-in consoles on this machine)

Firebase project `gen-lang-client-0485600047` (display name "Default Gemini Project"):

- [x] **Authentication → Sign-in method**: Apple provider **enabled** (verified:
      shows "Apple 已启用"). Google + Email/Password were already enabled.
      - NOTE: Firebase's Apple provider config page explicitly says the
        **Service ID is NOT needed for Apple-platform apps** — native sign-in
        via the OS account chooser + `signInWithCredential` does not require an
        Apple Services ID / private key. Only web/redirect flows would.
- [x] **iOS app registered** — bundle id `com.bagail.tripkit`, app ID
      `1:322510449832:ios:9897559391115813a7e69d`.
      - `GoogleService-Info.plist` downloaded and placed at
        `ios/App/App/GoogleService-Info.plist`, **added to the Xcode target**
        (PBXFileReference + PBXBuildFile in Resources + group).
      - iOS native client ID: `322510449832-cto91qhppfam16lr6lpf3m9frfg4o9c3.apps.googleusercontent.com`
        (REVERSED: `com.googleusercontent.apps.322510449832-cto91qhppfam16lr6lpf3m9frfg4o9c3`).
- [x] **Android app registered** — package `com.bagail.tripkit`, app ID
      `1:322510449832:android:69bcd528746bb3d7a7e69d`.
      - `google-services.json` downloaded and placed at `android/app/google-services.json`.
        Gradle applies `com.google.gms.google-services` automatically when present.
- [x] **Android SHA-1 registered** on the Firebase Android app:
      `BC:4B:18:F6:82:5A:CA:CD:A7:9D:CC:D2:93:01:F2:E5:EE:E6:53:2A`
      (from `~/.private_keys/tripkit-upload-key.jks`, alias `tripkit-upload`;
      password in `~/.private_keys/tripkit-upload-key.pass.txt`). Verified in
      Firebase console after save + reload.
- [x] **URL schemes added** on both platforms (reversed iOS client ID):
      - `ios/App/App/Info.plist` → `CFBundleURLTypes` with scheme
        `com.googleusercontent.apps.322510449832-cto91qhppfam16lr6lpf3m9frfg4o9c3`
      - `android/app/src/main/AndroidManifest.xml` → browsable intent-filter with
        the same scheme.

Apple Developer console (team `Suzhou Chengmei Network Technology Company Limited`,
ID `68X63L5658`, account holder access):

- [x] App ID `com.bagail.tripkit` (identifier id `CTP3LWG46F`) → **Sign In with
      Apple capability enabled** (verified after reload: `APPLE_ID_AUTH` checked).
      The save shows a "Modify App Capabilities" confirm dialog → click **Confirm**
      (a plain JS `.click()` on Save opens it; then the Confirm button needs a
      trusted CDP mouse click).
- [x] Provisioning profile **"TripKit App Store"** (id `F2QJ29ZJ9R`) regenerated
      (was Invalidated by the capability change) → now contains entitlement
      `com.apple.developer.applesignin = ["Default"]`. Downloaded and installed to
      `~/Library/MobileDevice/Provisioning Profiles/TripKit_App_Store.mobileprovision`.
- [x] Created `ios/App/App/App.entitlements` with `com.apple.developer.applesignin`
      and wired `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` into the Xcode
      target. Manual signing is set **in the pbxproj App target only**
      (`CODE_SIGN_STYLE = Manual`, `CODE_SIGN_IDENTITY = "Apple Distribution"`,
      `PROVISIONING_PROFILE_SPECIFIER = "TripKit App Store"`, `DEVELOPMENT_TEAM = 68X63L5658`).
      - IMPORTANT: do NOT pass `PROVISIONING_PROFILE_SPECIFIER` as an `xcodebuild`
        command-line override — it propagates to SPM package targets (Firebase,
        GoogleUtilities, AppAuth…) which reject it with
        "…does not support provisioning profiles". Put it in the pbxproj instead.

## Build / publish (v4, 2026-11-28)

- `npm run build` + `npx cap sync` (plugins: capacitor-firebase/app & authentication 8.6.0).
- Android: `JAVA_HOME=<_tools/jdk/jdk-21.0.13.1+2/Contents/Home> ./gradlew bundleRelease`
  (JDK 17 fails with "无效的源发行版：21" — must use JDK 21).
  → `_downloads/TripKit-1.0.1-v4-release-internal-test.aab`. Published to Google
  Play internal testing track; verified "有效最新版本：4 (1.0.1)".
- iOS: `xcodebuild archive` + `exportArchive` (manual signing via pbxproj) →
  `_downloads/TripKit-1.0.1-v4-testflight.ipa`. Verified the app binary contains
  both `GoogleService-Info.plist` and the `applesignin` entitlement. Uploaded to
  TestFlight via `xcrun altool --upload-app ... --apiKey XDPBTG9PUS --apiIssuer b69ff0f1-c417-4610-8774-4110a7a4eecb`.

## Remaining verification (needs a real device / TestFlight build)

- [ ] Tap **Sign in with Apple** → native Apple sheet appears → returns signed in
- [ ] Tap **Sign in with Google** → native Google flow → returns signed in
- [ ] Force-quit and reopen → still signed in (IndexedDB persistence)
- [ ] Firestore reads work with the signed-in user
- [ ] Web build (`npm run dev`) still signs in via popup

These require installing TestFlight build 4 on a real iPhone and the internal-test
build on Android; they cannot be verified from this machine (no simulators/devices
were available).

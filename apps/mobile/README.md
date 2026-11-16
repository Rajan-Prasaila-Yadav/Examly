# Examly mobile

Google login uses the native Google Sign-In SDK on Android/iOS and browser OAuth on web. Expo Go cannot run native Google Sign-In; install an Examly development build or release build.

## Google Cloud configuration

1. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to a **Web application** OAuth client ID. The API's `GOOGLE_CLIENT_ID` must match it. Native login sends an ID token to `/api/v1/auth/google`, where its signature, audience and verified email are checked.
2. In the same Google Cloud project, create an **Android** OAuth client for package `com.examly.student` and the signing certificate's SHA-1. Register each certificate used: local debug, distributed APK, and Play App Signing as applicable. Run `android/gradlew.bat signingReport` to inspect local certificates. An Android client ID is not passed to the native SDK.
3. For iOS, create an **iOS** OAuth client for `com.examly.student` and set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. The Expo config derives its reversed client URL scheme. Rebuild after changing this value.
4. If the OAuth consent screen is in Testing, add the accounts that will test login as test users.
5. Set `EXPO_PUBLIC_API_URL` to a server reachable by the phone. For USB development with the existing localhost URL, run `adb reverse tcp:4000 tcp:4000`. Distributed builds need a public HTTPS API URL.

## Build and test

From this directory, run `npm run android` to build/install the Android development app; start Metro with `npm start`. Open **Examly**, not Expo Go. Android SDK and JDK 17 are required locally. Alternatively, `npx eas-cli build --platform android --profile preview` creates a distributable APK; supply the public environment variables in that build environment.

Run `npm run typecheck` and `node --test scripts/test-google-login.cjs` for local checks. On the phone, verify successful account selection, cancellation, logout and another login, and session restoration after reopening the app. Native Google login and Google Cloud certificate registration require a real-device check; TypeScript and mocked tests cannot establish those results.

Reference: https://docs.expo.dev/guides/google-authentication/

The current local debug/release build has SHA-1 `FE:89:D4:93:F2:67:EB:8C:BA:11:F2:DF:8B:02:42:C3:AF:1A:5E:38` for package `com.examly.student`. Register this exact pair in the Android OAuth client used for local USB builds. This is not a Play Store certificate; create and register the Play App Signing SHA-1 separately before publishing.

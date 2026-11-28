import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bagail.tripkit',
  appName: 'Trip Kit',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      // Plugin performs the OS-level OAuth only; the Firebase JS SDK completes
      // the session via signInWithCredential (see src/services/googleSignIn.ts).
      skipNativeAuth: true,
      providers: ['apple.com', 'google.com'],
    },
  },
};

export default config;

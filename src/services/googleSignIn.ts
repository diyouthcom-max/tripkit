import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from 'firebase/auth';
import { appleProvider, auth, googleProvider } from '../firebase';

const GOOGLE_POPUP_TIMEOUT_MS = 12_000;

export type InteractiveSignInResult =
  | { status: 'signed_in'; user: User }
  | { status: 'redirecting' };

function authErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: unknown }).code || '');
  }
  return '';
}

function isGooglePopupTimeout(err: unknown): boolean {
  return err instanceof Error && err.message === 'GOOGLE_POPUP_TIMEOUT';
}

export function shouldFallbackToGoogleRedirect(err: unknown): boolean {
  if (isGooglePopupTimeout(err)) return true;
  const code = authErrorCode(err);
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/network-request-failed' ||
    code === 'auth/operation-not-supported-in-this-environment'
  );
}

/**
 * Native sign-in uses the OS-level OAuth flow via @capacitor-firebase/authentication,
 * which bypasses the WKWebView/WebView OAuth restrictions that make the Firebase
 * JS SDK `signInWithRedirect` unreliable in Capacitor. We ask the plugin for the
 * provider credential only (skipNativeAuth), then complete the sign-in on the JS
 * layer with signInWithCredential so `auth`, Firestore and onAuthStateChanged all
 * share a single session.
 *
 * Requires native setup (see NATIVE_AUTH_SETUP.md):
 *  - iOS: "Sign in with Apple" capability + Firebase/Google plist + URL scheme
 *  - Android: google-services.json + SHA-1 + OAuth client
 *  - capacitor.config: FirebaseAuthentication.skipNativeAuth = true
 */
async function nativeSignIn(
  provider: 'google' | 'apple'
): Promise<InteractiveSignInResult> {
  const result =
    provider === 'google'
      ? await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
      : await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });

  const cred = result.credential;
  if (!cred) {
    throw new Error(`NATIVE_AUTH_NO_CREDENTIAL:${provider}`);
  }

  let jsCredential;
  if (provider === 'google') {
    if (!cred.idToken) {
      throw new Error('NATIVE_AUTH_NO_ID_TOKEN:google');
    }
    jsCredential = GoogleAuthProvider.credential(cred.idToken, cred.accessToken);
  } else {
    if (!cred.idToken) {
      throw new Error('NATIVE_AUTH_NO_ID_TOKEN:apple');
    }
    jsCredential = new OAuthProvider('apple.com').credential({
      idToken: cred.idToken,
      rawNonce: cred.nonce,
    });
  }

  const userCredential = await signInWithCredential(auth, jsCredential);
  return { status: 'signed_in', user: userCredential.user };
}

/**
 * Google sign-in that works on Web (popup + redirect fallback) and
 * Capacitor iOS/Android (native OS flow + JS SDK credential bridge).
 */
export async function signInWithGoogleInteractive(): Promise<InteractiveSignInResult> {
  if (Capacitor.isNativePlatform()) {
    return nativeSignIn('google');
  }

  try {
    const popupPromise = signInWithPopup(auth, googleProvider);
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('GOOGLE_POPUP_TIMEOUT'));
      }, GOOGLE_POPUP_TIMEOUT_MS);
    });
    const cred = await Promise.race([popupPromise, timeoutPromise]);
    return { status: 'signed_in', user: cred.user };
  } catch (err) {
    if (shouldFallbackToGoogleRedirect(err)) {
      await signInWithRedirect(auth, googleProvider);
      return { status: 'redirecting' };
    }
    throw err;
  }
}

/**
 * Apple sign-in: native OS flow on Capacitor; popup on Web.
 */
export async function signInWithAppleInteractive(): Promise<InteractiveSignInResult> {
  if (Capacitor.isNativePlatform()) {
    return nativeSignIn('apple');
  }
  const cred = await signInWithPopup(auth, appleProvider);
  return { status: 'signed_in', user: cred.user };
}

/** Consume a pending redirect result once (Web popup/redirect fallback only). */
export async function consumeAuthRedirectResult(): Promise<User | null> {
  // Native no longer uses redirect, so there is nothing to consume there.
  if (Capacitor.isNativePlatform()) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err) {
    // A failed redirect read is otherwise indistinguishable from "no pending
    // redirect", which hides real authDomain / third-party-cookie failures.
    console.warn('[TripKit] Could not read the pending auth redirect result.', err);
    return null;
  }
}

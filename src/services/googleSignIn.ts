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

function isAppleConfigAuthError(err: unknown): boolean {
  const code = authErrorCode(err);
  const msg = err instanceof Error ? err.message : String(err || '');
  const combined = `${code} ${msg}`;
  return (
    combined.includes('configuration-not-found') ||
    combined.includes('operation-not-allowed')
  );
}

/** Log credential shape without leaking tokens. */
function logSanitizedCredential(
  provider: 'google' | 'apple',
  cred: Record<string, unknown> | null | undefined
): void {
  if (!cred) {
    console.warn(`[TripKit] nativeSignIn(${provider}): credential is null/undefined`);
    return;
  }
  const keys = Object.keys(cred);
  const flags = {
    hasIdToken: Boolean(cred.idToken),
    hasAccessToken: Boolean(cred.accessToken),
    hasNonce: Boolean(cred.nonce),
    hasRawNonce: Boolean(cred.rawNonce),
    hasAuthorizationCode: Boolean(cred.authorizationCode),
    hasServerAuthCode: Boolean(cred.serverAuthCode),
    providerId: typeof cred.providerId === 'string' ? cred.providerId : undefined,
  };
  console.info(`[TripKit] nativeSignIn(${provider}) credential keys:`, keys, flags);
}

function attachAuthCode(err: unknown, fallbackCode: string): Error {
  const code = authErrorCode(err) || fallbackCode;
  const base = err instanceof Error ? err.message : String(err || 'unknown');
  const wrapped = new Error(base);
  (wrapped as Error & { code?: string }).code = code;
  console.error(`[TripKit] auth error code=${code}`, base);
  return wrapped;
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
  // Android Apple OAuth may leave a pending Custom-Tabs result if the process
  // was killed mid-flow — finish it before starting a new request.
  if (provider === 'apple' && Capacitor.getPlatform() === 'android') {
    try {
      const pending = await FirebaseAuthentication.getPendingAuthResult();
      if (pending?.credential?.idToken) {
        console.info('[TripKit] Consuming pending Android Apple auth result');
        return completeAppleJsCredential(
          pending.credential as unknown as Record<string, unknown>
        );
      }
    } catch (pendingErr) {
      console.warn(
        '[TripKit] getPendingAuthResult skipped',
        authErrorCode(pendingErr) || pendingErr
      );
    }
  }

  let result;
  try {
    result =
      provider === 'google'
        ? await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
        : await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  } catch (pluginErr) {
    console.error(
      `[TripKit] FirebaseAuthentication.signInWith${provider === 'google' ? 'Google' : 'Apple'} failed`,
      { code: authErrorCode(pluginErr), message: pluginErr instanceof Error ? pluginErr.message : String(pluginErr) }
    );

    // Android Apple uses a web OAuth sheet; config errors often mean Services ID /
    // Auth domain issues. Fall back to JS popup inside the WebView.
    if (
      provider === 'apple' &&
      Capacitor.getPlatform() === 'android' &&
      isAppleConfigAuthError(pluginErr)
    ) {
      return appleAndroidWebViewFallback(pluginErr);
    }
    throw attachAuthCode(pluginErr, 'auth/native-plugin-failed');
  }

  const cred = (result.credential as unknown as Record<string, unknown> | null) ?? null;
  logSanitizedCredential(provider, cred);

  if (!cred) {
    throw attachAuthCode(
      { code: `NATIVE_AUTH_NO_CREDENTIAL:${provider}`, message: `No credential from native ${provider} sign-in` },
      `NATIVE_AUTH_NO_CREDENTIAL:${provider}`
    );
  }

  try {
    if (provider === 'google') {
      const idToken = typeof cred.idToken === 'string' ? cred.idToken : '';
      if (!idToken) {
        throw attachAuthCode(
          { code: 'NATIVE_AUTH_NO_ID_TOKEN:google', message: 'Native Google sign-in returned no idToken' },
          'NATIVE_AUTH_NO_ID_TOKEN:google'
        );
      }
      const accessToken =
        typeof cred.accessToken === 'string' ? cred.accessToken : undefined;
      const jsCredential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await signInWithCredential(auth, jsCredential);
      return { status: 'signed_in', user: userCredential.user };
    }

    return await completeAppleJsCredential(cred);
  } catch (credErr) {
    console.error(
      `[TripKit] signInWithCredential(${provider}) failed`,
      { code: authErrorCode(credErr), message: credErr instanceof Error ? credErr.message : String(credErr) }
    );

    if (
      provider === 'apple' &&
      Capacitor.getPlatform() === 'android' &&
      isAppleConfigAuthError(credErr)
    ) {
      return appleAndroidWebViewFallback(credErr);
    }
    throw attachAuthCode(credErr, `auth/${provider}-credential-failed`);
  }
}

async function completeAppleJsCredential(
  cred: Record<string, unknown>
): Promise<InteractiveSignInResult> {
  const idToken = typeof cred.idToken === 'string' ? cred.idToken.trim() : '';
  if (!idToken) {
    throw attachAuthCode(
      {
        code: 'NATIVE_AUTH_NO_ID_TOKEN:apple',
        message: 'Native Apple sign-in returned no idToken',
      },
      'NATIVE_AUTH_NO_ID_TOKEN:apple'
    );
  }

  // Plugin types expose `nonce`; some builds / bridges may surface `rawNonce`.
  const rawNonce =
    (typeof cred.nonce === 'string' && cred.nonce) ||
    (typeof cred.rawNonce === 'string' && cred.rawNonce) ||
    undefined;

  if (!rawNonce) {
    console.warn(
      '[TripKit] Apple credential missing nonce/rawNonce — Firebase may reject the credential'
    );
  }

  const jsCredential = new OAuthProvider('apple.com').credential({
    idToken,
    rawNonce,
  });
  const userCredential = await signInWithCredential(auth, jsCredential);
  return { status: 'signed_in', user: userCredential.user };
}

async function appleAndroidWebViewFallback(
  originalErr: unknown
): Promise<InteractiveSignInResult> {
  const originalCode = authErrorCode(originalErr) || 'unknown';
  console.warn(
    `[TripKit] Android Apple native flow failed (${originalCode}); trying WebView signInWithPopup fallback`
  );
  try {
    const cred = await signInWithPopup(auth, appleProvider);
    return { status: 'signed_in', user: cred.user };
  } catch (popupErr) {
    const popupCode = authErrorCode(popupErr) || 'auth/popup-failed';
    console.error('[TripKit] Android Apple WebView popup fallback failed', {
      originalCode,
      popupCode,
      message: popupErr instanceof Error ? popupErr.message : String(popupErr),
    });
    throw attachAuthCode(
      {
        code: popupCode,
        message: `Apple sign-in failed after native + popup fallback (native=${originalCode}, popup=${popupCode})`,
      },
      popupCode
    );
  }
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

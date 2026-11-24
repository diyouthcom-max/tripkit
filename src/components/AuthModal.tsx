import React, { useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getRedirectResult,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Compass,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MailWarning,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { appleProvider, auth, formatAuthError, googleProvider } from '../firebase';
import type { AppLanguage } from '../types';
import { getAuthCopy } from '../i18n/packs/authAndKitPack';

export type AuthModalMode = 'welcome' | 'signin' | 'account';

const GOOGLE_POPUP_TIMEOUT_MS = 20000;

export interface AuthModalProps {
  open: boolean;
  mode: AuthModalMode;
  authUser: User | null;
  language: AppLanguage;
  activeRoomId?: string | null;
  coverImageUrl?: string;
  onClose: () => void;
  onSkipWelcome?: () => void;
  onSignedIn?: (user: User) => void;
  onAccountDeleted?: () => void;
  onToast: (msg: string) => void;
}

const AppleLogoSvg: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.465 2.22-1.235 3.015-.825.855-2.01 1.515-3.225 1.425-.15-1.125.405-2.295 1.185-3.075.84-.855 2.13-1.485 3.275-1.365zm4.545 15.81c-.42.96-.93 1.845-1.56 2.655-.96 1.245-1.98 2.1-3.345 2.115-1.275.015-1.695-.765-3.165-.765-1.47 0-1.935.75-3.195.795-1.35.045-2.4-.915-3.36-2.16-1.845-2.385-3.255-6.735-1.365-9.675.93-1.455 2.445-2.37 4.095-2.385 1.275-.03 2.475.87 3.165.87.69 0 2.145-1.065 3.63-.915.615.03 2.355.255 3.465 1.89-.09.06-2.07 1.215-2.04 3.615.03 2.865 2.505 3.825 2.535 3.84-.015.075-.39 1.35-1.26 2.13z" />
  </svg>
);

const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="var(--tk-route-3)"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="var(--tk-route-5)"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="var(--tk-route-6)"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="var(--tk-danger)"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export function resolveAuthProviderLabel(user: User, langOrIsEn: AppLanguage | boolean): string {
  const resolvedLang: AppLanguage =
    typeof langOrIsEn === 'boolean' ? (langOrIsEn ? 'en-US' : 'zh-CN') : langOrIsEn;
  const copy = getAuthCopy(resolvedLang);
  const providerId = user.providerData?.[0]?.providerId || '';
  if (providerId === 'apple.com') return 'Apple ID';
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'password') return copy.providerEmail;
  return copy.providerCloud;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  mode,
  authUser,
  language,
  activeRoomId,
  coverImageUrl,
  onClose,
  onSkipWelcome,
  onSignedIn,
  onAccountDeleted,
  onToast,
}) => {
  const copy = getAuthCopy(language);
  const googleSignInSettledRef = useRef(false);

  const [busyProvider, setBusyProvider] = useState<
    null | 'apple' | 'google' | 'email' | 'signout' | 'delete' | 'resend-verify' | 'refresh-verify'
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [emailVerifiedLocal, setEmailVerifiedLocal] = useState<boolean>(
    () => Boolean(authUser?.emailVerified)
  );

  // Email flow state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailStep, setEmailStep] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Legal viewer & Delete account confirmation
  const [legalDoc, setLegalDoc] = useState<null | 'terms' | 'privacy'>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [needsReauthForDelete, setNeedsReauthForDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setLegalDoc(null);
    setConfirmDeleteOpen(false);
    setNeedsReauthForDelete(false);
    if (mode !== 'account') {
      setShowEmailForm(false);
      setEmailStep('signin');
    }
  }, [open, mode]);

  useEffect(() => {
    setEmailVerifiedLocal(Boolean(authUser?.emailVerified));
  }, [authUser, authUser?.emailVerified, authUser?.uid]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (legalDoc) {
          setLegalDoc(null);
        } else {
          if (mode === 'welcome' && onSkipWelcome) {
            onSkipWelcome();
          }
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, legalDoc, mode, onSkipWelcome, onClose]);

  // Google redirect return (popup fallback). Latch + cancelled guard StrictMode double-mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (cancelled) return;
        if (!result?.user) return;
        if (googleSignInSettledRef.current) return;
        googleSignInSettledRef.current = true;
        onToast(getAuthCopy(language).toastGoogleSignedIn);
        onSignedIn?.(result.user);
        onClose();
        setBusyProvider(null);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(formatAuthError(err, language));
        setBusyProvider(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, onToast, onSignedIn, onClose]);

  if (!open) return null;

  const isBusy = busyProvider !== null;
  const isAccountView = Boolean(authUser);

  const handleDismiss = () => {
    if (mode === 'welcome' && onSkipWelcome) {
      onSkipWelcome();
    }
    onClose();
  };

  const handleAppleSignIn = async () => {
    setBusyProvider('apple');
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const cred = await signInWithPopup(auth, appleProvider);
      onToast(copy.toastAppleSignedIn);
      onSignedIn?.(cred.user);
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusyProvider('google');
    setErrorMsg(null);
    setInfoMsg(null);
    googleSignInSettledRef.current = false;

    const authErrorCode = (err: unknown): string => {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        return String((err as { code?: unknown }).code || '');
      }
      return '';
    };

    const isGooglePopupTimeout = (err: unknown): boolean =>
      err instanceof Error && err.message === 'GOOGLE_POPUP_TIMEOUT';

    const shouldFallbackToRedirect = (err: unknown): boolean => {
      if (isGooglePopupTimeout(err)) return true;
      const code = authErrorCode(err);
      return (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/network-request-failed' ||
        code === 'auth/operation-not-supported-in-this-environment'
      );
    };

    const settleGoogleSuccess = (user: User) => {
      if (googleSignInSettledRef.current) return;
      googleSignInSettledRef.current = true;
      onToast(copy.toastGoogleSignedIn);
      onSignedIn?.(user);
      onClose();
      setBusyProvider(null);
    };

    const startRedirectFallback = async (err: unknown) => {
      const code = authErrorCode(err);
      setInfoMsg(
        code === 'auth/popup-blocked' ? copy.popupBlockedFallback : copy.redirectingToGoogle
      );
      try {
        await signInWithRedirect(auth, googleProvider);
        // Keep busy while the browser navigates away for redirect sign-in.
      } catch (redirectErr) {
        setErrorMsg(formatAuthError(redirectErr, language));
        setBusyProvider(null);
      }
    };

    try {
      const popupPromise = signInWithPopup(auth, googleProvider);
      // Keep listening so a late popup success still settles once via the latch.
      void popupPromise.then((lateCred) => settleGoogleSuccess(lateCred.user)).catch(() => {
        /* redirect / primary catch owns UX */
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error('GOOGLE_POPUP_TIMEOUT'));
        }, GOOGLE_POPUP_TIMEOUT_MS);
      });
      const cred = await Promise.race([popupPromise, timeoutPromise]);
      settleGoogleSuccess(cred.user);
    } catch (err) {
      if (googleSignInSettledRef.current) return;
      if (shouldFallbackToRedirect(err)) {
        await startRedirectFallback(err);
        return;
      }
      setErrorMsg(formatAuthError(err, language));
      setBusyProvider(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setErrorMsg(copy.toastEnterEmail);
      return;
    }

    setBusyProvider('email');
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      if (emailStep === 'reset') {
        await sendPasswordResetEmail(auth, cleanEmail);
        setInfoMsg(copy.toastResetSent(cleanEmail));
        setEmailStep('signin');
      } else if (emailStep === 'signup') {
        if (passwordInput.length < 6) {
          setErrorMsg(copy.toastPasswordMin);
          setBusyProvider(null);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, passwordInput);
        if (nameInput.trim()) {
          await updateProfile(cred.user, { displayName: nameInput.trim() });
        }
        onToast(copy.toastAccountCreated);
        try {
          await sendEmailVerification(cred.user);
          onToast(copy.verificationEmailSent);
        } catch (verifyErr) {
          // Registration already succeeded — never roll back or block sign-in.
          setInfoMsg(copy.verificationSendFailed);
          onToast(formatAuthError(verifyErr, language) || copy.verificationSendFailed);
        }
        onSignedIn?.(cred.user);
        onClose();
      } else {
        if (!passwordInput) {
          setErrorMsg(copy.toastEnterPassword);
          setBusyProvider(null);
          return;
        }
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, passwordInput);
        onToast(copy.toastEmailSignedIn);
        onSignedIn?.(cred.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleResendVerification = async () => {
    if (!authUser) return;
    setBusyProvider('resend-verify');
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendEmailVerification(authUser);
      setInfoMsg(copy.verificationEmailSent);
      onToast(copy.verificationEmailSent);
    } catch (err) {
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleRefreshVerification = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setBusyProvider('refresh-verify');
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await reload(current);
      const verified = Boolean(auth.currentUser?.emailVerified);
      setEmailVerifiedLocal(verified);
      if (verified) {
        setInfoMsg(copy.emailVerifiedNow);
        onToast(copy.emailVerifiedNow);
        if (auth.currentUser) {
          onSignedIn?.(auth.currentUser);
        }
      } else {
        setInfoMsg(copy.emailUnverifiedNote);
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleSignOut = async () => {
    setBusyProvider('signout');
    setErrorMsg(null);
    try {
      await signOut(auth);
      onToast(copy.toastSignedOut);
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDeleteAccount = async (withReauth = false) => {
    if (!auth.currentUser) return;
    setBusyProvider('delete');
    setErrorMsg(null);
    try {
      if (withReauth) {
        const providerId = auth.currentUser.providerData?.[0]?.providerId;
        if (providerId === 'apple.com') {
          await reauthenticateWithPopup(auth.currentUser, appleProvider);
        } else if (providerId === 'google.com') {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
        }
      }
      await deleteUser(auth.currentUser);
      setConfirmDeleteOpen(false);
      setNeedsReauthForDelete(false);
      onAccountDeleted?.();
      onToast(copy.toastAccountDeleted);
      onClose();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code || '')
          : '';
      if (code.includes('requires-recent-login')) {
        setNeedsReauthForDelete(true);
      }
      setErrorMsg(formatAuthError(err, language));
    } finally {
      setBusyProvider(null);
    }
  };

  // In-modal readable Legal Document View (Apple Guideline 5.1.1(i))
  if (legalDoc) {
    const isTerms = legalDoc === 'terms';
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-forest-50 p-0 sm:p-4">
        <div className="w-full max-w-md max-h-[86vh] flex flex-col rounded-t-[28px] sm:rounded-[26px] bg-white border tk-bc-hair shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b tk-bc-hair shrink-0">
            <button
              type="button"
              onClick={() => setLegalDoc(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold tk-text-forest hover:tk-text-forest cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{copy.backToSignIn}</span>
            </button>
            <h3 className="text-sm font-extrabold tk-text-ink">
              {isTerms ? copy.termsTitle : copy.privacyTitle}
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={copy.close}
              className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-paper cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 text-xs tk-text-ink2 leading-relaxed">
            {isTerms ? (
              <>
                <p className="font-semibold tk-text-ink">{copy.termsHeading}</p>
                {copy.termsBody.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </>
            ) : (
              <>
                <p className="font-semibold tk-text-ink">{copy.privacyHeading}</p>
                {copy.privacyItems.map((item, idx) => (
                  <p key={idx}>
                    <strong>{item.lead}</strong>
                    {item.text}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-forest-55 p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-white border tk-bc-hair shadow-2xl overflow-hidden"
      >
        {/* Editorial Destination Hero Banner */}
        <div className="relative h-40 sm:h-44 shrink-0 overflow-hidden tk-bg-forest">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-75 scale-105"
            />
          ) : (
            <div className="absolute inset-0 tk-grad-auth-hero" />
          )}
          <div className="absolute inset-0 tk-grad-auth-scrim" />

          {/* Top Bar inside Hero (Anchored cleanly above cover image) */}
          <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between gap-2">
            {isAccountView || mode !== 'welcome' ? (
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 rounded-full tk-bg-ink/30 border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:tk-bg-ink/45 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{copy.back}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
                <Compass className="h-3.5 w-3.5" />
                <span>Trip Kit</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label={copy.close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-bg-ink/30 border border-white/20 text-white hover:tk-bg-ink/45 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Editorial Title Anchored at Bottom of Hero */}
          <div className="absolute bottom-4 left-5 right-5 z-10">
            <h2 className="text-[22px] font-extrabold tracking-tight text-white leading-tight">
              {isAccountView
                ? copy.heroPassportTitle
                : mode === 'welcome'
                ? copy.heroWelcomeTitle
                : copy.heroSignInTitle}
            </h2>
            <p className="mt-1 text-xs text-white/80 leading-snug">
              {isAccountView ? copy.heroPassportSub : copy.heroSignInSub}
            </p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-white">
          {errorMsg && (
            <div className="rounded-2xl border tk-bc-danger-hair tk-bg-danger-tint px-3.5 py-2.5 text-xs font-semibold tk-text-danger leading-relaxed">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-2xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2.5 text-xs font-semibold tk-text-forest leading-relaxed">
              {infoMsg}
            </div>
          )}

          {isAccountView && authUser ? (
            /* ================= SIGNED-IN ACCOUNT MANAGEMENT VIEW ================= */
            <div className="space-y-4">
              {/* Passport Identity Card */}
              <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-4 flex items-center gap-3.5">
                {authUser.photoURL ? (
                  <img
                    src={authUser.photoURL}
                    alt=""
                    className="h-12 w-12 rounded-2xl object-cover border tk-bc-hair shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-2xl tk-bg-forest text-white text-base font-extrabold flex items-center justify-center shrink-0">
                    {(authUser.displayName || authUser.email || 'T').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tk-text-ink truncate">
                      {authUser.displayName || copy.defaultTravelerName}
                    </span>
                    <span className="rounded-md tk-bg-forest-tint px-2 py-0.5 text-[10px] font-bold tk-text-forest shrink-0">
                      {resolveAuthProviderLabel(authUser, language)}
                    </span>
                  </div>
                  <div className="text-xs tk-text-ink2 truncate mt-0.5">
                    {authUser.email || copy.privateRelayEmail}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold tk-text-forest">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {activeRoomId ? copy.liveCrewRoom(activeRoomId) : copy.cloudSyncReady}
                    </span>
                  </div>
                </div>
              </div>

              {(() => {
                const providerId = authUser.providerData?.[0]?.providerId || '';
                const needsEmailVerification =
                  providerId === 'password' && !emailVerifiedLocal;
                if (!needsEmailVerification) return null;
                return (
                  <div className="rounded-2xl border tk-bc-warning-hair tk-bg-warning-tint px-4 py-3 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <MailWarning className="h-4 w-4 tk-text-warning shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold tk-text-warning leading-relaxed">
                        {copy.emailUnverifiedNote}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleResendVerification()}
                        className="w-full min-h-10 rounded-xl border tk-bc-hair bg-white px-3 py-2 text-xs font-bold tk-text-ink hover:tk-bg-paper inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 leading-snug text-center"
                      >
                        {busyProvider === 'resend-verify' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin tk-text-forest shrink-0" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
                        )}
                        <span>{copy.resendVerificationBtn}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRefreshVerification()}
                        className="w-full min-h-10 rounded-xl tk-bg-forest px-3 py-2 text-xs font-bold text-white hover:tk-bg-press inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 leading-snug text-center"
                      >
                        {busyProvider === 'refresh-verify' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{copy.refreshVerificationBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Privacy Reassurance */}
              <div className="rounded-2xl border tk-bc-hair tk-bg-card px-4 py-3 flex items-start gap-2.5 text-xs tk-text-ink2">
                <ShieldCheck className="h-4 w-4 tk-text-forest shrink-0 mt-0.5" />
                <p className="leading-relaxed">{copy.privacyReassurance}</p>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleSignOut()}
                className="w-full h-11 rounded-2xl border tk-bc-hair bg-white px-4 text-xs font-bold tk-text-ink hover:tk-bg-paper inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyProvider === 'signout' ? (
                  <Loader2 className="h-4 w-4 animate-spin tk-text-forest" />
                ) : (
                  <LogOut className="h-4 w-4 tk-text-ink2" />
                )}
                <span>{copy.signOutBtn}</span>
              </button>

              {/* Apple Guideline 5.1.1(v): Mandatory In-App Account Deletion */}
              <div className="pt-2 border-t tk-bc-hair">
                {!confirmDeleteOpen ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmDeleteOpen(true);
                      setErrorMsg(null);
                    }}
                    className="w-full py-2 text-xs font-semibold tk-text-danger hover:tk-text-danger inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{copy.deleteAccountBtn}</span>
                  </button>
                ) : (
                  <div className="rounded-2xl border tk-bc-danger-hair tk-bg-danger-tint p-4 space-y-3">
                    <div className="text-xs font-extrabold tk-text-danger">
                      {copy.deleteConfirmTitle}
                    </div>
                    <p className="text-[11px] tk-text-danger leading-relaxed">
                      {copy.deleteConfirmBody}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setConfirmDeleteOpen(false);
                          setNeedsReauthForDelete(false);
                        }}
                        className="flex-1 h-9 rounded-xl border tk-bc-hair bg-white text-xs font-bold tk-text-ink2 hover:tk-bg-paper cursor-pointer"
                      >
                        {copy.cancel}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteAccount(needsReauthForDelete)}
                        className="flex-1 h-9 rounded-xl tk-bg-danger text-xs font-bold text-white hover:tk-bg-danger inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {busyProvider === 'delete' && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        <span>
                          {needsReauthForDelete ? copy.reverifyAndDelete : copy.confirmDelete}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= WELCOME / SIGN-IN VIEW ================= */
            <div className="space-y-4">
              {/* 3 Compact High-Value Traveler Benefits (shown when email form is collapsed) */}
              {!showEmailForm && (
                <div className="grid grid-cols-1 gap-2 rounded-2xl tk-bg-paper border tk-bc-hair p-3.5">
                  <div className="flex items-center gap-2.5 text-xs tk-text-ink">
                    <span className="h-6 w-6 rounded-lg tk-bg-forest-tint tk-text-forest inline-flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{copy.benefitCollab}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs tk-text-ink">
                    <span className="h-6 w-6 rounded-lg tk-bg-forest-tint tk-text-forest inline-flex items-center justify-center shrink-0">
                      <Cloud className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{copy.benefitSync}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs tk-text-ink">
                    <span className="h-6 w-6 rounded-lg tk-bg-forest-tint tk-text-forest inline-flex items-center justify-center shrink-0">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{copy.benefitPrivacy}</span>
                  </div>
                </div>
              )}

              {/* Primary Auth Buttons (Apple HIG Guideline 4.8 Compliant Equal Prominence) */}
              <div className="space-y-2.5">
                {/* 1. Sign in with Apple (HIG Pure Black Button) */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleAppleSignIn()}
                  className="w-full h-12 rounded-2xl tk-bg-ink text-white hover:tk-bg-ink px-4 text-sm font-semibold inline-flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {busyProvider === 'apple' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AppleLogoSvg className="h-4 w-4 -mt-0.5" />
                  )}
                  <span>{copy.continueApple}</span>
                </button>

                {/* 2. Continue with Google (Official 4-Color G Mark) */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleGoogleSignIn()}
                  className="w-full h-12 rounded-2xl border tk-bc-hair bg-white tk-text-ink hover:tk-bg-paper px-4 text-sm font-semibold inline-flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {busyProvider === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin tk-text-forest" />
                  ) : (
                    <GoogleLogoSvg className="h-4 w-4" />
                  )}
                  <span>{copy.continueGoogle}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 tk-bg-forest-plate" />
                <span className="text-[11px] font-medium tk-text-ink2">
                  {copy.orDivider}
                </span>
                <div className="h-px flex-1 tk-bg-forest-plate" />
              </div>

              {/* 3. Collapsible Email & Password Auth */}
              {!showEmailForm ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setShowEmailForm(true);
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="w-full h-11 rounded-2xl border tk-bc-hair tk-bg-card tk-text-ink hover:tk-bc-forest hover:bg-white px-4 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="h-4 w-4 tk-text-forest" />
                  <span>{copy.continueEmail}</span>
                </button>
              ) : (
                <form
                  onSubmit={handleEmailSubmit}
                  className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-xl tk-bg-forest-tint p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep('signin');
                          setErrorMsg(null);
                        }}
                        className={`rounded-lg px-3 py-1 transition-colors cursor-pointer ${
 emailStep === 'signin'
 ? 'bg-white tk-text-forest shadow-2xs'
 : 'tk-text-ink2'
 }`}
                      >
                        {copy.tabSignIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep('signup');
                          setErrorMsg(null);
                        }}
                        className={`rounded-lg px-3 py-1 transition-colors cursor-pointer ${
 emailStep === 'signup'
 ? 'bg-white tk-text-forest shadow-2xs'
 : 'tk-text-ink2'
 }`}
                      >
                        {copy.tabCreateAccount}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="text-[11px] font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                    >
                      {copy.hideBtn}
                    </button>
                  </div>

                  {emailStep === 'signup' && (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={copy.nicknamePlaceholder}
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none"
                    />
                  )}

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={copy.emailPlaceholder}
                    className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none"
                  />

                  {emailStep !== 'reset' && (
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete={
                          emailStep === 'signup' ? 'new-password' : 'current-password'
                        }
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={
                          emailStep === 'signup'
                            ? copy.passwordNewPlaceholder
                            : copy.passwordPlaceholder
                        }
                        className="w-full h-10 rounded-xl border tk-bc-hair bg-white pl-3 pr-9 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={copy.togglePasswordAria}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 tk-text-ink2 hover:tk-text-ink cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {emailStep === 'signin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep('reset');
                          setErrorMsg(null);
                        }}
                        className="text-[11px] font-semibold tk-text-forest hover:underline cursor-pointer"
                      >
                        {copy.forgotPassword}
                      </button>
                    ) : emailStep === 'reset' ? (
                      <button
                        type="button"
                        onClick={() => setEmailStep('signin')}
                        className="text-[11px] font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                      >
                        {copy.backToSignInArrow}
                      </button>
                    ) : (
                      <span className="text-[11px] tk-text-ink2">
                        {copy.instantSyncNote}
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={isBusy}
                      className="h-9 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-forest inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {busyProvider === 'email' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : emailStep === 'reset' ? (
                        <KeyRound className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {emailStep === 'signup'
                          ? copy.submitCreate
                          : emailStep === 'reset'
                          ? copy.submitReset
                          : copy.submitSignIn}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Mandatory Non-Blocking Guest Skip (Apple Guideline 5.1.1(ii)) */}
              <div className="pt-1 space-y-2.5 text-center">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2.5 rounded-2xl text-xs font-bold tk-text-ink2 hover:tk-bg-paper hover:tk-text-forest inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{copy.continueGuest}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {/* Mandatory Legal Links (Apple Guideline 5.1.1(i)) */}
                <p className="text-[11px] tk-text-ink2 leading-relaxed">
                  {copy.legalPrefix}
                  <button
                    type="button"
                    onClick={() => setLegalDoc('terms')}
                    className="underline hover:tk-text-forest cursor-pointer"
                  >
                    {copy.termsTitle}
                  </button>
                  {copy.legalAnd}
                  <button
                    type="button"
                    onClick={() => setLegalDoc('privacy')}
                    className="underline hover:tk-text-forest cursor-pointer"
                  >
                    {copy.privacyTitle}
                  </button>
                  {copy.legalSuffix}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

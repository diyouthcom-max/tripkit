import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Sparkles,
  CloudSun,
  LayoutGrid,
  Check,
  Luggage,
  Copy,
  Users,
  FileDown,
  ShieldCheck,
  Star,
  KeyRound,
  ExternalLink,
  Loader2,
  MessageCircle,
  AlertCircle,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { signInWithPopup, type User } from 'firebase/auth';
import { auth, formatCloudSyncError, googleProvider } from '../firebase';
import {
  fetchMyCloudEntitlement,
  isVerifiedAdminUser,
  normalizeRedeemCodeInput,
  redeemProCodeWithCloud,
  RedeemUserFacingError,
  type RedeemActivationResult,
} from '../services/proRedeemService';
import {
  buildWhatsAppClaimUrl,
  FACEBOOK_PAGE_HANDLE,
  FACEBOOK_PAGE_URL,
  WHATSAPP_DISPLAY,
  normalizeAppLanguage,
  type MembershipStatus,
} from '../utils/preferencesHelpers';
import { getProModalCopy } from '../i18n/packs/settingsAndProPack';
import proHeroImg from '../assets/images/trip_kit_pro_hero_1794649494627.jpg';
import type { AppLanguage, ProPlanId } from '../types';

interface TripKitProModalProps {
  open: boolean;
  onClose: () => void;
  triggerReason?: string | null;
  membershipStatus: MembershipStatus;
  currentPlan: ProPlanId;
  redeemedCode?: string;
  authUser: User | null;
  onRedeemActivated: (result: RedeemActivationResult) => void;
  onDeactivatePro: () => void;
  onOpenAdminCodeGenerator?: () => void;
  onToast: (msg: string) => void;
}

const FEATURE_ICONS = [Sparkles, Luggage, Copy, CloudSun, LayoutGrid, Users, FileDown];

export const TripKitProModal: React.FC<TripKitProModalProps> = ({
  open,
  onClose,
  triggerReason,
  membershipStatus,
  currentPlan,
  redeemedCode,
  authUser,
  onRedeemActivated,
  onDeactivatePro,
  onOpenAdminCodeGenerator,
  onToast,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getProModalCopy(activeLang);

  const [selectedPlan, setSelectedPlan] = useState<ProPlanId>(currentPlan || 'annual');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [copiedClaimText, setCopiedClaimText] = useState(false);
  const [copiedFbHandle, setCopiedFbHandle] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(true);

  const redeemSectionRef = useRef<HTMLElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPlan(currentPlan || 'annual');
      setRedeemError(null);
      setCodeInput('');
      setGuideExpanded(!membershipStatus.isProActive);
    }
  }, [open, currentPlan, membershipStatus.isProActive]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const planOptions = copy.plans;
  const includedFeatures = copy.features.map((f, i) => ({
    ...f,
    icon: FEATURE_ICONS[i] || Sparkles,
  }));
  const reviews = copy.reviews;
  const activePlanSpec =
    planOptions.find((p) => p.id === selectedPlan) || planOptions[0];
  const { isProActive, isTrialExpired, trialDaysRemaining, expiresDateLabel, proDaysRemaining } =
    membershipStatus;

  const handleCopyWhatsAppNumber = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_DISPLAY);
      setCopiedWhatsapp(true);
      onToast(copy.copiedWaToast(WHATSAPP_DISPLAY));
      setTimeout(() => setCopiedWhatsapp(false), 2200);
    } catch {
      onToast(copy.manualWaToast(WHATSAPP_DISPLAY));
    }
  };

  const handleCopyClaimMessage = async () => {
    try {
      await navigator.clipboard.writeText(activePlanSpec.whatsappMsg);
      setCopiedClaimText(true);
      onToast(copy.copiedMsgToast);
      setTimeout(() => setCopiedClaimText(false), 2200);
    } catch {
      onToast(copy.copyMsgErr);
    }
  };

  const handleCopyFacebookHandle = async () => {
    try {
      await navigator.clipboard.writeText(FACEBOOK_PAGE_HANDLE);
      setCopiedFbHandle(true);
      onToast(copy.copiedFbToast(FACEBOOK_PAGE_HANDLE));
      setTimeout(() => setCopiedFbHandle(false), 2200);
    } catch {
      onToast(copy.manualFbToast(FACEBOOK_PAGE_HANDLE));
    }
  };

  const ensureAuthenticatedUser = async (): Promise<User | null> => {
    if (authUser) return authUser;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const msg = formatCloudSyncError(err);
      setRedeemError(msg);
      return null;
    }
  };

  const handleRedeemSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = normalizeRedeemCodeInput(codeInput);
    if (!normalized) {
      setRedeemError(copy.emptyCodeErr);
      codeInputRef.current?.focus();
      return;
    }

    setRedeemBusy(true);
    setRedeemError(null);
    try {
      const user = await ensureAuthenticatedUser();
      if (!user) {
        return;
      }
      const result = await redeemProCodeWithCloud({
        rawCode: normalized,
        user,
      });
      onRedeemActivated(result);
      setCodeInput('');
      onClose();
    } catch (err) {
      if (err instanceof RedeemUserFacingError) {
        setRedeemError(err.message);
      } else {
        setRedeemError(formatCloudSyncError(err));
      }
    } finally {
      setRedeemBusy(false);
    }
  };

  const handleRestoreCloudEntitlement = async () => {
    setRestoreBusy(true);
    setRedeemError(null);
    try {
      const user = await ensureAuthenticatedUser();
      if (!user) return;
      const ent = await fetchMyCloudEntitlement(user.uid);
      if (!ent) {
        setRedeemError(copy.noCloudEntErr);
        return;
      }
      if (ent.expiresAtMs !== null && ent.expiresAtMs <= Date.now()) {
        setRedeemError(copy.expiredEntErr);
        return;
      }
      onRedeemActivated({
        code: ent.redeemedCode,
        planType: ent.planType,
        durationDays: ent.durationDays,
        expiresAtMs: ent.expiresAtMs,
        restoredExisting: true,
      });
      onClose();
    } catch (err) {
      setRedeemError(formatCloudSyncError(err));
    } finally {
      setRestoreBusy(false);
    }
  };

  const scrollToRedeemSection = () => {
    redeemSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 220);
  };

  const isLifetimeActive =
    expiresDateLabel === '终身有效' ||
    expiresDateLabel === 'Lifetime' ||
    expiresDateLabel === 'Vitalicio' ||
    expiresDateLabel === 'À vie' ||
    expiresDateLabel === 'Vitalício' ||
    expiresDateLabel === '無期限（永久）';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-overlay p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tripkit-pro-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl tk-bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closeAria}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full tk-bg-ink/35 text-white hover:tk-bg-ink/55 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-6">
          {/* Editorial Hero Header with Measured Contrast Scrim */}
          <div className="relative min-h-[250px] w-full overflow-hidden">
            {!heroImgFailed ? (
              <img
                src={proHeroImg}
                alt={copy.heroAlt}
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 tk-grad-auth-hero" />
            )}

            <div className="absolute inset-0 tk-grad-cover-fade" />

            <div className="relative z-10 flex flex-col justify-end px-6 pt-12 pb-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
                <span>Trip Kit Pro</span>
                <span aria-hidden="true">·</span>
                <span className="font-num tabular-nums">
                  {isProActive
                    ? isLifetimeActive
                      ? copy.statusLifetime
                      : copy.statusActiveDays(proDaysRemaining ?? 365)
                    : isTrialExpired
                    ? copy.statusTrialEnded
                    : copy.statusTrialLeft(trialDaysRemaining)}
                </span>
              </div>

              <h2
                id="tripkit-pro-title"
                className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white [text-wrap:balance]"
              >
                {copy.heroHeadline}
              </h2>

              {/* Top 3 Quick Value Rows */}
              <div className="mt-5 space-y-3 rounded-2xl bg-white/94 p-4 border border-white/75">
                {copy.highlights.map((item, idx) => {
                  const Icon = idx === 0 ? Sparkles : idx === 1 ? Luggage : FileDown;
                  return (
                    <div key={item.title} className="flex items-center gap-3.5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl tk-bg-forest text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold tk-text-ink">{item.title}</div>
                        <div className="text-xs tk-text-ink2">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 space-y-5">
            {/* Contextual Paywall Trigger Callout (Rule 1 / Rule 2) */}
            {triggerReason && !isProActive && (
              <div className="rounded-2xl border tk-bc-warning-hair tk-bg-warning-tint p-4 flex items-start gap-3">
                <Clock className="h-4 w-4 tk-text-warning shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed tk-text-warning">
                  <div className="font-extrabold tk-text-warning">
                    {isTrialExpired ? copy.paywallTitleExpired : copy.paywallTitleUnlock}
                  </div>
                  <p>{triggerReason}</p>
                  <p className="text-[11px] tk-text-warning">{copy.paywallSafeNote}</p>
                </div>
              </div>
            )}

            {/* Active Pro Status Banner when already unlocked */}
            {isProActive && (
              <div className="rounded-2xl border tk-bc-hair tk-bg-forest-tint p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="font-extrabold tk-text-forest">{copy.activeBannerTitle}</div>
                  <div className="font-num tk-text-ink2 tabular-nums">
                    {copy.activeBannerValidUntil(expiresDateLabel || '')}
                    {redeemedCode ? copy.activeBannerCode(redeemedCode) : ''}
                  </div>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-bg-forest text-white shrink-0">
                  <Check className="h-4 w-4" />
                </span>
              </div>
            )}

            {/* Owner Admin Direct Shortcut to Code Generator */}
            {isVerifiedAdminUser(authUser) && onOpenAdminCodeGenerator && (
              <button
                type="button"
                onClick={onOpenAdminCodeGenerator}
                className="w-full rounded-2xl border tk-bc-forest tk-bg-forest-tint p-4 flex items-center justify-between gap-3 text-left hover:tk-bg-warning-tint transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl tk-bg-forest text-white">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold tk-text-ink">
                      {copy.ownerShortcutTitle}
                    </div>
                    <div className="mt-0.5 text-xs tk-text-ink2 truncate">
                      {copy.ownerShortcutSub}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold tk-text-forest shrink-0">
                  {copy.ownerShortcutOpen}
                </span>
              </button>
            )}

            {/* Private Domain Welfare + Step-by-Step Guide + One-Time Redeem Code Section */}
            <section
              ref={redeemSectionRef}
              className="rounded-2xl border tk-bc-hair bg-white p-5 space-y-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold tk-text-ink">{copy.claimTitle}</h3>
                  <span className="font-num text-xs font-bold tk-text-forest tabular-nums">
                    {copy.claimValue}
                  </span>
                </div>
                <p className="text-xs tk-text-ink2 leading-relaxed">
                  {copy.claimDescBefore}
                  <strong className="tk-text-ink">{copy.claimDescStrong}</strong>
                  {copy.claimDescAfter}
                </p>
              </div>

              {/* Direct Jump Buttons: WhatsApp + Facebook */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={buildWhatsAppClaimUrl(activePlanSpec.whatsappMsg, activeLang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] rounded-xl tk-bg-success px-3.5 py-2.5 text-xs font-bold text-white hover:tk-bg-press transition-colors flex items-center justify-between gap-2 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">{copy.whatsappBtn}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-85 shrink-0" />
                </a>

                <a
                  href={FACEBOOK_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] rounded-xl tk-bg-swatch-3 px-3.5 py-2.5 text-xs font-bold text-white hover:tk-bg-forest-tint transition-colors flex items-center justify-between gap-2 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[11px] font-black tk-text-swatch-3 shrink-0">
                      f
                    </span>
                    <span className="truncate">
                      {copy.fbPagePrefix}
                      {FACEBOOK_PAGE_HANDLE}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-85 shrink-0" />
                </a>
              </div>

              {/* Detailed Step-by-Step Guide Card */}
              <div className="rounded-xl border tk-bc-hair tk-bg-paper overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGuideExpanded((prev) => !prev)}
                  aria-expanded={guideExpanded}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:tk-bg-warning-tint transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tk-text-ink">
                    <HelpCircle className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                    {copy.guideTitle}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-forest shrink-0">
                    {guideExpanded ? copy.guideHide : copy.guideShow}
                    {guideExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>

                {guideExpanded && (
                  <div className="border-t tk-bc-hair px-3.5 py-3.5 space-y-3 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full tk-bg-forest font-num text-[11px] font-bold text-white">
                        1
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="font-bold tk-text-ink">{copy.step1Title}</div>
                        <p className="tk-text-ink2 leading-relaxed">{copy.step1Desc}</p>
                        <div className="space-y-1.5 rounded-lg border tk-bc-hair bg-white p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate tk-text-ink2">
                              • WhatsApp：<strong className="font-num tk-text-ink tabular-nums">{WHATSAPP_DISPLAY}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleCopyWhatsAppNumber()}
                              className="inline-flex items-center gap-1 text-[11px] font-bold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {copiedWhatsapp ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  {copy.copied}
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  {copy.copyNum}
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t tk-bc-hair">
                            <span className="truncate tk-text-ink2">
                              • {copy.fbPageLabel}
                              <strong className="tk-text-ink">{FACEBOOK_PAGE_HANDLE}</strong>
                              {copy.fbDmHint}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleCopyFacebookHandle()}
                              className="inline-flex items-center gap-1 text-[11px] font-bold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {copiedFbHandle ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  {copy.copied}
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  {copy.copyHandle}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full tk-bg-forest font-num text-[11px] font-bold text-white">
                        2
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold tk-text-ink">{copy.step2Title}</span>
                          <button
                            type="button"
                            onClick={() => void handleCopyClaimMessage()}
                            className="inline-flex items-center gap-1 rounded-md border tk-bc-hair bg-white px-2 py-0.5 text-[11px] font-bold tk-text-forest hover:tk-bg-forest-tint transition-colors cursor-pointer"
                          >
                            {copiedClaimText ? (
                              <>
                                <Check className="h-3 w-3 tk-text-forest" />
                                {copy.copiedMsg}
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 tk-text-forest" />
                                {copy.copyMsg}
                              </>
                            )}
                          </button>
                        </div>
                        <p className="tk-text-ink2 leading-relaxed">
                          {copy.step2BodyPrefix}
                          <strong className="tk-text-ink">{copy.step2Keyword}</strong>
                          {copy.step2BodyMid}
                          <code className="rounded bg-white px-1.5 py-0.5 font-num font-bold tk-text-forest border tk-bc-hair">
                            TK1Y-8K4M-9X2P
                          </code>
                          {copy.step2BodySuffix1}
                          <code className="rounded bg-white px-1.5 py-0.5 font-num font-bold tk-text-forest border tk-bc-hair">
                            TKLT
                          </code>
                          {copy.step2BodySuffix2}
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full tk-bg-forest font-num text-[11px] font-bold text-white">
                        3
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold tk-text-ink">{copy.step3Title}</span>
                          <button
                            type="button"
                            onClick={() => codeInputRef.current?.focus()}
                            className="text-[11px] font-bold tk-text-forest hover:underline cursor-pointer"
                          >
                            {copy.enterCodeJump}
                          </button>
                        </div>
                        <p className="tk-text-ink2 leading-relaxed">
                          {copy.step3BodyBefore}
                          <strong className="tk-text-ink">{copy.step3ActivateLabel}</strong>
                          {copy.step3BodyAfter}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* One-Time Redeem Code Form */}
              <form onSubmit={(e) => void handleRedeemSubmit(e)} className="pt-2 border-t tk-bc-hair space-y-2.5">
                <label
                  htmlFor="tripkit-redeem-input"
                  className="flex items-center justify-between text-xs font-bold tk-text-ink"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 tk-text-forest" />
                    {copy.redeemInputLabel}
                  </span>
                  <span className="text-[11px] font-normal tk-text-ink2">
                    {authUser
                      ? copy.bindsTo(authUser.email || copy.fallbackCurrentAcct)
                      : copy.bindsHint}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={codeInputRef}
                    id="tripkit-redeem-input"
                    type="text"
                    maxLength={14}
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(normalizeRedeemCodeInput(e.target.value));
                      if (redeemError) setRedeemError(null);
                    }}
                    placeholder={copy.codePlaceholder}
                    className="min-h-[44px] flex-1 rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2 font-num text-sm font-extrabold tracking-wider uppercase tk-text-ink tabular-nums placeholder:font-normal placeholder:tracking-normal placeholder:text-xs focus:tk-bc-forest focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={redeemBusy}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl tk-bg-forest px-4 py-2 text-xs font-bold text-white hover:tk-bg-press disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    {redeemBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {copy.verifying}
                      </>
                    ) : (
                      copy.activateBtn
                    )}
                  </button>
                </div>

                {redeemError && (
                  <div className="rounded-xl border tk-bc-danger-hair tk-bg-danger-tint px-3 py-2 flex items-start gap-2 text-xs tk-text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{redeemError}</span>
                  </div>
                )}
              </form>
            </section>

            {/* Quantitative Proof Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-0.5 text-xs tk-text-ink2">
              <span className="inline-flex items-center gap-0.5 tk-text-warning" aria-label="4.9 rating">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
              </span>
              <span className="font-num font-bold tk-text-ink tabular-nums">
                {copy.ratingLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>{copy.ratingDesc}</span>
            </div>

            {/* Plan Value Anchor Selector Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold tk-text-ink">{copy.plansHeading}</h3>
                {isProActive && (
                  <span className="text-xs font-semibold tk-text-forest">
                    {copy.currentPlanLabel(
                      planOptions.find((p) => p.id === currentPlan)?.title || planOptions[0].title
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {planOptions.map((plan) => {
                  const selected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
 selected
 ? 'tk-bc-forest tk-bg-forest-tint'
 : 'tk-bc-hair bg-white hover:tk-bc-hair'
 }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
 selected
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white'
 }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-extrabold tk-text-ink">
                              {plan.title}
                            </span>
                            {plan.badge && (
                              <span className="rounded-md tk-bg-forest px-2 py-0.5 font-num text-[11px] font-bold text-white tabular-nums">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-num text-xs tk-text-ink2 tabular-nums">
                            {plan.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-num text-base font-extrabold tk-text-ink tabular-nums">
                          {plan.priceText}
                        </div>
                        {plan.priceSubtext && (
                          <div className="mt-0.5 text-[11px] tk-text-ink2">
                            {plan.priceSubtext}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Full Included Features Card */}
            <section className="rounded-2xl border tk-bc-hair bg-white p-5">
              <h3 className="text-base font-extrabold tk-text-ink">
                {copy.everythingHeading}
              </h3>
              <div className="mt-4 space-y-4">
                {includedFeatures.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="flex items-start gap-3.5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full tk-bg-forest-tint tk-text-forest mt-0.5">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold tk-text-ink">{feat.title}</div>
                        <p className="mt-0.5 text-xs tk-text-ink2 leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Traveler Testimonials Section */}
            <section>
              <h3 className="text-base font-extrabold tk-text-ink mb-3">
                {copy.reviewsHeading}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reviews.map((rev) => (
                  <article
                    key={rev.author}
                    className="rounded-2xl border tk-bc-hair bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-0.5 tk-text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </div>
                      <h4 className="mt-2 text-sm font-bold tk-text-ink">{rev.headline}</h4>
                      <p className="mt-1.5 text-xs tk-text-ink2 leading-relaxed">
                        {rev.quote}
                      </p>
                    </div>
                    <div className="pt-2 border-t tk-bc-hair text-[11px] tk-text-ink2">
                      <strong className="tk-text-ink">{rev.author}</strong> · {rev.role}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Sticky Bottom CTA Footer */}
        <div className="border-t tk-bc-hair bg-white/95 px-5 py-4">
          {codeInput.trim().length > 0 ? (
            <button
              type="button"
              disabled={redeemBusy}
              onClick={() => void handleRedeemSubmit()}
              className="w-full min-h-[48px] rounded-2xl tk-bg-forest px-5 py-3 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              {redeemBusy ? copy.ctaVerifying : copy.ctaRedeem(codeInput)}
            </button>
          ) : isProActive ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-2xl tk-bg-forest px-5 py-3 text-sm font-bold text-white hover:tk-bg-press transition-all cursor-pointer whitespace-nowrap"
            >
              {copy.ctaActiveReturn(expiresDateLabel || '')}
            </button>
          ) : (
            <a
              href={buildWhatsAppClaimUrl(activePlanSpec.whatsappMsg, activeLang)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                scrollToRedeemSection();
              }}
              className="w-full min-h-[48px] rounded-2xl tk-bg-forest px-5 py-3 text-sm font-bold text-white hover:tk-bg-press transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {selectedPlan === 'annual'
                ? copy.ctaAnnualWhatsapp
                : copy.ctaOtherWhatsapp(activePlanSpec.title, activePlanSpec.priceText)}
            </a>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] tk-text-ink2">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 tk-text-forest" />
              {copy.footerShield}
            </span>

            {isProActive ? (
              <button
                type="button"
                onClick={() => {
                  onDeactivatePro();
                  onClose();
                }}
                className="font-semibold tk-text-ink2 hover:tk-text-danger underline cursor-pointer whitespace-nowrap"
              >
                {copy.switchTrialPreview}
              </button>
            ) : (
              <button
                type="button"
                disabled={restoreBusy}
                onClick={() => void handleRestoreCloudEntitlement()}
                className="font-semibold tk-text-forest hover:underline disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {restoreBusy ? copy.checkingCloud : copy.restoreCloud}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Luggage,
  Bell,
  Sparkles,
  Heart,
  Crown,
  Cloud,
  Download,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Shield,
  FileText,
  LogIn,
  LogOut,
  Pencil,
  KeyRound,
  Copy,
  RefreshCw,
  Loader2,
  FlaskConical,
  RotateCcw,
  UserCheck,
  Database,
  SlidersHorizontal,
  Map as MapIcon,
  Globe,
  Tag,
} from 'lucide-react';
import { SettingsMapPreviewCard } from './SettingsMapPreviewCard';
import { AccentIconBadge, resolvePackingGroupIconMeta } from '../utils/accentTheme';
import {
  formatScheduleBadgeLabel,
  type ResolvedScheduledAlert,
} from '../utils/notificationScheduler';
import { signOut, type User } from 'firebase/auth';
import { auth, formatCloudSyncError } from '../firebase';
import { signInWithGoogleInteractive } from '../services/googleSignIn';
import {
  deleteAdminRedeemCode,
  fetchAdminRedeemCodes,
  generateAdminRedeemCodes,
  isVerifiedAdminUser,
  type RedeemCodeRecord,
  type RedeemPlanType,
} from '../services/proRedeemService';
import { CurrencyPickerModal } from './CurrencyPickerModal';
import {
  BAGGAGE_PRESET_SPECS,
  DEFAULT_AFFILIATE_PARTNERS,
  FREE_AI_AUDIT_LIMIT,
  LANGUAGE_SPECS,
  SUPPORTED_APP_LANGUAGES,
  normalizeAppLanguage,
  detectSystemLanguage,
  formatDateByPref,
  formatTotalWeightByPref,
  getBaggagePresetLabels,
  getHomeCurrencyLabel,
  type MembershipStatus,
} from '../utils/preferencesHelpers';
import { translateGroupCubeLabel, translateGroupTitleLabel } from '../i18n';
import { getSettingsModalCopy } from '../i18n/packs/settingsAndProPack';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  AppPreferences,
  BaggagePresetId,
  PackingGroup,
  PackingReminderSettings,
  SavedTripEntry,
  TimeFormatPref,
  UnitSystem,
} from '../types';

type SettingsSubView =
  | 'main'
  | 'admin_codes'
  | 'affiliate_partners'
  | 'categories'
  | 'whats_new'
  | 'feedback'
  | 'terms'
  | 'privacy';

export type SettingsFocusSection = 'top' | 'language' | 'baggage';

interface SettingsModalProps {
  open: boolean;
  initialSubView?: SettingsSubView;
  initialFocusSection?: SettingsFocusSection;
  onClose: () => void;
  preferences: AppPreferences;
  membershipStatus: MembershipStatus;
  onUpdatePreferences: (updates: Partial<AppPreferences>) => void;
  onSwitchLanguage?: (nextLang: AppLanguage, syncRegional: boolean) => void;
  onFollowSystemLanguage?: (syncRegional: boolean) => void;
  onOpenProModal: () => void;
  onOpenExpertAudit: () => void;
  // Packing Categories & AI Memory
  groups: PackingGroup[];
  learnedCategoryMap: Record<string, string>;
  onAddGroup: (
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey']
  ) => void;
  onUpdateGroup: (
    groupId: string,
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey']
  ) => void;
  onDeleteGroup: (groupId: string) => void;
  onReorderGroups: (sourceGroupId: string, targetGroupId: string) => void;
  onDeleteLearnedCategory: (itemName: string) => void;
  onClearLearnedCategories: () => void;
  // Notifications & Badges
  unpackedCount: number;
  reminder: PackingReminderSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  onUpdateReminder: (next: PackingReminderSettings) => void;
  onRequestBrowserPermission: () => Promise<unknown> | void;
  onTriggerTestReminder: () => void;
  scheduledAlerts?: ResolvedScheduledAlert[];
  onRemoveScheduledAlert?: (alert: ResolvedScheduledAlert) => void;
  // Cloud & Backup
  authUser: User | null;
  activeRoomId: string | null;
  tripBook: SavedTripEntry[];
  activeTripId: string;
  onImportBackupData: (payload: {
    tripBook: SavedTripEntry[];
    activeTripId?: string;
    preferences?: Partial<AppPreferences>;
  }) => void;
  activeCityHint?: string;
  onOpenAuthModal?: (mode: 'signin' | 'account') => void;
  onToast: (msg: string) => void;
}

const COLOR_SWATCHES: Array<{
  key: PackingGroup['colorKey'];
  swatchClass: string;
}> = [
  { key: 'teal', swatchClass: 'tk-bg-forest' },
  { key: 'lavender', swatchClass: 'tk-bg-swatch-2' },
  { key: 'peach', swatchClass: 'tk-bg-swatch-1' },
  { key: 'lemon', swatchClass: 'tk-bg-warning' },
  { key: 'rose', swatchClass: 'tk-bg-danger' },
  { key: 'mint', swatchClass: 'tk-bg-success' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  initialSubView = 'main',
  initialFocusSection = 'top',
  onClose,
  preferences,
  membershipStatus,
  onUpdatePreferences,
  onSwitchLanguage,
  onFollowSystemLanguage,
  onOpenProModal,
  onOpenExpertAudit,
  groups,
  learnedCategoryMap,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroups,
  onDeleteLearnedCategory,
  onClearLearnedCategories,
  unpackedCount,
  reminder,
  notificationPermission,
  onUpdateReminder,
  onRequestBrowserPermission,
  onTriggerTestReminder,
  scheduledAlerts = [],
  onRemoveScheduledAlert,
  authUser,
  activeRoomId,
  tripBook,
  activeTripId,
  onImportBackupData,
  activeCityHint = 'Paris',
  onOpenAuthModal,
  onToast,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getSettingsModalCopy(activeLang);
  const [subView, setSubView] = useState<SettingsSubView>('main');
  const [authBusy, setAuthBusy] = useState(false);
  const [syncRegionalOnLangChange, setSyncRegionalOnLangChange] = useState(true);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const activeTripEntry =
    tripBook.find((entry) => entry.id === activeTripId) || tripBook[0];

  // Admin Redeem Code Generator State
  const [adminPlanType, setAdminPlanType] = useState<RedeemPlanType>('annual');
  const [adminNote, setAdminNote] = useState(copy.defaultAdminNote);
  const [adminCodes, setAdminCodes] = useState<RedeemCodeRecord[]>([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminFilter, setAdminFilter] = useState<'all' | 'unused' | 'redeemed'>('all');
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  // Category creation & editing states
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatCube, setNewCatCube] = useState('');
  const [newCatColor, setNewCatColor] = useState<PackingGroup['colorKey']>('teal');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editCatTitle, setEditCatTitle] = useState('');
  const [editCatCube, setEditCatCube] = useState('');
  const [editCatColor, setEditCatColor] = useState<PackingGroup['colorKey']>('teal');

  // Custom baggage fine-tuning drawer
  const [showCustomBaggage, setShowCustomBaggage] = useState(
    preferences.baggagePreset === 'custom'
  );

  // Feedback form state
  const [feedbackTopic, setFeedbackTopic] = useState<'feature' | 'packing' | 'finance' | 'bug'>(
    'feature'
  );
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [confirmClearMemory, setConfirmClearMemory] = useState(false);

  // Affiliate partner tags form state
  const [affiliateDraft, setAffiliateDraft] = useState<AffiliatePartnerConfig>(() => ({
    ...DEFAULT_AFFILIATE_PARTNERS,
    ...(preferences.affiliatePartners || {}),
  }));

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const languageSectionRef = useRef<HTMLDivElement | null>(null);
  const baggageSectionRef = useRef<HTMLDivElement | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<'language' | 'baggage' | null>(null);
  const isOwnerAdmin = isVerifiedAdminUser(authUser);

  const loadAdminCodes = useCallback(async () => {
    if (!authUser || !isVerifiedAdminUser(authUser)) return;
    setAdminBusy(true);
    try {
      const list = await fetchAdminRedeemCodes(authUser);
      setAdminCodes(list);
    } catch (err) {
      onToast(formatCloudSyncError(err));
    } finally {
      setAdminBusy(false);
    }
  }, [authUser, onToast]);

  useEffect(() => {
    if (open) {
      setSubView(initialSubView === 'admin_codes' && isOwnerAdmin ? 'admin_codes' : 'main');
      setFeedbackSubmitted(false);
      setConfirmClearMemory(false);
      setAffiliateDraft({
        ...DEFAULT_AFFILIATE_PARTNERS,
        ...(preferences.affiliatePartners || {}),
      });
    } else {
      setHighlightedSection(null);
    }
  }, [open, initialSubView, isOwnerAdmin, preferences.affiliatePartners]);

  useEffect(() => {
    if (!open || subView !== 'main') return;
    if (initialFocusSection !== 'language' && initialFocusSection !== 'baggage') return;
    const target =
      initialFocusSection === 'baggage'
        ? baggageSectionRef.current
        : languageSectionRef.current;
    if (!target) return;
    setHighlightedSection(initialFocusSection);
    const scrollTimer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    const clearTimer = window.setTimeout(() => {
      setHighlightedSection((prev) => (prev === initialFocusSection ? null : prev));
    }, 2200);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [open, subView, initialFocusSection]);

  useEffect(() => {
    if (open && subView === 'admin_codes' && isOwnerAdmin) {
      void loadAdminCodes();
    }
  }, [open, subView, isOwnerAdmin, loadAdminCodes]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (subView !== 'main') {
          setSubView('main');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, subView, onClose]);

  if (!open) return null;

  const learnedEntries = Object.entries(learnedCategoryMap);
  const {
    isProActive,
    isTrialExpired,
    trialDaysRemaining,
    expiresDateLabel,
    freeAiAuditsRemaining,
  } = membershipStatus;

  const handleMintCodes = async (count: number) => {
    if (!authUser || !isOwnerAdmin) return;
    setAdminBusy(true);
    try {
      const minted = await generateAdminRedeemCodes({
        user: authUser,
        planType: adminPlanType,
        count,
        note: adminNote,
      });
      setAdminCodes((prev) => [...minted, ...prev]);
      onToast(copy.mintedToast(minted.length, adminPlanType === 'lifetime'));
    } catch (err) {
      onToast(formatCloudSyncError(err));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleCopyAdminCode = async (item: RedeemCodeRecord, withReplyTemplate: boolean) => {
    const durationLabel =
      item.planType === 'lifetime' ? copy.durationLifetimeFull : copy.durationAnnualFull;
    const textToCopy = withReplyTemplate
      ? copy.replyTemplate(item.code, durationLabel)
      : item.code;

    try {
      await navigator.clipboard.writeText(textToCopy);
      const key = `${item.code}_${withReplyTemplate ? 'tpl' : 'raw'}`;
      setCopiedCodeKey(key);
      onToast(
        withReplyTemplate ? copy.copiedCodeTpl(item.code) : copy.copiedCodeRaw(item.code)
      );
      setTimeout(() => {
        setCopiedCodeKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      onToast(copy.copyBlocked);
    }
  };

  const handleDeleteCode = async (code: string) => {
    setAdminBusy(true);
    try {
      await deleteAdminRedeemCode(code);
      setAdminCodes((prev) => prev.filter((c) => c.code !== code));
      onToast(copy.revokedCode(code));
    } catch (err) {
      onToast(formatCloudSyncError(err));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleBaggagePresetChange = (preset: BaggagePresetId) => {
    if (preset === 'custom') {
      setShowCustomBaggage(true);
      onUpdatePreferences({ baggagePreset: 'custom' });
      return;
    }
    const spec = BAGGAGE_PRESET_SPECS[preset];
    const presetLabels = getBaggagePresetLabels(preset, activeLang, preferences.unitSystem);
    setShowCustomBaggage(false);
    onUpdatePreferences({
      baggagePreset: preset,
      carryOnLimitKg: spec.carryOnKg,
      checkedLimitKg: spec.checkedKg,
    });
    onToast(copy.baggageToast(presetLabels.shortLabel));
  };

  const adjustLimitKg = (field: 'carryOnLimitKg' | 'checkedLimitKg', delta: number) => {
    const current = preferences[field];
    const maxVal = field === 'carryOnLimitKg' ? 25 : 64;
    const nextVal = Math.min(maxVal, Math.max(0, Number((current + delta).toFixed(1))));
    onUpdatePreferences({
      baggagePreset: 'custom',
      [field]: nextVal,
    });
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    try {
      const result = await signInWithGoogleInteractive();
      if (result.status === 'redirecting') {
        // Browser / WebView navigates away; onAuthStateChanged settles on return.
        return;
      }
      onToast(copy.signedInToast);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled';
      if (!msg.includes('popup-closed-by-user')) {
        onToast(copy.signInError);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
      onToast(copy.signedOutToast);
    } catch {
      onToast(copy.signOutError);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleExportBackupJson = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const backupPayload = {
        app: 'Trip Kit',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        activeTripId,
        preferences,
        tripBook,
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = copy.backupFilename(today);
      document.body.appendChild(a);
      a.click();
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast(copy.exportedToast(tripBook.length));
    } catch {
      onToast(copy.exportFailed);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!Array.isArray(parsed.tripBook) || parsed.tripBook.length === 0) {
          onToast(copy.invalidBackup);
          return;
        }
        const validEntries = parsed.tripBook.filter(
          (entry: SavedTripEntry) =>
            entry &&
            typeof entry.id === 'string' &&
            entry.state &&
            entry.state.setup &&
            entry.state.intel &&
            Array.isArray(entry.state.packing)
        );
        if (validEntries.length === 0) {
          onToast(copy.incompleteBackup);
          return;
        }
        onImportBackupData({
          tripBook: validEntries,
          activeTripId: typeof parsed.activeTripId === 'string' ? parsed.activeTripId : undefined,
          preferences: parsed.preferences,
        });
        onClose();
      } catch {
        onToast(copy.parseBackupFailed);
      }
    };
    reader.readAsText(file);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;
    onAddGroup(
      newCatTitle.trim(),
      newCatCube.trim() || copy.defaultCubeLabel,
      newCatColor
    );
    setNewCatTitle('');
    setNewCatCube('');
    setNewCatColor('teal');
  };

  const startEditCategory = (grp: PackingGroup) => {
    setEditingGroupId(grp.id);
    setEditCatTitle(grp.title);
    setEditCatCube(grp.cubeLabel);
    setEditCatColor(grp.colorKey);
  };

  const saveEditCategory = (groupId: string) => {
    if (!editCatTitle.trim()) return;
    onUpdateGroup(groupId, editCatTitle.trim(), editCatCube.trim(), editCatColor);
    setEditingGroupId(null);
  };

  const subViewTitle: Record<SettingsSubView, string> = {
    main: t('settings.title'),
    ...copy.subViewTitles,
  };

  const filteredAdminCodes = adminCodes.filter((item) => {
    if (adminFilter === 'unused') return item.status === 'unused';
    if (adminFilter === 'redeemed') return item.status === 'redeemed';
    return true;
  });

  return (
    <div
      className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-overlay p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tripkit-settings-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl tk-bg-paper tk-elev-soft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Sheet Header */}
        <div className="flex items-center justify-between border-b tk-bc-hair tk-sheet-header px-5 py-3.5 ">
          <div className="w-20">
            {subView !== 'main' && (
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="inline-flex min-h-[40px] items-center gap-0.5 text-[13px] font-bold tk-text-forest hover:opacity-80 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('common.back')}
              </button>
            )}
          </div>

          <h2
            id="tripkit-settings-title"
            className="font-serif text-base font-extrabold tk-text-ink truncate"
          >
            {subViewTitle[subView]}
          </h2>

          <div className="w-20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border tk-bc-hair bg-white tk-text-ink hover:tk-bg-forest-tint transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-6">
          {subView === 'main' && (
            <>
              {/* Focal Anchor: Trip Kit Pro Membership & Trial Countdown Banner */}
              <button
                type="button"
                onClick={onOpenProModal}
                className={`w-full rounded-[20px] p-4 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
 isProActive
 ? 'border tk-bc-hair bg-white hover:tk-bc-forest'
 : isTrialExpired
 ? 'tk-grad-membership-pro text-white hover:opacity-95'
 : 'tk-grad-membership-teal text-white hover:opacity-95'
 }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${
 isProActive
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'bg-white/15 text-white'
 }`}
                  >
                    <Crown className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[15px] font-extrabold ${
 isProActive ? 'tk-text-ink' : 'text-white'
 }`}
                      >
                        Trip Kit Pro
                      </span>
                      <span
                        className={`font-serif text-[13px] font-bold tabular-nums ${
 isProActive ? 'tk-text-forest' : 'text-white/90'
 }`}
                      >
                        {isProActive
                          ? copy.proActiveDot(expiresDateLabel || '')
                          : isTrialExpired
                          ? copy.proTrialEndedDot
                          : copy.proTrialLeftDot(trialDaysRemaining)}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 font-serif text-[13px] leading-snug tabular-nums ${
 isProActive ? 'tk-text-ink2' : 'text-white/85'
 }`}
                    >
                      {isProActive
                        ? copy.proActiveSub
                        : isTrialExpired
                        ? copy.proExpiredSub
                        : copy.proTrialSub(freeAiAuditsRemaining, FREE_AI_AUDIT_LIMIT)}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-[16px] px-3 py-1.5 text-[13px] font-bold whitespace-nowrap shrink-0 ${
 isProActive
 ? 'tk-bg-forest-tint tk-text-forest'
 : isTrialExpired
 ? 'bg-white tk-text-warning'
 : 'bg-white tk-text-forest'
 }`}
                >
                  {isProActive ? copy.benefitsBtn : copy.redeemClaimBtn}
                </span>
              </button>

              {/* Section 1: 账户与同步 */}
              <section className="pb-6 border-b tk-bc-hair">
                <div className="rounded-[20px] border tk-bc-hair tk-bg-card overflow-hidden">
                  <div className="tk-bg-forest-tint border-b tk-bc-hair px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[16px] bg-white tk-text-forest">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-extrabold tk-text-ink">
                          {copy.accountSectionTitle}
                        </h3>
                        <p className="mt-0.5 text-[13px] leading-relaxed tk-text-ink2">
                          {copy.accountSectionDesc}
                        </p>
                      </div>
                    </div>
                    <span className="font-serif text-[13px] font-semibold tk-text-forest whitespace-nowrap shrink-0 tabular-nums mt-0.5">
                      {activeRoomId ? copy.roomBadge(activeRoomId) : copy.localFirstBadge}
                    </span>
                  </div>

                  <div className="ml-3 sm:ml-4 divide-y tk-divide-hair">
                    {/* Row 1: Google Cloud Account */}
                    <div className="pl-2.5 pr-4 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] tk-bg-forest-tint tk-text-forest">
                          <Cloud className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink truncate">
                            {authUser
                              ? authUser.displayName ||
                                authUser.email ||
                                copy.accountConnectedFallback
                              : copy.cloudAccountTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2 break-words">
                            {authUser
                              ? activeRoomId
                                ? `${authUser.email || copy.signedInWord} · ${copy.liveRoomWord(
                                    activeRoomId
                                  )}`
                                : `${authUser.email || copy.readyWord} · ${copy.manageSub}`
                              : copy.signInSub}
                          </div>
                        </div>
                      </div>

                      {authUser ? (
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={() => {
                            if (onOpenAuthModal) {
                              onOpenAuthModal('account');
                            } else {
                              void handleGoogleSignOut();
                            }
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-[16px] border tk-bc-hair bg-white px-3 py-1.5 text-[13px] font-semibold tk-text-ink hover:tk-bc-forest hover:tk-text-forest whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {onOpenAuthModal ? (
                            <span>{copy.manageBtn}</span>
                          ) : (
                            <>
                              <LogOut className="h-4 w-4" />
                              {copy.signOutBtn}
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={() => {
                            if (onOpenAuthModal) {
                              onOpenAuthModal('signin');
                            } else {
                              void handleGoogleSignIn();
                            }
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-[16px] tk-bg-forest px-3 py-1.5 text-[13px] font-bold text-white hover:tk-bg-forest whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <LogIn className="h-4 w-4" />
                          {copy.signInBtn}
                        </button>
                      )}
                    </div>

                    {/* Row 2: Pro Code Binding & Cross-Device Sync */}
                    <button
                      type="button"
                      onClick={onOpenProModal}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-tl-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] tk-bg-warning-tint tk-text-warning">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.activationTitle}
                          </div>
                          <div className="mt-0.5 font-serif text-[13px] leading-snug tk-text-ink2 tabular-nums">
                            {isProActive && preferences.redeemedCode
                              ? copy.activationCodeBound(preferences.redeemedCode, expiresDateLabel || '')
                              : isProActive
                              ? copy.activationProActive(expiresDateLabel || '')
                              : copy.activationPrompt}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                    </button>

                    {/* Row 3 (Owner Exclusive): Direct Admin Redeem Code Generator at Top */}
                    {isOwnerAdmin && (
                      <button
                        type="button"
                        onClick={() => setSubView('admin_codes')}
                        className="w-full pl-2.5 pr-4 py-3.5 rounded-l-lg flex items-center justify-between gap-3 text-left tk-bg-forest-tint hover:tk-bg-forest-tint transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] tk-bg-forest text-white">
                            <KeyRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[15px] font-extrabold tk-text-ink">
                              {copy.ownerConsoleTitle}
                            </div>
                            <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                              {copy.ownerConsoleSub}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 tk-text-forest shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 2: 出行与全局偏好 / Travel & Regional Preferences */}
              <section>
                <h3 className="px-1 mb-2 text-[13px] font-bold tk-text-ink2">
                  {t('settings.sectionRegional')}
                </h3>
                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  {/* Language & Regional Conventions (zh-CN / en-US North America / en-GB Europe) */}
                  <div
                    ref={languageSectionRef}
                    className={`px-4 py-3.5 space-y-3 transition-colors duration-500 rounded-t-2xl ${
 highlightedSection === 'language'
 ? 'tk-bg-forest-tint ring-2 ring-inset tk-ring-forest'
 : ''
 }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="teal" icon={Globe} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {t('settings.languageLabel')}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                            {LANGUAGE_SPECS[preferences.language || 'en-US'].regionNote}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onFollowSystemLanguage) {
                            onFollowSystemLanguage(syncRegionalOnLangChange);
                          } else {
                            const detected = detectSystemLanguage();
                            const spec = LANGUAGE_SPECS[detected];
                            onUpdatePreferences(
                              syncRegionalOnLangChange
                                ? {
                                    language: detected,
                                    followSystemLanguage: true,
                                    unitSystem: spec.recommendedUnit,
                                    timeFormat: spec.recommendedTimeFormat,
                                  }
                                : { language: detected, followSystemLanguage: true }
                            );
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-[16px] border px-2.5 py-1.5 text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 preferences.followSystemLanguage
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bc-forest hover:tk-text-ink'
 }`}
                      >
                        {preferences.followSystemLanguage && (
                          <Check className="h-3 w-3 shrink-0" />
                        )}
                        <span>{copy.followSystemBtn}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SUPPORTED_APP_LANGUAGES.map((code) => {
                        const spec = LANGUAGE_SPECS[code];
                        const active = (preferences.language || 'en-US') === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              if (onSwitchLanguage) {
                                onSwitchLanguage(code, syncRegionalOnLangChange);
                              } else {
                                onUpdatePreferences(
                                  syncRegionalOnLangChange
                                    ? {
                                        language: code,
                                        followSystemLanguage: false,
                                        unitSystem: spec.recommendedUnit,
                                        timeFormat: spec.recommendedTimeFormat,
                                      }
                                    : { language: code, followSystemLanguage: false }
                                );
                              }
                            }}
                            className={`rounded-[16px] border p-2.5 text-left transition-colors cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest-tint'
 : 'tk-bc-hair tk-bg-paper hover:tk-bc-hair'
 }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[13px] font-extrabold tk-text-ink truncate">
                                {spec.nativeLabel}
                              </span>
                              {active && <Check className="h-4 w-4 tk-text-forest shrink-0" />}
                            </div>
                            <p className="mt-0.5 text-[10.5px] tk-text-ink2 leading-snug line-clamp-2">
                              {spec.regionNote}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <label className="inline-flex items-center gap-2 text-[13px] font-medium tk-text-ink2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncRegionalOnLangChange}
                        onChange={(e) => setSyncRegionalOnLangChange(e.target.checked)}
                        className="rounded tk-bc-hair tk-accent-forest"
                      />
                      <span>{t('settings.syncRegionalConventions')}</span>
                    </label>
                  </div>

                  {/* Airline Baggage Allowance */}
                  <div
                    ref={baggageSectionRef}
                    className={`px-4 py-3.5 space-y-2.5 transition-colors duration-500 ${
 highlightedSection === 'baggage'
 ? 'tk-bg-forest-tint ring-2 ring-inset tk-ring-forest'
 : ''
 }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AccentIconBadge accent="teal" icon={Luggage} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink leading-snug">
                            {t('settings.baggageLabel')}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2 tabular-nums">
                            {`${t('settings.carryOnShort')} ${formatTotalWeightByPref(
                              preferences.carryOnLimitKg * 1000,
                              preferences.unitSystem
                            )} · ${t('settings.checkedShort')} ${
                              preferences.checkedLimitKg <= 0
                                ? copy.noneChecked
                                : formatTotalWeightByPref(
                                    preferences.checkedLimitKg * 1000,
                                    preferences.unitSystem
                                  )
                            }`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <select
                      aria-label={t('settings.baggageLabel')}
                      value={preferences.baggagePreset}
                      onChange={(e) =>
                        handleBaggagePresetChange(e.target.value as BaggagePresetId)
                      }
                      className="font-serif w-full h-10 rounded-[16px] border tk-bc-hair tk-bg-paper px-3 text-base sm:text-sm font-bold tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none truncate cursor-pointer"
                    >
                      <option value="lcc">
                        {getBaggagePresetLabels('lcc', activeLang, preferences.unitSystem).label}
                      </option>
                      <option value="standard">
                        {getBaggagePresetLabels('standard', activeLang, preferences.unitSystem).label}
                      </option>
                      <option value="business">
                        {getBaggagePresetLabels('business', activeLang, preferences.unitSystem).label}
                      </option>
                      <option value="custom">
                        {getBaggagePresetLabels('custom', activeLang, preferences.unitSystem).label}
                      </option>
                    </select>

                    {(showCustomBaggage || preferences.baggagePreset === 'custom') && (
                      <div className="pt-2.5 border-t tk-bc-hair grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[13px]">
                        <div className="flex items-center justify-between rounded-[16px] tk-bg-paper px-3 py-2">
                          <span className="font-semibold tk-text-ink2 whitespace-nowrap">
                            {t('settings.carryOnShort')}
                          </span>
                          <div className="inline-flex items-center gap-1.5 font-serif tabular-nums">
                            <button
                              type="button"
                              onClick={() => adjustLimitKg('carryOnLimitKg', -0.5)}
                              className="h-6 w-6 rounded-md bg-white font-bold tk-text-ink hover:tk-text-forest cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-14 text-center font-bold tk-text-ink">
                              {formatTotalWeightByPref(
                                preferences.carryOnLimitKg * 1000,
                                preferences.unitSystem
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustLimitKg('carryOnLimitKg', 0.5)}
                              className="h-6 w-6 rounded-md bg-white font-bold tk-text-ink hover:tk-text-forest cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-[16px] tk-bg-paper px-3 py-2">
                          <span className="font-semibold tk-text-ink2 whitespace-nowrap">
                            {t('settings.checkedShort')}
                          </span>
                          <div className="inline-flex items-center gap-1.5 font-serif tabular-nums">
                            <button
                              type="button"
                              onClick={() => adjustLimitKg('checkedLimitKg', -1)}
                              className="h-6 w-6 rounded-md bg-white font-bold tk-text-ink hover:tk-text-forest cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-14 text-center font-bold tk-text-ink">
                              {formatTotalWeightByPref(
                                preferences.checkedLimitKg * 1000,
                                preferences.unitSystem
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustLimitKg('checkedLimitKg', 1)}
                              className="h-6 w-6 rounded-md bg-white font-bold tk-text-ink hover:tk-text-forest cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Home Reference Currency (32 Global Currencies Searchable Sheet) */}
                  <button
                    type="button"
                    onClick={() => setCurrencyPickerOpen(true)}
                    className="w-full px-4 min-h-[50px] flex items-center justify-between gap-3 text-left hover:tk-bg-paper transition-colors cursor-pointer"
                  >
                    <span className="text-[15px] font-bold tk-text-ink shrink-0">
                      {t('settings.homeCurrencyLabel')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-[62%]">
                      <span className="truncate text-sm font-semibold tk-text-ink2 font-serif tabular-nums">
                        {getHomeCurrencyLabel(preferences.homeCurrency, activeLang)}
                      </span>
                      <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                    </span>
                  </button>

                  {/* Unit System */}
                  <div className="px-4 min-h-[50px] flex items-center justify-between gap-3">
                    <span className="text-[15px] font-bold tk-text-ink shrink-0">
                      {t('settings.unitSystemLabel')}
                    </span>
                    <select
                      aria-label={t('settings.unitSystemLabel')}
                      value={preferences.unitSystem}
                      onChange={(e) => {
                        const nextUnit = e.target.value as UnitSystem;
                        onUpdatePreferences({ unitSystem: nextUnit });
                        onToast(
                          nextUnit === 'imperial'
                            ? t('settings.unitImperial')
                            : t('settings.unitMetric')
                        );
                      }}
                      className="min-w-0 max-w-[58%] truncate bg-transparent text-right text-base sm:text-sm font-semibold tk-text-ink2 focus:tk-text-forest focus:outline-none cursor-pointer"
                    >
                      <option value="metric">{t('settings.unitMetric')}</option>
                      <option value="imperial">{t('settings.unitImperial')}</option>
                    </select>
                  </div>

                  {/* Time Format */}
                  <div className="px-4 min-h-[50px] flex items-center justify-between gap-3">
                    <span className="text-[15px] font-bold tk-text-ink shrink-0">
                      {t('settings.timeFormatLabel')}
                    </span>
                    <select
                      aria-label={t('settings.timeFormatLabel')}
                      value={preferences.timeFormat}
                      onChange={(e) => {
                        const nextFmt = e.target.value as TimeFormatPref;
                        onUpdatePreferences({ timeFormat: nextFmt });
                        onToast(
                          nextFmt === '12h' ? t('settings.time12h') : t('settings.time24h')
                        );
                      }}
                      className="min-w-0 max-w-[58%] truncate bg-transparent text-right text-base sm:text-sm font-semibold tk-text-ink2 focus:tk-text-forest focus:outline-none cursor-pointer"
                    >
                      <option value="24h">{t('settings.time24h')}</option>
                      <option value="12h">{t('settings.time12h')}</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Section 3: Notifications & Alerts */}
              <section>
                <h3 className="px-1 mb-2 text-[13px] font-bold tk-text-ink2">
                  {copy.notificationsTitle}
                </h3>
                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  {/* Browser Notification Permission + Countdown Lead Time */}
                  <div className="px-4 py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="peach" icon={Bell} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.departureAlertsTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] tk-text-ink2">
                            {copy.departureAlertsDesc}
                          </div>
                        </div>
                      </div>

                      {notificationPermission !== 'granted' &&
                      notificationPermission !== 'unsupported' ? (
                        <button
                          type="button"
                          onClick={() => void onRequestBrowserPermission()}
                          className="rounded-[16px] tk-bg-forest px-3 py-1.5 text-[13px] font-bold text-white hover:tk-bg-press whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {copy.allowAlertsBtn}
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={reminder.enabled}
                          onClick={() =>
                            onUpdateReminder({ ...reminder, enabled: !reminder.enabled })
                          }
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
 reminder.enabled ? 'tk-bg-success' : 'tk-bg-forest-plate'
 }`}
                        >
                          <span
                            className={`inline-block h-5.5 w-5.5 rounded-full bg-white shadow transition-transform ${
 reminder.enabled ? 'translate-x-5.5' : 'translate-x-1'
 }`}
                          />
                        </button>
                      )}
                    </div>

                    {reminder.enabled && (
                      <div className="pt-2.5 border-t tk-bc-hair space-y-2 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium tk-text-ink2">
                            {copy.alertTimingLabel}
                          </span>
                          <button
                            type="button"
                            onClick={onTriggerTestReminder}
                            className="font-semibold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {copy.sendTestAlertBtn}
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {([72, 24, 12, 3] as const).map((hrs) => (
                            <button
                              key={hrs}
                              type="button"
                              onClick={() =>
                                onUpdateReminder({
                                  ...reminder,
                                  mode: 'preset',
                                  leadHours: hrs,
                                })
                              }
                              className={`h-8 rounded-lg px-2 text-center text-[13px] font-semibold tabular-nums whitespace-nowrap transition-colors cursor-pointer ${
 reminder.mode === 'preset' && reminder.leadHours === hrs
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-forest'
 : 'tk-bg-forest-plate tk-text-ink2 hover:tk-bg-forest-plate'
 }`}
                            >
                              {copy.hrsOption(hrs)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Workspace Pre-departure Banner Switch */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold tk-text-ink">
                        {copy.bannerTitle}
                      </div>
                      <div className="mt-0.5 text-[13px] tk-text-ink2">
                        {copy.bannerDesc}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.workspaceBannerEnabled}
                      onClick={() =>
                        onUpdatePreferences({
                          workspaceBannerEnabled: !preferences.workspaceBannerEnabled,
                        })
                      }
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
 preferences.workspaceBannerEnabled ? 'tk-bg-success' : 'tk-bg-forest-plate'
 }`}
                    >
                      <span
                        className={`inline-block h-5.5 w-5.5 rounded-full bg-white shadow transition-transform ${
 preferences.workspaceBannerEnabled ? 'translate-x-5.5' : 'translate-x-1'
 }`}
                      />
                    </button>
                  </div>

                  {/* Browser Tab Unpacked Count Badge */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold tk-text-ink">
                        {copy.tabBadgeTitle}
                      </div>
                      <div className="mt-0.5 text-[13px] tk-text-ink2 tabular-nums">
                        {copy.tabBadgeDesc(unpackedCount)}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.tabBadgeEnabled}
                      onClick={() =>
                        onUpdatePreferences({
                          tabBadgeEnabled: !preferences.tabBadgeEnabled,
                        })
                      }
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
 preferences.tabBadgeEnabled ? 'tk-bg-success' : 'tk-bg-forest-plate'
 }`}
                    >
                      <span
                        className={`inline-block h-5.5 w-5.5 rounded-full bg-white shadow transition-transform ${
 preferences.tabBadgeEnabled ? 'translate-x-5.5' : 'translate-x-1'
 }`}
                      />
                    </button>
                  </div>

                  {/* Active Scheduled Local Push Queue (Itinerary Events + Packing Deadlines) */}
                  {(() => {
                    const pendingQueue = scheduledAlerts.filter((a) => !a.isFired);
                    if (pendingQueue.length === 0) return null;
                    const nowSnap = Date.now();
                    return (
                      <div className="px-4 py-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-bold tk-text-ink">
                            {copy.queueTitle(pendingQueue.length)}
                          </span>
                          <span className="text-[13px] tk-text-ink2">
                            {copy.queueTag}
                          </span>
                        </div>
                        <div className="divide-y tk-divide-hair rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-1">
                          {pendingQueue.slice(0, 5).map((item) => (
                            <div
                              key={item.signature}
                              className="py-1.5 flex items-center justify-between gap-2 text-[13px]"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold tk-text-ink truncate">
                                  {item.title}
                                </div>
                                <div className="font-serif text-[13px] tk-text-forest tabular-nums">
                                  {formatScheduleBadgeLabel(
                                    item.triggerAtMs,
                                    nowSnap,
                                    activeLang,
                                    preferences.timeFormat
                                  )}
                                </div>
                              </div>
                              {!item.isAutoRule && onRemoveScheduledAlert && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveScheduledAlert(item)}
                                  title={copy.cancelAlertTitle}
                                  className="h-6 w-6 rounded-md tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger flex items-center justify-center shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <p className="mt-2 px-2 text-[13px] leading-relaxed tk-text-ink2">
                  {notificationPermission === 'granted'
                    ? copy.notifGrantedFoot
                    : copy.notifPendingFoot}
                </p>
              </section>

              {/* Section 4: Data Management */}
              <section className="pb-6 border-b tk-bc-hair">
                <div className="rounded-[20px] border tk-bc-hair tk-bg-card overflow-hidden">
                  <div className="tk-bg-forest-plate border-b tk-bc-hair px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <AccentIconBadge
                        accent="ocean"
                        icon={Database}
                        size="md"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-extrabold tk-text-ink">
                          {copy.dataTitle}
                        </h3>
                        <p className="mt-0.5 text-[13px] leading-relaxed tk-text-ink2">
                          {copy.dataDesc}
                        </p>
                      </div>
                    </div>
                    <span className="font-serif text-[13px] font-semibold tk-text-swatch-3 whitespace-nowrap shrink-0 tabular-nums mt-0.5">
                      {copy.savedCount(tripBook.length)}
                    </span>
                  </div>

                  <div className="ml-3 sm:ml-4 divide-y tk-divide-hair">
                    {/* Export JSON Backup */}
                    <button
                      type="button"
                      onClick={handleExportBackupJson}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-bl-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="teal" icon={Download} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.exportTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2 tabular-nums">
                            {copy.exportDesc(tripBook.length)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                    </button>

                    {/* Import JSON Backup */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-l-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="ocean" icon={Upload} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.importTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                            {copy.importDesc}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />

                    {/* AI Learned Category Memory Reset */}
                    <div className="pl-2.5 pr-4 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="lavender" icon={RotateCcw} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.memoryTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2 tabular-nums">
                            {learnedEntries.length > 0
                              ? copy.memoryCountDesc(learnedEntries.length)
                              : copy.memoryEmptyDesc}
                          </div>
                        </div>
                      </div>

                      {learnedEntries.length > 0 ? (
                        confirmClearMemory ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmClearMemory(false)}
                              className="rounded-lg px-2 py-1.5 text-[13px] font-semibold tk-text-ink2 hover:tk-bg-forest-tint whitespace-nowrap cursor-pointer"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClearLearnedCategories();
                                setConfirmClearMemory(false);
                                onToast(copy.memoryClearedToast);
                              }}
                              className="rounded-lg tk-bg-danger-tint px-2.5 py-1.5 text-[13px] font-bold tk-text-danger hover:tk-bg-danger-tint whitespace-nowrap cursor-pointer"
                            >
                              {copy.confirmClearBtn}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmClearMemory(true)}
                            className="rounded-[16px] border tk-bc-hair bg-white px-3 py-1.5 text-[13px] font-semibold tk-text-ink2 hover:tk-bc-danger hover:tk-text-danger whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {copy.resetCacheBtn}
                          </button>
                        )
                      ) : (
                        <span className="text-[13px] tk-text-ink2 whitespace-nowrap shrink-0">
                          {copy.emptyTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Advanced Features */}
              <section className="pb-6 border-b tk-bc-hair">
                <div className="rounded-[20px] border tk-bc-hair tk-bg-paper overflow-hidden">
                  <div className="tk-bg-forest-plate border-b tk-bc-hair px-4 py-3 flex items-start gap-3">
                    <AccentIconBadge
                      accent="lavender"
                      icon={SlidersHorizontal}
                      size="md"
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-extrabold tk-text-ink">
                        {copy.advancedTitle}
                      </h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed tk-text-swatch-3">
                        {copy.advancedDesc}
                      </p>
                    </div>
                  </div>

                  <div className="ml-3 sm:ml-4 divide-y tk-divide-hair">
                    {/* Custom Packing Categories & Cube Architecture */}
                    <button
                      type="button"
                      onClick={() => setSubView('categories')}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-bl-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="teal" icon={LayoutGrid} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.categoriesTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-swatch-3 tabular-nums">
                            {`${copy.categoriesCount(groups.length)}${
                              learnedEntries.length > 0
                                ? copy.categoriesRules(learnedEntries.length)
                                : copy.categoriesEditHint
                            }`}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-swatch-3 shrink-0" />
                    </button>

                    {/* Owner Exclusive: Admin Redeem Code Generator */}
                    {isOwnerAdmin && (
                      <button
                        type="button"
                        onClick={() => setSubView('admin_codes')}
                        className="w-full pl-2.5 pr-4 py-3.5 rounded-l-lg flex items-center justify-between gap-3 text-left tk-bg-forest-tint hover:tk-bg-forest-tint transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <AccentIconBadge accent="peach" icon={KeyRound} size="md" />
                          <div className="min-w-0">
                            <div className="text-[15px] font-extrabold tk-text-ink">
                              {copy.adminConsoleAdvTitle}
                            </div>
                            <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                              {copy.adminConsoleAdvSub}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 tk-text-forest shrink-0" />
                      </button>
                    )}

                    {/* Affiliate Partner Tracking IDs */}
                    <button
                      type="button"
                      onClick={() => setSubView('affiliate_partners')}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-l-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="peach" icon={Tag} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.affiliateTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-swatch-3">
                            {copy.affiliateSub}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-swatch-3 shrink-0" />
                    </button>

                    {/* Trial Expiration Simulation Toggle (for verifying >30-day experience) */}
                    {!isProActive && (
                      <div className="pl-2.5 pr-4 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <AccentIconBadge accent="lavender" icon={FlaskConical} size="md" />
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold tk-text-ink">
                              {copy.trialPreviewTitle}
                            </div>
                            <div className="mt-0.5 text-[13px] leading-snug tk-text-swatch-3">
                              {preferences.trialSimulationMode === 'expired'
                                ? copy.trialSimActive
                                : copy.trialSimNormal}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const nextMode =
                              preferences.trialSimulationMode === 'expired' ? 'normal' : 'expired';
                            onUpdatePreferences({ trialSimulationMode: nextMode });
                            onToast(
                              nextMode === 'expired' ? copy.trialSimToastOn : copy.trialSimToastOff
                            );
                          }}
                          className={`rounded-[16px] px-3 py-1.5 text-[13px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
 preferences.trialSimulationMode === 'expired'
 ? 'tk-bg-warning-tint tk-text-warning border tk-bc-warning-hair'
 : 'border tk-bc-hair bg-white tk-text-swatch-3 hover:tk-bg-forest-tint'
 }`}
                        >
                          {preferences.trialSimulationMode === 'expired'
                            ? copy.restoreTrialBtn
                            : copy.simulateExpiryBtn}
                        </button>
                      </div>
                    )}

                    {/* Expert Architecture Audit Comparison */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenExpertAudit();
                      }}
                      className="w-full pl-2.5 pr-4 py-3.5 rounded-tl-lg flex items-center justify-between gap-3 text-left hover:tk-bg-forest-tint transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <AccentIconBadge accent="peach" icon={FileText} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink">
                            {copy.expertAuditTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                            {copy.expertAuditSub}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 tk-text-swatch-3 shrink-0" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Section 5.5: Map Service & Preview Test */}
              <section className="pb-6 border-b tk-bc-hair">
                <div className="rounded-[20px] border tk-bc-hair tk-bg-card overflow-hidden">
                  <div className="tk-bg-forest-tint border-b tk-bc-hair px-4 py-3 flex items-start gap-3">
                    <AccentIconBadge
                      accent="ocean"
                      icon={MapIcon}
                      size="md"
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-extrabold tk-text-ink">
                        {copy.routeMapTitle}
                      </h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed tk-text-ink2">
                        {copy.routeMapDesc}
                      </p>
                    </div>
                  </div>

                  <div className="ml-3 sm:ml-4 divide-y tk-divide-hair">
                    <SettingsMapPreviewCard cityHint={activeCityHint} />
                  </div>
                </div>
              </section>

              {/* Section 6: About & Support */}
              <section>
                <h3 className="px-1 mb-2 text-[13px] font-bold tk-text-ink2">
                  {copy.aboutTitle}
                </h3>
                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  <button
                    type="button"
                    onClick={() => setSubView('whats_new')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:tk-bg-paper transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] tk-bg-warning-tint tk-text-warning">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold tk-text-ink">
                          {copy.whatsNewTitle}
                        </div>
                        <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                          {copy.whatsNewSub}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubView('feedback')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:tk-bg-paper transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] tk-bg-danger-tint tk-text-danger">
                        <Heart className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold tk-text-ink">
                          {copy.feedbackTitle}
                        </div>
                        <div className="mt-0.5 text-[13px] leading-snug tk-text-ink2">
                          {copy.feedbackSub}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubView('terms')}
                    className="w-full px-4 min-h-[48px] flex items-center justify-between text-left text-sm font-semibold tk-text-forest hover:tk-bg-paper cursor-pointer"
                  >
                    <span>{copy.termsTitle}</span>
                    <ChevronRight className="h-4 w-4 tk-text-ink2" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubView('privacy')}
                    className="w-full px-4 min-h-[48px] flex items-center justify-between text-left text-sm font-semibold tk-text-forest hover:tk-bg-paper cursor-pointer"
                  >
                    <span>{copy.privacyTitle}</span>
                    <ChevronRight className="h-4 w-4 tk-text-ink2" />
                  </button>
                </div>
              </section>

              {/* Quiet Version Footer */}
              <div className="pt-2 pb-3 text-center space-y-0.5">
                <p className="text-[13px] font-semibold tk-text-ink2">
                  {copy.footerTagline}
                </p>
                <p className="font-serif text-[13px] tk-text-ink2 tabular-nums">
                  Trip Kit v2.5.0
                </p>
              </div>
            </>
          )}

          {/* SUB-VIEW: Owner Admin Redeem Code Generator */}
          {subView === 'admin_codes' && (
            <div className="space-y-5">
              <div className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-sm font-extrabold tk-text-ink">
                      {copy.mintTitle}
                    </h3>
                    <p className="mt-0.5 text-[13px] tk-text-ink2">
                      {copy.mintDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={() => void loadAdminCodes()}
                    title={copy.refreshCodesTitle}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[16px] border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-text-forest cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${adminBusy ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Duration Selector */}
                <div className="grid grid-cols-2 gap-2 rounded-[16px] tk-bg-forest-plate p-1 text-[13px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAdminPlanType('annual')}
                    className={`rounded-lg py-2 transition-colors cursor-pointer ${
 adminPlanType === 'annual'
 ? 'bg-white tk-text-forest shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {copy.plan1Year}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminPlanType('lifetime')}
                    className={`rounded-lg py-2 transition-colors cursor-pointer ${
 adminPlanType === 'lifetime'
 ? 'bg-white tk-text-forest shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {copy.planLifetime}
                  </button>
                </div>

                {/* Channel / Customer Memo */}
                <div>
                  <label className="block text-[13px] font-bold tk-text-ink2 mb-1">
                    {copy.channelMemoLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder={copy.channelMemoPlaceholder}
                    className="w-full rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm tk-text-ink focus:bg-white focus:tk-bc-forest focus:outline-none"
                  />
                </div>

                {/* Mint Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={() => void handleMintCodes(1)}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-forest px-3 py-2 text-[13px] font-bold text-white hover:tk-bg-press disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {adminBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {copy.mint1Btn}
                  </button>

                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={() => void handleMintCodes(5)}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-[16px] border tk-bc-forest tk-bg-forest-tint px-3 py-2 text-[13px] font-bold tk-text-forest hover:tk-bg-forest-tint disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {copy.mint5Btn}
                  </button>
                </div>
              </div>

              {/* Generated Codes List */}
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h4 className="font-serif text-[13px] font-bold tk-text-ink2 tabular-nums">
                    {copy.mintedCodesHeading(adminCodes.length)}
                  </h4>

                  <div className="flex items-center gap-1 rounded-lg tk-bg-forest-tint p-0.5 text-[13px] font-semibold">
                    {(
                      [
                        { id: 'all', label: copy.filterAll },
                        { id: 'unused', label: copy.filterUnused },
                        { id: 'redeemed', label: copy.filterRedeemed },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAdminFilter(f.id)}
                        className={`rounded-md px-2 py-1 transition-colors cursor-pointer ${
 adminFilter === f.id
 ? 'bg-white tk-text-ink'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  {filteredAdminCodes.length === 0 ? (
                    <div className="p-6 text-center text-[13px] tk-text-ink2">
                      {adminBusy ? copy.loadingCodes : copy.noCodesYet}
                    </div>
                  ) : (
                    filteredAdminCodes.map((item) => {
                      const isUsed = item.status === 'redeemed';
                      const dateStr = formatDateByPref(
                        new Date(item.createdAtMs).toISOString().slice(0, 10),
                        activeLang
                      );
                      return (
                        <div key={item.code} className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-serif text-sm font-extrabold tracking-wider tabular-nums ${
 isUsed ? 'line-through tk-text-ink2' : 'tk-text-ink'
 }`}
                                >
                                  {item.code}
                                </span>
                                <span className="text-[13px] tk-text-ink2">
                                  · {item.planType === 'lifetime' ? copy.lifetimeTag : copy.annualTag}{' '}
                                  · {isUsed ? copy.redeemedTag : copy.unusedTag}
                                </span>
                              </div>
                              <div className="mt-0.5 font-serif text-[13px] tk-text-ink2 leading-snug break-words tabular-nums">
                                {dateStr}
                                {item.note ? ` · ${item.note}` : ''}
                              </div>
                            </div>

                            {!isUsed && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteCode(item.code)}
                                title={copy.voidCodeTitle}
                                className="h-8 w-8 rounded-lg tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {!isUsed && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCopyAdminCode(item, true)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-forest-tint px-3 py-2 text-[13px] font-bold tk-text-forest hover:tk-bg-forest-tint cursor-pointer whitespace-nowrap"
                              >
                                {copiedCodeKey === `${item.code}_tpl` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                {copy.copyScriptBtn}
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleCopyAdminCode(item, false)}
                                className="rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-[13px] font-semibold tk-text-ink2 hover:tk-bc-forest cursor-pointer whitespace-nowrap"
                              >
                                {copiedCodeKey === `${item.code}_raw`
                                  ? t('common.copied')
                                  : copy.codeOnlyBtn}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

          {/* SUB-VIEW: Categories & AI Learned Dictionary */}
          {subView === 'categories' && (
            <div className="space-y-5">
              {/* Add Custom Category Form */}
              <form
                onSubmit={handleAddCategorySubmit}
                className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-3"
              >
                <h3 className="text-[13px] font-bold tk-text-ink2">
                  {copy.addCatTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCatTitle}
                    onChange={(e) => setNewCatTitle(e.target.value)}
                    placeholder={copy.catNamePlaceholder}
                    className="font-serif rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm font-semibold tk-text-ink focus:bg-white focus:tk-bc-forest focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newCatCube}
                    onChange={(e) => setNewCatCube(e.target.value)}
                    placeholder={copy.catCubePlaceholder}
                    className="rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm tk-text-ink focus:bg-white focus:tk-bc-forest focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] tk-text-ink2">
                      {t('packingExtra.colorLabel')}
                    </span>
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        title={copy.colorNames[c.key]}
                        onClick={() => setNewCatColor(c.key)}
                        className={`h-6 w-6 rounded-full ${c.swatchClass} flex items-center justify-center cursor-pointer ${
 newCatColor === c.key ? 'ring-2 ring-offset-2 tk-ring-ink' : 'opacity-70'
 }`}
                      >
                        {newCatColor === c.key && <Check className="h-3 w-3 text-white" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={!newCatTitle.trim()}
                    className="inline-flex items-center gap-1 rounded-[16px] tk-bg-forest px-3.5 py-2 text-[13px] font-bold text-white hover:tk-bg-press disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {copy.addCatBtn}
                  </button>
                </div>
              </form>

              {/* Existing Categories List */}
              <section>
                <h3 className="px-1 mb-2 text-[13px] font-bold tk-text-ink2">
                  {copy.currentCatsHeading(groups.length)}
                </h3>
                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  {groups.map((grp, idx) => {
                    const isEditing = editingGroupId === grp.id;
                    const groupIconMeta = resolvePackingGroupIconMeta(grp);

                    if (isEditing) {
                      return (
                        <div key={grp.id} className="p-4 space-y-2.5 tk-bg-card">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editCatTitle}
                              onChange={(e) => setEditCatTitle(e.target.value)}
                              className="font-serif rounded-[16px] border tk-bc-hair bg-white px-3 py-1.5 text-base sm:text-sm font-bold tk-text-ink"
                            />
                            <input
                              type="text"
                              value={editCatCube}
                              onChange={(e) => setEditCatCube(e.target.value)}
                              className="rounded-[16px] border tk-bc-hair bg-white px-3 py-1.5 text-base sm:text-sm tk-text-ink"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {COLOR_SWATCHES.map((c) => (
                                <button
                                  key={c.key}
                                  type="button"
                                  title={copy.colorNames[c.key]}
                                  onClick={() => setEditCatColor(c.key)}
                                  className={`h-5 w-5 rounded-full ${c.swatchClass} cursor-pointer ${
 editCatColor === c.key
 ? 'ring-2 ring-offset-1 tk-ring-ink'
 : 'opacity-65'
 }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingGroupId(null)}
                                className="text-[13px] font-semibold tk-text-ink2 cursor-pointer"
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditCategory(grp.id)}
                                className="rounded-lg tk-bg-forest px-3 py-1 text-[13px] font-bold text-white cursor-pointer"
                              >
                                {t('common.save')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={grp.id}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AccentIconBadge
                            accent={groupIconMeta.accent}
                            icon={groupIconMeta.Icon}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold tk-text-ink truncate">
                              {translateGroupTitleLabel(grp.id, grp.title, activeLang)}
                            </div>
                            <div className="font-serif text-[13px] tk-text-ink2 leading-snug break-words tabular-nums">
                              {copy.itemsCount(grp.items.length)} ·{' '}
                              {translateGroupCubeLabel(grp.cubeLabel, activeLang)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderGroups(grp.id, groups[idx - 1].id)}
                            title={t('common.moveUp')}
                            className="h-8 w-8 rounded-lg tk-text-ink2 hover:tk-bg-forest-plate disabled:opacity-30 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx >= groups.length - 1}
                            onClick={() => onReorderGroups(grp.id, groups[idx + 1].id)}
                            title={t('common.moveDown')}
                            className="h-8 w-8 rounded-lg tk-text-ink2 hover:tk-bg-forest-plate disabled:opacity-30 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditCategory(grp)}
                            title={copy.renameCatTitle}
                            className="h-8 w-8 rounded-lg tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-forest flex items-center justify-center cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={groups.length <= 1}
                            onClick={() => onDeleteGroup(grp.id)}
                            title={copy.deleteCatTitle}
                            className="h-8 w-8 rounded-lg tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger disabled:opacity-30 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* AI Learned Category Memory Dictionary */}
              <section>
                <div className="px-1 mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-bold tk-text-ink2">
                    {copy.memoryHeading(learnedEntries.length)}
                  </h3>
                  {learnedEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearLearnedCategories}
                      className="text-[13px] font-semibold tk-text-danger hover:underline cursor-pointer"
                    >
                      {copy.clearAllBtn}
                    </button>
                  )}
                </div>

                <div className="rounded-[20px] border tk-bc-hair bg-white divide-y tk-divide-hair">
                  {learnedEntries.length === 0 ? (
                    <p className="p-4 text-[13px] tk-text-ink2 leading-relaxed">
                      {copy.memoryIntro}
                    </p>
                  ) : (
                    learnedEntries.map(([itemName, catTitle]) => (
                      <div
                        key={itemName}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0 truncate">
                          <strong className="tk-text-ink">{itemName}</strong>
                          <span className="mx-2 tk-text-ink2">→</span>
                          <span className="font-semibold tk-text-forest">{catTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteLearnedCategory(itemName)}
                          className="tk-text-ink2 hover:tk-text-danger cursor-pointer"
                          title={copy.removeRuleTitle}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* SUB-VIEW: Affiliate Partner Tags */}
          {subView === 'affiliate_partners' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdatePreferences({
                    affiliatePartners: {
                      amazonTag: affiliateDraft.amazonTag.trim(),
                      taobaoPid: affiliateDraft.taobaoPid.trim(),
                      klookAid: affiliateDraft.klookAid.trim(),
                      airaloRef: affiliateDraft.airaloRef.trim(),
                      getYourGuidePartnerId: affiliateDraft.getYourGuidePartnerId.trim(),
                      tripComAllianceId: affiliateDraft.tripComAllianceId.trim(),
                      disclosureEnabled: affiliateDraft.disclosureEnabled,
                    },
                  });
                  onToast(copy.affSavedToast);
                }}
                className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-3.5"
              >
                <div>
                  <h3 className="font-serif text-sm font-extrabold tk-text-ink">
                    {copy.affHeading}
                  </h3>
                  <p className="mt-0.5 text-[13px] tk-text-ink2">
                    {copy.affSub}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  {(
                    [
                      {
                        key: 'amazonTag',
                        label: copy.affFields.amazonTag,
                        placeholder: 'tripkit-20',
                      },
                      {
                        key: 'taobaoPid',
                        label: copy.affFields.taobaoPid,
                        placeholder: 'mm_00000000_0_0',
                      },
                      {
                        key: 'airaloRef',
                        label: copy.affFields.airaloRef,
                        placeholder: 'tripkit',
                      },
                      {
                        key: 'klookAid',
                        label: copy.affFields.klookAid,
                        placeholder: 'tripkit_aid',
                      },
                      {
                        key: 'getYourGuidePartnerId',
                        label: copy.affFields.getYourGuidePartnerId,
                        placeholder: 'TRIPKIT',
                      },
                      {
                        key: 'tripComAllianceId',
                        label: copy.affFields.tripComAllianceId,
                        placeholder: '000000',
                      },
                    ] as const
                  ).map((field) => (
                    <label key={field.key} className="block space-y-1">
                      <span className="font-bold tk-text-ink2">{field.label}</span>
                      <input
                        type="text"
                        value={affiliateDraft[field.key]}
                        onChange={(e) =>
                          setAffiliateDraft((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 font-serif tabular-nums text-base sm:text-sm tk-text-ink focus:bg-white focus:tk-bc-forest focus:outline-none"
                      />
                    </label>
                  ))}
                </div>

                <label className="flex items-center justify-between gap-3 rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-[13px] cursor-pointer">
                  <div>
                    <div className="font-bold tk-text-ink">
                      {copy.affDisclosureTitle}
                    </div>
                    <div className="text-[13px] tk-text-ink2">
                      {copy.affDisclosureDesc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={affiliateDraft.disclosureEnabled}
                    onChange={(e) =>
                      setAffiliateDraft((prev) => ({
                        ...prev,
                        disclosureEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 tk-accent-forest"
                  />
                </label>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAffiliateDraft(DEFAULT_AFFILIATE_PARTNERS);
                      onUpdatePreferences({ affiliatePartners: DEFAULT_AFFILIATE_PARTNERS });
                      onToast(copy.affResetToast);
                    }}
                    className="inline-flex items-center gap-1 rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-[13px] font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.affResetBtn}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-[16px] tk-bg-forest px-4 py-2 text-[13px] font-bold text-white hover:tk-bg-press cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    {copy.affSaveBtn}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-VIEW: What's New */}
          {subView === 'whats_new' && (
            <div className="space-y-4">
              <div className="rounded-[20px] border tk-bc-hair bg-white p-5 space-y-4">
                <div>
                  <span className="font-serif tabular-nums text-[13px] font-bold tk-text-forest">
                    {copy.wnBadge}
                  </span>
                  <h3 className="font-serif mt-1 text-base font-extrabold tk-text-ink">
                    {copy.wnHeading}
                  </h3>
                </div>

                <div className="space-y-3 text-[13px] tk-text-ink2 leading-relaxed">
                  {copy.wnItems.map((item) => (
                    <div key={item.t}>
                      <strong className="tk-text-ink">{item.t}</strong>
                      <p className="mt-0.5">{item.d}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExpertAudit();
                  }}
                  className="w-full rounded-[16px] border tk-bc-hair tk-bg-forest-tint px-4 py-2.5 text-[13px] font-bold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
                >
                  {copy.openAuditBtn}
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW: Feedback */}
          {subView === 'feedback' && (
            <div className="rounded-[20px] border tk-bc-hair bg-white p-5 space-y-4">
              {feedbackSubmitted ? (
                <div className="py-6 text-center space-y-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full tk-bg-forest-tint tk-text-forest">
                    <Check className="h-5 w-5" />
                  </span>
                  <h3 className="font-serif text-sm font-extrabold tk-text-ink">
                    {copy.fbThanksTitle}
                  </h3>
                  <p className="text-[13px] tk-text-ink2">
                    {copy.fbThanksDesc}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!feedbackText.trim()) return;
                    setFeedbackSubmitted(true);
                    setFeedbackText('');
                    onToast(copy.fbToast);
                  }}
                  className="space-y-3"
                >
                  <h3 className="text-[15px] font-bold tk-text-ink">
                    {copy.fbHeading}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'feature', label: copy.fbTopics.feature },
                      { id: 'packing', label: copy.fbTopics.packing },
                      { id: 'finance', label: copy.fbTopics.finance },
                      { id: 'bug', label: copy.fbTopics.bug },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFeedbackTopic(opt.id as typeof feedbackTopic)}
                        className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold cursor-pointer ${
 feedbackTopic === opt.id
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-forest'
 : 'tk-bg-forest-plate tk-text-ink2'
 }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={copy.fbPlaceholder}
                    className="w-full rounded-[16px] border tk-bc-hair tk-bg-paper p-3 text-base sm:text-sm tk-text-ink focus:bg-white focus:tk-bc-forest focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!feedbackText.trim()}
                    className="w-full rounded-[16px] tk-bg-forest py-2.5 text-[13px] font-bold text-white hover:tk-bg-press disabled:opacity-40 cursor-pointer"
                  >
                    {copy.fbSubmitBtn}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SUB-VIEW: Terms */}
          {subView === 'terms' && (
            <div className="rounded-[20px] border tk-bc-hair bg-white p-5 space-y-3 text-[13px] tk-text-ink2 leading-relaxed">
              <h3 className="font-serif text-sm font-extrabold tk-text-ink">
                {copy.termsHeading}
              </h3>
              {copy.termsParagraphs.map((p, idx) => (
                <p key={idx}>
                  <strong>{p.strong}</strong>
                  {p.text}
                </p>
              ))}
            </div>
          )}

          {/* SUB-VIEW: Privacy & Security */}
          {subView === 'privacy' && (
            <div className="rounded-[20px] border tk-bc-hair bg-white p-5 space-y-3 text-[13px] tk-text-ink2 leading-relaxed">
              <div className="flex items-center gap-2 tk-text-forest">
                <Shield className="h-4 w-4" />
                <h3 className="font-serif text-sm font-extrabold tk-text-ink">
                  {copy.privacyHeading}
                </h3>
              </div>
              {copy.privacyParagraphs.map((p, idx) => (
                <p key={idx}>
                  <strong>{p.strong}</strong>
                  {p.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <CurrencyPickerModal
        open={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        selectedCurrency={preferences.homeCurrency}
        onSelectCurrency={(code) => {
          onUpdatePreferences({ homeCurrency: code });
          onToast(
            `${t('settings.homeCurrencyLabel')}: ${getHomeCurrencyLabel(code, activeLang)}`
          );
        }}
        tripCurrencyCode={activeTripEntry?.state.intel.currencyCode}
        tripCurrencySymbol={activeTripEntry?.state.intel.currencySymbol}
        intelFxToUsd={activeTripEntry?.state.intel.fxToUsd}
        budgetFx={activeTripEntry?.state.budget}
        language={activeLang}
      />
    </div>
  );
};

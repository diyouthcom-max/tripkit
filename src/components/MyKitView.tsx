import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Crown,
  FileDown,
  Globe,
  Loader2,
  LogIn,
  Luggage,
  Printer,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type {
  AppLanguage,
  AppPreferences,
  HomeCurrencyCode,
  MemoryPhotoMeta,
  SavedTripEntry,
} from '../types';
import {
  LANGUAGE_SPECS,
  formatTotalWeightByPref,
  getHomeCurrencyLabel,
  type MembershipStatus,
} from '../utils/preferencesHelpers';
import {
  loadAllMemoryPhotoBlobsMap,
  loadMemoryPhotoMetaList,
  type StoredMemoryPhotoBlob,
} from '../utils/memoryPhotoVault';
import { CurrencyPickerModal } from './CurrencyPickerModal';
import { MemoriesView } from './MemoriesView';
import { resolveAuthProviderLabel } from './AuthModal';
import type { SettingsFocusSection } from './SettingsModal';
import { getMyKitCopy } from '../i18n/packs/authAndKitPack';
import { getSettingsModalCopy } from '../i18n/packs/settingsAndProPack';

export interface MyKitViewProps {
  trips: SavedTripEntry[];
  activeTripId: string;
  authUser: User | null;
  preferences: AppPreferences;
  membershipStatus: MembershipStatus;
  isExportingPdf: boolean;
  onExportPdf: () => void;
  onUpdateHomeCurrency: (code: HomeCurrencyCode) => void;
  onOpenAuthModal: (mode: 'signin' | 'account') => void;
  onOpenSettings: (focusSection?: SettingsFocusSection) => void;
  onOpenProModal: () => void;
  onToast: (msg: string) => void;
}

export const MyKitView: React.FC<MyKitViewProps> = ({
  trips,
  activeTripId,
  authUser,
  preferences,
  membershipStatus,
  isExportingPdf,
  onExportPdf,
  onUpdateHomeCurrency,
  onOpenAuthModal,
  onOpenSettings,
  onOpenProModal,
  onToast,
}) => {
  const activeLang: AppLanguage = preferences.language;
  const copy = getMyKitCopy(activeLang);

  const [subView, setSubView] = useState<'portal' | 'memories'>('portal');
  const [autoOpenStudioOnEnter, setAutoOpenStudioOnEnter] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // Lightweight memory photo stats for the editorial preview card
  const [memoryPhotos, setMemoryPhotos] = useState<MemoryPhotoMeta[]>(() =>
    loadMemoryPhotoMetaList()
  );
  const [memoryBlobs, setMemoryBlobs] = useState<Record<string, StoredMemoryPhotoBlob>>({});

  useEffect(() => {
    if (subView !== 'portal') return;
    const latest = loadMemoryPhotoMetaList();
    setMemoryPhotos(latest);
    const previewLocalIds = latest
      .filter((p) => p.sourceType !== 'demo_sample')
      .slice(0, 4)
      .map((p) => p.id);
    if (previewLocalIds.length === 0) return;
    let active = true;
    void loadAllMemoryPhotoBlobsMap(previewLocalIds).then((map) => {
      if (active) setMemoryBlobs(map);
    });
    return () => {
      active = false;
    };
  }, [subView]);

  const activeEntry = useMemo(
    () => trips.find((tr) => tr.id === activeTripId) || trips[0],
    [trips, activeTripId]
  );
  const activeTrip = activeEntry?.state;

  const activeTripPhotosCount = useMemo(
    () => memoryPhotos.filter((p) => p.matchedTripId === activeTripId).length,
    [memoryPhotos, activeTripId]
  );
  const coveredTripsCount = useMemo(
    () => new Set(memoryPhotos.map((p) => p.matchedTripId)).size,
    [memoryPhotos]
  );
  const previewThumbUrls = useMemo(() => {
    return memoryPhotos
      .slice(0, 4)
      .map((p) => {
        if (p.sourceType === 'demo_sample') return p.sampleImageUrl || null;
        return memoryBlobs[p.id]?.thumbDataUrl || null;
      })
      .filter((u): u is string => Boolean(u));
  }, [memoryPhotos, memoryBlobs]);

  const languageDisplay = useMemo(() => {
    const spec = LANGUAGE_SPECS[activeLang];
    const langLabel = spec ? spec.nativeLabel : activeLang;
    const unitLabel =
      preferences.unitSystem === 'imperial' ? copy.imperial : copy.metric;
    return `${langLabel} · ${unitLabel}`;
  }, [activeLang, preferences.unitSystem, copy]);

  const baggageDisplay = useMemo(() => {
    const carryOn = formatTotalWeightByPref(
      preferences.carryOnLimitKg * 1000,
      preferences.unitSystem
    );
    const checked =
      preferences.checkedLimitKg <= 0
        ? getSettingsModalCopy(activeLang).noneChecked
        : formatTotalWeightByPref(
            preferences.checkedLimitKg * 1000,
            preferences.unitSystem
          );
    return copy.baggageSummary(carryOn, checked);
  }, [
    preferences.carryOnLimitKg,
    preferences.checkedLimitKg,
    preferences.unitSystem,
    activeLang,
    copy,
  ]);

  const proStatusSummary = useMemo(() => {
    if (membershipStatus.isProActive) {
      return {
        badge: copy.proActiveBadge,
        toneClass: 'bg-[#EFF9F8] text-[#076E6A]',
      };
    }
    if (!membershipStatus.isTrialExpired) {
      return {
        badge: copy.trialLeftBadge(membershipStatus.trialDaysRemaining),
        toneClass: 'bg-[#F4F1FC] text-[#6355B5]',
      };
    }
    return {
      badge: copy.unlockProBadge,
      toneClass: 'bg-[#FDF6EE] text-[#A85F22]',
    };
  }, [membershipStatus, copy]);

  // Immersive Secondary View: Full Memories Photo Book & Print Studio
  if (subView === 'memories') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setAutoOpenStudioOnEnter(false);
              setSubView('portal');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E5] bg-white px-3 py-1.5 text-xs font-bold text-[#152B29] hover:border-[#0ABAB5] hover:text-[#078C88] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.backToMyKit}</span>
          </button>

          <span className="text-xs font-semibold text-[#647B78] truncate">
            {copy.memoriesStudioHeader}
          </span>
        </div>

        <MemoriesView
          trips={trips}
          activeTripId={activeTripId}
          authUser={authUser}
          homeCurrency={preferences.homeCurrency}
          language={activeLang}
          autoOpenStudio={autoOpenStudioOnEnter}
          onAutoOpenStudioHandled={() => setAutoOpenStudioOnEnter(false)}
          onToast={onToast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* TRAVELER PASSPORT: Unified Account Entry (Apple / Google / Email + Account Deletion) */}
      <section className="rounded-2xl border border-[#D4E6E3] bg-white px-4 py-3.5 shadow-2xs">
        {authUser ? (
          <button
            type="button"
            onClick={() => onOpenAuthModal('account')}
            className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              {authUser.photoURL ? (
                <img
                  src={authUser.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-xl object-cover border border-[#DCE8E5] shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-[#093B35] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                  {(authUser.displayName || authUser.email || 'T').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-[#152B29] truncate">
                    {authUser.displayName || copy.defaultTraveler}
                  </span>
                  <span className="rounded-md bg-[#E8F6F4] px-1.5 py-0.5 text-[10px] font-bold text-[#077672] shrink-0">
                    {resolveAuthProviderLabel(authUser, activeLang)}
                  </span>
                </div>
                <p className="text-xs text-[#647B78] truncate">
                  {authUser.email || copy.cloudSyncReady}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B7370] group-hover:text-[#078C88] whitespace-nowrap shrink-0">
              <span>{copy.accountManage}</span>
              <ChevronRight className="h-4 w-4 text-[#7D938F]" />
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-[#093B35] text-white inline-flex items-center justify-center shrink-0">
                <LogIn className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[#152B29] leading-snug">
                  {copy.signInTitle}
                </div>
                <p className="mt-0.5 text-xs text-[#647B78] leading-snug">
                  {copy.signInSub}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuthModal('signin')}
              className="h-9 inline-flex items-center gap-1 rounded-xl bg-[#093B35] px-3.5 text-xs font-bold text-white hover:bg-[#078C88] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{copy.signInBtn}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* SECTION 1: Physical Delivery Studio (Memories Photobook + Printable A4 PDF Handbook) */}
      <div className="space-y-3">
        <div className="px-1 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#647B78]">
            {copy.sectionDelivery}
          </h3>
        </div>

        {/* Hero Editorial Card: Travel Photobook & AI Print Studio */}
        <section className="rounded-2xl border border-[#E6DCE0] bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-[#FDF2F5] text-[#C95270] inline-flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-extrabold text-[#152B29]">
                    {copy.photobookTitle}
                  </h4>
                  <span className="rounded-md bg-[#FDF2F5] px-2 py-0.5 text-[11px] font-bold text-[#B84361] whitespace-nowrap">
                    {copy.photobookBadge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5B7370] leading-relaxed">
                  {memoryPhotos.length > 0
                    ? copy.photobookStats(
                        memoryPhotos.length,
                        Math.max(1, coveredTripsCount),
                        activeTripPhotosCount
                      )
                    : copy.photobookEmptyDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Mosaic Preview Strip (if photos exist) */}
          {previewThumbUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previewThumbUrls.map((url, idx) => (
                <button
                  key={`${url.slice(0, 24)}_${idx}`}
                  type="button"
                  onClick={() => {
                    setAutoOpenStudioOnEnter(false);
                    setSubView('memories');
                  }}
                  className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F2F6F5] cursor-pointer"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Dual CTAs */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setAutoOpenStudioOnEnter(false);
                setSubView('memories');
              }}
              className="h-9 inline-flex items-center gap-1.5 rounded-xl bg-[#093B35] px-4 text-xs font-bold text-white hover:bg-[#072B27] transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>{copy.openMemoriesBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoOpenStudioOnEnter(true);
                setSubView('memories');
              }}
              className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-[#E5CCD4] bg-[#FFF8FA] px-3.5 text-xs font-bold text-[#A63A57] hover:border-[#C95270] hover:bg-[#FDF2F5] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              <span>{copy.openStudioBtn}</span>
            </button>
          </div>
        </section>

        {/* Compact Utility Row: Export A4 Foldable PDF Handbook */}
        <section className="rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-[#EFF9F8] text-[#078C88] inline-flex items-center justify-center shrink-0">
              <FileDown className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-[#152B29] leading-snug">
                {copy.exportPdfTitle}
              </div>
              <p className="mt-0.5 text-xs text-[#5B7370] leading-snug">
                {copy.exportPdfSub}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={onExportPdf}
            className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3.5 text-xs font-bold text-[#152B29] hover:border-[#0ABAB5] hover:text-[#078C88] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#078C88]" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-[#078C88]" />
            )}
            <span>
              {isExportingPdf ? copy.exportingPdf : copy.exportPdfBtn}
            </span>
          </button>
        </section>
      </div>

      {/* SECTION 2: Global Preferences & Account (iOS Grouped Settings Rows) */}
      <div className="space-y-3">
        <div className="px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#647B78]">
            {copy.sectionPreferences}
          </h3>
        </div>

        <section className="rounded-2xl border border-[#DCE8E5] bg-white divide-y divide-[#F1F6F5] overflow-hidden shadow-2xs">
          {/* Row 1: Trip Kit Pro Status */}
          <button
            type="button"
            onClick={onOpenProModal}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3 min-w-0">
              <span className="h-8 w-8 rounded-xl bg-[#FDF6EE] text-[#C87D28] inline-flex items-center justify-center shrink-0">
                <Crown className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#152B29]">
                  {copy.proRowTitle}
                </span>
                <span className="block mt-0.5 text-xs text-[#647B78] leading-snug">
                  {copy.proRowSub}
                </span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <span
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${proStatusSummary.toneClass}`}
              >
                {proStatusSummary.badge}
              </span>
              <ChevronRight className="h-4 w-4 text-[#7D938F]" />
            </span>
          </button>

          {/* Row 2: Settlement Reference Currency (Opens Packy 32-Currency Modal directly) */}
          <button
            type="button"
            onClick={() => setCurrencyPickerOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3 flex-1 min-w-0">
              <span className="h-8 w-8 rounded-xl bg-[#EFF9F8] text-[#078C88] inline-flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#152B29]">
                  {copy.currencyRowTitle}
                </span>
                <span className="block mt-0.5 font-num text-xs font-medium text-[#5B7370] truncate">
                  {getHomeCurrencyLabel(preferences.homeCurrency, activeLang)}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#7D938F] shrink-0" />
          </button>

          {/* Row 3: Airline Baggage Allowance (Deep-links directly to Baggage Limits in Settings) */}
          <button
            type="button"
            onClick={() => onOpenSettings('baggage')}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3 flex-1 min-w-0">
              <span className="h-8 w-8 rounded-xl bg-[#EDF5FC] text-[#1D6FA5] inline-flex items-center justify-center shrink-0">
                <Luggage className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#152B29]">
                  {copy.baggageRowTitle}
                </span>
                <span className="block mt-0.5 font-num text-xs font-medium text-[#5B7370] tabular-nums">
                  {baggageDisplay}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#7D938F] shrink-0" />
          </button>

          {/* Row 4: Language & Units (Deep-links directly to Language & Regional in Settings) */}
          <button
            type="button"
            onClick={() => onOpenSettings('language')}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3 flex-1 min-w-0">
              <span className="h-8 w-8 rounded-xl bg-[#F4F1FC] text-[#6355B5] inline-flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#152B29]">
                  {copy.langRowTitle}
                </span>
                <span className="block mt-0.5 text-xs font-medium text-[#5B7370]">
                  {languageDisplay}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#7D938F] shrink-0" />
          </button>

          {/* Row 5: Full Settings & Cloud Sync */}
          <button
            type="button"
            onClick={() => onOpenSettings('top')}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3 min-w-0">
              <span className="h-8 w-8 rounded-xl bg-[#F2F6F5] text-[#3B5552] inline-flex items-center justify-center shrink-0">
                <Settings className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#152B29]">
                  {copy.allSettingsRowTitle}
                </span>
                <span className="block mt-0.5 text-xs text-[#647B78] leading-snug">
                  {copy.allSettingsRowSub}
                </span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              {authUser && <Sparkles className="h-3.5 w-3.5 text-[#078C88]" />}
              <ChevronRight className="h-4 w-4 text-[#7D938F]" />
            </span>
          </button>
        </section>
      </div>

      {/* Packy-Style 32-Currency Picker Sheet */}
      <CurrencyPickerModal
        open={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        selectedCurrency={preferences.homeCurrency}
        onSelectCurrency={(code) => {
          onUpdateHomeCurrency(code);
        }}
        tripCurrencyCode={activeTrip?.intel.currencyCode}
        tripCurrencySymbol={activeTrip?.intel.currencySymbol}
        intelFxToUsd={activeTrip?.intel.fxToUsd}
        budgetFx={activeTrip?.budget}
        language={activeLang}
      />
    </div>
  );
};

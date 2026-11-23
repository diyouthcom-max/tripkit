import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Backpack,
  Check,
  ChevronRight,
  CloudRain,
  Loader2,
  Luggage,
  Plane,
  Snowflake,
  Sparkles,
  Sun,
  Umbrella,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import {
  PACKING_SCENARIO_SPECS,
  buildPerStopWeatherForecasts,
  inferDefaultScenariosFromSetup,
  inferDefaultTripPurpose,
} from '../utils/packingWizardHelpers';
import {
  getPackingScenarioLabel,
  getPackingWizardUiCopy,
} from '../i18n/packs/packingWizardUiPack';
import type {
  AppLanguage,
  PackingClothingGender,
  PackingDensityLevel,
  PackingScenarioId,
  PackingTripPurpose,
  PackingWeatherOverride,
  TripIntelligence,
  TripSetup,
} from '../types';

export interface PackingWizardSubmitPayload {
  updatedSetupPatch: Partial<TripSetup>;
  mergeMode: 'smart_merge' | 'replace_all';
  useInstantOffline?: boolean;
}

interface PackingListWizardModalProps {
  isOpen: boolean;
  setup: TripSetup;
  intel: TripIntelligence;
  checkedLimitKg: number;
  existingTotalCount: number;
  existingPackedCount: number;
  alwaysPackCount: number;
  neverSuggestCount: number;
  isGenerating: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onEditTripRoute?: () => void;
  onSubmit: (payload: PackingWizardSubmitPayload) => Promise<void> | void;
}

export const PackingListWizardModal: React.FC<PackingListWizardModalProps> = ({
  isOpen,
  setup,
  intel,
  checkedLimitKg,
  existingTotalCount,
  existingPackedCount,
  alwaysPackCount,
  neverSuggestCount,
  isGenerating,
  errorMessage,
  onClose,
  onEditTripRoute,
  onSubmit,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getPackingWizardUiCopy(activeLang);

  const [weatherOverrides, setWeatherOverrides] = useState<PackingWeatherOverride[]>(
    () => setup.weatherOverrides || []
  );
  const [tripPurpose, setTripPurpose] = useState<PackingTripPurpose>(() =>
    setup.packingTripPurpose || inferDefaultTripPurpose(setup.tripStyle)
  );
  const [clothingStyle, setClothingStyle] = useState<PackingClothingGender>(
    () => setup.clothingStyle || 'male'
  );
  const [packingDensity, setPackingDensity] = useState<PackingDensityLevel>(
    () => setup.packingDensity || 'moderate'
  );
  const [laundryEnabled, setLaundryEnabled] = useState<boolean>(() => setup.laundry);
  const [specialScenarios, setSpecialScenarios] = useState<PackingScenarioId[]>(() =>
    inferDefaultScenariosFromSetup(setup, checkedLimitKg)
  );
  const [customNote, setCustomNote] = useState<string>(() => setup.packingCustomNote || '');
  const [mergeMode, setMergeMode] = useState<'smart_merge' | 'replace_all'>(() =>
    existingPackedCount > 0 ? 'smart_merge' : 'replace_all'
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setWeatherOverrides(setup.weatherOverrides || []);
    setTripPurpose(setup.packingTripPurpose || inferDefaultTripPurpose(setup.tripStyle));
    setClothingStyle(setup.clothingStyle || 'male');
    setPackingDensity(setup.packingDensity || 'moderate');
    setLaundryEnabled(setup.laundry);
    setSpecialScenarios(inferDefaultScenariosFromSetup(setup, checkedLimitKg));
    setCustomNote(setup.packingCustomNote || '');
    setMergeMode(existingPackedCount > 0 ? 'smart_merge' : 'replace_all');
  }, [isOpen, setup, checkedLimitKg, existingPackedCount]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isGenerating, onClose]);

  const stopForecasts = useMemo(
    () =>
      buildPerStopWeatherForecasts(
        setup.cities,
        setup.departureDate,
        setup.days,
        weatherOverrides,
        activeLang,
        setup.cityDays
      ),
    [setup.cities, setup.departureDate, setup.days, weatherOverrides, activeLang, setup.cityDays]
  );

  if (!isOpen) return null;

  const toggleWeatherOverride = (target: PackingWeatherOverride) => {
    setWeatherOverrides((prev) => {
      const exists = prev.includes(target);
      if (exists) {
        return prev.filter((item) => item !== target);
      }
      // Colder and Warmer are mutually exclusive; Wetter combines freely with either
      const cleaned =
        target === 'colder'
          ? prev.filter((x) => x !== 'warmer')
          : target === 'warmer'
          ? prev.filter((x) => x !== 'colder')
          : prev;
      return [...cleaned, target];
    });
  };

  const toggleScenario = (id: PackingScenarioId) => {
    setSpecialScenarios((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectLuggageMode = (modeId: PackingDensityLevel) => {
    setPackingDensity(modeId);
    setSpecialScenarios((prev) => {
      const withoutCabin = prev.filter((s) => s !== 'cabin_only');
      return modeId === 'fully_loaded' ? withoutCabin : [...withoutCabin, 'cabin_only'];
    });
  };

  const estimatedLaundryOutfitSets = (() => {
    const laundryCycle = Math.min(setup.days, Math.max(3, setup.laundryIntervalDays || 4) + 1);
    const boost = packingDensity === 'fully_loaded' ? 1 : packingDensity === 'light' ? -1 : 0;
    return Math.max(2, Math.min(6, Math.ceil(laundryCycle * 0.75) + boost));
  })();

  const visibleScenarioSpecs = PACKING_SCENARIO_SPECS.filter((spec) => spec.id !== 'cabin_only');
  const activeVisibleScenariosCount = specialScenarios.filter((id) => id !== 'cabin_only').length;

  const buildPatch = (): Partial<TripSetup> => {
    const nextTripStyle: TripSetup['tripStyle'] =
      tripPurpose === 'business'
        ? '商务出差'
        : specialScenarios.includes('baby') || specialScenarios.includes('kids')
        ? '亲子出行'
        : tripPurpose === 'both' && specialScenarios.includes('remote_work')
        ? '长期数字游民'
        : setup.tripStyle;

    return {
      tripStyle: nextTripStyle,
      laundry: laundryEnabled,
      weatherOverrides,
      packingTripPurpose: tripPurpose,
      clothingStyle,
      packingDensity,
      specialScenarios,
      packingCustomNote: customNote.trim(),
    };
  };

  const handleTriggerGenerate = (useInstantOffline = false) => {
    void onSubmit({
      updatedSetupPatch: buildPatch(),
      mergeMode,
      useInstantOffline,
    });
  };

  const routeDisplay =
    intel.routeTitle || setup.cities.join(copy.routeSeparator);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-overlay sm:p-4"
      onClick={() => {
        if (!isGenerating) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="packing-wizard-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150"
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full tk-bg-forest-plate" />
        </div>

        {/* Sticky Top Header */}
        <div className="px-5 sm:px-7 pt-3 sm:pt-5 pb-3.5 border-b tk-bc-hair flex items-start justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onClose}
              aria-label={copy.backAria}
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border tk-bc-hair bg-white tk-text-ink hover:tk-bc-forest transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2
                id="packing-wizard-title"
                className="text-lg sm:text-xl font-extrabold tracking-tight tk-text-forest text-balance"
              >
                {copy.title}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm tk-text-ink2">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            aria-label={copy.closeAria}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Flat Editorial Sections (Zero Grey-Wraps-White Card Nesting) */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] bg-white">
          {/* Bound Trip Context Banner */}
          <div className="pb-4 border-b tk-bc-hair">
            {onEditTripRoute ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onClose();
                  onEditTripRoute();
                }}
                className="w-full rounded-2xl border tk-bc-hair tk-bg-paper hover:tk-bg-forest-tint px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Plane className="h-5 w-5 tk-text-forest shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs tk-text-ink2">
                      {copy.tripLinkedLabel}
                    </div>
                    <div className="text-sm sm:text-base font-bold tk-text-forest leading-snug">
                      {routeDisplay}
                    </div>
                    <div className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                      {formatDateByPref(setup.departureDate, activeLang)} ·{' '}
                      {copy.tripDaysPax(setup.days, setup.travelers)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 tk-text-ink2 shrink-0" />
              </button>
            ) : (
              <div className="w-full rounded-2xl border tk-bc-hair tk-bg-paper px-4 py-3 flex items-center gap-3">
                <Plane className="h-5 w-5 tk-text-forest shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs tk-text-ink2">{copy.tripCurrentLabel}</div>
                  <div className="text-sm sm:text-base font-bold tk-text-forest leading-snug">
                    {routeDisplay}
                  </div>
                  <div className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                    {formatDateByPref(setup.departureDate, activeLang)} ·{' '}
                    {copy.tripDaysOnly(setup.days)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="divide-y tk-divide-hair">
            {/* 1. Per-Stop Weather Forecast + Subjective Override (❄️ Warmer / ☀️ Lighter / ☔ Rain+) */}
            <section className="py-5 space-y-3.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold tk-text-forest">
                  {copy.weatherHeading}
                </h3>
                <span className="text-xs tk-text-ink2">
                  {copy.weatherFromForecast}
                </span>
              </div>

              <div className="space-y-2">
                {stopForecasts.map((st, idx) => (
                  <div
                    key={`${st.city}_${idx}`}
                    className="flex items-center gap-2.5 text-xs sm:text-sm leading-snug"
                  >
                    {st.isRainy ? (
                      <CloudRain className="h-4 w-4 tk-text-ink2 shrink-0" />
                    ) : (
                      <Sun className="h-4 w-4 tk-text-ink2 shrink-0" />
                    )}
                    <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-bold tk-text-forest">{st.city}</span>
                      <span className="tk-text-ink2 tabular-nums">{st.summaryText}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 space-y-2">
                <div className="text-xs tk-text-ink2">
                  {copy.expectDifferentWeather}
                </div>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl tk-bg-forest-tint p-1">
                  {(
                    [
                      { id: 'colder', Icon: Snowflake, tone: 'tk-text-swatch-3' },
                      { id: 'warmer', Icon: Sun, tone: 'tk-text-warning' },
                      { id: 'wetter', Icon: Umbrella, tone: 'tk-text-forest' },
                    ] as const
                  ).map(({ id: optId, Icon, tone }) => {
                    const active = weatherOverrides.includes(optId);
                    return (
                      <button
                        key={optId}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleWeatherOverride(optId)}
                        className={`min-h-[40px] rounded-xl px-1.5 py-2 text-[12px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer inline-flex items-center justify-center gap-1 ${
 active
 ? 'tk-bg-forest text-white shadow-xs'
 : 'bg-white tk-text-forest hover:tk-bg-warning-tint'
 }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
 active ? 'text-white' : tone
 }`}
                        />
                        <span>{copy.weatherOverrides[optId]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 2. Trip Style (Leisure | Business | Both) */}
            <section className="py-5 space-y-2.5">
              <h3 className="text-sm sm:text-base font-bold tk-text-forest">
                {copy.tripStyleHeading}
              </h3>
              <div className="grid grid-cols-3 rounded-full tk-bg-forest-tint p-1">
                {(['leisure', 'business', 'both'] as const).map((optId) => {
                  const active = tripPurpose === optId;
                  return (
                    <button
                      key={optId}
                      type="button"
                      onClick={() => setTripPurpose(optId)}
                      className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 active
 ? 'tk-bg-forest text-white shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                    >
                      {copy.tripPurposes[optId]}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Clothing Style (Male | Female | Other) */}
            <section className="py-5 space-y-2.5">
              <h3 className="text-sm sm:text-base font-bold tk-text-forest">
                {copy.clothingStyleHeading}
              </h3>
              <div className="grid grid-cols-3 rounded-full tk-bg-forest-tint p-1">
                {(['male', 'female', 'other'] as const).map((optId) => {
                  const active = clothingStyle === optId;
                  return (
                    <button
                      key={optId}
                      type="button"
                      onClick={() => setClothingStyle(optId)}
                      className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 active
 ? 'tk-bg-forest text-white shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                    >
                      {copy.clothingStyles[optId]}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4. Visual Luggage Physical Constraints + Tactile Mid-Trip Laundry Toggle (Single-Layer Flat Cards) */}
            <section className="py-5 space-y-3.5">
              <h3 className="text-sm sm:text-base font-bold tk-text-forest">
                {copy.densityHeading}
              </h3>
              <div className="space-y-2.5" role="radiogroup" aria-label={copy.densityHeading}>
                {(
                  [
                    { id: 'light' as PackingDensityLevel, Icon: Backpack },
                    { id: 'moderate' as PackingDensityLevel, Icon: Luggage },
                    { id: 'fully_loaded' as PackingDensityLevel, Icon: Plane },
                  ] as const
                ).map(({ id, Icon }) => {
                  const active = packingDensity === id;
                  const card = copy.luggageCards[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleSelectLuggageMode(id)}
                      className={`w-full flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest-tint shadow-2xs'
 : 'tk-bc-hair bg-white hover:tk-bc-hair hover:tk-bg-paper'
 }`}
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
 active ? 'tk-bg-forest text-white' : 'tk-bg-forest-tint tk-text-ink2'
 }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-bold tk-text-forest leading-snug">
                              {card.title}
                            </span>
                            <span className="text-[11px] font-medium tk-text-ink2">
                              {card.badge}
                            </span>
                          </div>
                          {active && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full tk-bg-forest text-white shrink-0">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs tk-text-ink2 leading-snug">{card.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tactile Laundry Toggle Row */}
              <div
                className={`rounded-2xl border p-3.5 transition-colors ${
 laundryEnabled
 ? 'tk-bc-forest-35 tk-bg-forest-tint'
 : 'tk-bc-hair bg-white'
 }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-bold tk-text-forest leading-snug">
                      {copy.laundryTitle}
                    </div>
                    <div
                      className={`text-xs font-semibold leading-snug tabular-nums ${
 laundryEnabled ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                    >
                      {laundryEnabled
                        ? copy.laundryLiveOnFeedback(estimatedLaundryOutfitSets)
                        : copy.laundryLiveOffFeedback(setup.days)}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={laundryEnabled}
                    aria-label={copy.laundryTitle}
                    onClick={() => setLaundryEnabled((v) => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
 laundryEnabled ? 'tk-bg-forest' : 'tk-bg-forest-plate'
 }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
 laundryEnabled ? 'translate-x-5' : 'translate-x-0'
 }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* 5. Anything else? Optional (Scenario Multi-Select + Free-Text Input) */}
            <section className="py-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm sm:text-base font-bold tk-text-forest">
                    {copy.anythingElseHeading}
                  </h3>
                  <span className="text-xs tk-text-ink2">
                    {copy.scenariosOptionalCount(activeVisibleScenariosCount)}
                  </span>
                </div>
                {activeVisibleScenariosCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSpecialScenarios((prev) => prev.filter((id) => id === 'cabin_only'))
                    }
                    className="rounded-lg px-2 py-0.5 text-xs font-semibold tk-text-danger hover:tk-bg-danger-tint transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {copy.clearAll}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {visibleScenarioSpecs.map((spec) => {
                  const active = specialScenarios.includes(spec.id);
                  const label = getPackingScenarioLabel(spec.id, activeLang);
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => toggleScenario(spec.id)}
                      className={`min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
 active
 ? 'tk-bg-forest text-white'
 : 'tk-bg-forest-tint tk-text-ink hover:tk-bg-warning-tint'
 }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                      <span>{label}</span>
                      {active && <X className="h-3 w-3 opacity-75" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tk-text-ink2">
                    {copy.extraNotesLabel}
                  </span>
                  <AiVoiceInputButton
                    compact
                    contextHint="trip_setup"
                    disabled={isGenerating}
                    label={copy.voiceNoteBtn}
                    onTranscript={(text) => {
                      setVoiceError(null);
                      setCustomNote((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}；${text.trim()}` : text.trim();
                      });
                    }}
                    onError={(msg) => setVoiceError(msg || null)}
                  />
                </div>
                {voiceError && (
                  <p className="text-xs tk-text-danger">{voiceError}</p>
                )}
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={copy.notePlaceholder}
                  className="w-full rounded-xl border tk-bc-hair bg-white px-3.5 py-2.5 text-sm tk-text-forest placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none resize-none"
                />
              </div>

              {(alwaysPackCount > 0 || neverSuggestCount > 0) && (
                <p className="text-[11px] tk-text-ink2 leading-snug tabular-nums">
                  {copy.memorySummary(alwaysPackCount, neverSuggestCount)}
                </p>
              )}
            </section>

            {/* 7. Smart Progress Safeguard when items are already packed */}
            {existingPackedCount > 0 && existingTotalCount > 0 && (
              <section className="py-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold tk-text-forest">
                    {copy.alreadyPackedTitle(existingPackedCount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 rounded-full tk-bg-forest-tint p-1">
                  <button
                    type="button"
                    onClick={() => setMergeMode('smart_merge')}
                    className={`min-h-[38px] rounded-full px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 mergeMode === 'smart_merge'
 ? 'tk-bg-forest text-white'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                  >
                    {copy.keepPackedBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode('replace_all')}
                    className={`min-h-[38px] rounded-full px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 mergeMode === 'replace_all'
 ? 'tk-bg-forest text-white'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                  >
                    {copy.startFreshBtn}
                  </button>
                </div>
              </section>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-xl border tk-bc-danger-hair tk-bg-danger-tint px-4 py-3 flex items-start gap-2.5 text-xs tk-text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{errorMessage}</p>
                <p className="tk-text-danger">
                  {copy.errorFallbackHint}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom CTA Bar */}
        <div className="border-t tk-bc-hair bg-white px-5 sm:px-7 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] space-y-2 shrink-0">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleTriggerGenerate(false)}
            className="w-full h-12 rounded-full tk-bg-forest hover:tk-bg-press active:scale-[0.99] text-white text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{copy.generatingBtn}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{copy.generateBtn}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleTriggerGenerate(true)}
              className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold tk-text-ink2 hover:tk-text-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5 tk-text-forest shrink-0" />
              <span>{copy.instantOfflineBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

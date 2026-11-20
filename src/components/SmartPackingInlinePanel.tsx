import React, { useState, useRef, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  RotateCcw,
  Pin,
  Scale,
  AlertTriangle,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  translateDemoPackItemName,
  translateDemoPackItemWhy,
  translateMemberInitials,
  translateMemberName,
} from '../i18n';
import {
  CARRY_ON_LIMIT_KG,
  CHECKED_LIMIT_KG,
  CARRY_ON_SHELL_SPECS,
  CHECKED_SHELL_SPECS,
  VALID_BAG_IDS,
  computeLuggageWeightForecast,
  getCarryOnShellLabel,
  getCheckedShellLabel,
  getLocalizedSmartBagSpecs,
  resolveItemSmartBag,
  formatWeightCompact,
  getItemQuantity,
  getItemUnitWeight,
  formatItemDisplayName,
  type CarryOnShellPreset,
  type CheckedShellPreset,
} from '../utils/packingHelpers';
import {
  BAGGAGE_PRESET_SPECS,
  formatItemWeightByPref,
  formatTotalWeightByPref,
  formatWeightAgainstLimit,
  getBaggagePresetLabels,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import { getSmartPackingPanelCopy } from '../i18n/packs/packingModalsPack';
import {
  AccentIconBadge,
  HERO_ACCENT_PALETTE,
  HERO_AVATAR_BG,
  resolveSmartBagIconMeta,
} from '../utils/accentTheme';
import type {
  AppLanguage,
  BaggagePresetId,
  CrewMember,
  PackingGroup,
  PackingItem,
  SmartBagId,
  TripIntelligence,
  UnitSystem,
} from '../types';

interface SmartPackingInlinePanelProps {
  groups: PackingGroup[];
  crew: CrewMember[];
  intel: TripIntelligence;
  activeMemberId: string;
  filter: 'all' | 'todo' | 'to_buy' | 'always_pack' | 'done';
  smartBagOverrides: Record<string, SmartBagId>;
  smartBagSummaryTip: string;
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  unitSystem?: UnitSystem;
  baggagePreset?: BaggagePresetId;
  onSelectBaggagePreset?: (preset: Exclude<BaggagePresetId, 'custom'>) => void;
  onSaveSmartBagPlan: (overrides: Record<string, SmartBagId>, summaryTip: string) => void;
  onAssignItemSmartBag: (itemId: string, bagId: SmartBagId | null, itemName?: string) => void;
  onResetSmartBagOverrides?: () => void;
  onToggleItem: (groupId: string, itemId: string, actorId?: string) => void;
  onCycleOwnership: (groupId: string, itemId: string, mode?: 'member' | 'ownership') => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onOpenItemDetail: (itemId: string) => void;
  onBackToChecklist: () => void;
}

function formatCompactByUnit(grams: number, unitSystem: UnitSystem): string {
  const safeGrams = Math.max(0, Math.round(grams));
  if (unitSystem === 'imperial') {
    if (safeGrams >= 454) {
      return formatTotalWeightByPref(safeGrams, 'imperial');
    }
    return formatItemWeightByPref(safeGrams, 'imperial');
  }
  return formatWeightCompact(safeGrams);
}

interface AllocatedEntry {
  groupId: string;
  groupTitle: string;
  item: PackingItem;
  bagId: SmartBagId;
}

export const SmartPackingInlinePanel: React.FC<SmartPackingInlinePanelProps> = ({
  groups,
  crew,
  intel,
  activeMemberId,
  filter,
  smartBagOverrides,
  smartBagSummaryTip,
  carryOnLimitKg = CARRY_ON_LIMIT_KG,
  checkedLimitKg = CHECKED_LIMIT_KG,
  unitSystem = 'metric',
  baggagePreset,
  onSelectBaggagePreset,
  onSaveSmartBagPlan,
  onAssignItemSmartBag,
  onResetSmartBagOverrides,
  onToggleItem,
  onCycleOwnership,
  onDeleteItem,
  onOpenItemDetail,
  onBackToChecklist,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getSmartPackingPanelCopy(activeLang), [activeLang]);
  const localizedBagSpecs = useMemo(() => getLocalizedSmartBagSpecs(activeLang), [activeLang]);

  const [collapsedBags, setCollapsedBags] = useState<Record<string, boolean>>({});

  // Luggage Weight Distribution Forecast controls
  const [forecastExpanded, setForecastExpanded] = useState(true);
  const [includeTare, setIncludeTare] = useState(false);
  const [carryOnShell, setCarryOnShell] = useState<CarryOnShellPreset>('backpack');
  const [checkedShell, setCheckedShell] = useState<CheckedShellPreset>('case24');

  const [isAllocating, setIsAllocating] = useState(false);
  const [allocError, setAllocError] = useState('');

  // Desktop Drag & Drop between bags
  const [draggedItem, setDraggedItem] = useState<{ itemId: string; itemName: string } | null>(null);
  const [dragOverBagId, setDragOverBagId] = useState<SmartBagId | null>(null);

  // Mobile Touch Horizontal Swipe State
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [activeSwipe, setActiveSwipe] = useState<{ itemId: string; offsetX: number } | null>(null);
  const swipePointerRef = useRef<{
    itemId: string;
    groupId: string;
    startX: number;
    startY: number;
    baseOffset: number;
    mode: 'idle' | 'swiping' | 'vertical';
  } | null>(null);
  const suppressClickRef = useRef(false);

  const memberLookup = React.useMemo(() => {
    const map = new Map<string, CrewMember>();
    crew.forEach((m) => map.set(m.id, m));
    return map;
  }, [crew]);

  const matchesPerspective = (item: PackingItem) => {
    if (activeMemberId === 'all') return true;
    if (item.ownership === 'shared') return true;
    return (item.ownerId || 'm1') === activeMemberId;
  };

  const allEntries: AllocatedEntry[] = useMemo(
    () =>
      groups.flatMap((grp) =>
        grp.items.filter(matchesPerspective).map((item) => ({
          groupId: grp.id,
          groupTitle: grp.title,
          item,
          bagId: resolveItemSmartBag(item, grp, smartBagOverrides),
        }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, activeMemberId, smartBagOverrides]
  );

  const forecast = useMemo(
    () =>
      computeLuggageWeightForecast({
        entries: allEntries,
        carryOnLimitKg,
        checkedLimitKg,
        includeTare,
        carryOnShell,
        checkedShell,
        language: activeLang,
        unitSystem,
      }),
    [allEntries, carryOnLimitKg, checkedLimitKg, includeTare, carryOnShell, checkedShell, activeLang, unitSystem]
  );

  const handleJumpToBag = (targetBagId: SmartBagId) => {
    setCollapsedBags((prev) => ({ ...prev, [targetBagId]: false }));
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`smart-bag-${targetBagId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleAiReallocate = async () => {
    if (isAllocating || allEntries.length === 0) return;
    setIsAllocating(true);
    setAllocError('');
    try {
      const res = await fetch('/api/ai/smart-pack-cubes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeTitle: intel.routeTitle,
          weatherSummary: `${intel.tempRange} ${intel.weatherSummary}`,
          language: activeLang,
          items: allEntries.map((e) => ({
            itemId: e.item.id,
            name: formatItemDisplayName(e.item),
            category: e.groupTitle,
            weightGrams: e.item.weightGrams,
            carryOnOnly: Boolean(e.item.carryOnOnly),
            morningOfDeparture: Boolean(e.item.morningOfDeparture),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || copy.aiSortUnavailable);
      }
      const nextMap: Record<string, SmartBagId> = { ...smartBagOverrides };
      if (Array.isArray(data.allocations)) {
        for (const row of data.allocations) {
          if (row?.itemId && VALID_BAG_IDS.has(row.bagId as SmartBagId)) {
            nextMap[String(row.itemId)] = row.bagId as SmartBagId;
          }
        }
      }
      onSaveSmartBagPlan(nextMap, data.summaryTip ? String(data.summaryTip) : '');
    } catch (err) {
      setAllocError(err instanceof Error ? err.message : copy.aiSortFailed);
    } finally {
      setIsAllocating(false);
    }
  };

  // Mobile Touch Horizontal Swipe Handlers
  const handleSwipePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    groupId: string,
    itemId: string
  ) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (e.pointerType === 'mouse') return;

    const baseOffset = swipedItemId === itemId ? -112 : 0;
    swipePointerRef.current = {
      itemId,
      groupId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffset,
      mode: 'idle',
    };
  };

  const handleSwipePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = swipePointerRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (st.mode === 'idle') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        st.mode = 'swiping';
        suppressClickRef.current = true;
      } else if (Math.abs(dy) > 12) {
        st.mode = 'vertical';
        swipePointerRef.current = null;
        return;
      } else {
        return;
      }
    }

    if (st.mode === 'swiping') {
      const nextOffset = Math.max(-132, Math.min(84, st.baseOffset + dx));
      setActiveSwipe({ itemId: st.itemId, offsetX: nextOffset });
    }
  };

  const handleSwipePointerEnd = () => {
    const st = swipePointerRef.current;
    swipePointerRef.current = null;
    if (!st || st.mode !== 'swiping') return;

    const finalOffset =
      activeSwipe?.itemId === st.itemId ? activeSwipe.offsetX : st.baseOffset;
    setActiveSwipe(null);

    if (finalOffset >= 52) {
      onToggleItem(st.groupId, st.itemId, activeMemberId);
      setSwipedItemId(null);
    } else if (finalOffset <= -48) {
      setSwipedItemId(st.itemId);
    } else {
      setSwipedItemId(null);
    }

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 60);
  };

  const persistedOverrideCount = allEntries.filter(({ item }) =>
    Boolean(smartBagOverrides[item.id] && VALID_BAG_IDS.has(smartBagOverrides[item.id]))
  ).length;

  return (
    <div className="space-y-3">
      {/* Switched View Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToChecklist}
            className="inline-flex items-center gap-1 rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#152B29] hover:border-[#0ABAB5] hover:text-[#078C88] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('smartBags.backToChecklist')}
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold tracking-tight text-[#152B29]">
                {t('smartBags.title')}
              </h2>
              {persistedOverrideCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#BEE5E2] bg-[#EFF9F8] px-2 py-0.5 text-[11px] font-bold text-[#076E6A]">
                  <Pin className="h-3 w-3 text-[#078C88]" />
                  {t('smartBags.persistedBadge', { count: persistedOverrideCount })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#647B78]">{t('smartBags.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {persistedOverrideCount > 0 && onResetSmartBagOverrides && (
            <button
              type="button"
              onClick={onResetSmartBagOverrides}
              className="inline-flex items-center gap-1 rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5B7370] hover:border-[#0ABAB5] hover:text-[#152B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={t('smartBags.resetOverridesTitle')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('smartBags.resetOverrides')}
            </button>
          )}
          <button
            type="button"
            onClick={handleAiReallocate}
            disabled={isAllocating}
            className="inline-flex items-center gap-1 rounded-xl border border-[#BEE5E2] bg-[#EFF9F8] px-2.5 py-1.5 text-xs font-semibold text-[#076E6A] hover:bg-[#DFF3F1] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isAllocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#078C88]" />
            )}
            {isAllocating ? t('smartBags.aiReallocating') : t('smartBags.aiReallocate')}
          </button>
        </div>
      </div>

      {allocError && <p className="px-1 text-xs font-medium text-[#B96A39]">{allocError}</p>}
      {smartBagSummaryTip && (
        <div className="rounded-xl border border-[#C6E6E3] bg-[#EFF9F8] px-3.5 py-2 text-xs text-[#076E6A]">
          {t('smartBags.aiTipPrefix')}
          {smartBagSummaryTip}
        </div>
      )}

      {/* Luggage Weight Distribution Forecast & Overweight Rebalancing Panel */}
      <section
        aria-label={t('smartBags.forecastTitle')}
        className={`rounded-2xl border bg-white overflow-hidden transition-colors ${
          forecast.statusLevel === 'overweight'
            ? 'border-[#E6BFB3]'
            : forecast.statusLevel === 'caution'
            ? 'border-[#E5D3A8]'
            : 'border-[#DCE8E5]'
        }`}
      >
        {/* Top Summary Header — 2-row responsive layout prevents narrow-screen title crushing & truncation */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#FAFDFC] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setForecastExpanded((prev) => !prev)}
              className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
            >
              <AccentIconBadge
                accent={
                  forecast.statusLevel === 'overweight'
                    ? 'rose'
                    : forecast.statusLevel === 'caution'
                    ? 'peach'
                    : 'teal'
                }
                icon={Scale}
                size="md"
              />
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold tracking-tight text-[#152B29] whitespace-nowrap">
                  {t('smartBags.forecastTitle')}
                </h3>
                <span aria-hidden="true" className="text-[#CBDAD7]">
                  ·
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap ${
                    forecast.statusLevel === 'overweight'
                      ? 'text-[#B95239]'
                      : forecast.statusLevel === 'caution'
                      ? 'text-[#C86D2D]'
                      : 'text-[#078C88]'
                  }`}
                >
                  {forecast.statusLevel === 'overweight' ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t('smartBags.statusOverweight')}
                    </>
                  ) : forecast.statusLevel === 'caution' ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t('smartBags.statusCaution')}
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      {t('smartBags.statusHealthy')}
                    </>
                  )}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForecastExpanded((prev) => !prev)}
              aria-label={t('smartBags.forecastTitle')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5B7370] hover:bg-[#EEF4F3] hover:text-[#152B29] cursor-pointer"
            >
              {forecastExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pl-0 sm:pl-11.5">
            <p className="text-xs font-medium text-[#5B7370] tabular-nums">
              {t('smartBags.forecastSummary', {
                total: formatCompactByUnit(forecast.totalGrams, unitSystem),
                carryPct: forecast.carryOnRatioPct,
                checkedPct: forecast.checkedRatioPct,
              })}
            </p>

            {/* Net Weight vs With Suitcase Tare Toggle */}
            <div className="inline-flex items-center rounded-xl border border-[#DCE8E5] bg-white p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setIncludeTare(false)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !includeTare
                    ? 'bg-[#152B29] text-white'
                    : 'text-[#5B7370] hover:text-[#152B29]'
                }`}
              >
                {t('smartBags.netOnlyShort')}
              </button>
              <button
                type="button"
                onClick={() => setIncludeTare(true)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  includeTare
                    ? 'bg-[#078C88] text-white'
                    : 'text-[#5B7370] hover:text-[#152B29]'
                }`}
              >
                {t('smartBags.withTareShort')}
              </button>
            </div>
          </div>
        </div>

        {forecastExpanded && (
          <div className="border-t border-[#EDF3F1] divide-y divide-[#EDF3F1]">
            {/* Row 1: Airline Allowance Quick Presets (3-Column Equal Tier Cards) + Optional Suitcase Tare Selectors */}
            <div className="px-4 sm:px-5 py-3 space-y-2.5 text-xs bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[#3B5552] whitespace-nowrap">
                    {copy.airlineAllowance}
                  </span>
                  <span className="text-[11px] text-[#7A908D] whitespace-nowrap">
                    {copy.carryOnPlusChecked}
                  </span>
                </div>

                {baggagePreset === 'custom' && (
                  <span className="tabular-nums text-[11px] font-semibold text-[#078C88]">
                    {t('smartBags.customLimitLabel')} (
                    {formatCompactByUnit(carryOnLimitKg * 1000, unitSystem)} +{' '}
                    {formatCompactByUnit(checkedLimitKg * 1000, unitSystem)})
                  </span>
                )}
              </div>

              {onSelectBaggagePreset ? (
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F2F7F6] p-1 w-full">
                  {(['lcc', 'standard', 'business'] as const).map((presetKey) => {
                    const spec = BAGGAGE_PRESET_SPECS[presetKey];
                    const presetLabels = getBaggagePresetLabels(
                      presetKey,
                      activeLang,
                      unitSystem
                    );
                    const isActive =
                      baggagePreset === presetKey ||
                      (!baggagePreset &&
                        Math.abs(carryOnLimitKg - spec.carryOnKg) < 0.05 &&
                        Math.abs(checkedLimitKg - spec.checkedKg) < 0.05);
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => onSelectBaggagePreset(presetKey)}
                        className={`min-h-[46px] px-2 py-1.5 rounded-lg flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#152B29] shadow-xs ring-1 ring-[#DCE8E5]'
                            : 'text-[#5B7370] hover:text-[#152B29]'
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight whitespace-nowrap">
                          {presetLabels.tierTitle}
                        </span>
                        <span
                          className={`mt-0.5 text-[11px] leading-tight tabular-nums whitespace-nowrap ${
                            isActive ? 'font-semibold text-[#078C88]' : 'text-[#647B78]'
                          }`}
                        >
                          {presetLabels.allowanceSub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="tabular-nums font-semibold text-[#152B29]">
                  {t('packing.carryOnLabel')} {formatCompactByUnit(carryOnLimitKg * 1000, unitSystem)} ·{' '}
                  {t('packing.checkedLabel')} {formatCompactByUnit(checkedLimitKg * 1000, unitSystem)}
                </div>
              )}

              {includeTare && (
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <label className="inline-flex items-center gap-1 text-[#5B7370]">
                    <span>{t('smartBags.carryOnShellLabel')}</span>
                    <select
                      value={carryOnShell}
                      onChange={(e) => setCarryOnShell(e.target.value as CarryOnShellPreset)}
                      className="rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] px-2 py-0.5 font-semibold text-[#152B29] focus:border-[#0ABAB5] focus:outline-none cursor-pointer"
                    >
                      {Object.values(CARRY_ON_SHELL_SPECS).map((s) => (
                        <option key={s.id} value={s.id}>
                          {getCarryOnShellLabel(s.id, activeLang, unitSystem)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(checkedLimitKg > 0 || forecast.checkedNetGrams > 0) && (
                    <label className="inline-flex items-center gap-1 text-[#5B7370]">
                      <span>{t('smartBags.checkedShellLabel')}</span>
                      <select
                        value={checkedShell}
                        onChange={(e) => setCheckedShell(e.target.value as CheckedShellPreset)}
                        className="rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] px-2 py-0.5 font-semibold text-[#152B29] focus:border-[#0ABAB5] focus:outline-none cursor-pointer"
                      >
                        {Object.values(CHECKED_SHELL_SPECS).map((s) => (
                          <option key={s.id} value={s.id}>
                            {getCheckedShellLabel(s.id, activeLang, unitSystem)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Row 2: Carry-On vs Checked Proportional Distribution Bar + 9-Bag Quick Jump */}
            <div className="px-4 sm:px-5 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#174F4B] shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-[#152B29] whitespace-nowrap">
                    {t('smartBags.carryOnShareLabel')}
                  </span>
                  <span className="font-num tabular-nums font-bold text-[#174F4B]">
                    {forecast.carryOnRatioPct}%
                  </span>
                  <span className="font-num tabular-nums text-[#647B78] hidden sm:inline">
                    ({formatCompactByUnit(forecast.carryOnTotalGrams, unitSystem)})
                  </span>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-num tabular-nums text-[#647B78] hidden sm:inline">
                    ({formatCompactByUnit(forecast.checkedTotalGrams, unitSystem)})
                  </span>
                  <span className="font-num tabular-nums font-bold text-[#078C88]">
                    {forecast.checkedRatioPct}%
                  </span>
                  <span className="font-semibold text-[#152B29] whitespace-nowrap">
                    {t('smartBags.checkedShareLabel')}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#078C88] shrink-0" aria-hidden="true" />
                </div>
              </div>

              {/* Proportional Split SVG Bar (Zero inline styles) */}
              <svg
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                className="w-full h-2.5 rounded-full overflow-hidden bg-[#EDF3F1] block"
                role="img"
                aria-label={`${t('smartBags.carryOnShareLabel')} ${forecast.carryOnRatioPct}% · ${t('smartBags.checkedShareLabel')} ${forecast.checkedRatioPct}%`}
              >
                {forecast.totalGrams > 0 && (
                  <>
                    <rect
                      x={0}
                      y={0}
                      width={forecast.carryOnRatioPct}
                      height={8}
                      fill="#174F4B"
                    />
                    <rect
                      x={forecast.carryOnRatioPct}
                      y={0}
                      width={forecast.checkedRatioPct}
                      height={8}
                      fill="#078C88"
                    />
                  </>
                )}
              </svg>

              {/* Interactive 9-Bag Weight Share Jump Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {forecast.bagBreakdowns
                  .filter((b) => b.itemCount > 0)
                  .sort((a, b) => b.weightGrams - a.weightGrams)
                  .map((b) => {
                    const bagMeta = resolveSmartBagIconMeta(b.bagId);
                    return (
                      <button
                        key={b.bagId}
                        type="button"
                        onClick={() => handleJumpToBag(b.bagId)}
                        title={b.shortLabel}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EEEB] bg-[#FAFDFC] hover:border-[#0ABAB5] hover:bg-[#EFF9F8] px-2 py-1 text-[11px] text-[#35504D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <bagMeta.Icon
                          className={`h-3 w-3 shrink-0 ${HERO_ACCENT_PALETTE[bagMeta.accent].textClass}`}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{b.shortLabel}</span>
                        <span className="font-num tabular-nums font-bold text-[#152B29]">
                          {formatCompactByUnit(b.weightGrams, unitSystem)}
                        </span>
                        <span className="font-num tabular-nums text-[#7D938F]">
                          {b.shareOfItemsPct}%
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Row 3: 2-Column Carry-On vs Checked Limit Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#EDF3F1]">
              {/* Left: Carry-On 3 Bags */}
              <div className="px-4 sm:px-5 py-3.5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#152B29]">
                      {t('smartBags.carryOn3Bags')}
                    </span>
                    <span className="ml-1.5 text-[11px] text-[#647B78]">
                      {t('smartBags.carryOn3BagsSub')}
                    </span>
                  </div>
                  <span
                    className={`font-num tabular-nums text-xs font-extrabold ${
                      forecast.carryOnDeltaGrams < 0
                        ? 'text-[#B95239]'
                        : forecast.carryOnUtilizationPct >= 85
                        ? 'text-[#A8791D]'
                        : 'text-[#152B29]'
                    }`}
                  >
                    {formatWeightAgainstLimit(
                      forecast.carryOnTotalGrams,
                      carryOnLimitKg,
                      unitSystem,
                      0
                    )}
                  </span>
                </div>

                <svg
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  className="w-full h-1.5 rounded-full overflow-hidden bg-[#EDF3F1] block"
                  aria-hidden="true"
                >
                  <rect
                    x={0}
                    y={0}
                    width={Math.min(100, Math.max(0, forecast.carryOnUtilizationPct))}
                    height={6}
                    fill={
                      forecast.carryOnDeltaGrams < 0
                        ? '#C85A3F'
                        : forecast.carryOnUtilizationPct >= 85
                        ? '#D97E4A'
                        : '#174F4B'
                    }
                  />
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#647B78] font-num tabular-nums">
                  <span>
                    {t('smartBags.packedShort')}{' '}
                    {formatCompactByUnit(forecast.carryOnPackedGrams, unitSystem)}
                    {' · '}
                    {t('smartBags.todoShort')}{' '}
                    {formatCompactByUnit(
                      Math.max(0, forecast.carryOnNetGrams - forecast.carryOnPackedGrams),
                      unitSystem
                    )}
                    {forecast.carryOnTareGrams > 0 &&
                      ` · ${t('smartBags.emptyBagTare')} +${formatCompactByUnit(
                        forecast.carryOnTareGrams,
                        unitSystem
                      )}`}
                  </span>
                  <span
                    className={`font-bold ${
                      forecast.carryOnDeltaGrams < 0
                        ? 'text-[#B95239]'
                        : forecast.carryOnUtilizationPct >= 85
                        ? 'text-[#A8791D]'
                        : 'text-[#078C88]'
                    }`}
                  >
                    {forecast.carryOnDeltaGrams < 0
                      ? `${t('smartBags.overLimitPrefix')} ${formatCompactByUnit(
                          Math.abs(forecast.carryOnDeltaGrams),
                          unitSystem
                        )}`
                      : `${t('smartBags.marginPrefix')} ${formatCompactByUnit(
                          forecast.carryOnDeltaGrams,
                          unitSystem
                        )}`}
                  </span>
                </div>
              </div>

              {/* Right: Checked 6 Bags */}
              <div className="px-4 sm:px-5 py-3.5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#152B29]">
                      {t('smartBags.checked6Bags')}
                    </span>
                    <span className="ml-1.5 text-[11px] text-[#647B78]">
                      {t('smartBags.checked6BagsSub')}
                    </span>
                  </div>
                  <span
                    className={`font-num tabular-nums text-xs font-extrabold ${
                      (checkedLimitKg <= 0 && forecast.checkedNetGrams > 0) ||
                      (checkedLimitKg > 0 && forecast.checkedDeltaGrams < 0)
                        ? 'text-[#B95239]'
                        : checkedLimitKg > 0 && forecast.checkedUtilizationPct >= 85
                        ? 'text-[#A8791D]'
                        : 'text-[#152B29]'
                    }`}
                  >
                    {checkedLimitKg <= 0
                      ? `${formatCompactByUnit(forecast.checkedTotalGrams, unitSystem)} / ${t(
                          'smartBags.noFreeChecked'
                        )}`
                      : formatWeightAgainstLimit(
                          forecast.checkedTotalGrams,
                          checkedLimitKg,
                          unitSystem,
                          0
                        )}
                  </span>
                </div>

                <svg
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  className="w-full h-1.5 rounded-full overflow-hidden bg-[#EDF3F1] block"
                  aria-hidden="true"
                >
                  <rect
                    x={0}
                    y={0}
                    width={Math.min(100, Math.max(0, forecast.checkedUtilizationPct))}
                    height={6}
                    fill={
                      (checkedLimitKg <= 0 && forecast.checkedNetGrams > 0) ||
                      (checkedLimitKg > 0 && forecast.checkedDeltaGrams < 0)
                        ? '#C85A3F'
                        : checkedLimitKg > 0 && forecast.checkedUtilizationPct >= 85
                        ? '#D97E4A'
                        : '#078C88'
                    }
                  />
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#647B78] font-num tabular-nums">
                  <span>
                    {t('smartBags.packedShort')}{' '}
                    {formatCompactByUnit(forecast.checkedPackedGrams, unitSystem)}
                    {' · '}
                    {t('smartBags.todoShort')}{' '}
                    {formatCompactByUnit(
                      Math.max(0, forecast.checkedNetGrams - forecast.checkedPackedGrams),
                      unitSystem
                    )}
                    {forecast.checkedTareGrams > 0 &&
                      ` · ${t('smartBags.emptyCaseTare')} +${formatCompactByUnit(
                        forecast.checkedTareGrams,
                        unitSystem
                      )}`}
                  </span>
                  <span
                    className={`font-bold ${
                      (checkedLimitKg <= 0 && forecast.checkedNetGrams > 0) ||
                      (checkedLimitKg > 0 && forecast.checkedDeltaGrams < 0)
                        ? 'text-[#B95239]'
                        : checkedLimitKg > 0 && forecast.checkedUtilizationPct >= 85
                        ? 'text-[#A8791D]'
                        : 'text-[#078C88]'
                    }`}
                  >
                    {checkedLimitKg <= 0
                      ? forecast.checkedNetGrams > 0
                        ? `${t('smartBags.needClearChecked')} ${formatCompactByUnit(
                            forecast.checkedNetGrams,
                            unitSystem
                          )}`
                        : `0 ${t('smartBags.freeCheckedPass')}`
                      : forecast.checkedDeltaGrams < 0
                      ? `${t('smartBags.overLimitPrefix')} ${formatCompactByUnit(
                          Math.abs(forecast.checkedDeltaGrams),
                          unitSystem
                        )}`
                      : `${t('smartBags.souvenirMarginPrefix')} ${formatCompactByUnit(
                          forecast.checkedDeltaGrams,
                          unitSystem
                        )}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 4: Smart Overweight & Civil Aviation Advisory + 1-Click Rebalancing Actions */}
            <div
              className={`px-4 sm:px-5 py-3 space-y-2.5 ${
                forecast.statusLevel === 'overweight'
                  ? 'bg-[#FDF7F5]'
                  : forecast.statusLevel === 'caution'
                  ? 'bg-[#FFFDF7]'
                  : 'bg-[#F8FCFA]'
              }`}
            >
              <div className="flex items-start gap-2 text-xs">
                {forecast.statusLevel === 'overweight' ? (
                  <ShieldAlert className="h-4 w-4 text-[#B95239] shrink-0 mt-0.5" />
                ) : forecast.statusLevel === 'caution' ? (
                  <AlertTriangle className="h-4 w-4 text-[#A8791D] shrink-0 mt-0.5" />
                ) : (
                  <Check className="h-4 w-4 text-[#078C88] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 min-w-0">
                  <p
                    className={`font-medium leading-relaxed ${
                      forecast.statusLevel === 'overweight'
                        ? 'text-[#8F3923]'
                        : forecast.statusLevel === 'caution'
                        ? 'text-[#7C5812]'
                        : 'text-[#1E4E4B]'
                    }`}
                  >
                    {forecast.headlineAdvice}
                  </p>
                  {forecast.statusLevel !== 'healthy' && forecast.wearableReliefCandidate && (
                    <p className="text-[11px] text-[#647B78] tabular-nums">
                      {t('smartBags.wearableTip', {
                        name: translateDemoPackItemName(
                          forecast.wearableReliefCandidate.itemName,
                          activeLang
                        ),
                        weight: formatCompactByUnit(
                          forecast.wearableReliefCandidate.weightGrams,
                          unitSystem
                        ),
                      })}
                    </p>
                  )}
                </div>
              </div>

              {forecast.recommendations.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#5B7370]">
                    {t('smartBags.rebalanceHeading')}
                  </div>
                  <div className="divide-y divide-[#E9F0EE] rounded-xl border border-[#E2ECEA] bg-white overflow-hidden">
                    {forecast.recommendations.map((rec) => (
                      <div
                        key={rec.itemId}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#152B29]">
                              {translateDemoPackItemName(rec.itemName, activeLang)}
                            </span>
                            <span className="font-num tabular-nums text-[#5B7370]">
                              {formatItemWeightByPref(rec.weightGrams, unitSystem)}
                            </span>
                            <span className="text-[#8CA39F]" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-[11px] text-[#647B78]">
                              {t('smartBags.currentlyInPrefix')} {rec.fromBagLabel}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              rec.reasonType === 'safety_must_carry_on'
                                ? 'text-[#B95239] font-medium'
                                : 'text-[#647B78]'
                            }`}
                          >
                            {rec.reasonText}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onAssignItemSmartBag(rec.itemId, rec.toBagId, rec.itemName)
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            rec.reasonType === 'safety_must_carry_on'
                              ? 'bg-[#B95239] text-white hover:bg-[#9E432C]'
                              : 'bg-[#EFF9F8] border border-[#BEE5E2] text-[#076E6A] hover:bg-[#DFF3F1]'
                          }`}
                        >
                          <ArrowRightLeft className="h-3 w-3 shrink-0" />
                          {t('smartBags.moveToBtnPrefix')} {rec.toBagLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Full-Width Stacked Interactive Bag Cards */}
      {localizedBagSpecs.map((bag) => {
        const bagPerspectiveEntries = allEntries.filter((e) => e.bagId === bag.id);
        const visibleEntries = bagPerspectiveEntries.filter(({ item }) => {
          if (filter === 'todo') return !item.done;
          if (filter === 'to_buy') return Boolean(item.toBuy);
          if (filter === 'always_pack') return Boolean(item.alwaysPack);
          if (filter === 'done') return item.done;
          return true;
        });

        if (visibleEntries.length === 0 && filter !== 'all' && !draggedItem) {
          return null;
        }

        const isClosed = Boolean(collapsedBags[bag.id]);
        const bagDone = bagPerspectiveEntries.filter((e) => e.item.done).length;
        const bagTotal = bagPerspectiveEntries.length;
        const bagWeightGrams = bagPerspectiveEntries.reduce(
          (sum, e) => sum + e.item.weightGrams,
          0
        );
        const isBagAllDone = bagTotal > 0 && bagDone === bagTotal;
        const isDropTarget = dragOverBagId === bag.id;

        return (
          <section
            key={bag.id}
            id={`smart-bag-${bag.id}`}
            onDragOver={(e) => {
              if (!draggedItem) return;
              e.preventDefault();
              setDragOverBagId(bag.id);
            }}
            onDragLeave={() => {
              setDragOverBagId((prev) => (prev === bag.id ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverBagId(null);
              if (draggedItem) {
                onAssignItemSmartBag(draggedItem.itemId, bag.id, draggedItem.itemName);
                setDraggedItem(null);
              }
            }}
            className={`rounded-2xl border bg-white overflow-hidden transition-colors ${
              isDropTarget
                ? 'border-[#078C88] ring-2 ring-[#078C88]/20'
                : isBagAllDone
                ? 'border-[#BFE4DA]'
                : 'border-[#DCE8E5]'
            }`}
          >
            {/* Bag Card Header with Per-Bag Weight */}
            <div
              className={`flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 transition-colors select-none ${
                isBagAllDone ? 'bg-[#F8FCFA] hover:bg-[#F2FAF7]' : 'hover:bg-[#FAFDFC]'
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setCollapsedBags((prev) => ({ ...prev, [bag.id]: !prev[bag.id] }))
                }
                className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
              >
                <AccentIconBadge
                  accent={resolveSmartBagIconMeta(bag.id).accent}
                  icon={resolveSmartBagIconMeta(bag.id).Icon}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-[15px] font-bold text-[#152B29] truncate">
                      {bag.title}
                    </h3>
                    <span className="font-num tabular-nums text-xs font-semibold text-[#5B7370]">
                      {bagTotal > 0 ? formatCompactByUnit(bagWeightGrams, unitSystem) : formatItemWeightByPref(0, unitSystem)}
                      {' · '}
                      {bag.defaultCarryOn ? t('smartBags.carryOnWeightTag') : t('smartBags.checkedWeightTag')}
                    </span>
                  </div>
                  <p className="text-xs text-[#647B78] truncate">{bag.subtitle}</p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-num text-sm font-bold text-[#078C88]">
                  {bagDone}/{bagTotal}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedBags((prev) => ({ ...prev, [bag.id]: !prev[bag.id] }))
                  }
                  aria-label={bag.title}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5B7370] hover:bg-[#EEF4F3] hover:text-[#152B29] cursor-pointer"
                >
                  {isClosed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bag Items */}
            {!isClosed && (
              <div className="border-t border-[#EDF3F1] divide-y divide-[#F1F6F5]">
                {visibleEntries.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-[#647B78]">
                    {t('smartBags.emptyBagHint')}
                  </div>
                ) : (
                  visibleEntries.map(({ groupId, item }) => {
                    const responsibleMember =
                      memberLookup.get(item.ownerId || 'm1') || crew[0];

                    const currentSwipeOffset =
                      activeSwipe?.itemId === item.id
                        ? activeSwipe.offsetX
                        : swipedItemId === item.id
                        ? -112
                        : 0;
                    const showSwipeBackdrop =
                      currentSwipeOffset !== 0 || swipedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable={swipedItemId !== item.id}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggedItem({ itemId: item.id, itemName: item.name });
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverBagId(null);
                        }}
                        className="bg-white overflow-hidden"
                      >
                        <div className="relative overflow-hidden">
                          {showSwipeBackdrop && (
                            <div
                              className="absolute inset-0 flex items-stretch justify-between pointer-events-none"
                              aria-hidden={swipedItemId !== item.id}
                            >
                              <div
                                className={`flex items-center px-4 text-white text-xs font-semibold transition-opacity ${
                                  currentSwipeOffset > 0
                                    ? 'bg-[#078C88] opacity-100'
                                    : 'opacity-0'
                                }`}
                              >
                                {item.done
                                  ? t('packingExtra.swipeUndo')
                                  : t('packingExtra.swipeDone')}
                              </div>
                              <div
                                className={`flex items-stretch transition-opacity ${
                                  currentSwipeOffset < 0
                                    ? 'pointer-events-auto opacity-100'
                                    : 'pointer-events-none opacity-0'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSwipedItemId(null);
                                    onOpenItemDetail(item.id);
                                  }}
                                  className="w-14 bg-[#078C88] text-white text-xs font-semibold hover:bg-[#067572] whitespace-nowrap cursor-pointer"
                                >
                                  {t('common.edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItem(groupId, item.id);
                                    setSwipedItemId(null);
                                  }}
                                  className="w-14 bg-[#C85A3F] text-white text-xs font-semibold hover:bg-[#AE4A31] whitespace-nowrap cursor-pointer"
                                >
                                  {t('common.delete')}
                                </button>
                              </div>
                            </div>
                          )}

                          <div
                            onPointerDown={(e) => handleSwipePointerDown(e, groupId, item.id)}
                            onPointerMove={handleSwipePointerMove}
                            onPointerUp={handleSwipePointerEnd}
                            onPointerCancel={handleSwipePointerEnd}
                            onWheel={(e) => {
                              if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
                                if (e.deltaX > 22) {
                                  setSwipedItemId(item.id);
                                } else if (e.deltaX < -22 && swipedItemId === item.id) {
                                  setSwipedItemId(null);
                                }
                              }
                            }}
                            style={{
                              transform: `translateX(${currentSwipeOffset}px)`,
                              transition:
                                activeSwipe?.itemId === item.id
                                  ? 'none'
                                  : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                            className="relative z-10 bg-white px-4 sm:px-5 py-3 hover:bg-[#FAFDFC] transition-colors touch-pan-y cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-2.5">
                              {/* 1-Tap Checkbox (Toggles Done Immediately) */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (suppressClickRef.current) return;
                                  if (swipedItemId === item.id) {
                                    setSwipedItemId(null);
                                    return;
                                  }
                                  onToggleItem(groupId, item.id, activeMemberId);
                                }}
                                aria-label={item.name}
                                className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-[#F2F6F5] transition-colors cursor-pointer"
                              >
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                    item.done
                                      ? 'border-[#078C88] bg-[#078C88] text-white'
                                      : 'border-[#B9CBC8] bg-white'
                                  }`}
                                >
                                  {item.done && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                                </span>
                              </button>

                              {/* Tappable Item Body -> Opens Packy Item Detail Sheet */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (suppressClickRef.current) return;
                                  if (swipedItemId === item.id) {
                                    setSwipedItemId(null);
                                    return;
                                  }
                                  onOpenItemDetail(item.id);
                                }}
                                className="flex-1 min-w-0 text-left py-0.5 cursor-pointer"
                              >
                                {(() => {
                                  const itemQty = getItemQuantity(item);
                                  const itemUnitW = getItemUnitWeight(item, groupId);
                                  const isManualOverride = Boolean(
                                    smartBagOverrides[item.id] &&
                                      VALID_BAG_IDS.has(smartBagOverrides[item.id])
                                  );
                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`text-sm font-semibold ${
                                          item.done
                                            ? 'line-through text-[#8CA39F]'
                                            : 'text-[#152B29]'
                                        }`}
                                      >
                                        {translateDemoPackItemName(item.name, activeLang)}
                                      </span>
                                      {itemQty > 1 && (
                                        <span className="font-num tabular-nums text-xs font-bold text-[#076E6A]">
                                          ×{itemQty}
                                        </span>
                                      )}
                                      <span className="tabular-nums text-xs text-[#7D938F]">
                                        {formatItemWeightByPref(item.weightGrams, unitSystem)}
                                        {itemQty > 1 &&
                                          ` (${formatItemWeightByPref(itemUnitW, unitSystem)}${t(
                                            'common.perPiece'
                                          )})`}
                                        {isManualOverride &&
                                          ` · ${t('smartBags.manualPinnedBadge')}`}
                                        {item.morningOfDeparture &&
                                          ` · ⏰ ${t('common.morningShort')}`}
                                        {item.carryOnOnly && ` · ${t('common.carryOnBadge')}`}
                                        {item.toBuy && (
                                          <span className="text-[#C85A3F] font-semibold">
                                            {` · ${copy.toBuyBadge}`}
                                          </span>
                                        )}
                                        {item.alwaysPack && (
                                          <span className="text-[#076E6A] font-semibold">
                                            {` · ${copy.alwaysPackBadge}`}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })()}
                                <p className="mt-0.5 text-xs text-[#647B78] truncate">
                                  {translateDemoPackItemWhy(item.why, activeLang)}
                                </p>
                              </button>

                              {/* Clean Right Controls: Member Avatar + 「···」 Detail Trigger */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onCycleOwnership(groupId, item.id, 'member')}
                                  title={`${t('common.ownerPrefix')}${translateMemberName(
                                    responsibleMember?.name ?? '本人',
                                    activeLang
                                  )}`}
                                  aria-label={`${t('common.ownerPrefix')}${item.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer"
                                >
                                  <span
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                                      responsibleMember
                                        ? HERO_AVATAR_BG[responsibleMember.accent]
                                        : HERO_AVATAR_BG.peach
                                    }`}
                                  >
                                    {translateMemberInitials(
                                      responsibleMember?.initials ?? '我',
                                      activeLang
                                    )}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSwipedItemId(null);
                                    onOpenItemDetail(item.id);
                                  }}
                                  aria-label={item.name}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8BA39F] hover:bg-[#F2F6F5] hover:text-[#152B29] transition-colors cursor-pointer"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

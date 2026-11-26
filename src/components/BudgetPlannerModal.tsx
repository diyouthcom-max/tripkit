import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Calculator,
  Check,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  BudgetState,
  HomeCurrencyCode,
  TripIntelligence,
} from '../types';
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  isSameCurrency,
  isZeroDecimalCurrency,
  refreshLiveUsdRates,
  resolveExchangeRate,
} from '../utils/currencyHelpers';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getBudgetPackA } from '../i18n/packs/budgetPackA';

export interface BudgetLimitsUpdatePayload {
  tripTotalUsd?: number;
  prepaidUsd?: number;
  dailyBudgetLocal?: number;
  shoppingReserveLocal?: number;
  customFxLocalToHome?: number | null;
  customFxHomeCode?: HomeCurrencyCode | null;
}

export interface BudgetPlannerModalProps {
  open: boolean;
  onClose: () => void;
  budget: BudgetState;
  intel: TripIntelligence;
  totalDays: number;
  homeCurrency: HomeCurrencyCode;
  language: AppLanguage;
  initialFocus?: 'overall' | 'daily' | 'shopping';
  onOpenCurrencyPicker: () => void;
  onSaveBudgetPlan: (updates: BudgetLimitsUpdatePayload) => void;
}

type PlanMode = 'top_down' | 'bottom_up';
type EditUnit = 'local' | 'home';

export const BudgetPlannerModal: React.FC<BudgetPlannerModalProps> = ({
  open,
  onClose,
  budget,
  intel,
  totalDays,
  homeCurrency,
  language,
  initialFocus = 'overall',
  onOpenCurrencyPicker,
  onSaveBudgetPlan,
}) => {
  const activeLang = normalizeAppLanguage(language, 'en-US');
  const copy = useMemo(() => getBudgetPackA(activeLang), [activeLang]);
  const safeDays = Math.max(1, totalDays);
  const tripCode = (intel.currencyCode || 'EUR').trim().toUpperCase();
  const sameCurrency = isSameCurrency(tripCode, homeCurrency);

  const [planMode, setPlanMode] = useState<PlanMode>('top_down');
  const [editUnit, setEditUnit] = useState<EditUnit>('local');

  // Draft values always stored in active `editUnit` strings while typing
  const [totalDraft, setTotalDraft] = useState('');
  const [prepaidDraft, setPrepaidDraft] = useState('');
  const [dailyDraft, setDailyDraft] = useState('');
  const [shoppingDraft, setShoppingDraft] = useState('');

  // Custom exchange rate state (1 Trip Local Currency = X Home Currency)
  const [useCustomFx, setUseCustomFx] = useState(false);
  const [customFxDraft, setCustomFxDraft] = useState('');
  const [syncingLiveFx, setSyncingLiveFx] = useState(false);
  const [liveSyncMsg, setLiveSyncMsg] = useState<string | null>(null);
  const [, setFxRefreshTick] = useState(0);

  // Active auto rate (ignoring custom lock so user can compare live vs custom)
  const autoFxInfo = useMemo(
    () =>
      resolveExchangeRate({
        fromCode: tripCode,
        toCode: homeCurrency,
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripCode, homeCurrency, intel.fxToUsd, syncingLiveFx]
  );

  const effectiveLocalToHomeRate = useMemo(() => {
    if (sameCurrency) return 1;
    const parsedCustom = parseFloat(customFxDraft);
    if (useCustomFx && Number.isFinite(parsedCustom) && parsedCustom > 0) {
      return parsedCustom;
    }
    return autoFxInfo.rate > 0 ? autoFxInfo.rate : 1;
  }, [sameCurrency, useCustomFx, customFxDraft, autoFxInfo.rate]);

  const formatNumForInput = (val: number, code: string): string => {
    if (!Number.isFinite(val) || val < 0) return '0';
    if (isZeroDecimalCurrency(code)) return String(Math.round(val));
    return String(Number(val.toFixed(2)));
  };

  // Initialize modal state on open
  useEffect(() => {
    if (!open) return;
    setLiveSyncMsg(null);
    const defaultMode: PlanMode =
      initialFocus === 'daily' || initialFocus === 'shopping' ? 'bottom_up' : 'top_down';
    setPlanMode(defaultMode);

    const startUnit: EditUnit = sameCurrency ? 'local' : 'home';
    setEditUnit(startUnit);

    const hasLockedForCurrentHome =
      !sameCurrency &&
      Boolean(
        budget.customFxLocalToHome &&
          budget.customFxLocalToHome > 0 &&
          budget.customFxHomeCode === homeCurrency
      );

    setUseCustomFx(hasLockedForCurrentHome);
    const initialRate = hasLockedForCurrentHome
      ? budget.customFxLocalToHome!
      : autoFxInfo.rate;
    setCustomFxDraft(
      initialRate >= 100
        ? initialRate.toFixed(2)
        : initialRate >= 1
        ? initialRate.toFixed(4)
        : initialRate.toFixed(5)
    );

    // Compute current trip figures in local currency first
    const prepaidInLocal = convertCurrencyAmount(budget.prepaidUsd, 'USD', tripCode, {
      intelFxToUsd: intel.fxToUsd,
      tripCurrencyCode: tripCode,
      budgetFx: budget,
    });
    const storedTotalInLocal = convertCurrencyAmount(
      budget.tripTotalUsd,
      'USD',
      tripCode,
      {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }
    );
    const bottomUpSumLocal =
      prepaidInLocal + budget.dailyBudgetLocal * safeDays + budget.shoppingReserveLocal;
    const effectiveTotalLocal = Math.max(storedTotalInLocal, bottomUpSumLocal);

    const targetCode = startUnit === 'home' && !sameCurrency ? homeCurrency : tripCode;
    const scale = startUnit === 'home' && !sameCurrency ? initialRate : 1;

    setTotalDraft(formatNumForInput(effectiveTotalLocal * scale, targetCode));
    setPrepaidDraft(formatNumForInput(prepaidInLocal * scale, targetCode));
    setDailyDraft(formatNumForInput(budget.dailyBudgetLocal * scale, targetCode));
    setShoppingDraft(formatNumForInput(budget.shoppingReserveLocal * scale, targetCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFocus, homeCurrency]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeCode = editUnit === 'home' && !sameCurrency ? homeCurrency : tripCode;
  const activeSym = getCurrencySymbol(activeCode, intel.currencySymbol);
  const secondaryCode = activeCode === tripCode ? homeCurrency : tripCode;

  const handleSwitchEditUnit = (nextUnit: EditUnit) => {
    if (nextUnit === editUnit || sameCurrency) return;
    const rate = effectiveLocalToHomeRate > 0 ? effectiveLocalToHomeRate : 1;
    // If switching local -> home, multiply by rate; if home -> local, divide by rate
    const factor = nextUnit === 'home' ? rate : 1 / rate;
    const nextCode = nextUnit === 'home' ? homeCurrency : tripCode;

    const conv = (raw: string) => {
      const n = Math.max(0, parseFloat(raw) || 0);
      return formatNumForInput(n * factor, nextCode);
    };

    setTotalDraft(conv(totalDraft));
    setPrepaidDraft(conv(prepaidDraft));
    setDailyDraft(conv(dailyDraft));
    setShoppingDraft(conv(shoppingDraft));
    setEditUnit(nextUnit);
  };

  const handleRefreshLiveRate = async () => {
    setSyncingLiveFx(true);
    setLiveSyncMsg(null);
    const res = await refreshLiveUsdRates(true);
    setSyncingLiveFx(false);
    setFxRefreshTick((t) => t + 1);
    const fresh = resolveExchangeRate({
      fromCode: tripCode,
      toCode: homeCurrency,
      intelFxToUsd: intel.fxToUsd,
      tripCurrencyCode: tripCode,
      budgetFx: null,
    });
    if (!useCustomFx && fresh.rate > 0) {
      setCustomFxDraft(
        fresh.rate >= 100
          ? fresh.rate.toFixed(2)
          : fresh.rate >= 1
          ? fresh.rate.toFixed(4)
          : fresh.rate.toFixed(5)
      );
    }
    setLiveSyncMsg(res.ok ? copy.syncOkMsg : copy.syncOfflineMsg);
  };

  // Convert current draft numbers into Local Currency (`tripCode`) for live linkage math
  const toLocalFactor =
    editUnit === 'home' && !sameCurrency && effectiveLocalToHomeRate > 0
      ? 1 / effectiveLocalToHomeRate
      : 1;

  const rawTotalInActive = Math.max(0, parseFloat(totalDraft) || 0);
  const rawPrepaidInActive = Math.max(0, parseFloat(prepaidDraft) || 0);
  const rawDailyInActive = Math.max(0, parseFloat(dailyDraft) || 0);
  const rawShoppingInActive = Math.max(0, parseFloat(shoppingDraft) || 0);

  const computedPrepaidLocal = rawPrepaidInActive * toLocalFactor;
  const computedShoppingLocal = rawShoppingInActive * toLocalFactor;

  // In top_down mode: Total - Prepaid - Shopping => Daily * safeDays
  const topDownRemainingForDailyActive =
    rawTotalInActive - rawPrepaidInActive - rawShoppingInActive;
  const topDownOverAllocated = topDownRemainingForDailyActive < 0;
  const derivedDailyActive = Math.max(0, topDownRemainingForDailyActive / safeDays);

  // In bottom_up mode: Prepaid + Daily * safeDays + Shopping => Total
  const derivedTotalActive =
    rawPrepaidInActive + rawDailyInActive * safeDays + rawShoppingInActive;

  const finalTotalLocal =
    (planMode === 'top_down' ? rawTotalInActive : derivedTotalActive) * toLocalFactor;
  const finalDailyLocal =
    (planMode === 'top_down' ? derivedDailyActive : rawDailyInActive) * toLocalFactor;

  const finalTotalHome = finalTotalLocal * effectiveLocalToHomeRate;
  const finalDailyHome = finalDailyLocal * effectiveLocalToHomeRate;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const nextFxState: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> =
      useCustomFx && !sameCurrency && effectiveLocalToHomeRate > 0
        ? {
            customFxLocalToHome: Number(effectiveLocalToHomeRate.toFixed(6)),
            customFxHomeCode: homeCurrency,
          }
        : {};

    // Convert Local amounts cleanly to internal USD storage fields
    const nextTripTotalUsd = convertCurrencyAmount(finalTotalLocal, tripCode, 'USD', {
      intelFxToUsd: intel.fxToUsd,
      tripCurrencyCode: tripCode,
      budgetFx: nextFxState,
    });
    const nextPrepaidUsd = convertCurrencyAmount(computedPrepaidLocal, tripCode, 'USD', {
      intelFxToUsd: intel.fxToUsd,
      tripCurrencyCode: tripCode,
      budgetFx: nextFxState,
    });

    onSaveBudgetPlan({
      tripTotalUsd: Math.max(0, Number(nextTripTotalUsd.toFixed(2))),
      prepaidUsd: Math.max(0, Number(nextPrepaidUsd.toFixed(2))),
      dailyBudgetLocal: Math.max(
        1,
        isZeroDecimalCurrency(tripCode)
          ? Math.round(finalDailyLocal)
          : Number(finalDailyLocal.toFixed(2))
      ),
      shoppingReserveLocal: Math.max(
        0,
        isZeroDecimalCurrency(tripCode)
          ? Math.round(computedShoppingLocal)
          : Number(computedShoppingLocal.toFixed(2))
      ),
      customFxLocalToHome:
        useCustomFx && !sameCurrency && effectiveLocalToHomeRate > 0
          ? Number(effectiveLocalToHomeRate.toFixed(6))
          : null,
      customFxHomeCode:
        useCustomFx && !sameCurrency && effectiveLocalToHomeRate > 0
          ? homeCurrency
          : null,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-planner-modal-title"
      className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair tk-bg-card tk-elev-soft overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-paper mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* Header */}
        <div className="px-5 pt-3.5 pb-3 border-b tk-bc-hair flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 w-9 rounded-[16px] tk-bg-forest-tint tk-text-forest inline-flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2
                id="budget-planner-modal-title"
                className="font-serif text-base sm:text-lg font-extrabold tracking-tight tk-text-ink truncate"
              >
                {copy.plannerTitle}
              </h2>
              <p className="text-sm tk-text-ink2 truncate">
                {copy.plannerSubtitle(safeDays, tripCode, homeCurrency)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeAria}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Top Bar: Mode Switcher + Edit Currency Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid grid-cols-2 rounded-[16px] tk-bg-forest-plate p-1 flex-1 min-w-[240px]">
              <button
                type="button"
                onClick={() => {
                  if (planMode !== 'top_down') {
                    setTotalDraft(formatNumForInput(derivedTotalActive, activeCode));
                    setPlanMode('top_down');
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
 planMode === 'top_down'
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
              >
                {copy.modeTopDown}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (planMode !== 'bottom_up') {
                    setDailyDraft(formatNumForInput(derivedDailyActive, activeCode));
                    setPlanMode('bottom_up');
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
 planMode === 'bottom_up'
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
              >
                {copy.modeBottomUp}
              </button>
            </div>

            {!sameCurrency && (
              <div className="inline-flex items-center rounded-[16px] border tk-bc-hair tk-bg-paper p-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchEditUnit('home')}
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold font-serif tabular-nums whitespace-nowrap cursor-pointer ${
 editUnit === 'home'
 ? 'tk-bg-forest tk-text-card'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                >
                  {copy.fillInCurrency(homeCurrency)}
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchEditUnit('local')}
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold font-serif tabular-nums whitespace-nowrap cursor-pointer ${
 editUnit === 'local'
 ? 'tk-bg-forest tk-text-card'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                >
                  {copy.fillInCurrency(tripCode)}
                </button>
              </div>
            )}
          </div>

          {/* Budget Allocation Fields */}
          <div className="rounded-[20px] border tk-bc-hair tk-bg-paper p-4 space-y-3.5">
            {planMode === 'top_down' ? (
              <>
                {/* 1. Overall Trip Total Budget */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <label className="font-bold tk-text-ink">
                      {copy.step1Total(activeCode)}
                    </label>
                    {!sameCurrency && (
                      <span className="font-serif tk-text-ink2 tabular-nums">
                        ≈{' '}
                        {formatCurrencyAmount(
                          activeCode === homeCurrency ? finalTotalLocal : finalTotalHome,
                          secondaryCode,
                          { withCode: true }
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-[16px] border tk-bc-hair tk-bg-card px-3.5 py-2 focus-within:tk-bc-forest">
                    <span className="font-serif tabular-nums text-lg font-extrabold tk-text-ink">
                      {activeSym}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={totalDraft}
                      onChange={(e) => setTotalDraft(e.target.value)}
                      className="w-full bg-transparent font-serif text-xl font-extrabold tk-text-ink focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                {/* 2. Prepaid Flights / Hotels + 3. Shopping Pool */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold tk-text-ink2 mb-1">
                      {copy.step2Prepaid(activeCode)}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-2 focus-within:tk-bc-forest">
                      <span className="font-serif tabular-nums text-sm font-bold tk-text-ink2">
                        {activeSym}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={prepaidDraft}
                        onChange={(e) => setPrepaidDraft(e.target.value)}
                        className="w-full bg-transparent font-serif text-base font-bold tk-text-ink focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold tk-text-ink2 mb-1">
                      {copy.step3Shopping(activeCode)}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-2 focus-within:tk-bc-forest">
                      <span className="font-serif tabular-nums text-sm font-bold tk-text-ink2">
                        {activeSym}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={shoppingDraft}
                        onChange={(e) => setShoppingDraft(e.target.value)}
                        className="w-full bg-transparent font-serif text-base font-bold tk-text-ink focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Computed Daily Food & Transit Result */}
                <div
                  className={`rounded-[16px] border px-3.5 py-3 flex items-center justify-between gap-3 ${
 topDownOverAllocated
 ? 'tk-bc-hair tk-bg-paper'
 : 'tk-bc-hair tk-bg-forest-tint'
 }`}
                >
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold tk-text-forest">
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span>
                        {copy.autoSplitDailyHeading(safeDays)}
                      </span>
                    </div>
                    {topDownOverAllocated ? (
                      <p className="mt-0.5 text-sm tk-text-warning">
                        {copy.topDownOverError}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm tk-text-ink2 font-serif tabular-nums">
                        {copy.nativeDailyCapPrefix}
                        <strong>
                          {formatCurrencyAmount(finalDailyLocal, tripCode, {
                            fallbackSymbol: intel.currencySymbol,
                          })}
                          /{copy.perDaySuffix}
                        </strong>
                        {!sameCurrency && (
                          <>
                            {' '}
                            (≈ {formatCurrencyAmount(finalDailyHome, homeCurrency)}/
                            {copy.perDaySuffix})
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 font-serif tabular-nums">
                    <div className="font-serif text-lg font-extrabold tk-text-ink tabular-nums">
                      {formatCurrencyAmount(derivedDailyActive, activeCode, {
                        fallbackSymbol: activeSym,
                      })}
                    </div>
                    <div className="text-[13px] tk-text-ink2">
                      /{copy.perDaySuffix}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Bottom-Up Mode: Edit Daily Cap + Shopping + Prepaid -> Auto Sum Total */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-serif block text-sm font-bold tk-text-ink mb-1">
                      {copy.dailyFoodTransitLabel(safeDays)}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-2 focus-within:tk-bc-forest">
                      <span className="font-serif tabular-nums text-sm font-bold tk-text-ink">
                        {activeSym}
                      </span>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        value={dailyDraft}
                        onChange={(e) => setDailyDraft(e.target.value)}
                        className="w-full bg-transparent font-serif text-base font-extrabold tk-text-ink focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold tk-text-ink2 mb-1">
                      {copy.shoppingVatPoolLabel}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-2 focus-within:tk-bc-forest">
                      <span className="font-serif tabular-nums text-sm font-bold tk-text-ink2">
                        {activeSym}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={shoppingDraft}
                        onChange={(e) => setShoppingDraft(e.target.value)}
                        className="w-full bg-transparent font-serif text-base font-bold tk-text-ink focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold tk-text-ink2 mb-1">
                      {copy.prepaidFlightsStaysLabel}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-[16px] border tk-bc-hair tk-bg-card px-3 py-2 focus-within:tk-bc-forest">
                      <span className="font-serif tabular-nums text-sm font-bold tk-text-ink2">
                        {activeSym}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={prepaidDraft}
                        onChange={(e) => setPrepaidDraft(e.target.value)}
                        className="w-full bg-transparent font-serif text-base font-bold tk-text-ink focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Summed Overall Trip Budget */}
                <div className="rounded-[16px] border tk-bc-hair tk-bg-forest-tint px-3.5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold tk-text-forest">
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span>
                        {copy.autoSumTotalHeading}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm tk-text-ink2 font-serif tabular-nums">
                      {formatCurrencyAmount(finalTotalLocal, tripCode, {
                        withCode: true,
                      })}
                      {!sameCurrency && (
                        <>
                          {' '}
                          ≈{' '}
                          <strong>
                            {formatCurrencyAmount(finalTotalHome, homeCurrency, {
                              withCode: true,
                            })}
                          </strong>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-serif text-xl font-extrabold tk-text-ink tabular-nums">
                    {formatCurrencyAmount(derivedTotalActive, activeCode, {
                      fallbackSymbol: activeSym,
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Exchange Rate Engine & Custom Rate Lock Box */}
          <div className="rounded-[20px] border tk-bc-hair tk-bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 tk-text-forest shrink-0" />
                <span className="font-serif text-sm font-bold tk-text-ink">
                  {copy.fxHeading}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenCurrencyPicker}
                className="font-serif rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1 text-sm font-bold tk-text-ink hover:tk-bc-forest cursor-pointer"
              >
                {copy.totalsInCurrencyBtn(homeCurrency)}
              </button>
            </div>

            {sameCurrency ? (
              <p className="text-sm tk-text-ink2">
                {copy.sameCurrencyDesc(tripCode)}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] tk-bg-paper px-3 py-2.5 text-sm">
                  <div className="font-serif font-bold tk-text-ink tabular-nums">
                    1 {tripCode} ={' '}
                    <span className="tk-text-forest">
                      {effectiveLocalToHomeRate >= 100
                        ? effectiveLocalToHomeRate.toFixed(2)
                        : effectiveLocalToHomeRate.toFixed(4)}
                    </span>{' '}
                    {homeCurrency}
                    <span className="ml-2 font-sans font-semibold text-[13px] tk-text-ink2">
                      (
                      {useCustomFx
                        ? copy.fxCustomLocked
                        : autoFxInfo.source === 'live'
                        ? copy.fxLiveMidMarket
                        : copy.fxOfflineBaseline}
                      )
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={syncingLiveFx}
                      onClick={() => void handleRefreshLiveRate()}
                      className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1 text-[13px] font-semibold tk-text-ink2 hover:tk-bc-forest disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${syncingLiveFx ? 'animate-spin tk-text-forest' : ''}`}
                      />
                      <span>{copy.syncLiveBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseCustomFx((v) => !v)}
                      className={`rounded-lg px-2.5 py-1 text-[13px] font-semibold cursor-pointer ${
 useCustomFx
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bc-forest'
 }`}
                    >
                      {copy.customRateBtn}
                    </button>
                  </div>
                </div>

                {useCustomFx && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-sm font-semibold tk-text-ink2 font-serif tabular-nums">
                      1 {tripCode} =
                    </span>
                    <input
                      type="number"
                      min={0.00001}
                      step="any"
                      value={customFxDraft}
                      onChange={(e) => setCustomFxDraft(e.target.value)}
                      className="w-28 rounded-lg border tk-bc-forest tk-bg-paper px-2.5 py-1 font-serif text-base sm:text-sm font-bold tk-text-ink tabular-nums focus:outline-none"
                    />
                    <span className="text-sm font-semibold tk-text-ink2 font-serif tabular-nums">
                      {homeCurrency}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomFx(false);
                        setCustomFxDraft(
                          autoFxInfo.rate >= 100
                            ? autoFxInfo.rate.toFixed(2)
                            : autoFxInfo.rate.toFixed(4)
                        );
                      }}
                      className="font-serif inline-flex items-center gap-1 text-sm font-semibold tk-text-ink2 hover:tk-text-ink ml-auto cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{copy.resetAutoRateBtn}</span>
                    </button>
                  </div>
                )}

                {liveSyncMsg && (
                  <p className="text-[13px] font-medium tk-text-forest">{liveSyncMsg}</p>
                )}
              </>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={planMode === 'top_down' && topDownOverAllocated}
              className="w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-[20px] tk-bg-forest px-4 text-sm font-bold tk-text-card hover:tk-bg-press disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>
                {copy.submitSaveBtn}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

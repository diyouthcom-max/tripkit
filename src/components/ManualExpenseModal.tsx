import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Plus,
  ChevronDown,
  AlertCircle,
  CreditCard,
  Banknote,
  TrainFront,
  Utensils,
  ShoppingBag,
  Building2,
  FileCheck2,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import { parseVoiceExpenseFallback } from '../utils/speechHelpers';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getBudgetPackA } from '../i18n/packs/budgetPackA';
import {
  clampSharePct,
  resolveExpenseSplitDetails,
} from '../utils/splitHelpers';
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  isSameCurrency,
  isZeroDecimalCurrency,
} from '../utils/currencyHelpers';
import type {
  AppLanguage,
  BudgetState,
  ExpenseBucket,
  ExpenseRecord,
  HomeCurrencyCode,
  PaymentAccount,
  SplitMode,
  TripIntelligence,
} from '../types';

export interface DayChipMeta {
  day: number;
  cityLabel: string;
  expenseCount: number;
}

interface ManualExpenseModalProps {
  open: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialDay: number;
  totalDays: number;
  dayMetaList: DayChipMeta[];
  budget: BudgetState;
  intel: TripIntelligence;
  travelersCount: number;
  companionName: string;
  displayCompanionName: string;
  homeCurrency: HomeCurrencyCode;
  onAddExpense: (record: Omit<ExpenseRecord, 'id' | 'time'>) => void;
  onSelectDay: (day: number) => void;
  onAdjustWalletBalance: (
    account: PaymentAccount,
    mode: 'add' | 'set',
    amount: number
  ) => void;
  onLoggedFeedback?: (message: string) => void;
}

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  open,
  onClose,
  initialTitle = '',
  initialDay,
  totalDays,
  dayMetaList,
  budget,
  intel,
  travelersCount,
  companionName: _companionName,
  displayCompanionName,
  homeCurrency,
  onAddExpense,
  onSelectDay,
  onAdjustWalletBalance,
  onLoggedFeedback,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getBudgetPackA(activeLang), [activeLang]);
  const isSoloTrip = travelersCount <= 1;
  const sym = intel.currencySymbol;

  const [dayStripOpen, setDayStripOpen] = useState(false);
  const [manualDay, setManualDay] = useState(initialDay);
  const [manualTitle, setManualTitle] = useState(initialTitle);
  const [manualAmt, setManualAmt] = useState('');
  const [manualBucket, setManualBucket] = useState<ExpenseBucket>('daily');
  const [manualAccount, setManualAccount] = useState<PaymentAccount>('card');
  const [manualSplit, setManualSplit] = useState<SplitMode>(() =>
    isSoloTrip ? 'me' : 'split'
  );
  const [manualSharePct, setManualSharePct] = useState<number>(70);
  const [manualPaidBy, setManualPaidBy] = useState<'me' | 'partner'>('me');
  const [tipMode, setTipMode] = useState<'none' | 'round' | 'ten'>('none');
  const [entryCurrencyMode, setEntryCurrencyMode] = useState<'local' | 'home'>('local');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [keepAdding, setKeepAdding] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setManualDay(initialDay);
    setManualTitle(initialTitle);
    setManualAmt('');
    setManualBucket('daily');
    setManualAccount('card');
    setManualSplit(isSoloTrip ? 'me' : 'split');
    setTipMode('none');
    setEntryCurrencyMode('local');
    setDayStripOpen(false);
    setVoiceError(null);
    setSavedBanner(null);
    setSessionCount(0);

    const timer = window.setTimeout(() => {
      if (initialTitle.trim()) {
        amountInputRef.current?.focus();
      } else {
        titleInputRef.current?.focus();
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, initialDay, initialTitle, isSoloTrip]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const tripCode = (intel.currencyCode || 'EUR').trim().toUpperCase();
  const sameCurrency = isSameCurrency(tripCode, homeCurrency);
  const activeEntryCode =
    !sameCurrency && entryCurrencyMode === 'home' ? homeCurrency : tripCode;
  const activeEntrySym = getCurrencySymbol(activeEntryCode, sym);

  const rawManualAmt = Math.max(0, parseFloat(manualAmt) || 0);
  const previewFinalEntryAmt =
    tipMode === 'round'
      ? Math.ceil(rawManualAmt)
      : tipMode === 'ten'
      ? isZeroDecimalCurrency(activeEntryCode)
        ? Math.round(rawManualAmt * 1.1)
        : Number((rawManualAmt * 1.1).toFixed(2))
      : rawManualAmt;

  const previewFinalAmt = useMemo(() => {
    if (activeEntryCode === tripCode) {
      return previewFinalEntryAmt;
    }
    const converted = convertCurrencyAmount(
      previewFinalEntryAmt,
      homeCurrency,
      tripCode,
      {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }
    );
    return isZeroDecimalCurrency(tripCode)
      ? Math.round(converted)
      : Number(converted.toFixed(2));
  }, [
    activeEntryCode,
    tripCode,
    previewFinalEntryAmt,
    homeCurrency,
    intel.fxToUsd,
    budget,
  ]);

  const previewSecondaryConverted = useMemo(() => {
    if (sameCurrency || previewFinalEntryAmt <= 0) return null;
    if (activeEntryCode === tripCode) {
      const inHome = convertCurrencyAmount(previewFinalAmt, tripCode, homeCurrency, {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      });
      return formatCurrencyAmount(inHome, homeCurrency, { withCode: true });
    }
    return formatCurrencyAmount(previewFinalAmt, tripCode, {
      withCode: true,
      fallbackSymbol: sym,
    });
  }, [
    sameCurrency,
    previewFinalEntryAmt,
    activeEntryCode,
    tripCode,
    previewFinalAmt,
    homeCurrency,
    intel.fxToUsd,
    budget,
    sym,
  ]);

  const effectiveManualSplit: SplitMode = isSoloTrip ? 'me' : manualSplit;

  const previewSplitDetails = useMemo(
    () =>
      resolveExpenseSplitDetails(
        {
          amountLocal: previewFinalAmt,
          split: effectiveManualSplit,
          mySharePct: manualSharePct,
          paidBy: manualPaidBy,
        },
        displayCompanionName,
        sym,
        activeLang,
        travelersCount
      ),
    [
      previewFinalAmt,
      effectiveManualSplit,
      manualSharePct,
      manualPaidBy,
      displayCompanionName,
      sym,
      activeLang,
      travelersCount,
    ]
  );

  const insufficientWalletWarning = useMemo(() => {
    if (previewFinalAmt <= 0 || previewSplitDetails.payer !== 'me') return null;
    if (manualAccount === 'cash' && previewFinalAmt > budget.cashLocal) {
      return {
        account: 'cash' as const,
        label: copy.cashWalletLabel,
        balanceText: `${sym}${budget.cashLocal.toFixed(2)}`,
        quickTopUp: 100,
        quickTopUpLabel: copy.topUpCash(sym),
      };
    }
    if (manualAccount === 'transit' && previewFinalAmt > budget.transitPassLocal) {
      return {
        account: 'transit' as const,
        label: intel.transitPassName || t('budget.walletTransit'),
        balanceText: `${sym}${budget.transitPassLocal.toFixed(2)}`,
        quickTopUp: 20,
        quickTopUpLabel: copy.topUpPass(sym),
      };
    }
    return null;
  }, [
    previewFinalAmt,
    previewSplitDetails.payer,
    manualAccount,
    budget.cashLocal,
    budget.transitPassLocal,
    intel.transitPassName,
    sym,
    copy,
    t,
  ]);

  const quickExpenseTemplates = copy.quickTemplates;

  if (!open) return null;

  const activeDayMeta = dayMetaList.find((d) => d.day === manualDay);
  const willQualifyVat =
    manualBucket === 'shopping' &&
    previewFinalAmt > 0 &&
    previewFinalAmt >= intel.vatThresholdLocal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || previewFinalAmt <= 0) return;

    const finalAmt = previewFinalAmt;
    const safePct = clampSharePct(manualSharePct);
    const isVat = manualBucket === 'shopping' && finalAmt >= intel.vatThresholdLocal;

    const noteParts: string[] = [];
    if (activeEntryCode !== tripCode) {
      noteParts.push(
        copy.paidNote(
          formatCurrencyAmount(previewFinalEntryAmt, homeCurrency, {
            withCode: true,
          })
        )
      );
    }
    if (tipMode === 'round') {
      noteParts.push(copy.tipRoundNote);
    } else if (tipMode === 'ten') {
      noteParts.push(copy.tipTenNote);
    }

    onAddExpense({
      day: manualDay,
      title: manualTitle.trim(),
      amountLocal: finalAmt,
      bucket: manualBucket,
      account: manualAccount,
      split: effectiveManualSplit,
      mySharePct: effectiveManualSplit === 'ratio' ? safePct : undefined,
      paidBy: effectiveManualSplit === 'ratio' ? manualPaidBy : undefined,
      vatEligible: isVat,
      vatStatus: isVat ? 'pending_form' : undefined,
      note: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
    });

    if (manualDay !== initialDay) {
      onSelectDay(manualDay);
    }

    const summaryMsg = copy.loggedSummary(
      manualTitle.trim(),
      `${sym}${finalAmt.toFixed(2)}`,
      manualDay
    );

    onLoggedFeedback?.(summaryMsg);

    if (keepAdding) {
      setSessionCount((c) => c + 1);
      setSavedBanner(summaryMsg);
      setManualTitle('');
      setManualAmt('');
      setTipMode('none');
      titleInputRef.current?.focus();
    } else {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-expense-modal-title"
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair tk-bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[86vh]"
      >
        {/* Mobile Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-paper mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* 1. Minimalist Packy-Style Header with Day Switcher */}
        <div className="px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3 tk-bg-card border-b tk-bc-hair flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              id="manual-expense-modal-title"
              onClick={() => setDayStripOpen((v) => !v)}
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl px-2 -ml-2 text-base sm:text-lg font-extrabold tracking-tight tk-text-ink hover:tk-bg-paper transition-colors cursor-pointer min-w-0"
            >
              <span className="truncate">
                {copy.logExpenseTitle(manualDay, activeDayMeta?.cityLabel || '')}
              </span>
              <ChevronDown
                className={`h-4 w-4 tk-text-ink2 shrink-0 transition-transform duration-150 ${
 dayStripOpen ? 'rotate-180' : ''
 }`}
              />
            </button>

            {sessionCount > 0 && (
              <span className="text-xs font-semibold tk-text-forest tabular-nums whitespace-nowrap">
                · {copy.sessionLoggedCount(sessionCount)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-[42px] min-w-[42px] -mr-2 flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsible Day Strip */}
        {dayStripOpen && (
          <div className="px-5 py-2.5 border-b tk-bc-hair tk-bg-paper shrink-0">
            <HorizontalChipScroller
              activeKey={manualDay}
              fadeBgClassName="from-[color:var(--tk-paper)]"
              ariaLabel={copy.selectDayModalAria}
            >
              {dayMetaList.map(({ day, cityLabel }) => {
                const isSelected = day === manualDay;
                return (
                  <button
                    key={day}
                    type="button"
                    data-chip-active={isSelected ? 'true' : undefined}
                    onClick={() => {
                      setManualDay(day);
                      setDayStripOpen(false);
                    }}
                    className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 isSelected
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-card tk-text-ink hover:tk-bc-forest'
 }`}
                  >
                    <span className="font-num">D{day}</span>
                    {cityLabel && <span>{cityLabel}</span>}
                  </button>
                );
              })}
            </HorizontalChipScroller>
          </div>
        )}

        {/* 2. Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {savedBanner && (
            <div className="flex items-center justify-between gap-2 rounded-xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2 text-xs font-semibold tk-text-forest">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                {savedBanner}
              </span>
            </div>
          )}

          {voiceError && (
            <div className="flex items-center justify-between gap-2 rounded-xl border tk-bc-warning-hair tk-bg-warning-tint px-3.5 py-2 text-xs font-semibold tk-text-warning">
              <span className="inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 tk-text-warning shrink-0" />
                {voiceError}
              </span>
            </div>
          )}

          {/* Amount + Item Hero Card */}
          <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-3.5 space-y-3">
            {/* Big Amount Row with Optional Currency Toggle */}
            <div className="flex items-center justify-between gap-3 rounded-xl border tk-bc-hair tk-bg-card px-3.5 py-2.5 focus-within:tk-bc-forest">
              <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                <span className="font-num text-xl font-extrabold tk-text-ink shrink-0">
                  {activeEntrySym}
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={manualAmt}
                  onChange={(e) => setManualAmt(e.target.value)}
                  placeholder={isZeroDecimalCurrency(activeEntryCode) ? '0' : '0.00'}
                  className="w-full min-w-0 bg-transparent font-num text-2xl font-extrabold tk-text-ink placeholder:tk-text-ink2 focus:outline-none tabular-nums"
                />
              </div>

              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                {sameCurrency ? (
                  <div className="text-[11px] font-bold tk-text-ink2 uppercase font-num">
                    {tripCode}
                  </div>
                ) : (
                  <div className="inline-flex items-center rounded-lg border tk-bc-hair tk-bg-paper p-0.5">
                    <button
                      type="button"
                      onClick={() => setEntryCurrencyMode('local')}
                      className={`rounded-md px-2 py-0.5 font-num text-[11px] font-bold uppercase transition-colors cursor-pointer ${
 entryCurrencyMode === 'local'
 ? 'tk-bg-forest tk-text-card'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                    >
                      {tripCode}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryCurrencyMode('home')}
                      className={`rounded-md px-2 py-0.5 font-num text-[11px] font-bold uppercase transition-colors cursor-pointer ${
 entryCurrencyMode === 'home'
 ? 'tk-bg-forest tk-text-card'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                    >
                      {homeCurrency}
                    </button>
                  </div>
                )}

                {previewSecondaryConverted && (
                  <div className="font-num text-xs font-semibold tk-text-forest tabular-nums">
                    ≈ {previewSecondaryConverted}
                  </div>
                )}
              </div>
            </div>

            {/* Item Title + Voice Fill */}
            <div className="flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-card pl-3 pr-1.5 py-1.5 focus-within:tk-bc-forest">
              <input
                ref={titleInputRef}
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder={t('budget.itemPlaceholder')}
                className="flex-1 min-w-0 bg-transparent py-1 text-base sm:text-sm font-semibold tk-text-ink placeholder:font-normal placeholder:tk-text-ink2 focus:outline-none"
              />
              <AiVoiceInputButton
                compact
                iconOnly
                contextHint="expense"
                label={t('voice.startLabel')}
                onInterimTranscript={(live) => setManualTitle(live)}
                onTranscript={(txt) => {
                  const parsed = parseVoiceExpenseFallback(txt, {
                    currentDay: manualDay,
                    totalDays,
                    vatThresholdLocal: intel.vatThresholdLocal,
                    companionName: displayCompanionName,
                    lang: activeLang,
                  });
                  if (parsed) {
                    setManualTitle(parsed.title);
                    if (parsed.amountLocal > 0) {
                      setManualAmt(parsed.amountLocal.toFixed(2));
                    }
                    setManualBucket(parsed.bucket);
                    setManualAccount(parsed.account);
                    setManualSplit(isSoloTrip ? 'me' : parsed.split);
                    if (parsed.day) setManualDay(parsed.day);
                    if (
                      !isSoloTrip &&
                      parsed.split === 'ratio' &&
                      parsed.mySharePct !== undefined
                    ) {
                      setManualSharePct(parsed.mySharePct);
                    }
                  } else {
                    setManualTitle(txt);
                  }
                }}
                onError={(msg) => setVoiceError(msg || null)}
              />
            </div>

            {/* 1-Tap Quick Expense Templates */}
            <HorizontalChipScroller fadeBgClassName="from-[color:var(--tk-paper)]">
              {quickExpenseTemplates.map((tpl) => {
                const isSelected = manualTitle === tpl.title;
                return (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => {
                      setManualTitle(tpl.title);
                      setManualBucket(tpl.bucket);
                      if (!manualAmt) amountInputRef.current?.focus();
                    }}
                    className={`h-7 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isSelected
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bc-forest'
 }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </HorizontalChipScroller>
          </div>

          {/* Bucket + Account Pills */}
          <div className="space-y-3">
            {/* 1. Expense Bucket */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold tk-text-ink2">
                  {copy.categoryLabel}
                </span>
                {willQualifyVat && (
                  <span className="inline-flex items-center gap-1 rounded-full tk-bg-forest-tint px-2 py-0.5 text-[11px] font-bold tk-text-forest">
                    <FileCheck2 className="h-3 w-3 shrink-0" />
                    {copy.autoVatBadge}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {
                      id: 'daily' as ExpenseBucket,
                      icon: Utensils,
                      label: copy.bucketDaily,
                    },
                    {
                      id: 'shopping' as ExpenseBucket,
                      icon: ShoppingBag,
                      label: copy.bucketShopping,
                    },
                    {
                      id: 'prepaid' as ExpenseBucket,
                      icon: Building2,
                      label: copy.bucketTransitStay,
                    },
                  ] as const
                ).map((b) => {
                  const Icon = b.icon;
                  const active = manualBucket === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setManualBucket(b.id)}
                      className={`h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-card'
 }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Payment Account */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold tk-text-ink2">
                {copy.paymentMethodLabel}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {
                      id: 'card' as PaymentAccount,
                      icon: CreditCard,
                      label: t('budget.walletCard'),
                    },
                    {
                      id: 'cash' as PaymentAccount,
                      icon: Banknote,
                      label: t('budget.walletCash'),
                    },
                    {
                      id: 'transit' as PaymentAccount,
                      icon: TrainFront,
                      label: t('budget.walletTransit'),
                    },
                  ] as const
                ).map((acc) => {
                  const Icon = acc.icon;
                  const active = manualAccount === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setManualAccount(acc.id)}
                      className={`h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-card'
 }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Insufficient Wallet Balance Prompt */}
            {insufficientWalletWarning && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border tk-bc-warning-hair tk-bg-warning-tint px-3.5 py-2.5 text-xs tk-text-warning">
                <span className="inline-flex items-center gap-1.5 font-num tabular-nums">
                  <AlertCircle className="h-3.5 w-3.5 tk-text-warning shrink-0" />
                  <span>
                    {copy.insufficientBalance(
                      insufficientWalletWarning.label,
                      insufficientWalletWarning.balanceText
                    )}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualAccount('card')}
                    className="rounded-lg tk-bg-card border tk-bc-hair px-2.5 py-1 font-semibold tk-text-ink2 hover:tk-bg-paper whitespace-nowrap cursor-pointer"
                  >
                    {copy.useCard}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onAdjustWalletBalance(
                        insufficientWalletWarning.account,
                        'add',
                        insufficientWalletWarning.quickTopUp
                      )
                    }
                    className="rounded-lg tk-bg-forest px-2.5 py-1 font-semibold tk-text-card hover:tk-bg-press whitespace-nowrap cursor-pointer"
                  >
                    {insufficientWalletWarning.quickTopUpLabel}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Companion Split Mode (when traveling with companion) */}
            {!isSoloTrip && (
              <div className="space-y-2">
                <span className="block text-xs font-bold tk-text-ink2">
                  {copy.splitWithCompanionLabel}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      {
                        id: 'me' as SplitMode,
                        label: copy.allMineShort,
                      },
                      {
                        id: 'split' as SplitMode,
                        label:
                          travelersCount > 2
                            ? copy.splitMultiChip(travelersCount)
                            : copy.split50Chip,
                      },
                      {
                        id: 'partner' as SplitMode,
                        label: copy.partnerPaidShort(displayCompanionName),
                      },
                      {
                        id: 'ratio' as SplitMode,
                        label: copy.customPctBtn,
                      },
                    ] as const
                  ).map((sp) => {
                    const active = effectiveManualSplit === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setManualSplit(sp.id)}
                        className={`h-9 rounded-xl border px-2 text-xs font-bold whitespace-nowrap truncate transition-colors cursor-pointer ${
 active
 ? 'tk-bc-hair tk-bg-paper tk-text-ink2'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-card'
 }`}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>

                {effectiveManualSplit === 'ratio' && (
                  <div className="rounded-xl border tk-bc-hair tk-bg-paper p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1 rounded-lg tk-bg-paper p-0.5">
                        <button
                          type="button"
                          onClick={() => setManualPaidBy('me')}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 manualPaidBy === 'me'
 ? 'tk-bg-card tk-text-ink shadow-2xs'
 : 'tk-text-ink2'
 }`}
                        >
                          {copy.iPaid}
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualPaidBy('partner')}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 manualPaidBy === 'partner'
 ? 'tk-bg-card tk-text-ink shadow-2xs'
 : 'tk-text-ink2'
 }`}
                        >
                          {copy.partnerPaidBtn(displayCompanionName)}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {(
                          [
                            { label: '70:30', pct: 70 },
                            { label: '60:40', pct: 60 },
                            { label: '40:60', pct: 40 },
                            { label: copy.zeroHundredPreset, pct: 0 },
                          ] as const
                        ).map((preset) => (
                          <button
                            key={preset.pct}
                            type="button"
                            onClick={() => setManualSharePct(preset.pct)}
                            className={`rounded-lg px-2 py-0.5 font-num text-xs font-semibold whitespace-nowrap cursor-pointer ${
 manualSharePct === preset.pct
 ? 'tk-bg-forest tk-text-card'
 : 'tk-bg-card border tk-bc-hair tk-text-ink2'
 }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold tk-text-ink2 whitespace-nowrap shrink-0">
                        {copy.myShareLabel}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={manualSharePct}
                        onChange={(e) =>
                          setManualSharePct(clampSharePct(Number(e.target.value)))
                        }
                        className="flex-1 tk-accent-forest cursor-pointer"
                      />
                      <span className="font-num text-xs font-bold tk-text-ink tabular-nums whitespace-nowrap">
                        {clampSharePct(manualSharePct)}% : {100 - clampSharePct(manualSharePct)}%
                      </span>
                    </div>

                    {previewFinalAmt > 0 && (
                      <div className="text-xs tk-text-forest font-semibold font-num tabular-nums">
                        {copy.ratioBreakdownLine(
                          sym,
                          previewSplitDetails.myAmountLocal.toFixed(2),
                          displayCompanionName,
                          previewSplitDetails.partnerAmountLocal.toFixed(2)
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. Tip Quick Option + Keep Adding Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="inline-flex items-center gap-1 rounded-xl tk-bg-forest-plate p-1">
                {(['none', 'round', 'ten'] as const).map((tipOpt) => (
                  <button
                    key={tipOpt}
                    type="button"
                    onClick={() => setTipMode(tipOpt)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 tipMode === tipOpt
 ? 'tk-bg-card tk-text-ink shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {tipOpt === 'none'
                      ? copy.noTip
                      : tipOpt === 'round'
                      ? copy.roundUp
                      : copy.plusTenTip}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold tk-text-ink2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepAdding}
                  onChange={(e) => setKeepAdding(e.target.checked)}
                  className="h-3.5 w-3.5 rounded tk-accent-forest"
                />
                <span>{copy.logAnother}</span>
              </label>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!manualTitle.trim() || rawManualAmt <= 0}
              className="w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-2xl tk-bg-forest px-4 text-sm font-bold tk-text-card hover:tk-bg-press disabled:opacity-40 transition-colors font-num tabular-nums cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>
                {previewFinalAmt > 0
                  ? activeEntryCode !== tripCode
                    ? copy.saveConverted(
                        formatCurrencyAmount(previewFinalEntryAmt, homeCurrency),
                        sym,
                        previewFinalAmt.toFixed(2)
                      )
                    : copy.saveWithAmt(sym, previewFinalAmt.toFixed(2))
                  : copy.saveDefault}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

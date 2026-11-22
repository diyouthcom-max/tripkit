import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  Plus,
  Receipt,
  CreditCard,
  Loader2,
  TrendingUp,
  Check,
  ChevronDown,
  AlertCircle,
  Users,
  ArrowRightLeft,
  History,
  CheckCircle2,
  LayoutGrid,
  Wallet,
  Banknote,
  TrainFront,
  SlidersHorizontal,
  MailCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { tkColor } from '../utils/tkColor';
import { useTranslation } from 'react-i18next';
import {
  translateDemoExpenseTitle,
  translateIntelField,
  translateMemberName,
} from '../i18n';
import { getBudgetPackB, type BudgetPackB } from '../i18n/packs/budgetPackB';
import {
  getTravelerWalletCopy,
  resolveDestinationVatMeta,
} from '../i18n/packs/travelerWalletPack';
import { translatePopularCity } from '../i18n/packs/tripSetupWizardPack';
import type {
  AppLanguage,
  BudgetState,
  ExpenseBucket,
  ExpenseRecord,
  HomeCurrencyCode,
  PaymentAccount,
  SettlementRecord,
  SplitMode,
  TimelineNode,
  TripIntelligence,
  VatDocStatus,
} from '../types';
import {
  formatHomeCurrencyEquivalent,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  isSameCurrency,
  isZeroDecimalCurrency,
  refreshLiveUsdRates,
  resolveExchangeRate,
} from '../utils/currencyHelpers';
import { getCityForDay } from '../utils/itineraryHelpers';
import {
  clampSharePct,
  computeDynamicRolloverLocal,
  computeGrossDailySpendForDay,
  computeMyDailySpendForDay,
  getVatStatusLabel,
  resolveExpenseSplitDetails,
} from '../utils/splitHelpers';
import { parseVoiceExpenseFallback } from '../utils/speechHelpers';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import {
  BudgetPlannerModal,
  type BudgetLimitsUpdatePayload,
} from './BudgetPlannerModal';
import { CurrencyPickerModal } from './CurrencyPickerModal';
import { ExpenseLedgerRow } from './ExpenseLedgerRow';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { ManualExpenseModal } from './ManualExpenseModal';
import {
  AccentIconBadge,
  resolveExpenseIconMeta,
} from '../utils/accentTheme';

interface BudgetViewProps {
  budget: BudgetState;
  expenses: ExpenseRecord[];
  intel: TripIntelligence;
  totalDays: number;
  activeDay: number;
  cities?: string[];
  cityDays?: number[];
  timeline?: TimelineNode[];
  travelersCount?: number;
  companionName?: string;
  homeCurrency?: HomeCurrencyCode;
  settlementHistory?: SettlementRecord[];
  onSelectDay: (day: number) => void;
  onAddExpense: (record: Omit<ExpenseRecord, 'id' | 'time'>) => void;
  onUpdateExpense: (expenseId: string, updates: Omit<ExpenseRecord, 'id' | 'time'>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onCycleVatStatus: (expenseId: string) => void;
  onConvertExpenseToSplit: (expenseId: string, mySharePct?: number) => void;
  onSettleUp: () => void;
  onUpdateBudgetLimits: (updates: BudgetLimitsUpdatePayload) => void;
  onUpdateHomeCurrency?: (code: HomeCurrencyCode) => void;
  onAdjustWalletBalance: (
    account: PaymentAccount,
    mode: 'add' | 'set',
    amount: number
  ) => void;
  onAiParseExpense: (payload: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
  }) => Promise<Omit<ExpenseRecord, 'id' | 'time'> | null>;
  onOpenAiAssistant: (initialPrompt?: string) => void;
}

interface DayChartDatum {
  dayNum: number;
  dayLabel: string;
  dailySpent: number;
  grossDailySpent: number;
  shoppingSpent: number;
  trendTotal: number;
  limit: number;
  diff: number;
  isToday: boolean;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: DayChartDatum }>;
  sym: string;
  includeShopping: boolean;
  copy: BudgetPackB;
}

const DailyTrendTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  sym,
  includeShopping,
  copy,
}) => {
  if (!active || !payload || !payload.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  const overBudget = datum.dailySpent > datum.limit;
  const hasSharedDiff = Math.abs(datum.grossDailySpent - datum.dailySpent) > 0.01;

  return (
    <div className="rounded-xl border tk-bc-hair tk-bg-card px-3.5 py-2.5 shadow-lg text-xs space-y-1.5">
      <div className="font-bold tk-text-ink">
        {copy.dayHeading(datum.dayNum, datum.isToday)}
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="tk-text-ink2">
          {copy.dailyMyShare}
        </span>
        <span
          className={`font-num font-bold tabular-nums ${
 overBudget ? 'tk-text-danger' : 'tk-text-forest'
 }`}
        >
          {sym}
          {datum.dailySpent.toFixed(2)}
        </span>
      </div>
      {hasSharedDiff && (
        <div className="flex items-center justify-between gap-5 tk-text-ink2">
          <span>{copy.wholeBillTotal}</span>
          <span className="font-num tabular-nums">
            {sym}
            {datum.grossDailySpent.toFixed(2)}
          </span>
        </div>
      )}
      {includeShopping && (
        <div className="flex items-center justify-between gap-5">
          <span className="tk-text-ink2">{copy.shoppingLabel}</span>
          <span className="font-num font-bold tk-text-ink2 tabular-nums">
            {sym}
            {datum.shoppingSpent.toFixed(2)}
          </span>
        </div>
      )}
      <div className="pt-1 border-t tk-bc-hair flex items-center justify-between gap-5">
        <span className="tk-text-ink2">
          {copy.vsLimit(sym, datum.limit.toFixed(0))}
        </span>
        <span
          className={`font-num font-bold tabular-nums ${
 overBudget ? 'tk-text-danger' : 'tk-text-forest'
 }`}
        >
          {datum.diff >= 0
            ? `${copy.savedPrefix}${sym}${datum.diff.toFixed(2)}`
            : `${copy.overPrefix}${sym}${Math.abs(datum.diff).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
};

export const BudgetView: React.FC<BudgetViewProps> = ({
  budget,
  expenses,
  intel,
  totalDays,
  activeDay,
  cities = [],
  cityDays,
  timeline = [],
  travelersCount = 2,
  companionName = 'Emma',
  homeCurrency = 'CNY',
  settlementHistory = [],
  onSelectDay,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCycleVatStatus,
  onConvertExpenseToSplit,
  onSettleUp,
  onUpdateBudgetLimits,
  onUpdateHomeCurrency,
  onAdjustWalletBalance,
  onAiParseExpense,
  onOpenAiAssistant,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getBudgetPackB(activeLang), [activeLang]);
  const walletCopy = useMemo(() => getTravelerWalletCopy(activeLang), [activeLang]);
  const displayCompanionName =
    translateMemberName(companionName, activeLang) || copy.companionFallback;
  const safeDaysCount = Math.max(1, totalDays);
  const currentDay = Math.min(safeDaysCount, Math.max(1, activeDay));

  // Sub-view switcher: 'overview' (Budget & Ledger) vs 'split' (Companion Split & Settlement)
  const [financeView, setFinanceView] = useState<'overview' | 'split'>('overview');
  const [ratioOpenId, setRatioOpenId] = useState<string | null>(null);
  const [customPct, setCustomPct] = useState<number>(70);

  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);
  const [voiceExpenseText, setVoiceExpenseText] = useState('');
  const [isParsingVoiceExpense, setIsParsingVoiceExpense] = useState(false);
  const [voiceExpenseError, setVoiceExpenseError] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualPrefillTitle, setManualPrefillTitle] = useState('');

  // Standalone Currency Picker & Overall Trip Budget Planner Modals
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [budgetPlannerOpen, setBudgetPlannerOpen] = useState(false);
  const [budgetPlannerFocus, setBudgetPlannerFocus] = useState<
    'overall' | 'daily' | 'shopping'
  >('overall');
  const [fxSyncTick, setFxSyncTick] = useState(0);

  // Wallet Calibration Editor
  const [editingWallet, setEditingWallet] = useState<PaymentAccount | null>(null);
  const [walletExactDraft, setWalletExactDraft] = useState('');

  // Chart & Multi-dimensional Ledger Filters
  const [chartIncludeShopping, setChartIncludeShopping] = useState(false);
  const [ledgerDayFilter, setLedgerDayFilter] = useState<'all' | number>('all');
  const [ledgerBucketFilter, setLedgerBucketFilter] = useState<
    'all' | 'daily' | 'shopping' | 'vat'
  >('all');
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState<'all' | PaymentAccount>('all');

  // Ledger Row Editing & Swipe State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [swipedExpenseId, setSwipedExpenseId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const dayMetaList = useMemo(
    () =>
      Array.from({ length: safeDaysCount }, (_, idx) => {
        const d = idx + 1;
        const nodesForD = timeline.filter((n) => (n.day ?? 1) === d);
        const cityLabel =
          cities.length > 0 || nodesForD.length > 0
            ? getCityForDay(cities, d, safeDaysCount, nodesForD, activeLang, cityDays)
            : '';
        const expenseCount = expenses.filter((e) => (e.day ?? 1) === d).length;
        return { day: d, cityLabel, expenseCount };
      }),
    [safeDaysCount, timeline, cities, activeLang, expenses, cityDays]
  );

  useEffect(() => {
    setLedgerDayFilter((prev) => (prev === 'all' ? 'all' : currentDay));
  }, [currentDay]);

  useEffect(() => {
    let active = true;
    void refreshLiveUsdRates(false).then(() => {
      if (active) setFxSyncTick((n) => n + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  const sym = intel.currencySymbol;
  const tripCode = (intel.currencyCode || 'EUR').trim().toUpperCase();
  const sameCurrency = isSameCurrency(tripCode, homeCurrency);
  const homeSym = getCurrencySymbol(homeCurrency);

  const fxSummary = useMemo(
    () =>
      resolveExchangeRate({
        fromCode: tripCode,
        toCode: homeCurrency,
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripCode, homeCurrency, intel.fxToUsd, budget, fxSyncTick]
  );


  // 1. Personal-Share Daily Spend & Dynamic Rollover
  const myDailySpent = useMemo(
    () => computeMyDailySpendForDay(expenses, currentDay, 1, travelersCount),
    [expenses, currentDay, travelersCount]
  );
  const grossDailySpent = useMemo(
    () => computeGrossDailySpendForDay(expenses, currentDay, 1),
    [expenses, currentDay]
  );
  const dynamicRollover = useMemo(
    () =>
      computeDynamicRolloverLocal(
        expenses,
        budget.dailyBudgetLocal,
        currentDay,
        travelersCount
      ),
    [expenses, budget.dailyBudgetLocal, currentDay, travelersCount]
  );

  const dailyAvailable = Number((budget.dailyBudgetLocal + dynamicRollover).toFixed(2));
  const dailyBalance = Number((dailyAvailable - myDailySpent).toFixed(2));
  const isDailyOver = dailyBalance < -0.005;
  const dailyPct =
    dailyAvailable > 0
      ? Math.min(100, Math.max(0, Math.round((myDailySpent / dailyAvailable) * 100)))
      : myDailySpent > 0
      ? 100
      : 0;

  // Dynamic Destination VAT Program & Eligibility
  const vatMeta = useMemo(
    () =>
      resolveDestinationVatMeta({
        currencyCode: tripCode,
        vatThresholdLocal: intel.vatThresholdLocal,
        vatRefundRate: budget.vatRefundRate,
        vatExitAirport: intel.vatExitAirport,
        cities,
        lang: activeLang,
      }),
    [
      tripCode,
      intel.vatThresholdLocal,
      budget.vatRefundRate,
      intel.vatExitAirport,
      cities,
      activeLang,
    ]
  );

  // 2. Shopping & VAT Pool + Sub-threshold Gap Hint
  const shoppingExpenses = useMemo(
    () => expenses.filter((e) => e.bucket === 'shopping'),
    [expenses]
  );
  const shoppingSpent = useMemo(
    () => shoppingExpenses.reduce((s, e) => s + e.amountLocal, 0),
    [shoppingExpenses]
  );
  const vatEligibleItems = useMemo(
    () =>
      shoppingExpenses.filter(
        (e) =>
          e.vatEligible ||
          (vatMeta.supportsVat &&
            intel.vatThresholdLocal > 0 &&
            e.amountLocal >= intel.vatThresholdLocal)
      ),
    [shoppingExpenses, intel.vatThresholdLocal, vatMeta.supportsVat]
  );
  const subThresholdShoppingItem = useMemo(() => {
    if (!vatMeta.supportsVat || intel.vatThresholdLocal <= 0) return null;
    const candidates = shoppingExpenses
      .filter((e) => !e.vatEligible && e.amountLocal > 0 && e.amountLocal < intel.vatThresholdLocal)
      .sort((a, b) => b.amountLocal - a.amountLocal);
    return candidates[0] || null;
  }, [shoppingExpenses, intel.vatThresholdLocal, vatMeta.supportsVat]);

  const vatEligibleTotal = vatEligibleItems.reduce((s, e) => s + e.amountLocal, 0);
  const estVatRefund = vatEligibleTotal * budget.vatRefundRate;
  const showVatSummaryCard =
    vatMeta.supportsVat || vatEligibleItems.length > 0 || shoppingExpenses.length > 0;

  // Overall Trip Budget, Fixed Prepaid Sunk Cost & Real Card Charged Total
  const prepaidHome = useMemo(
    () =>
      convertCurrencyAmount(budget.prepaidUsd, 'USD', homeCurrency, {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budget.prepaidUsd, homeCurrency, tripCode, intel.fxToUsd, budget, fxSyncTick]
  );
  const cardBalanceHome = useMemo(
    () =>
      convertCurrencyAmount(budget.cardUsd, 'USD', homeCurrency, {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budget.cardUsd, homeCurrency, tripCode, intel.fxToUsd, budget, fxSyncTick]
  );

  // Real cumulative credit card spend (matches real traveler mental model: "Card charged")
  const cardChargedLocal = useMemo(
    () =>
      expenses
        .filter((e) => e.account === 'card')
        .reduce((sum, e) => sum + e.amountLocal, 0),
    [expenses]
  );
  const cardChargedHome = useMemo(
    () =>
      convertCurrencyAmount(cardChargedLocal, tripCode, homeCurrency, {
        intelFxToUsd: intel.fxToUsd,
        tripCurrencyCode: tripCode,
        budgetFx: budget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardChargedLocal, tripCode, homeCurrency, intel.fxToUsd, budget, fxSyncTick]
  );

  const routeBoardTitle = useMemo(() => {
    if (cities.length > 0) {
      const routeText = cities.map((c) => translatePopularCity(c, activeLang)).join(' → ');
      return `${routeText} · ${safeDaysCount}d ${walletCopy.boardTitleSuffix}`;
    }
    return walletCopy.boardFallbackTitle(safeDaysCount);
  }, [cities, activeLang, safeDaysCount, walletCopy]);

  const cardQuickTopUpPresets = useMemo(
    () => (isZeroDecimalCurrency(homeCurrency) ? [20000, 50000, 100000] : [200, 500, 1000]),
    [homeCurrency]
  );

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - dailyPct / 100);

  // 3. Recharts Daily Trend Dataset (using personal daily share)
  const chartData: DayChartDatum[] = useMemo(() => {
    return Array.from({ length: safeDaysCount }, (_, i) => {
      const dayNum = i + 1;
      const dSpent = computeMyDailySpendForDay(expenses, dayNum, 1, travelersCount);
      const gSpent = computeGrossDailySpendForDay(expenses, dayNum, 1);
      const sSpent = Number(
        expenses
          .filter((e) => e.bucket === 'shopping' && (e.day ?? 1) === dayNum)
          .reduce((s, e) => s + e.amountLocal, 0)
          .toFixed(2)
      );
      const trendTotal = Number((chartIncludeShopping ? dSpent + sSpent : dSpent).toFixed(2));
      return {
        dayNum,
        dayLabel: dayNum === currentDay ? copy.dayNowLabel(dayNum) : `D${dayNum}`,
        dailySpent: dSpent,
        grossDailySpent: gSpent,
        shoppingSpent: sSpent,
        trendTotal,
        limit: budget.dailyBudgetLocal,
        diff: Number((budget.dailyBudgetLocal - dSpent).toFixed(2)),
        isToday: dayNum === currentDay,
      };
    });
  }, [
    expenses,
    safeDaysCount,
    currentDay,
    budget.dailyBudgetLocal,
    chartIncludeShopping,
    copy,
    travelersCount,
  ]);

  const activeDays = chartData.filter((d) => d.dailySpent > 0 || d.dayNum <= currentDay);
  const avgDailyBurn =
    activeDays.length > 0
      ? activeDays.reduce((s, d) => s + d.dailySpent, 0) / activeDays.length
      : 0;
  const overBudgetDays = chartData.filter((d) => d.dailySpent > d.limit).length;
  const cumulativeDiff = activeDays.reduce((s, d) => s + d.diff, 0);

  const yAxisMax = useMemo(() => {
    const peak = Math.max(
      budget.dailyBudgetLocal * 1.25,
      ...chartData.map((d) => d.trendTotal * 1.15)
    );
    return Math.max(40, Math.ceil(peak / 20) * 20);
  }, [budget.dailyBudgetLocal, chartData]);

  // 4. Multi-dimensional Ledger Filtering & Live Summary
  const visibleLedger = useMemo(() => {
    return expenses.filter((e) => {
      if (ledgerDayFilter !== 'all' && (e.day ?? 1) !== ledgerDayFilter) return false;
      if (ledgerBucketFilter === 'daily' && e.bucket !== 'daily') return false;
      if (ledgerBucketFilter === 'shopping' && e.bucket !== 'shopping') return false;
      if (
        ledgerBucketFilter === 'vat' &&
        !(e.vatEligible || (e.bucket === 'shopping' && e.amountLocal >= intel.vatThresholdLocal))
      ) {
        return false;
      }
      if (ledgerAccountFilter !== 'all' && e.account !== ledgerAccountFilter) return false;
      return true;
    });
  }, [
    expenses,
    ledgerDayFilter,
    ledgerBucketFilter,
    ledgerAccountFilter,
    intel.vatThresholdLocal,
  ]);

  const visibleGrossSum = useMemo(
    () => visibleLedger.reduce((s, e) => s + e.amountLocal, 0),
    [visibleLedger]
  );
  const visibleMyShareSum = useMemo(
    () =>
      visibleLedger.reduce(
        (s, e) =>
          s +
          resolveExpenseSplitDetails(
            e,
            displayCompanionName,
            sym,
            activeLang,
            travelersCount
          ).myAmountLocal,
        0
      ),
    [visibleLedger, displayCompanionName, sym, activeLang, travelersCount]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingReceipt(true);
    setReceiptFeedback(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const parsed = await onAiParseExpense({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
      });
      if (parsed) {
        onAddExpense({ ...parsed, day: currentDay });
        setReceiptFeedback(
          copy.receiptLoggedFeedback(
            parsed.title,
            `${sym}${parsed.amountLocal.toFixed(2)}`,
            currentDay,
            parsed.bucket === 'shopping'
          )
        );
      }
    } finally {
      setIsParsingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitVoiceOrTextExpense = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isParsingVoiceExpense) return;
    setIsParsingVoiceExpense(true);
    setVoiceExpenseError(null);
    setReceiptFeedback(null);

    try {
      let parsed = await onAiParseExpense({ text: trimmed });
      if (!parsed || parsed.amountLocal <= 0) {
        parsed = parseVoiceExpenseFallback(trimmed, {
          currentDay,
          totalDays: safeDaysCount,
          vatThresholdLocal: intel.vatThresholdLocal,
          companionName: displayCompanionName,
          lang: activeLang,
        });
      }

      if (parsed && parsed.amountLocal > 0) {
        const targetDay = parsed.day ?? currentDay;
        const isVat =
          Boolean(parsed.vatEligible) ||
          (parsed.bucket === 'shopping' && parsed.amountLocal >= intel.vatThresholdLocal);
        onAddExpense({
          ...parsed,
          day: targetDay,
          vatEligible: isVat,
          vatStatus: isVat ? 'pending_form' : undefined,
        });
        if (targetDay !== currentDay) {
          onSelectDay(targetDay);
        }
        setVoiceExpenseText('');
        setReceiptFeedback(
          copy.voiceLoggedFeedback(
            parsed.title,
            `${sym}${parsed.amountLocal.toFixed(2)}`,
            targetDay
          )
        );
      } else {
        // Spoken item had no recognizable amount — open standalone modal prefilled with title
        setManualPrefillTitle(trimmed);
        setManualModalOpen(true);
        setVoiceExpenseText('');
      }
    } catch (err) {
      setVoiceExpenseError(
        err instanceof Error ? err.message : copy.voiceParseFailed
      );
    } finally {
      setIsParsingVoiceExpense(false);
    }
  };

  const handleVoiceExpenseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitVoiceOrTextExpense(voiceExpenseText);
  };

  const openWalletEditor = (acct: PaymentAccount) => {
    if (editingWallet === acct) {
      setEditingWallet(null);
      return;
    }
    const currentVal =
      acct === 'cash'
        ? budget.cashLocal
        : acct === 'transit'
        ? budget.transitPassLocal
        : cardBalanceHome;
    setWalletExactDraft(
      acct === 'card' && isZeroDecimalCurrency(homeCurrency)
        ? String(Math.round(currentVal))
        : currentVal.toFixed(2)
    );
    setEditingWallet(acct);
  };

  const sharedExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => e.split === 'split' || e.split === 'ratio' || e.split === 'partner'
      ),
    [expenses]
  );
  const unsettledCount = useMemo(
    () => sharedExpenses.filter((e) => !e.settled).length,
    [sharedExpenses]
  );
  const settledCount = useMemo(
    () => sharedExpenses.filter((e) => e.settled).length,
    [sharedExpenses]
  );
  const mePaidExpenses = useMemo(
    () => expenses.filter((e) => e.split === 'me'),
    [expenses]
  );
  const owed = budget.partnerOwedLocal;
  const showSplitSwitcher =
    travelersCount > 1 || sharedExpenses.length > 0 || settlementHistory.length > 0;

  const renderQuickAccountingBar = () => (
    <section className="rounded-2xl border tk-bc-hair tk-bg-card px-3.5 py-2.5 shadow-2xs space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <form
          onSubmit={handleVoiceExpenseFormSubmit}
          className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper pl-3 pr-1.5 py-1 focus-within:tk-bc-forest focus-within:tk-bg-card transition-colors"
        >
          <AccentIconBadge accent="lavender" icon={Receipt} size="xs" ring={false} />
          <input
            type="text"
            value={voiceExpenseText}
            onChange={(e) => setVoiceExpenseText(e.target.value)}
            placeholder={t('budget.voiceBarPlaceholder')}
            className="flex-1 min-w-0 bg-transparent py-1 text-xs sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:outline-none"
          />
          <AiVoiceInputButton
            iconOnly
            compact
            contextHint="expense"
            disabled={isParsingVoiceExpense}
            label={t('voice.startLabel')}
            onInterimTranscript={(live) => setVoiceExpenseText(live)}
            onTranscript={async (transcript) => {
              setVoiceExpenseText(transcript);
              await submitVoiceOrTextExpense(transcript);
            }}
            onError={(msg) => setVoiceExpenseError(msg || null)}
          />
          {(voiceExpenseText.trim().length > 0 || isParsingVoiceExpense) && (
            <button
              type="submit"
              disabled={isParsingVoiceExpense || !voiceExpenseText.trim()}
              className="h-8 inline-flex items-center justify-center gap-1 rounded-lg tk-bg-forest px-3 text-xs font-bold tk-text-card hover:tk-bg-press disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isParsingVoiceExpense ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isParsingVoiceExpense ? t('budget.voiceParsing') : t('budget.voiceAddSubmit')}
            </button>
          )}
        </form>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isParsingReceipt}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-card px-3 text-xs font-semibold tk-text-ink hover:tk-bc-forest disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isParsingReceipt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin tk-text-forest shrink-0" />
              ) : (
                <Camera className="h-3.5 w-3.5 tk-text-forest shrink-0" />
              )}
              {isParsingReceipt ? t('budget.parsingReceipt') : t('budget.snapReceipt')}
            </button>

            <button
              type="button"
              onClick={() => {
                setManualPrefillTitle('');
                setManualModalOpen(true);
              }}
              className="h-9 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl tk-bg-forest px-3.5 text-xs font-bold tk-text-card hover:tk-bg-press transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>{t('budget.manualEntry')}</span>
            </button>
          </div>
        </div>
      </div>

      {voiceExpenseError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border tk-bc-warning-hair tk-bg-warning-tint px-3.5 py-2 text-xs font-semibold tk-text-warning">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 tk-text-warning shrink-0" />
            {voiceExpenseError}
          </span>
          <button
            type="button"
            onClick={() => setVoiceExpenseError(null)}
            className="tk-text-ink2 hover:underline cursor-pointer"
          >
            {t('budget.collapse')}
          </button>
        </div>
      )}

      {receiptFeedback && (
        <div className="flex items-center justify-between gap-2 rounded-xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2 text-xs font-semibold tk-text-forest">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0" />
            {receiptFeedback}
          </span>
          <button
            type="button"
            onClick={() => setReceiptFeedback(null)}
            className="tk-text-ink2 hover:tk-text-ink cursor-pointer"
          >
            {t('budget.collapse')}
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Sub-View Switcher (Only When Multi-Traveler / Shared Split Active) */}
      {showSplitSwitcher && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 rounded-xl tk-bg-paper p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFinanceView('overview')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
 financeView === 'overview'
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              {t('budget.overviewTab')}
            </button>
            <button
              type="button"
              onClick={() => setFinanceView('split')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
 financeView === 'split'
 ? 'tk-bg-card tk-text-ink2 shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              <Users className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
              <span>{t('budget.splitTab')}</span>
              <span
                className={`font-num text-[11px] tabular-nums ${
 owed > 0.01
 ? 'tk-text-forest font-bold'
 : owed < -0.01
 ? 'tk-text-ink2 font-bold'
 : 'tk-text-ink2'
 }`}
              >
                {owed > 0.01
                  ? `+${sym}${Math.round(owed)}`
                  : owed < -0.01
                  ? `-${sym}${Math.round(Math.abs(owed))}`
                  : '✓'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenAiAssistant(voiceExpenseText || undefined)}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{t('budget.openCopilotLink')} →</span>
          </button>
        </div>
      )}

      {financeView === 'split' ? (
        <div className="space-y-4">
          {renderQuickAccountingBar()}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: One-Sentence Net Settlement & Settlement History */}
          <div className="lg:col-span-5 space-y-5">
            <section className="rounded-2xl tk-bg-forest p-6 tk-text-card">
              <p className="text-xs font-semibold opacity-85">
                {copy.splitHeroSubtitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-num text-2xl sm:text-3xl font-bold tabular-nums">
                    {owed > 0.01
                      ? copy.companionOwesYou(displayCompanionName, `${sym}${owed.toFixed(2)}`)
                      : owed < -0.01
                      ? copy.youOweCompanion(displayCompanionName, `${sym}${Math.abs(owed).toFixed(2)}`)
                      : copy.allSettledUp}
                  </div>
                  <p className="mt-1 font-num text-xs opacity-85 tabular-nums">
                    {!sameCurrency && (
                      <>
                        ≈{' '}
                        {formatHomeCurrencyEquivalent(
                          Math.abs(owed),
                          intel.currencyCode,
                          intel.fxToUsd,
                          homeCurrency,
                          budget
                        )}{' '}
                        ·{' '}
                      </>
                    )}
                    {copy.unsettledCountText(unsettledCount)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Math.abs(owed) < 0.01 && unsettledCount === 0}
                  onClick={onSettleUp}
                  className="rounded-xl tk-bg-card px-4 py-2.5 text-xs font-bold tk-text-forest hover:tk-bg-forest-tint disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {Math.abs(owed) < 0.01 && unsettledCount === 0
                    ? copy.settledBadge
                    : copy.settleUpNow}
                </button>
              </div>
            </section>

            {/* Convert Me-Paid to AA / Percentage */}
            <section className="rounded-2xl border tk-bc-hair tk-bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AccentIconBadge accent="teal" icon={ArrowRightLeft} size="sm" />
                  <h3 className="text-sm font-bold tk-text-ink">
                    {copy.convertToSplitHeading}
                  </h3>
                </div>
                <span className="text-xs tk-text-ink2">
                  {copy.fromAllMineHint}
                </span>
              </div>
              <div className="mt-3 divide-y tk-divide-hair border-t tk-bc-hair">
                {mePaidExpenses.length === 0 ? (
                  <div className="py-4 flex items-center gap-2 text-xs tk-text-ink2">
                    <CheckCircle2 className="h-4 w-4 tk-text-forest" />
                    {copy.noPersonalLeft}
                  </div>
                ) : (
                  mePaidExpenses.map((ex) => {
                    const isConfiguringRatio = ratioOpenId === ex.id;
                    const partnerAmtPreview = Number(
                      ((ex.amountLocal * (100 - clampSharePct(customPct))) / 100).toFixed(2)
                    );
                    const exIconMeta = resolveExpenseIconMeta(ex);
                    return (
                      <div key={ex.id} className="py-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AccentIconBadge
                              accent={exIconMeta.accent}
                              icon={exIconMeta.Icon}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold tk-text-ink truncate">
                                {translateDemoExpenseTitle(ex.title, activeLang)}
                              </div>
                              <div className="tk-text-ink2 mt-0.5 tabular-nums">
                                {sym}
                                {ex.amountLocal.toFixed(2)} · Day {ex.day ?? 1} {ex.time}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onConvertExpenseToSplit(ex.id, 50)}
                              className="rounded-lg border tk-bc-hair tk-bg-forest-tint px-2.5 py-1.5 font-semibold tk-text-forest hover:tk-bg-forest-tint whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {copy.fiftyFiftyBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isConfiguringRatio) {
                                  setRatioOpenId(null);
                                } else {
                                  setCustomPct(70);
                                  setRatioOpenId(ex.id);
                                }
                              }}
                              className={`rounded-lg border px-2.5 py-1.5 font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
 isConfiguringRatio
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bc-forest'
 }`}
                            >
                              {copy.byRatioBtn}
                            </button>
                          </div>
                        </div>

                        {isConfiguringRatio && (
                          <div className="pt-2 border-t tk-bc-hair space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1">
                                {[70, 60, 40, 30, 0].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setCustomPct(pct)}
                                    className={`rounded-md px-2 py-1 font-num font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
 customPct === pct
 ? 'tk-bg-forest tk-text-card'
 : 'tk-bg-forest-plate tk-text-ink2 hover:tk-bg-paper'
 }`}
                                  >
                                    {pct}:{100 - pct}
                                  </button>
                                ))}
                              </div>
                              <div className="inline-flex items-center gap-1 font-num tabular-nums">
                                <span className="tk-text-ink2">
                                  {copy.myShareInputLabel}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={customPct}
                                  onChange={(e) =>
                                    setCustomPct(clampSharePct(Number(e.target.value)))
                                  }
                                  className="w-12 rounded-md border tk-bc-hair tk-bg-card px-1.5 py-0.5 text-center font-bold tk-text-ink"
                                />
                                <span className="tk-text-ink2">%</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-num tk-text-ink2 tabular-nums">
                                {copy.partnerPaysPreview(
                                  displayCompanionName,
                                  100 - clampSharePct(customPct)
                                )}
                                <strong className="tk-text-forest">
                                  +{sym}
                                  {partnerAmtPreview.toFixed(2)}
                                </strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onConvertExpenseToSplit(ex.id, clampSharePct(customPct));
                                  setRatioOpenId(null);
                                }}
                                className="rounded-lg tk-bg-forest px-3 py-1 font-semibold tk-text-card hover:tk-bg-press whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                {copy.applyRatioSplit}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Settlement History Audit Trail */}
            {settlementHistory.length > 0 && (
              <section className="rounded-2xl border tk-bc-hair tk-bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AccentIconBadge accent="peach" icon={History} size="sm" />
                    <h3 className="text-sm font-bold tk-text-ink">
                      {copy.settlementHistoryTitle}
                    </h3>
                  </div>
                  <span className="font-num text-xs tk-text-ink2 tabular-nums">
                    {copy.settlementCount(settlementHistory.length)}
                  </span>
                </div>
                <div className="mt-3 divide-y tk-divide-hair border-t tk-bc-hair text-xs">
                  {settlementHistory.map((rec) => (
                    <div key={rec.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold tk-text-ink">
                          {rec.amountLocal >= 0
                            ? copy.receivedFrom(displayCompanionName)
                            : copy.paidTo(displayCompanionName)}
                        </div>
                        <div className="mt-0.5 font-num tk-text-ink2 tabular-nums">
                          {rec.settledAt} · {copy.clearedItemsCount(rec.itemCount)}
                        </div>
                      </div>
                      <div className="font-num font-bold tk-text-forest tabular-nums shrink-0">
                        {sym}
                        {Math.abs(rec.amountLocal).toFixed(2)} ✓
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Shared Split Ledger */}
          <div className="lg:col-span-7">
            <section className="rounded-2xl border tk-bc-hair tk-bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <AccentIconBadge accent="lavender" icon={Users} size="sm" />
                  <h3 className="text-sm font-bold tk-text-ink">
                    {copy.sharedSplitLedgerTitle}
                  </h3>
                </div>
                <span className="font-num text-xs tk-text-ink2 tabular-nums">
                  {settledCount > 0
                    ? copy.openSettledCounts(unsettledCount, settledCount)
                    : copy.sharedCount(sharedExpenses.length)}
                </span>
              </div>

              <div className="mt-3 divide-y tk-divide-hair border-t tk-bc-hair">
                {sharedExpenses.length === 0 ? (
                  <p className="py-6 text-center text-xs tk-text-ink2">
                    {copy.noSplitExpensesEmpty}
                  </p>
                ) : (
                  sharedExpenses.map((ex) => {
                    const details = resolveExpenseSplitDetails(
                      ex,
                      displayCompanionName,
                      sym,
                      activeLang,
                      travelersCount
                    );
                    const delta = details.partnerOwedDeltaLocal;
                    const exIconMeta = resolveExpenseIconMeta(ex);
                    return (
                      <div
                        key={ex.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <AccentIconBadge
                            accent={exIconMeta.accent}
                            icon={exIconMeta.Icon}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold tk-text-ink truncate">
                              {translateDemoExpenseTitle(ex.title, activeLang)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 tk-text-ink2 tabular-nums">
                              <span>
                                {copy.totalPrefix}
                                {sym}
                                {ex.amountLocal.toFixed(2)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  ex.split === 'ratio' ? 'font-semibold tk-text-forest' : ''
                                }
                              >
                                {details.shortLabel}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{details.breakdownLabel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-num tabular-nums">
                            {ex.settled ? (
                              <div className="font-semibold tk-text-ink2">
                                {copy.settledAmtPrefix}({sym}
                                {Math.abs(delta).toFixed(2)})
                              </div>
                            ) : (
                              <div
                                className={`font-bold ${
 delta >= 0 ? 'tk-text-forest' : 'tk-text-warning'
 }`}
                              >
                                {delta > 0.005
                                  ? copy.companionOwesInline(
                                      displayCompanionName,
                                      `${sym}${delta.toFixed(2)}`
                                    )
                                  : delta < -0.005
                                  ? copy.youOweInline(`${sym}${Math.abs(delta).toFixed(2)}`)
                                  : copy.evenLabel}
                              </div>
                            )}
                            <div className="text-[11px] tk-text-ink2">
                              Day {ex.day ?? 1} · {ex.time}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setLedgerDayFilter('all');
                              setLedgerBucketFilter('all');
                              setLedgerAccountFilter('all');
                              setEditingExpenseId(ex.id);
                              setFinanceView('overview');
                            }}
                            className="rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1 text-[11px] font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest whitespace-nowrap cursor-pointer"
                          >
                            {t('common.edit')}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
        </div>
      ) : (
        <>
          {/* 1. UNIFIED DUAL-TRACK OVERSEAS TRAVELER WALLET HERO CARD */}
          <section className="rounded-3xl border tk-bc-hair tk-bg-card tk-elev-card overflow-hidden">
            {/* TRACK 1: Route Board Header + Fixed Prepaid Sunk Cost (Excluded from Daily Cap) */}
            <div className="px-4 sm:px-6 pt-4 pb-3.5 border-b tk-bc-hair tk-budget-hero-grad space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl tk-bg-forest-tint tk-text-forest shrink-0">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold tk-text-ink tracking-tight truncate">
                    {routeBoardTitle}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrencyPickerOpen(true)}
                    aria-label={copy.switchCurrencyAria}
                    className="h-7 inline-flex items-center gap-1 rounded-full border tk-bc-hair tk-bg-card px-2.5 font-num text-xs font-bold tk-text-ink hover:tk-bc-forest whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <span>{homeCurrency}</span>
                    <ChevronDown className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetPlannerFocus('overall');
                      setBudgetPlannerOpen(true);
                    }}
                    className="h-7 inline-flex items-center gap-1 rounded-full border tk-bc-hair tk-bg-card px-2.5 text-xs font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <SlidersHorizontal className="h-3 w-3 shrink-0" />
                    <span>{copy.adjustBtn}</span>
                  </button>
                </div>
              </div>

              {/* Fixed Prepaid Line (Explicitly Separated Sunk Cost) + Live FX Reference */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setBudgetPlannerFocus('overall');
                    setBudgetPlannerOpen(true);
                  }}
                  className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-left group cursor-pointer"
                >
                  <span className="font-semibold tk-text-ink2">
                    {walletCopy.fixedPrepaidLabel}:
                  </span>
                  <span className="font-num font-bold tk-text-ink tabular-nums group-hover:tk-text-forest transition-colors">
                    {formatCurrencyAmount(prepaidHome, homeCurrency, {
                      compactDecimals: true,
                    })}{' '}
                    {homeCurrency}
                  </span>
                  <span className="text-[11px] tk-text-ink2">
                    ({walletCopy.fixedPrepaidSub})
                  </span>
                </button>

                {!sameCurrency && (
                  <span className="font-num text-[11px] font-medium tk-text-ink2 tabular-nums whitespace-nowrap">
                    1 {tripCode} ={' '}
                    {fxSummary.rate >= 100
                      ? fxSummary.rate.toFixed(2)
                      : fxSummary.rate.toFixed(3)}{' '}
                    {homeCurrency}
                    {fxSummary.source === 'custom' ? copy.fxLockedBadge : ''}
                  </span>
                )}
              </div>
            </div>

            {/* TRACK 2: Today's Liquid Spending Power (Hero Balance + Progress Ring + Day Switcher) */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
              <HorizontalChipScroller
                activeKey={currentDay}
                fadeBgClassName="from-white"
                ariaLabel={copy.selectBudgetDayAria}
              >
                {dayMetaList.map(({ day, cityLabel }) => {
                  const active = day === currentDay;
                  return (
                    <button
                      key={day}
                      type="button"
                      data-chip-active={active ? 'true' : undefined}
                      onClick={() => onSelectDay(day)}
                      className={`min-h-[32px] inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-hair hover:tk-text-ink'
 }`}
                    >
                      <span className="font-num font-bold">D{day}</span>
                      {cityLabel && <span>{cityLabel}</span>}
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold tk-text-forest">
                      {walletCopy.todayLiquidTitle(currentDay)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetPlannerFocus('daily');
                        setBudgetPlannerOpen(true);
                      }}
                      className="text-[11px] font-semibold tk-text-ink2 hover:tk-text-forest underline decoration-dotted underline-offset-2 cursor-pointer tabular-nums"
                    >
                      {copy.dailyRateAdjust(sym, budget.dailyBudgetLocal)}
                    </button>
                  </div>

                  {/* Hero Dual-Currency Liquid Figure */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-num tabular-nums">
                    <span
                      className={`text-3xl sm:text-[34px] font-extrabold tracking-tight leading-none ${
 isDailyOver ? 'tk-text-danger' : 'tk-text-ink'
 }`}
                    >
                      {isDailyOver
                        ? `-${sym}${Math.abs(dailyBalance).toFixed(2)}`
                        : `${sym}${dailyBalance.toFixed(2)}`}
                    </span>
                    <span className="text-xs sm:text-sm font-bold tk-text-ink2">
                      {tripCode}
                    </span>
                    <span className="text-xs sm:text-sm font-medium tk-text-ink2">
                      / {walletCopy.plannedLabel(`${sym}${dailyAvailable.toFixed(2)}`)}
                    </span>
                  </div>

                  {/* Quiet Contextual Footnote: Home Currency Equivalent + Rollover / Shared Split */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tk-text-ink2 font-num tabular-nums">
                    {!sameCurrency && (
                      <span className="font-medium tk-text-ink2">
                        ≈{' '}
                        {formatHomeCurrencyEquivalent(
                          Math.abs(dailyBalance),
                          tripCode,
                          intel.fxToUsd,
                          homeCurrency,
                          budget
                        )}{' '}
                        {homeCurrency}
                      </span>
                    )}
                    {currentDay > 1 && Math.abs(dynamicRollover) >= 0.01 && (
                      <>
                        {!sameCurrency && (
                          <span aria-hidden="true" className="tk-text-ink2">
                            ·
                          </span>
                        )}
                        <span
                          className={
                            dynamicRollover > 0
                              ? 'tk-text-forest font-semibold'
                              : 'tk-text-warning font-semibold'
                          }
                        >
                          {dynamicRollover > 0
                            ? walletCopy.rolloverBonusHint(
                                `${sym}${dynamicRollover.toFixed(2)}`
                              )
                            : walletCopy.rolloverDeficitHint(
                                `${sym}${Math.abs(dynamicRollover).toFixed(2)}`
                              )}
                        </span>
                      </>
                    )}
                    {Math.abs(grossDailySpent - myDailySpent) >= 0.01 && (
                      <>
                        <span aria-hidden="true" className="tk-text-ink2">
                          ·
                        </span>
                        <span>
                          {copy.myShareInlinePrefix}
                          {sym}
                          {myDailySpent.toFixed(2)}
                          {copy.totalBillInline(sym, grossDailySpent.toFixed(2))}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Ring */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r={radius}
                      fill="none"
                      stroke="var(--tk-idle)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={radius}
                      fill="none"
                      stroke={isDailyOver ? 'var(--tk-danger)' : 'var(--tk-forest)'}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                    <span
                      className={`font-num text-xs sm:text-sm font-extrabold tabular-nums leading-tight ${
                        isDailyOver ? 'tk-text-danger' : 'tk-text-ink'
                      }`}
                    >
                      {isDailyOver ? copy.overLabel : `${dailyPct}%`}
                    </span>
                    <span className="text-[10px] font-medium tk-text-ink2 leading-tight">
                      {isDailyOver ? walletCopy.overBudgetPctLabel : copy.spentLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TRACK 3: Asset Distribution Strip (Physical Cash | Credit Card Charged | Transit Pass) */}
            <div className="tk-bg-paper border-t tk-bc-hair px-4 sm:px-6 py-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide tk-text-ink2 mr-1 shrink-0">
                  <Wallet className="h-3.5 w-3.5 tk-text-forest" />
                  <span>{walletCopy.assetsDistributionTitle}</span>
                </span>

                {/* Asset 1: Physical Cash on Hand */}
                <button
                  type="button"
                  onClick={() => openWalletEditor('cash')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors cursor-pointer ${
 editingWallet === 'cash'
 ? 'tk-bc-forest tk-bg-card tk-text-forest shadow-2xs'
 : 'tk-bc-hair bg-white/85 tk-text-ink hover:tk-bc-forest'
 }`}
                >
                  <Banknote className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                  <span className="tk-text-ink2">{walletCopy.cashOnHandLabel}</span>
                  <span
                    className={`font-num font-bold tabular-nums ${
 budget.cashLocal < 0 ? 'tk-text-danger' : 'tk-text-ink'
 }`}
                  >
                    {sym}
                    {budget.cashLocal.toFixed(0)} {tripCode}
                  </span>
                </button>

                {/* Asset 2: Credit Card Charged (True Traveler Mental Model) */}
                <button
                  type="button"
                  onClick={() => openWalletEditor('card')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors cursor-pointer ${
 editingWallet === 'card'
 ? 'tk-bc-forest tk-bg-card tk-text-forest shadow-2xs'
 : 'tk-bc-hair bg-white/85 tk-text-ink hover:tk-bc-forest'
 }`}
                >
                  <CreditCard className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
                  <span className="tk-text-ink2">{walletCopy.cardChargedLabel}</span>
                  <span className="font-num font-bold tk-text-ink tabular-nums">
                    {formatCurrencyAmount(cardChargedHome, homeCurrency, {
                      compactDecimals: true,
                    })}{' '}
                    {homeCurrency}
                  </span>
                </button>

                {/* Asset 3: Transit Pass */}
                <button
                  type="button"
                  onClick={() => openWalletEditor('transit')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors cursor-pointer ${
 editingWallet === 'transit'
 ? 'tk-bc-forest tk-bg-card tk-text-forest shadow-2xs'
 : 'tk-bc-hair bg-white/85 tk-text-ink hover:tk-bc-forest'
 }`}
                >
                  <TrainFront className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
                  <span className="tk-text-ink2">
                    {translateIntelField('transitPassName', intel.transitPassName, activeLang) ||
                      walletCopy.transitPassLabel}
                  </span>
                  <span
                    className={`font-num font-bold tabular-nums ${
 budget.transitPassLocal < 0 ? 'tk-text-danger' : 'tk-text-ink'
 }`}
                  >
                    {sym}
                    {budget.transitPassLocal.toFixed(0)}
                  </span>
                </button>
              </div>

              {/* On-Demand Inline Calibration Panel (Appears Only When User Clicks an Asset Chip) */}
              {editingWallet === 'cash' && (
                <div className="rounded-xl border tk-bc-hair tk-bg-card p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold tk-text-ink">
                      {walletCopy.cashOnHandLabel} ({tripCode})
                    </span>
                    {[50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          onAdjustWalletBalance('cash', 'add', amt);
                          setEditingWallet(null);
                        }}
                        className="rounded-lg tk-bg-forest-tint px-2.5 py-1 font-num font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
                      >
                        +{sym}
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={walletExactDraft}
                      onChange={(e) => setWalletExactDraft(e.target.value)}
                      placeholder={copy.actualCashPlaceholder}
                      className="w-24 rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1 font-num font-bold tk-text-ink tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onAdjustWalletBalance('cash', 'set', parseFloat(walletExactDraft) || 0);
                        setEditingWallet(null);
                      }}
                      className="rounded-lg tk-bg-forest px-3 py-1 font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                    >
                      {copy.setBalanceBtn}
                    </button>
                  </div>
                </div>
              )}

              {editingWallet === 'card' && (
                <div className="rounded-xl border tk-bc-hair tk-bg-card p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold tk-text-ink">
                      {t('budget.walletCard')} ({homeCurrency})
                    </span>
                    {cardQuickTopUpPresets.map((amtHome) => (
                      <button
                        key={amtHome}
                        type="button"
                        onClick={() => {
                          const deltaUsd = convertCurrencyAmount(amtHome, homeCurrency, 'USD', {
                            intelFxToUsd: intel.fxToUsd,
                            tripCurrencyCode: tripCode,
                            budgetFx: budget,
                          });
                          onAdjustWalletBalance('card', 'add', deltaUsd);
                          setEditingWallet(null);
                        }}
                        className="rounded-lg tk-bg-forest-tint px-2.5 py-1 font-num font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
                      >
                        +{homeSym}
                        {amtHome.toLocaleString('en-US')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="any"
                      value={walletExactDraft}
                      onChange={(e) => setWalletExactDraft(e.target.value)}
                      placeholder={copy.limitPlaceholder(homeCurrency)}
                      className="w-28 rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1 font-num font-bold tk-text-ink tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const targetHome = parseFloat(walletExactDraft) || 0;
                        const targetUsd = convertCurrencyAmount(targetHome, homeCurrency, 'USD', {
                          intelFxToUsd: intel.fxToUsd,
                          tripCurrencyCode: tripCode,
                          budgetFx: budget,
                        });
                        onAdjustWalletBalance('card', 'set', targetUsd);
                        setEditingWallet(null);
                      }}
                      className="rounded-lg tk-bg-forest px-3 py-1 font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                    >
                      {copy.setLimitBtn}
                    </button>
                  </div>
                </div>
              )}

              {editingWallet === 'transit' && (
                <div className="rounded-xl border tk-bc-hair tk-bg-card p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold tk-text-ink">
                      {translateIntelField('transitPassName', intel.transitPassName, activeLang) ||
                        walletCopy.transitPassLabel}
                    </span>
                    {[10, 20, 50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          onAdjustWalletBalance('transit', 'add', amt);
                          setEditingWallet(null);
                        }}
                        className="rounded-lg tk-bg-forest-tint px-2.5 py-1 font-num font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
                      >
                        +{sym}
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={walletExactDraft}
                      onChange={(e) => setWalletExactDraft(e.target.value)}
                      placeholder={copy.passBalancePlaceholder}
                      className="w-24 rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1 font-num font-bold tk-text-ink tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onAdjustWalletBalance('transit', 'set', parseFloat(walletExactDraft) || 0);
                        setEditingWallet(null);
                      }}
                      className="rounded-lg tk-bg-forest px-3 py-1 font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                    >
                      {copy.setBalanceBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. COMPACT SINGLE-ROW QUICK ACCOUNTING BAR (Immediately Accessible Right Below Wallet) */}
          {renderQuickAccountingBar()}

          {/* 3. MULTI-CURRENCY PRACTICAL LEDGER WITH GOLDEN VAT ENVELOPE BADGES */}
          <section className="rounded-2xl border tk-bc-hair tk-bg-card overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b tk-bc-hair space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AccentIconBadge accent="lavender" icon={Receipt} size="md" className="mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold tk-text-ink">
                      {copy.ledgerTitle}
                    </h3>
                    <p className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                      {copy.ledgerSummary(
                        visibleLedger.length,
                        sym,
                        visibleGrossSum.toFixed(2),
                        visibleMyShareSum.toFixed(2)
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] tk-text-ink2 sm:hidden whitespace-nowrap">
                  {copy.swipeEditHint}
                </span>
              </div>

              <HorizontalChipScroller
                activeKey={ledgerDayFilter}
                fadeBgClassName="from-white"
                ariaLabel={copy.filterDayAria}
              >
                <button
                  type="button"
                  data-chip-active={ledgerDayFilter === 'all' ? 'true' : undefined}
                  onClick={() => setLedgerDayFilter('all')}
                  className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 ledgerDayFilter === 'all'
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-hair hover:tk-text-ink'
 }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <span>{copy.allFilterChip}</span>
                  <span
                    className={`font-num text-[11px] tabular-nums ${
 ledgerDayFilter === 'all' ? 'text-white/80' : 'tk-text-ink2'
 }`}
                  >
                    {expenses.length}
                  </span>
                </button>

                {dayMetaList.map(({ day, cityLabel, expenseCount }) => {
                  const isSelected = ledgerDayFilter === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      data-chip-active={isSelected ? 'true' : undefined}
                      onClick={() => {
                        setLedgerDayFilter(day);
                        onSelectDay(day);
                      }}
                      className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 isSelected
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-hair hover:tk-text-ink'
 }`}
                    >
                      <span className="font-num font-bold">D{day}</span>
                      {cityLabel && <span>{cityLabel}</span>}
                      {expenseCount > 0 && (
                        <span
                          className={`font-num text-[11px] tabular-nums ${
 isSelected ? 'text-white/80' : 'tk-text-ink2'
 }`}
                        >
                          {expenseCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <select
                  aria-label={copy.filterBucketAria}
                  value={ledgerBucketFilter}
                  onChange={(e) =>
                    setLedgerBucketFilter(e.target.value as 'all' | 'daily' | 'shopping' | 'vat')
                  }
                  className={`h-8 w-full sm:w-auto rounded-lg border px-2.5 text-xs font-semibold focus:outline-none cursor-pointer truncate ${
 ledgerBucketFilter !== 'all'
 ? 'tk-bc-hair tk-bg-paper tk-text-ink2'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2'
 }`}
                >
                  <option value="all">{copy.allCategoriesOpt}</option>
                  <option value="daily">{copy.foodDailyName}</option>
                  <option value="shopping">{copy.shoppingLabel}</option>
                  {(vatMeta.supportsVat || vatEligibleItems.length > 0) && (
                    <option value="vat">{copy.vatFormsOpt}</option>
                  )}
                </select>

                <select
                  aria-label={copy.filterWalletAria}
                  value={ledgerAccountFilter}
                  onChange={(e) =>
                    setLedgerAccountFilter(e.target.value as 'all' | 'card' | 'cash' | 'transit')
                  }
                  className={`h-8 w-full sm:w-auto rounded-lg border px-2.5 text-xs font-semibold focus:outline-none cursor-pointer truncate ${
 ledgerAccountFilter !== 'all'
 ? 'tk-bc-hair tk-bg-paper tk-text-ink2'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2'
 }`}
                >
                  <option value="all">{copy.allWalletsOpt}</option>
                  <option value="card">{t('budget.walletCard')}</option>
                  <option value="cash">{t('budget.walletCash')}</option>
                  <option value="transit">{t('budget.walletTransit')}</option>
                </select>
              </div>
            </div>

            <div className="divide-y tk-divide-hair">
              {visibleLedger.length === 0 ? (
                <div className="px-5 py-8 text-center space-y-2">
                  <p className="text-xs tk-text-ink2">{copy.noMatchingExpenses}</p>
                  {(ledgerDayFilter !== 'all' ||
                    ledgerBucketFilter !== 'all' ||
                    ledgerAccountFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerDayFilter('all');
                        setLedgerBucketFilter('all');
                        setLedgerAccountFilter('all');
                      }}
                      className="text-xs font-semibold tk-text-forest hover:underline cursor-pointer"
                    >
                      {copy.resetFiltersBtn}
                    </button>
                  )}
                </div>
              ) : (
                visibleLedger.map((ex) => (
                  <ExpenseLedgerRow
                    key={ex.id}
                    expense={ex}
                    defaultDay={currentDay}
                    totalDays={safeDaysCount}
                    travelersCount={travelersCount}
                    companionName={companionName}
                    currencySymbol={sym}
                    currencyCode={tripCode}
                    fxToUsd={intel.fxToUsd}
                    vatThresholdLocal={intel.vatThresholdLocal}
                    vatProgramName={vatMeta.programName}
                    vatRefundPct={vatMeta.refundPct}
                    vatSupportsDestination={vatMeta.supportsVat}
                    homeCurrency={homeCurrency}
                    budgetFx={budget}
                    isEditing={editingExpenseId === ex.id}
                    isSwipedOpen={swipedExpenseId === ex.id}
                    onSwipeOpenChange={(open) => setSwipedExpenseId(open ? ex.id : null)}
                    onStartEdit={() => {
                      setSwipedExpenseId(null);
                      setEditingExpenseId(ex.id);
                    }}
                    onCancelEdit={() => setEditingExpenseId(null)}
                    onSaveEdit={(updates) => {
                      onUpdateExpense(ex.id, updates);
                      setEditingExpenseId(null);
                    }}
                    onDelete={() => {
                      setSwipedExpenseId(null);
                      setEditingExpenseId(null);
                      onDeleteExpense(ex.id);
                    }}
                    onCycleVatStatus={() => onCycleVatStatus(ex.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* 4. BELOW-FOLD ANALYTICS & DESTINATION TAX-FREE POOL */}
          <div
            className={`grid grid-cols-1 gap-5 items-start ${
 showVatSummaryCard ? 'lg:grid-cols-12' : ''
 }`}
          >
            {/* Daily Spending Trend vs Budget Limit Chart (Recharts) */}
            <section
              className={`rounded-2xl border tk-bc-hair tk-bg-card p-5 ${
 showVatSummaryCard ? 'lg:col-span-7' : ''
 }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <AccentIconBadge accent="teal" icon={TrendingUp} size="sm" />
                    <h3 className="text-sm font-bold tk-text-ink">
                      {copy.trendChartTitle}
                    </h3>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tk-text-ink2">
                    <span>
                      {copy.dailyAvgPrefix}
                      <strong className="font-num tk-text-ink tabular-nums">
                        {sym}
                        {avgDailyBurn.toFixed(2)}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {copy.limitPrefix}
                      <strong className="font-num tk-text-warning tabular-nums">
                        {sym}
                        {budget.dailyBudgetLocal.toFixed(0)}
                        {copy.perDaySuffix}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {copy.cumulativePrefix}
                      <strong
                        className={`font-num tabular-nums ${
 cumulativeDiff >= 0 ? 'tk-text-forest' : 'tk-text-danger'
 }`}
                      >
                        {cumulativeDiff >= 0
                          ? `${copy.savedPrefix}${sym}${cumulativeDiff.toFixed(2)}`
                          : `${copy.overPrefix}${sym}${Math.abs(cumulativeDiff).toFixed(2)}`}
                      </strong>
                    </span>
                    {overBudgetDays > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold tk-text-danger">
                          {copy.daysOverLimit(overBudgetDays)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-xl tk-bg-forest-plate p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setChartIncludeShopping(false)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 !chartIncludeShopping
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {copy.dailyOnlyTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartIncludeShopping(true)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 chartIncludeShopping
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {copy.plusShoppingTab}
                  </button>
                </div>
              </div>

              <div className="mt-4 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 18, right: 16, left: -6, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={tkColor('--tk-rule-c')} vertical={false} />
                    <XAxis
                      dataKey="dayLabel"
                      tick={{ fill: tkColor('--tk-ink-2'), fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: tkColor('--tk-hair-c') }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, yAxisMax]}
                      tickFormatter={(v) => `${sym}${v}`}
                      tick={{
                        fill: tkColor('--tk-ink-2'),
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: tkColor('--tk-forest-tint') }}
                      content={
                        <DailyTrendTooltip
                          sym={sym}
                          includeShopping={chartIncludeShopping}
                          copy={copy}
                        />
                      }
                    />
                    <ReferenceLine
                      y={budget.dailyBudgetLocal}
                      stroke={tkColor('--tk-warning')}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: copy.limitChartLabel(sym, budget.dailyBudgetLocal),
                        position: 'insideTopRight',
                        fill: tkColor('--tk-warning'),
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Bar
                      dataKey="dailySpent"
                      name={copy.foodDailyName}
                      stackId="spend"
                      barSize={26}
                      radius={chartIncludeShopping ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={`cell-${entry.dayNum}`}
                          fill={entry.dailySpent > entry.limit ? tkColor('--tk-danger') : tkColor('--tk-chart-1')}
                        />
                      ))}
                    </Bar>
                    {chartIncludeShopping && (
                      <Bar
                        dataKey="shoppingSpent"
                        name={copy.shoppingLabel}
                        stackId="spend"
                        barSize={26}
                        fill={tkColor('--tk-chart-2')}
                        radius={[6, 6, 0, 0]}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="trendTotal"
                      name={copy.spendTrendName}
                      stroke={tkColor('--tk-ink')}
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: tkColor('--tk-card'), stroke: tkColor('--tk-ink'), strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: tkColor('--tk-forest'), stroke: tkColor('--tk-card'), strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t tk-bc-hair flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs tk-text-ink2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs tk-bg-chart-1" />
                  {copy.legendWithin}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs tk-bg-danger" />
                  {copy.legendOver}
                </span>
                {chartIncludeShopping && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs tk-bg-chart-2" />
                    {copy.legendShoppingExcl}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 tk-bg-ink" /> {copy.legendTrendLine}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed tk-bc-warning" />
                  {copy.legendTargetLimit}
                </span>
              </div>
            </section>

            {/* Destination-Aware Shopping & Tax-Free Pool Card (Hidden cleanly for non-VAT US trips with 0 shopping) */}
            {showVatSummaryCard && (
              <section className="lg:col-span-5 rounded-2xl border tk-budget-vat-card p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl tk-bg-warning-tint tk-text-warning shrink-0">
                      <MailCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold tk-text-ink truncate">
                        {walletCopy.vatPoolCardTitle}
                      </h3>
                      {vatMeta.supportsVat && (
                        <p className="text-[11px] font-semibold tk-text-warning">
                          {vatMeta.programName} · {walletCopy.vatRefundablePct(vatMeta.refundPct)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetPlannerFocus('shopping');
                      setBudgetPlannerOpen(true);
                    }}
                    className="text-xs font-semibold tk-text-ink2 hover:tk-text-warning whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                  >
                    {copy.vatMinAdjust(sym, intel.vatThresholdLocal)}
                  </button>
                </div>

                <div className="font-num text-2xl font-extrabold tk-text-ink tabular-nums">
                  {sym}
                  {shoppingSpent.toFixed(2)}{' '}
                  <span className="text-xs font-semibold tk-text-ink2">{tripCode}</span>{' '}
                  <span className="text-sm font-medium tk-text-ink2">
                    / {sym}
                    {budget.shoppingReserveLocal}
                  </span>
                </div>

                <div className="pt-3 border-t tk-bc-hair text-xs space-y-2.5">
                  {vatMeta.supportsVat && (
                    <div className="flex items-center justify-between">
                      <span className="tk-text-ink2">{copy.estAirportVat}</span>
                      <span className="font-num font-extrabold tk-text-forest tabular-nums">
                        +{sym}
                        {estVatRefund.toFixed(2)} {tripCode}
                      </span>
                    </div>
                  )}

                  {vatEligibleItems.length > 0 && (
                    <div className="space-y-1.5">
                      {vatEligibleItems.slice(0, 3).map((item) => {
                        const st: VatDocStatus = item.vatStatus ?? 'pending_form';
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 tk-text-ink2"
                          >
                            <span className="truncate font-medium tk-text-ink">
                              {translateDemoExpenseTitle(item.title, activeLang)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onCycleVatStatus(item.id)}
                              title={copy.cycleVatTitle}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
 st === 'stamped'
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : st === 'form_ready'
 ? 'tk-bc-warning-hair tk-bg-warning-tint tk-text-warning'
 : 'tk-bc-warning-hair tk-bg-warning-tint tk-text-warning'
 }`}
                            >
                              <MailCheck className="h-3 w-3 shrink-0" />
                              {getVatStatusLabel(st, activeLang)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {subThresholdShoppingItem && (
                    <p className="rounded-xl tk-bg-warning-tint px-3 py-2 tk-text-warning leading-relaxed tabular-nums">
                      {copy.bundleTip(
                        translateDemoExpenseTitle(subThresholdShoppingItem.title, activeLang),
                        `${sym}${(intel.vatThresholdLocal - subThresholdShoppingItem.amountLocal).toFixed(2)}`,
                        `${sym}${(intel.vatThresholdLocal * budget.vatRefundRate).toFixed(0)}`
                      )}
                    </p>
                  )}

                  {vatMeta.supportsVat && intel.vatExitAirport && (
                    <p className="tk-text-ink2 leading-relaxed">
                      {copy.customsStampPrefix}
                      <strong className="tk-text-ink">
                        {translateIntelField('vatExitAirport', intel.vatExitAirport, activeLang)}
                      </strong>
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      <ManualExpenseModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        initialTitle={manualPrefillTitle}
        initialDay={currentDay}
        totalDays={safeDaysCount}
        dayMetaList={dayMetaList}
        budget={budget}
        intel={intel}
        travelersCount={travelersCount}
        companionName={companionName}
        displayCompanionName={displayCompanionName}
        homeCurrency={homeCurrency}
        onAddExpense={onAddExpense}
        onSelectDay={onSelectDay}
        onAdjustWalletBalance={onAdjustWalletBalance}
        onLoggedFeedback={(msg) => setReceiptFeedback(msg)}
      />

      <BudgetPlannerModal
        open={budgetPlannerOpen}
        onClose={() => setBudgetPlannerOpen(false)}
        budget={budget}
        intel={intel}
        totalDays={safeDaysCount}
        homeCurrency={homeCurrency}
        language={activeLang}
        initialFocus={budgetPlannerFocus}
        onOpenCurrencyPicker={() => setCurrencyPickerOpen(true)}
        onSaveBudgetPlan={onUpdateBudgetLimits}
      />

      <CurrencyPickerModal
        open={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        selectedCurrency={homeCurrency}
        onSelectCurrency={(code) => {
          onUpdateHomeCurrency?.(code);
        }}
        tripCurrencyCode={intel.currencyCode}
        tripCurrencySymbol={intel.currencySymbol}
        intelFxToUsd={intel.fxToUsd}
        budgetFx={budget}
        language={activeLang}
      />
    </div>
  );
};

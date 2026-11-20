import type { AppLanguage, BudgetState, ExpenseRecord, SplitMode, VatDocStatus } from '../types';
import { getBudgetPackA } from '../i18n/packs/budgetPackA';

export interface ResolvedSplitDetails {
  payer: 'me' | 'partner';
  mySharePct: number;
  partnerSharePct: number;
  myAmountLocal: number;
  partnerAmountLocal: number;
  /** Positive = companion(s) owe me; Negative = I owe paying companion */
  partnerOwedDeltaLocal: number;
  shortLabel: string;
  breakdownLabel: string;
}

export const VAT_STATUS_LABELS: Record<VatDocStatus, string> = {
  pending_form: '待开退税单',
  form_ready: '已拿退税单',
  stamped: '海关已盖章',
};

export function getVatStatusLabel(status: VatDocStatus, lang: AppLanguage = 'zh-CN'): string {
  const copy = getBudgetPackA(lang);
  if (status === 'form_ready') return copy.vatFormReady;
  if (status === 'stamped') return copy.vatStamped;
  return copy.vatPendingForm;
}

export function getNextVatStatus(current?: VatDocStatus): VatDocStatus {
  if (!current || current === 'pending_form') return 'form_ready';
  if (current === 'form_ready') return 'stamped';
  return 'pending_form';
}

export function clampSharePct(raw?: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 50;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function resolveExpenseSplitDetails(
  ex: Pick<ExpenseRecord, 'amountLocal' | 'split' | 'mySharePct' | 'paidBy'>,
  companionName = '同行伙伴',
  currencySymbol = '€',
  lang: AppLanguage = 'zh-CN',
  travelersCount = 2
): ResolvedSplitDetails {
  const amt = Math.max(0, Number(ex.amountLocal) || 0);
  const splitMode: SplitMode = ex.split;
  const copy = getBudgetPackA(lang);
  const partnerLabel =
    companionName && companionName.trim()
      ? companionName.trim()
      : copy.companionFallback;

  // Effective party count for equal AA splits (at least 2 when an expense is explicitly marked shared)
  const partyCount = Math.max(2, Math.min(20, Math.round(Number(travelersCount) || 2)));
  const equalMyPct = Math.round(100 / partyCount);

  if (splitMode === 'me') {
    const formattedAmt = `${currencySymbol}${amt.toFixed(2)}`;
    return {
      payer: 'me',
      mySharePct: 100,
      partnerSharePct: 0,
      myAmountLocal: amt,
      partnerAmountLocal: 0,
      partnerOwedDeltaLocal: 0,
      shortLabel: copy.allMine100,
      breakdownLabel: copy.personalAmt(formattedAmt),
    };
  }

  if (splitMode === 'partner') {
    const myShare = Number((amt / partyCount).toFixed(2));
    const othersShare = Number((amt - myShare).toFixed(2));
    const isMultiGroup = partyCount > 2;
    const perPersonStr = `${currencySymbol}${myShare.toFixed(2)}`;
    return {
      payer: 'partner',
      mySharePct: equalMyPct,
      partnerSharePct: 100 - equalMyPct,
      myAmountLocal: myShare,
      partnerAmountLocal: othersShare,
      partnerOwedDeltaLocal: -myShare,
      shortLabel: isMultiGroup
        ? copy.paidByPartnerMulti(partnerLabel, partyCount)
        : copy.paidByPartnerPair(partnerLabel),
      breakdownLabel: isMultiGroup
        ? copy.waySplitMulti(partyCount, perPersonStr)
        : copy.waySplit50(perPersonStr),
    };
  }

  if (splitMode === 'ratio') {
    const myPct = clampSharePct(ex.mySharePct ?? 60);
    const partnerPct = 100 - myPct;
    const payer: 'me' | 'partner' = ex.paidBy === 'partner' ? 'partner' : 'me';
    const myAmt = Number(((amt * myPct) / 100).toFixed(2));
    const partnerAmt = Number((amt - myAmt).toFixed(2));
    const delta = payer === 'me' ? partnerAmt : -myAmt;

    const payerNote = payer === 'partner' ? copy.paidByNote(partnerLabel) : '';
    const shortLabel =
      myPct === 0 && payer === 'me'
        ? copy.coveredFor(partnerLabel)
        : myPct === 100 && payer === 'partner'
        ? copy.coveredMe(partnerLabel)
        : copy.splitRatio(myPct, partnerPct, payerNote);

    const othersOrPartner = partyCount > 2 ? copy.othersLabel : partnerLabel;
    return {
      payer,
      mySharePct: myPct,
      partnerSharePct: partnerPct,
      myAmountLocal: myAmt,
      partnerAmountLocal: partnerAmt,
      partnerOwedDeltaLocal: delta,
      shortLabel,
      breakdownLabel: copy.splitBreakdown(
        myPct,
        `${currencySymbol}${myAmt.toFixed(2)}`,
        othersOrPartner,
        partnerPct,
        `${currencySymbol}${partnerAmt.toFixed(2)}`
      ),
    };
  }

  // Default: 'split' (Equal AA paid by me across partyCount travelers)
  const myShare = Number((amt / partyCount).toFixed(2));
  const othersShare = Number((amt - myShare).toFixed(2));
  const isMultiGroup = partyCount > 2;
  const myShareStr = `${currencySymbol}${myShare.toFixed(2)}`;
  const othersShareStr = `${currencySymbol}${othersShare.toFixed(2)}`;
  return {
    payer: 'me',
    mySharePct: equalMyPct,
    partnerSharePct: 100 - equalMyPct,
    myAmountLocal: myShare,
    partnerAmountLocal: othersShare,
    partnerOwedDeltaLocal: othersShare,
    shortLabel: isMultiGroup ? copy.splitMultiShort(partyCount) : copy.split50Short,
    breakdownLabel: isMultiGroup
      ? copy.splitMultiBreakdown(partyCount, myShareStr, othersShareStr)
      : copy.waySplit50(myShareStr),
  };
}

/**
 * Pure invariant helper: computes exact net unsettled companion balance from all open expenses,
 * preventing any drift when expenses are edited, deleted, reopened, or when group size changes.
 */
export function recomputeUnsettledPartnerOwed(
  expenses: ExpenseRecord[],
  travelersCount = 2
): number {
  const sum = expenses.reduce((acc, ex) => {
    if (ex.settled) return acc;
    const details = resolveExpenseSplitDetails(ex, undefined, '€', 'zh-CN', travelersCount);
    return acc + details.partnerOwedDeltaLocal;
  }, 0);
  return Number(sum.toFixed(2));
}

/**
 * Applies (+1) or reverses (-1) an expense's exact effect on wallet balances
 * and unsettled companion AA balance, enabling lossless edit & delete rollback.
 */
export function applyExpenseEffectToBudget(
  budget: BudgetState,
  ex: ExpenseRecord,
  fxToUsd: number,
  sign: 1 | -1,
  travelersCount = 2
): BudgetState {
  const next = { ...budget };
  const amt = Math.max(0, Number(ex.amountLocal) || 0);
  const splitInfo = resolveExpenseSplitDetails(ex, undefined, '€', 'zh-CN', travelersCount);

  // Wallet balance mutation (only when I physically paid the merchant)
  if (splitInfo.payer === 'me') {
    if (ex.account === 'cash') {
      next.cashLocal = Number((next.cashLocal - sign * amt).toFixed(2));
    } else if (ex.account === 'transit') {
      next.transitPassLocal = Number((next.transitPassLocal - sign * amt).toFixed(2));
    } else {
      next.cardUsd = Number((next.cardUsd - sign * amt * fxToUsd).toFixed(2));
    }
  }

  // Unsettled companion balance mutation
  if (!ex.settled && Math.abs(splitInfo.partnerOwedDeltaLocal) > 0) {
    next.partnerOwedLocal = Number(
      (next.partnerOwedLocal + sign * splitInfo.partnerOwedDeltaLocal).toFixed(2)
    );
  }

  return next;
}

/**
 * Computes personal daily spend (my share) for a specific day.
 */
export function computeMyDailySpendForDay(
  expenses: ExpenseRecord[],
  dayNum: number,
  fallbackDay = 1,
  travelersCount = 2
): number {
  const total = expenses
    .filter((e) => e.bucket === 'daily' && (e.day ?? fallbackDay) === dayNum)
    .reduce(
      (sum, e) =>
        sum + resolveExpenseSplitDetails(e, undefined, '€', 'zh-CN', travelersCount).myAmountLocal,
      0
    );
  return Number(total.toFixed(2));
}

/**
 * Computes whole-bill daily spend for a specific day (for reference comparison).
 */
export function computeGrossDailySpendForDay(
  expenses: ExpenseRecord[],
  dayNum: number,
  fallbackDay = 1
): number {
  const total = expenses
    .filter((e) => e.bucket === 'daily' && (e.day ?? fallbackDay) === dayNum)
    .reduce((sum, e) => sum + (Number(e.amountLocal) || 0), 0);
  return Number(total.toFixed(2));
}

/**
 * Dynamically calculates cumulative rollover from elapsed prior days (1 .. activeDay - 1)
 * using personal daily share, avoiding inflating rollover with unlived future days.
 */
export function computeDynamicRolloverLocal(
  expenses: ExpenseRecord[],
  dailyBudgetLocal: number,
  activeDay: number,
  travelersCount = 2
): number {
  if (activeDay <= 1) return 0;

  const maxLoggedDay = expenses.reduce((maxD, e) => Math.max(maxD, e.day ?? 1), 1);
  let rollover = 0;

  for (let d = 1; d < activeDay; d += 1) {
    const dayHasLogs = expenses.some((e) => (e.day ?? 1) === d);
    // Count prior days that have actually elapsed (up to maxLoggedDay or explicitly logged)
    if (dayHasLogs || d <= maxLoggedDay) {
      const mySpent = computeMyDailySpendForDay(expenses, d, 1, travelersCount);
      rollover += dailyBudgetLocal - mySpent;
    }
  }

  return Number(rollover.toFixed(2));
}

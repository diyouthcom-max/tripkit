import React, { useState, useRef } from 'react';
import { Pencil, Trash2, Check, X, Mail, MailCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  translateDemoExpenseNote,
  translateDemoExpenseTitle,
  translateMemberName,
} from '../i18n';
import { getBudgetPackA } from '../i18n/packs/budgetPackA';
import { getTravelerWalletCopy } from '../i18n/packs/travelerWalletPack';
import {
  formatHomeCurrencyEquivalent,
  loadAppPreferences,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import { isSameCurrency } from '../utils/currencyHelpers';
import type {
  AppLanguage,
  BudgetState,
  ExpenseBucket,
  ExpenseRecord,
  HomeCurrencyCode,
  PaymentAccount,
  SplitMode,
  VatDocStatus,
} from '../types';
import {
  clampSharePct,
  getVatStatusLabel,
  resolveExpenseSplitDetails,
} from '../utils/splitHelpers';
import {
  AccentIconBadge,
  HERO_ACCENT_PALETTE,
  resolveExpenseIconMeta,
} from '../utils/accentTheme';
import { HorizontalChipScroller } from './HorizontalChipScroller';

interface ExpenseLedgerRowProps {
  expense: ExpenseRecord;
  defaultDay: number;
  totalDays: number;
  travelersCount?: number;
  companionName: string;
  currencySymbol: string;
  currencyCode: string;
  fxToUsd: number;
  vatThresholdLocal: number;
  vatProgramName?: string;
  vatRefundPct?: number;
  vatSupportsDestination?: boolean;
  homeCurrency?: HomeCurrencyCode;
  budgetFx?: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> | null;
  isEditing: boolean;
  isSwipedOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Omit<ExpenseRecord, 'id' | 'time'>) => void;
  onDelete: () => void;
  onCycleVatStatus: () => void;
}

const SWIPE_ACTION_WIDTH = 132;

export const ExpenseLedgerRow: React.FC<ExpenseLedgerRowProps> = ({
  expense,
  defaultDay,
  totalDays,
  travelersCount = 2,
  companionName,
  currencySymbol: sym,
  currencyCode,
  fxToUsd,
  vatThresholdLocal,
  vatProgramName = 'Tax-Free',
  vatRefundPct = 12,
  vatSupportsDestination = true,
  homeCurrency: propHomeCurrency,
  budgetFx,
  isEditing,
  isSwipedOpen,
  onSwipeOpenChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCycleVatStatus,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getBudgetPackA(activeLang);
  const walletCopy = getTravelerWalletCopy(activeLang);
  const homeCurrency = propHomeCurrency ?? loadAppPreferences().homeCurrency;
  const displayCompanionName =
    translateMemberName(companionName, activeLang) || copy.companionFallback;
  const isSoloTrip = travelersCount <= 1 && expense.split === 'me';

  const [editTitle, setEditTitle] = useState(expense.title);
  const [editAmt, setEditAmt] = useState(expense.amountLocal.toFixed(2));
  const [editDay, setEditDay] = useState<number>(expense.day ?? defaultDay);
  const [editBucket, setEditBucket] = useState<ExpenseBucket>(expense.bucket);
  const [editAccount, setEditAccount] = useState<PaymentAccount>(expense.account);
  const [editSplit, setEditSplit] = useState<SplitMode>(expense.split);
  const [editSharePct, setEditSharePct] = useState<number>(
    clampSharePct(expense.mySharePct ?? 70)
  );
  const [editPaidBy, setEditPaidBy] = useState<'me' | 'partner'>(
    expense.paidBy === 'partner' ? 'partner' : 'me'
  );
  const [editVatEligible, setEditVatEligible] = useState<boolean>(
    Boolean(expense.vatEligible || (expense.bucket === 'shopping' && expense.amountLocal >= vatThresholdLocal))
  );
  const [editVatStatus, setEditVatStatus] = useState<VatDocStatus>(
    expense.vatStatus ?? 'pending_form'
  );
  const [editNote, setEditNote] = useState(expense.note ?? '');

  // Mobile horizontal touch swipe state
  const [dragOffsetX, setDragOffsetX] = useState<number | null>(null);
  const touchRef = useRef<{
    startX: number;
    startY: number;
    baseOffset: number;
    locked: 'h' | 'v' | null;
  } | null>(null);

  const resetFormFromExpense = () => {
    setEditTitle(expense.title);
    setEditAmt(expense.amountLocal.toFixed(2));
    setEditDay(expense.day ?? defaultDay);
    setEditBucket(expense.bucket);
    setEditAccount(expense.account);
    setEditSplit(expense.split);
    setEditSharePct(clampSharePct(expense.mySharePct ?? 70));
    setEditPaidBy(expense.paidBy === 'partner' ? 'partner' : 'me');
    setEditVatEligible(
      Boolean(expense.vatEligible || (expense.bucket === 'shopping' && expense.amountLocal >= vatThresholdLocal))
    );
    setEditVatStatus(expense.vatStatus ?? 'pending_form');
    setEditNote(expense.note ?? '');
  };

  const handleBeginEdit = () => {
    resetFormFromExpense();
    onSwipeOpenChange(false);
    onStartEdit();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      baseOffset: isSwipedOpen ? -SWIPE_ACTION_WIDTH : 0,
      locked: null,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const st = touchRef.current;
    if (!st || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;

    if (!st.locked) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        st.locked = 'h';
      } else if (Math.abs(dy) > 12) {
        st.locked = 'v';
        return;
      } else {
        return;
      }
    }

    if (st.locked === 'h') {
      const nextOffset = Math.max(
        -SWIPE_ACTION_WIDTH - 16,
        Math.min(12, st.baseOffset + dx)
      );
      setDragOffsetX(nextOffset);
    }
  };

  const handleTouchEnd = () => {
    const st = touchRef.current;
    touchRef.current = null;
    if (!st || st.locked !== 'h' || dragOffsetX === null) {
      setDragOffsetX(null);
      return;
    }
    const shouldOpen = dragOffsetX < -SWIPE_ACTION_WIDTH * 0.42;
    setDragOffsetX(null);
    onSwipeOpenChange(shouldOpen);
  };

  if (isEditing) {
    const parsedAmt = Math.max(0, parseFloat(editAmt) || 0);
    const ratioPreview = resolveExpenseSplitDetails(
      {
        amountLocal: parsedAmt,
        split: 'ratio',
        mySharePct: editSharePct,
        paidBy: editPaidBy,
      },
      displayCompanionName,
      sym,
      activeLang,
      travelersCount
    );

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTitle.trim() || parsedAmt <= 0) return;
      const isShopping = editBucket === 'shopping';
      const finalVatEligible = isShopping && editVatEligible;
      const nextAmt = Number(parsedAmt.toFixed(2));
      const nextMyPct = editSplit === 'ratio' ? clampSharePct(editSharePct) : undefined;
      const nextPaidBy = editSplit === 'ratio' ? editPaidBy : undefined;
      const splitFinancialChanged =
        Math.abs(nextAmt - expense.amountLocal) > 0.005 ||
        editSplit !== expense.split ||
        nextMyPct !== expense.mySharePct ||
        nextPaidBy !== expense.paidBy;

      onSaveEdit({
        day: editDay,
        title: editTitle.trim(),
        amountLocal: nextAmt,
        bucket: editBucket,
        account: editAccount,
        split: editSplit,
        mySharePct: nextMyPct,
        paidBy: nextPaidBy,
        vatEligible: finalVatEligible,
        vatStatus: finalVatEligible ? editVatStatus : undefined,
        settled: splitFinancialChanged ? false : expense.settled,
        note: editNote.trim() ? editNote.trim() : undefined,
      });
    };

    return (
      <form onSubmit={handleSave} className="px-5 py-4 bg-[#FAFDFC] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#076E6A]">
            {copy.editHeader}
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> {t('common.cancel')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={copy.descPlaceholder}
            className="sm:col-span-2 rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-sm text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={editAmt}
            onChange={(e) => {
              const v = e.target.value;
              setEditAmt(v);
              const num = parseFloat(v) || 0;
              if (editBucket === 'shopping' && num >= vatThresholdLocal) {
                setEditVatEligible(true);
              }
            }}
            placeholder={copy.amtPlaceholder(currencyCode)}
            className="rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-sm font-num tabular-nums text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
        </div>

        <HorizontalChipScroller
          activeKey={editDay}
          fadeBgClassName="from-[#FAFDFC]"
          ariaLabel={copy.selectDayAria}
        >
          {Array.from({ length: Math.max(1, totalDays) }, (_, idx) => {
            const d = idx + 1;
            const isSelected = d === editDay;
            return (
              <button
                key={d}
                type="button"
                data-chip-active={isSelected ? 'true' : undefined}
                onClick={() => setEditDay(d)}
                className={`min-h-[32px] inline-flex items-center gap-1 rounded-full px-3 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-[#093B35] bg-[#093B35] text-white'
                    : 'border-[#DCE8E5] bg-white text-[#354E4B] hover:border-[#B8D8D4] hover:text-[#152B29]'
                }`}
              >
                <span className="font-num font-bold">D{d}</span>
              </button>
            );
          })}
        </HorizontalChipScroller>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={editBucket}
            onChange={(e) => {
              const nextB = e.target.value as ExpenseBucket;
              setEditBucket(nextB);
              if (nextB === 'shopping' && parsedAmt >= vatThresholdLocal) {
                setEditVatEligible(true);
              }
            }}
            className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-2 text-xs font-semibold text-[#152B29]"
          >
            <option value="daily">{copy.bucketDaily}</option>
            <option value="shopping">{copy.bucketShopping}</option>
            <option value="prepaid">{copy.bucketPrepaid}</option>
          </select>

          <select
            value={editAccount}
            onChange={(e) => setEditAccount(e.target.value as PaymentAccount)}
            className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-2 text-xs font-semibold text-[#152B29]"
          >
            <option value="card">{t('budget.walletCard')}</option>
            <option value="cash">{t('budget.walletCash')}</option>
            <option value="transit">{t('budget.walletTransit')}</option>
          </select>

          <select
            value={editSplit}
            onChange={(e) => setEditSplit(e.target.value as SplitMode)}
            className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-2 text-xs font-semibold text-[#152B29]"
          >
            <option value="me">{copy.allMine100}</option>
            {!isSoloTrip && (
              <>
                <option value="split">
                  {travelersCount > 2
                    ? copy.splitMultiShort(travelersCount)
                    : copy.split50Short}
                </option>
                <option value="ratio">{copy.customSplitPctOpt}</option>
                <option value="partner">
                  {travelersCount > 2
                    ? copy.paidByPartnerMulti(displayCompanionName, travelersCount)
                    : copy.paidByPartnerPair(displayCompanionName)}
                </option>
              </>
            )}
          </select>
        </div>

        {editSplit === 'ratio' && (
          <div className="py-2.5 border-y border-[#E5EFED] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[#EFF5F4] p-0.5">
                <button
                  type="button"
                  onClick={() => setEditPaidBy('me')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    editPaidBy === 'me'
                      ? 'bg-white text-[#152B29] shadow-2xs'
                      : 'text-[#5B7370]'
                  }`}
                >
                  {copy.iPaid}
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaidBy('partner')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    editPaidBy === 'partner'
                      ? 'bg-white text-[#152B29] shadow-2xs'
                      : 'text-[#5B7370]'
                  }`}
                >
                  {copy.partnerPaidBtn(displayCompanionName)}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {[70, 60, 40, 30, 0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setEditSharePct(pct)}
                    className={`rounded-md px-2 py-1 font-num text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      editSharePct === pct
                        ? 'bg-[#078C88] text-white'
                        : 'bg-white border border-[#DCE8E5] text-[#4F6865]'
                    }`}
                  >
                    {pct}:{100 - pct}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#3B5552] whitespace-nowrap shrink-0">
                {copy.myShareLabel}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={editSharePct}
                onChange={(e) => setEditSharePct(clampSharePct(Number(e.target.value)))}
                className="flex-1 accent-[#078C88] cursor-pointer"
              />
              <div className="inline-flex items-center gap-1 shrink-0 font-num text-xs tabular-nums">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editSharePct}
                  onChange={(e) => setEditSharePct(clampSharePct(Number(e.target.value)))}
                  className="w-13 rounded-lg border border-[#DCE8E5] bg-white px-1.5 py-1 text-center font-bold text-[#152B29]"
                />
                <span className="text-[#5B7370]">%</span>
              </div>
            </div>

            <div className="text-xs text-[#4F6865] font-num tabular-nums">
              {ratioPreview.breakdownLabel}
            </div>
          </div>
        )}

        {editBucket === 'shopping' && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 font-semibold text-[#3B5552] cursor-pointer">
              <input
                type="checkbox"
                checked={editVatEligible}
                onChange={(e) => setEditVatEligible(e.target.checked)}
                className="rounded border-[#DCE8E5] accent-[#078C88]"
              />
              {copy.includeVatPool(sym, vatThresholdLocal)}
            </label>
            {editVatEligible && (
              <select
                value={editVatStatus}
                onChange={(e) => setEditVatStatus(e.target.value as VatDocStatus)}
                className="rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#076E6A]"
              >
                <option value="pending_form">{getVatStatusLabel('pending_form', activeLang)}</option>
                <option value="form_ready">{getVatStatusLabel('form_ready', activeLang)}</option>
                <option value="stamped">{getVatStatusLabel('stamped', activeLang)}</option>
              </select>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder={copy.notePlaceholder}
            className="flex-1 min-w-[180px] rounded-xl border border-[#DCE8E5] bg-white px-3 py-1.5 text-xs text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-xl border border-[#F0CECA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B83B2E] hover:bg-[#FDF3F2] whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> {copy.deleteEntry}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-[#078C88] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] whitespace-nowrap cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> {copy.saveChanges}
            </button>
          </div>
        </div>
      </form>
    );
  }

  const bucketLabel =
    expense.bucket === 'daily'
      ? copy.bucketDaily
      : expense.bucket === 'shopping'
      ? copy.bucketShopping
      : copy.bucketPrepaid;
  const acctLabel =
    expense.account === 'cash'
      ? t('budget.walletCash')
      : expense.account === 'card'
      ? t('budget.walletCard')
      : t('budget.walletTransit');
  const splitInfo = resolveExpenseSplitDetails(
    expense,
    displayCompanionName,
    sym,
    activeLang,
    travelersCount
  );
  const isVatItem = Boolean(
    expense.vatEligible ||
      (vatSupportsDestination &&
        expense.bucket === 'shopping' &&
        vatThresholdLocal > 0 &&
        expense.amountLocal >= vatThresholdLocal)
  );
  const vatStatusKey: VatDocStatus = expense.vatStatus ?? 'pending_form';
  const expenseIconMeta = resolveExpenseIconMeta(expense);
  const upperTripCode = (currencyCode || 'EUR').trim().toUpperCase();
  const upperHomeCode = (homeCurrency || 'USD').trim().toUpperCase();
  const isCrossCurrency = !isSameCurrency(upperTripCode, upperHomeCode);
  const VatBadgeIcon = vatStatusKey === 'pending_form' ? Mail : MailCheck;

  return (
    <div className="relative overflow-hidden select-none">
      {/* Right-side Swipe Action Tray (Mobile Left-Swipe) */}
      <div
        className={`absolute inset-y-0 right-0 flex items-stretch transition-opacity ${
          isSwipedOpen || (dragOffsetX !== null && dragOffsetX < -12)
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isSwipedOpen && dragOffsetX === null}
      >
        <button
          type="button"
          onClick={handleBeginEdit}
          className="w-[66px] bg-[#078C88] text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 active:bg-[#067572] cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{t('common.edit')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSwipeOpenChange(false);
            onDelete();
          }}
          className="w-[66px] bg-[#B83B2E] text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 active:bg-[#9E3126] cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{t('common.delete')}</span>
        </button>
      </div>

      {/* Foreground Ledger Row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isSwipedOpen) onSwipeOpenChange(false);
        }}
        className={`relative bg-white px-4 sm:px-5 py-3.5 space-y-2 hover:bg-[#FAFDFC] transition-transform duration-150 ease-out ${
          (dragOffsetX !== null && dragOffsetX < -48) || (dragOffsetX === null && isSwipedOpen)
            ? '-translate-x-[132px]'
            : dragOffsetX !== null && dragOffsetX < -16
            ? '-translate-x-12'
            : 'translate-x-0'
        }`}
      >
        {/* Golden Amber VAT Envelope Corner Badge (Only for Qualifying Tax-Free Purchases) */}
        {isVatItem && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCycleVatStatus();
              }}
              title={copy.cycleVatTitle}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-tight transition-all cursor-pointer active:scale-[0.98] ${
                vatStatusKey === 'stamped'
                  ? 'border-[#96D9BE] bg-[#EAF8F2] text-[#0A6A4B] hover:bg-[#DCF4E9]'
                  : vatStatusKey === 'form_ready'
                  ? 'border-[#E6BE5A] bg-[#FFF6D6] text-[#8A5406] shadow-[0_1px_6px_-2px_rgba(217,155,38,0.35)] hover:bg-[#FFEFBD]'
                  : 'border-[#EBD08A] bg-[#FFFBEB] text-[#9A630D] hover:bg-[#FFF3CC]'
              }`}
            >
              <VatBadgeIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {walletCopy.vatEnvelopeLabel(vatProgramName, vatStatusKey, vatRefundPct)}
              </span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <AccentIconBadge
              accent={expenseIconMeta.accent}
              icon={expenseIconMeta.Icon}
              size="md"
              title={bucketLabel}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#152B29] truncate">
                  {translateDemoExpenseTitle(expense.title, activeLang)}
                </span>
                {expense.settled && expense.split !== 'me' && (
                  <span className="text-[11px] font-medium text-[#7B928E] shrink-0">
                    · {copy.settledBadge}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#5B7370]">
                <span className="font-num font-semibold text-[#078C88] tabular-nums">
                  Day {expense.day ?? defaultDay}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-num tabular-nums">{expense.time}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-semibold ${HERO_ACCENT_PALETTE[expenseIconMeta.accent].textClass}`}
                >
                  {bucketLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{acctLabel}</span>
                {expense.split !== 'me' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={expense.split === 'ratio' ? 'font-semibold text-[#076E6A]' : ''}>
                      {splitInfo.shortLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-[#647B78]">
                      {copy.mySharePrefix}
                      {sym}
                      {splitInfo.myAmountLocal.toFixed(2)}
                    </span>
                  </>
                )}
              </div>

              {expense.note && (
                <p className="mt-0.5 text-xs text-[#7B928E]">
                  {translateDemoExpenseNote(expense.note, activeLang)}
                </p>
              )}
            </div>
          </div>

          {/* Dual-Line Currency Hierarchy: Primary Local Currency + Code, Secondary Home Equivalent + Card Settlement Ref */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="font-num text-sm font-bold text-[#152B29] tabular-nums whitespace-nowrap">
                <span className="text-[#B83B2E]">
                  -{sym}
                  {expense.amountLocal.toFixed(2)}
                </span>{' '}
                <span className="text-[11px] font-semibold text-[#5B7370]">
                  {upperTripCode}
                </span>
              </div>
              {isCrossCurrency ? (
                <div className="mt-0.5 font-num text-[11px] text-[#647B78] tabular-nums whitespace-nowrap">
                  ≈{' '}
                  {formatHomeCurrencyEquivalent(
                    expense.amountLocal,
                    upperTripCode,
                    fxToUsd,
                    homeCurrency,
                    budgetFx ?? undefined
                  )}{' '}
                  {upperHomeCode}
                  {expense.account === 'card' && (
                    <span className="ml-1 text-[#7D9490]">
                      · {walletCopy.cardBillRefTag}
                    </span>
                  )}
                </div>
              ) : (
                expense.account === 'card' && (
                  <div className="mt-0.5 text-[11px] text-[#7D9490] whitespace-nowrap">
                    {walletCopy.cardBillRefTag}
                  </div>
                )
              )}
            </div>

            {/* Desktop / Tap Quick Edit & Delete Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBeginEdit();
                }}
                aria-label={copy.editAria(expense.title)}
                title={copy.editTitle}
                className="h-8 w-8 rounded-lg text-[#647B78] hover:bg-[#EFF9F8] hover:text-[#078C88] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label={copy.deleteAria(expense.title)}
                title={copy.deleteTitle}
                className="h-8 w-8 rounded-lg text-[#647B78] hover:bg-[#FDF3F2] hover:text-[#B83B2E] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

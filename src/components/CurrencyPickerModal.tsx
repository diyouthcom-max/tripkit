import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import type { AppLanguage, BudgetState, HomeCurrencyCode } from '../types';
import {
  CURRENCY_CATALOG,
  filterCurrencySpecs,
  isHomeCurrencyCode,
  normalizeToHomeCurrencyCode,
  refreshLiveUsdRates,
  resolveExchangeRate,
} from '../utils/currencyHelpers';
import {
  getCurrencyPickerCopy,
  localizeCurrencyName,
} from '../i18n/packs/settingsAndProPack';

export interface CurrencyPickerModalProps {
  open: boolean;
  onClose: () => void;
  selectedCurrency: HomeCurrencyCode;
  onSelectCurrency: (code: HomeCurrencyCode) => void;
  /** Optional current trip destination currency (e.g. "JPY", "EUR", "THB") pinned at top like Packy AI */
  tripCurrencyCode?: string;
  tripCurrencySymbol?: string;
  intelFxToUsd?: number;
  budgetFx?: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> | null;
  language: AppLanguage;
}

export const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  open,
  onClose,
  selectedCurrency,
  onSelectCurrency,
  tripCurrencyCode,
  intelFxToUsd,
  budgetFx,
  language,
}) => {
  const copy = getCurrencyPickerCopy(language);
  const [query, setQuery] = useState('');
  const [syncingRates, setSyncingRates] = useState(false);
  const [, setRatesTick] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedTripCode: HomeCurrencyCode | null = useMemo(() => {
    if (!tripCurrencyCode) return null;
    const upper = tripCurrencyCode.trim().toUpperCase();
    return isHomeCurrencyCode(upper) ? normalizeToHomeCurrencyCode(upper) : null;
  }, [tripCurrencyCode]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    let active = true;
    setSyncingRates(true);
    void refreshLiveUsdRates(false).then(() => {
      if (active) {
        setSyncingRates(false);
        setRatesTick((t) => t + 1);
      }
    });

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const pinnedTripSpec = useMemo(() => {
    if (!normalizedTripCode) return null;
    const spec = CURRENCY_CATALOG[normalizedTripCode];
    const q = query.trim().toLowerCase();
    if (!q) return spec;
    const match =
      spec.code.toLowerCase().includes(q) ||
      spec.nameZh.toLowerCase().includes(q) ||
      spec.nameEn.toLowerCase().includes(q) ||
      spec.symbol.toLowerCase().includes(q) ||
      spec.keywords.toLowerCase().includes(q);
    return match ? spec : null;
  }, [normalizedTripCode, query]);

  const otherSpecs = useMemo(
    () => filterCurrencySpecs(query, normalizedTripCode ?? undefined),
    [query, normalizedTripCode]
  );

  if (!open) return null;

  const formatRatePreview = (targetCode: HomeCurrencyCode): string | null => {
    const baseCode = normalizedTripCode || 'USD';
    if (baseCode === targetCode) return null;
    const { rate } = resolveExchangeRate({
      fromCode: baseCode,
      toCode: targetCode,
      intelFxToUsd,
      tripCurrencyCode: baseCode,
      budgetFx,
    });
    if (!Number.isFinite(rate) || rate <= 0) return null;
    const formatted =
      rate >= 100
        ? rate.toFixed(1)
        : rate >= 1
        ? rate.toFixed(2)
        : rate.toFixed(4);
    return `1 ${baseCode} ≈ ${formatted} ${targetCode}`;
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-picker-modal-title"
      className="fixed inset-0 z-50 bg-[#082220]/50 backdrop-blur-xs p-0 sm:p-4 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[#DCE8E5] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
      >
        {/* Packy-Style Sheet Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full bg-[#CBDAD7] mx-auto mt-3 shrink-0"
        />

        {/* Header */}
        <div className="px-5 pt-3 pb-2.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2
              id="currency-picker-modal-title"
              className="text-lg font-extrabold tracking-tight text-[#152B29]"
            >
              {copy.title}
            </h2>
            <p className="text-xs text-[#647B78]">{copy.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-[#4F6865] hover:bg-[#F2F6F5] hover:text-[#152B29] transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar (Packy Style: "Search, e.g. THB") */}
        <div className="px-5 pb-3 border-b border-[#EDF3F1] shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3.5 py-2 focus-within:border-[#078C88] focus-within:bg-white transition-colors">
            <Search className="h-4 w-4 text-[#7D938F] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.placeholder}
              className="flex-1 min-w-0 bg-transparent text-sm text-[#152B29] placeholder:text-[#889F9B] focus:outline-none"
            />
            {syncingRates && (
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin text-[#078C88] shrink-0"
                aria-label={copy.refreshing}
              />
            )}
            {query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
              >
                {copy.clear}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Currency List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F2F6F5] px-2 py-1">
          {/* Pinned Row: Current Trip Currency */}
          {pinnedTripSpec && (
            <button
              type="button"
              onClick={() => {
                onSelectCurrency(pinnedTripSpec.code);
                onClose();
              }}
              className="w-full px-3.5 py-3.5 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-[#F5FAF9] transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-num text-base font-extrabold text-[#152B29]">
                    {pinnedTripSpec.code}
                  </span>
                  <span className="text-xs font-semibold text-[#5B7370]">
                    {localizeCurrencyName(
                      pinnedTripSpec.code,
                      pinnedTripSpec.nameZh,
                      pinnedTripSpec.nameEn,
                      language
                    )}{' '}
                    ({pinnedTripSpec.symbol})
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-medium text-[#077A76]">
                  {copy.tripCurrencyTag}
                </div>
              </div>

              {selectedCurrency === pinnedTripSpec.code && (
                <Check className="h-5 w-5 text-[#078C88] shrink-0" />
              )}
            </button>
          )}

          {/* Global Currencies List */}
          {otherSpecs.map((spec) => {
            const active = selectedCurrency === spec.code;
            const rateHint = formatRatePreview(spec.code);
            return (
              <button
                key={spec.code}
                type="button"
                onClick={() => {
                  onSelectCurrency(spec.code);
                  onClose();
                }}
                className="w-full px-3.5 py-3 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-[#F8FAF9] transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-num text-[15px] font-bold text-[#152B29] w-11 shrink-0">
                      {spec.code}
                    </span>
                    <span className="text-xs font-medium text-[#4F6865] truncate">
                      {localizeCurrencyName(spec.code, spec.nameZh, spec.nameEn, language)} (
                      {spec.symbol})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {rateHint && (
                    <span className="font-num text-[11px] text-[#7D938F] tabular-nums hidden sm:inline">
                      {rateHint}
                    </span>
                  )}
                  {active ? (
                    <Check className="h-5 w-5 text-[#078C88] shrink-0" />
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}

          {!pinnedTripSpec && otherSpecs.length === 0 && (
            <div className="py-10 text-center text-xs text-[#647B78]">
              {copy.emptyMatch(query)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

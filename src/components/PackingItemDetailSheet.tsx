import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Minus,
  Pencil,
  Pin,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  translateDemoPackItemName,
  translateDemoPackItemWhy,
  translateGroupTitleLabel,
  translateMemberName,
} from '../i18n';
import {
  estimateDefaultUnitWeightGrams,
  getItemQuantity,
  getItemUnitWeight,
  getLocalizedSmartBagSpecs,
  isItemCarryOnWeight,
  isSmartBagCarryOn,
  parseNameAndQuantity,
  resolveItemSmartBag,
} from '../utils/packingHelpers';
import { formatItemWeightByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import { buildGearAffiliateOffers } from '../utils/affiliateHelpers';
import { isDigitalOrPassCandidateItem } from '../utils/offlinePassVault';
import { getPackingItemDetailCopy } from '../i18n/packs/packingModalsPack';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  CrewMember,
  PackingGroup,
  PackingItem,
  SmartBagId,
  TripIntelligence,
  UnitSystem,
} from '../types';

export interface PackingItemDetailSheetProps {
  open: boolean;
  group: PackingGroup | null;
  item: PackingItem | null;
  groups: PackingGroup[];
  crew: CrewMember[];
  intel: TripIntelligence;
  cities: string[];
  smartBagOverrides: Record<string, SmartBagId>;
  unitSystem: UnitSystem;
  affiliatePartners?: Partial<AffiliatePartnerConfig>;
  onClose: () => void;
  onAdjustQuantity: (groupId: string, itemId: string, delta: number) => void;
  onUpdateItemSilent: (
    groupId: string,
    itemId: string,
    updates: Partial<PackingItem>,
    targetGroupId?: string
  ) => void;
  onSaveRenameAndNote: (
    groupId: string,
    itemId: string,
    nextName: string,
    nextWhy: string
  ) => void;
  onSwitchCabinCheckIn: (
    groupId: string,
    itemId: string,
    targetLocation: 'cabin' | 'checkin'
  ) => void;
  onAssignSmartBag: (
    itemId: string,
    bagId: SmartBagId | null,
    itemName?: string
  ) => void;
  onToggleAlwaysPack: (groupId: string, itemId: string) => void;
  onToggleToBuy: (groupId: string, itemId: string) => void;
  onToggleMorningOfDeparture: (groupId: string, itemId: string) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onDontSuggestAgain: (groupId: string, itemId: string) => void;
  onOpenInGoMode?: (item: PackingItem, groupId: string) => void;
}

export const PackingItemDetailSheet: React.FC<PackingItemDetailSheetProps> = ({
  open,
  group,
  item,
  groups,
  crew,
  intel,
  cities,
  smartBagOverrides,
  unitSystem,
  affiliatePartners,
  onClose,
  onAdjustQuantity,
  onUpdateItemSilent,
  onSaveRenameAndNote,
  onSwitchCabinCheckIn,
  onAssignSmartBag,
  onToggleAlwaysPack,
  onToggleToBuy,
  onToggleMorningOfDeparture,
  onDeleteItem,
  onDontSuggestAgain,
  onOpenInGoMode,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getPackingItemDetailCopy(activeLang);
  const shouldReduceMotion = useReducedMotion();

  const localizedBagSpecs = useMemo(
    () => getLocalizedSmartBagSpecs(activeLang),
    [activeLang]
  );

  const [weightInputText, setWeightInputText] = useState<string>('0');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [subCategoryText, setSubCategoryText] = useState('');
  const [noteText, setNoteText] = useState('');
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const unitWeightGrams = useMemo(() => {
    if (!item || !group) return 0;
    return getItemUnitWeight(item, group.id);
  }, [item, group]);

  useEffect(() => {
    if (item && group) {
      setWeightInputText(String(getItemUnitWeight(item, group.id)));
    }
  }, [item?.id, unitWeightGrams, group]);

  useEffect(() => {
    setIsRenaming(false);
    if (item) {
      const { cleanName } = parseNameAndQuantity(item.name);
      setRenameText(cleanName || item.name);
      setSubCategoryText(item.subCategory || '');
      setNoteText(item.why || '');
    }
  }, [item?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const offers = useMemo(() => {
    if (!item) return [];
    return buildGearAffiliateOffers(
      item.name,
      intel,
      cities,
      activeLang,
      affiliatePartners
    );
  }, [item, intel, cities, activeLang, affiliatePartners]);

  if (!open || !item || !group) {
    return null;
  }

  const quantity = getItemQuantity(item);
  const totalWeightGrams = Math.max(0, unitWeightGrams * quantity);
  const currentBagId = resolveItemSmartBag(item, group, smartBagOverrides);
  const currentBagSpec =
    localizedBagSpecs.find((b) => b.id === currentBagId) || localizedBagSpecs[0];
  const isCabin = isItemCarryOnWeight(item, group, smartBagOverrides);

  const displayTitle = translateDemoPackItemName(item.name, activeLang);
  const displayWhy = translateDemoPackItemWhy(item.why, activeLang);

  const formattedTotalWeight = copy.formatTotalWeight(
    formatItemWeightByPref(totalWeightGrams, unitSystem)
  );

  const commitWeightString = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? 0 : Math.max(0, Math.min(30000, Math.round(Number(trimmed) || 0)));
    setWeightInputText(String(parsed));
    if (parsed !== unitWeightGrams) {
      onUpdateItemSilent(group.id, item.id, {
        unitWeightGrams: parsed,
        weightGrams: parsed * quantity,
      });
    }
  };

  const handleOpenRename = () => {
    const { cleanName } = parseNameAndQuantity(item.name);
    setRenameText(cleanName || item.name);
    setSubCategoryText(item.subCategory || '');
    setNoteText(item.why || '');
    setIsRenaming(true);
    sheetScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 60);
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameText.trim();
    if (!clean) return;
    onSaveRenameAndNote(group.id, item.id, clean, noteText.trim());
    const nextSub = subCategoryText.trim();
    if ((item.subCategory || '') !== nextSub) {
      onUpdateItemSilent(group.id, item.id, {
        subCategory: nextSub || undefined,
      });
    }
    setIsRenaming(false);
  };

  const primaryOffer = offers[0];
  const secondaryOffer = offers[1];

  const primaryStoreTitle = (() => {
    if (!primaryOffer) return copy.buyOnDefault;
    if (primaryOffer.merchant === 'Airalo') {
      return copy.buyOnAiralo;
    }
    return copy.buyOnMerchant(primaryOffer.merchant);
  })();

  const storeDisclosureText = (() => {
    if (affiliatePartners?.disclosureEnabled === false) {
      return primaryOffer?.sublabel || '';
    }
    if (primaryOffer?.merchant === 'Airalo') {
      return copy.disclosureAiralo;
    }
    return copy.disclosureMerchant;
  })();

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={displayTitle}
        >
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          {/* Bottom Sheet / Modal Surface */}
          <motion.div
            ref={sheetScrollRef}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full sm:max-w-[468px] max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#F3F6F5] px-4 sm:px-5 pt-3 pb-6 shadow-2xl space-y-3.5"
          >
            {/* Top Grab Handle & Close Affordance */}
            <div className="relative flex items-center justify-center pt-0.5">
              <div
                className="h-1.5 w-11 rounded-full bg-[#647370]/65"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.closeAria}
                className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full text-[#5B7370] hover:bg-black/5 hover:text-[#152B29] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sheet Header: Item Title + Cabin/Check-in & Weight Subtitle (or Inline Rename) */}
            {isRenaming ? (
              <form
                onSubmit={handleConfirmRename}
                className="rounded-2xl bg-white border border-[#DCE8E5] p-3.5 space-y-2.5"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                    {copy.itemNameLabel}
                  </label>
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    placeholder={copy.itemNamePlaceholder}
                    className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-sm font-bold text-[#152B29] focus:border-[#078C88] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                    {copy.subCategoryLabel}
                  </label>
                  <input
                    type="text"
                    value={subCategoryText}
                    onChange={(e) => setSubCategoryText(e.target.value)}
                    placeholder={copy.subCategoryPlaceholder}
                    className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#3B5552] focus:border-[#078C88] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                    {copy.noteLabel}
                  </label>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={copy.notePlaceholder}
                    className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#3B5552] focus:border-[#078C88] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="min-h-[38px] rounded-xl border border-[#DCE8E5] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5B7370] hover:text-[#152B29] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copy.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    className="min-h-[38px] rounded-xl bg-[#0B3B38] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#075854] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copy.saveBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-1 pt-0.5 space-y-1">
                <h2 className="text-xl sm:text-[22px] font-bold tracking-tight text-[#152B29] leading-snug pr-8">
                  {displayTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-[#5B7370] tabular-nums">
                  <span>{isCabin ? copy.cabinTag : copy.checkinTag}</span>
                  {item.subCategory?.trim() && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#076E6A] font-medium">{item.subCategory.trim()}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{formattedTotalWeight}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentBagSpec.shortLabel}</span>
                </div>
                {displayWhy && (
                  <p className="text-xs text-[#748B88] line-clamp-1">{displayWhy}</p>
                )}
              </div>
            )}

            {/* Card Group 1: Instant Parameters (Quantity, Weight, Bag + Organiser Fine-Tuning) */}
            <div className="rounded-2xl bg-white border border-[#E6ECEA] divide-y divide-[#EEF3F1] overflow-hidden">
              {/* Row 1: Quantity */}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[64px]">
                <span className="text-[15px] font-semibold text-[#152B29]">
                  {copy.quantityLabel}
                </span>

                <div className="inline-flex items-center rounded-full bg-[#F1F4F3] p-1 shrink-0">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => onAdjustQuantity(group.id, item.id, -1)}
                    aria-label={copy.decreaseQtyAria}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#152B29] hover:bg-white disabled:text-[#A9B8B6] disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <Minus className="h-4 w-4 stroke-[2.2]" />
                  </button>
                  <span className="min-w-9 text-center font-num tabular-nums text-[15px] font-bold text-[#152B29]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= 99}
                    onClick={() => onAdjustQuantity(group.id, item.id, 1)}
                    aria-label={copy.increaseQtyAria}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#152B29] hover:bg-white disabled:text-[#A9B8B6] transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Row 2: Weight (Per item · estimated, supports 0g) */}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[68px]">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[#152B29]">
                    {copy.weightLabel}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#647B78]">
                    <span>{copy.weightSub}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const est = estimateDefaultUnitWeightGrams(item.name, group.id);
                        setWeightInputText(String(est));
                        onUpdateItemSilent(group.id, item.id, {
                          unitWeightGrams: est,
                          weightGrams: est * quantity,
                        });
                      }}
                      className="text-[#078C88] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.resetEstBtn}
                    </button>
                  </div>
                </div>

                <label className="inline-flex items-center justify-center rounded-full bg-[#F1F4F3] focus-within:ring-2 focus-within:ring-[#078C88]/35 focus-within:bg-white px-3.5 h-10 min-w-[108px] shrink-0 transition-colors cursor-text">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30000}
                    step={5}
                    value={weightInputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeightInputText(val);
                      if (val !== '' && Number.isFinite(Number(val))) {
                        const clamped = Math.max(0, Math.min(30000, Math.round(Number(val))));
                        onUpdateItemSilent(group.id, item.id, {
                          unitWeightGrams: clamped,
                          weightGrams: clamped * quantity,
                        });
                      }
                    }}
                    onBlur={(e) => commitWeightString(e.target.value)}
                    aria-label={copy.weightInputAria}
                    className="w-16 bg-transparent text-center font-num tabular-nums text-[15px] font-bold text-[#152B29] focus:outline-none"
                  />
                  <span className="text-xs font-medium text-[#647B78] ml-0.5">g</span>
                </label>
              </div>

              {/* Row 3: Bag (Cabin vs Check-in Segmented Control) */}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[68px]">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[#152B29]">
                    {copy.bagLabel}
                  </div>
                  <div className="text-xs text-[#647B78]">{copy.bagSub}</div>
                </div>

                <div className="inline-flex items-center rounded-full bg-[#F1F4F3] p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCabin) {
                        onSwitchCabinCheckIn(group.id, item.id, 'cabin');
                      }
                    }}
                    className={`min-h-[36px] px-3.5 rounded-full text-xs sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isCabin
                        ? 'bg-[#0B3B38] text-white'
                        : 'text-[#4E6663] hover:text-[#152B29]'
                    }`}
                  >
                    {copy.cabinTag}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCabin) {
                        onSwitchCabinCheckIn(group.id, item.id, 'checkin');
                      }
                    }}
                    className={`min-h-[36px] px-3.5 rounded-full text-xs sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !isCabin
                        ? 'bg-[#0B3B38] text-white'
                        : 'text-[#4E6663] hover:text-[#152B29]'
                    }`}
                  >
                    {copy.checkinTag}
                  </button>
                </div>
              </div>

              {/* Row 4 (Fusion Fine-Tune): 9-Bag Cube, Category & Crew Member */}
              <div className="px-4 py-3 bg-[#FAFDFC] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[#5B7370] whitespace-nowrap">
                  {copy.organiserLabel}
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* 9-Bag Cube Selector */}
                  <select
                    value={currentBagId}
                    onChange={(e) => {
                      const nextBag = e.target.value as SmartBagId;
                      onAssignSmartBag(item.id, nextBag, item.name);
                      onUpdateItemSilent(group.id, item.id, {
                        smartBagId: nextBag,
                        carryOnOnly: isSmartBagCarryOn(nextBag),
                      });
                    }}
                    aria-label={copy.selectBagAria}
                    className="min-h-[32px] rounded-lg border border-[#DCE8E5] bg-white px-2 py-1 font-semibold text-[#076E6A] focus:border-[#078C88] focus:outline-none cursor-pointer"
                  >
                    {localizedBagSpecs.map((bOpt) => (
                      <option key={bOpt.id} value={bOpt.id}>
                        {bOpt.shortLabel}
                      </option>
                    ))}
                  </select>

                  {/* Category Selector */}
                  <select
                    value={group.id}
                    onChange={(e) => {
                      const nextGroupId = e.target.value;
                      if (nextGroupId !== group.id) {
                        onUpdateItemSilent(group.id, item.id, {}, nextGroupId);
                      }
                    }}
                    aria-label={copy.selectCategoryAria}
                    className="min-h-[32px] rounded-lg border border-[#DCE8E5] bg-white px-2 py-1 font-semibold text-[#152B29] focus:border-[#078C88] focus:outline-none cursor-pointer"
                  >
                    {groups.map((gOpt) => (
                      <option key={gOpt.id} value={gOpt.id}>
                        {translateGroupTitleLabel(gOpt.id, gOpt.title, activeLang)}
                      </option>
                    ))}
                  </select>

                  {/* Crew Owner Selector (shown when multi-traveler) */}
                  {crew.length > 1 && (
                    <select
                      value={item.ownerId || crew[0]?.id || 'm1'}
                      onChange={(e) => {
                        onUpdateItemSilent(group.id, item.id, {
                          ownerId: e.target.value,
                        });
                      }}
                      aria-label={copy.assignMemberAria}
                      className="min-h-[32px] rounded-lg border border-[#DCE8E5] bg-white px-2 py-1 font-semibold text-[#152B29] focus:border-[#078C88] focus:outline-none cursor-pointer"
                    >
                      {crew.map((m) => (
                        <option key={m.id} value={m.id}>
                          {translateMemberName(m.name, activeLang)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Card Group 2: Smart Actions & Affiliate Commerce */}
            <div className="rounded-2xl bg-white border border-[#E6ECEA] divide-y divide-[#EEF3F1] overflow-hidden">
              {/* Action 0: Go-Mode Offline Ticket Wallet Bridge for 0g Digital Passes & Vouchers */}
              {onOpenInGoMode && isDigitalOrPassCandidateItem(item, group.id) && (
                <button
                  type="button"
                  onClick={() => {
                    const targetItem = item;
                    const targetGroupId = group.id;
                    onClose();
                    onOpenInGoMode(targetItem, targetGroupId);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left bg-[#F4FBF9] hover:bg-[#EAF7F4] transition-colors cursor-pointer min-h-[64px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <QrCode className="h-5 w-5 shrink-0 text-[#078C88]" />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-[#093B35]">
                        {copy.goModeTitle}
                      </div>
                      <div className="text-xs text-[#4F6865]">{copy.goModeSub}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#078C88]" />
                </button>
              )}

              {/* Action 1: Always pack this */}
              <button
                type="button"
                onClick={() => onToggleAlwaysPack(group.id, item.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer min-h-[64px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Pin
                    className={`h-5 w-5 shrink-0 ${
                      item.alwaysPack ? 'text-[#078C88]' : 'text-[#4F6865]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#152B29]">
                      {copy.alwaysPackTitle}
                    </div>
                    <div className="text-xs text-[#647B78]">{copy.alwaysPackSub}</div>
                  </div>
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    item.alwaysPack
                      ? 'border-[#078C88] bg-[#078C88] text-white'
                      : 'border-[#CBD8D5] bg-white text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                </span>
              </button>

              {/* Action 2: I need to buy this (14-day pre-trip reminder) */}
              <button
                type="button"
                onClick={() => onToggleToBuy(group.id, item.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer min-h-[64px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <ShoppingBag
                    className={`h-5 w-5 shrink-0 ${
                      item.toBuy ? 'text-[#C85A3F]' : 'text-[#4F6865]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#152B29]">
                      {copy.toBuyTitle}
                    </div>
                    <div className="text-xs text-[#647B78]">{copy.toBuySub}</div>
                  </div>
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    item.toBuy
                      ? 'border-[#C85A3F] bg-[#C85A3F] text-white'
                      : 'border-[#CBD8D5] bg-white text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                </span>
              </button>

              {/* Action 3: Buy on Amazon / Taobao Affiliate Search Row */}
              {primaryOffer && (
                <div className="px-4 py-3.5 hover:bg-[#FAFDFC] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={primaryOffer.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="flex-1 min-w-0 flex items-start gap-3.5 group"
                    >
                      <Store className="h-5 w-5 shrink-0 text-[#4F6865] group-hover:text-[#078C88] mt-1 transition-colors" />
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#152B29] group-hover:text-[#078C88] transition-colors">
                          <span>{primaryStoreTitle}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-[#7D938F]" />
                        </div>
                        {storeDisclosureText && (
                          <p className="mt-0.5 text-xs leading-relaxed text-[#647B78]">
                            {storeDisclosureText}
                          </p>
                        )}
                      </div>
                    </a>

                    {secondaryOffer && (
                      <a
                        href={secondaryOffer.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] hover:border-[#078C88] px-2.5 py-1 text-xs font-semibold text-[#3B5552] whitespace-nowrap shrink-0"
                      >
                        <span>
                          {secondaryOffer.merchant === 'Amazon'
                            ? copy.amazonBadge
                            : secondaryOffer.merchant}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#7D938F]" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Action 4: Pack morning of departure */}
              <button
                type="button"
                onClick={() => onToggleMorningOfDeparture(group.id, item.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer min-h-[60px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Clock
                    className={`h-5 w-5 shrink-0 ${
                      item.morningOfDeparture ? 'text-[#078C88]' : 'text-[#4F6865]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#152B29]">
                      {copy.morningTitle}
                    </div>
                    <div className="text-xs text-[#647B78]">{copy.morningSub}</div>
                  </div>
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    item.morningOfDeparture
                      ? 'border-[#078C88] bg-[#078C88] text-white'
                      : 'border-[#CBD8D5] bg-white text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                </span>
              </button>

              {/* Action 5: Rename */}
              <button
                type="button"
                onClick={handleOpenRename}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-[#FAFDFC] transition-colors cursor-pointer min-h-[54px]"
              >
                <Pencil className="h-5 w-5 shrink-0 text-[#4F6865]" />
                <span className="text-[15px] font-semibold text-[#152B29]">
                  {copy.renameTitle}
                </span>
              </button>
            </div>

            {/* Card Group 3: Destructive Actions */}
            <div className="rounded-2xl bg-white border border-[#E6ECEA] divide-y divide-[#EEF3F1] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(group.id, item.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-[#C84B31] hover:bg-[#FDF5F3] transition-colors cursor-pointer min-h-[54px]"
              >
                <Trash2 className="h-5 w-5 shrink-0" />
                <span className="text-[15px] font-semibold">{copy.deleteTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDontSuggestAgain(group.id, item.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-[#C84B31] hover:bg-[#FDF5F3] transition-colors cursor-pointer min-h-[54px]"
              >
                <Ban className="h-5 w-5 shrink-0" />
                <span className="text-[15px] font-semibold">{copy.dontSuggestTitle}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

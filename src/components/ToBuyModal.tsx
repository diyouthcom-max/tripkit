import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Sparkles,
  Plus,
  Minus,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  estimateDefaultUnitWeightGrams,
  parseNameAndQuantity,
} from '../utils/packingHelpers';
import { formatItemWeightByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import {
  buildGearAffiliateOffers,
  type DestinationGearGapPick,
} from '../utils/affiliateHelpers';
import {
  AccentIconBadge,
  resolvePackingGroupIconMeta,
} from '../utils/accentTheme';
import {
  translateDemoPackItemName,
  translateGroupTitleLabel,
} from '../i18n';
import { getToBuyModalCopy } from '../i18n/packs/packingModalsPack';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  CrewMember,
  PackingGroup,
  PackingItem,
  TripIntelligence,
  UnitSystem,
} from '../types';

type ToBuyTab = 'list' | 'recommended' | 'add';

interface ToBuyModalProps {
  open: boolean;
  onClose: () => void;
  toBuyPairs: Array<{ grp: PackingGroup; item: PackingItem }>;
  groups: PackingGroup[];
  crew: CrewMember[];
  claimedSeatId?: string;
  activeMemberId: string;
  intel: TripIntelligence;
  cities: string[];
  unitSystem?: UnitSystem;
  affiliatePartners?: AffiliatePartnerConfig;
  destinationGapPicks: DestinationGearGapPick[];
  onToggleToBuy: (groupId: string, itemId: string) => void;
  onQuickAddAffiliateGear: (pick: DestinationGearGapPick) => void;
  onAddItem: (
    groupId: string,
    name: string,
    why: string,
    carryOnOnly: boolean,
    ownerId?: string,
    ownership?: 'personal' | 'shared',
    quantity?: number,
    unitWeightGrams?: number,
    toBuy?: boolean
  ) => void;
}

export const ToBuyModal: React.FC<ToBuyModalProps> = ({
  open,
  onClose,
  toBuyPairs,
  groups,
  crew,
  claimedSeatId,
  activeMemberId,
  intel,
  cities,
  unitSystem = 'metric',
  affiliatePartners,
  destinationGapPicks,
  onToggleToBuy,
  onQuickAddAffiliateGear,
  onAddItem,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getToBuyModalCopy(activeLang);

  const [activeTab, setActiveTab] = useState<ToBuyTab>('list');
  const [newName, setNewName] = useState('');
  const [newGroupId, setNewGroupId] = useState(groups[0]?.id || 'documents');
  const [newQty, setNewQty] = useState(1);
  const [addedPickIds, setAddedPickIds] = useState<Record<string, boolean>>({});
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    if (!open) return;
    setActiveTab(toBuyPairs.length > 0 ? 'list' : 'recommended');
    setAddedPickIds({});
    setAddSuccess('');
    if (groups[0]) setNewGroupId(groups[0].id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const defaultOwner =
    activeMemberId !== 'all'
      ? activeMemberId
      : claimedSeatId && crew.some((c) => c.id === claimedSeatId)
      ? claimedSeatId
      : crew[0]?.id || 'm1';

  const handleCreateToBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const { cleanName, parsedQty } = parseNameAndQuantity(trimmed);
    const finalName = cleanName || trimmed;
    const finalQty = newQty > 1 ? newQty : parsedQty ?? 1;
    const unitWeight = estimateDefaultUnitWeightGrams(finalName, newGroupId);

    onAddItem(
      newGroupId,
      finalName,
      copy.defaultWhy,
      false,
      defaultOwner,
      'personal',
      finalQty,
      unitWeight,
      true
    );
    setNewName('');
    setNewQty(1);
    setAddSuccess(copy.addedToast(finalName));
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="to-buy-modal-title"
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[86vh] transition-all"
      >
        {/* Mobile Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-forest-plate mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* 1. Minimalist Packy-Style Single-Row Header */}
        <div className="px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              id="to-buy-modal-title"
              className="text-base sm:text-lg font-extrabold tracking-tight tk-text-ink truncate"
            >
              {copy.headerTitle}
            </h2>
            <span className="text-xs font-semibold tk-text-danger tabular-nums whitespace-nowrap">
              · {copy.pendingCount(toBuyPairs.length)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full tk-text-ink hover:tk-bg-paper hover:tk-text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Packy-Style 3-Way Segmented Mode Switcher */}
        <div className="px-5 pb-3 bg-white shrink-0">
          <div
            role="tablist"
            className="grid grid-cols-3 gap-1 rounded-2xl tk-bg-forest-plate p-1"
          >
            {(
              [
                {
                  id: 'list' as ToBuyTab,
                  icon: ShoppingBag,
                  label: copy.tabList(toBuyPairs.length),
                },
                {
                  id: 'recommended' as ToBuyTab,
                  icon: Sparkles,
                  label: copy.tabRecommended,
                },
                {
                  id: 'add' as ToBuyTab,
                  icon: Plus,
                  label: copy.tabAdd,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[50px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
 isActive
 ? 'bg-white tk-text-ink shadow-xs font-bold'
 : 'tk-text-ink2 hover:tk-text-ink font-medium'
 }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
 isActive ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                  />
                  <span className="text-[11px] sm:text-xs leading-none truncate max-w-full tabular-nums">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 min-h-[260px]">
          {/* TAB 1: TO-BUY CHECKLIST */}
          {activeTab === 'list' && (
            <>
              {toBuyPairs.length === 0 ? (
                <div className="rounded-2xl border border-dashed tk-bc-hair tk-bg-card px-4 py-8 text-center space-y-3">
                  <p className="text-xs tk-text-ink2">{copy.emptyText}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('recommended')}
                      className="rounded-xl tk-bg-forest px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      {copy.browsePicksBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="rounded-xl border tk-bc-hair bg-white px-3.5 py-2 text-xs font-bold tk-text-ink cursor-pointer"
                    >
                      + {copy.addToBuyBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {toBuyPairs.map(({ grp, item }) => {
                    const offers = buildGearAffiliateOffers(
                      item.name,
                      intel,
                      cities,
                      activeLang,
                      affiliatePartners
                    );
                    const iconMeta = resolvePackingGroupIconMeta(grp);

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border tk-bc-hair bg-white p-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="mt-0.5 shrink-0">
                            <AccentIconBadge
                              accent={iconMeta.accent}
                              icon={iconMeta.Icon}
                              size="md"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold tk-text-ink truncate">
                              {translateDemoPackItemName(item.name, activeLang)}
                            </div>
                            <div className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                              {translateGroupTitleLabel(grp.id, grp.title, activeLang)} ·{' '}
                              {formatItemWeightByPref(item.weightGrams, unitSystem)}
                            </div>
                            {offers.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {offers.slice(0, 2).map((offer) => (
                                  <a
                                    key={offer.id}
                                    href={offer.url}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow sponsored"
                                    className="inline-flex items-center gap-1 rounded-lg border tk-bc-danger-hair tk-bg-danger-tint px-2 py-0.5 text-[11px] font-semibold tk-text-danger hover:tk-bg-danger-tint whitespace-nowrap shrink-0"
                                  >
                                    <span>{offer.merchant}</span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleToBuy(grp.id, item.id)}
                          className="h-9 inline-flex items-center justify-center gap-1 rounded-xl tk-bg-forest px-3.5 text-xs font-bold text-white hover:tk-bg-press whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>{copy.boughtBtn}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: DESTINATION ROUTE PICKS */}
          {activeTab === 'recommended' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs tk-text-ink2">
                <span>{copy.recommendedSubtitle}</span>
                <span className="font-num text-[11px] tk-text-ink2 shrink-0">
                  {intel.plugType} · {intel.rainChance}
                </span>
              </div>

              <div className="space-y-2.5">
                {destinationGapPicks.map((pick) => {
                  const isAdded = Boolean(addedPickIds[pick.id]);
                  return (
                    <div
                      key={pick.id}
                      className="rounded-2xl border tk-bc-hair bg-white p-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-0.5 shrink-0">
                          <AccentIconBadge accent="peach" icon={ShoppingBag} size="md" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold tk-text-ink truncate">
                            {pick.name}
                          </div>
                          <p className="mt-0.5 text-xs tk-text-ink2 truncate">
                            {pick.why} · {formatItemWeightByPref(pick.unitWeightGrams, unitSystem)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <a
                              href={pick.primaryOffer.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow sponsored"
                              className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair tk-bg-paper px-2 py-0.5 text-[11px] font-semibold tk-text-ink hover:tk-bc-forest whitespace-nowrap shrink-0"
                            >
                              <span>{pick.primaryOffer.merchant}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                            {pick.secondaryOffer && (
                              <a
                                href={pick.secondaryOffer.url}
                                target="_blank"
                                rel="noopener noreferrer nofollow sponsored"
                                className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2 py-0.5 text-[11px] font-semibold tk-text-ink2 hover:tk-bc-forest whitespace-nowrap shrink-0"
                              >
                                <span>{pick.secondaryOffer.merchant}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => {
                          onQuickAddAffiliateGear(pick);
                          setAddedPickIds((prev) => ({ ...prev, [pick.id]: true }));
                        }}
                        className={`h-9 inline-flex items-center justify-center gap-1 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isAdded
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-hair cursor-default'
 : 'tk-bg-forest text-white hover:tk-bg-press'
 }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>{copy.addedBtn}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{copy.addBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {affiliatePartners?.disclosureEnabled !== false && (
                <p className="text-[11px] tk-text-ink2">{copy.partnerDisclosure}</p>
              )}
            </div>
          )}

          {/* TAB 3: ADD NEW TO-BUY ITEM */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateToBuy} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold tk-text-ink2">
                  {copy.gearNameLabel}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={copy.gearNamePlaceholder}
                  className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold tk-text-ink2">
                    {copy.targetCategoryLabel}
                  </label>
                  <select
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2.5 text-xs font-semibold tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {translateGroupTitleLabel(g.id, g.title, activeLang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold tk-text-ink2">
                    {copy.quantityLabel}
                  </label>
                  <div className="flex items-center justify-between rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setNewQty((q) => Math.max(1, q - 1))}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white border tk-bc-hair tk-text-ink cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-num text-sm font-bold tk-text-ink tabular-nums">
                      ×{newQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewQty((q) => Math.min(99, q + 1))}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white border tk-bc-hair tk-text-ink cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {addSuccess && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold tk-text-forest">
                  <Check className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                  <span>{addSuccess}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={!newName.trim()}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl tk-bg-forest px-4 py-2.5 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{copy.submitAddBtn}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

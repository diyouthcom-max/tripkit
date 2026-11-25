import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Camera,
  ArrowUp,
  ArrowRight,
  ArrowUpRight,
  Wallet,
  Luggage,
  ListChecks,
  CloudRain,
  Languages,
  MapPin,
  RotateCcw,
  Check,
  MinusCircle,
  PlusCircle,
  Compass,
  Utensils,
  Zap,
  FileCheck2,
  TrainFront,
  Coins,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import type {
  AiAssistantDispatchResult,
  AiAssistantHistoryTurn,
  AiAssistantProposal,
  AiTravelTipCategory,
  AppLanguage,
  AppTab,
  ExpenseRecord,
} from '../types';
import { resolveExpenseSplitDetails } from '../utils/splitHelpers';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { translateTaskCategory, translateTaskTiming } from '../i18n';
import {
  buildLocalizedPromptCards,
  getCopilotUiCopy,
  resolveCountryLabel8,
} from '../i18n/packs/aiCopilotPack';

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  activeTab: AppTab;
  currencySymbol: string;
  currencyCode?: string;
  primaryCity?: string;
  cities?: string[];
  routeTitle?: string;
  totalDays?: number;
  currentDay?: number;
  companionName?: string;
  travelersCount?: number;
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onDispatchCommand: (
    inputText: string,
    history?: AiAssistantHistoryTurn[]
  ) => Promise<AiAssistantDispatchResult>;
  onApplyProposal: (proposal: AiAssistantProposal) => void;
  onUploadReceiptAndAdd: (file: File) => Promise<ExpenseRecord | null>;
  onNavigateToModule?: (targetTab: AppTab, targetDay?: number) => void;
}

type PromptCategory =
  | 'featured'
  | 'tips'
  | 'inspiration'
  | 'itinerary'
  | 'expense'
  | 'packing';
type ProposalStatus = 'pending' | 'applied' | 'dismissed';

interface FeedEntry {
  id: string;
  userPrompt: string;
  result: AiAssistantDispatchResult;
  proposalStatus: ProposalStatus;
  timestamp: string;
}

interface PromptCardItem {
  id: string;
  label: string;
  prompt: string;
  mode: 'instant' | 'fill';
}

// Country label inference & localized prompt cards moved to src/i18n/packs/aiCopilotPack.ts

function getTipVisualMeta(category: AiTravelTipCategory) {
  switch (category) {
    case 'visa':
      return {
        icon: FileCheck2,
        bg: 'tk-bg-forest-tint',
        text: 'tk-text-swatch-3',
      };
    case 'transit':
      return {
        icon: TrainFront,
        bg: 'tk-bg-forest-tint',
        text: 'tk-text-forest',
      };
    case 'money':
      return {
        icon: Coins,
        bg: 'tk-bg-warning-tint',
        text: 'tk-text-warning',
      };
    case 'food':
      return {
        icon: Utensils,
        bg: 'tk-bg-danger-tint',
        text: 'tk-text-danger',
      };
    case 'safety':
      return {
        icon: ShieldCheck,
        bg: 'tk-bg-forest-tint',
        text: 'tk-text-swatch-3',
      };
    default:
      return {
        icon: Compass,
        bg: 'tk-bg-forest-tint',
        text: 'tk-text-forest',
      };
  }
}

function getProposalTargetModule(proposal: AiAssistantProposal): {
  tab: AppTab;
  day?: number;
} {
  if (
    (proposal.stops && proposal.stops.length > 0) ||
    (proposal.removeStops && proposal.removeStops.length > 0) ||
    proposal.rainSwap
  ) {
    const day =
      proposal.stops?.[0]?.day ??
      proposal.removeStops?.[0]?.day ??
      proposal.rainSwap?.day;
    return { tab: 'itinerary', day };
  }
  if (
    (proposal.packingItems && proposal.packingItems.length > 0) ||
    (proposal.tasks && proposal.tasks.length > 0)
  ) {
    return { tab: 'packing' };
  }
  if (proposal.itineraryRebuild || proposal.destinationChange) {
    return { tab: 'packing' };
  }
  if (proposal.packingTemplate) {
    return { tab: 'packing' };
  }
  if (proposal.dateChange) {
    return { tab: 'itinerary' };
  }
  return { tab: 'budget', day: proposal.expenses?.[0]?.day };
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  open,
  onClose,
  activeTab,
  currencySymbol,
  currencyCode = 'EUR',
  primaryCity = '',
  cities = [],
  routeTitle = '',
  totalDays = 5,
  currentDay = 1,
  companionName = '',
  travelersCount = 2,
  carryOnLimitKg = 7,
  checkedLimitKg = 23,
  initialPrompt,
  onClearInitialPrompt,
  onDispatchCommand,
  onApplyProposal,
  onUploadReceiptAndAdd,
  onNavigateToModule,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getCopilotUiCopy(activeLang);

  const [input, setInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('featured');
  const [showInspirationShelf, setShowInspirationShelf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingUserPrompt, setPendingUserPrompt] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState<
    Record<string, boolean>
  >({});

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && initialPrompt) {
      setInput(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [open, initialPrompt, onClearInitialPrompt]);

  useEffect(() => {
    if (feed.length > 0 || loading) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feed.length, loading]);

  if (!open) return null;

  const destinationSeed = primaryCity || cities[0] || '';
  const { cityLabel, countryLabel } = resolveCountryLabel8(
    destinationSeed,
    currencyCode,
    activeLang
  );
  const displayTripMeta =
    routeTitle.trim() ||
    (cities.length > 0 ? cities.join(' → ') : cityLabel);

  const promptCards = buildLocalizedPromptCards({
    category: activeCategory,
    cityLabel,
    countryLabel,
    totalDays: Math.max(1, totalDays),
    currentDay: Math.max(1, currentDay),
    carryOnLimitKg,
    checkedLimitKg,
    companionName,
    travelersCount,
    currencySymbol,
    lang: activeLang,
  });

  const isBusy = loading || uploadingReceipt;

  const executePrompt = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isBusy) return;
    setLoading(true);
    setPendingUserPrompt(trimmed);
    setShowInspirationShelf(false);
    setErrorMsg(null);
    setInput('');
    try {
      const historyTurns: AiAssistantHistoryTurn[] = feed.slice(-4).map((entry) => ({
        userPrompt: entry.userPrompt,
        intent: entry.result.intent,
        reply: entry.result.reply,
      }));
      const result = await onDispatchCommand(trimmed, historyTurns);
      setFeed((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          userPrompt: trimmed,
          result,
          proposalStatus: result.proposal ? 'pending' : 'applied',
          timestamp: nowTimeStr(),
        },
      ]);
    } catch (err) {
      setInput(trimmed);
      setErrorMsg(
        err instanceof Error ? err.message : copy.errorUnavailable
      );
    } finally {
      setLoading(false);
      setPendingUserPrompt(null);
    }
  };

  const handleApplyEntryProposal = (entryId: string, proposal: AiAssistantProposal) => {
    onApplyProposal(proposal);
    setFeed((prev) =>
      prev.map((item) =>
        item.id === entryId ? { ...item, proposalStatus: 'applied' } : item
      )
    );
  };

  const handleDismissEntryProposal = (entryId: string) => {
    setOverwriteConfirmed((prev) => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    setFeed((prev) =>
      prev.map((item) =>
        item.id === entryId ? { ...item, proposalStatus: 'dismissed' } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePrompt(input);
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    setShowInspirationShelf(false);
    setErrorMsg(null);
    try {
      const added = await onUploadReceiptAndAdd(file);
      if (added) {
        const acctName =
          added.account === 'cash'
            ? copy.walletCash
            : added.account === 'transit'
            ? copy.walletTransit
            : copy.walletCard;
        const vatSuffix = added.vatEligible ? copy.vatPoolSuffix : '';
        setFeed((prev) => [
          ...prev,
          {
            id: `rcpt_${Date.now()}`,
            userPrompt: copy.receiptPrompt(file.name),
            result: {
              intent: 'add_expense',
              reply: copy.receiptReply(added.title, acctName, vatSuffix),
              addedExpenses: [added],
            },
            proposalStatus: 'applied',
            timestamp: nowTimeStr(),
          },
        ]);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : copy.errorReceiptScan
      );
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  };

  const categoryTabs: Array<{
    id: PromptCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'featured', label: copy.tabFeatured, icon: Sparkles },
    { id: 'tips', label: copy.tabTips, icon: Compass },
    { id: 'inspiration', label: copy.tabInspiration, icon: Utensils },
    { id: 'itinerary', label: copy.tabItinerary, icon: Zap },
    { id: 'expense', label: copy.tabExpense, icon: Wallet },
    { id: 'packing', label: copy.tabPacking, icon: Luggage },
  ];

  const isEmptyState = feed.length === 0 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-forest-40 p-0 sm:p-4">
      <div className="w-full max-w-xl h-[92vh] sm:h-[84vh] max-h-[820px] flex flex-col rounded-t-[28px] sm:rounded-[26px] tk-bg-paper border tk-bc-hair shadow-2xl overflow-hidden">
        {/* Serene Minimal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/90 border-b tk-bc-hair shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl tk-bg-forest text-white shrink-0 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold tk-text-ink truncate">
                  {copy.headerTitle}
                </h2>
              </div>
              <p className="text-[11px] font-medium tk-text-ink2 truncate">
                {displayTripMeta} · {copy.daysCompact(totalDays)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isEmptyState && (
              <>
                <button
                  type="button"
                  onClick={() => setShowInspirationShelf((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 showInspirationShelf
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink'
 }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>{copy.ideasBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeed([]);
                    setOverwriteConfirmed({});
                    setShowInspirationShelf(false);
                    setErrorMsg(null);
                  }}
                  title={copy.newChatTitle}
                  className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Packy-Inspired Welcome Canvas OR Expandable Inspiration Shelf */}
          {(isEmptyState || showInspirationShelf) && (
            <div className={isEmptyState ? 'space-y-6 pt-2 pb-4' : 'mb-5 space-y-3.5 pb-4 border-b tk-bc-hair'}>
              {isEmptyState && (
                <div className="space-y-2.5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl tk-bg-forest text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-[26px] font-extrabold tracking-tight tk-text-ink leading-tight">
                    {copy.welcomeTitle}
                  </h3>
                  <p className="text-[14px] tk-text-ink2 leading-relaxed max-w-md">
                    {copy.welcomeDesc}
                  </p>
                </div>
              )}

              {/* 6 Category Tabs · Q&A group | execute group */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {categoryTabs.map((cat, idx) => {
                  const Icon = cat.icon;
                  const active = activeCategory === cat.id;
                  return (
                    <React.Fragment key={cat.id}>
                      {idx === 3 && (
                        <div
                          aria-hidden="true"
                          className="shrink-0 self-center h-4 border-l tk-bc-hair"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'tk-bg-forest text-white shadow-2xs'
                            : 'bg-white tk-text-ink2 border tk-bc-hair hover:tk-bc-hair hover:tk-text-ink'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 4 Spacious Full-Width Packy-Style Prompt Cards */}
              <div className="space-y-2.5">
                {promptCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      if (card.mode === 'instant') {
                        void executePrompt(card.prompt);
                      } else {
                        setInput(card.prompt);
                        setShowInspirationShelf(false);
                        textareaRef.current?.focus();
                      }
                    }}
                    className="group w-full flex items-center justify-between gap-4 rounded-2xl border tk-bc-hair bg-white px-4 py-4 text-left tk-elev-soft hover:tk-bc-forest hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-[14px] font-medium tk-text-ink leading-snug">
                      {card.label}
                    </span>
                    <ArrowRight className="h-4 w-4 tk-text-ink2 group-hover:tk-text-forest group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Feed */}
          {!isEmptyState && (
            <div className="space-y-6 pb-2">
              {feed.map((entry, entryIdx) => {
                const { result, proposalStatus } = entry;
                const isLatest = entryIdx === feed.length - 1 && !loading;
                const proposalTarget = result.proposal
                  ? getProposalTargetModule(result.proposal)
                  : null;

                return (
                  <div key={entry.id} className="space-y-3">
                    {/* User Prompt Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm tk-bg-forest px-4 py-2.5 text-[14px] text-white leading-relaxed shadow-2xs">
                        {entry.userPrompt}
                      </div>
                    </div>

                    {/* Assistant Turn */}
                    <div className="space-y-3">
                      {/* Concise Reply Prose */}
                      {result.reply && (
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg tk-bg-forest-tint tk-text-forest shrink-0">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[14px] tk-text-forest leading-relaxed flex-1">
                            {result.reply}
                          </div>
                        </div>
                      )}

                      {/* Structured Travel Tip Cards */}
                      {result.travelTips && result.travelTips.length > 0 && (
                        <div className="pl-8 space-y-2">
                          {result.travelTips.map((tip, idx) => {
                            const meta = getTipVisualMeta(tip.category);
                            const TipIcon = meta.icon;
                            return (
                              <div
                                key={`${tip.title}_${idx}`}
                                className="flex items-start gap-3 rounded-2xl border tk-bc-hair bg-white p-3.5 tk-elev-soft"
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${meta.bg} ${meta.text}`}
                                >
                                  <TipIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="text-[13px] font-bold tk-text-ink leading-snug">
                                    {tip.title}
                                  </div>
                                  <p className="text-xs tk-text-ink2 leading-relaxed">
                                    {tip.detail}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Proposal Preview Card ("Nothing changes until you tap Apply") */}
                      {result.proposal && (
                        <div className="pl-8">
                          <div
                            className={`rounded-2xl border bg-white overflow-hidden transition-all tk-elev-soft ${
 proposalStatus === 'applied'
 ? 'tk-bc-forest'
 : proposalStatus === 'dismissed'
 ? 'tk-bc-hair opacity-70'
 : 'tk-bc-hair'
 }`}
                          >
                            {/* Proposal Card Header */}
                            <div
                              className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${
 proposalStatus === 'applied'
 ? 'tk-bg-forest-tint tk-bc-hair'
 : 'tk-bg-card tk-bc-hair'
 }`}
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold tracking-wide tk-text-forest">
                                  {proposalStatus === 'applied'
                                    ? copy.proposalAppliedBanner
                                    : proposalStatus === 'dismissed'
                                    ? copy.proposalSkippedBanner
                                    : copy.proposalPendingBanner}
                                </div>
                                {result.proposal.summary && (
                                  <div className="text-xs font-semibold tk-text-ink mt-0.5 truncate">
                                    {result.proposal.summary}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Proposal Itemized Diff Body */}
                            <div className="p-3.5 space-y-2.5">
                              {/* Removed Stops (for Make Day X more relaxed) */}
                              {result.proposal.removeStops &&
                                result.proposal.removeStops.length > 0 && (
                                  <div className="space-y-1.5">
                                    {result.proposal.removeStops.map((rm) => (
                                      <div
                                        key={rm.id}
                                        className="flex items-start gap-2.5 rounded-xl tk-bg-danger-tint border tk-bc-danger-hair px-3 py-2"
                                      >
                                        <MinusCircle className="h-4 w-4 tk-text-danger shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 text-xs font-semibold tk-text-danger">
                                            <span className="font-num tabular-nums shrink-0">
                                              D{rm.day} {rm.time}
                                            </span>
                                            <span className="line-through truncate">
                                              {rm.title}
                                            </span>
                                          </div>
                                          {rm.reason && (
                                            <p className="text-[11px] tk-text-danger mt-0.5 leading-snug">
                                              {rm.reason}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                              {/* Proposed Added Stops */}
                              {result.proposal.stops && result.proposal.stops.length > 0 && (
                                <div className="space-y-1.5">
                                  {result.proposal.stops.map((st, idx) => (
                                    <div
                                      key={`${st.title}_${idx}`}
                                      className="flex items-start justify-between gap-3 rounded-xl tk-bg-warning-tint border tk-bc-hair px-3 py-2.5"
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <PlusCircle className="h-4 w-4 tk-text-forest shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 text-xs font-bold tk-text-ink">
                                            <span className="font-num tk-text-forest tabular-nums shrink-0">
                                              D{st.day} {st.time}
                                            </span>
                                            <span className="truncate">{st.title}</span>
                                          </div>
                                          <div className="text-[11px] tk-text-ink2 mt-0.5 truncate">
                                            {st.district} · {st.transitNote}
                                          </div>
                                          {st.reason && (
                                            <p className="text-[11px] tk-text-forest mt-0.5 leading-snug">
                                              {st.reason}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-num text-xs font-bold tk-text-forest shrink-0 tabular-nums">
                                        {st.estLocal > 0
                                          ? `${currencySymbol}${st.estLocal.toFixed(0)}`
                                          : t('common.free')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Proposed Packing Items */}
                              {result.proposal.packingItems &&
                                result.proposal.packingItems.length > 0 && (
                                  <div className="rounded-xl tk-bg-paper border tk-bc-hair px-3 py-2.5 space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold tk-text-forest">
                                      <Luggage className="h-3.5 w-3.5" />
                                      <span>
                                        {copy.addPackingHeading(result.proposal.packingItems.length)}
                                      </span>
                                    </div>
                                    {result.proposal.packingItems.map((it, idx) => (
                                      <div
                                        key={`${it.name}_${idx}`}
                                        className="flex items-center justify-between gap-2 text-xs tk-text-ink"
                                      >
                                        <span className="font-medium truncate">
                                          {it.name}
                                          {it.quantity > 1 ? ` ×${it.quantity}` : ''}{' '}
                                          <span className="text-[11px] tk-text-ink2">
                                            · {it.groupTitle}
                                          </span>
                                        </span>
                                        <span className="font-num text-[11px] tk-text-ink2 tabular-nums shrink-0">
                                          {it.weightGrams}g
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                              {/* Proposed Travel Tasks */}
                              {result.proposal.tasks && result.proposal.tasks.length > 0 && (
                                <div className="rounded-xl tk-bg-warning-tint border tk-bc-warning-hair px-3 py-2.5 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold tk-text-warning">
                                    <ListChecks className="h-3.5 w-3.5" />
                                    <span>
                                      {copy.addTasksHeading(result.proposal.tasks.length)}
                                    </span>
                                  </div>
                                  {result.proposal.tasks.map((tk, idx) => (
                                    <div
                                      key={`${tk.title}_${idx}`}
                                      className="flex items-center justify-between gap-2 text-xs tk-text-warning"
                                    >
                                      <span className="font-medium truncate">{tk.title}</span>
                                      <span className="text-[11px] tk-text-warning shrink-0">
                                        {translateTaskCategory(tk.category, activeLang)} ·{' '}
                                        {translateTaskTiming(tk.timing, activeLang)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Proposed Expenses */}
                              {result.proposal.expenses &&
                                result.proposal.expenses.length > 0 && (
                                  <div className="space-y-1.5">
                                    {result.proposal.expenses.map((ex, idx) => {
                                      const previewRecord: ExpenseRecord = {
                                        id: `prev_${idx}`,
                                        day: ex.day,
                                        title: ex.title,
                                        amountLocal: ex.amountLocal,
                                        bucket: ex.bucket,
                                        account: ex.account,
                                        split: ex.split,
                                        mySharePct: ex.mySharePct,
                                        paidBy: ex.paidBy,
                                        vatEligible: ex.vatEligible,
                                        note: ex.note,
                                        time: '',
                                      };
                                      const splitInfo = resolveExpenseSplitDetails(
                                        previewRecord,
                                        companionName,
                                        currencySymbol,
                                        activeLang,
                                        travelersCount
                                      );
                                      return (
                                        <div
                                          key={`${ex.title}_${idx}`}
                                          className="flex items-center justify-between gap-3 rounded-xl tk-bg-paper border tk-bc-hair px-3 py-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 text-xs font-bold tk-text-ink">
                                              <Wallet className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                                              <span className="truncate">
                                                {ex.title} (D{ex.day})
                                              </span>
                                            </div>
                                            <div className="text-[11px] tk-text-ink2 mt-0.5">
                                              {splitInfo.shortLabel}
                                              {ex.vatEligible ? copy.taxFreeTag : ''}
                                            </div>
                                          </div>
                                          <div className="font-num text-sm font-bold tk-text-danger tabular-nums shrink-0">
                                            -{currencySymbol}
                                            {ex.amountLocal.toFixed(2)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              {/* Proposed Rain Swap */}
                              {result.proposal.rainSwap && (
                                <div className="flex items-center gap-2 rounded-xl tk-bg-warning-tint border tk-bc-hair px-3 py-2 text-xs font-semibold tk-text-forest">
                                  <CloudRain className="h-4 w-4 shrink-0" />
                                  <span>
                                    {result.proposal.rainSwap.action === 'enable'
                                      ? copy.rainEnable(result.proposal.rainSwap.day)
                                      : copy.rainDisable(result.proposal.rainSwap.day)}
                                  </span>
                                </div>
                              )}

                              {/* Proposed Date Change */}
                              {result.proposal.dateChange && (
                                <div className="rounded-xl tk-bg-paper border tk-bc-hair px-3 py-2.5 space-y-1">
                                  <p className="text-xs font-semibold tk-text-ink leading-snug">
                                    {copy.dateChangeSummary(
                                      result.proposal.dateChange.departureDate,
                                      result.proposal.dateChange.returnDate,
                                      result.proposal.dateChange.days
                                    )}
                                  </p>
                                  {result.proposal.dateChange.note ? (
                                    <p className="text-[11px] tk-text-ink2 leading-snug">
                                      {result.proposal.dateChange.note}
                                    </p>
                                  ) : null}
                                  <p className="text-[11px] tk-text-warning leading-snug">
                                    {copy.dateChangeRisk}
                                  </p>
                                </div>
                              )}

                              {/* Proposed Destination Change */}
                              {result.proposal.destinationChange && (
                                <div className="rounded-xl tk-bg-paper border tk-bc-hair px-3 py-2.5 space-y-1">
                                  <p className="text-xs font-semibold tk-text-ink leading-snug">
                                    {copy.destinationChangeSummary(
                                      result.proposal.destinationChange.cities.join(' · ')
                                    )}
                                  </p>
                                  {result.proposal.destinationChange.note ? (
                                    <p className="text-[11px] tk-text-ink2 leading-snug">
                                      {result.proposal.destinationChange.note}
                                    </p>
                                  ) : null}
                                  <p className="text-[11px] tk-text-ink2 leading-snug">
                                    {copy.destinationChangeNote}
                                  </p>
                                </div>
                              )}

                              {/* Proposed Itinerary Rebuild */}
                              {result.proposal.itineraryRebuild && (
                                <div
                                  className={`rounded-xl border tk-bc-hair px-3 py-2.5 space-y-1.5 ${
                                    result.proposal.itineraryRebuild.targetMode === 'overwrite'
                                      ? 'tk-bg-warning-tint'
                                      : 'tk-bg-paper'
                                  }`}
                                >
                                  <p className="text-xs font-semibold tk-text-ink leading-snug">
                                    {copy.rebuildPromptSummary(
                                      result.proposal.itineraryRebuild.naturalPrompt
                                    )}
                                  </p>
                                  {result.proposal.itineraryRebuild.note ? (
                                    <p className="text-[11px] tk-text-ink2 leading-snug">
                                      {result.proposal.itineraryRebuild.note}
                                    </p>
                                  ) : null}
                                  <p
                                    className={`text-[11px] leading-snug ${
                                      result.proposal.itineraryRebuild.targetMode === 'overwrite'
                                        ? 'tk-text-warning font-semibold'
                                        : 'tk-text-ink2'
                                    }`}
                                  >
                                    {result.proposal.itineraryRebuild.targetMode === 'overwrite'
                                      ? copy.rebuildOverwriteWarning
                                      : copy.rebuildSaveAsNew}
                                  </p>
                                  {result.proposal.itineraryRebuild.targetMode === 'overwrite' &&
                                    proposalStatus === 'pending' && (
                                      <div className="pt-1.5 space-y-2 border-t tk-bc-hair">
                                        <p className="text-xs font-bold tk-text-ink leading-snug">
                                          {copy.overwriteConfirmTitle}
                                        </p>
                                        <p className="text-[11px] tk-text-warning leading-snug">
                                          {copy.overwriteConfirmRisk}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOverwriteConfirmed((prev) => ({
                                                ...prev,
                                                [entry.id]: true,
                                              }))
                                            }
                                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                                              overwriteConfirmed[entry.id]
                                                ? 'tk-bg-forest text-white border-transparent'
                                                : 'bg-white tk-text-forest tk-bc-hair hover:tk-bg-forest-tint'
                                            }`}
                                          >
                                            {copy.overwriteConfirmYes}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!result.proposal?.itineraryRebuild) return;
                                              handleApplyEntryProposal(entry.id, {
                                                ...result.proposal,
                                                itineraryRebuild: {
                                                  ...result.proposal.itineraryRebuild,
                                                  targetMode: 'new',
                                                  confirmOverwrite: false,
                                                },
                                              });
                                              setOverwriteConfirmed((prev) => {
                                                const next = { ...prev };
                                                delete next[entry.id];
                                                return next;
                                              });
                                            }}
                                            className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white tk-text-forest border tk-bc-hair hover:tk-bg-forest-tint transition-colors cursor-pointer"
                                          >
                                            {copy.overwriteSaveAsNew}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOverwriteConfirmed((prev) => {
                                                const next = { ...prev };
                                                delete next[entry.id];
                                                return next;
                                              })
                                            }
                                            className="rounded-xl px-3 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink transition-colors cursor-pointer"
                                          >
                                            {copy.overwriteCancel}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Proposed Packing Template */}
                              {result.proposal.packingTemplate && (
                                <div className="rounded-xl tk-bg-paper border tk-bc-hair px-3 py-2.5 space-y-1">
                                  <p className="text-xs font-semibold tk-text-ink leading-snug">
                                    {copy.packingTemplateSummary(
                                      result.proposal.packingTemplate.note ||
                                        result.proposal.packingTemplate.scenarioIds.join(' · ')
                                    )}
                                  </p>
                                  <p className="text-[11px] tk-text-ink2 leading-snug">
                                    {copy.packingTemplateMerge}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Proposal Action Footer */}
                            <div className="flex flex-col gap-1.5 px-3.5 py-2.5 tk-bg-card border-t tk-bc-hair">
                              {proposalStatus === 'pending' ? (
                                <>
                                  {result.proposal.itineraryRebuild?.targetMode ===
                                    'overwrite' &&
                                    !overwriteConfirmed[entry.id] && (
                                      <p className="text-[11px] tk-text-warning leading-snug">
                                        {copy.overwriteNeedConfirm}
                                      </p>
                                    )}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDismissEntryProposal(entry.id)}
                                      className="rounded-xl px-3 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink transition-colors cursor-pointer"
                                    >
                                      {copy.skipBtn}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        result.proposal.itineraryRebuild?.targetMode ===
                                          'overwrite' && !overwriteConfirmed[entry.id]
                                      }
                                      onClick={() => {
                                        const proposal = result.proposal!;
                                        if (
                                          proposal.itineraryRebuild?.targetMode === 'overwrite'
                                        ) {
                                          if (!overwriteConfirmed[entry.id]) return;
                                          handleApplyEntryProposal(entry.id, {
                                            ...proposal,
                                            itineraryRebuild: {
                                              ...proposal.itineraryRebuild,
                                              confirmOverwrite: true,
                                            },
                                          });
                                          setOverwriteConfirmed((prev) => {
                                            const next = { ...prev };
                                            delete next[entry.id];
                                            return next;
                                          });
                                          return;
                                        }
                                        handleApplyEntryProposal(entry.id, proposal);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 py-2 text-xs font-bold text-white hover:tk-bg-forest transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      <span>{copy.applyBtn}</span>
                                    </button>
                                  </div>
                                </>
                              ) : proposalStatus === 'applied' ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold tk-text-forest leading-snug">
                                    <Check className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                      {result.proposal.dateChange
                                        ? copy.resultDateApplied
                                        : result.proposal.destinationChange
                                        ? copy.resultDestinationApplied
                                        : result.proposal.itineraryRebuild
                                        ? copy.resultRebuildApplied
                                        : result.proposal.packingTemplate
                                        ? copy.resultPackingApplied
                                        : copy.savedToTrip}
                                    </span>
                                  </span>
                                  {onNavigateToModule && proposalTarget && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onNavigateToModule(
                                          proposalTarget.tab,
                                          proposalTarget.day
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-xl border tk-bc-hair bg-white px-3 py-1.5 text-xs font-semibold tk-text-forest hover:tk-bg-forest-tint transition-colors cursor-pointer"
                                    >
                                      <MapPin className="h-3 w-3" />
                                      <span>
                                        {proposalTarget.tab === 'itinerary'
                                          ? copy.viewDayBtn(proposalTarget.day ?? currentDay)
                                          : proposalTarget.tab === 'packing'
                                          ? copy.openPackingBtn
                                          : copy.openFinanceBtn}
                                      </span>
                                      <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs tk-text-ink2">
                                  {copy.noChangesApplied}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Immediate Receipt OCR Expense Card */}
                      {result.addedExpenses && result.addedExpenses.length > 0 && (
                        <div className="pl-8 space-y-1.5">
                          {result.addedExpenses.map((ex) => {
                            const splitInfo = resolveExpenseSplitDetails(
                              ex,
                              companionName,
                              currencySymbol,
                              activeLang,
                              travelersCount
                            );
                            return (
                              <div
                                key={ex.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-xs font-bold tk-text-forest">
                                    <Wallet className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {copy.loggedPrefix}
                                      {ex.title}
                                      {ex.day ? ` (D${ex.day})` : ''}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] tk-text-ink2">
                                    {splitInfo.shortLabel}
                                    {ex.vatEligible ? copy.taxFreeTag : ''}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="font-num text-sm font-bold tk-text-danger tabular-nums">
                                    -{currencySymbol}
                                    {ex.amountLocal.toFixed(2)}
                                  </div>
                                  {onNavigateToModule && activeTab !== 'budget' && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigateToModule('budget', ex.day)}
                                      className="inline-flex items-center gap-0.5 rounded-lg border tk-bc-hair bg-white px-2 py-1 text-[11px] font-semibold tk-text-forest hover:tk-bg-warning-tint whitespace-nowrap cursor-pointer"
                                    >
                                      <span>{copy.viewBtn}</span>
                                      <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Local Communication / Translation Card */}
                      {result.localCard && (
                        <div className="pl-8">
                          <div className="rounded-2xl border tk-bc-hair tk-bg-forest-tint p-4 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold tk-text-swatch-3">
                              <span className="inline-flex items-center gap-1.5">
                                <Languages className="h-3.5 w-3.5" />
                                {copy.phraseCardHeader}
                              </span>
                              <span>{result.localCard.languageLabel}</span>
                            </div>
                            <div className="text-base font-extrabold tk-text-ink leading-snug">
                              {result.localCard.localTitle}
                            </div>
                            <div className="text-sm font-semibold tk-text-ink leading-relaxed">
                              {result.localCard.localAddressOrPhrase}
                            </div>
                            {result.localCard.pronunciationHint && (
                              <div className="text-xs tk-text-ink2">
                                {copy.pronunciationPrefix}
                                {result.localCard.pronunciationHint}
                              </div>
                            )}
                            {result.localCard.etiquetteTip && (
                              <div className="text-[11px] tk-text-swatch-3 pt-1.5 border-t tk-bc-hair">
                                {copy.tipPrefix}
                                {result.localCard.etiquetteTip}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Clickable Follow-Up Suggestions under Latest Turn */}
                      {isLatest &&
                        result.followUpSuggestions &&
                        result.followUpSuggestions.length > 0 && (
                          <div className="pl-8 pt-1 flex flex-wrap gap-1.5">
                            {result.followUpSuggestions.map((sugg) => (
                              <button
                                key={sugg}
                                type="button"
                                disabled={isBusy}
                                onClick={() => void executePrompt(sugg)}
                                className="inline-flex items-center gap-1 rounded-full border tk-bc-hair bg-white px-3 py-1.5 text-xs font-medium tk-text-forest hover:tk-bc-forest hover:tk-text-forest transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span>{sugg}</span>
                                <ArrowRight className="h-3 w-3 tk-text-ink2" />
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {/* Pending User Prompt + Thinking Indicator */}
              {loading && pendingUserPrompt && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm tk-bg-forest px-4 py-2.5 text-[14px] text-white leading-relaxed">
                      {pendingUserPrompt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg tk-bg-forest-tint tk-text-forest">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <span className="text-xs font-medium tk-text-ink2">
                      {copy.thinkingText}
                    </span>
                  </div>
                </div>
              )}
              <div ref={feedEndRef} />
            </div>
          )}
        </div>

        {/* Clean Packy-Style Bottom Capsule Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="tk-bg-paper px-4 pt-2 pb-4 shrink-0"
        >
          {errorMsg && (
            <div className="mb-2 rounded-xl border tk-bc-danger-hair tk-bg-danger-tint px-3 py-2 text-xs font-semibold tk-text-danger">
              {errorMsg}
            </div>
          )}

          <div className="rounded-[24px] border tk-bc-hair bg-white px-3.5 py-2 tk-elev-soft focus-within:tk-bc-forest focus-within:ring-2 focus-within:tk-ring-forest-10 transition-all">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isBusy) {
                      void executePrompt(input);
                    }
                  }
                }}
                placeholder={copy.inputPlaceholder(cityLabel)}
                className="flex-1 max-h-24 bg-transparent py-1.5 pl-1 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:outline-none resize-none leading-snug"
              />

              <div className="flex items-center gap-1 shrink-0 pb-0.5">
                <AiVoiceInputButton
                  contextHint="assistant"
                  compact
                  label={copy.voiceLabel}
                  disabled={isBusy}
                  onError={(msg) => setErrorMsg(msg || null)}
                  onTranscript={async (transcript) => {
                    await executePrompt(transcript);
                  }}
                />

                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => receiptInputRef.current?.click()}
                  title={t('assistant.uploadReceipt')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-forest disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin tk-text-forest" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  aria-label={t('assistant.send')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-bg-forest text-white hover:tk-bg-forest disabled:tk-bg-forest-plate disabled:tk-text-ink2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

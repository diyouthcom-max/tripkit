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

type PromptCategory = 'featured' | 'tips' | 'inspiration' | 'actions';
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
        bg: 'bg-[#EEF4FC]',
        text: 'text-[#285A99]',
      };
    case 'transit':
      return {
        icon: TrainFront,
        bg: 'bg-[#EBF7F6]',
        text: 'text-[#077672]',
      };
    case 'money':
      return {
        icon: Coins,
        bg: 'bg-[#FDF6E4]',
        text: 'text-[#8F640F]',
      };
    case 'food':
      return {
        icon: Utensils,
        bg: 'bg-[#FDEEE9]',
        text: 'text-[#B54B2E]',
      };
    case 'safety':
      return {
        icon: ShieldCheck,
        bg: 'bg-[#F4EFFB]',
        text: 'text-[#6746A1]',
      };
    default:
      return {
        icon: Compass,
        bg: 'bg-[#EFF5F3]',
        text: 'text-[#2F5B56]',
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
    { id: 'actions', label: copy.tabActions, icon: Zap },
  ];

  const isEmptyState = feed.length === 0 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#093B35]/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-xl h-[92vh] sm:h-[84vh] max-h-[820px] flex flex-col rounded-t-[28px] sm:rounded-[26px] bg-[#F6FAF9] border border-[#DCE8E5] shadow-2xl overflow-hidden">
        {/* Serene Minimal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/90 backdrop-blur-xs border-b border-[#E6EFED] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#093B35] text-white shrink-0 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#152B29] truncate">
                  {copy.headerTitle}
                </h2>
              </div>
              <p className="text-[11px] font-medium text-[#647B78] truncate">
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
                      ? 'bg-[#E6F4F3] text-[#077672]'
                      : 'text-[#5B7370] hover:bg-[#EEF5F3] hover:text-[#152B29]'
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>{copy.ideasBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeed([]);
                    setShowInspirationShelf(false);
                    setErrorMsg(null);
                  }}
                  title={copy.newChatTitle}
                  className="rounded-lg p-1.5 text-[#647B78] hover:bg-[#EEF5F3] hover:text-[#152B29] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="rounded-lg p-1.5 text-[#647B78] hover:bg-[#EEF5F3] hover:text-[#152B29] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Packy-Inspired Welcome Canvas OR Expandable Inspiration Shelf */}
          {(isEmptyState || showInspirationShelf) && (
            <div className={isEmptyState ? 'space-y-6 pt-2 pb-4' : 'mb-5 space-y-3.5 pb-4 border-b border-[#E3ECEA]'}>
              {isEmptyState && (
                <div className="space-y-2.5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#093B35] text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-[26px] font-extrabold tracking-tight text-[#152B29] leading-tight">
                    {copy.welcomeTitle}
                  </h3>
                  <p className="text-[14px] text-[#5B7370] leading-relaxed max-w-md">
                    {copy.welcomeDesc}
                  </p>
                </div>
              )}

              {/* 4 Clean Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {categoryTabs.map((cat) => {
                  const Icon = cat.icon;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#093B35] text-white shadow-2xs'
                          : 'bg-white text-[#536D6A] border border-[#E3ECEA] hover:border-[#BBD5D0] hover:text-[#152B29]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </button>
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
                    className="group w-full flex items-center justify-between gap-4 rounded-2xl border border-[#E4EEEC] bg-white px-4 py-4 text-left shadow-[0_1px_2px_rgba(9,59,53,0.03)] hover:border-[#078C88]/50 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-[14px] font-medium text-[#152B29] leading-snug">
                      {card.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#7D9692] group-hover:text-[#078C88] group-hover:translate-x-0.5 transition-all shrink-0" />
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
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#093B35] px-4 py-2.5 text-[14px] text-white leading-relaxed shadow-2xs">
                        {entry.userPrompt}
                      </div>
                    </div>

                    {/* Assistant Turn */}
                    <div className="space-y-3">
                      {/* Concise Reply Prose */}
                      {result.reply && (
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-[#E6F4F3] text-[#077672] shrink-0">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[14px] text-[#1D3532] leading-relaxed flex-1">
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
                                className="flex items-start gap-3 rounded-2xl border border-[#E3ECEA] bg-white p-3.5 shadow-[0_1px_2px_rgba(9,59,53,0.03)]"
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${meta.bg} ${meta.text}`}
                                >
                                  <TipIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="text-[13px] font-bold text-[#152B29] leading-snug">
                                    {tip.title}
                                  </div>
                                  <p className="text-xs text-[#4F6865] leading-relaxed">
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
                            className={`rounded-2xl border bg-white overflow-hidden transition-all shadow-[0_1px_3px_rgba(9,59,53,0.05)] ${
                              proposalStatus === 'applied'
                                ? 'border-[#9AD8D3]'
                                : proposalStatus === 'dismissed'
                                ? 'border-[#E5ECEA] opacity-70'
                                : 'border-[#CBE3DF]'
                            }`}
                          >
                            {/* Proposal Card Header */}
                            <div
                              className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${
                                proposalStatus === 'applied'
                                  ? 'bg-[#EEF9F8] border-[#D3ECE9]'
                                  : 'bg-[#FAFDFC] border-[#EDF3F1]'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold tracking-wide text-[#077672]">
                                  {proposalStatus === 'applied'
                                    ? copy.proposalAppliedBanner
                                    : proposalStatus === 'dismissed'
                                    ? copy.proposalSkippedBanner
                                    : copy.proposalPendingBanner}
                                </div>
                                {result.proposal.summary && (
                                  <div className="text-xs font-semibold text-[#152B29] mt-0.5 truncate">
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
                                        className="flex items-start gap-2.5 rounded-xl bg-[#FDF4F2] border border-[#F2D7D1] px-3 py-2"
                                      >
                                        <MinusCircle className="h-4 w-4 text-[#C04736] shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7E2D22]">
                                            <span className="font-num tabular-nums shrink-0">
                                              D{rm.day} {rm.time}
                                            </span>
                                            <span className="line-through truncate">
                                              {rm.title}
                                            </span>
                                          </div>
                                          {rm.reason && (
                                            <p className="text-[11px] text-[#9A493D] mt-0.5 leading-snug">
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
                                      className="flex items-start justify-between gap-3 rounded-xl bg-[#F2FAF9] border border-[#D4ECE9] px-3 py-2.5"
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <PlusCircle className="h-4 w-4 text-[#078C88] shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#152B29]">
                                            <span className="font-num text-[#077672] tabular-nums shrink-0">
                                              D{st.day} {st.time}
                                            </span>
                                            <span className="truncate">{st.title}</span>
                                          </div>
                                          <div className="text-[11px] text-[#5B7370] mt-0.5 truncate">
                                            {st.district} · {st.transitNote}
                                          </div>
                                          {st.reason && (
                                            <p className="text-[11px] text-[#355A56] mt-0.5 leading-snug">
                                              {st.reason}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-num text-xs font-bold text-[#077672] shrink-0 tabular-nums">
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
                                  <div className="rounded-xl bg-[#F4F9F8] border border-[#DCEAE7] px-3 py-2.5 space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#077672]">
                                      <Luggage className="h-3.5 w-3.5" />
                                      <span>
                                        {copy.addPackingHeading(result.proposal.packingItems.length)}
                                      </span>
                                    </div>
                                    {result.proposal.packingItems.map((it, idx) => (
                                      <div
                                        key={`${it.name}_${idx}`}
                                        className="flex items-center justify-between gap-2 text-xs text-[#152B29]"
                                      >
                                        <span className="font-medium truncate">
                                          {it.name}
                                          {it.quantity > 1 ? ` ×${it.quantity}` : ''}{' '}
                                          <span className="text-[11px] text-[#647B78]">
                                            · {it.groupTitle}
                                          </span>
                                        </span>
                                        <span className="font-num text-[11px] text-[#647B78] tabular-nums shrink-0">
                                          {it.weightGrams}g
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                              {/* Proposed Travel Tasks */}
                              {result.proposal.tasks && result.proposal.tasks.length > 0 && (
                                <div className="rounded-xl bg-[#FDF9EA] border border-[#EADBA3] px-3 py-2.5 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7F5E0D]">
                                    <ListChecks className="h-3.5 w-3.5" />
                                    <span>
                                      {copy.addTasksHeading(result.proposal.tasks.length)}
                                    </span>
                                  </div>
                                  {result.proposal.tasks.map((tk, idx) => (
                                    <div
                                      key={`${tk.title}_${idx}`}
                                      className="flex items-center justify-between gap-2 text-xs text-[#594408]"
                                    >
                                      <span className="font-medium truncate">{tk.title}</span>
                                      <span className="text-[11px] text-[#8A7125] shrink-0">
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
                                          className="flex items-center justify-between gap-3 rounded-xl bg-[#F4F9F8] border border-[#DCEAE7] px-3 py-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#152B29]">
                                              <Wallet className="h-3.5 w-3.5 text-[#078C88] shrink-0" />
                                              <span className="truncate">
                                                {ex.title} (D{ex.day})
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-[#5B7370] mt-0.5">
                                              {splitInfo.shortLabel}
                                              {ex.vatEligible ? copy.taxFreeTag : ''}
                                            </div>
                                          </div>
                                          <div className="font-num text-sm font-bold text-[#B83B2E] tabular-nums shrink-0">
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
                                <div className="flex items-center gap-2 rounded-xl bg-[#F2FAF9] border border-[#D4ECE9] px-3 py-2 text-xs font-semibold text-[#076E6A]">
                                  <CloudRain className="h-4 w-4 shrink-0" />
                                  <span>
                                    {result.proposal.rainSwap.action === 'enable'
                                      ? copy.rainEnable(result.proposal.rainSwap.day)
                                      : copy.rainDisable(result.proposal.rainSwap.day)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Proposal Action Footer */}
                            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#FAFDFC] border-t border-[#EDF3F1]">
                              {proposalStatus === 'pending' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissEntryProposal(entry.id)}
                                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#647B78] hover:bg-[#EDF3F1] hover:text-[#152B29] transition-colors cursor-pointer"
                                  >
                                    {copy.skipBtn}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApplyEntryProposal(entry.id, result.proposal!)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#093B35] px-4 py-2 text-xs font-bold text-white hover:bg-[#078C88] transition-colors shadow-2xs cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{copy.applyBtn}</span>
                                  </button>
                                </>
                              ) : proposalStatus === 'applied' ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#077672]">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{copy.savedToTrip}</span>
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
                                      className="inline-flex items-center gap-1 rounded-xl border border-[#BBDCD8] bg-white px-3 py-1.5 text-xs font-semibold text-[#076E6A] hover:bg-[#EBF7F6] transition-colors cursor-pointer"
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
                                </>
                              ) : (
                                <span className="text-xs text-[#7D9692]">
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
                                className="flex items-center justify-between gap-3 rounded-2xl border border-[#C6E6E3] bg-[#EFF9F8] px-3.5 py-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#076E6A]">
                                    <Wallet className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {copy.loggedPrefix}
                                      {ex.title}
                                      {ex.day ? ` (D${ex.day})` : ''}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-[#4F6865]">
                                    {splitInfo.shortLabel}
                                    {ex.vatEligible ? copy.taxFreeTag : ''}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="font-num text-sm font-bold text-[#B83B2E] tabular-nums">
                                    -{currencySymbol}
                                    {ex.amountLocal.toFixed(2)}
                                  </div>
                                  {onNavigateToModule && activeTab !== 'budget' && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigateToModule('budget', ex.day)}
                                      className="inline-flex items-center gap-0.5 rounded-lg border border-[#A9DDD9] bg-white px-2 py-1 text-[11px] font-semibold text-[#076E6A] hover:bg-[#DFF3F1] whitespace-nowrap cursor-pointer"
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
                          <div className="rounded-2xl border border-[#D4CEE8] bg-[#F8F6FD] p-4 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#694FA8]">
                              <span className="inline-flex items-center gap-1.5">
                                <Languages className="h-3.5 w-3.5" />
                                {copy.phraseCardHeader}
                              </span>
                              <span>{result.localCard.languageLabel}</span>
                            </div>
                            <div className="text-base font-extrabold text-[#152B29] leading-snug">
                              {result.localCard.localTitle}
                            </div>
                            <div className="text-sm font-semibold text-[#2B4240] leading-relaxed">
                              {result.localCard.localAddressOrPhrase}
                            </div>
                            {result.localCard.pronunciationHint && (
                              <div className="text-xs text-[#5B7370]">
                                {copy.pronunciationPrefix}
                                {result.localCard.pronunciationHint}
                              </div>
                            )}
                            {result.localCard.etiquetteTip && (
                              <div className="text-[11px] text-[#694FA8] pt-1.5 border-t border-[#E6E2F3]">
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
                                className="inline-flex items-center gap-1 rounded-full border border-[#D9E7E4] bg-white px-3 py-1.5 text-xs font-medium text-[#2E4C48] hover:border-[#078C88] hover:text-[#077672] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span>{sugg}</span>
                                <ArrowRight className="h-3 w-3 text-[#7D9692]" />
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
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#093B35] px-4 py-2.5 text-[14px] text-white leading-relaxed">
                      {pendingUserPrompt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E6F4F3] text-[#077672]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <span className="text-xs font-medium text-[#647B78]">
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
          className="bg-[#F6FAF9] px-4 pt-2 pb-4 shrink-0"
        >
          {errorMsg && (
            <div className="mb-2 rounded-xl border border-[#E6B8AE] bg-[#FDF4F2] px-3 py-2 text-xs font-semibold text-[#A1422C]">
              {errorMsg}
            </div>
          )}

          <div className="rounded-[24px] border border-[#D5E3E0] bg-white px-3.5 py-2 shadow-[0_2px_8px_rgba(9,59,53,0.05)] focus-within:border-[#078C88] focus-within:ring-2 focus-within:ring-[#078C88]/10 transition-all">
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
                className="flex-1 max-h-24 bg-transparent py-1.5 pl-1 text-[14px] text-[#152B29] placeholder:text-[#8BA39F] focus:outline-none resize-none leading-snug"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5B7370] hover:bg-[#EFF5F3] hover:text-[#093B35] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#078C88]" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  aria-label={t('assistant.send')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#093B35] text-white hover:bg-[#078C88] disabled:bg-[#DCE7E5] disabled:text-[#8CA39F] transition-colors cursor-pointer"
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

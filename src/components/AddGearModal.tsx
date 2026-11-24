import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  Check,
  ChevronDown,
  Loader2,
  Lightbulb,
  AlertTriangle,
  Bookmark,
  FolderPlus,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import { parseVoicePackingFallback } from '../utils/speechHelpers';
import {
  estimateDefaultUnitWeightGrams,
  parseNameAndQuantity,
} from '../utils/packingHelpers';
import { formatItemWeightByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import {
  PACKING_SCENARIO_SPECS,
  buildOfflineDeepPackingGroups,
  inferDefaultScenariosFromSetup,
} from '../utils/packingWizardHelpers';
import {
  AccentIconBadge,
  HERO_AVATAR_BG,
  resolvePackingGroupIconMeta,
} from '../utils/accentTheme';
import {
  translateDemoPackItemName,
  translateGroupTitleLabel,
  translateMemberInitials,
  translateMemberName,
} from '../i18n';
import { getAddGearModalCopy, getGroupColorLabel } from '../i18n/packs/packingModalsPack';
import { getPackingScenarioLabel } from '../i18n/packs/packingWizardUiPack';
import type { DestinationGearGapPick } from '../utils/affiliateHelpers';
import type {
  AiMissingItemSuggestion,
  AlwaysPackTemplateItem,
  AppLanguage,
  CrewMember,
  PackingGroup,
  PackingScenarioId,
  PackingWeatherOverride,
  TripIntelligence,
  TripSetup,
  UnitSystem,
} from '../types';
import type { PackingWizardSubmitPayload } from './PackingListWizardModal';
import type {
  DuplicateClassifyWarning,
  PendingClassifiedPackPayload,
} from './PackingView';

export type AddGearModeTab = 'for_you' | 'quick' | 'detailed';
type ForYouSubFilter = 'essentials' | 'ai_audit' | 'always_pack';

interface CuratedGearCandidate {
  key: string;
  name: string;
  why: string;
  targetGroupId: string;
  targetGroupTitle: string;
  unitWeightGrams: number;
  quantity: number;
  carryOnOnly: boolean;
}

const GROUP_COLOR_OPTIONS: Array<{
  key: PackingGroup['colorKey'];
  hex: string;
}> = [
  { key: 'peach', hex: 'var(--tk-swatch-4)' },
  { key: 'teal', hex: 'var(--tk-swatch-1)' },
  { key: 'lavender', hex: 'var(--tk-swatch-2)' },
  { key: 'lemon', hex: 'var(--tk-swatch-3)' },
  { key: 'rose', hex: 'var(--tk-swatch-3)' },
  { key: 'mint', hex: 'var(--tk-swatch-2)' },
];

interface AddGearModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: AddGearModeTab;
  initialGroupId?: string | 'auto';
  groups: PackingGroup[];
  crew: CrewMember[];
  claimedSeatId?: string;
  activeMemberId: string;
  intel: TripIntelligence;
  setup?: TripSetup;
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  neverSuggestItems?: string[];
  unitSystem?: UnitSystem;
  destinationGapPicks: DestinationGearGapPick[];
  alwaysPackLibrary: AlwaysPackTemplateItem[];
  onApplySmartParams?: (payload: PackingWizardSubmitPayload) => Promise<void> | void;
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
  onAddGroup: (
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey']
  ) => void;
  onClassifyAndAddPackItem: (
    inputText: string,
    activeMemberId: string
  ) => Promise<DuplicateClassifyWarning | null>;
  onCommitClassifiedItem: (
    payload: PendingClassifiedPackPayload,
    forcePersonal: boolean
  ) => void;
  onDeduplicateExistingItem: (existingItemId: string) => void;
  onAuditMissingItems: () => Promise<{
    diagnosisSummary: string;
    suggestions: AiMissingItemSuggestion[];
  }>;
  onBatchAddMissingItems: (
    itemsToAdd: AiMissingItemSuggestion[],
    activeMemberId: string
  ) => void;
  onSeedAlwaysPack: () => void;
  onSyncAlwaysPack: () => void;
}

export const AddGearModal: React.FC<AddGearModalProps> = ({
  open,
  onClose,
  initialTab = 'for_you',
  initialGroupId = 'auto',
  groups,
  crew,
  claimedSeatId,
  activeMemberId,
  intel,
  setup,
  carryOnLimitKg = 7,
  checkedLimitKg = 23,
  neverSuggestItems = [],
  unitSystem = 'metric',
  destinationGapPicks,
  alwaysPackLibrary,
  onApplySmartParams,
  onAddItem,
  onAddGroup,
  onClassifyAndAddPackItem,
  onCommitClassifiedItem,
  onDeduplicateExistingItem,
  onAuditMissingItems,
  onBatchAddMissingItems,
  onSeedAlwaysPack,
  onSyncAlwaysPack,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getAddGearModalCopy(activeLang), [activeLang]);

  const [activeTab, setActiveTab] = useState<AddGearModeTab>(initialTab);
  const [targetGroup, setTargetGroup] = useState<string | 'auto'>(initialGroupId);
  const [groupStripOpen, setGroupStripOpen] = useState(false);
  const [showNewCategoryInline, setShowNewCategoryInline] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryCube, setNewCategoryCube] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<PackingGroup['colorKey']>('teal');
  const [pendingSelectGroupTitle, setPendingSelectGroupTitle] = useState<string | null>(null);

  // Smart Parameter Calibration state (Weather / Laundry / Scenarios)
  const [smartParamsOpen, setSmartParamsOpen] = useState(false);
  const [weatherOverrides, setWeatherOverrides] = useState<PackingWeatherOverride[]>(
    () => setup?.weatherOverrides || []
  );
  const [laundryEnabled, setLaundryEnabled] = useState<boolean>(() => setup?.laundry ?? true);
  const [specialScenarios, setSpecialScenarios] = useState<PackingScenarioId[]>(() =>
    setup ? inferDefaultScenariosFromSetup(setup, checkedLimitKg) : []
  );
  const [smartSyncedBanner, setSmartSyncedBanner] = useState('');

  const [forYouSub, setForYouSub] = useState<ForYouSubFilter>('essentials');
  const [sessionAddCount, setSessionAddCount] = useState(0);
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});

  // AI Gap Audit state inside modal
  const [isAuditingGap, setIsAuditingGap] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditSummary, setAuditSummary] = useState('');
  const [auditSuggestions, setAuditSuggestions] = useState<AiMissingItemSuggestion[]>([]);

  // Quick / Voice state
  const [aiInput, setAiInput] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState('');
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateClassifyWarning | null>(null);

  // Detailed manual state
  const [detailName, setDetailName] = useState('');
  const [detailWhy, setDetailWhy] = useState('');
  const [detailGroupId, setDetailGroupId] = useState(groups[0]?.id || 'documents');
  const [detailQty, setDetailQty] = useState(1);
  const [detailCustomWeight, setDetailCustomWeight] = useState<number | null>(null);
  const [detailCarryOn, setDetailCarryOn] = useState(false);
  const [detailToBuy, setDetailToBuy] = useState(false);
  const [detailOwnership, setDetailOwnership] = useState<'personal' | 'shared'>('personal');
  const [detailOwnerId, setDetailOwnerId] = useState(crew[0]?.id || 'm1');
  const [detailSuccessMsg, setDetailSuccessMsg] = useState('');

  const defaultOwner = useMemo(() => {
    const fallbackSeat =
      claimedSeatId && crew.some((c) => c.id === claimedSeatId)
        ? claimedSeatId
        : crew[0]?.id || 'm1';
    return activeMemberId === 'all' ? fallbackSeat : activeMemberId;
  }, [activeMemberId, claimedSeatId, crew]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setTargetGroup(initialGroupId);
    setGroupStripOpen(false);
    setShowNewCategoryInline(false);
    setSmartParamsOpen(false);
    setSmartSyncedBanner('');
    if (setup) {
      setWeatherOverrides(setup.weatherOverrides || []);
      setLaundryEnabled(setup.laundry);
      setSpecialScenarios(inferDefaultScenariosFromSetup(setup, checkedLimitKg));
    }
    setSessionAddCount(0);
    setAddedKeys({});
    setQuickSuccessMsg('');
    setDetailSuccessMsg('');
    setClassifyError('');
    setDetailOwnerId(defaultOwner);
    if (initialGroupId !== 'auto' && groups.some((g) => g.id === initialGroupId)) {
      setDetailGroupId(initialGroupId);
    } else if (groups[0]) {
      setDetailGroupId(groups[0].id);
    }
  }, [open, initialTab, initialGroupId, defaultOwner, groups, setup, checkedLimitKg]);

  useEffect(() => {
    if (!pendingSelectGroupTitle) return;
    const match = groups.find(
      (g) => g.title.trim().toLowerCase() === pendingSelectGroupTitle.trim().toLowerCase()
    );
    if (match) {
      setTargetGroup(match.id);
      setDetailGroupId(match.id);
      setPendingSelectGroupTitle(null);
    }
  }, [groups, pendingSelectGroupTitle]);

  const toggleWeatherOverride = (target: PackingWeatherOverride) => {
    setSmartSyncedBanner('');
    setWeatherOverrides((prev) => {
      if (prev.includes(target)) return prev.filter((x) => x !== target);
      const cleaned =
        target === 'colder'
          ? prev.filter((x) => x !== 'warmer')
          : target === 'warmer'
          ? prev.filter((x) => x !== 'colder')
          : prev;
      return [...cleaned, target];
    });
  };

  const toggleScenario = (id: PackingScenarioId) => {
    setSmartSyncedBanner('');
    setSpecialScenarios((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const existingNamesLower = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      g.items.forEach((it) => {
        set.add(it.name.trim().toLowerCase());
        set.add(translateDemoPackItemName(it.name, activeLang).trim().toLowerCase());
      });
    });
    return set;
  }, [groups, activeLang]);

  const findGroupForHint = (hint: 'documents' | 'electronics' | 'clothing' | 'toiletries') => {
    const byId = groups.find((g) => g.id.toLowerCase().includes(hint));
    if (byId) return byId;
    const keywordMap: Record<typeof hint, string[]> = {
      documents: ['证件', '票', 'doc', 'pass', 'wallet'],
      electronics: ['电子', '数码', '充电', 'tech', 'elec'],
      clothing: ['衣', '穿搭', '鞋', 'cloth', 'wear'],
      toiletries: ['洗漱', '药', '护', 'toilet', 'health', 'med'],
    };
    const found = groups.find((g) =>
      keywordMap[hint].some((kw) => g.title.toLowerCase().includes(kw))
    );
    return found || groups[0];
  };

  const curatedCandidates = useMemo<CuratedGearCandidate[]>(() => {
    if (groups.length === 0) return [];
    const elecGrp = findGroupForHint('electronics');
    const clothGrp = findGroupForHint('clothing');
    const toilGrp = findGroupForHint('toiletries');
    const docGrp = findGroupForHint('documents');

    const list: CuratedGearCandidate[] = [];

    destinationGapPicks.forEach((pick) => {
      const targetGrp =
        pick.id.includes('umbrella') || pick.id.includes('rain') ? clothGrp : elecGrp;
      list.push({
        key: `gap_${pick.id}`,
        name: pick.name,
        why: pick.why,
        targetGroupId: targetGrp.id,
        targetGroupTitle: translateGroupTitleLabel(targetGrp.id, targetGrp.title, activeLang),
        unitWeightGrams: pick.unitWeightGrams,
        quantity: 1,
        carryOnOnly: !pick.id.includes('umbrella'),
      });
    });

    copy.extraPool.forEach((item) => {
      const targetGrp = findGroupForHint(item.groupHint);
      const alreadyExists =
        existingNamesLower.has(item.name.toLowerCase()) ||
        list.some((x) => x.name.toLowerCase() === item.name.toLowerCase());
      if (!alreadyExists) {
        list.push({
          key: item.key,
          name: item.name,
          why: item.why(intel.rainChance),
          targetGroupId: targetGrp.id,
          targetGroupTitle: translateGroupTitleLabel(targetGrp.id, targetGrp.title, activeLang),
          unitWeightGrams: Math.round(item.grams),
          quantity: 1,
          carryOnOnly: item.carryOn,
        });
      }
    });

    // Dynamically inject missing tailored items from Smart Parameters (Weather / Laundry / Scenarios)
    if (setup) {
      const simulatedSetup: TripSetup = {
        ...setup,
        weatherOverrides,
        laundry: laundryEnabled,
        specialScenarios,
      };
      const tailoredGroups = buildOfflineDeepPackingGroups({
        setup: simulatedSetup,
        intel,
        lang: activeLang,
        carryOnLimitKg,
        checkedLimitKg,
        ownerId: defaultOwner,
        alwaysPackLibrary,
        neverSuggestItems,
      });

      const scenarioDiffList: CuratedGearCandidate[] = [];
      tailoredGroups.forEach((tg) => {
        const matchedExistingGrp =
          groups.find((g) => g.id === tg.id) ||
          groups.find(
            (g) => g.title.trim().toLowerCase() === tg.title.trim().toLowerCase()
          ) ||
          clothGrp;

        tg.items.forEach((it) => {
          const lower = it.name.trim().toLowerCase();
          const translatedLower = translateDemoPackItemName(it.name, activeLang)
            .trim()
            .toLowerCase();
          if (
            existingNamesLower.has(lower) ||
            existingNamesLower.has(translatedLower) ||
            list.some((x) => x.name.trim().toLowerCase() === lower) ||
            scenarioDiffList.some((x) => x.name.trim().toLowerCase() === lower)
          ) {
            return;
          }
          const qty = Math.max(1, it.quantity || 1);
          const unitG =
            it.unitWeightGrams ?? Math.max(5, Math.round(it.weightGrams / qty));
          scenarioDiffList.push({
            key: `smart_${tg.id}_${it.name}`,
            name: translateDemoPackItemName(it.name, activeLang),
            why: it.why,
            targetGroupId: matchedExistingGrp.id,
            targetGroupTitle: translateGroupTitleLabel(
              matchedExistingGrp.id,
              matchedExistingGrp.title,
              activeLang
            ),
            unitWeightGrams: unitG,
            quantity: qty,
            carryOnOnly: Boolean(it.carryOnOnly),
          });
        });
      });

      // Prepend scenario/weather-tailored missing items so parameter tweaks show immediate top results
      return [...scenarioDiffList.slice(0, 14), ...list];
    }

    return list;
  }, [
    groups,
    destinationGapPicks,
    intel,
    copy,
    activeLang,
    existingNamesLower,
    setup,
    weatherOverrides,
    laundryEnabled,
    specialScenarios,
    carryOnLimitKg,
    checkedLimitKg,
    defaultOwner,
    alwaysPackLibrary,
    neverSuggestItems,
  ]);

  const quickChips = copy.quickChips;

  const runAiAudit = async () => {
    if (isAuditingGap) return;
    setIsAuditingGap(true);
    setAuditError('');
    try {
      const res = await onAuditMissingItems();
      setAuditSummary(res.diagnosisSummary);
      setAuditSuggestions(res.suggestions);
    } catch (err) {
      if (err instanceof Error && err.message === 'PRO_PAYWALL_GATED') {
        return;
      }
      setAuditError(
        err instanceof Error ? err.message : copy.aiAuditUnavailable
      );
    } finally {
      setIsAuditingGap(false);
    }
  };

  const handleSelectForYouSub = (sub: ForYouSubFilter) => {
    setForYouSub(sub);
    if (sub === 'ai_audit' && auditSuggestions.length === 0 && !isAuditingGap) {
      void runAiAudit();
    }
  };

  const handleAddCandidate = (cand: CuratedGearCandidate) => {
    const resolvedGroupId = targetGroup !== 'auto' ? targetGroup : cand.targetGroupId;
    onAddItem(
      resolvedGroupId,
      cand.name,
      cand.why,
      cand.carryOnOnly,
      defaultOwner,
      'personal',
      cand.quantity,
      cand.unitWeightGrams,
      false
    );
    setAddedKeys((prev) => ({ ...prev, [cand.key]: true }));
    setSessionAddCount((n) => n + 1);
  };

  const handleTweakCandidate = (
    name: string,
    why: string,
    groupId: string,
    qty: number,
    unitGrams: number,
    carryOn: boolean
  ) => {
    setDetailName(name);
    setDetailWhy(why);
    setDetailGroupId(targetGroup !== 'auto' ? targetGroup : groupId);
    setDetailQty(Math.max(1, qty));
    setDetailCustomWeight(unitGrams);
    setDetailCarryOn(carryOn);
    setDetailToBuy(false);
    setActiveTab('detailed');
  };

  const submitQuickText = async (rawText: string, fromVoice = false) => {
    const text = rawText.trim();
    if (!text || isClassifying) return;
    setClassifyError('');
    setQuickSuccessMsg('');
    setDuplicateWarning(null);

    // If user explicitly locked a specific target category, add directly without AI latency
    if (targetGroup !== 'auto') {
      const { cleanName, parsedQty } = parseNameAndQuantity(text);
      const finalName = cleanName || text;
      const qty = parsedQty ?? 1;
      const unitWeight = estimateDefaultUnitWeightGrams(finalName, targetGroup);
      onAddItem(
        targetGroup,
        finalName,
        copy.addedCategoryWhy,
        false,
        defaultOwner,
        'personal',
        qty,
        unitWeight,
        false
      );
      setAiInput('');
      setSessionAddCount((n) => n + 1);
      setQuickSuccessMsg(copy.addedToast(finalName));
      return;
    }

    setIsClassifying(true);
    try {
      const warning = await onClassifyAndAddPackItem(text, defaultOwner);
      if (warning) {
        setDuplicateWarning(warning);
      } else {
        setAiInput('');
        setSessionAddCount((n) => n + 1);
        setQuickSuccessMsg(copy.sortedAddedToast(text));
      }
    } catch (err) {
      if (fromVoice) {
        const localParsed = parseVoicePackingFallback(text, groups);
        if (localParsed.length > 0) {
          localParsed.forEach((p) => {
            onAddItem(
              p.targetGroupId,
              p.name,
              copy.voiceAddedWhy,
              p.carryOnOnly,
              defaultOwner,
              'personal',
              p.quantity,
              p.unitWeightGrams,
              false
            );
          });
          setAiInput('');
          setSessionAddCount((n) => n + localParsed.length);
          setQuickSuccessMsg(copy.voiceAddedCountToast(localParsed.length));
          return;
        }
      }
      if (err instanceof Error && err.message === 'PRO_PAYWALL_GATED') {
        return;
      }
      setClassifyError(
        err instanceof Error ? err.message : copy.aiSortUnavailable
      );
    } finally {
      setIsClassifying(false);
    }
  };

  const previewDetailUnitWeight =
    detailCustomWeight ??
    estimateDefaultUnitWeightGrams(parseNameAndQuantity(detailName).cleanName, detailGroupId);

  const handleSubmitDetailed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailName.trim()) return;
    const { cleanName, parsedQty } = parseNameAndQuantity(detailName);
    const finalName = cleanName || detailName.trim();
    const finalQty = detailQty > 1 ? detailQty : parsedQty ?? detailQty;
    const finalUnitWeight =
      detailCustomWeight ?? estimateDefaultUnitWeightGrams(finalName, detailGroupId);

    onAddItem(
      detailGroupId,
      finalName,
      detailWhy.trim() || copy.detailedDefaultWhy,
      detailCarryOn,
      detailOwnerId,
      detailOwnership,
      finalQty,
      finalUnitWeight,
      detailToBuy
    );
    setDetailName('');
    setDetailWhy('');
    setDetailQty(1);
    setDetailCustomWeight(null);
    setDetailCarryOn(false);
    setDetailToBuy(false);
    setSessionAddCount((n) => n + 1);
    setDetailSuccessMsg(copy.addedToast(finalName));
  };

  if (!open) return null;

  const selectedGroupObj =
    targetGroup === 'auto' ? null : groups.find((g) => g.id === targetGroup) || null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-gear-modal-title"
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair tk-bg-card shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[86vh] transition-all"
      >
        {/* Mobile Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-paper mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* 1. Minimalist Packy-Style Single-Row Header */}
        <div className="px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3 tk-bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              id="add-gear-modal-title"
              onClick={() => setGroupStripOpen((v) => !v)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-2 -ml-2 text-base sm:text-lg font-extrabold tracking-tight tk-text-ink hover:tk-bg-paper transition-colors cursor-pointer min-w-0"
            >
              <span className="truncate">
                {selectedGroupObj
                  ? copy.addToGroupTitle(
                      translateGroupTitleLabel(
                        selectedGroupObj.id,
                        selectedGroupObj.title,
                        activeLang
                      )
                    )
                  : copy.autoSortTitle}
              </span>
              <ChevronDown
                className={`h-4 w-4 tk-text-ink2 shrink-0 transition-transform duration-150 ${
 groupStripOpen ? 'rotate-180' : ''
 }`}
              />
            </button>

            {sessionAddCount > 0 && (
              <span className="text-xs font-semibold tk-text-forest tabular-nums whitespace-nowrap">
                · {copy.sessionAddedCount(sessionAddCount)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setGroupStripOpen(true);
                setShowNewCategoryInline(true);
              }}
              className="h-8 inline-flex items-center gap-1 rounded-full border tk-bc-hair tk-bg-paper px-2.5 text-xs font-semibold tk-text-forest hover:tk-bc-forest whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5 shrink-0" />
              <span>{copy.newListBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink transition-colors cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Target Category Strip */}
        {groupStripOpen && (
          <div className="px-5 pb-3 border-b tk-bc-hair tk-bg-card space-y-2.5 shrink-0">
            <HorizontalChipScroller
              activeKey={targetGroup}
              fadeBgClassName="from-white"
              ariaLabel={copy.selectCategoryAria}
            >
              <button
                type="button"
                data-chip-active={targetGroup === 'auto' ? 'true' : undefined}
                onClick={() => {
                  setTargetGroup('auto');
                  setGroupStripOpen(false);
                }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 targetGroup === 'auto'
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-forest-plate'
 }`}
              >
                ✨ {copy.autoSortChip}
              </button>

              {groups.map((grp) => {
                const isSelected = targetGroup === grp.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    data-chip-active={isSelected ? 'true' : undefined}
                    onClick={() => {
                      setTargetGroup(grp.id);
                      setDetailGroupId(grp.id);
                      setGroupStripOpen(false);
                    }}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors tabular-nums cursor-pointer ${
 isSelected
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-forest-plate'
 }`}
                  >
                    {translateGroupTitleLabel(grp.id, grp.title, activeLang)} ({grp.items.length})
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowNewCategoryInline((v) => !v)}
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed tk-bc-forest tk-bg-forest-tint text-xs font-bold tk-text-forest whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5 shrink-0" />
                <span>{copy.newCategoryChip}</span>
              </button>
            </HorizontalChipScroller>

            {showNewCategoryInline && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanTitle = newCategoryTitle.trim();
                  if (!cleanTitle) return;
                  setPendingSelectGroupTitle(cleanTitle);
                  onAddGroup(cleanTitle, newCategoryCube.trim(), newCategoryColor);
                  setNewCategoryTitle('');
                  setNewCategoryCube('');
                  setShowNewCategoryInline(false);
                  setGroupStripOpen(false);
                }}
                className="rounded-xl border tk-bc-hair tk-bg-paper p-3 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCategoryTitle}
                    onChange={(e) => setNewCategoryTitle(e.target.value)}
                    placeholder={copy.newCategoryNamePlaceholder}
                    className="rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1.5 text-base sm:text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newCategoryCube}
                    onChange={(e) => setNewCategoryCube(e.target.value)}
                    placeholder={copy.newCategoryCubePlaceholder}
                    className="rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1.5 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {GROUP_COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        title={getGroupColorLabel(c.key, activeLang)}
                        aria-label={getGroupColorLabel(c.key, activeLang)}
                        onClick={() => setNewCategoryColor(c.key)}
                        style={{ backgroundColor: c.hex }}
                        className={`h-4 w-4 rounded-full cursor-pointer ${
 newCategoryColor === c.key
 ? 'ring-2 ring-offset-1 tk-rc-ink scale-110'
 : 'opacity-75'
 }`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={!newCategoryTitle.trim()}
                    className="rounded-lg tk-bg-forest px-3 py-1.5 text-xs font-semibold tk-text-card disabled:opacity-40 whitespace-nowrap cursor-pointer"
                  >
                    {copy.createAndSelectBtn}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 2. Packy-Style 3-Way Segmented Mode Switcher */}
        <div className="px-5 pb-3 tk-bg-card shrink-0">
          <div
            role="tablist"
            aria-label={copy.modeAria}
            className="grid grid-cols-3 gap-1 rounded-2xl tk-bg-paper p-1"
          >
            {(
              [
                {
                  id: 'for_you' as AddGearModeTab,
                  icon: Sparkles,
                  label: copy.tabForYou,
                },
                {
                  id: 'quick' as AddGearModeTab,
                  icon: Search,
                  label: copy.tabQuick,
                },
                {
                  id: 'detailed' as AddGearModeTab,
                  icon: SlidersHorizontal,
                  label: copy.tabDetailed,
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
 ? 'tk-bg-card tk-text-ink shadow-xs font-bold'
 : 'tk-text-ink2 hover:tk-text-ink font-medium'
 }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
 isActive ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                  />
                  <span className="text-[11px] sm:text-xs leading-none truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Scrollable Mode Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3.5 min-h-[280px]">
          {/* TAB 1: SMART GAP CHECK & CURATED RECOMMENDATIONS */}
          {activeTab === 'for_you' && (
            <>
              {/* Compact Smart Parameter Calibration Capsule Bar (Size / Weather / Scenarios) */}
              {setup && (
                <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 text-xs tk-text-ink">
                      <span className="inline-flex items-center rounded-lg tk-bg-card border tk-bc-hair px-2 py-0.5 font-semibold whitespace-nowrap">
                        {weatherOverrides.length > 0
                          ? weatherOverrides
                              .map((w) =>
                                w === 'colder'
                                  ? copy.weatherColderShort
                                  : w === 'warmer'
                                  ? copy.weatherWarmerShort
                                  : copy.weatherWetterShort
                              )
                              .join(' · ')
                          : `🌤️ ${intel.tempRange}`}
                      </span>
                      <span className="inline-flex items-center rounded-lg tk-bg-card border tk-bc-hair px-2 py-0.5 font-semibold whitespace-nowrap">
                        {laundryEnabled ? copy.laundryChipOn : copy.laundryChipOff}
                      </span>
                      {specialScenarios.length > 0 && (
                        <span className="inline-flex items-center rounded-lg tk-bg-forest-tint border tk-bc-hair px-2 py-0.5 font-bold tk-text-forest tabular-nums whitespace-nowrap">
                          {copy.scenarioChipCount(specialScenarios.length)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSmartParamsOpen((v) => !v)}
                      className="h-7 inline-flex items-center gap-1 rounded-lg border tk-bc-hair tk-bg-card px-2.5 text-xs font-bold tk-text-forest hover:tk-bc-forest whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3 w-3 shrink-0" />
                      <span>{copy.tuneParamsBtn}</span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${
 smartParamsOpen ? 'rotate-180' : ''
 }`}
                      />
                    </button>
                  </div>

                  {smartParamsOpen && (
                    <div className="border-t tk-bc-hair pt-3 space-y-3">
                      {/* 1. Weather Feel + Laundry */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold tk-text-ink2 mr-1">
                          {copy.weatherLaundryLabel}
                        </span>
                        {(
                          [
                            { id: 'colder' as const, label: copy.weatherColderOpt },
                            { id: 'warmer' as const, label: copy.weatherWarmerOpt },
                            { id: 'wetter' as const, label: copy.weatherWetterOpt },
                          ] as const
                        ).map((opt) => {
                          const active = weatherOverrides.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleWeatherOverride(opt.id)}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 active
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bg-forest-plate'
 }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setSmartSyncedBanner('');
                            setLaundryEnabled((v) => !v);
                          }}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 laundryEnabled
 ? 'tk-bg-forest-tint border tk-bc-forest tk-text-forest'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2'
 }`}
                        >
                          {copy.laundryOpt}
                        </button>
                      </div>

                      {/* 2. Trip Scenarios */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-bold tk-text-ink2">
                          {copy.specialScenariosLabel}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PACKING_SCENARIO_SPECS.map((sc) => {
                            const active = specialScenarios.includes(sc.id);
                            const label = getPackingScenarioLabel(sc.id, activeLang);
                            return (
                              <button
                                key={sc.id}
                                type="button"
                                onClick={() => toggleScenario(sc.id)}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 active
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bg-forest-plate'
 }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. One-Tap Smart Sync to Full Packing List */}
                      {onApplySmartParams && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t tk-bc-hair">
                          <span className="text-[11px] tk-text-ink2">
                            {smartSyncedBanner || copy.paramsLiveHint}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void onApplySmartParams({
                                updatedSetupPatch: {
                                  weatherOverrides,
                                  laundry: laundryEnabled,
                                  specialScenarios,
                                },
                                mergeMode: 'smart_merge',
                                useInstantOffline: true,
                              });
                              setSmartSyncedBanner(copy.paramsSyncedMsg);
                              setSmartParamsOpen(false);
                            }}
                            className="h-8 inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-3 text-xs font-bold tk-text-card hover:tk-bg-press whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Zap className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                            <span>{copy.smartMergeBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <HorizontalChipScroller
                activeKey={forYouSub}
                fadeBgClassName="from-white"
                ariaLabel={copy.gapFiltersAria}
              >
                {(
                  [
                    {
                      id: 'essentials' as ForYouSubFilter,
                      label: copy.subRouteEssentials,
                    },
                    {
                      id: 'ai_audit' as ForYouSubFilter,
                      label: copy.subAiAudit,
                    },
                    {
                      id: 'always_pack' as ForYouSubFilter,
                      label: copy.subAlwaysPack(alwaysPackLibrary.length),
                    },
                  ] as const
                ).map((pill) => {
                  const isActive = forYouSub === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      data-chip-active={isActive ? 'true' : undefined}
                      onClick={() => handleSelectForYouSub(pill.id)}
                      className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isActive
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink hover:tk-bg-paper'
 }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              {forYouSub === 'essentials' && (
                <div className="space-y-2.5">
                  {curatedCandidates.map((cand) => {
                    const isAdded = Boolean(addedKeys[cand.key]);
                    const grpObj =
                      groups.find((g) => g.id === cand.targetGroupId) || groups[0];
                    const iconMeta = grpObj
                      ? resolvePackingGroupIconMeta(grpObj)
                      : null;

                    return (
                      <div
                        key={cand.key}
                        className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 flex items-center justify-between gap-3 hover:tk-bc-hair transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {iconMeta && (
                            <div className="mt-0.5 shrink-0">
                              <AccentIconBadge
                                accent={iconMeta.accent}
                                icon={iconMeta.Icon}
                                size="md"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold tk-text-ink truncate">
                              {cand.name}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs tk-text-ink2 tabular-nums">
                              <span>{cand.targetGroupTitle}</span>
                              <span>·</span>
                              <span>
                                {formatItemWeightByPref(cand.unitWeightGrams, unitSystem)}
                              </span>
                              {cand.carryOnOnly && (
                                <>
                                  <span>·</span>
                                  <span className="tk-text-forest font-medium">
                                    {t('common.carryOnBadge')}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs tk-text-ink2 truncate">
                              {cand.why}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isAdded && (
                            <button
                              type="button"
                              onClick={() =>
                                handleTweakCandidate(
                                  cand.name,
                                  cand.why,
                                  cand.targetGroupId,
                                  cand.quantity,
                                  cand.unitWeightGrams,
                                  cand.carryOnOnly
                                )
                              }
                              className="px-2 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-text-ink whitespace-nowrap cursor-pointer"
                            >
                              {copy.tweakBtn}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddCandidate(cand)}
                            className={`h-9 inline-flex items-center justify-center gap-1 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isAdded
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-hair cursor-default'
 : 'tk-bg-forest tk-text-card hover:tk-bg-press'
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
                      </div>
                    );
                  })}
                </div>
              )}

              {forYouSub === 'ai_audit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold tk-text-ink2">
                      {auditSummary || copy.auditIntroDefault}
                    </span>
                    <button
                      type="button"
                      onClick={() => void runAiAudit()}
                      disabled={isAuditingGap}
                      className="inline-flex items-center gap-1 rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isAuditingGap ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin tk-text-forest" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 tk-text-forest" />
                      )}
                      <span>
                        {isAuditingGap ? copy.scanningBtn : copy.rescanBtn}
                      </span>
                    </button>
                  </div>

                  {isAuditingGap && auditSuggestions.length === 0 ? (
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 flex items-center justify-between gap-3 animate-pulse"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-36 rounded tk-bg-forest-plate" />
                            <div className="h-3 w-52 rounded tk-bg-forest-plate" />
                          </div>
                          <div className="h-9 w-20 rounded-xl tk-bg-forest-plate shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : auditError ? (
                    <div className="rounded-2xl border tk-bc-danger-hair tk-bg-danger-tint px-4 py-3 flex items-center gap-2 text-xs tk-text-danger">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{auditError}</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {auditSuggestions.map((sug) => {
                        const key = `audit_${sug.name}`;
                        const isAdded = Boolean(addedKeys[key]);
                        return (
                          <div
                            key={sug.name}
                            className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold tk-text-ink">
                                  {sug.name}
                                </span>
                                {(sug.quantity ?? 1) > 1 && (
                                  <span className="rounded-md tk-bg-forest-tint px-1.5 py-0.5 font-num text-[11px] font-bold tk-text-forest">
                                    ×{sug.quantity}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                                {sug.targetGroupTitle} ·{' '}
                                {formatItemWeightByPref(sug.weightGrams, unitSystem)}
                                {sug.carryOnOnly ? ` · ${t('common.carryOnBadge')}` : ''}
                              </div>
                              <p className="mt-0.5 text-xs tk-text-ink2 leading-relaxed">
                                {sug.why}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => {
                                onBatchAddMissingItems([sug], activeMemberId);
                                setAddedKeys((prev) => ({ ...prev, [key]: true }));
                                setSessionAddCount((n) => n + 1);
                              }}
                              className={`h-9 inline-flex items-center justify-center gap-1 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isAdded
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-hair cursor-default'
 : 'tk-bg-forest tk-text-card hover:tk-bg-press'
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
                  )}
                </div>
              )}

              {forYouSub === 'always_pack' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tk-text-ink2">
                      {copy.alwaysPackDesc}
                    </span>
                    {alwaysPackLibrary.length === 0 ? (
                      <button
                        type="button"
                        onClick={onSeedAlwaysPack}
                        className="rounded-xl tk-bg-forest px-3 py-1.5 text-xs font-semibold tk-text-card whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copy.extractEssentialsBtn}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSyncAlwaysPack();
                          setSessionAddCount((n) => n + 1);
                        }}
                        className="rounded-xl border tk-bc-hair tk-bg-forest-tint px-3 py-1.5 text-xs font-semibold tk-text-forest whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copy.syncAllMissingBtn}
                      </button>
                    )}
                  </div>

                  {alwaysPackLibrary.length === 0 ? (
                    <div className="rounded-2xl border border-dashed tk-bc-hair tk-bg-paper px-4 py-6 text-center text-xs tk-text-ink2">
                      {copy.alwaysPackEmptyHint}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alwaysPackLibrary.map((tpl) => {
                        const inTrip = existingNamesLower.has(tpl.name.trim().toLowerCase());
                        const key = `tpl_${tpl.id}`;
                        const isAdded = inTrip || Boolean(addedKeys[key]);
                        return (
                          <div
                            key={tpl.id}
                            className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <AccentIconBadge accent="teal" icon={Bookmark} size="sm" />
                              <div className="min-w-0">
                                <div className="text-sm font-bold tk-text-ink truncate">
                                  {translateDemoPackItemName(tpl.name, activeLang)}
                                </div>
                                <div className="text-xs tk-text-ink2 tabular-nums">
                                  {formatItemWeightByPref(
                                    tpl.unitWeightGrams * Math.max(1, tpl.quantity || 1),
                                    unitSystem
                                  )}
                                  {tpl.carryOnOnly ? ` · ${t('common.carryOnBadge')}` : ''}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => {
                                const grpId =
                                  targetGroup !== 'auto'
                                    ? targetGroup
                                    : groups.find((g) => g.id === tpl.groupId)?.id ||
                                      groups[0]?.id ||
                                      'documents';
                                onAddItem(
                                  grpId,
                                  tpl.name,
                                  tpl.why,
                                  tpl.carryOnOnly,
                                  defaultOwner,
                                  'personal',
                                  Math.max(1, tpl.quantity || 1),
                                  tpl.unitWeightGrams,
                                  false
                                );
                                setAddedKeys((prev) => ({ ...prev, [key]: true }));
                                setSessionAddCount((n) => n + 1);
                              }}
                              className={`h-9 inline-flex items-center justify-center gap-1 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isAdded
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-hair cursor-default'
 : 'tk-bg-forest tk-text-card hover:tk-bg-press'
 }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                  <span>{copy.inListBtn}</span>
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
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: QUICK INPUT & VOICE DICTATION */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitQuickText(aiInput, false);
                }}
                className="space-y-2.5"
              >
                <div className="flex items-center gap-2 rounded-2xl border tk-bc-hair tk-bg-paper pl-3.5 pr-2 py-1.5 focus-within:tk-bc-forest focus-within:tk-bg-card transition-colors">
                  <Search className="h-4 w-4 tk-text-ink2 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={t('packing.quickAddPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent py-1.5 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:outline-none"
                  />
                  <AiVoiceInputButton
                    iconOnly
                    compact
                    contextHint="packing"
                    disabled={isClassifying}
                    label={t('tasks.voiceDictateLabel')}
                    onInterimTranscript={(live) => setAiInput(live)}
                    onTranscript={async (transcript) => {
                      setAiInput(transcript);
                      await submitQuickText(transcript, true);
                    }}
                    onError={(msg) => setClassifyError(msg)}
                  />
                  <button
                    type="submit"
                    disabled={isClassifying || !aiInput.trim()}
                    className="h-9 inline-flex items-center justify-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold tk-text-card hover:tk-bg-press disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isClassifying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isClassifying ? t('packing.addingBtn') : copy.addBtn}
                    </span>
                  </button>
                </div>

                {quickSuccessMsg && !classifyError && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold tk-text-forest">
                    <Check className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                    <span>{quickSuccessMsg}</span>
                  </p>
                )}
                {classifyError && (
                  <p className="text-xs font-medium tk-text-warning">{classifyError}</p>
                )}

                {duplicateWarning && (
                  <div className="rounded-2xl border tk-bc-warning-hair tk-bg-warning-tint p-3.5 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2 min-w-0 text-xs tk-text-warning">
                      <Lightbulb className="h-4 w-4 tk-text-warning shrink-0 mt-0.5" />
                      <span>{duplicateWarning.duplicateQuestion}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onCommitClassifiedItem(duplicateWarning.pendingPayload, true);
                          setDuplicateWarning(null);
                          setAiInput('');
                          setSessionAddCount((n) => n + 1);
                        }}
                        className="rounded-xl border tk-bc-warning-hair tk-bg-card px-3 py-1.5 text-xs font-semibold tk-text-warning hover:tk-bg-warning-tint cursor-pointer"
                      >
                        {t('packingExtra.keepBoth')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeduplicateExistingItem(duplicateWarning.duplicateCandidateId);
                          setDuplicateWarning(null);
                          setAiInput('');
                          setSessionAddCount((n) => n + 1);
                        }}
                        className="rounded-xl tk-bg-forest px-3 py-1.5 text-xs font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                      >
                        {t('packingExtra.keepExisting')}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="space-y-2">
                <div className="text-xs font-bold tk-text-ink2">
                  {copy.quickChipsTitle}
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickChips.map((chip) => {
                    const key = `chip_${chip}`;
                    const isAdded = Boolean(addedKeys[key]);
                    return (
                      <button
                        key={chip}
                        type="button"
                        disabled={isClassifying || isAdded}
                        onClick={async () => {
                          setAddedKeys((prev) => ({ ...prev, [key]: true }));
                          await submitQuickText(chip, false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 isAdded
 ? 'tk-bc-hair tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-card tk-text-ink hover:tk-bc-forest'
 }`}
                      >
                        {isAdded ? (
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        ) : (
                          <Plus className="h-3 w-3 tk-text-forest" />
                        )}
                        <span>{chip}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILED MANUAL ENTRY */}
          {activeTab === 'detailed' && (
            <form onSubmit={handleSubmitDetailed} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold tk-text-ink2">
                  {copy.itemNameLabel}
                </label>
                <input
                  type="text"
                  value={detailName}
                  onChange={(e) => setDetailName(e.target.value)}
                  placeholder={copy.itemNamePlaceholder}
                  className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-base sm:text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:tk-bg-card focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold tk-text-ink2">
                    {copy.categoryLabel}
                  </label>
                  <select
                    value={detailGroupId}
                    onChange={(e) => setDetailGroupId(e.target.value)}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2.5 text-base sm:text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:tk-bg-card focus:outline-none"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {translateGroupTitleLabel(g.id, g.title, activeLang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold tk-text-ink2">
                      {copy.quantityLabel}
                    </label>
                    <div className="flex items-center justify-between rounded-xl border tk-bc-hair tk-bg-paper px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg tk-bg-card border tk-bc-hair tk-text-ink cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-num text-sm font-bold tk-text-ink tabular-nums">
                        ×{detailQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailQty((q) => Math.min(99, q + 1))}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg tk-bg-card border tk-bc-hair tk-text-ink cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold tk-text-ink2">
                      {copy.unitWeightLabel}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={20000}
                      value={detailCustomWeight ?? ''}
                      placeholder={String(previewDetailUnitWeight)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDetailCustomWeight(
                          e.target.value === '' || !Number.isFinite(val) ? null : Math.max(5, val)
                        );
                      }}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 font-num text-base sm:text-sm font-semibold tk-text-ink tabular-nums focus:tk-bc-forest focus:tk-bg-card focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold tk-text-ink2">
                  {copy.noteLabel}
                </label>
                <input
                  type="text"
                  value={detailWhy}
                  onChange={(e) => setDetailWhy(e.target.value)}
                  placeholder={copy.notePlaceholder}
                  className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:tk-bg-card focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailCarryOn((v) => !v)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 detailCarryOn
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-card tk-text-ink2'
 }`}
                >
                  {t('common.carryOnBadge')}
                </button>

                <button
                  type="button"
                  onClick={() => setDetailToBuy((v) => !v)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 detailToBuy
 ? 'tk-bc-warning-hair tk-bg-danger-tint tk-text-danger'
 : 'tk-bc-hair tk-bg-card tk-text-ink2'
 }`}
                >
                  {copy.markToBuyBtn}
                </button>

                {crew.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDetailOwnership((prev) => (prev === 'shared' ? 'personal' : 'shared'))
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
 detailOwnership === 'shared'
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-card tk-text-ink2'
 }`}
                  >
                    {copy.sharedGearBtn}
                  </button>
                )}
              </div>

              {crew.length > 1 && detailOwnership === 'personal' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs tk-text-ink2 mr-1">
                    {copy.assignToLabel}
                  </span>
                  {crew.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDetailOwnerId(m.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
 detailOwnerId === m.id
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-card tk-text-ink2'
 }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
 HERO_AVATAR_BG[m.accent]
 }`}
                      >
                        {translateMemberInitials(m.initials, activeLang)}
                      </span>
                      <span>{translateMemberName(m.name, activeLang)}</span>
                    </button>
                  ))}
                </div>
              )}

              {detailSuccessMsg && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold tk-text-forest">
                  <Check className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                  <span>{detailSuccessMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={!detailName.trim()}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl tk-bg-forest px-4 py-2.5 text-sm font-bold tk-text-card hover:tk-bg-press disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{copy.submitDetailedBtn}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

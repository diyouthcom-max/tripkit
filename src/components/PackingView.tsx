import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  ShieldAlert,
  PlugZap,
  Globe,
  PartyPopper,
  BellPlus,
  BellRing,
  Clock,
  PieChart as PieChartIcon,
  Sparkles,
  Loader2,
  Users,
  Sun,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  ListTodo,
  Luggage,
  ClipboardCheck,
  AlertTriangle,
  X,
  ShoppingBag,
  Bookmark,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SmartPackingInlinePanel } from './SmartPackingInlinePanel';
import { PackingItemDetailSheet } from './PackingItemDetailSheet';
import { getLocalizedTaskQuickPresets } from './TripTasksWorkspace';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { AddGearModal, type AddGearModeTab } from './AddGearModal';
import { ToBuyModal } from './ToBuyModal';
import { TripTasksModal } from './TripTasksModal';
import { WeightAnalyticsModal } from './WeightAnalyticsModal';
import type { PackingWizardSubmitPayload } from './PackingListWizardModal';
import { parseVoicePackingFallback } from '../utils/speechHelpers';
import {
  CARRY_ON_LIMIT_KG,
  CHECKED_LIMIT_KG,
  VALID_BAG_IDS,
  estimateDefaultUnitWeightGrams,
  getItemQuantity,
  getItemUnitWeight,
  getLocalizedSmartBagSpecs,
  isItemCarryOnWeight,
  parseNameAndQuantity,
  resolveItemSmartBag,
} from '../utils/packingHelpers';
import { useTranslation } from 'react-i18next';
import {
  translateDemoPackItemName,
  translateDemoPackItemWhy,
  translateDemoTaskNote,
  translateDemoTaskTitle,
  translateGroupCubeLabel,
  translateGroupTitleLabel,
  translateIntelField,
  translateMemberInitials,
  translateMemberName,
  translateTaskCategory,
  translateTaskTiming,
} from '../i18n';
import {
  formatDateByPref,
  formatItemWeightByPref,
  formatTotalWeightByPref,
  formatWeightAgainstLimit,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import { getCategoryPieTooltipCopy, getGroupColorLabel } from '../i18n/packs/packingModalsPack';
import { getPackingViewCopy } from '../i18n/packs/packingViewPack';
import {
  AccentIconBadge,
  HERO_AVATAR_BG,
  resolvePackingGroupIconMeta,
  resolveTaskCategoryIconMeta,
} from '../utils/accentTheme';
import {
  buildGearAffiliateOffers,
  getDestinationGearGapRecommendations,
  type DestinationGearGapPick,
} from '../utils/affiliateHelpers';
import type {
  AffiliatePartnerConfig,
  AiMissingItemSuggestion,
  AlwaysPackTemplateItem,
  AppLanguage,
  BaggagePresetId,
  CrewMember,
  PackingGroup,
  PackingItem,
  PackingReminderSettings,
  SmartBagId,
  TimeFormatPref,
  TripIntelligence,
  TripSetup,
  TripTask,
  TripTaskCategory,
  UnitSystem,
} from '../types';
import {
  formatLocalDateTimeInputValue,
  formatScheduleBadgeLabel,
  type ResolvedScheduledAlert,
} from '../utils/notificationScheduler';

export interface PendingClassifiedPackPayload {
  item: Omit<PackingItem, 'id' | 'done'>;
  targetGroupId: string;
  newGroupTitle: string;
  newGroupCubeLabel: string;
  newGroupColorKey: PackingGroup['colorKey'];
}

export interface DuplicateClassifyWarning {
  duplicateCandidateId: string;
  duplicateQuestion: string;
  pendingPayload: PendingClassifiedPackPayload;
}

interface PackingViewProps {
  groups: PackingGroup[];
  tasks: TripTask[];
  crew: CrewMember[];
  claimedSeatId?: string;
  intel: TripIntelligence;
  setup?: TripSetup;
  cities: string[];
  departureDate: string;
  reminder: PackingReminderSettings;
  learnedCategoryMap: Record<string, string>;
  smartBagOverrides: Record<string, SmartBagId>;
  smartBagSummaryTip: string;
  packingViewMode?: 'checklist' | 'smart_bags';
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  unitSystem?: UnitSystem;
  baggagePreset?: BaggagePresetId;
  affiliatePartners?: AffiliatePartnerConfig;
  alwaysPackLibrary: AlwaysPackTemplateItem[];
  neverSuggestItems?: string[];
  onToggleToBuy: (groupId: string, itemId: string) => void;
  onToggleAlwaysPack: (groupId: string, itemId: string) => void;
  onSwitchCabinCheckIn: (
    groupId: string,
    itemId: string,
    targetLocation: 'cabin' | 'checkin'
  ) => void;
  onDontSuggestItemAgain: (groupId: string, itemId: string) => void;
  onSyncAlwaysPack: () => void;
  onSeedAlwaysPack: () => void;
  onRemoveFromAlwaysPackLibrary: (templateId: string, itemName: string) => void;
  onQuickAddAffiliateGear: (pick: DestinationGearGapPick) => void;
  onSelectBaggagePreset?: (preset: Exclude<BaggagePresetId, 'custom'>) => void;
  onChangePackingViewMode?: (mode: 'checklist' | 'smart_bags') => void;
  onSaveSmartBagPlan: (overrides: Record<string, SmartBagId>, summaryTip: string) => void;
  onAssignItemSmartBag: (itemId: string, bagId: SmartBagId | null, itemName?: string) => void;
  onResetSmartBagOverrides?: () => void;
  onAuditMissingItems: () => Promise<{
    diagnosisSummary: string;
    suggestions: AiMissingItemSuggestion[];
  }>;
  onBatchAddMissingItems: (
    itemsToAdd: AiMissingItemSuggestion[],
    activeMemberId: string
  ) => void;
  onToggleItem: (groupId: string, itemId: string, actorId?: string) => void;
  onAdjustItemQuantity: (groupId: string, itemId: string, delta: number) => void;
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
  onUpdateGroup: (
    groupId: string,
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey']
  ) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateItem: (
    groupId: string,
    itemId: string,
    updates: Partial<PackingItem>,
    targetGroupId?: string,
    silent?: boolean
  ) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onCycleOwnership: (
    groupId: string,
    itemId: string,
    mode?: 'member' | 'ownership'
  ) => void;
  onToggleMorningOfDeparture: (groupId: string, itemId: string) => void;
  onReorderGroups: (sourceGroupId: string, targetGroupId: string) => void;
  onMoveOrReorderItem: (
    sourceGroupId: string,
    sourceItemId: string,
    targetGroupId: string,
    targetItemId?: string
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
  onTogglePinReminder: (groupId: string, itemId: string) => void;
  onUpdateReminder: (next: PackingReminderSettings) => void;
  onTriggerTestReminder: () => void;
  onTriggerMorningReminder: () => void;
  onRequestBrowserPermission: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  timeFormat?: TimeFormatPref;
  scheduledPackingAlerts?: ResolvedScheduledAlert[];
  onAddCustomPackingAlert?: (payload: {
    title: string;
    triggerAtMs: number;
    note?: string;
  }) => void;
  onRemoveScheduledAlert?: (alert: ResolvedScheduledAlert) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (payload: {
    title: string;
    category: TripTaskCategory;
    timing: string;
    note?: string;
    ownerId?: string;
  }) => void;
  onAiParseAndAddTasks: (inputText: string, activeMemberId: string) => Promise<number>;
  onUpdateTask: (taskId: string, updates: Partial<TripTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onCycleTaskOwner: (taskId: string) => void;
  onOpenPackingWizard?: () => void;
  onApplySmartParams?: (payload: PackingWizardSubmitPayload) => Promise<void> | void;
  onOpenItemInGoMode?: (item: PackingItem, groupId: string) => void;
}

type FilterMode = 'all' | 'todo' | 'done';
type ChartMetric = 'packed' | 'workload' | 'weight';

const GROUP_COLOR_MAP: Record<PackingGroup['colorKey'], string> = {
  teal: 'var(--tk-swatch-1)',
  lavender: 'var(--tk-swatch-2)',
  lemon: 'var(--tk-swatch-3)',
  peach: 'var(--tk-swatch-4)',
  rose: 'var(--tk-swatch-3)',
  mint: 'var(--tk-swatch-2)',
};

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

const TASK_CATEGORIES: TripTaskCategory[] = [
  '门票预约',
  '交通接送',
  '住宿餐饮',
  '通讯金融',
  '其他事务',
];

interface TaskEditDraft {
  title: string;
  category: TripTaskCategory;
  timing: string;
  note: string;
  ownerId: string;
}

interface CategoryChartDatum {
  id: string;
  name: string;
  value: number;
  pct: number;
  doneCount: number;
  pendingCount: number;
  totalCount: number;
  weightGrams: number;
  color: string;
}

const CategoryPieTooltip: React.FC<{
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CategoryChartDatum }>;
  metric: ChartMetric;
  unitSystem: UnitSystem;
  lang: AppLanguage;
}> = ({ active, payload, metric, unitSystem, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const tipCopy = getCategoryPieTooltipCopy(lang);

  return (
    <div className="rounded-xl border tk-bc-hair tk-bg-card px-3.5 py-2.5 shadow-lg text-xs space-y-1">
      <div className="font-bold tk-text-ink">{d.name}</div>
      <div className="flex items-center justify-between gap-4 tk-text-ink2">
        <span>
          {metric === 'packed'
            ? tipCopy.packedItems
            : metric === 'workload'
            ? tipCopy.totalItems
            : tipCopy.categoryWeight}
        </span>
        <span className="font-num font-bold tk-text-ink">
          {metric === 'weight'
            ? formatTotalWeightByPref(d.weightGrams, unitSystem)
            : tipCopy.countText(d.value)}{' '}
          ({d.pct}%)
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 tk-text-ink2 border-t tk-bc-hair pt-1">
        <span>{tipCopy.progressLabel}</span>
        <span className="font-num">
          {tipCopy.progressStats(d.doneCount, d.totalCount, d.pendingCount)}
        </span>
      </div>
    </div>
  );
};

type DragPayload =
  | { type: 'group'; groupId: string }
  | { type: 'item'; groupId: string; itemId: string };

export const PackingView: React.FC<PackingViewProps> = ({
  groups,
  tasks,
  crew,
  claimedSeatId,
  intel,
  setup,
  cities,
  departureDate,
  reminder,
  learnedCategoryMap,
  smartBagOverrides,
  smartBagSummaryTip,
  packingViewMode,
  affiliatePartners,
  alwaysPackLibrary,
  neverSuggestItems = [],
  onToggleToBuy,
  onToggleAlwaysPack,
  onSwitchCabinCheckIn,
  onDontSuggestItemAgain,
  onSyncAlwaysPack,
  onSeedAlwaysPack,
  onRemoveFromAlwaysPackLibrary,
  onQuickAddAffiliateGear,
  onChangePackingViewMode,
  onSaveSmartBagPlan,
  onAssignItemSmartBag,
  onResetSmartBagOverrides,
  onAuditMissingItems,
  onBatchAddMissingItems,
  onToggleItem,
  onAdjustItemQuantity,
  onAddItem,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateItem,
  onDeleteItem,
  onCycleOwnership,
  onToggleMorningOfDeparture,
  onReorderGroups,
  onMoveOrReorderItem,
  onClassifyAndAddPackItem,
  onCommitClassifiedItem,
  onDeduplicateExistingItem,
  onTogglePinReminder,
  onUpdateReminder,
  onTriggerTestReminder,
  onTriggerMorningReminder,
  onRequestBrowserPermission,
  notificationPermission,
  timeFormat = '24h',
  scheduledPackingAlerts = [],
  onAddCustomPackingAlert,
  onRemoveScheduledAlert,
  onToggleTask,
  onAddTask,
  onAiParseAndAddTasks,
  onUpdateTask,
  onDeleteTask,
  onCycleTaskOwner,
  onApplySmartParams,
  onOpenItemInGoMode,
  carryOnLimitKg = CARRY_ON_LIMIT_KG,
  checkedLimitKg = CHECKED_LIMIT_KG,
  unitSystem = 'metric',
  baggagePreset,
  onSelectBaggagePreset,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = React.useMemo(() => getPackingViewCopy(activeLang), [activeLang]);
  const [showCustomDeadlineForm, setShowCustomDeadlineForm] = useState(false);
  const [customDeadlineTitle, setCustomDeadlineTitle] = useState('');
  const [customDeadlineTime, setCustomDeadlineTime] = useState(() =>
    formatLocalDateTimeInputValue(Date.now() + 60 * 60_000)
  );
  const localizedBagSpecs = React.useMemo(
    () => getLocalizedSmartBagSpecs(activeLang),
    [activeLang]
  );
  const taskQuickPresets = React.useMemo(
    () => getLocalizedTaskQuickPresets(activeLang),
    [activeLang]
  );
  const [packingMode] = useState<'items' | 'to_buy' | 'tasks'>('items');
  const [addGearOpen, setAddGearOpen] = useState(false);
  const [addGearInitialTab, setAddGearInitialTab] = useState<AddGearModeTab>('for_you');
  const [addGearInitialGroup, setAddGearInitialGroup] = useState<string | 'auto'>('auto');
  const [toBuyModalOpen, setToBuyModalOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);

  const openAddGearSheet = (
    tab: AddGearModeTab = 'for_you',
    targetGrp: string | 'auto' = 'auto'
  ) => {
    setAddGearInitialTab(tab);
    setAddGearInitialGroup(targetGrp);
    setAddGearOpen(true);
  };

  const [filter, setFilter] = useState<FilterMode>('all');
  const [showWeightDetails, setShowWeightDetails] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [alwaysPackCollapsed, setAlwaysPackCollapsed] = useState(true);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const memberMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMoreMenu && !showMemberMenu) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showMoreMenu && moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
      if (showMemberMenu && memberMenuRef.current && !memberMenuRef.current.contains(target)) {
        setShowMemberMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMoreMenu, showMemberMenu]);

  const [localSmartPackOpen, setLocalSmartPackOpen] = useState(
    () => packingViewMode === 'smart_bags'
  );
  const smartPackOpen =
    packingViewMode !== undefined ? packingViewMode === 'smart_bags' : localSmartPackOpen;

  const setSmartPackOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(smartPackOpen) : next;
    setLocalSmartPackOpen(resolved);
    onChangePackingViewMode?.(resolved ? 'smart_bags' : 'checklist');
  };
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [activeMemberId, setActiveMemberId] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('packed');
  const [showChartPanel, setShowChartPanel] = useState(false);
  const [rightInfoTab, setRightInfoTab] = useState<'carryon' | 'infra'>('carryon');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Collapsible Creation Drawers (New Category / Manual Item)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupCube, setNewGroupCube] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<PackingGroup['colorKey']>('teal');

  const [showManualAddForm, setShowManualAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemGroup, setNewItemGroup] = useState(groups[0]?.id || 'documents');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemCustomUnitWeight, setNewItemCustomUnitWeight] = useState<number | null>(null);
  const [newItemCarryOn, setNewItemCarryOn] = useState(false);
  const [newItemOwnerId, setNewItemOwnerId] = useState(crew[0]?.id || 'm1');

  // AI Quick Add + Voice + Duplicate Warning
  const [aiInput, setAiInput] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState('');
  const [lastPackVoiceText, setLastPackVoiceText] = useState('');
  const [voicePackSuccessMsg, setVoicePackSuccessMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateClassifyWarning | null>(null);

  // Desktop Right-Rail AI Voice Task Add
  const [desktopAiTaskInput, setDesktopAiTaskInput] = useState('');
  const [isDesktopParsingTask, setIsDesktopParsingTask] = useState(false);
  const [desktopAiTaskError, setDesktopAiTaskError] = useState('');

  // Active Item Detail Bottom Sheet (Packy-Fusion UX)
  const [activeSheetItemId, setActiveSheetItemId] = useState<string | null>(null);
  const activeSheetMatch = React.useMemo(() => {
    if (!activeSheetItemId) return null;
    for (const g of groups) {
      const found = g.items.find((it) => it.id === activeSheetItemId);
      if (found) return { group: g, item: found };
    }
    return null;
  }, [activeSheetItemId, groups]);

  // Category Action Menu & Edit State
  const [expandedGroupMenuId, setExpandedGroupMenuId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditTitle, setGroupEditTitle] = useState('');
  const [groupEditCube, setGroupEditCube] = useState('');
  const [groupEditColor, setGroupEditColor] = useState<PackingGroup['colorKey']>('teal');

  // Direct Whole-Row Drag & Drop State
  const [dragData, setDragData] = useState<DragPayload | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Horizontal Swipe Gesture State (per item row)
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [activeSwipe, setActiveSwipe] = useState<{ itemId: string; offsetX: number } | null>(null);
  const swipePointerRef = useRef<{
    itemId: string;
    groupId: string;
    startX: number;
    startY: number;
    baseOffset: number;
    mode: 'idle' | 'swiping' | 'vertical';
  } | null>(null);
  const suppressClickRef = useRef(false);
  const quickAddSectionRef = useRef<HTMLElement | null>(null);
  const tasksSectionRef = useRef<HTMLElement | null>(null);

  // Non-Packing Travel Tasks State
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TripTaskCategory>('门票预约');
  const [newTaskTiming, setNewTaskTiming] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [newTaskOwnerId, setNewTaskOwnerId] = useState(crew[0]?.id || 'm1');
  const [expandedTaskMenuId, setExpandedTaskMenuId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEditDraft, setTaskEditDraft] = useState<TaskEditDraft | null>(null);

  const [celebrating, setCelebrating] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!groups.some((g) => g.id === newItemGroup) && groups[0]) {
      setNewItemGroup(groups[0].id);
    }
  }, [groups, newItemGroup]);

  useEffect(() => {
    const defaultSeat =
      claimedSeatId && crew.some((c) => c.id === claimedSeatId)
        ? claimedSeatId
        : crew[0]?.id || 'm1';
    const resolvedOwner = activeMemberId === 'all' ? defaultSeat : activeMemberId;
    setNewItemOwnerId(resolvedOwner);
    setNewTaskOwnerId(resolvedOwner);
  }, [activeMemberId, crew, claimedSeatId]);

  const memberLookup = React.useMemo(() => {
    const map = new Map<string, CrewMember>();
    crew.forEach((m) => map.set(m.id, m));
    return map;
  }, [crew]);

  const matchesPerspective = (item: PackingItem) => {
    if (activeMemberId === 'all') return true;
    if (item.ownership === 'shared') return true;
    return (item.ownerId || 'm1') === activeMemberId;
  };

  const scopedTasks = tasks.filter(
    (t) => activeMemberId === 'all' || (t.ownerId || 'm1') === activeMemberId
  );
  const doneTasksCount = scopedTasks.filter((t) => t.done).length;
  const pendingTasksCount = scopedTasks.length - doneTasksCount;
  const tasksPct = scopedTasks.length
    ? Math.round((doneTasksCount / scopedTasks.length) * 100)
    : 0;
  const isAllTasksDone = scopedTasks.length > 0 && doneTasksCount === scopedTasks.length;
  const visibleTasks = scopedTasks.filter((t) => {
    if (taskFilter === 'todo') return !t.done;
    if (taskFilter === 'done') return t.done;
    return true;
  });

  const scopedItemPairs = groups.flatMap((grp) =>
    grp.items.filter(matchesPerspective).map((item) => ({ grp, item }))
  );
  const scopedAllItems: PackingItem[] = scopedItemPairs.map((p) => p.item);
  const totalCount = scopedAllItems.length;
  const doneCount = scopedAllItems.filter((i) => i.done).length;
  const pendingItems = scopedAllItems.filter((i) => !i.done);
  const toBuyPairs = scopedItemPairs.filter(({ item }) => Boolean(item.toBuy));
  const toBuyCount = toBuyPairs.length;
  const preNightPending = pendingItems.filter((i) => !i.morningOfDeparture);
  const morningPending = pendingItems.filter((i) => i.morningOfDeparture);
  const pinnedPending = preNightPending.filter((i) => i.remindBeforeDeparture);
  const carryOnPending = preNightPending.filter((i) => i.carryOnOnly);
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && pct === 100;

  const destinationGapPicks = React.useMemo(
    () =>
      getDestinationGearGapRecommendations(
        intel,
        cities,
        groups.flatMap((g) => g.items.map((it) => it.name)),
        activeLang,
        affiliatePartners,
        neverSuggestItems
      ),
    [intel, cities, groups, activeLang, affiliatePartners, neverSuggestItems]
  );

  let carryOnGrams = 0;
  let checkedGrams = 0;
  scopedItemPairs.forEach(({ grp, item }) => {
    if (isItemCarryOnWeight(item, grp, smartBagOverrides)) {
      carryOnGrams += item.weightGrams;
    } else {
      checkedGrams += item.weightGrams;
    }
  });
  const carryOnWeightNum = carryOnGrams / 1000;
  const checkedWeightNum = checkedGrams / 1000;
  const isCarryOnOverweight = carryOnWeightNum > carryOnLimitKg;
  const isCheckedOverweight = checkedWeightNum > checkedLimitKg;
  const totalWeightFormatted = formatTotalWeightByPref(
    carryOnGrams + checkedGrams,
    unitSystem
  );
  const carryOnItems = scopedAllItems.filter((i) => i.carryOnOnly);

  const scheduledSummary = (() => {
    if (!reminder.enabled) return t('packingExtra.reminderPausedSummary');
    if (reminder.mode === 'custom') {
      return `${t('packingExtra.reminderCustomPrefix')}${reminder.customDateTime.replace('T', ' ')}`;
    }
    return t('packingExtra.reminderScheduledSummary', {
      date: formatDateByPref(departureDate, activeLang),
      hours: reminder.leadHours,
    });
  })();

  const prevPctRef = useRef(pct);
  useEffect(() => {
    if (prevPctRef.current < 100 && pct === 100 && totalCount > 0) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 1200);
      prevPctRef.current = pct;
      return () => clearTimeout(timer);
    }
    prevPctRef.current = pct;
    return undefined;
  }, [pct, totalCount]);

  const activePct = packingMode === 'tasks' ? tasksPct : pct;
  const activeIsComplete = packingMode === 'tasks' ? isAllTasksDone : isComplete;

  const rawCategoryRows = groups.map((g) => {
    const scopedGrpItems = g.items.filter(matchesPerspective);
    const gDone = scopedGrpItems.filter((i) => i.done).length;
    const gTotal = scopedGrpItems.length;
    const gPending = gTotal - gDone;
    const gWeightGrams = scopedGrpItems.reduce((s, i) => s + i.weightGrams, 0);
    const rawVal =
      chartMetric === 'packed'
        ? gDone
        : chartMetric === 'workload'
        ? gTotal
        : unitSystem === 'imperial'
        ? Number((gWeightGrams * 0.00220462262).toFixed(2))
        : Number((gWeightGrams / 1000).toFixed(2));
    return {
      id: g.id,
      name: translateGroupTitleLabel(g.id, g.title, activeLang),
      value: rawVal,
      doneCount: gDone,
      pendingCount: gPending,
      totalCount: gTotal,
      weightGrams: gWeightGrams,
      color: GROUP_COLOR_MAP[g.colorKey] || 'var(--tk-swatch-1)',
    };
  });

  const metricTotal = rawCategoryRows.reduce((s, r) => s + r.value, 0);
  const categoryData: CategoryChartDatum[] = rawCategoryRows.map((r) => ({
    ...r,
    pct: metricTotal > 0 ? Math.round((r.value / metricTotal) * 100) : 0,
  }));

  const heaviestPendingGroup = [...categoryData].sort(
    (a, b) => b.pendingCount - a.pendingCount || b.weightGrams - a.weightGrams
  )[0];
  const pieSegments = categoryData.filter((d) => d.value > 0);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupTitle.trim()) return;
    onAddGroup(newGroupTitle, newGroupCube, newGroupColor);
    setNewGroupTitle('');
    setNewGroupCube('');
    setNewGroupColor('teal');
    setShowNewGroupForm(false);
  };

  const previewManualUnitWeight =
    newItemCustomUnitWeight ??
    estimateDefaultUnitWeightGrams(parseNameAndQuantity(newItemName).cleanName, newItemGroup);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const { cleanName, parsedQty } = parseNameAndQuantity(newItemName);
    const finalQty = newItemQuantity > 1 ? newItemQuantity : parsedQty ?? newItemQuantity;
    const finalUnitWeight =
      newItemCustomUnitWeight ?? estimateDefaultUnitWeightGrams(cleanName, newItemGroup);
    onAddItem(
      newItemGroup,
      cleanName || newItemName.trim(),
      copy.manualWhy,
      newItemCarryOn,
      newItemOwnerId,
      'personal',
      finalQty,
      finalUnitWeight
    );
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemCustomUnitWeight(null);
    setNewItemCarryOn(false);
    setShowManualAddForm(false);
  };

  const submitAiPackText = async (rawText: string, fromVoice = false) => {
    const text = rawText.trim();
    if (!text || isClassifying) return;
    setIsClassifying(true);
    setClassifyError('');
    setVoicePackSuccessMsg('');
    setDuplicateWarning(null);
    const defaultSeat =
      claimedSeatId && crew.some((c) => c.id === claimedSeatId)
        ? claimedSeatId
        : crew[0]?.id || 'm1';
    const targetActor = activeMemberId === 'all' ? defaultSeat : activeMemberId;
    try {
      const warning = await onClassifyAndAddPackItem(text, targetActor);
      if (warning) {
        setDuplicateWarning(warning);
      } else {
        setAiInput('');
        if (fromVoice) {
          setVoicePackSuccessMsg(copy.voiceAddedToast(text));
        }
      }
    } catch (err) {
      if (fromVoice) {
        const localParsed = parseVoicePackingFallback(text, groups);
        if (localParsed.length > 0) {
          localParsed.forEach((p) => {
            onAddItem(
              p.targetGroupId,
              p.name,
              copy.voiceAddedBrowserWhy,
              p.carryOnOnly,
              targetActor,
              'personal',
              p.quantity,
              p.unitWeightGrams
            );
          });
          setAiInput('');
          const namesSummary = localParsed
            .map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name))
            .join(copy.voiceListSep);
          setVoicePackSuccessMsg(copy.voiceAddedToast(namesSummary));
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

  const handleAiQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAiPackText(aiInput, false);
  };

  const handleVoicePackTranscript = async (transcript: string) => {
    setLastPackVoiceText(transcript);
    setAiInput(transcript);
    await submitAiPackText(transcript, true);
  };

  const submitDesktopAiTaskText = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean || isDesktopParsingTask) return;
    setIsDesktopParsingTask(true);
    setDesktopAiTaskError('');
    try {
      await onAiParseAndAddTasks(clean, activeMemberId);
      setDesktopAiTaskInput('');
    } catch (err) {
      if (err instanceof Error && err.message === 'PRO_PAYWALL_GATED') {
        return;
      }
      setDesktopAiTaskError(
        err instanceof Error ? err.message : copy.aiTaskParseUnavailable
      );
    } finally {
      setIsDesktopParsingTask(false);
    }
  };

  const openItemDetailSheet = (itemId: string) => {
    setSwipedItemId(null);
    setActiveSheetItemId(itemId);
  };

  const beginGroupEdit = (grp: PackingGroup) => {
    setExpandedGroupMenuId(null);
    setEditingGroupId(grp.id);
    setGroupEditTitle(grp.title);
    setGroupEditCube(grp.cubeLabel);
    setGroupEditColor(grp.colorKey);
  };

  const saveGroupEdit = (groupId: string) => {
    if (!groupEditTitle.trim()) return;
    onUpdateGroup(groupId, groupEditTitle, groupEditCube, groupEditColor);
    setEditingGroupId(null);
  };

  const handleSubmitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask({
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      timing: newTaskTiming.trim() || copy.beforeDepartureTiming,
      note: newTaskNote.trim() || undefined,
      ownerId: newTaskOwnerId,
    });
    setNewTaskTitle('');
    setNewTaskNote('');
    setShowAddTaskForm(false);
  };

  const applyTaskPreset = (preset: ReturnType<typeof getLocalizedTaskQuickPresets>[number]) => {
    setNewTaskTitle(preset.title);
    setNewTaskCategory(preset.category);
    setNewTaskTiming(preset.timing);
    setNewTaskNote(preset.note);
    setShowAddTaskForm(true);
  };

  const beginTaskEdit = (task: TripTask) => {
    setExpandedTaskMenuId(null);
    setEditingTaskId(task.id);
    setTaskEditDraft({
      title: task.title,
      category: task.category,
      timing: task.timing,
      note: task.note ?? '',
      ownerId: task.ownerId ?? crew[0]?.id ?? 'm1',
    });
  };

  const saveTaskEdit = (taskId: string) => {
    if (!taskEditDraft || !taskEditDraft.title.trim()) return;
    onUpdateTask(taskId, {
      title: taskEditDraft.title.trim(),
      category: taskEditDraft.category,
      timing: taskEditDraft.timing.trim() || copy.duringTripTiming,
      note: taskEditDraft.note.trim() || undefined,
      ownerId: taskEditDraft.ownerId,
    });
    setEditingTaskId(null);
    setTaskEditDraft(null);
  };

  // Horizontal Swipe Handlers (supports touch & mouse drag on non-interactive surface)
  const handleSwipePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    groupId: string,
    itemId: string
  ) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (e.pointerType === 'mouse') return;

    const baseOffset = swipedItemId === itemId ? -112 : 0;
    swipePointerRef.current = {
      itemId,
      groupId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffset,
      mode: 'idle',
    };
  };

  const handleSwipePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = swipePointerRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (st.mode === 'idle') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        st.mode = 'swiping';
        suppressClickRef.current = true;
      } else if (Math.abs(dy) > 12) {
        st.mode = 'vertical';
        swipePointerRef.current = null;
        return;
      } else {
        return;
      }
    }

    if (st.mode === 'swiping') {
      const nextOffset = Math.max(-132, Math.min(84, st.baseOffset + dx));
      setActiveSwipe({ itemId: st.itemId, offsetX: nextOffset });
    }
  };

  const handleSwipePointerEnd = () => {
    const st = swipePointerRef.current;
    swipePointerRef.current = null;
    if (!st || st.mode !== 'swiping') return;

    const finalOffset = activeSwipe?.itemId === st.itemId ? activeSwipe.offsetX : st.baseOffset;
    setActiveSwipe(null);

    if (finalOffset >= 52) {
      onToggleItem(st.groupId, st.itemId, activeMemberId);
      setSwipedItemId(null);
    } else if (finalOffset <= -48) {
      setSwipedItemId(st.itemId);
    } else {
      setSwipedItemId(null);
    }

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 60);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Main Checklist */}
      <div className="lg:col-span-8 space-y-4">
        {/* Minimalist Top Control Card: Progress + View Switch + Standalone Sheet Triggers */}
        <section
          ref={quickAddSectionRef}
          className="rounded-2xl border tk-bc-hair tk-bg-card p-4 sm:p-5 space-y-3.5"
        >
          {/* Row 1: Fixed-Height Progress + Weight Pill (Left) & [By List | By Bag] + [👥 Member ⌄] (Right) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="inline-flex items-baseline gap-1 shrink-0">
                  <span className="font-num text-base sm:text-lg font-extrabold tk-text-ink tabular-nums">
                    {doneCount}/{totalCount}
                  </span>
                  <span className="text-xs tk-text-ink2 whitespace-nowrap">
                    {copy.packedSuffix}
                  </span>
                </div>

                {/* Standalone Weight & Category Breakdown Trigger Pill */}
                <button
                  type="button"
                  onClick={() => setWeightModalOpen(true)}
                  aria-label={copy.openWeightAria}
                  title={copy.openWeightTitle}
                  className={`h-7 inline-flex items-center gap-1 rounded-full border px-2 sm:px-2.5 text-xs font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isCarryOnOverweight || isCheckedOverweight
 ? 'tk-bc-danger-hair tk-bg-danger-tint tk-text-danger hover:tk-bg-danger-tint'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-forest hover:tk-bg-forest-tint'
 }`}
                >
                  {isCarryOnOverweight || isCheckedOverweight ? (
                    <AlertTriangle className="h-3.5 w-3.5 tk-text-danger shrink-0" />
                  ) : (
                    <PieChartIcon className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                  )}
                  <span className="font-num">{totalWeightFormatted}</span>
                  {(isCarryOnOverweight || isCheckedOverweight) && (
                    <span className="hidden sm:inline text-[11px]">
                      {copy.overweightDot}
                    </span>
                  )}
                </button>
              </div>

              {/* Perspective Cluster: [按分类 | 按箱包] + Adaptive Member Selector [👥 ⌄] */}
              <div className="inline-flex items-center gap-1.5 shrink-0">
                <div className="inline-flex items-center gap-0.5 rounded-xl tk-bg-forest-plate p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSmartPackOpen(false)}
                    className={`h-7 inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 !smartPackOpen
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    <span>{copy.byList}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartPackOpen(true)}
                    className={`h-7 inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 smartPackOpen
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    <Luggage
                      className={`h-3.5 w-3.5 shrink-0 ${
 smartPackOpen ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                    />
                    <span>{copy.byBag}</span>
                  </button>
                </div>

                {crew.length > 1 && (
                  <div ref={memberMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowMemberMenu((v) => !v)}
                      aria-label={copy.filterTravelerAria}
                      title={copy.filterTravelerAria}
                      className="h-8 inline-flex items-center gap-1 rounded-xl border tk-bc-hair tk-bg-paper px-2 sm:px-2.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {activeMemberId === 'all' ? (
                        <>
                          <Users className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                          <span className="hidden sm:inline">{t('packing.filterAll')}</span>
                        </>
                      ) : (
                        (() => {
                          const activeCrew = memberLookup.get(activeMemberId);
                          return activeCrew ? (
                            <>
                              <span
                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
 HERO_AVATAR_BG[activeCrew.accent]
 }`}
                              >
                                {translateMemberInitials(activeCrew.initials, activeLang)}
                              </span>
                              <span className="hidden sm:inline">
                                {translateMemberName(activeCrew.name, activeLang)}
                              </span>
                            </>
                          ) : (
                            <Users className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                          );
                        })()
                      )}
                      <ChevronDown className="h-3 w-3 tk-text-ink2 shrink-0" />
                    </button>

                    {showMemberMenu && (
                      <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[152px] rounded-xl border tk-bc-hair tk-bg-card p-1 shadow-lg space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMemberId('all');
                            setShowMemberMenu(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
 activeMemberId === 'all'
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink hover:tk-bg-forest-plate'
 }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                            <span>{t('packing.filterAll')}</span>
                          </span>
                          {activeMemberId === 'all' && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                        {crew.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setActiveMemberId(m.id);
                              setShowMemberMenu(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
 activeMemberId === m.id
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink hover:tk-bg-forest-plate'
 }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
 HERO_AVATAR_BG[m.accent]
 }`}
                              >
                                {translateMemberInitials(m.initials, activeLang)}
                              </span>
                              <span>{translateMemberName(m.name, activeLang)}</span>
                            </span>
                            {activeMemberId === m.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`h-1.5 w-full overflow-hidden rounded-full tk-bg-forest-plate ${
 celebrating && !shouldReduceMotion ? 'ring-2 tk-rc-forest' : ''
 }`}
            >
              <motion.div
                initial={false}
                animate={{ width: `${activePct}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35 }}
                className={`h-full rounded-full ${
 activeIsComplete ? 'tk-bg-forest' : 'tk-bg-forest'
 }`}
              />
            </div>
          </div>

          {/* Row 2: Pure 3-Button Standalone Sheet Triggers [+ 添加装备] [🛍️ 待购] [📋 待办] */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => openAddGearSheet('for_you', 'auto')}
              className="h-8 inline-flex items-center gap-1 rounded-xl tk-bg-forest px-3 text-xs font-bold tk-text-card hover:tk-bg-press transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>{copy.addGearBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setToBuyModalOpen(true)}
              className="h-8 inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-2.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5 tk-text-warning shrink-0" />
              <span>{copy.toBuyBtn}</span>
              {toBuyCount > 0 && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full tk-bg-danger-tint px-1 font-num text-[10px] font-bold tk-text-danger tabular-nums">
                  {toBuyCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTasksModalOpen(true)}
              className="h-8 inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-2.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ListTodo className="h-3.5 w-3.5 tk-text-forest shrink-0" />
              <span>{copy.todosBtn}</span>
              {pendingTasksCount > 0 && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full tk-bg-forest-tint px-1 font-num text-[10px] font-bold tk-text-forest tabular-nums">
                  {pendingTasksCount}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between gap-3 rounded-xl border tk-bc-hair tk-bg-forest-tint px-4 py-2 text-xs tk-text-forest"
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  <PartyPopper className="h-4 w-4 shrink-0 tk-text-forest" />
                  {t('packingExtra.completeBannerItems')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Unified Section Title + Status Filter Strip: [全部清单分类] · [待装 (X)] · [已装 (Y)] */}
        <div className="px-0.5">
          <HorizontalChipScroller activeKey={filter} fadeBgClassName="">
            {(['all', 'todo', 'done'] as FilterMode[]).map((m) => {
              const label =
                m === 'all'
                  ? smartPackOpen
                    ? copy.allBagsFilter
                    : copy.allCategoriesFilter
                  : m === 'todo'
                  ? `${t('packing.filterTodo')} (${pendingItems.length})`
                  : `${t('packing.filterDone')} (${doneCount})`;
              const isActive = filter === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-chip-active={isActive ? 'true' : undefined}
                  onClick={() => setFilter(m)}
                  className={`h-8 rounded-full px-3.5 text-xs font-bold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 isActive
 ? 'tk-bg-forest tk-text-card shadow-xs'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bc-forest hover:tk-text-ink'
 }`}
                >
                  {label}
                </button>
              );
            })}
          </HorizontalChipScroller>
        </div>

        {/* View Switcher: Smart Packing 9-Bag Interactive View <-> Attribute Checklist */}
        <AnimatePresence mode="wait">
          {smartPackOpen ? (
            <motion.div
              key="smart-pack-view"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <SmartPackingInlinePanel
                groups={groups}
                crew={crew}
                intel={intel}
                activeMemberId={activeMemberId}
                filter={filter}
                smartBagOverrides={smartBagOverrides}
                smartBagSummaryTip={smartBagSummaryTip}
                carryOnLimitKg={carryOnLimitKg}
                checkedLimitKg={checkedLimitKg}
                unitSystem={unitSystem}
                baggagePreset={baggagePreset}
                onSelectBaggagePreset={onSelectBaggagePreset}
                onSaveSmartBagPlan={onSaveSmartBagPlan}
                onAssignItemSmartBag={onAssignItemSmartBag}
                onResetSmartBagOverrides={onResetSmartBagOverrides}
                onToggleItem={onToggleItem}
                onCycleOwnership={onCycleOwnership}
                onDeleteItem={onDeleteItem}
                onOpenItemDetail={openItemDetailSheet}
                onBackToChecklist={() => setSmartPackOpen(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="attribute-checklist-view"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >

          {groups.map((grp) => {
            const perspectiveItems = grp.items.filter(matchesPerspective);
            const visibleItems = perspectiveItems.filter((item) => {
              if (filter === 'todo') return !item.done;
              if (filter === 'done') return item.done;
              return true;
            });

            // Always render newly created empty groups when filter is 'all', or during drag
            if (visibleItems.length === 0 && (filter !== 'all' || grp.items.length > 0) && !dragData) {
              return null;
            }

            const isClosed = Boolean(collapsed[grp.id]);
            const grpDone = perspectiveItems.filter((i) => i.done).length;
            const isGroupAllDone = perspectiveItems.length > 0 && grpDone === perspectiveItems.length;
            const isGroupDropTarget = dragOverGroupId === grp.id;
            const isEditingGroup = editingGroupId === grp.id;
            const groupIconMeta = resolvePackingGroupIconMeta(grp);

            return (
              <section
                key={grp.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverGroupId(grp.id);
                }}
                onDragLeave={() => {
                  setDragOverGroupId((prev) => (prev === grp.id ? null : prev));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverGroupId(null);
                  setDragOverItemId(null);
                  if (!dragData) return;
                  if (dragData.type === 'group') {
                    onReorderGroups(dragData.groupId, grp.id);
                  } else if (dragData.type === 'item') {
                    onMoveOrReorderItem(dragData.groupId, dragData.itemId, grp.id);
                  }
                  setDragData(null);
                }}
                className={`rounded-2xl border tk-bg-card overflow-hidden transition-colors ${
 isGroupDropTarget
 ? 'tk-bc-forest ring-2 tk-rc-forest'
 : isGroupAllDone
 ? 'tk-bc-hair'
 : 'tk-bc-hair'
 }`}
              >
                {/* Entire Category Header Row is Directly Draggable */}
                {isEditingGroup ? (
                  <div className="px-4 py-3 tk-bg-paper space-y-2.5 border-b tk-bc-hair">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={groupEditTitle}
                        onChange={(e) => setGroupEditTitle(e.target.value)}
                        placeholder={t('packingExtra.groupNamePlaceholder')}
                        className="rounded-xl border tk-bc-hair tk-bg-card px-3 py-1.5 text-xs font-semibold tk-text-ink"
                      />
                      <input
                        type="text"
                        value={groupEditCube}
                        onChange={(e) => setGroupEditCube(e.target.value)}
                        placeholder={t('packingExtra.groupCubePlaceholder')}
                        className="rounded-xl border tk-bc-hair tk-bg-card px-3 py-1.5 text-xs tk-text-ink2"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {GROUP_COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setGroupEditColor(c.key)}
                            title={getGroupColorLabel(c.key, activeLang)}
                            className={`h-4 w-4 rounded-full cursor-pointer ${
 groupEditColor === c.key ? 'ring-2 ring-offset-1 tk-rc-ink' : ''
 }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1 text-xs font-semibold tk-text-ink2 cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveGroupEdit(grp.id)}
                          className="rounded-lg tk-bg-forest px-3 py-1 text-xs font-semibold tk-text-card cursor-pointer"
                        >
                          {t('packingExtra.saveGroup')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', grp.id);
                      setDragData({ type: 'group', groupId: grp.id });
                    }}
                    onDragEnd={() => {
                      setDragData(null);
                      setDragOverGroupId(null);
                      setDragOverItemId(null);
                    }}
                    className={`flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 transition-colors cursor-grab active:cursor-grabbing select-none ${
 isGroupAllDone ? 'tk-bg-paper hover:tk-bg-forest-tint' : 'hover:tk-bg-paper'
 }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCollapsed((prev) => ({ ...prev, [grp.id]: !prev[grp.id] }))}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                    >
                      <AccentIconBadge
                        accent={groupIconMeta.accent}
                        icon={groupIconMeta.Icon}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-[15px] font-bold tk-text-ink truncate">
                          {translateGroupTitleLabel(grp.id, grp.title, activeLang)}
                        </h3>
                        <p className="text-[11px] tk-text-ink2 leading-snug">
                          {translateGroupCubeLabel(grp.cubeLabel, activeLang)}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex h-7 min-w-11 items-center justify-center rounded-xl px-2.5 font-num text-xs font-bold ${
 isGroupAllDone
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-bg-forest-plate tk-text-forest'
 }`}
                      >
                        {isGroupAllDone ? (
                          <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                        ) : (
                          `${grpDone}/${perspectiveItems.length}`
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroupMenuId((prev) => (prev === grp.id ? null : grp.id))
                        }
                        aria-label={t('packingExtra.editGroup')}
                        title={t('packingExtra.editGroup')}
                        className="flex h-7 w-7 items-center justify-center rounded-lg tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink cursor-pointer"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollapsed((prev) => ({ ...prev, [grp.id]: !prev[grp.id] }))}
                        aria-label={translateGroupTitleLabel(grp.id, grp.title, activeLang)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg tk-text-ink hover:tk-bg-forest-plate cursor-pointer"
                      >
                        {isClosed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tucked Category Management Drawer */}
                {expandedGroupMenuId === grp.id && !isEditingGroup && (
                  <div className="border-t tk-bc-hair tk-bg-paper px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="tk-text-ink2">{t('packingExtra.manageGroupHint')}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedGroupMenuId(null);
                          openAddGearSheet('detailed', grp.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1 font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                      >
                        <Plus className="h-3 w-3 tk-text-forest" />
                        {t('packingExtra.addInGroup')}
                      </button>
                      <button
                        type="button"
                        onClick={() => beginGroupEdit(grp)}
                        className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1 font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                      >
                        <Pencil className="h-3 w-3 tk-text-forest" />
                        {t('packingExtra.editGroup')}
                      </button>
                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup(grp.id);
                            setExpandedGroupMenuId(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border tk-bc-danger-hair tk-bg-card px-2.5 py-1 font-semibold tk-text-danger hover:tk-bg-danger-tint cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t('packingExtra.deleteGroup')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!isClosed && (
                  <div className="border-t tk-bc-hair divide-y tk-divide-hair">
                    {visibleItems.length === 0 && (
                      <div className="px-5 py-4 text-xs tk-text-ink2 flex items-center justify-between">
                        <span>{t('packingExtra.emptyGroupHint')}</span>
                        <button
                          type="button"
                          onClick={() => openAddGearSheet('detailed', grp.id)}
                          className="font-semibold tk-text-forest hover:underline cursor-pointer"
                        >
                          {t('packingExtra.addItemInline')}
                        </button>
                      </div>
                    )}

                    {(() => {
                      const hasAnySubCategory = visibleItems.some((it) =>
                        Boolean(it.subCategory?.trim())
                      );
                      const subClusters: {
                        key: string;
                        label: string;
                        items: PackingItem[];
                      }[] = [];
                      if (!hasAnySubCategory) {
                        subClusters.push({ key: '__all__', label: '', items: visibleItems });
                      } else {
                        const clusterMap = new Map<string, PackingItem[]>();
                        for (const it of visibleItems) {
                          const rawSub = it.subCategory?.trim() || '';
                          const key = rawSub || '__other__';
                          const bucket = clusterMap.get(key) || [];
                          bucket.push(it);
                          clusterMap.set(key, bucket);
                        }
                        for (const [key, clusterItems] of clusterMap.entries()) {
                          if (key !== '__other__') {
                            subClusters.push({ key, label: key, items: clusterItems });
                          }
                        }
                        const others = clusterMap.get('__other__');
                        if (others && others.length > 0) {
                          subClusters.push({
                            key: '__other__',
                            label: copy.generalEssentialsSub,
                            items: others,
                          });
                        }
                      }

                      return subClusters.map((cluster) => {
                        const clusterDoneCount = cluster.items.filter((i) => i.done).length;
                        return (
                          <React.Fragment key={cluster.key}>
                            {cluster.label && (
                              <div className="px-4 sm:px-5 py-1.5 tk-bg-paper flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold tracking-tight tk-text-ink2">
                                  {cluster.label}
                                </span>
                                <span className="font-num tabular-nums text-[11px] font-semibold tk-text-ink2">
                                  {clusterDoneCount}/{cluster.items.length}
                                </span>
                              </div>
                            )}
                            {cluster.items.map((item) => {
                              const isShared = item.ownership === 'shared';
                              const responsibleMember =
                                memberLookup.get(item.ownerId || 'm1') || crew[0];
                              const packedByMember = memberLookup.get(
                                item.packedByMemberId || item.ownerId || 'm1'
                              );
                              const isItemDropTarget = dragOverItemId === item.id;

                              const currentSwipeOffset =
                                activeSwipe?.itemId === item.id
                                  ? activeSwipe.offsetX
                                  : swipedItemId === item.id
                                  ? -112
                                  : 0;
                              const showSwipeBackdrop =
                                currentSwipeOffset !== 0 || swipedItemId === item.id;

                              return (
                        <div
                          key={item.id}
                          draggable={swipedItemId !== item.id}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', item.id);
                            setDragData({ type: 'item', groupId: grp.id, itemId: item.id });
                          }}
                          onDragEnd={() => {
                            setDragData(null);
                            setDragOverGroupId(null);
                            setDragOverItemId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverItemId(item.id);
                            setDragOverGroupId(grp.id);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverItemId(null);
                            setDragOverGroupId(null);
                            if (!dragData) return;
                            if (dragData.type === 'item') {
                              onMoveOrReorderItem(dragData.groupId, dragData.itemId, grp.id, item.id);
                            } else if (dragData.type === 'group') {
                              onReorderGroups(dragData.groupId, grp.id);
                            }
                            setDragData(null);
                          }}
                          className={`relative overflow-hidden ${
 isItemDropTarget ? 'ring-2 ring-inset tk-rc-forest' : ''
 }`}
                        >
                          <div className="relative overflow-hidden">
                            {/* Swipe Backdrop */}
                            {showSwipeBackdrop && (
                              <div
                                className="absolute inset-0 flex items-stretch justify-between pointer-events-none"
                                aria-hidden={swipedItemId !== item.id}
                              >
                                <div
                                  className={`flex items-center px-4 tk-text-card text-xs font-semibold transition-opacity ${
 currentSwipeOffset > 0
 ? 'tk-bg-forest opacity-100'
 : 'opacity-0'
 }`}
                                >
                                  {item.done
                                    ? t('packingExtra.swipeUndo')
                                    : t('packingExtra.swipeDone')}
                                </div>
                                <div
                                  className={`flex items-stretch transition-opacity ${
 currentSwipeOffset < 0
 ? 'pointer-events-auto opacity-100'
 : 'pointer-events-none opacity-0'
 }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openItemDetailSheet(item.id)}
                                    className="w-14 tk-bg-forest tk-text-card text-xs font-semibold hover:tk-bg-press whitespace-nowrap cursor-pointer"
                                  >
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteItem(grp.id, item.id);
                                      setSwipedItemId(null);
                                    }}
                                    className="w-14 tk-bg-danger tk-text-card text-xs font-semibold hover:tk-bg-danger whitespace-nowrap cursor-pointer"
                                  >
                                    {t('common.delete')}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Clean Foreground Row */}
                            <div
                              onPointerDown={(e) => handleSwipePointerDown(e, grp.id, item.id)}
                              onPointerMove={handleSwipePointerMove}
                              onPointerUp={handleSwipePointerEnd}
                              onPointerCancel={handleSwipePointerEnd}
                              onWheel={(e) => {
                                if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
                                  if (e.deltaX > 22) {
                                    setSwipedItemId(item.id);
                                  } else if (e.deltaX < -22 && swipedItemId === item.id) {
                                    setSwipedItemId(null);
                                  }
                                }
                              }}
                              style={{
                                transform: `translateX(${currentSwipeOffset}px)`,
                                transition:
                                  activeSwipe?.itemId === item.id
                                    ? 'none'
                                    : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                              className={`relative z-10 px-4 sm:px-5 py-2.5 transition-colors touch-pan-y cursor-grab active:cursor-grabbing ${
 isShared && item.done
 ? 'tk-bg-paper'
 : 'tk-bg-card hover:tk-bg-paper'
 }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* 1-Tap Checkbox (Toggles Done Immediately) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (suppressClickRef.current) return;
                                    if (swipedItemId === item.id) {
                                      setSwipedItemId(null);
                                      return;
                                    }
                                    onToggleItem(grp.id, item.id, activeMemberId);
                                  }}
                                  aria-label={item.name}
                                  className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:tk-bg-forest-plate transition-colors cursor-pointer"
                                >
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
 item.done
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-card'
 }`}
                                  >
                                    {item.done && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                                  </span>
                                </button>

                                {/* Tappable Item Body -> Opens Packy Item Detail Sheet */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (suppressClickRef.current) return;
                                    if (swipedItemId === item.id) {
                                      setSwipedItemId(null);
                                      return;
                                    }
                                    openItemDetailSheet(item.id);
                                  }}
                                  className="flex-1 min-w-0 text-left py-0.5 cursor-pointer"
                                >
                                  {(() => {
                                    const itemQty = getItemQuantity(item);
                                    const itemUnitW = getItemUnitWeight(item, grp.id);
                                    const resolvedBagId = resolveItemSmartBag(
                                      item,
                                      grp,
                                      smartBagOverrides
                                    );
                                    const bagSpec = localizedBagSpecs.find(
                                      (b) => b.id === resolvedBagId
                                    );
                                    return (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`text-sm font-semibold ${
 item.done
 ? isShared
 ? 'tk-text-forest'
 : 'line-through tk-text-ink2'
 : 'tk-text-ink'
 }`}
                                        >
                                          {translateDemoPackItemName(item.name, activeLang)}
                                        </span>
                                        {itemQty > 1 && (
                                          <span className="font-num tabular-nums text-xs font-bold tk-text-forest">
                                            ×{itemQty}
                                          </span>
                                        )}
                                        <span className="tabular-nums text-[11px] tk-text-ink2">
                                          {formatItemWeightByPref(item.weightGrams, unitSystem)}
                                          {itemQty > 1 &&
                                            ` (${formatItemWeightByPref(itemUnitW, unitSystem)}${t(
                                              'common.perPiece'
                                            )})`}
                                          {bagSpec && ` · ${bagSpec.shortLabel}`}
                                          {item.morningOfDeparture &&
                                            ` · ⏰ ${t('common.morningShort')}`}
                                          {item.carryOnOnly && ` · ${t('common.carryOnBadge')}`}
                                          {item.toBuy && (
                                            <span className="tk-text-danger font-semibold">
                                              {` · ${copy.toBuyBadge}`}
                                            </span>
                                          )}
                                          {item.alwaysPack && (
                                            <span className="tk-text-forest font-semibold">
                                              {` · ${copy.alwaysPackBadge}`}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })()}

                                  {isShared && (
                                    <p className="mt-0.5 text-[11px] tk-text-ink2 leading-snug">
                                      {item.done
                                        ? t('packingExtra.sharedDone', {
                                            name: translateMemberName(
                                              packedByMember?.name ??
                                                responsibleMember?.name ??
                                                '本人',
                                              activeLang
                                            ),
                                            why: translateDemoPackItemWhy(item.why, activeLang),
                                          })
                                        : t('packingExtra.sharedOwner', {
                                            name: translateMemberName(
                                              responsibleMember?.name ?? '本人',
                                              activeLang
                                            ),
                                            why: translateDemoPackItemWhy(item.why, activeLang),
                                          })}
                                    </p>
                                  )}
                                </button>

                                {/* Clean Right Controls: Member Avatar + 「···」 Detail Trigger */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onCycleOwnership(grp.id, item.id, 'member')}
                                    title={`${t('common.ownerPrefix')}${translateMemberName(
                                      responsibleMember?.name ?? '本人',
                                      activeLang
                                    )}`}
                                    aria-label={`${t('common.ownerPrefix')}${item.name}`}
                                    className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer"
                                  >
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
 responsibleMember
 ? HERO_AVATAR_BG[responsibleMember.accent]
 : HERO_AVATAR_BG.teal
 } ${isShared ? 'ring-2 tk-rc-forest ring-offset-1' : ''}`}
                                    >
                                      {translateMemberInitials(
                                        responsibleMember?.initials ?? '我',
                                        activeLang
                                      )}
                                    </span>
                                    {isShared && (
                                      <span
                                        className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white tk-bg-forest tk-text-card"
                                        aria-hidden="true"
                                      >
                                        <Users className="h-2 w-2" />
                                      </span>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openItemDetailSheet(item.id)}
                                    aria-label={item.name}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink transition-colors cursor-pointer"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                )}
              </section>
            );
          })}

                  {/* Packy-Style Bottom Standalone Collapsible Category: Always Pack Library */}
                  <section className="rounded-2xl border tk-bc-hair tk-bg-card overflow-hidden transition-colors">
                    <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 hover:tk-bg-paper transition-colors">
                      <button
                        type="button"
                        onClick={() => setAlwaysPackCollapsed((v) => !v)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                      >
                        <AccentIconBadge accent="teal" icon={Bookmark} size="md" />
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-[15px] font-bold tk-text-ink truncate">
                            {copy.alwaysPackLibTitle}
                          </h3>
                          <p className="text-[11px] tk-text-ink2 leading-snug">
                            {copy.alwaysPackLibDesc}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-lg tk-bg-paper px-2 font-num text-xs font-bold tk-text-ink2 tabular-nums">
                          {alwaysPackLibrary.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAlwaysPackCollapsed((v) => !v)}
                          aria-label={
                            alwaysPackCollapsed
                              ? copy.expandAlwaysPackAria
                              : copy.collapseAlwaysPackAria
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink cursor-pointer"
                        >
                          {alwaysPackCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {!alwaysPackCollapsed && (
                      <div className="border-t tk-bc-hair px-4 sm:px-5 py-3.5 space-y-3 tk-bg-paper">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="tk-text-ink2">
                            {copy.alwaysPackStarHint}
                          </span>
                          {alwaysPackLibrary.length === 0 ? (
                            <button
                              type="button"
                              onClick={onSeedAlwaysPack}
                              className="inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-3 py-1.5 text-xs font-semibold tk-text-card hover:tk-bg-press whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 shrink-0" />
                              {copy.extractEssentialsBtn}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onSyncAlwaysPack}
                              className="inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-card px-3 py-1.5 text-xs font-semibold tk-text-forest hover:tk-bg-forest-tint whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                              {copy.syncToTripBtn}
                            </button>
                          )}
                        </div>

                        {alwaysPackLibrary.length > 0 ? (
                          <div className="divide-y tk-divide-hair rounded-xl border tk-bc-hair tk-bg-card">
                            {alwaysPackLibrary.map((tpl) => {
                              const existsInTrip = groups.some((g) =>
                                g.items.some(
                                  (it) =>
                                    it.name.trim().toLowerCase() ===
                                    tpl.name.trim().toLowerCase()
                                )
                              );
                              return (
                                <div
                                  key={tpl.id}
                                  className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold tk-text-ink">
                                      {translateDemoPackItemName(tpl.name, activeLang)}
                                    </span>
                                    {(tpl.quantity || 1) > 1 && (
                                      <span className="font-num font-bold tk-text-forest">
                                        ×{tpl.quantity}
                                      </span>
                                    )}
                                    <span className="font-num tabular-nums text-[11px] tk-text-ink2">
                                      {formatItemWeightByPref(
                                        tpl.unitWeightGrams * Math.max(1, tpl.quantity || 1),
                                        unitSystem
                                      )}
                                    </span>
                                    {existsInTrip && (
                                      <span className="rounded tk-bg-forest-tint px-1.5 py-0.5 text-[10px] font-semibold tk-text-forest">
                                        {copy.inTripBadge}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRemoveFromAlwaysPackLibrary(tpl.id, tpl.name)
                                    }
                                    aria-label={tpl.name}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger shrink-0 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed tk-bc-hair tk-bg-card px-4 py-3 text-center text-xs tk-text-ink2">
                            {copy.emptyAlwaysPackHint}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

      </div>

      {/* Clean Right Rail: 2 Focused Cards */}
      <div className="lg:col-span-4 space-y-4">
        {/* Card 1: Packing Reminder Scheduler */}
        <section className="rounded-2xl border tk-bc-hair tk-bg-card p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <AccentIconBadge accent="peach" icon={BellRing} size="md" />
              <h3 className="text-sm font-bold tk-text-ink truncate">
                {t('packingExtra.reminderTitle')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onUpdateReminder({ ...reminder, enabled: !reminder.enabled })}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 reminder.enabled
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2'
 }`}
            >
              {reminder.enabled
                ? t('packingExtra.reminderOn')
                : t('packingExtra.reminderOff')}
            </button>
          </div>

          <p className="text-xs leading-relaxed tk-text-ink2">
            {scheduledSummary}
            {t('packingExtra.reminderDescSuffix')}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tk-text-ink2">
                {t('packingExtra.triggerTiming')}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateReminder({
                    ...reminder,
                    mode: reminder.mode === 'preset' ? 'custom' : 'preset',
                  })
                }
                className="tk-text-forest font-semibold hover:underline cursor-pointer"
              >
                {reminder.mode === 'preset'
                  ? t('packingExtra.switchCustomTime')
                  : t('packingExtra.switchPresetTime')}
              </button>
            </div>

            {reminder.mode === 'preset' ? (
              <div className="grid grid-cols-4 gap-1.5">
                {([72, 24, 12, 3] as const).map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => onUpdateReminder({ ...reminder, enabled: true, leadHours: hrs })}
                    className={`rounded-xl py-1.5 font-num text-xs font-semibold transition-colors cursor-pointer ${
 reminder.leadHours === hrs
 ? 'tk-bg-forest-tint border tk-bc-forest tk-text-forest'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2'
 }`}
                  >
                    {hrs >= 24
                      ? t('packingExtra.daysBefore', { days: hrs / 24 })
                      : t('packingExtra.hoursBefore', { hours: hrs })}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 tk-text-forest shrink-0" />
                <input
                  type="datetime-local"
                  value={reminder.customDateTime}
                  onChange={(e) =>
                    onUpdateReminder({
                      ...reminder,
                      enabled: true,
                      customDateTime: e.target.value,
                    })
                  }
                  className="flex-1 rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1.5 text-xs font-num tk-text-ink"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              {
                id: 'pinned_only' as const,
                label: t('packingExtra.scopePinned', { count: pinnedPending.length }),
              },
              {
                id: 'carry_on_only' as const,
                label: t('packingExtra.scopeCarryOn', { count: carryOnPending.length }),
              },
              {
                id: 'all_pending' as const,
                label: t('packingExtra.scopePending', { count: preNightPending.length }),
              },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onUpdateReminder({ ...reminder, scope: sc.id })}
                className={`rounded-xl py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 reminder.scope === sc.id
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2'
 }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t tk-bc-hair space-y-2">
            <div className="flex gap-2">
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={onRequestBrowserPermission}
                  className="flex-1 rounded-xl border tk-bc-hair tk-bg-paper px-2.5 py-2 text-xs font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                >
                  {t('packingExtra.desktopNotifBtn')}
                </button>
              )}
              <button
                type="button"
                onClick={onTriggerTestReminder}
                className="flex-1 rounded-xl border tk-bc-hair tk-bg-forest-tint px-2.5 py-2 text-xs font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
              >
                {t('packingExtra.previewPreNight', { count: preNightPending.length })}
              </button>
            </div>
            <button
              type="button"
              onClick={onTriggerMorningReminder}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border tk-bc-warning-hair tk-bg-warning-tint px-3 py-2 text-xs font-semibold tk-text-warning hover:tk-bg-warning-tint cursor-pointer"
            >
              <Sun className="h-3.5 w-3.5" />
              {t('packingExtra.previewMorning', { count: morningPending.length })}
            </button>

            {onAddCustomPackingAlert && (
              <div className="pt-2 border-t tk-bc-hair space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tk-text-ink2">
                    {copy.customDeadlinesTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDeadlineTime(
                        formatLocalDateTimeInputValue(Date.now() + 30 * 60_000)
                      );
                      setShowCustomDeadlineForm((v) => !v);
                    }}
                    className="inline-flex items-center gap-1 font-semibold tk-text-forest hover:underline cursor-pointer"
                  >
                    <BellPlus className="h-3 w-3" />
                    {showCustomDeadlineForm
                      ? copy.collapseBtn
                      : copy.addDeadlineBtn}
                  </button>
                </div>

                {showCustomDeadlineForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const cleaned = customDeadlineTitle.trim();
                      const ts = new Date(customDeadlineTime).getTime();
                      if (!cleaned || !Number.isFinite(ts)) return;
                      onAddCustomPackingAlert({
                        title: cleaned,
                        triggerAtMs: ts,
                      });
                      setCustomDeadlineTitle('');
                      setShowCustomDeadlineForm(false);
                    }}
                    className="rounded-xl border tk-bc-hair tk-bg-paper p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={customDeadlineTitle}
                      onChange={(e) => setCustomDeadlineTitle(e.target.value)}
                      placeholder={copy.deadlinePlaceholder}
                      className="w-full rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1.5 text-xs font-semibold tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                    {tasks.filter((tk) => !tk.done).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="tk-text-ink2">
                          {copy.fromTodoLabel}
                        </span>
                        {tasks
                          .filter((tk) => !tk.done)
                          .slice(0, 2)
                          .map((tk) => {
                            const label = translateDemoTaskTitle(tk.title, activeLang);
                            return (
                              <button
                                key={tk.id}
                                type="button"
                                onClick={() => setCustomDeadlineTitle(label)}
                                className="max-w-[165px] truncate rounded-md border tk-bc-hair tk-bg-card px-2 py-0.5 font-medium tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest cursor-pointer"
                              >
                                {label}
                              </button>
                            );
                          })}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="datetime-local"
                        value={customDeadlineTime}
                        onChange={(e) => setCustomDeadlineTime(e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1.5 font-num text-xs tk-text-ink tabular-nums"
                      />
                      <button
                        type="submit"
                        disabled={!customDeadlineTitle.trim()}
                        className="rounded-lg tk-bg-forest px-3 py-1.5 text-xs font-semibold tk-text-card hover:tk-bg-press disabled:opacity-40 whitespace-nowrap cursor-pointer"
                      >
                        {copy.schedulePushBtn}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="tk-text-ink2">
                        {copy.quickLabel}
                      </span>
                      {copy.quickDeadlineOptions.map((q) => (
                        <button
                          key={q.mins}
                          type="button"
                          onClick={() =>
                            setCustomDeadlineTime(
                              formatLocalDateTimeInputValue(Date.now() + q.mins * 60_000)
                            )
                          }
                          className="rounded-md border tk-bc-hair tk-bg-card px-2 py-0.5 font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest cursor-pointer"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {(() => {
                  const activeDeadlines = scheduledPackingAlerts.filter((a) => !a.isFired);
                  const nowSnap = Date.now();
                  if (activeDeadlines.length === 0) return null;
                  return (
                    <div className="divide-y tk-divide-hair rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1">
                      {activeDeadlines.slice(0, 5).map((item) => (
                        <div
                          key={item.signature}
                          className="py-1.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold tk-text-ink truncate">
                              {item.title}
                            </div>
                            <div className="font-num text-[11px] tk-text-forest tabular-nums">
                              {formatScheduleBadgeLabel(
                                item.triggerAtMs,
                                nowSnap,
                                activeLang,
                                timeFormat
                              )}
                            </div>
                          </div>
                          {!item.isAutoRule && onRemoveScheduledAlert && (
                            <button
                              type="button"
                              onClick={() => onRemoveScheduledAlert(item)}
                              title={copy.cancelDeadlineTitle}
                              className="h-6 w-6 rounded-md tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </section>

        {/* Card 2 (Desktop Quick Summary): Clean preview delegating full workflow to TripTasksModal */}
        <section
          ref={tasksSectionRef}
          className={`hidden lg:block rounded-2xl border tk-bg-card overflow-hidden transition-colors ${
 isAllTasksDone ? 'tk-bc-hair' : 'tk-bc-hair'
 }`}
        >
          <div className="p-5 pb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <AccentIconBadge accent="teal" icon={ListTodo} size="md" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold tk-text-ink truncate">
                  {t('tasks.sidebarTitle')}
                </h3>
                <p className="text-[11px] tk-text-ink2 tabular-nums">
                  {doneTasksCount}/{scopedTasks.length} {copy.tasksDoneSuffix}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTasksModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{copy.manageTodosBtn}</span>
              <ChevronRight className="h-3.5 w-3.5 tk-text-ink2" />
            </button>
          </div>

          <div className="border-t tk-bc-hair divide-y tk-divide-hair">
            {scopedTasks.length === 0 ? (
              <div className="px-5 py-4 text-xs tk-text-ink2 flex items-center justify-between gap-2">
                <span>{t('tasks.emptyAll')}</span>
                <button
                  type="button"
                  onClick={() => setTasksModalOpen(true)}
                  className="font-semibold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + {t('tasks.addTaskBtn')}
                </button>
              </div>
            ) : (
              scopedTasks.slice(0, 4).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="w-full px-5 py-2.5 flex items-center gap-2.5 text-left hover:tk-bg-paper transition-colors cursor-pointer"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
 task.done
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-card'
 }`}
                  >
                    {task.done && <Check className="h-3 w-3 stroke-[2.5]" />}
                  </span>
                  <span
                    className={`text-xs font-semibold truncate flex-1 ${
 task.done ? 'line-through tk-text-ink2' : 'tk-text-ink'
 }`}
                  >
                    {translateDemoTaskTitle(task.title, activeLang)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Card 3: Tabbed Reference (Carry-on Gatekeeper | Destination Infrastructure) */}
        <section className="rounded-2xl border tk-bc-hair tk-bg-card p-5 space-y-3">
          <div className="flex items-center gap-1 rounded-xl tk-bg-forest-plate p-1">
            <button
              type="button"
              onClick={() => setRightInfoTab('carryon')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
 rightInfoTab === 'carryon'
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              <AccentIconBadge accent="peach" icon={ShieldAlert} size="2xs" ring={false} />
              {t('packingExtra.carryOnTab', { count: carryOnItems.length })}
            </button>
            <button
              type="button"
              onClick={() => setRightInfoTab('infra')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
 rightInfoTab === 'infra'
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              <AccentIconBadge accent="teal" icon={PlugZap} size="2xs" ring={false} />
              {t('packingExtra.infraTab')}
            </button>
          </div>

          {rightInfoTab === 'carryon' ? (
            <div>
              <p className="text-xs tk-text-ink2">
                {t('packingExtra.carryOnIntro')}
              </p>
              <ul className="mt-2.5 divide-y tk-divide-hair border-t tk-bc-hair">
                {carryOnItems.map((c) => {
                  const qty = getItemQuantity(c);
                  const localName = translateDemoPackItemName(c.name, activeLang);
                  return (
                    <li key={c.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium tk-text-ink truncate">
                        {qty > 1 ? `${localName} ×${qty}` : localName}
                      </span>
                      <span className="tabular-nums tk-text-forest shrink-0">
                        {c.done ? t('packingExtra.confirmedCheck') : t('packingExtra.pendingCheck')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="tk-text-ink2">{t('packingExtra.plugTypeLabel')}</span>
                <span className="font-semibold tk-text-ink text-right">
                  {translateIntelField('plugType', intel.plugType, activeLang)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="tk-text-ink2">{t('packingExtra.voltageLabel')}</span>
                <span className="font-num font-semibold tk-text-ink">{intel.voltage}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="tk-text-ink2">{t('packingExtra.transitPassLabel')}</span>
                <span className="font-semibold tk-text-ink text-right">
                  {translateIntelField('transitPassName', intel.transitPassName, activeLang)}
                </span>
              </div>
              <div className="pt-2 border-t tk-bc-hair">
                <div className="flex items-center gap-1.5 font-semibold tk-text-forest">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('packingExtra.vatExitPrefix')}
                    {translateIntelField('vatExitAirport', intel.vatExitAirport, activeLang)}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed tk-text-ink2">
                  {translateIntelField('vatRuleSummary', intel.vatRuleSummary, activeLang)}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Packy-Fusion Item Detail Bottom Sheet */}
      <PackingItemDetailSheet
        open={Boolean(activeSheetMatch)}
        group={activeSheetMatch?.group ?? null}
        item={activeSheetMatch?.item ?? null}
        groups={groups}
        crew={crew}
        intel={intel}
        cities={cities}
        smartBagOverrides={smartBagOverrides}
        unitSystem={unitSystem}
        affiliatePartners={affiliatePartners}
        onClose={() => setActiveSheetItemId(null)}
        onAdjustQuantity={onAdjustItemQuantity}
        onUpdateItemSilent={(groupId, itemId, updates, targetGroupId) =>
          onUpdateItem(groupId, itemId, updates, targetGroupId, true)
        }
        onSaveRenameAndNote={(groupId, itemId, nextName, nextWhy) =>
          onUpdateItem(
            groupId,
            itemId,
            {
              name: nextName,
              why: nextWhy || copy.renameFallbackWhy,
            },
            undefined,
            false
          )
        }
        onSwitchCabinCheckIn={onSwitchCabinCheckIn}
        onAssignSmartBag={onAssignItemSmartBag}
        onToggleAlwaysPack={onToggleAlwaysPack}
        onToggleToBuy={onToggleToBuy}
        onToggleMorningOfDeparture={onToggleMorningOfDeparture}
        onDeleteItem={onDeleteItem}
        onDontSuggestAgain={onDontSuggestItemAgain}
        onOpenInGoMode={onOpenItemInGoMode}
      />

      {/* Standalone Packy-Style Sheet Modals: Add Gear · Weight Analytics · To Buy · Pre-Trip To-Dos */}
      <AddGearModal
        open={addGearOpen}
        onClose={() => setAddGearOpen(false)}
        initialTab={addGearInitialTab}
        initialGroupId={addGearInitialGroup}
        groups={groups}
        crew={crew}
        claimedSeatId={claimedSeatId}
        activeMemberId={activeMemberId}
        intel={intel}
        setup={setup}
        carryOnLimitKg={carryOnLimitKg}
        checkedLimitKg={checkedLimitKg}
        neverSuggestItems={neverSuggestItems}
        unitSystem={unitSystem}
        destinationGapPicks={destinationGapPicks}
        alwaysPackLibrary={alwaysPackLibrary}
        onApplySmartParams={onApplySmartParams}
        onAddItem={onAddItem}
        onAddGroup={onAddGroup}
        onClassifyAndAddPackItem={onClassifyAndAddPackItem}
        onCommitClassifiedItem={onCommitClassifiedItem}
        onDeduplicateExistingItem={onDeduplicateExistingItem}
        onAuditMissingItems={onAuditMissingItems}
        onBatchAddMissingItems={onBatchAddMissingItems}
        onSeedAlwaysPack={onSeedAlwaysPack}
        onSyncAlwaysPack={onSyncAlwaysPack}
      />

      <WeightAnalyticsModal
        open={weightModalOpen}
        onClose={() => setWeightModalOpen(false)}
        groups={groups}
        activeMemberId={activeMemberId}
        smartBagOverrides={smartBagOverrides}
        carryOnLimitKg={carryOnLimitKg}
        checkedLimitKg={checkedLimitKg}
        unitSystem={unitSystem}
        baggagePreset={baggagePreset}
        onSelectBaggagePreset={onSelectBaggagePreset}
        onFocusCategory={(groupId) => {
          setSmartPackOpen(false);
          setCollapsed((prev) => ({ ...prev, [groupId]: false }));
        }}
      />

      <ToBuyModal
        open={toBuyModalOpen}
        onClose={() => setToBuyModalOpen(false)}
        toBuyPairs={toBuyPairs}
        groups={groups}
        crew={crew}
        claimedSeatId={claimedSeatId}
        activeMemberId={activeMemberId}
        intel={intel}
        cities={cities}
        unitSystem={unitSystem}
        affiliatePartners={affiliatePartners}
        destinationGapPicks={destinationGapPicks}
        onToggleToBuy={onToggleToBuy}
        onQuickAddAffiliateGear={onQuickAddAffiliateGear}
        onAddItem={onAddItem}
      />

      <TripTasksModal
        open={tasksModalOpen}
        onClose={() => setTasksModalOpen(false)}
        tasks={tasks}
        crew={crew}
        claimedSeatId={claimedSeatId}
        activeMemberId={activeMemberId}
        onToggleTask={onToggleTask}
        onAddTask={onAddTask}
        onAiParseAndAddTasks={onAiParseAndAddTasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onCycleTaskOwner={onCycleTaskOwner}
      />
    </div>
  );
};

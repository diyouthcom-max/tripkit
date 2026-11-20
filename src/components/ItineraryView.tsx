import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  Sparkles,
  CloudRain,
  Clock,
  Plus,
  Loader2,
  AlertTriangle,
  MessageSquareText,
  Maximize2,
  Copy,
  Check,
  X,
  MapPin,
  Users,
  Navigation,
  Pencil,
  ExternalLink,
  Bookmark,
  BellRing,
  BellPlus,
  Trash2,
  Plane,
  QrCode,
  Home,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Footprints,
  TrainFront,
  CarTaxiFront,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  BudgetTier,
  CrewMember,
  DayStayAnchor,
  LocalCardResult,
  MeetupPlan,
  StopType,
  TimeFormatPref,
  TimelineNode,
  TravelPass,
  TripIntelligence,
} from '../types';
import {
  translateCityName,
  translateDemoCrewRole,
  translateDemoMeetupNote,
  translateDemoSpatialSummary,
  translateDemoStopTitle,
  translateDemoWishlistItem,
  translateMemberInitials,
  translateMemberName,
  translateRainChanceLabel,
} from '../i18n';
import { formatTimeByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import {
  buildInstantDriverFallback,
  getCityForDay,
  getPrimaryCityName,
} from '../utils/itineraryHelpers';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  buildPlaceQueryString,
} from '../utils/googleMapsHelpers';
import { DayRouteMapPanel, type DayRouteLegsSummary } from './DayRouteMapPanel';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { AddStopModal } from './AddStopModal';
import { PlaceDetailSheet } from './PlaceDetailSheet';
import {
  TimelineNodeCard,
  type QuickExpenseLogPayload,
} from './TimelineNodeCard';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import {
  useDayStopsGooglePlaces,
  type StopEnrichmentTarget,
} from '../services/googlePlaceLiveStore';
import { AccentIconBadge, HERO_AVATAR_BG } from '../utils/accentTheme';
import {
  formatLocalDateTimeInputValue,
  formatScheduleBadgeLabel,
  type ItineraryAlertLeadMinutes,
  type ResolvedScheduledAlert,
} from '../utils/notificationScheduler';
import { getItineraryViewCopy } from '../i18n/packs/itineraryViewPack';
import { getItineraryViewRailCopy } from '../i18n/packs/itineraryViewRailPack';

export interface FullItineraryPlanOptions {
  budgetTier: BudgetTier;
  targetDailyBudgetLocal?: number;
  includeHotelSuggestions: boolean;
  includeTransitDetails: boolean;
}

interface SortableTimelineNodeItemProps {
  id: string;
  disabled?: boolean;
  children: (sortableProps: {
    isDragging: boolean;
    isOver: boolean;
    dragHandleRef: (element: HTMLElement | null) => void;
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  }) => React.ReactNode;
}

const SortableTimelineNodeItem: React.FC<SortableTimelineNodeItemProps> = ({
  id,
  disabled = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, disabled });

  const domNodeRef = useRef<HTMLDivElement | null>(null);
  const setCombinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      domNodeRef.current = el;
      setNodeRef(el);
    },
    [setNodeRef]
  );

  useLayoutEffect(() => {
    const el = domNodeRef.current;
    if (!el) return;
    el.style.transform = CSS.Transform.toString(transform) ?? '';
    el.style.transition = transition ?? '';
  }, [transform, transition]);

  const dragHandleProps = useMemo(
    () =>
      ({
        ...attributes,
        ...(listeners ?? {}),
      }) as React.HTMLAttributes<HTMLButtonElement>,
    [attributes, listeners]
  );

  return (
    <div ref={setCombinedRef} className={isDragging ? 'relative z-10' : 'relative'}>
      {children({
        isDragging,
        isOver,
        dragHandleRef: setActivatorNodeRef,
        dragHandleProps,
      })}
    </div>
  );
};

export interface FullItineraryPlanResult {
  budgetStrategySummary: string;
  recommendedDailyBudgetLocal?: number;
  recommendedHotelAndTransitTotalLocal?: number;
}

export interface SmartReorderItineraryResult {
  overallSummary: string;
  warningNote?: string;
  updatedDays: number[];
  reorderedStopCount: number;
  preservedVisitedCount: number;
}

interface ItineraryViewProps {
  timeline: TimelineNode[];
  wishlist: string[];
  cities: string[];
  cityDays?: number[];
  totalDays: number;
  activeDay: number;
  departureDate?: string;
  dayStays?: Record<number, DayStayAnchor>;
  travelPasses?: TravelPass[];
  affiliatePartners?: AffiliatePartnerConfig;
  dailyBudgetLocal: number;
  initialBudgetTier?: BudgetTier;
  crew: CrewMember[];
  meetup: MeetupPlan;
  companionName?: string;
  timeFormat?: TimeFormatPref;
  intel: TripIntelligence;
  rainSwapped: boolean;
  rainSwappedDays?: Record<number, boolean>;
  spatialSummary: string;
  spatialClustered: boolean;
  warningNote: string | null;
  onSelectDay: (day: number) => void;
  onToggleRainSwap: () => void;
  onToggleVisitedNode: (nodeId: string) => void;
  onQuickLogNode: (nodeId: string, payload: QuickExpenseLogPayload) => void;
  onAddNode: (
    day: number,
    node: Omit<TimelineNode, 'id' | 'day' | 'logged'>
  ) => void;
  onUpdateNode: (
    nodeId: string,
    updates: Partial<TimelineNode>,
    options?: { silent?: boolean }
  ) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNodeOrder: (nodeId: string, direction: 'up' | 'down') => void;
  onReorderDayNodes: (day: number, fromIndex: number, toIndex: number) => void;
  previousDayNodes?: TimelineNode[];
  onRestorePreviousDayOrder?: (day: number) => void;
  onMoveNodeToWishlist: (nodeId: string) => void;
  onAddWishlistItem: (item: string) => void;
  onRemoveWishlistItem: (item: string) => void;
  onUpdateMeetup: (updates: Partial<MeetupPlan>) => void;
  onOptimizeItinerary: (
    actionType: 'recluster' | 'delay' | 'insert_wishlist' | 'generate_day',
    extra?: { delayMinutes?: number; wishlistItem?: string }
  ) => Promise<void>;
  onPlanFullItinerary: (
    options: FullItineraryPlanOptions
  ) => Promise<FullItineraryPlanResult | null>;
  onSmartReorderAllUnvisited?: () => Promise<SmartReorderItineraryResult | null>;
  canUndoSmartReorder?: boolean;
  onUndoSmartReorder?: () => void;
  onGenerateLocalCard: (
    scenario: string,
    targetName: string,
    targetAddress: string,
    cityOverride?: string
  ) => Promise<LocalCardResult | null>;
  onOpenAiAssistant?: (initialPrompt?: string) => void;
  notificationPermission?: NotificationPermission | 'unsupported';
  itineraryLeadMinutes?: ItineraryAlertLeadMinutes;
  armedStopLeads?: Record<string, ItineraryAlertLeadMinutes>;
  isMeetupAlertArmed?: boolean;
  scheduledItineraryAlerts?: ResolvedScheduledAlert[];
  onRequestBrowserPermission?: () => void | Promise<NotificationPermission | 'unsupported'>;
  onChangeItineraryLeadMinutes?: (mins: ItineraryAlertLeadMinutes) => void;
  onToggleStopAlert?: (nodeId: string) => void;
  onToggleDayStopsAlerts?: (day: number) => void;
  onToggleMeetupAlert?: (day: number) => void;
  onAddCustomItineraryAlert?: (payload: {
    title: string;
    triggerAtMs: number;
    day: number;
    note?: string;
  }) => void;
  onRemoveScheduledAlert?: (alert: ResolvedScheduledAlert) => void;
  onOpenGoModeWallet?: (day?: number) => void;
  onUpdateDayStay?: (
    day: number,
    stay: DayStayAnchor | null,
    applyToSameCityDays?: boolean
  ) => void;
  onUpsertTravelPass?: (pass: TravelPass) => void;
  onDeleteTravelPass?: (passId: string) => void;
  onOpenPassInGoMode?: (passId: string) => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  timeline,
  wishlist,
  cities,
  cityDays,
  totalDays,
  activeDay,
  departureDate,
  dayStays,
  travelPasses = [],
  affiliatePartners,
  dailyBudgetLocal,
  initialBudgetTier = 'comfort',
  crew,
  meetup,
  companionName = 'Emma',
  timeFormat = '24h',
  intel,
  rainSwapped,
  rainSwappedDays,
  spatialSummary,
  spatialClustered,
  warningNote,
  onSelectDay,
  onToggleRainSwap,
  onToggleVisitedNode,
  onQuickLogNode,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onMoveNodeOrder,
  onReorderDayNodes,
  previousDayNodes,
  onRestorePreviousDayOrder,
  onMoveNodeToWishlist,
  onAddWishlistItem,
  onRemoveWishlistItem,
  onUpdateMeetup,
  onOptimizeItinerary,
  onPlanFullItinerary,
  onSmartReorderAllUnvisited,
  canUndoSmartReorder = false,
  onUndoSmartReorder,
  onGenerateLocalCard,
  onOpenAiAssistant,
  notificationPermission = 'default',
  itineraryLeadMinutes = 30,
  armedStopLeads = {},
  isMeetupAlertArmed = false,
  scheduledItineraryAlerts = [],
  onRequestBrowserPermission,
  onChangeItineraryLeadMinutes,
  onToggleStopAlert,
  onToggleDayStopsAlerts,
  onToggleMeetupAlert,
  onAddCustomItineraryAlert,
  onRemoveScheduledAlert,
  onOpenGoModeWallet,
  onUpdateDayStay,
  onUpsertTravelPass,
  onDeleteTravelPass,
  onOpenPassInGoMode,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getItineraryViewCopy(activeLang), [activeLang]);
  const railCopy = useMemo(() => getItineraryViewRailCopy(activeLang), [activeLang]);
  const safeDaysCount = Math.max(1, totalDays);
  const currentDay = Math.min(safeDaysCount, Math.max(1, activeDay));

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(60);

  // Full-trip AI smart planner state (attractions, hotels, transit, budget)
  const [showFullPlanner, setShowFullPlanner] = useState(false);
  const [planBudgetTier, setPlanBudgetTier] = useState<BudgetTier>(initialBudgetTier);
  const [planDailyBudgetInput, setPlanDailyBudgetInput] = useState<string>('');
  const [planIncludeHotels, setPlanIncludeHotels] = useState(true);
  const [planIncludeTransit, setPlanIncludeTransit] = useState(true);
  const [planStrategyResult, setPlanStrategyResult] = useState<FullItineraryPlanResult | null>(
    null
  );
  const [smartReorderResult, setSmartReorderResult] =
    useState<SmartReorderItineraryResult | null>(null);

  // Immersive Add Stop Modal state
  const [showAddStop, setShowAddStop] = useState(false);
  const [addStopInitialCoords, setAddStopInitialCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Local Push Custom Alert form state
  const [showCustomAlertForm, setShowCustomAlertForm] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertTime, setCustomAlertTime] = useState(() =>
    formatLocalDateTimeInputValue(Date.now() + 30 * 60_000)
  );

  //Unified Optimize Menu, Collapsible Audit Strip & Post-Add Contextual Nudge state
  const [showOptimizeMenu, setShowOptimizeMenu] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [newlyAddedCountByDay, setNewlyAddedCountByDay] = useState<Record<number, number>>({});
  const optimizeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showOptimizeMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (optimizeMenuRef.current && !optimizeMenuRef.current.contains(e.target as Node)) {
        setShowOptimizeMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOptimizeMenu(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showOptimizeMenu]);

  // Node Editing, Detail Sheet, Route Legs, Daily Stay Anchor, Swipe & DND-Kit Active Drag state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [swipedNodeId, setSwipedNodeId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dayRouteLegs, setDayRouteLegs] = useState<DayRouteLegsSummary | null>(null);

  // Daily Hotel Stay Anchor inline editor state
  const [editingStay, setEditingStay] = useState(false);
  const [stayNameDraft, setStayNameDraft] = useState('');
  const [stayAddressDraft, setStayAddressDraft] = useState('');
  const [stayPlaceIdDraft, setStayPlaceIdDraft] = useState<string | undefined>(undefined);
  const [stayCoordsDraft, setStayCoordsDraft] = useState<
    { lat: number; lng: number } | undefined
  >(undefined);
  const [applyStayToCityDays, setApplyStayToCityDays] = useState(true);
  const staySectionRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Wishlist quick-add state
  const [wishlistDraft, setWishlistDraft] = useState('');

  // Meetup inline editor & copy state
  const [editingMeetup, setEditingMeetup] = useState(false);
  const [meetupTimeDraft, setMeetupTimeDraft] = useState(meetup.time);
  const [meetupPlaceDraft, setMeetupPlaceDraft] = useState(meetup.placeName);
  const [meetupAddrDraft, setMeetupAddrDraft] = useState(meetup.address);
  const [meetupNoteDraft, setMeetupNoteDraft] = useState(meetup.note);
  const [copiedMeetupAddr, setCopiedMeetupAddr] = useState(false);

  // Local Communication Card + Fullscreen Large-Type state
  const [localCard, setLocalCard] = useState<LocalCardResult | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [activeDriverNodeId, setActiveDriverNodeId] = useState<string | null>(null);
  const [driverTargetAddress, setDriverTargetAddress] = useState<string>('');
  const [copiedModalAddr, setCopiedModalAddr] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  const [fullscreenCardOpen, setFullscreenCardOpen] = useState(false);
  const inlineCardRef = useRef<HTMLDivElement | null>(null);

  // Group timeline by day
  const dayNodes = useMemo(
    () => timeline.filter((n) => (n.day ?? 1) === currentDay),
    [timeline, currentDay]
  );

  const dayNodeIds = useMemo(() => dayNodes.map((n) => n.id), [dayNodes]);

  const activeDraggedEntry = useMemo(() => {
    if (!activeDragId) return null;
    const idx = dayNodes.findIndex((n) => n.id === activeDragId);
    if (idx === -1) return null;
    return { node: dayNodes[idx], index: idx };
  }, [activeDragId, dayNodes]);

  const handleDndStart = useCallback((event: DragStartEvent) => {
    setSwipedNodeId(null);
    setEditingNodeId(null);
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDndEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = dayNodes.findIndex((n) => n.id === String(active.id));
      const newIndex = dayNodes.findIndex((n) => n.id === String(over.id));
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onReorderDayNodes(currentDay, oldIndex, newIndex);
        setNewlyAddedCountByDay((prev) => {
          if (!prev[currentDay]) return prev;
          const next = { ...prev };
          delete next[currentDay];
          return next;
        });
      }
    },
    [dayNodes, currentDay, onReorderDayNodes]
  );

  const handleDndCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const dayCityLabel = useMemo(
    () => getCityForDay(cities, currentDay, safeDaysCount, dayNodes, activeLang, cityDays),
    [cities, currentDay, safeDaysCount, dayNodes, activeLang, cityDays]
  );
  const primaryCity = useMemo(() => getPrimaryCityName(dayCityLabel), [dayCityLabel]);

  const currentDayStay = dayStays?.[currentDay] ?? null;

  const enrichmentTargets = useMemo<StopEnrichmentTarget[]>(
    () =>
      dayNodes.map((n) => {
        const swapped = Boolean(rainSwapped && n.isOutdoor && n.rainSwapTitle);
        return {
          nodeId: n.id,
          placeId: swapped ? undefined : n.placeId,
          title: swapped ? n.rainSwapTitle! : n.title,
          address: swapped && n.rainSwapAddress ? n.rainSwapAddress : n.address,
          cityHint: primaryCity || n.city || '',
        };
      }),
    [dayNodes, rainSwapped, primaryCity]
  );

  const handlePlaceIdDiscovered = useCallback(
    (nodeId: string, discoveredPlaceId: string, coords?: { lat: number; lng: number }) => {
      if (rainSwapped) return;
      const target = dayNodes.find((n) => n.id === nodeId);
      if (!target || target.placeId === discoveredPlaceId) return;
      onUpdateNode(
        nodeId,
        {
          placeId: discoveredPlaceId,
          lat: target.lat ?? coords?.lat,
          lng: target.lng ?? coords?.lng,
        },
        { silent: true }
      );
    },
    [dayNodes, rainSwapped, onUpdateNode]
  );

  const { placesByNodeId, loadingByNodeId } = useDayStopsGooglePlaces(
    enrichmentTargets,
    activeLang,
    handlePlaceIdDiscovered
  );

  const linkedPassesByNodeId = useMemo(() => {
    const map: Record<string, TravelPass[]> = {};
    for (const p of travelPasses) {
      if (p.linkedTimelineNodeId) {
        if (!map[p.linkedTimelineNodeId]) map[p.linkedTimelineNodeId] = [];
        map[p.linkedTimelineNodeId].push(p);
      }
    }
    return map;
  }, [travelPasses]);

  const openStayEditor = useCallback(() => {
    setStayNameDraft(currentDayStay?.placeName || '');
    setStayAddressDraft(currentDayStay?.address || '');
    setStayPlaceIdDraft(currentDayStay?.placeId);
    setStayCoordsDraft(
      typeof currentDayStay?.lat === 'number' && typeof currentDayStay?.lng === 'number'
        ? { lat: currentDayStay.lat, lng: currentDayStay.lng }
        : undefined
    );
    setApplyStayToCityDays(true);
    setEditingStay(true);
    requestAnimationFrame(() => {
      staySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [currentDayStay]);

  const outdoorSwapNodes = useMemo(
    () => dayNodes.filter((n) => n.isOutdoor && n.rainSwapTitle),
    [dayNodes]
  );

  const dayEstimatedTotal = useMemo(
    () => dayNodes.reduce((s, n) => s + (Number(n.estLocal) || 0), 0),
    [dayNodes]
  );
  const visitedCount = useMemo(
    () => dayNodes.filter((n) => n.visited || n.logged).length,
    [dayNodes]
  );

  const coveredDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= safeDaysCount; d += 1) {
      if (timeline.some((n) => (n.day ?? 1) === d)) count += 1;
    }
    return count;
  }, [timeline, safeDaysCount]);

  const unvisitedAcrossTripCount = useMemo(() => {
    return timeline.filter((n) => {
      const d = n.day ?? 1;
      const isVisited = n.visited !== undefined ? n.visited : Boolean(n.logged);
      return d >= 1 && d <= safeDaysCount && !isVisited;
    }).length;
  }, [timeline, safeDaysCount]);

  const previousOrderIndexById = useMemo(() => {
    const map = new Map<string, number>();
    if (!previousDayNodes || previousDayNodes.length === 0) return map;
    previousDayNodes.forEach((n, idx) => {
      map.set(n.id, idx);
    });
    return map;
  }, [previousDayNodes]);

  const runOptimize = async (
    actionType: 'recluster' | 'delay' | 'insert_wishlist' | 'generate_day',
    extra?: { delayMinutes?: number; wishlistItem?: string }
  ) => {
    setShowOptimizeMenu(false);
    setBusyAction(actionType + (extra?.wishlistItem || ''));
    try {
      await onOptimizeItinerary(actionType, extra);
      if (actionType === 'recluster' || actionType === 'generate_day') {
        setNewlyAddedCountByDay((prev) => {
          if (!prev[currentDay]) return prev;
          const next = { ...prev };
          delete next[currentDay];
          return next;
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddNodeWithNudge = useCallback(
    (targetDay: number, node: Omit<TimelineNode, 'id' | 'day' | 'logged'>) => {
      onAddNode(targetDay, node);
      setNewlyAddedCountByDay((prev) => ({
        ...prev,
        [targetDay]: (prev[targetDay] || 0) + 1,
      }));
    },
    [onAddNode]
  );

  const handleRunFullPlan = async () => {
    setShowOptimizeMenu(false);
    setBusyAction('plan_full');
    try {
      const parsedDaily = Number(planDailyBudgetInput);
      const result = await onPlanFullItinerary({
        budgetTier: planBudgetTier,
        targetDailyBudgetLocal: parsedDaily > 0 ? parsedDaily : undefined,
        includeHotelSuggestions: planIncludeHotels,
        includeTransitDetails: planIncludeTransit,
      });
      if (result) {
        setPlanStrategyResult(result);
        setNewlyAddedCountByDay({});
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunSmartReorder = async () => {
    if (!onSmartReorderAllUnvisited || busyAction !== null) return;
    setShowOptimizeMenu(false);
    setBusyAction('smart_reorder');
    try {
      const result = await onSmartReorderAllUnvisited();
      if (result) {
        setSmartReorderResult(result);
        setNewlyAddedCountByDay({});
      }
    } finally {
      setBusyAction(null);
    }
  };

  const openDriverCard = async (
    scenario: string,
    name: string,
    address: string,
    options?: { openFullscreen?: boolean; nodeId?: string }
  ) => {
    const shouldFullscreen = Boolean(options?.openFullscreen);
    setCardLoading(true);
    setActiveDriverNodeId(options?.nodeId ?? null);

    if (shouldFullscreen) {
      // Immediately build a crisp native-language taxi card + street address and pop open fullscreen modal (0ms latency)
      setDriverTargetAddress(address);
      setCopiedModalAddr(false);
      setLocalCard(buildInstantDriverFallback(primaryCity, name, address, activeLang));
      setFullscreenCardOpen(true);
    } else {
      setDriverTargetAddress('');
      setLocalCard({
        localTitle: name,
        localAddressOrPhrase: address,
        pronunciationHint: railCopy.phraseGeneratingHint(primaryCity),
        etiquetteTip: '',
        languageLabel: railCopy.localPhraseCardLabel(primaryCity),
      });
      requestAnimationFrame(() => {
        inlineCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    try {
      const res = await onGenerateLocalCard(scenario, name, address, primaryCity);
      if (res) {
        setLocalCard(res);
      }
    } finally {
      setCardLoading(false);
      setActiveDriverNodeId(null);
    }
  };

  const handleCopyModalAddress = async () => {
    const textToCopy = driverTargetAddress || localCard?.localAddressOrPhrase || '';
    if (!textToCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
      setCopiedModalAddr(true);
      setTimeout(() => setCopiedModalAddr(false), 1800);
    } catch {
      setCopiedModalAddr(true);
      setTimeout(() => setCopiedModalAddr(false), 1800);
    }
  };


  const handleAddWishlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistDraft.trim()) return;
    onAddWishlistItem(wishlistDraft.trim());
    setWishlistDraft('');
  };

  const handleCustomCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customScenario.trim()) return;
    openDriverCard(customScenario.trim(), customScenario.trim(), primaryCity);
    setCustomScenario('');
  };

  const displayPrimaryCity = translateCityName(primaryCity, activeLang);

  return (
    <div className="space-y-4">
      {/* Packy-Style First-Screen Bar: Row 1 Pinned Pass Wallet + Day Scroller, Row 2 Crisp 2-Action Toolbar */}
      <section className="rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3 shadow-2xs space-y-2.5">
        {/* Row 1: Pinned Offline Pass Wallet Capsule + Subtle Divider + Swipeable Day Scroller */}
        <div className="flex items-center gap-2 min-w-0">
          {onOpenGoModeWallet && (
            <>
              <button
                type="button"
                onClick={() => onOpenGoModeWallet()}
                title={copy.openWalletTitle}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-[#CBE6E3] bg-[#EFF9F8] px-3 text-xs font-bold text-[#076E6A] hover:border-[#078C88] hover:bg-[#E3F5F3] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5 text-[#078C88] shrink-0" />
                <span>{copy.passesBtn}</span>
              </button>
              <span aria-hidden="true" className="h-4 w-px bg-[#DCE8E5] shrink-0" />
            </>
          )}

          <HorizontalChipScroller
            activeKey={currentDay}
            className="flex-1 min-w-0"
            fadeBgClassName="from-white"
            ariaLabel={copy.selectDayAria}
          >
            {Array.from({ length: safeDaysCount }, (_, idx) => {
              const d = idx + 1;
              const nodesForD = timeline.filter((n) => (n.day ?? 1) === d);
              const cityForD = getCityForDay(cities, d, safeDaysCount, nodesForD, activeLang, cityDays);
              const isSelected = d === currentDay;
              return (
                <button
                  key={d}
                  type="button"
                  data-chip-active={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setEditingNodeId(null);
                    setDetailNodeId(null);
                    setEditingStay(false);
                    setSwipedNodeId(null);
                    setActiveDragId(null);
                    onSelectDay(d);
                  }}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-[#093B35] bg-[#093B35] text-white'
                      : nodesForD.length === 0
                      ? 'border-dashed border-[#CBDAD7] bg-[#FAFDFC] text-[#5B7370] hover:border-[#093B35] hover:text-[#152B29]'
                      : 'border-[#E2ECEA] bg-[#F5F8F7] text-[#354E4B] hover:border-[#B8D8D4] hover:text-[#152B29]'
                  }`}
                >
                  <span className="font-num font-bold">D{d}</span>
                  {cityForD && <span>{cityForD}</span>}
                  {nodesForD.length > 0 && (
                    <span
                      className={`font-num text-[11px] tabular-nums ${
                        isSelected ? 'text-white/80' : 'text-[#6D8581]'
                      }`}
                    >
                      {nodesForD.length}
                    </span>
                  )}
                </button>
              );
            })}
          </HorizontalChipScroller>
        </div>

        {/* Row 2: Single-Line Day Action Row (+ Add Place · Optimize Route Menu · Quiet Stats) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EFF4F3]">
          <div className="flex items-center gap-2 min-w-0">
            {/* 1. Primary Action: + Add Place */}
            <button
              type="button"
              onClick={() => {
                setShowAddStop(true);
                setShowOptimizeMenu(false);
                if (showFullPlanner) setShowFullPlanner(false);
              }}
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#093B35] px-3.5 text-xs font-bold text-white hover:bg-[#0C4D45] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{copy.addPlaceBtn}</span>
            </button>

            {/* 2. Unified Route Optimize Menu (Consolidates Day Recluster + Multi-Day Smart Reorder + Full AI Plan) */}
            <div ref={optimizeMenuRef} className="relative">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setShowOptimizeMenu((v) => !v)}
                aria-expanded={showOptimizeMenu}
                aria-haspopup="menu"
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 ${
                  showOptimizeMenu || showFullPlanner
                    ? 'border-[#078C88] bg-[#EFF9F8] text-[#076E6A]'
                    : 'border-[#DCE8E5] bg-[#F8FAF9] text-[#152B29] hover:border-[#078C88] hover:text-[#076E6A]'
                }`}
              >
                {busyAction === 'recluster' ||
                busyAction === 'smart_reorder' ||
                busyAction === 'plan_full' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#078C88] shrink-0" />
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#078C88] shrink-0" />
                )}
                <span>
                  {busyAction === 'recluster'
                    ? copy.optimizingDay(currentDay)
                    : busyAction === 'smart_reorder'
                    ? copy.reorderingTrip
                    : busyAction === 'plan_full'
                    ? copy.planningTrip
                    : copy.optimizeRouteBtn}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#647B78] transition-transform duration-150 ${
                    showOptimizeMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showOptimizeMenu && (
                <div
                  role="menu"
                  className="absolute left-0 z-30 mt-1.5 w-72 sm:w-80 rounded-2xl border border-[#DCE8E5] bg-white p-1.5 shadow-xl space-y-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={dayNodes.length < 2 || busyAction !== null}
                    onClick={() => void runOptimize('recluster')}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#EFF9F8] disabled:opacity-45 transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <Navigation className="h-4 w-4 text-[#078C88] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#152B29]">
                        {copy.optimizeDayTitle(currentDay, dayNodes.length)}
                      </div>
                      <div className="text-[11px] text-[#647B78] mt-0.5 leading-snug">
                        {copy.optimizeDayDesc}
                      </div>
                    </div>
                  </button>

                  {onSmartReorderAllUnvisited && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={unvisitedAcrossTripCount < 2 || busyAction !== null}
                      onClick={() => void handleRunSmartReorder()}
                      className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#EFF9F8] disabled:opacity-45 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <ArrowUpDown className="h-4 w-4 text-[#078C88] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#152B29]">
                          {copy.smartReorderTitle(safeDaysCount, unvisitedAcrossTripCount)}
                        </div>
                        <div className="text-[11px] text-[#647B78] mt-0.5 leading-snug">
                          {copy.smartReorderDesc(unvisitedAcrossTripCount)}
                        </div>
                      </div>
                    </button>
                  )}

                  <div className="border-t border-[#EFF4F3] my-1" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowOptimizeMenu(false);
                      setShowFullPlanner((v) => !v);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F3FC] transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-[#6355B5] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#152B29]">
                        {copy.aiRebuildTitle(safeDaysCount)}
                      </div>
                      <div className="text-[11px] text-[#647B78] mt-0.5 leading-snug">
                        {copy.aiRebuildDesc}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quiet Unboxed Trip & Budget Summary */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#647B78] tabular-nums">
            <span>
              {t('itinerary.plannedDays', {
                covered: coveredDaysCount,
                total: safeDaysCount,
              })}
            </span>
            <span aria-hidden="true" className="text-[#CBDAD7]">
              ·
            </span>
            <span>
              {t('itinerary.dailyBudgetRef', {
                symbol: intel.currencySymbol,
                amount: dailyBudgetLocal.toFixed(0),
              })}
            </span>
          </div>
        </div>

        {/* Multi-Day Smart Reorder Result & Undo Strip */}
        {smartReorderResult && (
          <div className="rounded-xl border border-[#C6E6E3] bg-[#EFF9F8] p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-[#076E6A]">
                <span>
                  {copy.smartReorderApplied(safeDaysCount)}
                </span>
                <span aria-hidden="true" className="text-[#99CCC8]">·</span>
                <span className="font-num tabular-nums font-semibold text-[#152B29]">
                  {copy.reorderedStopsCount(smartReorderResult.reorderedStopCount)}
                </span>
                {smartReorderResult.preservedVisitedCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#99CCC8]">·</span>
                    <span className="font-num tabular-nums font-normal text-[#4F6865]">
                      {copy.visitedLockedCount(smartReorderResult.preservedVisitedCount)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {canUndoSmartReorder && onUndoSmartReorder && (
                  <button
                    type="button"
                    onClick={() => {
                      onUndoSmartReorder();
                      setSmartReorderResult(null);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-[#076E6A] hover:text-[#054F4C] whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('itinerary.smartReorderUndo')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSmartReorderResult(null)}
                  className="font-semibold text-[#5B7370] hover:text-[#152B29] whitespace-nowrap cursor-pointer"
                >
                  {t('itinerary.collapse')}
                </button>
              </div>
            </div>

            <p className="text-[#2B4240] leading-relaxed">
              {smartReorderResult.overallSummary}
            </p>

            {smartReorderResult.updatedDays.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[#5B7370]">
                  {copy.updatedTimelinesLabel}
                </span>
                {smartReorderResult.updatedDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectDay(d)}
                    className={`rounded-lg px-2 py-0.5 font-num text-[11px] font-bold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      d === currentDay
                        ? 'bg-[#078C88] text-white'
                        : 'bg-white border border-[#BBDAD7] text-[#076E6A] hover:border-[#078C88]'
                    }`}
                  >
                    D{d}
                  </button>
                ))}
              </div>
            )}

            {smartReorderResult.warningNote && (
              <div className="pt-2 border-t border-[#D3EBE8] flex items-start gap-1.5 text-[#875220]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#B96A39] shrink-0 mt-0.5" />
                <span>{smartReorderResult.warningNote}</span>
              </div>
            )}
          </div>
        )}

        {/* Full-Trip Budget-Aware AI Planner Panel */}
        {showFullPlanner && (
          <div className="pt-3 border-t border-[#EDF3F1] space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#152B29]">
                  {copy.fullPlannerTitle(safeDaysCount)}
                </h3>
                <p className="mt-0.5 text-xs text-[#5B7370]">
                  {copy.fullPlannerSubtitle(safeDaysCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullPlanner(false)}
                className="text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
              >
                {t('itinerary.collapse')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'budget' as const,
                  label: t('itinerary.tierBudget'),
                  desc: t('itinerary.tierBudgetDesc'),
                },
                {
                  id: 'comfort' as const,
                  label: t('itinerary.tierComfort'),
                  desc: t('itinerary.tierComfortDesc'),
                },
                {
                  id: 'luxury' as const,
                  label: t('itinerary.tierLuxury'),
                  desc: t('itinerary.tierLuxuryDesc'),
                },
              ].map((tier) => {
                const active = planBudgetTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setPlanBudgetTier(tier.id)}
                    className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#078C88] bg-[#EFF9F8]'
                        : 'border-[#DCE8E5] bg-[#F8FAF9] hover:border-[#BBDAD7]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#152B29]">{tier.label}</div>
                    <div className="mt-0.5 text-[11px] text-[#5B7370] leading-snug">
                      {tier.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2 font-semibold text-[#3B5552]">
                  <span>{t('itinerary.targetDailySpend', { currency: intel.currencyCode })}</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={planDailyBudgetInput}
                    onChange={(e) => setPlanDailyBudgetInput(e.target.value)}
                    placeholder={dailyBudgetLocal.toFixed(0)}
                    className="w-28 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-2.5 py-1.5 font-num text-xs font-bold text-[#152B29] tabular-nums focus:bg-white focus:border-[#0ABAB5] focus:outline-none"
                  />
                </label>

                <label className="inline-flex items-center gap-1.5 font-semibold text-[#3B5552] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planIncludeHotels}
                    onChange={(e) => setPlanIncludeHotels(e.target.checked)}
                    className="rounded border-[#DCE8E5] accent-[#078C88]"
                  />
                  {t('itinerary.includeHotels')}
                </label>

                <label className="inline-flex items-center gap-1.5 font-semibold text-[#3B5552] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planIncludeTransit}
                    onChange={(e) => setPlanIncludeTransit(e.target.checked)}
                    className="rounded border-[#DCE8E5] accent-[#078C88]"
                  />
                  {t('itinerary.includeTransit')}
                </label>
              </div>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleRunFullPlan()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#067572] disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {busyAction === 'plan_full' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {busyAction === 'plan_full'
                  ? t('itinerary.generatingFull', { count: safeDaysCount })
                  : t('itinerary.generateFullCta', { count: safeDaysCount })}
              </button>
            </div>

            {planStrategyResult && (
              <div className="rounded-xl border border-[#C6E6E3] bg-[#EFF9F8] p-3.5 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-[#076E6A]">
                  <span>
                    {copy.budgetBuiltTitle(safeDaysCount)}
                  </span>
                  {planStrategyResult.recommendedDailyBudgetLocal ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-num tabular-nums">
                        {copy.suggestedDailyPrefix}
                        {intel.currencySymbol}
                        {planStrategyResult.recommendedDailyBudgetLocal.toFixed(0)}
                        {copy.perPersonSuffix}
                      </span>
                    </>
                  ) : null}
                  {planStrategyResult.recommendedHotelAndTransitTotalLocal ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-num tabular-nums">
                        {copy.estStaysTransitPrefix}
                        {intel.currencySymbol}
                        {planStrategyResult.recommendedHotelAndTransitTotalLocal.toFixed(0)}
                      </span>
                    </>
                  ) : null}
                </div>
                <p className="text-[#3B5552] leading-relaxed">
                  {planStrategyResult.budgetStrategySummary}
                </p>
              </div>
            )}
          </div>
        )}

      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Timeline Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Contextual Post-Add Smart Optimize Nudge (Only surfaces right after new stops are added!) */}
          {(newlyAddedCountByDay[currentDay] || 0) > 0 && dayNodes.length >= 2 && (
            <section className="rounded-2xl border border-[#BDE3DF] bg-[#EFF9F8] px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0 text-xs text-[#152B29]">
                <ArrowUpDown className="h-4 w-4 text-[#078C88] shrink-0" />
                <span className="font-semibold">
                  {copy.postAddNudge(newlyAddedCountByDay[currentDay], currentDay)}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void runOptimize('recluster')}
                  className="min-h-[34px] inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3 text-xs font-bold text-white hover:bg-[#067572] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {busyAction === 'recluster' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{copy.optimizeNowBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewlyAddedCountByDay((prev) => {
                      const next = { ...prev };
                      delete next[currentDay];
                      return next;
                    })
                  }
                  className="min-h-[34px] px-2.5 rounded-xl text-xs font-semibold text-[#5B7370] hover:bg-white/80 hover:text-[#152B29] whitespace-nowrap cursor-pointer"
                >
                  {copy.keepAsIsBtn}
                </button>
              </div>
            </section>
          )}

          {/* Slim Single-Line Collapsible Route Summary Strip (Replaces 7-line wall of text) */}
          <section className="rounded-2xl border border-[#DCE8E5] bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-[#4F6865]">
                <Navigation className="h-3.5 w-3.5 text-[#078C88] shrink-0" />
                <span className="font-bold text-[#152B29]">
                  D{currentDay} · {dayCityLabel}
                </span>
                <span aria-hidden="true" className="text-[#CBDAD7]">
                  ·
                </span>
                <span>
                  {spatialClustered ? t('itinerary.clusteredOk') : t('itinerary.canOptimize')}
                </span>
                <span aria-hidden="true" className="text-[#CBDAD7]">
                  ·
                </span>
                <span className="tabular-nums">
                  {t('itinerary.visitedAndEst', {
                    visited: visitedCount,
                    total: dayNodes.length,
                    symbol: intel.currencySymbol,
                    amount: dayEstimatedTotal.toFixed(0),
                  })}
                </span>
                {previousDayNodes && previousDayNodes.length >= 2 && (
                  <>
                    <span aria-hidden="true" className="text-[#CBDAD7]">
                      ·
                    </span>
                    <span className="text-[#C86D2D] font-semibold">
                      {copy.beforeAfterOnMap}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {!spatialClustered &&
                  dayNodes.length >= 2 &&
                  !(newlyAddedCountByDay[currentDay] > 0) && (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void runOptimize('recluster')}
                      className="text-xs font-bold text-[#078C88] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      {copy.optimizeLink}
                    </button>
                  )}

                {spatialSummary && (
                  <button
                    type="button"
                    onClick={() => setAuditExpanded((v) => !v)}
                    className="min-h-[30px] inline-flex items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#5B7370] hover:bg-[#F3F8F7] hover:text-[#152B29] whitespace-nowrap cursor-pointer"
                  >
                    <span>{copy.routeNotesBtn}</span>
                    {auditExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {auditExpanded && spatialSummary && (
              <p className="mt-2.5 pt-2.5 border-t border-[#EFF4F3] text-xs leading-relaxed text-[#3B5552]">
                {translateDemoSpatialSummary(spatialSummary, activeLang)}
              </p>
            )}

            {warningNote && (
              <div className="mt-2.5 pt-2.5 border-t border-[#EFF4F3] flex items-start gap-2 text-xs text-[#B96A39]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{warningNote}</span>
              </div>
            )}
          </section>

          {/* Per-Day Rain Plan Banner — Stacks cleanly on mobile with Warm Amber squircle icon tile */}
          {outdoorSwapNodes.length > 0 && (
            <section className="rounded-2xl border border-[#F2E2BA] bg-[#FFFBF2] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <AccentIconBadge accent="peach" icon={CloudRain} size="md" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#7A4B16]">
                    {copy.rainPlanHeading(
                      currentDay,
                      translateRainChanceLabel(intel.rainChance, activeLang)
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#8E622B] leading-relaxed">
                    {rainSwapped
                      ? copy.rainSwitchedBackup(
                          outdoorSwapNodes
                            .map((n) => translateDemoStopTitle(n.rainSwapTitle || '', activeLang))
                            .join(', ')
                        )
                      : copy.rainSwapPrompt(
                          outdoorSwapNodes
                            .map((n) => translateDemoStopTitle(n.title, activeLang))
                            .join(', ')
                        )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleRainSwap}
                className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rainSwapped
                    ? 'bg-[#C86D2D] text-white hover:bg-[#B25E22]'
                    : 'border border-[#EAD4AE] bg-white text-[#7A4B16] hover:bg-[#FFF5E6]'
                }`}
              >
                {rainSwapped ? t('itinerary.rainSwapActive') : t('itinerary.rainSwapToggle')}
              </button>
            </section>
          )}

          {/* Day Route Map & Interactive Packy-Style Place Cards */}
          <DayRouteMapPanel
            dayNumber={currentDay}
            cityLabel={dayCityLabel}
            primaryCity={primaryCity}
            nodes={dayNodes}
            allTimelineNodes={timeline}
            cities={cities}
            cityDays={cityDays}
            totalDays={safeDaysCount}
            previousNodes={previousDayNodes}
            rainSwapped={rainSwapped}
            rainSwappedDays={rainSwappedDays}
            placesByNodeId={placesByNodeId}
            dayStay={currentDayStay}
            onOpenStopDetail={(nodeId) => setDetailNodeId(nodeId)}
            onHoldMapAddPlace={(coords) => {
              setAddStopInitialCoords(coords);
              setShowAddStop(true);
            }}
            onRequestSetStay={onUpdateDayStay ? openStayEditor : undefined}
            onRestorePreviousOrder={
              onRestorePreviousDayOrder
                ? () => onRestorePreviousDayOrder(currentDay)
                : undefined
            }
            onDayRouteLegsChange={setDayRouteLegs}
          />

          {/* Drag Reorder & Horizontal Swipe Hint */}
          {dayNodes.length >= 2 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#647B78]">
              <span>
                {copy.dragHintPrefix}
                <span className="font-mono font-bold text-[#078C88]">⋮⋮</span>
                {copy.dragHintSuffix}
              </span>
              <span className="font-num tabular-nums">
                {copy.stopsCountLabel(dayNodes.length)}
              </span>
            </div>
          ) : dayNodes.length > 0 ? (
            <div className="flex items-center justify-between px-1 text-xs text-[#7B928E] sm:hidden">
              <span>{copy.swipeHintSingle}</span>
              <span className="font-num tabular-nums">
                {copy.stopsCountLabel(dayNodes.length)}
              </span>
            </div>
          ) : null}

          {/* Packy-Style Daily Hotel Stay Anchor ("Add where you're staying >") */}
          {onUpdateDayStay && (
            <div ref={staySectionRef}>
              {editingStay ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleanName = stayNameDraft.trim();
                    if (!cleanName) return;
                    onUpdateDayStay(
                      currentDay,
                      {
                        placeName: cleanName,
                        address: stayAddressDraft.trim() || `${cleanName}, ${primaryCity}`,
                        placeId: stayPlaceIdDraft,
                        lat: stayCoordsDraft?.lat,
                        lng: stayCoordsDraft?.lng,
                      },
                      applyStayToCityDays
                    );
                    setEditingStay(false);
                  }}
                  className="rounded-2xl border border-[#078C88] bg-white p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#076E6A]">
                      <Home className="h-4 w-4 text-[#078C88]" />
                      <span>
                        {copy.stayHeading(currentDay, displayPrimaryCity)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingStay(false)}
                      className="text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                    <PlaceAutocompleteInput
                      value={stayNameDraft}
                      onChange={(val) => {
                        setStayNameDraft(val);
                        setStayPlaceIdDraft(undefined);
                      }}
                      cityHint={primaryCity}
                      includedPrimaryTypes={['lodging']}
                      onSelectPlace={(place) => {
                        setStayNameDraft(place.name);
                        if (place.formattedAddress) setStayAddressDraft(place.formattedAddress);
                        setStayPlaceIdDraft(place.placeId);
                        setStayCoordsDraft(place.location);
                      }}
                      placeholder={copy.staySearchPlaceholder(displayPrimaryCity)}
                      className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs sm:text-sm font-semibold text-[#152B29] focus:bg-white focus:border-[#078C88] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={stayAddressDraft}
                      onChange={(e) => setStayAddressDraft(e.target.value)}
                      placeholder={copy.stayAddressPlaceholder}
                      className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs sm:text-sm text-[#152B29] focus:bg-white focus:border-[#078C88] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F6865] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyStayToCityDays}
                        onChange={(e) => setApplyStayToCityDays(e.target.checked)}
                        className="rounded border-[#DCE8E5] accent-[#078C88]"
                      />
                      <span>
                        {copy.stayApplyAllDays(displayPrimaryCity)}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 ml-auto">
                      {currentDayStay && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateDayStay(currentDay, null, false);
                            setEditingStay(false);
                          }}
                          className="rounded-xl border border-[#F0CECA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B83B2E] hover:bg-[#FDF3F2] cursor-pointer"
                        >
                          {copy.clearBtn}
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!stayNameDraft.trim()}
                        className="rounded-xl bg-[#078C88] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] disabled:opacity-40 cursor-pointer"
                      >
                        {copy.saveStayBtn}
                      </button>
                    </div>
                  </div>
                </form>
              ) : currentDayStay ? (
                <div className="rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-[#EFF9F8] border border-[#C6E6E3] flex items-center justify-center shrink-0">
                      <Home className="h-4 w-4 text-[#078C88]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#152B29]">
                        <span className="truncate">{currentDayStay.placeName}</span>
                        <button
                          type="button"
                          onClick={openStayEditor}
                          className="text-xs font-semibold text-[#078C88] hover:underline shrink-0 cursor-pointer"
                        >
                          {copy.changeBtn}
                        </button>
                      </div>
                      <div className="text-[11px] text-[#647B78] truncate">
                        {currentDayStay.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {dayNodes.length > 0 && (
                      <a
                        href={buildGoogleMapsDirectionsUrl({
                          origin: buildPlaceQueryString(
                            currentDayStay.placeName,
                            currentDayStay.address,
                            primaryCity
                          ),
                          destination: buildPlaceQueryString(
                            rainSwapped && dayNodes[0].isOutdoor && dayNodes[0].rainSwapTitle
                              ? dayNodes[0].rainSwapTitle
                              : dayNodes[0].title,
                            rainSwapped && dayNodes[0].isOutdoor && dayNodes[0].rainSwapAddress
                              ? dayNodes[0].rainSwapAddress
                              : dayNodes[0].address,
                            primaryCity
                          ),
                          travelMode: 'transit',
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EFF9F8] border border-[#C6E6E3] px-2.5 py-1.5 text-xs font-semibold text-[#076E6A] hover:bg-[#DFF3F1] whitespace-nowrap"
                      >
                        <TrainFront className="h-3 w-3 text-[#078C88]" />
                        <span>{copy.toStopOneBtn}</span>
                        <ChevronRight className="h-3 w-3" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openDriverCard(
                          copy.hotelDriverScenario,
                          currentDayStay.placeName,
                          currentDayStay.address,
                          { openFullscreen: true, nodeId: `stay_day_${currentDay}` }
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] px-2.5 py-1.5 text-xs font-semibold text-[#3B5552] hover:border-[#078C88] whitespace-nowrap cursor-pointer"
                    >
                      <Navigation className="h-3 w-3 text-[#078C88]" />
                      <span>{copy.hotelTaxiCardBtn}</span>
                    </button>

                    {onUpsertTravelPass &&
                      (() => {
                        const existingHotelPass = travelPasses.find(
                          (p) =>
                            p.category === 'hotel' &&
                            p.title.toLowerCase().includes(currentDayStay.placeName.toLowerCase())
                        );
                        if (existingHotelPass && onOpenPassInGoMode) {
                          return (
                            <button
                              type="button"
                              onClick={() => onOpenPassInGoMode(existingHotelPass.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#076E6A] hover:border-[#078C88] whitespace-nowrap cursor-pointer"
                            >
                              <QrCode className="h-3 w-3 text-[#078C88]" />
                              <span>{copy.checkinPassBtn}</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const passId = `pass_hotel_d${currentDay}_${Date.now()}`;
                              onUpsertTravelPass({
                                id: passId,
                                category: 'hotel',
                                title: `${currentDayStay.placeName} ${copy.hotelPassTitleSuffix}`,
                                subtitle: displayPrimaryCity,
                                day: currentDay,
                                dateTimeLabel: `Day ${currentDay}`,
                                localLanguageTitle: currentDayStay.placeName,
                                localLanguageAddress: currentDayStay.address,
                                status: 'ready',
                                updatedAt: Date.now(),
                              });
                              onOpenPassInGoMode?.(passId);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5B7370] hover:border-[#078C88] hover:text-[#078C88] whitespace-nowrap cursor-pointer"
                          >
                            <QrCode className="h-3 w-3 text-[#078C88]" />
                            <span>{copy.addToWalletBtn}</span>
                          </button>
                        );
                      })()}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openStayEditor}
                  className="group inline-flex items-center gap-2 px-2 py-1 text-xs sm:text-sm font-medium text-[#647B78] hover:text-[#078C88] transition-colors cursor-pointer"
                >
                  <Home className="h-4 w-4 text-[#7B928E] group-hover:text-[#078C88] transition-colors" />
                  <span>{copy.addWhereStayingBtn}</span>
                  <ChevronRight className="h-4 w-4 text-[#8CA39F] group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          )}

          {/* Timeline Nodes or Empty-Day AI Generator */}
          {dayNodes.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-[#C6E6E3] bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex justify-center">
                <AccentIconBadge accent="teal" icon={MapPin} size="lg" shape="circle" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#152B29]">
                  {copy.emptyDayTitle(currentDay, dayCityLabel)}
                </h3>
                <p className="mt-1 text-xs text-[#647B78]">
                  {copy.emptyDayDesc(dayCityLabel)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => runOptimize('generate_day')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#067572] disabled:opacity-50 cursor-pointer"
                >
                  {busyAction === 'generate_day' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {copy.aiGenerateDayBtn(currentDay)}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setShowFullPlanner(true);
                    void handleRunFullPlan();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#078C88] bg-[#EFF9F8] px-4 py-2.5 text-xs font-bold text-[#076E6A] hover:bg-[#DFF3F1] disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.planAllDaysBtn(safeDaysCount)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStop(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-4 py-2.5 text-xs font-semibold text-[#152B29] hover:border-[#0ABAB5] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#078C88]" />
                  {copy.addFirstStopBtn}
                </button>
              </div>
            </section>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDndStart}
              onDragEnd={handleDndEnd}
              onDragCancel={handleDndCancel}
            >
              <SortableContext
                items={dayNodeIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {dayNodes.map((node, idx) => {

                    const currSwapped = Boolean(
                      rainSwapped && node.isOutdoor && node.rainSwapTitle
                    );
                    const currStopQuery = buildPlaceQueryString(
                      currSwapped ? node.rainSwapTitle! : node.title,
                      currSwapped && node.rainSwapAddress ? node.rainSwapAddress : node.address,
                      primaryCity
                    );

                    const nextNode = idx < dayNodes.length - 1 ? dayNodes[idx + 1] : null;
                    const nextSwapped = Boolean(
                      nextNode && rainSwapped && nextNode.isOutdoor && nextNode.rainSwapTitle
                    );
                    const nextStopQuery = nextNode
                      ? buildPlaceQueryString(
                          nextSwapped ? nextNode.rainSwapTitle! : nextNode.title,
                          nextSwapped && nextNode.rainSwapAddress
                            ? nextNode.rainSwapAddress
                            : nextNode.address,
                          primaryCity
                        )
                      : undefined;

                    // Inter-stop leg duration & distance from Routes API / DayRouteMapPanel
                    const hasMatchingLegs =
                      Boolean(dayRouteLegs) &&
                      dayRouteLegs!.legDurationsMin.length === Math.max(0, dayNodes.length - 1);
                    const legMin = hasMatchingLegs
                      ? dayRouteLegs?.legDurationsMin[idx]
                      : undefined;
                    const legKm = hasMatchingLegs
                      ? dayRouteLegs?.legDistancesKm[idx]
                      : undefined;
                    const isWalkLeg =
                      dayRouteLegs?.mode === 'walking' ||
                      (typeof legKm === 'number' && legKm > 0 && legKm <= 1.3);
                    const isDriveLeg = dayRouteLegs?.mode === 'driving';
                    const connectorTravelMode: 'walking' | 'driving' | 'transit' = isWalkLeg
                      ? 'walking'
                      : isDriveLeg
                      ? 'driving'
                      : 'transit';

                    const isNodeEditing = editingNodeId === node.id;
                    const linkedPassCount = linkedPassesByNodeId[node.id]?.length || 0;

                    return (
                      <React.Fragment key={node.id}>
                        <SortableTimelineNodeItem
                          id={node.id}
                          disabled={isNodeEditing || dayNodes.length <= 1}
                        >
                          {({ isDragging, isOver, dragHandleRef, dragHandleProps }) => (
                            <TimelineNodeCard
                              node={node}
                              index={idx}
                              totalInDay={dayNodes.length}
                              dayNumber={currentDay}
                              departureDate={departureDate}
                              rainSwapped={rainSwapped}
                              currencySymbol={intel.currencySymbol}
                              currencyCode={intel.currencyCode}
                              cityHint={primaryCity}
                              timeFormat={timeFormat}
                              livePlace={placesByNodeId[node.id] ?? null}
                              isPlaceLoading={Boolean(loadingByNodeId[node.id])}
                              linkedPassCount={linkedPassCount}
                              isEditing={isNodeEditing}
                              isSwipedOpen={swipedNodeId === node.id}
                              isDragging={isDragging}
                              isDragOver={
                                isOver && activeDragId !== null && activeDragId !== node.id
                              }
                              previousOrderIndex={previousOrderIndexById.get(node.id)}
                              dragHandleRef={dragHandleRef}
                              dragHandleProps={dragHandleProps}
                              onSwipeOpenChange={(open) => setSwipedNodeId(open ? node.id : null)}
                              onToggleVisited={() => onToggleVisitedNode(node.id)}
                              onOpenDetail={() => {
                                setSwipedNodeId(null);
                                setDetailNodeId(node.id);
                              }}
                              onStartEdit={() => {
                                setSwipedNodeId(null);
                                setEditingNodeId(node.id);
                              }}
                              onCancelEdit={() => setEditingNodeId(null)}
                              onSaveEdit={(updates) => {
                                onUpdateNode(node.id, updates);
                                setEditingNodeId(null);
                              }}
                              onDelete={() => {
                                setSwipedNodeId(null);
                                setEditingNodeId(null);
                                onDeleteNode(node.id);
                              }}
                              onMoveOrder={(dir) => onMoveNodeOrder(node.id, dir)}
                              scheduledLeadMinutes={armedStopLeads[node.id]}
                            />
                          )}
                        </SortableTimelineNodeItem>

                        {/* Packy-Style Inter-Stop Transit Connector ("🚆 33 min · 8.4 km >") */}
                        {nextNode && nextStopQuery && activeDragId === null && (
                          <div className="pl-5 sm:pl-7 py-0.5 flex items-center">
                            <a
                              href={buildGoogleMapsDirectionsUrl({
                                origin: currStopQuery,
                                destination: nextStopQuery,
                                travelMode: connectorTravelMode,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={copy.connectorMapsTitle}
                              className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-[#647B78] hover:bg-white hover:text-[#078C88] transition-colors"
                            >
                              {isWalkLeg ? (
                                <Footprints className="h-3.5 w-3.5 text-[#7B928E] group-hover:text-[#078C88]" />
                              ) : isDriveLeg ? (
                                <CarTaxiFront className="h-3.5 w-3.5 text-[#7B928E] group-hover:text-[#078C88]" />
                              ) : (
                                <TrainFront className="h-3.5 w-3.5 text-[#7B928E] group-hover:text-[#078C88]" />
                              )}

                              {typeof legMin === 'number' && legMin > 0 ? (
                                <span className="font-num tabular-nums">
                                  {copy.minsLabel(legMin)}
                                  {typeof legKm === 'number' && legKm > 0
                                    ? ` · ${legKm.toFixed(1)} km`
                                    : ''}
                                </span>
                              ) : (
                                <span>
                                  {copy.directionsNextStop}
                                </span>
                              )}

                              <ChevronRight className="h-3.5 w-3.5 text-[#9DB3AF] group-hover:text-[#078C88] group-hover:translate-x-0.5 transition-transform" />
                            </a>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </SortableContext>

              <DragOverlay
                dropAnimation={{
                  duration: 180,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {activeDraggedEntry ? (
                  <TimelineNodeCard
                    node={activeDraggedEntry.node}
                    index={activeDraggedEntry.index}
                    totalInDay={dayNodes.length}
                    dayNumber={currentDay}
                    departureDate={departureDate}
                    rainSwapped={rainSwapped}
                    currencySymbol={intel.currencySymbol}
                    currencyCode={intel.currencyCode}
                    cityHint={primaryCity}
                    timeFormat={timeFormat}
                    livePlace={placesByNodeId[activeDraggedEntry.node.id] ?? null}
                    linkedPassCount={
                      linkedPassesByNodeId[activeDraggedEntry.node.id]?.length || 0
                    }
                    isEditing={false}
                    isSwipedOpen={false}
                    isDragOverlay
                    previousOrderIndex={previousOrderIndexById.get(activeDraggedEntry.node.id)}
                    onSwipeOpenChange={() => {}}
                    onToggleVisited={() => {}}
                    onStartEdit={() => {}}
                    onCancelEdit={() => {}}
                    onSaveEdit={() => {}}
                    onDelete={() => {}}
                    onMoveOrder={() => {}}
                    scheduledLeadMinutes={armedStopLeads[activeDraggedEntry.node.id]}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Packy-Style Bottom-of-Timeline "+ Add a Place" Button */}
          {dayNodes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setAddStopInitialCoords(null);
                setShowAddStop(true);
              }}
              className="w-full min-h-[48px] rounded-2xl border border-dashed border-[#C5DDD9] bg-white hover:border-[#078C88] hover:bg-[#F3FAF9] px-4 py-3 text-xs sm:text-sm font-bold text-[#093B35] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#078C88]" />
              <span>
                {copy.addPlaceBottomBtn(currentDay, displayPrimaryCity)}
              </span>
            </button>
          )}
        </div>

        {/* Right Rail: Evening Meetup (if group) + Delay Ripple + Wishlist + Local Card */}
        <div className="lg:col-span-4 space-y-5">
          {/* Evening Split Meetup Anchor (integrated from former Crew module) */}
          {crew.length > 1 && (
            <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AccentIconBadge accent="teal" icon={Users} size="sm" />
                  <h3 className="text-sm font-bold text-[#152B29]">
                    {railCopy.splitMeetupTitle}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-num text-xs font-bold text-[#078C88] tabular-nums">
                    {formatTimeByPref(meetup.time, timeFormat)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingMeetup) {
                        setMeetupTimeDraft(meetup.time);
                        setMeetupPlaceDraft(meetup.placeName);
                        setMeetupAddrDraft(meetup.address);
                        setMeetupNoteDraft(meetup.note);
                      }
                      setEditingMeetup((v) => !v);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B7370] hover:text-[#078C88] cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                    {editingMeetup ? t('itinerary.collapse') : t('common.edit')}
                  </button>
                </div>
              </div>

              {editingMeetup ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateMeetup({
                      time: meetupTimeDraft || meetup.time,
                      placeName: meetupPlaceDraft.trim() || meetup.placeName,
                      address: meetupAddrDraft.trim() || meetup.address,
                      note: meetupNoteDraft.trim() || meetup.note,
                    });
                    setEditingMeetup(false);
                  }}
                  className="space-y-2.5 pt-2 border-t border-[#EDF3F1]"
                >
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <input
                      type="time"
                      value={meetupTimeDraft}
                      onChange={(e) => setMeetupTimeDraft(e.target.value)}
                      className="rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-2.5 py-1.5 font-num text-xs font-bold tabular-nums"
                    />
                    <div className="col-span-2">
                      <PlaceAutocompleteInput
                        value={meetupPlaceDraft}
                        onChange={setMeetupPlaceDraft}
                        cityHint={primaryCity}
                        onSelectPlace={(place) => {
                          setMeetupPlaceDraft(place.name);
                          if (place.formattedAddress) setMeetupAddrDraft(place.formattedAddress);
                        }}
                        placeholder={railCopy.meetupPlacePlaceholder}
                        className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs font-semibold text-[#152B29]"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={meetupAddrDraft}
                    onChange={(e) => setMeetupAddrDraft(e.target.value)}
                    placeholder={railCopy.meetupAddrPlaceholder}
                    className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#152B29]"
                  />
                  <input
                    type="text"
                    value={meetupNoteDraft}
                    onChange={(e) => setMeetupNoteDraft(e.target.value)}
                    placeholder={railCopy.meetupNotePlaceholder}
                    className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#152B29]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingMeetup(false)}
                      className="text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-[#078C88] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] cursor-pointer"
                    >
                      {railCopy.saveMeetupBtn}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="divide-y divide-[#F1F6F5] border-t border-[#EDF3F1]">
                    {crew.map((member) => (
                      <div
                        key={member.id}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-num text-[11px] font-bold shrink-0 ${
                              HERO_AVATAR_BG[member.accent] || HERO_AVATAR_BG.teal
                            }`}
                          >
                            {translateMemberInitials(member.initials, activeLang)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#152B29] truncate">
                              {translateMemberName(member.name, activeLang)}{' '}
                              <span className="font-normal text-[#647B78]">
                                · {translateDemoCrewRole(member.role, activeLang)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#5B7370] tabular-nums shrink-0">
                          {railCopy.walkEta(member.etaMinutes)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2.5 border-t border-[#EDF3F1] text-xs space-y-1.5">
                    <div className="font-bold text-[#152B29]">
                      {railCopy.meetupSpotPrefix}
                      {meetup.placeName}
                    </div>
                    <div className="text-[#5B7370] break-words">{meetup.address}</div>
                    {meetup.note && (
                      <div className="text-[#078C88]">
                        {translateDemoMeetupNote(meetup.note, activeLang)}
                      </div>
                    )}

                    <div className="pt-1.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (navigator.clipboard?.writeText) {
                              await navigator.clipboard.writeText(
                                `${meetup.placeName} · ${meetup.address}`
                              );
                            }
                            setCopiedMeetupAddr(true);
                            setTimeout(() => setCopiedMeetupAddr(false), 1800);
                          } catch {
                            setCopiedMeetupAddr(true);
                            setTimeout(() => setCopiedMeetupAddr(false), 1800);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] px-2.5 py-1.5 text-xs font-semibold text-[#3B5552] hover:border-[#0ABAB5] whitespace-nowrap cursor-pointer"
                      >
                        {copiedMeetupAddr ? (
                          <>
                            <Check className="h-3 w-3 text-[#078C88]" /> {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-[#078C88]" />{' '}
                            {railCopy.copyAddrBtn}
                          </>
                        )}
                      </button>

                      <a
                        href={buildGoogleMapsDirectionsUrl({
                          destination: buildPlaceQueryString(
                            meetup.placeName,
                            meetup.address,
                            primaryCity
                          ),
                          travelMode: 'transit',
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#152B29] hover:border-[#0ABAB5] hover:text-[#076E6A] whitespace-nowrap"
                      >
                        <ExternalLink className="h-3 w-3 text-[#078C88]" />
                        {railCopy.googleMapsBtn}
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          openDriverCard(
                            railCopy.meetupDriverScenario,
                            meetup.placeName,
                            meetup.address,
                            { openFullscreen: true, nodeId: 'meetup_anchor' }
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-[#C6E6E3] bg-[#EFF9F8] px-2.5 py-1.5 text-xs font-semibold text-[#076E6A] hover:bg-[#DFF3F1] whitespace-nowrap cursor-pointer"
                      >
                        <Navigation className="h-3 w-3 text-[#078C88]" />
                        {railCopy.showDriverMeetupBtn}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Itinerary & Meetup Local Browser Push Scheduler */}
          {(() => {
            const unvisitedDayNodes = dayNodes.filter((n) =>
              n.visited !== undefined ? !n.visited : !n.logged
            );
            const armedDayCount = unvisitedDayNodes.filter((n) =>
              Boolean(armedStopLeads[n.id])
            ).length;
            const allDayArmed =
              unvisitedDayNodes.length > 0 && armedDayCount === unvisitedDayNodes.length;
            const upcomingQueue = scheduledItineraryAlerts.filter((a) => !a.isFired);
            const nowSnapshot = Date.now();

            return (
              <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <AccentIconBadge accent="peach" icon={BellRing} size="sm" />
                    <h3 className="text-sm font-bold text-[#152B29] truncate">
                      {railCopy.pushAlertsTitle}
                    </h3>
                  </div>

                  {notificationPermission !== 'granted' &&
                  notificationPermission !== 'unsupported' &&
                  onRequestBrowserPermission ? (
                    <button
                      type="button"
                      onClick={() => void onRequestBrowserPermission()}
                      className="rounded-lg bg-[#078C88] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#067572] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {railCopy.allowPushBtn}
                    </button>
                  ) : (
                    <span className="font-num text-[11px] font-semibold text-[#078C88] whitespace-nowrap shrink-0 tabular-nums">
                      {notificationPermission === 'granted'
                        ? railCopy.pushReadyStatus
                        : railCopy.inAppBannerStatus}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-[#5B7370]">
                  {railCopy.pushAlertsDesc}
                </p>

                {/* Lead-time selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#3B5552]">
                      {railCopy.alertLeadTimeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAlertTime(
                          formatLocalDateTimeInputValue(Date.now() + 15 * 60_000)
                        );
                        setShowCustomAlertForm((v) => !v);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-[#078C88] hover:underline cursor-pointer"
                    >
                      <BellPlus className="h-3 w-3" />
                      {showCustomAlertForm ? railCopy.collapseBtn : railCopy.customTimeBtn}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {([15, 30, 60] as ItineraryAlertLeadMinutes[]).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onChangeItineraryLeadMinutes?.(mins)}
                        className={`rounded-xl py-1.5 font-num text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                          itineraryLeadMinutes === mins
                            ? 'border border-[#078C88] bg-[#EFF9F8] text-[#076E6A]'
                            : 'border border-[#DCE8E5] bg-[#F8FAF9] text-[#4F6865] hover:border-[#0ABAB5]'
                        }`}
                      >
                        {railCopy.minsBefore(mins)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1-Tap Batch Subscribe for Current Day Stops + Evening Meetup */}
                <div className="flex flex-wrap gap-2">
                  {unvisitedDayNodes.length > 0 && onToggleDayStopsAlerts && (
                    <button
                      type="button"
                      onClick={() => onToggleDayStopsAlerts(currentDay)}
                      className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        allDayArmed
                          ? 'border-[#078C88] bg-[#EFF9F8] text-[#076E6A]'
                          : 'border-[#DCE8E5] bg-[#F8FAF9] text-[#152B29] hover:border-[#0ABAB5]'
                      }`}
                    >
                      <BellRing className="h-3.5 w-3.5 text-[#078C88]" />
                      <span className="font-num tabular-nums">
                        {allDayArmed
                          ? railCopy.dayArmedBtn(currentDay, armedDayCount)
                          : railCopy.alertDayStopsBtn(currentDay, unvisitedDayNodes.length)}
                      </span>
                    </button>
                  )}

                  {onToggleMeetupAlert && (
                    <button
                      type="button"
                      onClick={() => onToggleMeetupAlert(currentDay)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isMeetupAlertArmed
                          ? 'border-[#078C88] bg-[#EFF9F8] text-[#076E6A]'
                          : 'border-[#DCE8E5] bg-white text-[#4F6865] hover:border-[#0ABAB5]'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 text-[#078C88]" />
                      <span className="font-num tabular-nums">
                        {railCopy.meetupBtnTime(formatTimeByPref(meetup.time, timeFormat))}
                      </span>
                    </button>
                  )}
                </div>

                {/* Custom Event Alert Form */}
                {showCustomAlertForm && onAddCustomItineraryAlert && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const cleaned = customAlertTitle.trim();
                      const ts = new Date(customAlertTime).getTime();
                      if (!cleaned || !Number.isFinite(ts)) return;
                      onAddCustomItineraryAlert({
                        title: cleaned,
                        triggerAtMs: ts,
                        day: currentDay,
                      });
                      setCustomAlertTitle('');
                      setShowCustomAlertForm(false);
                    }}
                    className="rounded-xl border border-[#E4EEEC] bg-[#F8FAF9] p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={customAlertTitle}
                      onChange={(e) => setCustomAlertTitle(e.target.value)}
                      placeholder={railCopy.customAlertPlaceholder}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="datetime-local"
                        value={customAlertTime}
                        onChange={(e) => setCustomAlertTime(e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 font-num text-xs text-[#152B29] tabular-nums"
                      />
                      <button
                        type="submit"
                        disabled={!customAlertTitle.trim()}
                        className="rounded-lg bg-[#078C88] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] disabled:opacity-40 whitespace-nowrap cursor-pointer"
                      >
                        {railCopy.scheduleBtn}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[#647B78]">
                        {railCopy.quickLabel}
                      </span>
                      {[
                        { mins: 1, label: railCopy.quickMins1Test },
                        { mins: 15, label: railCopy.quickMins15 },
                        { mins: 60, label: railCopy.quickMins60 },
                      ].map((q) => (
                        <button
                          key={q.mins}
                          type="button"
                          onClick={() =>
                            setCustomAlertTime(
                              formatLocalDateTimeInputValue(Date.now() + q.mins * 60_000)
                            )
                          }
                          className="rounded-md border border-[#DCE8E5] bg-white px-2 py-0.5 font-semibold text-[#3B5552] hover:border-[#078C88] hover:text-[#078C88] cursor-pointer"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {/* Upcoming Scheduled Queue */}
                {upcomingQueue.length > 0 && (
                  <div className="pt-2.5 border-t border-[#EDF3F1] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#5B7370]">
                      <span>
                        {railCopy.scheduledQueueTitle(upcomingQueue.length)}
                      </span>
                    </div>
                    <div className="divide-y divide-[#F1F6F5]">
                      {upcomingQueue.slice(0, 5).map((item) => (
                        <div
                          key={item.signature}
                          className="py-1.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#152B29] truncate">
                              {item.title}
                            </div>
                            <div className="font-num text-[11px] text-[#078C88] tabular-nums">
                              {formatScheduleBadgeLabel(
                                item.triggerAtMs,
                                nowSnapshot,
                                activeLang,
                                timeFormat
                              )}
                            </div>
                          </div>
                          {onRemoveScheduledAlert && (
                            <button
                              type="button"
                              onClick={() => onRemoveScheduledAlert(item)}
                              title={railCopy.cancelAlertTitle}
                              className="h-6 w-6 rounded-md text-[#8CA39F] hover:bg-[#FDF3F2] hover:text-[#B83B2E] flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {/* Delay Ripple */}
          <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5">
            <div className="flex items-center gap-2">
              <AccentIconBadge accent="peach" icon={Clock} size="sm" />
              <h3 className="text-sm font-bold text-[#152B29]">
                {railCopy.delayTitle(currentDay)}
              </h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5B7370]">
              {railCopy.delayDesc}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[30, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`rounded-xl py-2 text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                    delayMinutes === mins
                      ? 'bg-[#078C88] text-white'
                      : 'border border-[#DCE8E5] bg-[#F8FAF9] text-[#3B5552]'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busyAction !== null || dayNodes.length === 0}
              onClick={() => runOptimize('delay', { delayMinutes })}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#078C88] bg-[#EFF9F8] px-4 py-2.5 text-xs font-bold text-[#076E6A] hover:bg-[#DFF3F1] disabled:opacity-50 cursor-pointer"
            >
              {busyAction === 'delay' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {railCopy.shiftDayBtn(currentDay, delayMinutes)}
            </button>
          </section>

          {/* Bidirectional Wishlist Smart Insertion */}
          <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AccentIconBadge accent="lavender" icon={Bookmark} size="sm" />
                <h3 className="text-sm font-bold text-[#152B29] truncate">
                  {railCopy.wishlistTitle}
                </h3>
              </div>
              <span className="font-num text-xs text-[#647B78] tabular-nums shrink-0">
                {railCopy.wishlistSavedCount(wishlist.length)}
              </span>
            </div>

            <form onSubmit={handleAddWishlistSubmit} className="mt-3 flex items-start gap-2">
              <PlaceAutocompleteInput
                value={wishlistDraft}
                onChange={setWishlistDraft}
                cityHint={primaryCity}
                wrapperClassName="flex-1 min-w-0"
                onSelectPlace={(place) => {
                  onAddWishlistItem(place.name);
                  setWishlistDraft('');
                }}
                placeholder={railCopy.wishlistPlaceholder}
                className="w-full rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#152B29] focus:bg-white focus:border-[#0ABAB5] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#078C88] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] whitespace-nowrap shrink-0 cursor-pointer"
              >
                + {t('common.add')}
              </button>
            </form>

            <div className="mt-3 divide-y divide-[#F1F6F5] border-t border-[#EDF3F1]">
              {wishlist.length === 0 ? (
                <p className="py-3 text-xs text-[#647B78]">
                  {railCopy.wishlistAllScheduled}
                </p>
              ) : (
                wishlist.map((item) => {
                  const displayWish = translateDemoWishlistItem(item, activeLang);
                  return (
                    <div key={item} className="py-2.5 flex items-center justify-between gap-2">
                      <a
                        href={buildGoogleMapsSearchUrl({ title: item, cityHint: primaryCity })}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={railCopy.viewOnGoogleMapsTitle(displayWish)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#152B29] hover:text-[#078C88] truncate min-w-0"
                      >
                        <MapPin className="h-3 w-3 text-[#078C88] shrink-0" />
                        <span className="truncate">{displayWish}</span>
                      </a>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => runOptimize('insert_wishlist', { wishlistItem: item })}
                          className="rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] px-2.5 py-1 text-xs font-semibold text-[#078C88] hover:border-[#0ABAB5] whitespace-nowrap cursor-pointer"
                        >
                          {busyAction === `insert_wishlist${item}`
                            ? railCopy.fittingBtn
                            : railCopy.fitIntoDayBtn(currentDay)}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveWishlistItem(item)}
                          title={railCopy.removeWishlistTitle}
                          className="h-6 w-6 rounded-md text-[#8CA39F] hover:bg-[#FDF3F2] hover:text-[#B83B2E] flex items-center justify-center cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Quick Local Communication Cards + Custom Scenario + Fullscreen Mode */}
          <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AccentIconBadge accent="teal" icon={MessageSquareText} size="sm" />
                <h3 className="text-sm font-bold text-[#152B29]">
                  {railCopy.localCardsTitle(displayPrimaryCity)}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  openDriverCard(
                    railCopy.vatScenario,
                    railCopy.vatCardTitle,
                    intel.vatExitAirport
                  )
                }
                className="rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#3B5552] hover:border-[#0ABAB5] cursor-pointer"
              >
                {railCopy.vatBtn}
              </button>
              <button
                type="button"
                onClick={() =>
                  openDriverCard(
                    railCopy.diningScenario,
                    railCopy.diningCardTitle,
                    primaryCity
                  )
                }
                className="rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#3B5552] hover:border-[#0ABAB5] cursor-pointer"
              >
                {railCopy.diningBtn}
              </button>
              <button
                type="button"
                onClick={() =>
                  openDriverCard(
                    railCopy.luggageScenario,
                    railCopy.luggageCardTitle,
                    primaryCity
                  )
                }
                className="rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#3B5552] hover:border-[#0ABAB5] cursor-pointer"
              >
                {railCopy.luggageBtn}
              </button>
              <button
                type="button"
                onClick={() =>
                  openDriverCard(
                    railCopy.platformScenario,
                    railCopy.platformCardTitle,
                    primaryCity
                  )
                }
                className="rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#3B5552] hover:border-[#0ABAB5] cursor-pointer"
              >
                {railCopy.platformBtn}
              </button>
            </div>

            <form onSubmit={handleCustomCardSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder={railCopy.customScenarioPlaceholder(displayPrimaryCity)}
                className="flex-1 min-w-0 rounded-xl border border-[#DCE8E5] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#152B29] focus:bg-white focus:border-[#0ABAB5] focus:outline-none"
              />
              <button
                type="submit"
                disabled={cardLoading}
                className="rounded-xl border border-[#078C88] bg-[#EFF9F8] px-3 py-1.5 text-xs font-semibold text-[#076E6A] hover:bg-[#DFF3F1] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {railCopy.createCardBtn}
              </button>
            </form>

            {localCard && (
              <div
                ref={inlineCardRef}
                className="mt-3 rounded-xl bg-[#076E6A] p-4 text-white space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px] opacity-85">
                  <span>{localCard.languageLabel}</span>
                  <div className="flex items-center gap-2">
                    {cardLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <button
                      type="button"
                      onClick={() => setFullscreenCardOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                      {railCopy.fullscreenBtn}
                    </button>
                  </div>
                </div>
                <div className="text-base font-bold">{localCard.localTitle}</div>
                <div className="text-sm font-semibold leading-relaxed bg-white/10 rounded-lg p-3 whitespace-pre-line">
                  {localCard.localAddressOrPhrase}
                </div>
                <div className="text-xs opacity-90">
                  {railCopy.pronunciationPrefix}
                  {localCard.pronunciationHint}
                </div>
                {localCard.etiquetteTip && (
                  <div className="text-xs opacity-85 border-t border-white/20 pt-2">
                    {railCopy.localTipPrefix}
                    {localCard.etiquetteTip}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Fullscreen High-Contrast Show-to-Driver / Clerk Modal */}
      {fullscreenCardOpen && localCard && (
        <div
          onClick={() => setFullscreenCardOpen(false)}
          className="fixed inset-0 z-50 bg-[#082220]/95 backdrop-blur-xs p-4 sm:p-10 flex items-center justify-center overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-10 text-[#152B29] shadow-2xl space-y-5 my-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF3F1] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#078C88]">
                  {localCard.languageLabel} · {railCopy.showDirectlyToDriver}
                </span>
                {cardLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#647B78]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#078C88]" />
                    {railCopy.aiPolishingPhrasing}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFullscreenCardOpen(false)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#F2F6F5] px-3 py-1.5 text-xs font-bold text-[#3B5552] hover:bg-[#E4EEEC] cursor-pointer"
              >
                <X className="h-4 w-4" /> {t('common.close')}
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-base sm:text-xl font-bold text-[#5B7370]">
                {localCard.localTitle}
              </div>
              <div className="text-2xl sm:text-4xl font-extrabold leading-snug tracking-tight text-[#152B29] break-words whitespace-pre-line">
                {localCard.localAddressOrPhrase}
              </div>
            </div>

            {driverTargetAddress && (
              <div className="rounded-2xl border border-[#DCE8E5] bg-[#F8FAF9] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[#647B78]">
                    {railCopy.exactAddressHeading}
                  </div>
                  <div className="mt-0.5 text-base sm:text-lg font-extrabold text-[#076E6A] break-words">
                    {driverTargetAddress}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={buildGoogleMapsDirectionsUrl({
                      destination: driverTargetAddress,
                      travelMode: 'driving',
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#067572] whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {railCopy.openGoogleMapsModalBtn}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyModalAddress}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#C6E6E3] bg-white px-3.5 py-2 text-xs font-bold text-[#076E6A] hover:bg-[#EFF9F8] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedModalAddr ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> {railCopy.addrCopiedBtn}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> {railCopy.copyAddrBtn}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#EDF3F1] space-y-2 text-sm text-[#4F6865]">
              <div>
                <strong className="text-[#152B29]">
                  {railCopy.pronunciationBoldPrefix}
                </strong>
                {localCard.pronunciationHint}
              </div>
              {localCard.etiquetteTip && (
                <div>
                  <strong className="text-[#078C88]">
                    {railCopy.commTipBoldPrefix}
                  </strong>
                  {localCard.etiquetteTip}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Packy-Style Rich Place Detail Sheet + Linked Offline Pass Wallet */}
      {(() => {
        const activeDetailIndex = detailNodeId
          ? dayNodes.findIndex((n) => n.id === detailNodeId)
          : -1;
        const activeDetailNode =
          activeDetailIndex >= 0 ? dayNodes[activeDetailIndex] : null;
        const prevForDetail =
          activeDetailIndex > 0 ? dayNodes[activeDetailIndex - 1] : null;
        const prevSwapped = Boolean(
          prevForDetail &&
            rainSwapped &&
            prevForDetail.isOutdoor &&
            prevForDetail.rainSwapTitle
        );
        const prevDetailTitle = prevForDetail
          ? translateDemoStopTitle(
              prevSwapped ? prevForDetail.rainSwapTitle! : prevForDetail.title,
              activeLang
            )
          : undefined;
        const prevDetailQuery = prevForDetail
          ? buildPlaceQueryString(
              prevSwapped ? prevForDetail.rainSwapTitle! : prevForDetail.title,
              prevSwapped && prevForDetail.rainSwapAddress
                ? prevForDetail.rainSwapAddress
                : prevForDetail.address,
              primaryCity
            )
          : undefined;

        return (
          <PlaceDetailSheet
            open={Boolean(activeDetailNode)}
            node={activeDetailNode}
            dayNumber={currentDay}
            departureDate={departureDate}
            cityHint={primaryCity}
            rainSwapped={rainSwapped}
            timeFormat={timeFormat}
            currencySymbol={intel.currencySymbol}
            currencyCode={intel.currencyCode}
            vatThresholdLocal={intel.vatThresholdLocal}
            travelersCount={crew.length}
            companionName={companionName}
            isDriverCardLoading={Boolean(
              activeDetailNode && activeDriverNodeId === activeDetailNode.id
            )}
            livePlace={
              activeDetailNode ? placesByNodeId[activeDetailNode.id] ?? null : null
            }
            isPlaceLoading={
              activeDetailNode ? Boolean(loadingByNodeId[activeDetailNode.id]) : false
            }
            dayStay={currentDayStay}
            prevStopTitle={prevDetailTitle}
            prevStopQuery={prevDetailQuery}
            linkedPasses={
              activeDetailNode ? linkedPassesByNodeId[activeDetailNode.id] || [] : []
            }
            affiliatePartners={affiliatePartners}
            scheduledLeadMinutes={
              activeDetailNode ? armedStopLeads[activeDetailNode.id] : undefined
            }
            onClose={() => setDetailNodeId(null)}
            onUpdateNode={(nodeId, updates) => onUpdateNode(nodeId, updates)}
            onToggleVisited={
              activeDetailNode ? () => onToggleVisitedNode(activeDetailNode.id) : undefined
            }
            onStartFullEdit={() => {
              if (activeDetailNode) {
                setEditingNodeId(activeDetailNode.id);
              }
            }}
            onShowDriverCard={(title, addr) =>
              openDriverCard(
                railCopy.detailDriverScenario,
                title,
                addr,
                {
                  openFullscreen: true,
                  nodeId: activeDetailNode?.id,
                }
              )
            }
            onQuickLogExpense={(payload) => {
              if (activeDetailNode) {
                onQuickLogNode(activeDetailNode.id, payload);
              }
            }}
            onMoveToWishlist={
              activeDetailNode
                ? () => {
                    const targetId = activeDetailNode.id;
                    setDetailNodeId(null);
                    onMoveNodeToWishlist(targetId);
                  }
                : undefined
            }
            onToggleStopAlert={
              activeDetailNode && onToggleStopAlert
                ? () => onToggleStopAlert(activeDetailNode.id)
                : undefined
            }
            onRequestSetDayStay={openStayEditor}
            onUpsertPass={(pass) => onUpsertTravelPass?.(pass)}
            onDeletePass={(passId) => onDeleteTravelPass?.(passId)}
            onOpenPassInGoMode={(passId) => {
              setDetailNodeId(null);
              if (onOpenPassInGoMode) {
                onOpenPassInGoMode(passId);
              } else {
                onOpenGoModeWallet?.(currentDay);
              }
            }}
          />
        );
      })()}

      {/* Packy-Style 4-Mode Add Stop Sheet (For You / Search + Map Pin / Link & AI / Screenshot) */}
      <AddStopModal
        open={showAddStop}
        onClose={() => {
          setShowAddStop(false);
          setAddStopInitialCoords(null);
        }}
        cities={cities}
        cityDays={cityDays}
        totalDays={safeDaysCount}
        activeDay={currentDay}
        timeline={timeline}
        currencyCode={intel.currencyCode}
        currencySymbol={intel.currencySymbol}
        wishlist={wishlist}
        onConsumeWishlistItem={onRemoveWishlistItem}
        initialMapCoords={addStopInitialCoords}
        onSelectDay={onSelectDay}
        onAddNode={handleAddNodeWithNudge}
        onOpenAiAssistant={onOpenAiAssistant}
      />
    </div>
  );
};

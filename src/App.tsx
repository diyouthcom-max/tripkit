import React, { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Luggage,
  Wallet,
  Route,
  BellRing,
  UserPlus,
  ChevronDown,
  Briefcase,
} from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, formatCloudSyncError } from './firebase';
import { AiRequestError, fetchAiJsonWithRetry, resolveApiUrl } from './services/apiUrl';
import {
  isValidRoomCode,
  isValidSeatId,
  normalizeRoomCode,
  pushTripRoomUpdate,
  sanitizeTripForCloud,
  subscribeToTripRoom,
} from './services/cloudSync';
import { exportTripPdf } from './utils/exportTripPdf';
import { DEFAULT_PACKING_REMINDER, DEFAULT_TRIP_STATE, DEFAULT_TRIP_TASKS } from './data/presets';
import {
  SMART_BAG_SPECS,
  VALID_BAG_IDS,
  computeClothingNormalizationPlan,
  estimateDefaultUnitWeightGrams,
  formatItemDisplayName,
  getItemQuantity,
  getItemUnitWeight,
  getLocalizedSmartBagSpec,
  isItemCarryOnWeight,
  normalizePackingGroups,
  normalizePackingItemQuantity,
  normalizePackingTag,
  normalizeSmartBagOverrides,
  parseNameAndQuantity,
  resolveSmartBagForLocationSwitch,
  type ClothingNormalizationPlan,
} from './utils/packingHelpers';
import {
  applyExpenseEffectToBudget,
  clampSharePct,
  computeDynamicRolloverLocal,
  computeMyDailySpendForDay,
  getNextVatStatus,
  getVatStatusLabel,
  recomputeUnsettledPartnerOwed,
  resolveExpenseSplitDetails,
} from './utils/splitHelpers';
import {
  buildTripWeekdaySchedule,
  getCityForDay,
  getClosingUrgency,
  getPrimaryCityName,
  inferCityDaysFromTimeline,
  resolveCityDaysAllocation,
  sortNodesChronologically,
} from './utils/itineraryHelpers';
import {
  detectProtectedConflicts,
  formatProtectedConflictWarning,
  isNodeProtected,
  restoreMissingProtectedNodes,
} from './utils/timelineProtection';
import {
  applyTripSnapshotSlice,
  getTripSnapshot,
  listTripSnapshots,
  pushTripSnapshot,
} from './utils/snapshotStack';
import {
  deletePackingTemplate,
  loadPackingTemplates,
  renamePackingTemplate,
  savePackingTemplate,
  type PackingTemplate,
} from './utils/packingTemplateLibrary';
import { getPackingViewCopy } from './i18n/packs/packingViewPack';
import {
  getBlockedDomainsForProposal,
  getTouchedDomainsForProposal,
  listDisabledAiWriteDomains,
  loadAiWriteDomains,
  saveAiWriteDomains,
  type AiWriteDomain,
  type AiWriteDomainMap,
} from './utils/aiWritePermissions';
import { getConfiguredGoogleMapsApiKey } from './utils/googleMapsHelpers';
import { getItineraryViewCopy } from './i18n/packs/itineraryViewPack';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  BAGGAGE_PRESET_SPECS,
  FREE_AI_AUDIT_LIMIT,
  LANGUAGE_SPECS,
  PREFERENCES_STORAGE_KEY,
  computeMembershipStatus,
  detectSystemLanguage,
  formatTempRangeByPref,
  formatTimeByPref,
  formatItemWeightByPref,
  getBaggagePresetLabels,
  getHomeCurrencyLabel,
  loadAppPreferences,
  sanitizePreferences,
} from './utils/preferencesHelpers';
import {
  translateDemoPackItemName,
  translateDemoStopTitle,
  translateMemberInitials,
  translateMemberName,
  translateRainChanceLabel,
  translateTripStyleLabel,
} from './i18n';
import { getAppPack } from './i18n/packs/appPack';
import {
  fetchMyCloudEntitlement,
  type RedeemActivationResult,
} from './services/proRedeemService';
import {
  addNeverSuggestItem,
  filterGroupsAgainstNeverSuggest,
  isItemNeverSuggested,
  loadAlwaysPackLibrary,
  loadNeverSuggestList,
  mergeAlwaysPackIntoGroups,
  removeAlwaysPackItemById,
  removeAlwaysPackItemByName,
  seedCoreAlwaysPackFromGroups,
  upsertAlwaysPackItem,
} from './utils/alwaysPackHelpers';
import type { DestinationGearGapPick } from './utils/affiliateHelpers';
import type {
  AiAssistantDispatchResult,
  AiAssistantHistoryTurn,
  AiAssistantIntent,
  AiAssistantProposal,
  AiMissingItemSuggestion,
  AiProposedDateChange,
  AiProposedDestinationChange,
  AiProposedExpense,
  AiProposedItineraryRebuild,
  AiProposedPackingItem,
  AiProposedPackingTemplate,
  AiProposedRemoveStop,
  AiProposedStop,
  AiProposedTask,
  AiTravelTip,
  AiTravelTipCategory,
  AlwaysPackTemplateItem,
  AppLanguage,
  DraftDiffBaseline,
  AppPreferences,
  AppTab,
  CrewMember,
  DayStayAnchor,
  ExpenseRecord,
  LocalCardResult,
  MeetupPlan,
  PackingGroup,
  PackingItem,
  PackingLayer,
  PackingReminderSettings,
  PackingScenarioId,
  PackingTripPurpose,
  PaymentAccount,
  SavedTripEntry,
  SeatId,
  SettlementRecord,
  SmartBagId,
  StopType,
  TimelineNode,
  TravelPass,
  TripCoverConfig,
  TripIntelligence,
  TripSetup,
  TripState,
  TripStyle,
  TripTask,
  TripTaskCategory,
} from './types';
import { TripSetupWizard, type WizardMode } from './components/TripSetupWizard';
import {
  deleteCustomTripCover,
  duplicateCustomTripCover,
  loadCustomTripCover,
} from './utils/coverImageVault';
import {
  formatCompactTripDateRange,
  formatDestinationOnlyTitle,
  resolveActiveCoverVisual,
} from './utils/tripCoverHelpers';
import { PackingView } from './components/PackingView';
import type { BudgetLimitsUpdatePayload } from './components/BudgetPlannerModal';
import type {
  FullItineraryPlanOptions,
  FullItineraryPlanResult,
  SmartReorderItineraryResult,
} from './components/ItineraryView';
import { type QuickExpenseLogPayload } from './components/TimelineNodeCard';
import type { AuthModalMode } from './components/AuthModal';
import type { SettingsFocusSection } from './components/SettingsModal';
import type { PackingWizardSubmitPayload } from './components/PackingListWizardModal';

const BudgetView = React.lazy(() =>
  import('./components/BudgetView').then((m) => ({ default: m.BudgetView }))
);
const ItineraryView = React.lazy(() =>
  import('./components/ItineraryView').then((m) => ({ default: m.ItineraryView }))
);
const MyKitView = React.lazy(() =>
  import('./components/MyKitView').then((m) => ({ default: m.MyKitView }))
);
const TripBookModal = React.lazy(() =>
  import('./components/TripBookModal').then((m) => ({ default: m.TripBookModal }))
);
const TripCoverModal = React.lazy(() =>
  import('./components/TripCoverModal').then((m) => ({ default: m.TripCoverModal }))
);
const AiAssistantDrawer = React.lazy(() =>
  import('./components/AiAssistantDrawer').then((m) => ({ default: m.AiAssistantDrawer }))
);
const AuthModal = React.lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const ExpertAuditModal = React.lazy(() =>
  import('./components/ExpertAuditModal').then((m) => ({ default: m.ExpertAuditModal }))
);
const CrewInviteModal = React.lazy(() =>
  import('./components/CrewInviteModal').then((m) => ({ default: m.CrewInviteModal }))
);
const SettingsModal = React.lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const TripKitProModal = React.lazy(() =>
  import('./components/TripKitProModal').then((m) => ({ default: m.TripKitProModal }))
);
const PackingListWizardModal = React.lazy(() =>
  import('./components/PackingListWizardModal').then((m) => ({
    default: m.PackingListWizardModal,
  }))
);
const GoModeWalletModal = React.lazy(() =>
  import('./components/GoModeWalletModal').then((m) => ({ default: m.GoModeWalletModal }))
);
import {
  buildSmartSeededPassesFromTrip,
  inferPassCategoryFromName,
} from './utils/offlinePassVault';
import {
  applySizeScaleToPackingGroups,
  buildOfflineDeepPackingGroups,
  buildPerStopWeatherForecasts,
  mergeRegeneratedPackingGroups,
  PACKING_SCENARIO_SPECS,
} from './utils/packingWizardHelpers';
import {
  AccentIconBadge,
  HERO_ACCENT_PALETTE,
  HERO_AVATAR_BG,
  TAB_ACCENT_MAP,
} from './utils/accentTheme';
import {
  dispatchLocalBrowserNotification,
  formatScheduleBadgeLabel,
  getTripNotificationState,
  loadAllLocalNotificationStates,
  registerNotificationServiceWorker,
  resolveTripScheduledAlerts,
  saveAllLocalNotificationStates,
  type ItineraryAlertLeadMinutes,
  type ResolvedScheduledAlert,
  type TripLocalNotificationState,
} from './utils/notificationScheduler';

const TRIP_BOOK_STORAGE_KEY = 'packpoint_trip_book_v1';
const ACTIVE_TRIP_ID_STORAGE_KEY = 'packpoint_active_trip_id_v1';
const ONBOARDING_DONE_STORAGE_KEY = 'packpoint_onboarding_done_v1';

// Legacy v7 single-trip keys for seamless zero-loss migration
const LEGACY_STORAGE_KEY = 'packpoint_optimized_v7';
const LEGACY_ROOM_STORAGE_KEY = 'packpoint_active_room_v1';
const LEGACY_SEAT_STORAGE_KEY = 'packpoint_claimed_seat_v1';

const NAV_ITEMS: {
  id: AppTab;
  i18nKey: 'nav.packing' | 'nav.itinerary' | 'nav.budget' | 'nav.memories';
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'packing', i18nKey: 'nav.packing', icon: Luggage },
  { id: 'itinerary', i18nKey: 'nav.itinerary', icon: Route },
  { id: 'budget', i18nKey: 'nav.budget', icon: Wallet },
  { id: 'memories', i18nKey: 'nav.memories', icon: Briefcase },
];

const DEFAULT_COMPANION_TEMPLATES: Omit<CrewMember, 'id'>[] = [
  {
    initials: '我',
    name: '本人',
    role: '行程发起人',
    location: '蓬皮杜艺术中心附近',
    distanceKm: 1.4,
    etaMinutes: 9,
    accent: 'peach',
  },
  {
    initials: 'EM',
    name: 'Emma',
    role: '摄影 & 探店伙伴',
    location: '玛黑区孚日广场',
    distanceKm: 2.1,
    etaMinutes: 13,
    accent: 'lavender',
  },
  {
    initials: 'AL',
    name: 'Alex',
    role: '交通与攻略向导',
    location: '卢浮宫北侧街区',
    distanceKm: 1.8,
    etaMinutes: 11,
    accent: 'teal',
  },
  {
    initials: 'LE',
    name: 'Leo',
    role: '美食与预订担当',
    location: '圣日耳曼街区',
    distanceKm: 2.4,
    etaMinutes: 15,
    accent: 'peach',
  },
];

function computeMemberInitials(name: string, fallback = '伴'): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  if (trimmed === '本人') return '我';
  const isAscii = /^[A-Za-z0-9\s._-]+$/.test(trimmed);
  if (isAscii) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return trimmed.slice(0, 1);
}

function resizeCrewList(prevCrew: CrewMember[], count: number): CrewMember[] {
  const safeCount = Math.max(1, Math.min(4, Math.round(count) || 1));
  const result: CrewMember[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    if (prevCrew[i]) {
      result.push(prevCrew[i]);
    } else {
      const tpl = DEFAULT_COMPANION_TEMPLATES[i] || DEFAULT_COMPANION_TEMPLATES[1];
      result.push({
        ...tpl,
        id: `m${i + 1}`,
      });
    }
  }
  return result;
}

function syncMeetupFromDayNodes(
  dayNodes: TimelineNode[],
  prevMeetup: MeetupPlan
): MeetupPlan {
  const anchor = dayNodes.find((n) => n.isAnchor);
  if (!anchor) return prevMeetup;
  return {
    ...prevMeetup,
    time: anchor.time || prevMeetup.time,
    placeName: anchor.title || prevMeetup.placeName,
    address: anchor.address || prevMeetup.address,
  };
}

function normalizeLoadedTripState(parsed: TripState): TripState {
  const normalizedExpenses = Array.isArray(parsed.expenses)
    ? parsed.expenses.map((e) => {
        if ((e.id === 'e002' || e.id === 'e003') && e.settled === undefined) {
          return { ...e, settled: true };
        }
        if (e.id === 'e103' && e.vatStatus === undefined) {
          return { ...e, vatStatus: 'form_ready' as const };
        }
        return e;
      })
    : DEFAULT_TRIP_STATE.expenses;

  let normalizedTimeline: TimelineNode[] = DEFAULT_TRIP_STATE.timeline;
  if (Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
    const hasMultiDay = parsed.timeline.some(
      (n) => typeof n.day === 'number' && n.day !== 2
    );
    const isDefaultParisAms =
      parsed.setup?.cities?.[0] === '巴黎' &&
      parsed.setup?.cities?.[1] === '阿姆斯特丹';
    if (!hasMultiDay && isDefaultParisAms) {
      const upgradedDay2 = parsed.timeline.map((n) => ({
        ...n,
        day: n.day ?? 2,
        city: n.city || '巴黎',
        visited: n.visited !== undefined ? n.visited : Boolean(n.logged),
      }));
      const otherDefaultDays = DEFAULT_TRIP_STATE.timeline.filter(
        (n) => (n.day ?? 2) !== 2
      );
      normalizedTimeline = [...otherDefaultDays, ...upgradedDay2].sort(
        (a, b) => (a.day ?? 1) - (b.day ?? 1)
      );
    } else {
      normalizedTimeline = parsed.timeline.map((n) => ({
        ...n,
        day: n.day ?? 1,
        visited: n.visited !== undefined ? n.visited : Boolean(n.logged),
      }));
    }
  }

  const normalizedPacking = Array.isArray(parsed.packing)
    ? normalizePackingGroups(parsed.packing)
    : DEFAULT_TRIP_STATE.packing;
  const normalizedBagOverrides = normalizeSmartBagOverrides(
    parsed.smartBagOverrides,
    normalizedPacking
  );

  return {
    ...parsed,
    expenses: normalizedExpenses,
    timeline: normalizedTimeline,
    packing: normalizedPacking,
    smartBagOverrides: normalizedBagOverrides,
    smartBagSummaryTip: parsed.smartBagSummaryTip ?? '',
    packingViewMode:
      parsed.packingViewMode === 'smart_bags' ? 'smart_bags' : 'checklist',
    tasks: parsed.tasks ?? DEFAULT_TRIP_TASKS,
    activeFinanceDay:
      parsed.activeFinanceDay ?? DEFAULT_TRIP_STATE.activeFinanceDay ?? 2,
    settlementHistory:
      parsed.settlementHistory ?? DEFAULT_TRIP_STATE.settlementHistory ?? [],
    rainSwappedDays:
      parsed.rainSwappedDays ??
      (parsed.rainSwapped ? { [parsed.activeFinanceDay ?? 2]: true } : {}),
    spatialSummariesByDay:
      parsed.spatialSummariesByDay ?? DEFAULT_TRIP_STATE.spatialSummariesByDay,
    spatialClusteredByDay:
      parsed.spatialClusteredByDay ?? DEFAULT_TRIP_STATE.spatialClusteredByDay,
    dayStays: parsed.dayStays ?? {},
  };
}

interface OfflineClimateZoneProfile {
  zoneId: string;
  regionLabel: string;
  matcher: RegExp;
  tempLowC: number;
  tempHighC: number;
  rainPct: number;
  sunsetMinutes: number;
  /** Seasonal sensitivity factor (0 = equatorial, 1 = temperate/continental, -0.8 = southern hemisphere) */
  seasonalFactor: number;
  timezoneOffset: string;
  utcOffsetHours: number;
  plugType: string;
  voltage: number;
  currencyCode: string;
  currencySymbol: string;
  fxToUsd: number;
  dailyBudgetUsd: number;
  vatThresholdLocal: number;
  customsZone: 'EU' | 'JP' | 'UK' | 'CH' | 'TH' | 'KR' | 'SG' | 'CN' | 'HK_MO' | 'TW' | 'US_CA' | 'AU_NZ' | 'AE';
  vatExitAirportBuilder: (city: string) => string;
  vatRuleSummary: string;
  transitPassName: string;
  localEmergencyNote: string;
}

const OFFLINE_CLIMATE_ZONES: OfflineClimateZoneProfile[] = [
  {
    zoneId: 'jp_north',
    regionLabel: '北海道/北日本',
    matcher: /(北海道|札幌|小樽|函馆|旭川|富良野|登别|洞爷湖|青森|仙台|sapporo|hokkaido|hakodate|otaru)/i,
    tempLowC: -2,
    tempHighC: 6,
    rainPct: 35,
    sunsetMinutes: 16 * 60 + 45,
    seasonalFactor: 1.15,
    timezoneOffset: 'UTC+9',
    utcOffsetHours: 9,
    plugType: 'A型两脚扁插',
    voltage: 100,
    currencyCode: 'JPY',
    currencySymbol: '¥',
    fxToUsd: 0.0066,
    dailyBudgetUsd: 118,
    vatThresholdLocal: 5500,
    customsZone: 'JP',
    vatExitAirportBuilder: () => '新千岁国际机场 (CTS) 海关退税柜台',
    vatRuleSummary: '同店同日满 5,500 日元免税，消耗品封袋离境前勿拆',
    transitPassName: 'Kitaca / Suica 交通卡',
    localEmergencyNote: '110 警察 / 119 急救消防',
  },
  {
    zoneId: 'jp_okinawa',
    regionLabel: '冲绳海岛',
    matcher: /(冲绳|那霸|石垣|宫古岛|okinawa|naha|ishigaki|miyako)/i,
    tempLowC: 19,
    tempHighC: 25,
    rainPct: 35,
    sunsetMinutes: 17 * 60 + 55,
    seasonalFactor: 0.45,
    timezoneOffset: 'UTC+9',
    utcOffsetHours: 9,
    plugType: 'A型两脚扁插',
    voltage: 100,
    currencyCode: 'JPY',
    currencySymbol: '¥',
    fxToUsd: 0.0066,
    dailyBudgetUsd: 110,
    vatThresholdLocal: 5500,
    customsZone: 'JP',
    vatExitAirportBuilder: () => '那霸国际机场 (OKA) 海关退税柜台',
    vatRuleSummary: '同店同日满 5,500 日元免税，消耗品封袋离境前勿拆',
    transitPassName: 'OKICA / 冲绳单轨电车一日券',
    localEmergencyNote: '110 警察 / 119 急救消防',
  },
  {
    zoneId: 'jp_main',
    regionLabel: '日本本州/九州',
    matcher: /(东京|京都|大阪|神户|奈良|名古屋|横滨|箱根|镰仓|河口湖|富士山|福冈|熊本|鹿儿岛|广岛|金泽|高松|日本|tokyo|kyoto|osaka|nara|kobe|nagoya|fukuoka|hakone|japan)/i,
    tempLowC: 8,
    tempHighC: 16,
    rainPct: 25,
    sunsetMinutes: 17 * 60 + 25,
    seasonalFactor: 0.95,
    timezoneOffset: 'UTC+9',
    utcOffsetHours: 9,
    plugType: 'A型两脚扁插',
    voltage: 100,
    currencyCode: 'JPY',
    currencySymbol: '¥',
    fxToUsd: 0.0066,
    dailyBudgetUsd: 122,
    vatThresholdLocal: 5500,
    customsZone: 'JP',
    vatExitAirportBuilder: (city) =>
      /(大阪|京都|神户|奈良|osaka|kyoto|kobe|nara)/i.test(city)
        ? '关西国际机场 (KIX) 海关退税柜台'
        : /(福冈|熊本|fukuoka)/i.test(city)
        ? '福冈国际机场 (FUK) 海关退税柜台'
        : '东京成田/羽田国际机场退税柜台',
    vatRuleSummary: '同店同日满 5,500 日元免税，消耗品封袋离境前勿拆',
    transitPassName: 'Suica / ICOCA 交通卡',
    localEmergencyNote: '110 警察 / 119 急救消防',
  },
  {
    zoneId: 'kr_all',
    regionLabel: '韩国',
    matcher: /(首尔|釜山|济州|仁川|庆州|大邱|水原|韩国|seoul|busan|jeju|incheon|korea)/i,
    tempLowC: 5,
    tempHighC: 14,
    rainPct: 25,
    sunsetMinutes: 17 * 60 + 30,
    seasonalFactor: 1.05,
    timezoneOffset: 'UTC+9',
    utcOffsetHours: 9,
    plugType: 'C/F型韩标双圆插',
    voltage: 220,
    currencyCode: 'KRW',
    currencySymbol: '₩',
    fxToUsd: 0.00073,
    dailyBudgetUsd: 115,
    vatThresholdLocal: 15000,
    customsZone: 'KR',
    vatExitAirportBuilder: (city) =>
      /(济州|jeju)/i.test(city)
        ? '济州国际机场 (CJU) 退税自助机'
        : /(釜山|busan)/i.test(city)
        ? '釜山金海国际机场 (PUS) 海关退税点'
        : '首尔仁川/金浦国际机场退税自助机',
    vatRuleSummary: '单笔满 15,000 韩元可享即时退税或机场自助机扫码退税',
    transitPassName: 'T-money / WOWPASS 交通卡',
    localEmergencyNote: '112 报警 / 119 急救 / 1330 旅游热线',
  },
  {
    zoneId: 'sg_all',
    regionLabel: '新加坡',
    matcher: /(新加坡|圣淘沙|樟宜|singapore|sentosa)/i,
    tempLowC: 25,
    tempHighC: 31,
    rainPct: 45,
    sunsetMinutes: 18 * 60 + 55,
    seasonalFactor: 0.05,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: 'G型英标三方插',
    voltage: 230,
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    fxToUsd: 0.74,
    dailyBudgetUsd: 155,
    vatThresholdLocal: 100,
    customsZone: 'SG',
    vatExitAirportBuilder: () => '新加坡樟宜机场 (SIN) eTRS 自助退税机',
    vatRuleSummary: '参与 GST 退税商户消费满 100 新元，凭护照在樟宜机场 eTRS 办理',
    transitPassName: 'SimplyGo 感应卡 / EZ-Link',
    localEmergencyNote: '999 警察 / 995 急救消防',
  },
  {
    zoneId: 'th_sea',
    regionLabel: '东南亚热带',
    matcher: /(曼谷|清迈|普吉|苏梅|芭提雅|甲米|华欣|泰国|河内|胡志明|岘港|芽庄|吉隆坡|槟城|兰卡威|巴厘岛|雅加达|bangkok|chiang mai|phuket|samui|thailand|bali|kuala lumpur|hanoi)/i,
    tempLowC: 24,
    tempHighC: 33,
    rainPct: 35,
    sunsetMinutes: 18 * 60 + 15,
    seasonalFactor: 0.15,
    timezoneOffset: 'UTC+7',
    utcOffsetHours: 7,
    plugType: 'A/C型通用两插',
    voltage: 220,
    currencyCode: 'THB',
    currencySymbol: '฿',
    fxToUsd: 0.029,
    dailyBudgetUsd: 125,
    vatThresholdLocal: 2000,
    customsZone: 'TH',
    vatExitAirportBuilder: (city) =>
      /(普吉|phuket)/i.test(city)
        ? '普吉国际机场 (HKT) VAT Refund'
        : /(清迈|chiang mai)/i.test(city)
        ? '清迈国际机场 (CNX) VAT Refund'
        : '曼谷素万纳普机场 (BKK) VAT Refund',
    vatRuleSummary: '悬挂 VAT Refund 标识门店单日满 2,000 泰铢可开具 P.P.10 退税黄单',
    transitPassName: 'Rabbit Card / MRT 感应支付',
    localEmergencyNote: '1155 旅游警察 (中文服务) / 1669 急救',
  },
  {
    zoneId: 'hk_mo',
    regionLabel: '港澳',
    matcher: /(香港|九龙|中环|澳门|氹仔|hong kong|macau|macao)/i,
    tempLowC: 18,
    tempHighC: 24,
    rainPct: 25,
    sunsetMinutes: 18 * 60 + 0,
    seasonalFactor: 0.55,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: 'G型英标三方插',
    voltage: 220,
    currencyCode: 'HKD',
    currencySymbol: 'HK$',
    fxToUsd: 0.128,
    dailyBudgetUsd: 150,
    vatThresholdLocal: 0,
    customsZone: 'HK_MO',
    vatExitAirportBuilder: () => '香港/澳门自由港（全境免征营业消费税）',
    vatRuleSummary: '港澳均为免税自由港，门店标价即免税价，离境无需退税手续',
    transitPassName: '八达通 Octopus / 乘车码',
    localEmergencyNote: '999 港澳紧急求助热线',
  },
  {
    zoneId: 'tw_all',
    regionLabel: '台湾',
    matcher: /(台北|高雄|台中|台南|花莲|垦丁|九份|阿里山|台湾|taipei|kaohsiung|taichung|hualien|taiwan)/i,
    tempLowC: 16,
    tempHighC: 23,
    rainPct: 35,
    sunsetMinutes: 17 * 60 + 35,
    seasonalFactor: 0.6,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: 'A/B型两扁插',
    voltage: 110,
    currencyCode: 'TWD',
    currencySymbol: 'NT$',
    fxToUsd: 0.031,
    dailyBudgetUsd: 115,
    vatThresholdLocal: 2000,
    customsZone: 'TW',
    vatExitAirportBuilder: () => '桃园/松山/高雄国际机场外籍旅客退税柜台',
    vatRuleSummary: '贴有退税标识商店同日满 2,000 新台币可现场小额退税或机场电子退税',
    transitPassName: '悠游卡 EasyCard / 一卡通',
    localEmergencyNote: '110 报警 / 119 消防急救',
  },
  {
    zoneId: 'cn_south',
    regionLabel: '华南/海南暖区',
    matcher: /(三亚|海口|海南|广州|深圳|厦门|珠海|桂林|阳朔|北海|西双版纳|sanya|guangzhou|shenzhen|xiamen)/i,
    tempLowC: 20,
    tempHighC: 28,
    rainPct: 30,
    sunsetMinutes: 18 * 60 + 15,
    seasonalFactor: 0.5,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: '国标两扁/三扁插',
    voltage: 220,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    fxToUsd: 0.14,
    dailyBudgetUsd: 115,
    vatThresholdLocal: 0,
    customsZone: 'CN',
    vatExitAirportBuilder: () => '境内行程（无需离境退税）',
    vatRuleSummary: '境内出行无需办理海关退税，建议保留电子发票备查',
    transitPassName: '支付宝 / 微信乘车码',
    localEmergencyNote: '110 报警 / 120 医疗急救',
  },
  {
    zoneId: 'cn_north_alpine',
    regionLabel: '北方/西北高寒区',
    matcher: /(北京|西安|青岛|大连|哈尔滨|长春|沈阳|长白山|漠河|新疆|乌鲁木齐|阿勒泰|伊犁|喀什|拉萨|西藏|青海|西宁|敦煌|兰州|呼伦贝尔|beijing|xi'an|harbin|lhasa)/i,
    tempLowC: 2,
    tempHighC: 12,
    rainPct: 15,
    sunsetMinutes: 17 * 60 + 25,
    seasonalFactor: 1.2,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: '国标两扁/三扁插',
    voltage: 220,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    fxToUsd: 0.14,
    dailyBudgetUsd: 112,
    vatThresholdLocal: 0,
    customsZone: 'CN',
    vatExitAirportBuilder: () => '境内行程（无需离境退税）',
    vatRuleSummary: '境内出行无需办理海关退税，建议保留电子发票备查',
    transitPassName: '支付宝 / 微信乘车码',
    localEmergencyNote: '110 报警 / 120 医疗急救',
  },
  {
    zoneId: 'cn_central',
    regionLabel: '江南/西南舒适区',
    matcher: /(上海|杭州|苏州|南京|无锡|扬州|黄山|成都|重庆|大理|丽江|香格里拉|昆明|云南|贵阳|长沙|武汉|南昌|福州|中国|shanghai|hangzhou|chengdu|chongqing|kunming)/i,
    tempLowC: 11,
    tempHighC: 20,
    rainPct: 28,
    sunsetMinutes: 17 * 60 + 50,
    seasonalFactor: 0.85,
    timezoneOffset: 'UTC+8',
    utcOffsetHours: 8,
    plugType: '国标两扁/三扁插',
    voltage: 220,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    fxToUsd: 0.14,
    dailyBudgetUsd: 112,
    vatThresholdLocal: 0,
    customsZone: 'CN',
    vatExitAirportBuilder: () => '境内行程（无需离境退税）',
    vatRuleSummary: '境内出行无需办理海关退税，建议保留电子发票备查',
    transitPassName: '支付宝 / 微信乘车码',
    localEmergencyNote: '110 报警 / 120 医疗急救',
  },
  {
    zoneId: 'uk_all',
    regionLabel: '英国',
    matcher: /(伦敦|爱丁堡|曼彻斯特|牛津|剑桥|巴斯|约克|利物浦|苏格兰|高地|英国|london|edinburgh|manchester|oxford|cambridge|scotland|uk)/i,
    tempLowC: 6,
    tempHighC: 13,
    rainPct: 48,
    sunsetMinutes: 17 * 60 + 5,
    seasonalFactor: 0.8,
    timezoneOffset: 'UTC+0',
    utcOffsetHours: 0,
    plugType: 'G型英标三方插',
    voltage: 230,
    currencyCode: 'GBP',
    currencySymbol: '£',
    fxToUsd: 1.27,
    dailyBudgetUsd: 230,
    vatThresholdLocal: 0,
    customsZone: 'UK',
    vatExitAirportBuilder: (city) =>
      /(爱丁堡|苏格兰|edinburgh)/i.test(city)
        ? '爱丁堡国际机场 (EDI) 航站楼'
        : '伦敦希思罗/盖特威克国际机场航站楼',
    vatRuleSummary: '英国常规门店购物已取消游客机场退税（仅门店直邮海外免税）',
    transitPassName: 'Contactless 感应卡 / Oyster',
    localEmergencyNote: '999 / 112 英国急救',
  },
  {
    zoneId: 'ch_alpine',
    regionLabel: '瑞士阿尔卑斯',
    matcher: /(苏黎世|日内瓦|因特拉肯|卢塞恩|琉森|采尔马特|伯尔尼|洛桑|少女峰|瑞士|zurich|geneva|interlaken|lucerne|zermatt|bern|switzerland)/i,
    tempLowC: 2,
    tempHighC: 10,
    rainPct: 32,
    sunsetMinutes: 17 * 60 + 20,
    seasonalFactor: 1.05,
    timezoneOffset: 'UTC+1',
    utcOffsetHours: 1,
    plugType: 'J型瑞士三圆插',
    voltage: 230,
    currencyCode: 'CHF',
    currencySymbol: 'CHF ',
    fxToUsd: 1.13,
    dailyBudgetUsd: 270,
    vatThresholdLocal: 300,
    customsZone: 'CH',
    vatExitAirportBuilder: () => '苏黎世/日内瓦机场或瑞士边境海关盖章处',
    vatRuleSummary: '瑞士非欧盟关税区，单店满 300 瑞郎需在离开瑞士边境时独立海关盖章',
    transitPassName: 'Swiss Travel Pass 瑞士通票',
    localEmergencyNote: '112 通用急救 / 117 报警',
  },
  {
    zoneId: 'eu_nordic',
    regionLabel: '北欧/冰岛寒带',
    matcher: /(冰岛|雷克雅未克|奥斯陆|卑尔根|特罗姆瑟|斯德哥尔摩|哥本哈根|赫尔辛基|罗瓦涅米|挪威|瑞典|芬兰|丹麦|iceland|reykjavik|oslo|stockholm|copenhagen|helsinki|rovaniemi)/i,
    tempLowC: -3,
    tempHighC: 5,
    rainPct: 40,
    sunsetMinutes: 16 * 60 + 15,
    seasonalFactor: 1.2,
    timezoneOffset: 'UTC+1',
    utcOffsetHours: 1,
    plugType: 'C/F型欧标双圆插',
    voltage: 230,
    currencyCode: 'EUR',
    currencySymbol: '€',
    fxToUsd: 1.08,
    dailyBudgetUsd: 245,
    vatThresholdLocal: 40,
    customsZone: 'EU',
    vatExitAirportBuilder: (city) => `${city}国际机场 Global Blue / Planet 退税柜台`,
    vatRuleSummary: '北欧退税门槛较低，离境前在最后一站机场退税柜台核验盖章',
    transitPassName: '城市交通 App / 感应银行卡',
    localEmergencyNote: '112 欧洲通用急救电话',
  },
  {
    zoneId: 'eu_south',
    regionLabel: '南欧地中海',
    matcher: /(罗马|米兰|威尼斯|佛罗伦萨|那不勒斯|阿马尔菲|西西里|意大利|巴塞罗那|马德里|塞维利亚|格拉纳达|西班牙|里斯本|波尔图|葡萄牙|雅典|圣托里尼|米科诺斯|希腊|尼斯|戛纳|马赛|摩纳哥|rome|milan|venice|florence|barcelona|madrid|lisbon|porto|athens|santorini|nice)/i,
    tempLowC: 12,
    tempHighC: 21,
    rainPct: 22,
    sunsetMinutes: 17 * 60 + 55,
    seasonalFactor: 0.85,
    timezoneOffset: 'UTC+1',
    utcOffsetHours: 1,
    plugType: 'C/F/L型欧标插头',
    voltage: 230,
    currencyCode: 'EUR',
    currencySymbol: '€',
    fxToUsd: 1.08,
    dailyBudgetUsd: 198,
    vatThresholdLocal: 70,
    customsZone: 'EU',
    vatExitAirportBuilder: (city) => `${city}国际机场海关退税核验点`,
    vatRuleSummary: '欧盟多国联程统一在离开欧盟的最后一站机场海关盖章退税（西班牙无最低门槛/意大利约 €70 起）',
    transitPassName: '城市地铁通票 / Contactless',
    localEmergencyNote: '112 欧盟通用急救电话',
  },
  {
    zoneId: 'us_ca',
    regionLabel: '北美',
    matcher: /(纽约|洛杉矶|旧金山|西雅图|拉斯维加斯|波士顿|芝加哥|华盛顿|奥兰多|迈阿密|夏威夷|温哥华|多伦多|蒙特利尔|班夫|美国|加拿大|new york|los angeles|san francisco|seattle|las vegas|boston|chicago|hawaii|vancouver|toronto|usa|canada)/i,
    tempLowC: 9,
    tempHighC: 18,
    rainPct: 25,
    sunsetMinutes: 17 * 60 + 30,
    seasonalFactor: 0.95,
    timezoneOffset: 'UTC-5',
    utcOffsetHours: -5,
    plugType: 'A/B型美标两扁一圆插',
    voltage: 120,
    currencyCode: 'USD',
    currencySymbol: '$',
    fxToUsd: 1,
    dailyBudgetUsd: 225,
    vatThresholdLocal: 0,
    customsZone: 'US_CA',
    vatExitAirportBuilder: (city) => `${city}国际机场（北美无常规游客离境退税）`,
    vatRuleSummary: '美国与加拿大门店价格通常不含州消费税，且无常规游客机场离境退税制度',
    transitPassName: 'OMNY / Clipper / 感应信用卡',
    localEmergencyNote: '911 北美紧急报警急救',
  },
  {
    zoneId: 'au_nz',
    regionLabel: '澳新',
    matcher: /(悉尼|墨尔本|布里斯班|黄金海岸|凯恩斯|珀斯|奥克兰|皇后镇|基督城|澳大利亚|澳洲|新西兰|sydney|melbourne|brisbane|auckland|queenstown|australia|new zealand)/i,
    tempLowC: 15,
    tempHighC: 24,
    rainPct: 25,
    sunsetMinutes: 19 * 60 + 30,
    seasonalFactor: -0.8,
    timezoneOffset: 'UTC+10',
    utcOffsetHours: 10,
    plugType: 'I型澳标八字扁插',
    voltage: 230,
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    fxToUsd: 0.66,
    dailyBudgetUsd: 185,
    vatThresholdLocal: 300,
    customsZone: 'AU_NZ',
    vatExitAirportBuilder: (city) => `${city}国际机场 TRS 游客退税柜台`,
    vatRuleSummary: '澳洲同店满 300 澳元（离境前 60 天内）可在国际机场 TRS 柜台或 App 申报退税',
    transitPassName: 'Opal / Myki / Contactless',
    localEmergencyNote: '000 澳洲急救 / 111 新西兰急救',
  },
  {
    zoneId: 'ae_me',
    regionLabel: '中东海湾',
    matcher: /(迪拜|阿布扎比|多哈|阿联酋|卡塔尔|dubai|abu dhabi|doha|uae)/i,
    tempLowC: 22,
    tempHighC: 32,
    rainPct: 8,
    sunsetMinutes: 17 * 60 + 40,
    seasonalFactor: 0.65,
    timezoneOffset: 'UTC+4',
    utcOffsetHours: 4,
    plugType: 'G型英标三方插',
    voltage: 230,
    currencyCode: 'AED',
    currencySymbol: 'AED ',
    fxToUsd: 0.272,
    dailyBudgetUsd: 215,
    vatThresholdLocal: 250,
    customsZone: 'AE',
    vatExitAirportBuilder: () => '迪拜/阿布扎比国际机场 Planet 自助退税机',
    vatRuleSummary: '阿联酋满 250 迪拉姆贴标商户可电子登记护照，离境机场 Planet 自助核验',
    transitPassName: 'Nol Card 迪拜交通卡',
    localEmergencyNote: '999 报警 / 998 救护车',
  },
];

const DEFAULT_EU_WEST_ZONE: OfflineClimateZoneProfile = {
  zoneId: 'eu_west',
  regionLabel: '西欧/中欧',
  matcher: /.*/,
  tempLowC: 7,
  tempHighC: 15,
  rainPct: 32,
  sunsetMinutes: 17 * 60 + 35,
  seasonalFactor: 0.9,
  timezoneOffset: 'UTC+1',
  utcOffsetHours: 1,
  plugType: 'C/E型欧标双圆插',
  voltage: 230,
  currencyCode: 'EUR',
  currencySymbol: '€',
  fxToUsd: 1.08,
  dailyBudgetUsd: 215,
  vatThresholdLocal: 100,
  customsZone: 'EU',
  vatExitAirportBuilder: (city) =>
    /(阿姆斯特丹|amsterdam)/i.test(city)
      ? '阿姆斯特丹史基浦机场 (AMS) 海关退税点'
      : /(巴黎|paris)/i.test(city)
      ? '巴黎戴高乐机场 (CDG) PABLO 自助退税机'
      : /(法兰克福|慕尼黑|柏林|frankfurt|munich|berlin)/i.test(city)
      ? `${city}国际机场海关盖章与 Global Blue 柜台`
      : `${city}国际机场海关退税点`,
  vatRuleSummary: '欧盟多站联程统一在最后一站离境机场海关核验退税单',
  transitPassName: '城市交通日票 / Contactless',
  localEmergencyNote: '112 国际通用急救电话',
};

const MAJOR_HUB_CITY_RE =
  /(东京|巴黎|伦敦|罗马|米兰|巴塞罗那|马德里|阿姆斯特丹|首尔|新加坡|曼谷|纽约|洛杉矶|旧金山|悉尼|墨尔本|迪拜|北京|上海|广州|成都|香港|台北|苏黎世|维也纳|慕尼黑|tokyo|paris|london|rome|barcelona|amsterdam|seoul|singapore|bangkok|new york|sydney|dubai|shanghai|beijing)/i;

const SATELLITE_DAYTRIP_RE =
  /(奈良|宇治|镰仓|箱根|河口湖|日光|小樽|富良野|温莎|牛津|剑桥|凡尔赛|吉维尼|赞丹|羊角村|因特拉肯|卢塞恩|琉森|采尔马特|比萨|五渔村|锡耶纳|托莱多|辛特拉|九份|都江堰|乐山|阳朔|nara|kamakura|hakone|otaru|oxford|cambridge|interlaken|lucerne|zermatt)/i;

interface ParsedWeightedStop {
  rawToken: string;
  cleanCity: string;
  explicitDays: number | null;
  weight: number;
  zone: OfflineClimateZoneProfile;
  lowC: number;
  highC: number;
  rainPct: number;
}

function parseExplicitDaysFromCityToken(raw: string): {
  cleanCity: string;
  explicitDays: number | null;
} {
  let text = raw.trim();
  let explicitDays: number | null = null;

  // Match patterns like "巴黎 (4天)", "东京 3晚", "Zurich 2d", "Rome · 3 days", "京都3日"
  const dayMatch =
    text.match(/[（(]?\s*(\d+(?:\.\d+)?)\s*(?:天|日|晚|nights?|days?|d)\s*[)）]?/i) ||
    text.match(/[:：·-]\s*(\d+(?:\.\d+)?)\s*(?:天|日|晚|d)?$/i);
  if (dayMatch) {
    const parsed = parseFloat(dayMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 60) {
      explicitDays = parsed;
      text = text.replace(dayMatch[0], '').trim();
    }
  }

  const cleanCity = text.replace(/^[·•\-,\s]+|[·•\-,\s]+$/g, '').trim();
  return {
    cleanCity: cleanCity || raw.trim(),
    explicitDays,
  };
}

function getCityMicroClimateAdjustment(cleanCity: string): {
  deltaLow: number;
  deltaHigh: number;
  deltaRain: number;
} {
  if (/(爱丁堡|苏格兰|高地|edinburgh|scotland)/i.test(cleanCity)) {
    return { deltaLow: -2, deltaHigh: -2, deltaRain: 6 };
  }
  if (/(采尔马特|少女峰|因特拉肯|长白山|香格里拉|拉萨|zermatt|interlaken)/i.test(cleanCity)) {
    return { deltaLow: -3, deltaHigh: -3, deltaRain: 4 };
  }
  if (/(清迈|chiang mai)/i.test(cleanCity)) {
    return { deltaLow: -4, deltaHigh: -2, deltaRain: -5 };
  }
  if (/(洛杉矶|圣迭戈|迈阿密|奥兰多|夏威夷|los angeles|miami|hawaii)/i.test(cleanCity)) {
    return { deltaLow: 8, deltaHigh: 8, deltaRain: -8 };
  }
  if (/(西雅图|温哥华|阿姆斯特丹|卑尔根|seattle|vancouver|amsterdam)/i.test(cleanCity)) {
    return { deltaLow: -1, deltaHigh: -1, deltaRain: 8 };
  }
  return { deltaLow: 0, deltaHigh: 0, deltaRain: 0 };
}

function computeSeasonalTempOffsetC(
  departureDate: string | undefined,
  seasonalFactor: number
): number {
  if (!departureDate || !/^\d{4}-\d{2}/.test(departureDate)) return 0;
  const month = Number(departureDate.slice(5, 7));
  if (!Number.isFinite(month) || month < 1 || month > 12) return 0;
  // Baseline zone temperatures represent shoulder autumn/spring (Oct/Nov/Apr ~ 0 offset)
  const northernMonthlyDelta: Record<number, number> = {
    1: -6,
    2: -5,
    3: -1,
    4: 2,
    5: 6,
    6: 10,
    7: 13,
    8: 12,
    9: 7,
    10: 2,
    11: 0,
    12: -4,
  };
  return Math.round((northernMonthlyDelta[month] ?? 0) * seasonalFactor);
}

function roundCleanBudgetAmount(rawAmount: number, currencyCode: string): number {
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 200;
  if (currencyCode === 'KRW') return Math.max(50000, Math.round(rawAmount / 5000) * 5000);
  if (currencyCode === 'JPY') return Math.max(5000, Math.round(rawAmount / 500) * 500);
  if (currencyCode === 'THB' || currencyCode === 'TWD') {
    return Math.max(1000, Math.round(rawAmount / 100) * 100);
  }
  if (currencyCode === 'CNY' || currencyCode === 'HKD' || currencyCode === 'AED') {
    return Math.max(200, Math.round(rawAmount / 20) * 20);
  }
  return Math.max(60, Math.round(rawAmount / 5) * 5);
}

function formatMinutesAsTime(totalMins: number): string {
  const clamped = Math.max(14 * 60, Math.min(22 * 60, Math.round(totalMins)));
  const hh = Math.floor(clamped / 60);
  const mm = Math.round((clamped % 60) / 5) * 5;
  const finalH = mm === 60 ? hh + 1 : hh;
  const finalM = mm === 60 ? 0 : mm;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

function inferOfflineDestinationProfile(
  cities: string[],
  options?: { totalDays?: number; departureDate?: string; cityDays?: number[] }
): {
  intel: TripIntelligence;
  dailyBudgetLocal: number;
} {
  // 1. Tokenize complex cities array (handling nested arrows/slashes, duplicate return hubs & explicit day hints)
  const rawTokens = cities
    .flatMap((entry) => String(entry || '').split(/\s*(?:→|->|—>|／|\/|,|，|、)\s*/))
    .map((s) => s.trim())
    .filter(Boolean);

  const effectiveTokens = rawTokens.length > 0 ? rawTokens : ['目的地'];
  const parsedDrafts = effectiveTokens.map((rawToken) => {
    const { cleanCity, explicitDays } = parseExplicitDaysFromCityToken(rawToken);
    const matchedZone =
      OFFLINE_CLIMATE_ZONES.find((z) => z.matcher.test(cleanCity)) || DEFAULT_EU_WEST_ZONE;
    const micro = getCityMicroClimateAdjustment(cleanCity);
    const seasonalDelta = computeSeasonalTempOffsetC(
      options?.departureDate,
      matchedZone.seasonalFactor
    );
    const lowC = matchedZone.tempLowC + micro.deltaLow + seasonalDelta;
    const highC = Math.max(
      lowC + 3,
      matchedZone.tempHighC + micro.deltaHigh + seasonalDelta
    );
    const rainPct = Math.max(5, Math.min(85, matchedZone.rainPct + micro.deltaRain));

    return {
      rawToken,
      cleanCity,
      explicitDays,
      zone: matchedZone,
      lowC,
      highC,
      rainPct,
    };
  });

  // 2. Compute accurate per-stop stay weights (combining explicit day hints, day-grid allocation & hub/satellite heuristics)
  const nStops = parsedDrafts.length;
  const totalDaysHint =
    options?.totalDays && options.totalDays > 0 ? Math.round(options.totalDays) : 0;
  const hasAnyExplicitDays = parsedDrafts.some((d) => d.explicitDays !== null);

  let rawWeights: number[];
  if (Array.isArray(options?.cityDays) && options.cityDays.length === nStops) {
    rawWeights = options.cityDays.map((v) => Math.max(1, Math.round(Number(v) || 1)));
  } else if (hasAnyExplicitDays) {
    const knownSum = parsedDrafts.reduce((s, d) => s + (d.explicitDays ?? 0), 0);
    const unknownCount = parsedDrafts.filter((d) => d.explicitDays === null).length;
    const fallbackPerUnknown =
      unknownCount > 0
        ? totalDaysHint > knownSum
          ? (totalDaysHint - knownSum) / unknownCount
          : Math.max(1, knownSum / Math.max(1, nStops - unknownCount) * 0.75)
        : 1;
    rawWeights = parsedDrafts.map((d) => d.explicitDays ?? fallbackPerUnknown);
  } else {
    // Combine day-slot allocation (matching buildOfflineInitialTripState) with hub vs satellite day-trip heuristics
    const slotCounts = new Array<number>(nStops).fill(0);
    if (totalDaysHint >= nStops) {
      for (let day = 1; day <= totalDaysHint; day += 1) {
        const idx = Math.min(
          nStops - 1,
          Math.floor(((day - 1) * nStops) / totalDaysHint)
        );
        slotCounts[idx] += 1;
      }
    } else {
      slotCounts.fill(1);
    }

    rawWeights = parsedDrafts.map((d, idx) => {
      let heuristicFactor = 1.0;
      if (MAJOR_HUB_CITY_RE.test(d.cleanCity)) {
        heuristicFactor *= 1.18;
      } else if (SATELLITE_DAYTRIP_RE.test(d.cleanCity)) {
        heuristicFactor *= 0.68;
      }
      // First arrival hub typically absorbs arrival & acclimatization day on multi-stop routes
      if (idx === 0 && nStops >= 3) {
        heuristicFactor *= 1.08;
      }
      return slotCounts[idx] * heuristicFactor;
    });
  }

  const totalRawWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;
  const weightedStops: ParsedWeightedStop[] = parsedDrafts.map((d, idx) => ({
    ...d,
    weight: rawWeights[idx] / totalRawWeight,
  }));

  // Deduplicated clean route title preserving travel order (collapsing consecutive identical cities)
  const orderedDisplayCities: string[] = [];
  weightedStops.forEach((s) => {
    if (orderedDisplayCities[orderedDisplayCities.length - 1] !== s.cleanCity) {
      orderedDisplayCities.push(s.cleanCity);
    }
  });
  const routeTitle = orderedDisplayCities.join(' → ');
  const exitStop = weightedStops[weightedStops.length - 1];

  // 3. Smart Multi-Destination Mixed Weather Averaging & Thermal Envelope Synthesis
  const weightedLowC = weightedStops.reduce((s, st) => s + st.weight * st.lowC, 0);
  const weightedHighC = weightedStops.reduce((s, st) => s + st.weight * st.highC, 0);
  const weightedRainRaw = weightedStops.reduce((s, st) => s + st.weight * st.rainPct, 0);
  const weightedSunsetMins = weightedStops.reduce(
    (s, st) => s + st.weight * st.zone.sunsetMinutes,
    0
  );

  let coldestStop = weightedStops[0];
  let warmestStop = weightedStops[0];
  let wettestStop = weightedStops[0];
  let driestStop = weightedStops[0];
  let minLowC = weightedStops[0].lowC;
  let maxHighC = weightedStops[0].highC;

  for (const st of weightedStops) {
    const stMean = (st.lowC + st.highC) / 2;
    const coldMean = (coldestStop.lowC + coldestStop.highC) / 2;
    const warmMean = (warmestStop.lowC + warmestStop.highC) / 2;
    if (stMean < coldMean) coldestStop = st;
    if (stMean > warmMean) warmestStop = st;
    if (st.rainPct > wettestStop.rainPct) wettestStop = st;
    if (st.rainPct < driestStop.rainPct) driestStop = st;
    if (st.lowC < minLowC) minLowC = st.lowC;
    if (st.highC > maxHighC) maxHighC = st.highC;
  }

  const crossCityMeanSpread =
    (warmestStop.lowC + warmestStop.highC) / 2 -
    (coldestStop.lowC + coldestStop.highC) / 2;
  const crossCityRainSpread = wettestStop.rainPct - driestStop.rainPct;

  // Blend weighted average with real route extremes when crossing distinct climate zones so packing covers both ends
  const displayLowC =
    crossCityMeanSpread >= 6
      ? Math.round(weightedLowC * 0.6 + minLowC * 0.4)
      : Math.round(weightedLowC);
  const displayHighC =
    crossCityMeanSpread >= 6
      ? Math.round(weightedHighC * 0.6 + maxHighC * 0.4)
      : Math.max(displayLowC + 2, Math.round(weightedHighC));
  const displayRainPct = Math.max(5, Math.min(85, Math.round(weightedRainRaw / 5) * 5));
  const weightedMeanTempC = Math.round((weightedLowC + weightedHighC) / 2);

  let weatherSummary: string;
  if (orderedDisplayCities.length >= 2 && crossCityMeanSpread >= 10) {
    weatherSummary = `跨温区混合气候（${coldestStop.cleanCity}偏冷至${warmestStop.cleanCity}温暖，加权均温 ${weightedMeanTempC}°C），建议洋葱式叠穿兼顾冷暖`;
  } else if (orderedDisplayCities.length >= 2 && crossCityMeanSpread >= 5) {
    weatherSummary = `多地温差过渡明显（${coldestStop.cleanCity} → ${warmestStop.cleanCity}，加权均温 ${Math.round(weightedLowC)}-${Math.round(weightedHighC)}°C），建议备可脱卸防风保暖层`;
  } else if (weightedMeanTempC >= 25) {
    weatherSummary = '热带/暖热气候为主，日间炎热且室内冷气较强，建议透气夏装搭配薄防晒衬衫';
  } else if (weightedMeanTempC <= 4) {
    weatherSummary = '低温寒冷气候为主，户外风寒明显，建议保暖打底搭配防风羽绒外套';
  } else if (weightedMeanTempC >= 16) {
    weatherSummary = '气候温和舒适，早晚微凉，适合轻装步行探索并备一件薄外套';
  } else {
    weatherSummary = '温和微凉，早晚温差明显，建议叠穿轻便防风外套';
  }

  if (orderedDisplayCities.length >= 2 && crossCityRainSpread >= 18 && wettestStop.rainPct >= 38) {
    weatherSummary += `；${wettestStop.cleanCity}段降雨概率偏高，随身备晴雨伞`;
  } else if (displayRainPct >= 40) {
    weatherSummary += '；阵雨概率较高，建议随身携带防水外壳或折叠伞';
  }

  const rainLabelSuffix =
    displayLowC <= 0 ? '雨雪概率' : displayRainPct >= 35 ? '阵雨' : '降雨';

  // 4. Dominant Currency & Weighted Daily Budget Calculation
  const weightByCurrency = new Map<
    string,
    { weight: number; primaryZone: OfflineClimateZoneProfile }
  >();
  for (const st of weightedStops) {
    const code = st.zone.currencyCode;
    const prev = weightByCurrency.get(code);
    if (prev) {
      prev.weight += st.weight;
    } else {
      weightByCurrency.set(code, { weight: st.weight, primaryZone: st.zone });
    }
  }

  let dominantCurrencyEntry = {
    code: weightedStops[0].zone.currencyCode,
    weight: 0,
    primaryZone: weightedStops[0].zone,
  };
  weightByCurrency.forEach((val, code) => {
    if (val.weight > dominantCurrencyEntry.weight) {
      dominantCurrencyEntry = {
        code,
        weight: val.weight,
        primaryZone: val.primaryZone,
      };
    }
  });

  const primaryZone = dominantCurrencyEntry.primaryZone;
  const weightedDailyUsd = weightedStops.reduce(
    (s, st) => s + st.weight * st.zone.dailyBudgetUsd,
    0
  );
  const rawDailyLocal = weightedDailyUsd / (primaryZone.fxToUsd || 1);
  const dailyBudgetLocal = roundCleanBudgetAmount(rawDailyLocal, primaryZone.currencyCode);

  // 5. Multi-Region Plugs, Voltages, Timezones & Transit Synthesis
  const plugWeights = new Map<string, number>();
  const uniqueVoltages = new Set<number>();
  const uniqueUtcOffsets = new Set<number>();
  const transitNames = new Set<string>();

  for (const st of weightedStops) {
    plugWeights.set(st.zone.plugType, (plugWeights.get(st.zone.plugType) || 0) + st.weight);
    uniqueVoltages.add(st.zone.voltage);
    uniqueUtcOffsets.add(st.zone.utcOffsetHours);
    transitNames.add(st.zone.transitPassName);
  }

  const sortedPlugs = Array.from(plugWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
  const plugType =
    sortedPlugs.length === 1
      ? sortedPlugs[0]
      : sortedPlugs.length === 2
      ? `${sortedPlugs[0]} + ${sortedPlugs[1]}`
      : `${sortedPlugs[0]} 等多国转换插头`;

  const sortedVoltages = Array.from(uniqueVoltages).sort((a, b) => a - b);
  const voltage =
    sortedVoltages.length === 1
      ? `${sortedVoltages[0]}V`
      : `${sortedVoltages.map((v) => `${v}V`).join(' / ')}（宽幅充电器直插）`;

  const formatUtcOffset = (offset: number) =>
    `UTC${offset >= 0 ? `+${offset}` : String(offset)}`;
  const sortedOffsets = Array.from(uniqueUtcOffsets).sort((a, b) => a - b);
  const timezoneOffset =
    sortedOffsets.length === 1
      ? formatUtcOffset(sortedOffsets[0])
      : `${formatUtcOffset(sortedOffsets[0])} ~ ${formatUtcOffset(sortedOffsets[sortedOffsets.length - 1])}`;

  const transitList = Array.from(transitNames);
  const transitPassName =
    transitList.length === 1
      ? transitList[0]
      : `${primaryZone.transitPassName}（跨区联程）`;

  // 6. Customs & Last-Stop Exit VAT Rule (with Mid-Route Non-EU / Multi-Currency Border Hints)
  const customsZonesVisited = new Set(weightedStops.map((s) => s.zone.customsZone));
  const vatExitAirport = exitStop.zone.vatExitAirportBuilder(exitStop.cleanCity);

  let vatRuleSummary = exitStop.zone.vatRuleSummary;
  if (customsZonesVisited.has('CH') && exitStop.zone.customsZone === 'EU') {
    vatRuleSummary = `瑞士段单店满 300 瑞郎需在离开瑞欧边境时单独盖章；欧盟段消费统一在末站 ${exitStop.cleanCity} 离境机场海关退税`;
  } else if (customsZonesVisited.has('UK') && exitStop.zone.customsZone === 'EU') {
    vatRuleSummary = `英国段门店无游客机场退税；欧盟段购物统一在末站 ${exitStop.cleanCity} 离境机场办理退税`;
  } else if (weightByCurrency.size >= 2) {
    const otherCurrencies = Array.from(weightByCurrency.keys()).filter(
      (c) => c !== primaryZone.currencyCode
    );
    vatRuleSummary = `${exitStop.zone.vatRuleSummary}（途经含 ${otherCurrencies.join('/')} 币种赛段，主账本按停留权重以 ${primaryZone.currencyCode} 计价）`;
  }

  // Use primary currency's VAT threshold when exit zone shares currency, or convert exit threshold into primary currency
  const vatThresholdLocal =
    exitStop.zone.vatThresholdLocal <= 0
      ? primaryZone.vatThresholdLocal > 0 && customsZonesVisited.size > 1
        ? primaryZone.vatThresholdLocal
        : 0
      : exitStop.zone.currencyCode === primaryZone.currencyCode
      ? exitStop.zone.vatThresholdLocal
      : Math.round(
          (exitStop.zone.vatThresholdLocal * exitStop.zone.fxToUsd) /
            (primaryZone.fxToUsd || 1)
        );

  return {
    dailyBudgetLocal,
    intel: {
      routeTitle,
      weatherSummary,
      tempRange: `${displayLowC}-${displayHighC}°C`,
      rainChance: `${displayRainPct}% ${rainLabelSuffix}`,
      sunsetTime: formatMinutesAsTime(weightedSunsetMins),
      timezoneOffset,
      plugType,
      voltage,
      currencyCode: primaryZone.currencyCode,
      currencySymbol: primaryZone.currencySymbol,
      fxToUsd: primaryZone.fxToUsd,
      vatThresholdLocal,
      vatExitAirport,
      vatRuleSummary,
      transitPassName,
      localEmergencyNote: primaryZone.localEmergencyNote,
    },
  };
}

function buildOfflineInitialTripState(
  draftSetup: TripSetup,
  draftCrew: CrewMember[],
  customPacking?: PackingGroup[]
): TripState {
  const safeCities = draftSetup.cities.length > 0 ? draftSetup.cities : ['目的地'];
  const normalizedCrew = resizeCrewList(draftCrew, draftSetup.travelers);
  const defaultOwnerId = normalizedCrew[0]?.id || 'm1';
  const { intel, dailyBudgetLocal } = inferOfflineDestinationProfile(safeCities, {
    totalDays: draftSetup.days,
    departureDate: draftSetup.departureDate,
    cityDays: draftSetup.cityDays,
  });
  const defaultPlan = computeClothingNormalizationPlan(
    DEFAULT_TRIP_STATE.packing,
    DEFAULT_TRIP_STATE.setup.days,
    draftSetup
  );
  const capsuleDays = defaultPlan.effectiveCycleDays;
  const hasCustomPacking = Boolean(customPacking && customPacking.length > 0);
  const deepGeneratedGroups = hasCustomPacking
    ? null
    : buildOfflineDeepPackingGroups({
        setup: draftSetup,
        intel,
        ownerId: defaultOwnerId,
      });
  const sourceGroups = hasCustomPacking
    ? customPacking!
    : deepGeneratedGroups && deepGeneratedGroups.length > 0
    ? deepGeneratedGroups
    : defaultPlan.updatedGroups;
  const now = Date.now();

  const packing: PackingGroup[] = sourceGroups.map((grp, gIdx) => ({
    ...grp,
    cubeLabel: hasCustomPacking
      ? grp.cubeLabel
      : grp.id === 'clothing' || grp.id === 'g_clothes'
      ? draftSetup.laundry
        ? `胶囊衣橱 · ${capsuleDays}天循环`
        : `核心衣物 · ${capsuleDays}天份`
      : grp.cubeLabel,
    items: grp.items.map((it, idx) =>
      normalizePackingItemQuantity(
        {
          ...it,
          id: `pk_${now}_${gIdx}_${idx}`,
          name: parseNameAndQuantity(it.name).cleanName,
          quantity: getItemQuantity(it),
          done: false,
          packedByMemberId: undefined,
          ownerId: it.ownership === 'shared' ? undefined : defaultOwnerId,
          createdAt: now + gIdx * 20 + idx,
        },
        grp.id
      )
    ),
  }));

  const totalPlannedDays = Math.max(1, draftSetup.days || 5);
  const cityDaysAllocation = resolveCityDaysAllocation(
    safeCities,
    totalPlannedDays,
    draftSetup.cityDays
  );
  const resolveOfflineCityIdx = (targetDay: number): number => {
    let acc = 0;
    for (let i = 0; i < cityDaysAllocation.length; i += 1) {
      acc += cityDaysAllocation[i];
      if (targetDay <= acc) return i;
    }
    return safeCities.length - 1;
  };
  const timeline: TimelineNode[] = [];
  let prevCity = safeCities[0];
  for (let d = 1; d <= totalPlannedDays; d += 1) {
    const cityIdx = resolveOfflineCityIdx(d);
    const currentCity = safeCities[cityIdx] || safeCities[0];
    const isTransition = d > 1 && currentCity !== prevCity;
    const dayCity = isTransition ? `${prevCity} → ${currentCity}` : currentCity;

    if (d === 1) {
      timeline.push(
        {
          id: `tl_init_${now}_d${d}_1`,
          day: d,
          city: dayCity,
          stopType: 'transit',
          time: '11:30',
          closeTime: '23:30',
          title: `抵达${currentCity} · 机场快线前往市区`,
          district: `${currentCity}枢纽站`,
          address: `${currentCity}市中心`,
          estLocal: Math.round(dailyBudgetLocal * 0.15),
          rating: 4.6,
          visited: false,
          logged: false,
          isOutdoor: false,
          transitNote: '机场快线或专车直达市区核心区域',
        },
        {
          id: `tl_init_${now}_d${d}_2`,
          day: d,
          city: dayCity,
          stopType: 'hotel',
          time: '14:00',
          closeTime: '23:59',
          title: `入住${currentCity}核心区酒店 & 周边街区漫步`,
          district: `${currentCity}中心区`,
          address: `${currentCity}市中心`,
          estLocal: 0,
          rating: 4.8,
          visited: false,
          logged: false,
          isAnchor: true,
          isOutdoor: false,
          transitNote: '办理入住寄存行李后步行熟悉周边美食与地铁站',
        }
      );
    } else if (isTransition) {
      timeline.push(
        {
          id: `tl_init_${now}_d${d}_1`,
          day: d,
          city: dayCity,
          stopType: 'transit',
          time: '09:30',
          closeTime: '22:00',
          title: `${prevCity} → ${currentCity} 城际高铁/快线`,
          district: `${prevCity} → ${currentCity}`,
          address: `${currentCity}中央车站`,
          estLocal: 0,
          rating: 4.7,
          visited: false,
          logged: false,
          isOutdoor: false,
          transitNote: '提前 30 分钟抵达车站，大件行李放置车厢行李区',
        },
        {
          id: `tl_init_${now}_d${d}_2`,
          day: d,
          city: dayCity,
          stopType: 'hotel',
          time: '14:00',
          closeTime: '23:59',
          title: `入住${currentCity}新站酒店 & 晚间地标漫步`,
          district: `${currentCity}核心区`,
          address: `${currentCity}市中心`,
          estLocal: 0,
          rating: 4.8,
          visited: false,
          logged: false,
          isAnchor: true,
          isOutdoor: false,
          transitNote: '出站换乘地铁/电车直达酒店后轻装夜游',
        }
      );
    } else if (d === totalPlannedDays) {
      timeline.push({
        id: `tl_init_${now}_d${d}_1`,
        day: d,
        city: dayCity,
        stopType: 'transit',
        time: '10:30',
        closeTime: '23:59',
        title: `${currentCity}伴手礼采买 & 前往离境机场退税返程`,
        district: `${currentCity}市中心 → 机场`,
        address: `${currentCity}国际机场`,
        estLocal: Math.round(dailyBudgetLocal * 0.2),
        rating: 4.6,
        visited: false,
        logged: false,
        isAnchor: true,
        isOutdoor: false,
        transitNote: '预留充足时间办理海关退税核验与值机托运',
      });
    } else {
      timeline.push({
        id: `tl_init_${now}_d${d}_1`,
        day: d,
        city: dayCity,
        stopType: 'attraction',
        time: '10:00',
        closeTime: '19:00',
        title: `${currentCity} Day ${d} 经典街区与地标探索`,
        district: `${currentCity}核心区`,
        address: `${currentCity}市中心`,
        estLocal: Math.round(dailyBudgetLocal * 0.35),
        rating: 4.7,
        visited: false,
        logged: false,
        isAnchor: true,
        isOutdoor: false,
        transitNote: '可用上方「AI 全程智能规划」按预算自动填充景点、餐厅与交通',
      });
    }
    prevCity = currentCity;
  }

  const tasks: TripTask[] = [
    {
      id: `tk_${now}_1`,
      title: `确认 ${safeCities.join(' → ')} 往返交通与酒店入住凭证`,
      category: '交通接送',
      timing: '出发前 7 天',
      ownerId: defaultOwnerId,
      done: false,
    },
    {
      id: `tk_${now}_2`,
      title: `准备目的地流量卡 / 漫游包与 ${intel.plugType}`,
      category: '通讯金融',
      timing: '出发前 3 天',
      ownerId: defaultOwnerId,
      done: false,
    },
    {
      id: `tk_${now}_3`,
      title: `预约热门场馆门票与首晚餐厅`,
      category: '门票预约',
      timing: '出发前 3 天',
      ownerId: defaultOwnerId,
      done: false,
    },
  ];

  const firstCity = safeCities[0];
  const estimatedTripUsd = Math.max(
    300,
    Math.round(dailyBudgetLocal * intel.fxToUsd * draftSetup.days * 1.4)
  );

  return {
    setup: {
      ...draftSetup,
      cities: safeCities,
      cityDays: cityDaysAllocation,
      travelers: normalizedCrew.length,
    },
    intel,
    packing,
    tasks,
    reminder: DEFAULT_PACKING_REMINDER,
    learnedCategoryMap: {},
    smartBagOverrides: {},
    smartBagSummaryTip: '',
    packingViewMode: 'checklist',
    budget: {
      tripTotalUsd: estimatedTripUsd,
      prepaidUsd: 0,
      dailyBudgetLocal,
      rolloverLocal: 0,
      shoppingReserveLocal: dailyBudgetLocal * 2,
      cashLocal: dailyBudgetLocal * 2,
      cardUsd: 0,
      transitPassLocal: Math.round(dailyBudgetLocal * 0.4),
      partnerOwedLocal: 0,
      vatRefundRate: intel.vatThresholdLocal > 0 ? 0.12 : 0,
    },
    activeFinanceDay: 1,
    expenses: [],
    settlementHistory: [],
    timeline,
    wishlist: [],
    crew: normalizedCrew,
    meetup: {
      time: '19:00',
      placeName: `${firstCity}晚餐汇合点`,
      address: `${firstCity}市中心`,
      note: '如遇降雨可提前切换至室内餐厅或商场汇合',
    },
    rainSwapped: false,
    rainSwappedDays: {},
    spatialClustered: false,
    spatialSummary: '',
    spatialSummariesByDay: {},
    spatialClusteredByDay: {},
  };
}

interface InitialPortfolioBootstrap {
  entries: SavedTripEntry[];
  activeId: string;
  initialWizardMode: WizardMode | null;
}

function loadInitialPortfolio(): InitialPortfolioBootstrap {
  const hasUrlJoinParam =
    typeof window !== 'undefined' &&
    Boolean(
      new URLSearchParams(window.location.search).get('room') ||
        new URLSearchParams(window.location.search).get('join')
    );

  try {
    const rawBook = localStorage.getItem(TRIP_BOOK_STORAGE_KEY);
    if (rawBook) {
      const parsedBook = JSON.parse(rawBook) as SavedTripEntry[];
      if (Array.isArray(parsedBook) && parsedBook.length > 0) {
        const normalizedEntries: SavedTripEntry[] = parsedBook
          .filter((item) => item && typeof item === 'object' && item.state)
          .map((item, idx) => ({
            id: String(item.id || `trip_${Date.now()}_${idx}`),
            createdAt: Number(item.createdAt) || Date.now(),
            updatedAt: Number(item.updatedAt) || Date.now(),
            cloudRoomId:
              item.cloudRoomId && isValidRoomCode(item.cloudRoomId)
                ? item.cloudRoomId
                : null,
            claimedSeatId:
              item.claimedSeatId && isValidSeatId(item.claimedSeatId)
                ? item.claimedSeatId
                : 'm1',
            state: normalizeLoadedTripState(item.state),
          }));

        if (normalizedEntries.length > 0) {
          const savedActive = localStorage.getItem(ACTIVE_TRIP_ID_STORAGE_KEY);
          const activeId = normalizedEntries.some((e) => e.id === savedActive)
            ? (savedActive as string)
            : normalizedEntries[0].id;
          const onboardingDone =
            localStorage.getItem(ONBOARDING_DONE_STORAGE_KEY) === '1' ||
            hasUrlJoinParam;
          return {
            entries: normalizedEntries,
            activeId,
            initialWizardMode: onboardingDone ? null : 'onboarding',
          };
        }
      }
    }

    // Migrate from v7 single-trip storage if present
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySaved) {
      const parsedLegacy = JSON.parse(legacySaved) as TripState;
      const legacyRoom = localStorage.getItem(LEGACY_ROOM_STORAGE_KEY);
      const legacySeat = localStorage.getItem(LEGACY_SEAT_STORAGE_KEY);
      const migratedEntry: SavedTripEntry = {
        id: 'trip_migrated_v1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cloudRoomId: legacyRoom && isValidRoomCode(legacyRoom) ? legacyRoom : null,
        claimedSeatId:
          legacySeat && isValidSeatId(legacySeat) ? (legacySeat as SeatId) : 'm1',
        state: normalizeLoadedTripState(parsedLegacy),
      };
      localStorage.setItem(ONBOARDING_DONE_STORAGE_KEY, '1');
      return {
        entries: [migratedEntry],
        activeId: migratedEntry.id,
        initialWizardMode: null,
      };
    }
  } catch {
    // Ignore invalid local storage
  }

  const starterEntry: SavedTripEntry = {
    id: 'trip_starter_demo',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cloudRoomId: null,
    claimedSeatId: 'm1',
    state: DEFAULT_TRIP_STATE,
  };

  return {
    entries: [starterEntry],
    activeId: starterEntry.id,
    initialWizardMode: hasUrlJoinParam ? null : 'onboarding',
  };
}

export default function App() {
  const [initialBootstrap] = useState<InitialPortfolioBootstrap>(() => loadInitialPortfolio());
  const [tripBook, setTripBook] = useState<SavedTripEntry[]>(initialBootstrap.entries);
  const [activeTripId, setActiveTripId] = useState<string>(initialBootstrap.activeId);
  const [wizardOverlayMode, setWizardOverlayMode] = useState<WizardMode | null>(
    initialBootstrap.initialWizardMode
  );
  const [tripMenuSource, setTripMenuSource] = useState<
    'hero' | 'mobile_sticky' | 'desktop_sticky' | null
  >(null);
  const tripMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const mobileStickyMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const desktopStickyMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [customCoverDataUrl, setCustomCoverDataUrl] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [coverPullPx, setCoverPullPx] = useState(0);
  const touchPullStartRef = useRef<{ startY: number; startX: number; active: boolean } | null>(
    null
  );

  const activeEntry =
    tripBook.find((entry) => entry.id === activeTripId) || tripBook[0];
  const trip = activeEntry.state;
  const activeRoomId = activeEntry.cloudRoomId ?? null;
  const claimedSeatId: SeatId = activeEntry.claimedSeatId ?? 'm1';

  const activeTripIdRef = useRef<string>(activeEntry.id);
  activeTripIdRef.current = activeEntry.id;

  const markOnboardingDone = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_DONE_STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setTrip: React.Dispatch<React.SetStateAction<TripState>> = useCallback(
    (updater) => {
      const targetId = activeTripIdRef.current;
      setTripBook((prev) =>
        prev.map((entry) => {
          if (entry.id !== targetId) return entry;
          const nextState =
            typeof updater === 'function'
              ? (updater as (prevState: TripState) => TripState)(entry.state)
              : updater;
          if (nextState === entry.state) return entry;
          return {
            ...entry,
            updatedAt: Date.now(),
            state: nextState,
          };
        })
      );
    },
    []
  );

  const setClaimedSeatId = useCallback((nextSeat: SeatId) => {
    const targetId = activeTripIdRef.current;
    setTripBook((prev) =>
      prev.map((entry) =>
        entry.id === targetId
          ? { ...entry, claimedSeatId: nextSeat, updatedAt: Date.now() }
          : entry
      )
    );
  }, []);

  const [tab, setTab] = useState<AppTab>('packing');
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState('');
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadAppPreferences());
  const [alwaysPackLibrary, setAlwaysPackLibrary] = useState<AlwaysPackTemplateItem[]>(() =>
    loadAlwaysPackLibrary()
  );
  const [packingTemplates, setPackingTemplates] = useState<PackingTemplate[]>(() =>
    loadPackingTemplates()
  );
  const [activePackingSegmentId, setActivePackingSegmentId] = useState<string>('all');
  const [neverSuggestItems, setNeverSuggestItems] = useState<string[]>(() =>
    loadNeverSuggestList()
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSubView, setSettingsInitialSubView] = useState<'main' | 'admin_codes'>('main');
  const [settingsFocusSection, setSettingsFocusSection] = useState<SettingsFocusSection>('top');
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proTriggerReason, setProTriggerReason] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isPackingWizardOpen, setIsPackingWizardOpen] = useState(false);
  const [isGeneratingPackingList, setIsGeneratingPackingList] = useState(false);
  const [packingWizardError, setPackingWizardError] = useState<string | null>(null);
  const [tripWizardError, setTripWizardError] = useState<string | null>(null);
  const [goModeOpen, setGoModeOpen] = useState(false);
  const [goModeFocusPassId, setGoModeFocusPassId] = useState<string | null>(null);
  const [goModeFilterDay, setGoModeFilterDay] = useState<number | null>(null);
  const [itineraryWarning, setItineraryWarning] = useState<string | null>(null);
  const [preReclusterByDay, setPreReclusterByDay] = useState<
    Record<number, TimelineNode[]>
  >({});
  const [preSmartReorderSnapshot, setPreSmartReorderSnapshot] = useState<{
    tripId: string;
    timeline: TimelineNode[];
    spatialSummary: string;
    spatialSummariesByDay?: Record<number, string>;
    spatialClustered: boolean;
    spatialClusteredByDay?: Record<number, boolean>;
    meetup: TripState['meetup'];
  } | null>(null);
  const [snapshotStackTick, setSnapshotStackTick] = useState(0);
  const [aiWriteDomains, setAiWriteDomains] = useState<AiWriteDomainMap>(() =>
    loadAiWriteDomains()
  );
  const [activeReminderBanner, setActiveReminderBanner] = useState<{
    headline: string;
    items: string[];
  } | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });
  const [localNotifMap, setLocalNotifMap] = useState<
    Record<string, TripLocalNotificationState>
  >(() => loadAllLocalNotificationStates());
  const [firedScheduledBanner, setFiredScheduledBanner] =
    useState<ResolvedScheduledAlert | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Collaborative Cloud Room & Seat Claiming State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: AuthModalMode;
  }>({ open: false, mode: 'signin' });
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [lastSyncedByName, setLastSyncedByName] = useState<string>('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  const roomRevisionRef = useRef<number>(1);
  const lastSyncedPayloadJsonRef = useRef<string>('');
  const debouncePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TRIP_BOOK_STORAGE_KEY, JSON.stringify(tripBook));
      localStorage.setItem(ACTIVE_TRIP_ID_STORAGE_KEY, activeEntry.id);
    } catch {
      // Ignore storage quota errors
    }
  }, [tripBook, activeEntry.id]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota errors
    }
  }, [preferences]);

  useEffect(() => {
    saveAllLocalNotificationStates(localNotifMap);
  }, [localNotifMap]);

  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = preferences.language || 'en-US';
  const appCopy = useMemo(() => getAppPack(activeLang), [activeLang]);

  useEffect(() => {
    const targetLang = preferences.language || 'en-US';
    if (i18n.language !== targetLang) {
      void i18n.changeLanguage(targetLang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = targetLang;
    }
  }, [preferences.language, i18n]);

  // Automatically react if the user's device/browser language changes while Follow System is active
  useEffect(() => {
    if (!preferences.followSystemLanguage || typeof window === 'undefined') return;
    const onSystemLangChange = () => {
      const detected = detectSystemLanguage();
      const spec = LANGUAGE_SPECS[detected];
      setPreferences((prev) => {
        if (!prev.followSystemLanguage || prev.language === detected) return prev;
        return sanitizePreferences({
          ...prev,
          language: detected,
          followSystemLanguage: true,
          unitSystem: spec.recommendedUnit,
          timeFormat: spec.recommendedTimeFormat,
        });
      });
    };
    window.addEventListener('languagechange', onSystemLangChange);
    return () => window.removeEventListener('languagechange', onSystemLangChange);
  }, [preferences.followSystemLanguage]);

  const unpackedCount = trip.packing.reduce(
    (sum, grp) => sum + grp.items.filter((it) => !it.done).length,
    0
  );

  const cleanDestinationTitle = useMemo(
    () => formatDestinationOnlyTitle(trip, preferences.language),
    [trip.setup.cities, trip.intel.routeTitle, preferences.language]
  );

  const compactDateSpan = useMemo(
    () => formatCompactTripDateRange(trip.setup, preferences.language),
    [trip.setup.departureDate, trip.setup.returnDate, preferences.language]
  );

  const activeCoverVisual = useMemo(
    () => resolveActiveCoverVisual(trip, customCoverDataUrl),
    [trip.setup.cities, trip.setup.tripStyle, trip.coverConfig, customCoverDataUrl]
  );

  const headerSubtitlePreview = useMemo(() => {
    const daysText = t('header.daysCount', { count: trip.setup.days });
    const leadPart = compactDateSpan
      ? `${compactDateSpan} (${daysText})`
      : `${daysText} · ${translateTripStyleLabel(trip.setup.tripStyle, preferences.language)}`;
    const weatherPart = `${formatTempRangeByPref(
      trip.intel.tempRange,
      preferences.unitSystem
    )} ${translateRainChanceLabel(trip.intel.rainChance, preferences.language)}`.trim();
    const sunsetPart = t('header.sunset', {
      time: formatTimeByPref(trip.intel.sunsetTime, preferences.timeFormat),
    });
    return `${leadPart} · ${weatherPart} · ${sunsetPart}`;
  }, [
    compactDateSpan,
    trip.setup.days,
    trip.setup.tripStyle,
    trip.intel.tempRange,
    trip.intel.rainChance,
    trip.intel.sunsetTime,
    preferences.language,
    preferences.unitSystem,
    preferences.timeFormat,
    t,
  ]);

  // Hydrate custom uploaded cover photo from IndexedDB whenever active trip changes
  useEffect(() => {
    let cancelled = false;
    loadCustomTripCover(activeEntry.id).then((url) => {
      if (!cancelled) {
        setCustomCoverDataUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeEntry.id, trip.coverConfig?.updatedAt]);

  // Track scroll position for floating sticky compact bar (compositor-friendly, zero layout thrash)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const collapsed = window.scrollY > 136;
        setIsHeaderCollapsed((prev) => {
          if (prev !== collapsed) {
            setTripMenuSource((curr) => {
              if (collapsed && curr === 'hero') return null;
              if (!collapsed && (curr === 'mobile_sticky' || curr === 'desktop_sticky')) {
                return null;
              }
              return curr;
            });
          }
          return collapsed;
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Subtle pull-down overscroll elastic parallax on the scenic cover when at top of page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 2 || wizardOverlayMode !== null || e.touches.length !== 1) {
        touchPullStartRef.current = null;
        return;
      }
      touchPullStartRef.current = {
        startY: e.touches[0].clientY,
        startX: e.touches[0].clientX,
        active: false,
      };
    };
    const handleTouchMove = (e: TouchEvent) => {
      const st = touchPullStartRef.current;
      if (!st || e.touches.length !== 1) return;
      if (window.scrollY > 2) {
        touchPullStartRef.current = null;
        setCoverPullPx(0);
        return;
      }
      const dy = e.touches[0].clientY - st.startY;
      const dx = Math.abs(e.touches[0].clientX - st.startX);
      if (dy > 6 && dy > dx * 1.15) {
        st.active = true;
        const damped = Math.min(72, Math.pow(dy - 6, 0.78) * 1.8);
        setCoverPullPx(damped);
      } else if (st.active && dy <= 0) {
        setCoverPullPx(0);
      }
    };
    const handleTouchEnd = () => {
      if (touchPullStartRef.current) {
        touchPullStartRef.current = null;
      }
      setCoverPullPx((prev) => (prev !== 0 ? 0 : prev));
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [wizardOverlayMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const routeLabel = cleanDestinationTitle || 'Trip Kit';
    if (preferences.tabBadgeEnabled && unpackedCount > 0) {
      document.title = `(${unpackedCount}) Trip Kit — ${routeLabel}`;
    } else {
      document.title = `Trip Kit — ${routeLabel}`;
    }
  }, [preferences.tabBadgeEnabled, unpackedCount, cleanDestinationTitle]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  const pushBusinessSnapshot = useCallback(
    (label: string, sourceTrip?: TripState) => {
      pushTripSnapshot(activeEntry.id, label, sourceTrip ?? trip);
      setSnapshotStackTick((n) => n + 1);
    },
    [activeEntry.id, trip]
  );

  const snapshotEntriesForUi = useMemo(() => {
    void snapshotStackTick;
    return listTripSnapshots(activeEntry.id).map((e) => ({
      id: e.id,
      at: e.at,
      label: e.label,
    }));
  }, [activeEntry.id, snapshotStackTick]);

  const assistantDiffBaseline = useMemo((): DraftDiffBaseline => {
    const days = Math.max(1, Math.round(trip.setup.days) || 1);
    const schedule = buildTripWeekdaySchedule(
      trip.setup.departureDate,
      days,
      activeLang
    );
    const perDay = Array.from({ length: days }, (_, idx) => {
      const day = idx + 1;
      const nodes = trip.timeline.filter((x) => (x.day ?? 1) === day);
      const protectedTitles = nodes
        .filter((n) => isNodeProtected(n, trip.travelPasses))
        .map((n) => String(n.title || '').trim())
        .filter(Boolean);
      const stopTitles = nodes
        .map((n) => String(n.title || '').trim())
        .filter(Boolean);
      return {
        day,
        date: schedule[idx]?.dateIso,
        city: getCityForDay(
          trip.setup.cities,
          day,
          days,
          nodes,
          activeLang,
          trip.setup.cityDays
        ),
        stopCount: nodes.length,
        stopTitles,
        protectedTitles,
      };
    });
    return {
      departureDate: trip.setup.departureDate,
      days,
      perDay,
    };
  }, [
    trip.timeline,
    trip.setup.days,
    trip.setup.departureDate,
    trip.setup.cities,
    trip.setup.cityDays,
    trip.travelPasses,
    activeLang,
  ]);

  const handleRestoreSnapshot = useCallback(
    (snapshotId: string) => {
      const entry = getTripSnapshot(activeEntry.id, snapshotId);
      if (!entry) return;
      setTrip((prev) => applyTripSnapshotSlice(prev, entry.state));
      setPreReclusterByDay({});
      setItineraryWarning(null);
      showToast(appCopy.aiWriteSnapshotRestored);
    },
    [activeEntry.id, appCopy.aiWriteSnapshotRestored, showToast]
  );

  const handleToggleAiWriteDomain = useCallback(
    (domain: AiWriteDomain, enabled: boolean) => {
      setAiWriteDomains((prev) => {
        const next = { ...prev, [domain]: enabled };
        saveAiWriteDomains(next);
        return next;
      });
    },
    []
  );

  const packingViewCopy = useMemo(
    () => getPackingViewCopy(activeLang),
    [activeLang]
  );

  const packingSegments = useMemo(() => {
    const cities = (trip.setup.cities || [])
      .map((c) => String(c || '').trim())
      .filter(Boolean)
      .slice(0, 8);
    if (cities.length === 0) return [] as Array<{
      id: string;
      label: string;
      from: number;
      to: number;
    }>;
    const days = Math.max(1, Math.round(trip.setup.days) || 1);
    const allocation = resolveCityDaysAllocation(
      cities,
      days,
      trip.setup.cityDays
    );
    let cursor = 1;
    return cities.map((city, idx) => {
      const span = Math.max(1, allocation[idx] ?? 1);
      const from = cursor;
      const to = Math.min(days, from + span - 1);
      cursor = to + 1;
      const id = from === to ? `D${from}` : `D${from}-D${to}`;
      const label =
        from === to ? `D${from} · ${city}` : `D${from}-D${to} · ${city}`;
      return { id, label, from, to };
    }).filter((seg) => seg.from <= days);
  }, [
    trip.setup.cities,
    trip.setup.cityDays,
    trip.setup.days,
    trip.setup.departureDate,
  ]);

  const handleSavePackingTemplate = useCallback(
    (name: string) => {
      const next = savePackingTemplate(
        name,
        trip.packing,
        trip.setup?.specialScenarios
      );
      setPackingTemplates(next);
      const trimmed = name.trim().slice(0, 40);
      if (trimmed) showToast(packingViewCopy.templateSavedToast(trimmed));
    },
    [trip.packing, trip.setup?.specialScenarios, packingViewCopy, showToast]
  );

  const handleApplyPackingTemplate = useCallback(
    (templateId: string) => {
      const tpl = packingTemplates.find((t) => t.id === templateId);
      if (!tpl) return;
      pushBusinessSnapshot(appCopy.snapshotLabelPackingRegen, trip);
      const clonedGroups = JSON.parse(JSON.stringify(tpl.groups)) as typeof trip.packing;
      const merged = mergeRegeneratedPackingGroups(
        trip.packing,
        clonedGroups,
        'smart_merge'
      );
      setTrip((prev) => ({
        ...prev,
        packing: merged.groups,
        smartBagOverrides: {},
      }));
      showToast(packingViewCopy.templateAppliedToast(tpl.name));
    },
    [
      packingTemplates,
      trip,
      appCopy.snapshotLabelPackingRegen,
      packingViewCopy,
      pushBusinessSnapshot,
      showToast,
    ]
  );

  const handleDeletePackingTemplate = useCallback(
    (templateId: string) => {
      const existing = packingTemplates.find((t) => t.id === templateId);
      const next = deletePackingTemplate(templateId);
      setPackingTemplates(next);
      if (existing) showToast(packingViewCopy.templateDeletedToast(existing.name));
    },
    [packingTemplates, packingViewCopy, showToast]
  );

  const handleRenamePackingTemplate = useCallback(
    (templateId: string, name: string) => {
      const next = renamePackingTemplate(templateId, name);
      setPackingTemplates(next);
    },
    []
  );

  const handleSetItemSegments = useCallback(
    (groupId: string, itemId: string, segmentIds: string[]) => {
      setTrip((prev) => ({
        ...prev,
        packing: prev.packing.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                items: g.items.map((it) =>
                  it.id !== itemId
                    ? it
                    : {
                        ...it,
                        segmentIds:
                          segmentIds.length > 0 ? segmentIds : undefined,
                      }
                ),
              }
        ),
      }));
    },
    []
  );

  const handleUpdatePreferences = useCallback((updates: Partial<AppPreferences>) => {
    setPreferences((prev) => sanitizePreferences({ ...prev, ...updates }));
  }, []);

  const handleSwitchLanguage = useCallback(
    (nextLang: AppLanguage, syncRegional = true) => {
      const spec = LANGUAGE_SPECS[nextLang];
      const patch: Partial<AppPreferences> = syncRegional
        ? {
            language: nextLang,
            followSystemLanguage: false,
            unitSystem: spec.recommendedUnit,
            timeFormat: spec.recommendedTimeFormat,
          }
        : { language: nextLang, followSystemLanguage: false };
      setPreferences((prev) => sanitizePreferences({ ...prev, ...patch }));
      void i18n.changeLanguage(nextLang);
      const toastMap: Record<AppLanguage, string> = {
        'zh-CN': syncRegional
          ? '已切换为简体中文（公制 kg/°C · 24 小时制）'
          : '界面语言已切换为简体中文',
        'en-US': syncRegional
          ? 'Switched to English (North America · lb/°F · 12h)'
          : `Language switched to ${spec.nativeLabel}`,
        'en-GB': syncRegional
          ? 'Switched to English (Europe/UK · kg/°C · 24h)'
          : `Language switched to ${spec.nativeLabel}`,
        'es-MX': syncRegional
          ? 'Cambiado a Español (México · kg/°C · 24h)'
          : `Idioma cambiado a ${spec.nativeLabel}`,
        'fr-FR': syncRegional
          ? 'Langue définie sur Français (kg/°C · 24h)'
          : `Langue définie sur ${spec.nativeLabel}`,
        'de-DE': syncRegional
          ? 'Auf Deutsch umgestellt (kg/°C · 24 Std.)'
          : `Sprache auf ${spec.nativeLabel} umgestellt`,
        'pt-BR': syncRegional
          ? 'Alterado para Português (kg/°C · 24h)'
          : `Idioma alterado para ${spec.nativeLabel}`,
        'ja-JP': syncRegional
          ? '日本語に切り替えました（メートル法 · 24時間制）'
          : `言語を ${spec.nativeLabel} に切り替えました`,
      };
      showToast(toastMap[nextLang] || `Language switched to ${spec.nativeLabel}`);
    },
    [i18n, showToast]
  );

  const handleFollowSystemLanguage = useCallback(
    (syncRegional = true) => {
      const detected = detectSystemLanguage();
      const spec = LANGUAGE_SPECS[detected];
      const patch: Partial<AppPreferences> = syncRegional
        ? {
            language: detected,
            followSystemLanguage: true,
            unitSystem: spec.recommendedUnit,
            timeFormat: spec.recommendedTimeFormat,
          }
        : { language: detected, followSystemLanguage: true };
      setPreferences((prev) => sanitizePreferences({ ...prev, ...patch }));
      void i18n.changeLanguage(detected);
      const followToastMap: Record<AppLanguage, string> = {
        'zh-CN': '已开启跟随手机系统语言（当前：简体中文）',
        'en-US': `Following system language (${spec.nativeLabel})`,
        'en-GB': `Following system language (${spec.nativeLabel})`,
        'es-MX': `Siguiendo el idioma del dispositivo (${spec.nativeLabel})`,
        'fr-FR': `Langue alignée sur l’appareil (${spec.nativeLabel})`,
        'de-DE': `Gerätesprache aktiv (${spec.nativeLabel})`,
        'pt-BR': `Seguindo o idioma do dispositivo (${spec.nativeLabel})`,
        'ja-JP': `端末の言語設定に追従中（${spec.nativeLabel}）`,
      };
      showToast(followToastMap[detected] || `Following system language (${spec.nativeLabel})`);
    },
    [i18n, showToast]
  );

  const membershipStatus = computeMembershipStatus(preferences);

  const openProPaywallWithReason = useCallback((reason: string | null) => {
    setProTriggerReason(reason);
    setProModalOpen(true);
  }, []);

  const markWelcomeAuthSeen = useCallback(() => {
    try {
      localStorage.setItem('tripkit_welcome_auth_seen_v1', '1');
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode) => {
    setAuthModalState({ open: true, mode });
  }, []);

  // Track Firebase Auth readiness
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        markWelcomeAuthSeen();
      } else {
        setSyncStatus('local');
      }
    });
    return () => unsub();
  }, [markWelcomeAuthSeen]);

  // First-launch Welcome Auth Screen (shown once on initial visit if not signed in; non-blocking per Apple 5.1.1(ii))
  useEffect(() => {
    if (!authReady || authUser || wizardOverlayMode !== null) return;
    try {
      if (localStorage.getItem('tripkit_welcome_auth_seen_v1') === '1') return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      setAuthModalState((prev) =>
        prev.open ? prev : { open: true, mode: 'welcome' }
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authReady, authUser, wizardOverlayMode]);

  // Automatically restore Pro entitlement from Cloud Firestore when user logs in on any device
  useEffect(() => {
    if (!authReady || !authUser || !authUser.emailVerified) return;
    let cancelled = false;
    fetchMyCloudEntitlement(authUser.uid)
      .then((ent) => {
        if (cancelled || !ent) return;
        const stillValid = ent.expiresAtMs === null || ent.expiresAtMs > Date.now();
        if (!stillValid) return;
        setPreferences((prev) => {
          const alreadySynced =
            prev.isProUnlocked &&
            prev.proPlan === ent.planType &&
            prev.redeemedCode === ent.redeemedCode;
          if (alreadySynced) return prev;
          showToast(getAppPack(prev.language || 'en-US').proRestoredToast);
          return sanitizePreferences({
            ...prev,
            isProUnlocked: true,
            proPlan: ent.planType,
            proExpiresAt: ent.expiresAtMs,
            redeemedCode: ent.redeemedCode,
            trialSimulationMode: 'normal',
          });
        });
      })
      .catch(() => {
        // Non-blocking background entitlement check when offline
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser, showToast]);

  // Detect ?room=XXXXXX or ?join=XXXXXX invite link on boot
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawCode = params.get('room') || params.get('join');
    if (!rawCode) return;
    const code = normalizeRoomCode(rawCode);
    if (isValidRoomCode(code)) {
      markOnboardingDone();
      setWizardOverlayMode(null);
      setPendingJoinCode(code);
      setInviteModalOpen(true);
      params.delete('room');
      params.delete('join');
      const nextSearch = params.toString();
      const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [markOnboardingDone]);

  // Attach single-document real-time listener ONLY when auth is ready & user is verified
  const boundTripEntryId = activeEntry.id;
  useEffect(() => {
    if (!authReady || !authUser || !activeRoomId) {
      if (!activeRoomId) setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');
    const unsub = subscribeToTripRoom(
      activeRoomId,
      (room) => {
        roomRevisionRef.current = room.revision;
        setLastSyncedByName(room.lastUpdatedByName || '');
        setSyncStatus('synced');

        if (room.tripPayload) {
          const incomingCanonical = JSON.stringify(sanitizeTripForCloud(room.tripPayload));
          if (incomingCanonical !== lastSyncedPayloadJsonRef.current) {
            lastSyncedPayloadJsonRef.current = incomingCanonical;
            setTripBook((prev) =>
              prev.map((entry) =>
                entry.id === boundTripEntryId
                  ? { ...entry, updatedAt: Date.now(), state: room.tripPayload }
                  : entry
              )
            );
          }
        }
      },
      (err) => {
        setSyncStatus('error');
        showToast(formatCloudSyncError(err));
      }
    );

    return () => {
      unsub();
    };
  }, [authReady, authUser, activeRoomId, boundTripEntryId, showToast]);

  // Debounced outgoing sync (1300ms >= 1s server write cooldown in firestore.rules)
  useEffect(() => {
    if (!authReady || !authUser || !activeRoomId) return;

    const currentCanonical = JSON.stringify(sanitizeTripForCloud(trip));
    if (!lastSyncedPayloadJsonRef.current) {
      // Wait for initial room connection/snapshot before pushing local state
      return;
    }
    if (currentCanonical === lastSyncedPayloadJsonRef.current) {
      return;
    }

    setSyncStatus('syncing');
    if (debouncePushTimerRef.current) {
      clearTimeout(debouncePushTimerRef.current);
    }

    const activeSeatMember = trip.crew.find((m) => m.id === claimedSeatId);
    const actorName =
      activeSeatMember?.name || authUser.displayName || appCopy.crewMemberFallback;
    const roomToPush = activeRoomId;

    debouncePushTimerRef.current = setTimeout(() => {
      pushTripRoomUpdate({
        roomId: roomToPush,
        expectedRevision: roomRevisionRef.current,
        trip,
        user: authUser,
        actorName,
      })
        .then((nextRev) => {
          if (activeTripIdRef.current === boundTripEntryId) {
            roomRevisionRef.current = nextRev;
            lastSyncedPayloadJsonRef.current = currentCanonical;
            setLastSyncedByName(actorName);
            setSyncStatus('synced');
          }
        })
        .catch((err) => {
          setSyncStatus('error');
          showToast(formatCloudSyncError(err));
        });
    }, 1300);

    return () => {
      if (debouncePushTimerRef.current) {
        clearTimeout(debouncePushTimerRef.current);
      }
    };
  }, [trip, authReady, authUser, activeRoomId, claimedSeatId, boundTripEntryId, showToast]);

  const reminderConfig: PackingReminderSettings = trip.reminder ?? DEFAULT_PACKING_REMINDER;

  const getScopedPendingItems = useCallback(
    (scope: PackingReminderSettings['scope'], includeMorningItems = false) => {
      const pending = trip.packing
        .flatMap((g) => g.items)
        .filter((it) => !it.done && (includeMorningItems || !it.morningOfDeparture));
      if (scope === 'pinned_only') return pending.filter((it) => it.remindBeforeDeparture);
      if (scope === 'carry_on_only') return pending.filter((it) => it.carryOnOnly);
      return pending;
    },
    [trip.packing]
  );

  const getMorningPendingItems = useCallback(() => {
    return trip.packing
      .flatMap((g) => g.items)
      .filter((it) => !it.done && it.morningOfDeparture);
  }, [trip.packing]);

  const fireReminderNotification = useCallback(
    (headline: string, itemNames: string[], forceBanner = false) => {
      if (forceBanner || itemNames.length > 0) {
        setActiveReminderBanner({ headline, items: itemNames });
      }
      const previewJoiner = activeLang === 'zh-CN' || activeLang === 'ja-JP' ? '、' : ', ';
      const bodyText =
        itemNames.length > 0
          ? appCopy.reminderHeadlineWithItems(
              headline,
              itemNames.slice(0, 3).join(previewJoiner),
              Math.max(0, itemNames.length - 3)
            )
          : headline;

      void dispatchLocalBrowserNotification({
        title: appCopy.packingReminderTitle,
        body: bodyText,
        tag: `tripkit_preview_${Date.now()}`,
        data: { targetTab: 'packing' },
      });
    },
    [activeLang, appCopy]
  );

  const activeTripNotifState = useMemo(
    () => getTripNotificationState(localNotifMap, activeEntry.id),
    [localNotifMap, activeEntry.id]
  );

  const updateActiveTripNotifState = useCallback(
    (updater: (prev: TripLocalNotificationState) => TripLocalNotificationState) => {
      const tripKey = activeEntry.id;
      setLocalNotifMap((prev) => {
        const current = getTripNotificationState(prev, tripKey);
        return {
          ...prev,
          [tripKey]: updater(current),
        };
      });
    },
    [activeEntry.id]
  );

  const resolvedScheduledAlerts = useMemo(
    () =>
      resolveTripScheduledAlerts({
        trip,
        localState: activeTripNotifState,
        lang: activeLang,
        timeFormat: preferences.timeFormat,
        formatPackItemName: (name, qty) => {
          const localized = translateDemoPackItemName(name, activeLang);
          return qty && qty > 1 ? `${localized} ×${qty}` : localized;
        },
      }),
    [trip, activeTripNotifState, activeLang, preferences.timeFormat]
  );

  const armedStopLeadsMap = useMemo(() => {
    const out: Record<string, ItineraryAlertLeadMinutes> = {};
    for (const [nodeId, cfg] of Object.entries(activeTripNotifState.armedStops)) {
      out[nodeId] = cfg.leadMinutes;
    }
    return out;
  }, [activeTripNotifState.armedStops]);

  const scheduledItineraryAlerts = useMemo(
    () => resolvedScheduledAlerts.filter((a) => a.targetTab === 'itinerary'),
    [resolvedScheduledAlerts]
  );

  const scheduledPackingAlerts = useMemo(
    () => resolvedScheduledAlerts.filter((a) => a.targetTab === 'packing'),
    [resolvedScheduledAlerts]
  );

  // Register lightweight notification worker & route OS notification clicks to target tab/day
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        void registerNotificationServiceWorker();
      }
    }

    const handleNotifClickPayload = (rawPayload: unknown) => {
      if (!rawPayload || typeof rawPayload !== 'object') return;
      const p = rawPayload as { targetTab?: AppTab; targetDay?: number };
      if (typeof p.targetDay === 'number' && p.targetDay >= 1) {
        setTrip((prev) => ({
          ...prev,
          activeFinanceDay: Math.min(Math.max(1, prev.setup.days), p.targetDay!),
        }));
      }
      if (p.targetTab === 'packing' || p.targetTab === 'itinerary' || p.targetTab === 'budget') {
        setTab(p.targetTab);
      }
      setAiDrawerOpen(false);
      setSettingsOpen(false);
    };

    const onWindowMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TRIPKIT_NOTIFICATION_CLICK') {
        handleNotifClickPayload(e.data.payload);
      }
    };
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TRIPKIT_NOTIFICATION_CLICK') {
        handleNotifClickPayload(e.data.payload);
      }
    };

    window.addEventListener('message', onWindowMessage);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => {
      window.removeEventListener('message', onWindowMessage);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, []);

  // Precision local browser push scheduler (exact next-due timer + 10s heartbeat + focus/wake check)
  useEffect(() => {
    const evaluateDueScheduledAlerts = () => {
      const nowMs = Date.now();
      const dueAlerts = resolvedScheduledAlerts.filter(
        (a) => !a.isFired && nowMs >= a.triggerAtMs
      );
      if (dueAlerts.length === 0) return;

      const newlyFiredSigs: Record<string, number> = {};
      const actionableAlerts: ResolvedScheduledAlert[] = [];

      for (const alert of dueAlerts) {
        newlyFiredSigs[alert.signature] = nowMs;
        // Suppress cold-boot OS popups for stale demo-trip auto rules (>6h overdue), while firing live ones
        const isStaleAutoRule =
          alert.isAutoRule && nowMs - alert.triggerAtMs > 6 * 3600_000;
        if (!isStaleAutoRule) {
          actionableAlerts.push(alert);
        }
      }

      updateActiveTripNotifState((prev) => ({
        ...prev,
        firedSignatures: {
          ...prev.firedSignatures,
          ...newlyFiredSigs,
        },
      }));

      for (const alert of actionableAlerts) {
        void dispatchLocalBrowserNotification({
          title: alert.title,
          body: alert.body,
          tag: alert.signature,
          data: {
            targetTab: alert.targetTab,
            targetDay: alert.targetDay,
          },
        });
      }

      if (actionableAlerts.length > 0) {
        const latest = actionableAlerts[actionableAlerts.length - 1];
        setFiredScheduledBanner(latest);
      }
    };

    evaluateDueScheduledAlerts();

    const nextUpcoming = resolvedScheduledAlerts.find(
      (a) => !a.isFired && a.triggerAtMs > Date.now()
    );
    const exactTimeout = nextUpcoming
      ? window.setTimeout(
          evaluateDueScheduledAlerts,
          Math.min(60_000, Math.max(250, nextUpcoming.triggerAtMs - Date.now() + 80))
        )
      : null;

    const heartbeat = window.setInterval(evaluateDueScheduledAlerts, 10_000);
    const onWakeCheck = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      evaluateDueScheduledAlerts();
    };

    window.addEventListener('focus', onWakeCheck);
    document.addEventListener('visibilitychange', onWakeCheck);

    return () => {
      if (exactTimeout !== null) window.clearTimeout(exactTimeout);
      window.clearInterval(heartbeat);
      window.removeEventListener('focus', onWakeCheck);
      document.removeEventListener('visibilitychange', onWakeCheck);
    };
  }, [resolvedScheduledAlerts, updateActiveTripNotifState]);

  // Automatic due-time check every 30s (separating pre-departure night vs departure morning)
  useEffect(() => {
    const checkDue = () => {
      if (!reminderConfig.enabled || reminderDismissed) return;
      if (reminderConfig.snoozedUntil && Date.now() < reminderConfig.snoozedUntil) return;

      const now = new Date();
      const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const isDepartureMorning = todayLocal === trip.setup.departureDate;

      if (isDepartureMorning) {
        const morningItems = getMorningPendingItems();
        if (morningItems.length > 0) {
          setActiveReminderBanner({
            headline: appCopy.departureMorningAlertHeadline(morningItems.length),
            items: morningItems.map((i) => formatItemDisplayName(i)),
          });
          return;
        }
      }

      const scoped = getScopedPendingItems(reminderConfig.scope, false);
      if (scoped.length === 0) {
        setActiveReminderBanner(null);
        return;
      }

      let triggerMs: number;
      if (reminderConfig.mode === 'custom') {
        triggerMs = new Date(reminderConfig.customDateTime).getTime();
      } else {
        const depMs = new Date(`${trip.setup.departureDate}T09:00:00`).getTime();
        triggerMs = depMs - reminderConfig.leadHours * 3600 * 1000;
      }

      if (!Number.isNaN(triggerMs) && Date.now() >= triggerMs) {
        const headline =
          reminderConfig.mode === 'custom'
            ? appCopy.scheduledPackingAlertCustom(scoped.length)
            : appCopy.scheduledPackingAlertLead(reminderConfig.leadHours, scoped.length);
        setActiveReminderBanner({ headline, items: scoped.map((i) => formatItemDisplayName(i)) });
      }
    };

    checkDue();
    const timer = setInterval(checkDue, 30000);
    return () => clearInterval(timer);
  }, [
    reminderConfig,
    reminderDismissed,
    trip.setup.departureDate,
    getScopedPendingItems,
    getMorningPendingItems,
    appCopy,
  ]);

  const resetSyncRefsForTripSwitch = () => {
    if (debouncePushTimerRef.current) {
      clearTimeout(debouncePushTimerRef.current);
      debouncePushTimerRef.current = null;
    }
    lastSyncedPayloadJsonRef.current = '';
    roomRevisionRef.current = 1;
  };

  const handleSelectTripFromBook = (nextTripId: string) => {
    if (nextTripId === activeEntry.id) {
      setWizardOverlayMode(null);
      return;
    }
    resetSyncRefsForTripSwitch();
    setActiveTripId(nextTripId);
    setItineraryWarning(null);
    setPreReclusterByDay({});
    setWizardOverlayMode(null);
    const target = tripBook.find((t) => t.id === nextTripId);
    if (target) {
      showToast(appCopy.switchedTripToast(target.state.intel.routeTitle));
    }
  };

  const handleDuplicateTripInBook = (sourceTripId: string) => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallDuplicateTrip);
      return;
    }
    const source = tripBook.find((t) => t.id === sourceTripId);
    if (!source) return;
    const now = Date.now();
    const baseTitle = formatDestinationOnlyTitle(source.state, preferences.language);
    const clonedPacking: PackingGroup[] = source.state.packing.map((grp) => ({
      ...grp,
      items: grp.items.map((it) => ({
        ...it,
        done: false,
        packedByMemberId: undefined,
      })),
    }));
    const newTripId = `trip_copy_${now}`;
    void duplicateCustomTripCover(source.id, newTripId);
    const newEntry: SavedTripEntry = {
      id: newTripId,
      createdAt: now,
      updatedAt: now,
      cloudRoomId: null,
      claimedSeatId: 'm1',
      state: {
        ...source.state,
        intel: {
          ...source.state.intel,
          routeTitle: baseTitle,
        },
        packing: clonedPacking,
        expenses: [],
        settlementHistory: [],
        budget: {
          ...source.state.budget,
          rolloverLocal: 0,
          cardUsd:
            source.state.budget.cardUsd > 0 ? source.state.budget.cardUsd : 500,
          partnerOwedLocal: 0,
        },
      },
    };
    resetSyncRefsForTripSwitch();
    setTripBook((prev) => [newEntry, ...prev]);
    setActiveTripId(newEntry.id);
    setPreReclusterByDay({});
    setWizardOverlayMode(null);
    showToast(appCopy.duplicatedTripToast(baseTitle));
  };

  const handleDeleteTripFromBook = (targetTripId: string) => {
    void deleteCustomTripCover(targetTripId);
    if (tripBook.length <= 1) {
      // Deleting the last remaining trip resets to fresh onboarding guide
      resetSyncRefsForTripSwitch();
      const freshEntry: SavedTripEntry = {
        id: `trip_fresh_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cloudRoomId: null,
        claimedSeatId: 'm1',
        state: DEFAULT_TRIP_STATE,
      };
      setTripBook([freshEntry]);
      setActiveTripId(freshEntry.id);
      setPreReclusterByDay({});
      setTripMenuSource(null);
      setWizardOverlayMode('onboarding');
      showToast(appCopy.clearedPreviousTripToast);
      return;
    }

    const remaining = tripBook.filter((t) => t.id !== targetTripId);
    if (targetTripId === activeEntry.id && remaining.length > 0) {
      resetSyncRefsForTripSwitch();
      setActiveTripId(remaining[0].id);
      setPreReclusterByDay({});
    }
    setTripBook(remaining);
    showToast(appCopy.removedTripFromBookToast);
  };

  const handleSaveTripCover = useCallback(
    (nextCoverConfig: TripCoverConfig, nextCustomUrl: string | null) => {
      setCustomCoverDataUrl(nextCustomUrl);
      setTrip((prev) => ({
        ...prev,
        coverConfig: nextCoverConfig,
      }));
    },
    [setTrip]
  );

  const handleNormalizePackingFromWizard = (
    nextSetup: TripSetup,
    normalizedPacking: PackingGroup[],
    plan: ClothingNormalizationPlan,
    isUndo = false
  ) => {
    setTrip((prev) => ({
      ...prev,
      setup: {
        ...prev.setup,
        departureDate: nextSetup.departureDate,
        returnDate: nextSetup.returnDate,
        days: nextSetup.days,
        cityDays: nextSetup.cityDays,
        laundry: nextSetup.laundry,
        laundryIntervalDays: nextSetup.laundryIntervalDays,
        rewear: nextSetup.rewear,
      },
      packing: normalizedPacking,
      activeFinanceDay: Math.min(
        nextSetup.days,
        Math.max(1, prev.activeFinanceDay ?? 1)
      ),
    }));
    showToast(
      isUndo
        ? appCopy.revertedWardrobeScalingToast
        : appCopy.autoScaledWardrobeToast(nextSetup.days, plan.changedItems.length)
    );
  };

  const handleSaveEditCurrentSetup = (
    nextSetup: TripSetup,
    nextCrew: CrewMember[],
    normalizedPacking?: PackingGroup[]
  ) => {
    const safeCities =
      nextSetup.cities.length > 0 ? nextSetup.cities : [appCopy.destinationFallback];
    const normalizedCrew = resizeCrewList(nextCrew, nextSetup.travelers);
    const normalizedCityDays = resolveCityDaysAllocation(
      safeCities,
      nextSetup.days,
      nextSetup.cityDays
    );
    const inferred = inferOfflineDestinationProfile(safeCities, {
      totalDays: nextSetup.days,
      departureDate: nextSetup.departureDate,
      cityDays: normalizedCityDays,
    });
    const routeTitle = inferred.intel.routeTitle;

    setTrip((prev) => {
      const citiesChanged =
        prev.setup.cities.join('||') !== safeCities.join('||') ||
        (prev.setup.cityDays || []).join(',') !== normalizedCityDays.join(',') ||
        prev.setup.departureDate !== nextSetup.departureDate;
      const canSwitchCurrency = prev.expenses.length === 0;
      const nextIntel: TripIntelligence = citiesChanged
        ? canSwitchCurrency
          ? inferred.intel
          : {
              ...prev.intel,
              routeTitle: inferred.intel.routeTitle,
              weatherSummary: inferred.intel.weatherSummary,
              tempRange: inferred.intel.tempRange,
              rainChance: inferred.intel.rainChance,
              sunsetTime: inferred.intel.sunsetTime,
              timezoneOffset: inferred.intel.timezoneOffset,
              plugType: inferred.intel.plugType,
              voltage: inferred.intel.voltage,
              vatExitAirport: inferred.intel.vatExitAirport,
            }
        : {
            ...prev.intel,
            routeTitle,
          };

      return {
        ...prev,
        setup: {
          ...nextSetup,
          cities: safeCities,
          cityDays: normalizedCityDays,
          travelers: normalizedCrew.length,
        },
        crew: normalizedCrew,
        packing: normalizedPacking ?? prev.packing,
        intel: nextIntel,
        budget: {
          ...(citiesChanged && canSwitchCurrency
            ? {
                ...prev.budget,
                dailyBudgetLocal: inferred.dailyBudgetLocal,
                vatRefundRate: inferred.intel.vatThresholdLocal > 0 ? 0.12 : 0,
              }
            : prev.budget),
          partnerOwedLocal: recomputeUnsettledPartnerOwed(
            prev.expenses,
            normalizedCrew.length
          ),
        },
        activeFinanceDay: Math.min(
          nextSetup.days,
          Math.max(1, prev.activeFinanceDay ?? 1)
        ),
      };
    });
    markOnboardingDone();
    setWizardOverlayMode(null);
    showToast(
      normalizedPacking
        ? appCopy.savedSetupWithScalingToast(routeTitle, nextSetup.days)
        : appCopy.savedSetupPreservedToast(routeTitle)
    );
  };

  const handleUpdateCrewMember = (
    memberId: string,
    updates: Partial<Pick<CrewMember, 'name' | 'role'>>
  ) => {
    setTrip((prev) => ({
      ...prev,
      crew: prev.crew.map((m, idx) => {
        if (m.id !== memberId) return m;
        const nextName = updates.name !== undefined ? updates.name : m.name;
        return {
          ...m,
          ...updates,
          initials: computeMemberInitials(nextName, idx === 0 ? '我' : `P${idx}`),
        };
      }),
    }));
  };

  const handleAddCompanionSeatLocal = (name: string, role: string) => {
    setTrip((prev) => {
      if (prev.crew.length >= 4) return prev;
      const usedIds = new Set(prev.crew.map((c) => c.id));
      const candidateSeatId =
        (['m1', 'm2', 'm3', 'm4'] as SeatId[]).find((id) => !usedIds.has(id)) ||
        (`m${prev.crew.length + 1}` as SeatId);
      const nextIndex = prev.crew.length;
      const tpl = DEFAULT_COMPANION_TEMPLATES[nextIndex] || DEFAULT_COMPANION_TEMPLATES[1];
      const newMember: CrewMember = {
        ...tpl,
        id: candidateSeatId,
        name: name.slice(0, 40),
        role: role.slice(0, 60),
        initials: computeMemberInitials(name, `P${nextIndex}`),
      };
      const nextCrew = [...prev.crew, newMember];
      return {
        ...prev,
        crew: nextCrew,
        setup: {
          ...prev.setup,
          travelers: nextCrew.length,
        },
        budget: {
          ...prev.budget,
          partnerOwedLocal: recomputeUnsettledPartnerOwed(prev.expenses, nextCrew.length),
        },
      };
    });
    showToast(appCopy.addedTravelerSeatToast(name));
  };

  const handleRemoveCompanionSeatLocal = (memberId: string) => {
    if (memberId === 'm1') return;
    if (claimedSeatId === memberId) {
      setClaimedSeatId('m1');
    }
    setTrip((prev) => {
      if (prev.crew.length <= 1) return prev;
      const target = prev.crew.find((c) => c.id === memberId);
      if (!target || target.claimedByUid) return prev;
      const nextCrew = prev.crew.filter((c) => c.id !== memberId);
      const nextPacking = prev.packing.map((grp) => ({
        ...grp,
        items: grp.items.map((it) =>
          it.ownerId === memberId ? { ...it, ownerId: 'm1' } : it
        ),
      }));
      const nextTasks = (prev.tasks ?? DEFAULT_TRIP_TASKS).map((tk) =>
        tk.ownerId === memberId ? { ...tk, ownerId: 'm1' } : tk
      );
      return {
        ...prev,
        crew: nextCrew,
        packing: nextPacking,
        tasks: nextTasks,
        setup: {
          ...prev.setup,
          travelers: nextCrew.length,
        },
        budget: {
          ...prev.budget,
          partnerOwedLocal: recomputeUnsettledPartnerOwed(prev.expenses, nextCrew.length),
        },
      };
    });
    showToast(appCopy.removedTravelerSeatToast);
  };

  const handleConnectedToRoom = (payload: {
    roomId: string;
    seatId: SeatId;
    nextTrip: TripState;
    revision: number;
  }) => {
    if (debouncePushTimerRef.current) {
      clearTimeout(debouncePushTimerRef.current);
      debouncePushTimerRef.current = null;
    }
    roomRevisionRef.current = payload.revision;
    lastSyncedPayloadJsonRef.current = JSON.stringify(sanitizeTripForCloud(payload.nextTrip));
    markOnboardingDone();
    setWizardOverlayMode(null);

    const existingMatch = tripBook.find((e) => e.cloudRoomId === payload.roomId);
    if (existingMatch) {
      setTripBook((prev) =>
        prev.map((e) =>
          e.id === existingMatch.id
            ? {
                ...e,
                claimedSeatId: payload.seatId,
                updatedAt: Date.now(),
                state: payload.nextTrip,
              }
            : e
        )
      );
      setActiveTripId(existingMatch.id);
    } else if (
      !activeEntry.cloudRoomId &&
      (wizardOverlayMode === 'onboarding' ||
        activeEntry.state.intel.routeTitle === payload.nextTrip.intel.routeTitle)
    ) {
      setTripBook((prev) =>
        prev.map((e) =>
          e.id === activeEntry.id
            ? {
                ...e,
                cloudRoomId: payload.roomId,
                claimedSeatId: payload.seatId,
                updatedAt: Date.now(),
                state: payload.nextTrip,
              }
            : e
        )
      );
    } else {
      const joinedEntry: SavedTripEntry = {
        id: `trip_room_${payload.roomId}_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cloudRoomId: payload.roomId,
        claimedSeatId: payload.seatId,
        state: payload.nextTrip,
      };
      setTripBook((prev) => [joinedEntry, ...prev]);
      setActiveTripId(joinedEntry.id);
    }
    setSyncStatus('synced');
  };

  const handleDisconnectRoom = () => {
    resetSyncRefsForTripSwitch();
    const targetId = activeEntry.id;
    setTripBook((prev) =>
      prev.map((entry) =>
        entry.id === targetId
          ? { ...entry, cloudRoomId: null, updatedAt: Date.now() }
          : entry
      )
    );
    setSyncStatus('local');
  };

  const handleUpdateMeetup = (updates: Partial<MeetupPlan>) => {
    setTrip((prev) => ({
      ...prev,
      meetup: {
        ...prev.meetup,
        ...updates,
      },
    }));
    showToast(appCopy.updatedMeetupToast);
  };

  const handleLoadOrAddDemoTrip = () => {
    markOnboardingDone();
    if (wizardOverlayMode === 'onboarding') {
      setTrip(DEFAULT_TRIP_STATE);
      setPreReclusterByDay({});
      setWizardOverlayMode(null);
      setItineraryWarning(null);
      setTab('packing');
      showToast(appCopy.loadedSampleTripToast);
      return;
    }

    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive && tripBook.length >= 1) {
      openProPaywallWithReason(appCopy.paywallMultiTrip);
      return;
    }

    resetSyncRefsForTripSwitch();
    const now = Date.now();
    const demoEntry: SavedTripEntry = {
      id: `trip_demo_${now}`,
      createdAt: now,
      updatedAt: now,
      cloudRoomId: null,
      claimedSeatId: 'm1',
      state: DEFAULT_TRIP_STATE,
    };
    setTripBook((prev) => [demoEntry, ...prev]);
    setActiveTripId(demoEntry.id);
    setPreReclusterByDay({});
    setWizardOverlayMode(null);
    setTripWizardError(null);
    setItineraryWarning(null);
    setTab('packing');
    showToast(appCopy.addedSampleTripToast);
  };

  const handleCreateNewQuickOffline = (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    customPacking?: PackingGroup[]
  ) => {
    if (
      wizardOverlayMode !== 'onboarding' &&
      membershipStatus.isTrialExpired &&
      !membershipStatus.isProActive &&
      tripBook.length >= 1
    ) {
      openProPaywallWithReason(appCopy.paywallMultiTrip);
      return;
    }
    const builtRaw = buildOfflineInitialTripState(
      draftSetup,
      draftCrew,
      customPacking
    );
    const mergedAlways = mergeAlwaysPackIntoGroups(
      filterGroupsAgainstNeverSuggest(builtRaw.packing, neverSuggestItems),
      alwaysPackLibrary,
      draftCrew[0]?.id || 'm1'
    );
    const builtState: TripState = {
      ...builtRaw,
      packing: mergedAlways.groups,
    };
    markOnboardingDone();

    if (wizardOverlayMode === 'onboarding') {
      setTrip(builtState);
      setPreReclusterByDay({});
      setWizardOverlayMode(null);
      setItineraryWarning(null);
      setTab('packing');
      showToast(appCopy.createdStarterTripToast(builtState.intel.routeTitle));
      return;
    }

    resetSyncRefsForTripSwitch();
    const now = Date.now();
    const newEntry: SavedTripEntry = {
      id: `trip_local_${now}`,
      createdAt: now,
      updatedAt: now,
      cloudRoomId: null,
      claimedSeatId: 'm1',
      state: builtState,
    };
    setTripBook((prev) => [newEntry, ...prev]);
    setActiveTripId(newEntry.id);
    setPreReclusterByDay({});
    setWizardOverlayMode(null);
    setTripWizardError(null);
    setItineraryWarning(null);
    setTab('packing');
    showToast(appCopy.createdSavedTripToast(builtState.intel.routeTitle));
  };

  const handleExportPdf = async () => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallExportPdf);
      return;
    }
    setIsExportingPdf(true);
    try {
      const filename = await exportTripPdf(trip, {
        carryOnLimitKg: preferences.carryOnLimitKg,
        checkedLimitKg: preferences.checkedLimitKg,
        tripId: activeEntry.id,
        customCoverDataUrl,
        language: activeLang,
        unitSystem: preferences.unitSystem,
      });
      showToast(appCopy.exportedPdfToast(filename));
    } catch (err) {
      showToast(err instanceof Error ? err.message : appCopy.pdfExportFailed);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeleteLearnedCategory = (itemName: string) => {
    setTrip((prev) => {
      const nextMap = { ...(prev.learnedCategoryMap || {}) };
      delete nextMap[itemName];
      return { ...prev, learnedCategoryMap: nextMap };
    });
    showToast(appCopy.removedLearnedCatToast(itemName));
  };

  const handleClearLearnedCategories = () => {
    setTrip((prev) => ({ ...prev, learnedCategoryMap: {} }));
    showToast(appCopy.clearedLearnedCatsToast);
  };

  const handleRedeemProActivated = (result: RedeemActivationResult) => {
    handleUpdatePreferences({
      isProUnlocked: true,
      proPlan: result.planType,
      proExpiresAt: result.expiresAtMs,
      redeemedCode: result.code,
      trialSimulationMode: 'normal',
    });
    setProTriggerReason(null);
    const label =
      result.planType === 'lifetime' ? appCopy.proPlanLifetime : appCopy.proPlanOneYear;
    showToast(
      result.restoredExisting
        ? appCopy.proRestoredPlanToast(label)
        : appCopy.proRedeemedPlanToast(label)
    );
  };

  const handleDeactivatePro = () => {
    handleUpdatePreferences({
      isProUnlocked: false,
      proExpiresAt: null,
      redeemedCode: '',
    });
    showToast(appCopy.deactivatedProToast);
  };

  const handleImportBackupData = (payload: {
    tripBook: SavedTripEntry[];
    activeTripId?: string;
    preferences?: Partial<AppPreferences>;
  }) => {
    const normalizedBook: SavedTripEntry[] = payload.tripBook.map((entry) => ({
      ...entry,
      state: {
        ...entry.state,
        packing: normalizePackingGroups(entry.state.packing || []),
        smartBagOverrides: normalizeSmartBagOverrides(
          entry.state.smartBagOverrides,
          entry.state.packing || []
        ),
      },
    }));
    setTripBook(normalizedBook);
    const targetId =
      payload.activeTripId && normalizedBook.some((e) => e.id === payload.activeTripId)
        ? payload.activeTripId
        : normalizedBook[0].id;
    setActiveTripId(targetId);
    setPreReclusterByDay({});
    if (payload.preferences) {
      setPreferences((prev) => sanitizePreferences({ ...prev, ...payload.preferences }));
    }
    markOnboardingDone();
    setWizardOverlayMode(null);
    showToast(appCopy.importedBackupToast(normalizedBook.length));
  };

  const composeTripStateFromAiResponse = (
    data: Record<string, unknown>,
    baseState: TripState,
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    hasNaturalPrompt = false
  ): TripState => {
    const normalizedCrew = resizeCrewList(draftCrew, draftSetup.travelers);
    const defaultOwnerId = normalizedCrew[0]?.id || 'm1';
    const rawPacking = Array.isArray(data.packing) ? (data.packing as PackingGroup[]) : [];
    const isMultiTraveler = normalizedCrew.length >= 2;
    const formattedPacking: PackingGroup[] = applySizeScaleToPackingGroups(
      rawPacking.map((g: PackingGroup) => ({
        ...g,
        items: (g.items || []).map((it, idx) => {
          const isShared = isMultiTraveler && it.ownership === 'shared';
          const validSmartBag =
            it.smartBagId && VALID_BAG_IDS.has(it.smartBagId) ? it.smartBagId : undefined;
          return normalizePackingItemQuantity(
            {
              ...it,
              tag: normalizePackingTag(it.tag),
              smartBagId: validSmartBag,
              ownership: isShared ? ('shared' as const) : ('personal' as const),
              ownerId: isShared ? undefined : defaultOwnerId,
              createdAt: Date.now() + idx,
              done: false,
            },
            g.id
          );
        }),
      })),
      draftSetup.clothingSize || 'M'
    );

    const aiCities = Array.isArray(data.cities) ? (data.cities as string[]) : [];
    const nextCities = aiCities.length ? aiCities : draftSetup.cities;
    const nextDays = hasNaturalPrompt
      ? Math.min(30, Math.max(1, Math.round(Number(data.days) || draftSetup.days)))
      : Math.min(30, Math.max(1, Math.round(draftSetup.days)));
    const computeSyncedReturnDate = (depStr: string, dayCount: number, fallbackRet: string) => {
      if (!depStr || !/^\d{4}-\d{2}-\d{2}$/.test(depStr)) return fallbackRet;
      const parts = depStr.split('-').map(Number);
      const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + Math.max(0, dayCount - 1)));
      if (Number.isNaN(dt.getTime())) return fallbackRet;
      return dt.toISOString().slice(0, 10);
    };
    const nextReturnDate =
      nextDays !== draftSetup.days
        ? computeSyncedReturnDate(draftSetup.departureDate, nextDays, draftSetup.returnDate)
        : draftSetup.returnDate;
    const rawTimeline = Array.isArray(data.timeline)
      ? (data.timeline as Record<string, unknown>[])
      : [];
    const preserveExplicitCityDays =
      !hasNaturalPrompt &&
      Array.isArray(draftSetup.cityDays) &&
      draftSetup.cityDays.length === nextCities.length;
    const nextCityDays = preserveExplicitCityDays
      ? resolveCityDaysAllocation(nextCities, nextDays, draftSetup.cityDays)
      : inferCityDaysFromTimeline(
          nextCities,
          nextDays,
          rawTimeline.map((n) => ({
            day: Number(n.day) || 1,
            city: typeof n.city === 'string' ? n.city : undefined,
          }))
        );
    const formattedTimeline: TimelineNode[] = rawTimeline.map(
      (n: Record<string, unknown>, idx: number) => {
        const nodeDay = Math.max(1, Math.min(nextDays, Math.round(Number(n.day) || 1)));
        return {
          ...(n as unknown as TimelineNode),
          id: String(n.id || `ai_tl_${Date.now()}_${idx}`),
          day: nodeDay,
          city: String(
            n.city ||
              getPrimaryCityName(
                getCityForDay(nextCities, nodeDay, nextDays, undefined, undefined, nextCityDays)
              )
          ),
          lat: typeof n.lat === 'number' && Number.isFinite(n.lat) ? n.lat : undefined,
          lng: typeof n.lng === 'number' && Number.isFinite(n.lng) ? n.lng : undefined,
          visited: false,
          logged: false,
          linkedExpenseId: undefined,
        };
      }
    );

    const validTaskCategories: TripTaskCategory[] = [
      '门票预约',
      '交通接送',
      '住宿餐饮',
      '通讯金融',
      '其他事务',
    ];
    const rawTasks = Array.isArray(data.tasks)
      ? (data.tasks as Record<string, unknown>[])
      : [];
    const formattedTasks: TripTask[] = rawTasks.map(
      (t: Record<string, unknown>, idx: number) => ({
        id: String(t.id || `tk_ai_${Date.now()}_${idx}`),
        title: String(t.title || appCopy.fallbackTaskTitle),
        category: validTaskCategories.includes(t.category as TripTaskCategory)
          ? (t.category as TripTaskCategory)
          : '其他事务',
        timing: String(t.timing || appCopy.fallbackTaskTiming),
        note: t.note ? String(t.note) : undefined,
        ownerId: defaultOwnerId,
        done: false,
      })
    );

    const fallbackOffline = buildOfflineInitialTripState(
      { ...draftSetup, cities: nextCities, cityDays: nextCityDays, days: nextDays },
      normalizedCrew
    );
    const nextTimeline = restoreMissingProtectedNodes(
      baseState.timeline,
      formattedTimeline.length ? formattedTimeline : fallbackOffline.timeline,
      baseState.travelPasses,
      { maxDay: nextDays }
    );
    const day1Nodes = nextTimeline.filter((n) => (n.day ?? 1) === 1);
    const spatialSummaryStr =
      typeof data.spatialSummary === 'string' ? data.spatialSummary : '';
    const summariesByDay: Record<number, string> = {};
    const clusteredByDay: Record<number, boolean> = {};
    for (let d = 1; d <= nextDays; d += 1) {
      if (nextTimeline.some((n) => (n.day ?? 1) === d)) {
        summariesByDay[d] =
          spatialSummaryStr || appCopy.fallbackDayClustered(d);
        clusteredByDay[d] = true;
      }
    }

    const dailyBudget =
      Number(data.dailyBudgetLocal) || fallbackOffline.budget.dailyBudgetLocal;
    const aiPrepaidUsd =
      Number(data.prepaidBudgetUsd) > 0
        ? Math.round(Number(data.prepaidBudgetUsd))
        : fallbackOffline.budget.prepaidUsd;
    const fx = Number((data.intel as TripIntelligence | undefined)?.fxToUsd) || fallbackOffline.intel.fxToUsd;
    const computedTripTotalUsd =
      draftSetup.targetTotalBudgetUsd && draftSetup.targetTotalBudgetUsd > 0
        ? draftSetup.targetTotalBudgetUsd
        : Math.max(
            fallbackOffline.budget.tripTotalUsd,
            Math.round(aiPrepaidUsd + dailyBudget * fx * nextDays * 1.25)
          );

    return {
      ...baseState,
      setup: {
        ...draftSetup,
        cities: nextCities,
        cityDays: nextCityDays,
        days: nextDays,
        returnDate: nextReturnDate,
        travelers: normalizedCrew.length,
        tripStyle:
          (data.tripStyle as TripSetup['tripStyle']) || draftSetup.tripStyle,
      },
      crew: normalizedCrew,
      intel: (data.intel as TripIntelligence) || fallbackOffline.intel,
      packing: mergeAlwaysPackIntoGroups(
        filterGroupsAgainstNeverSuggest(
          formattedPacking.length ? formattedPacking : fallbackOffline.packing,
          neverSuggestItems
        ),
        alwaysPackLibrary,
        defaultOwnerId
      ).groups,
      tasks: formattedTasks.length ? formattedTasks : fallbackOffline.tasks,
      budget: {
        ...fallbackOffline.budget,
        tripTotalUsd: computedTripTotalUsd,
        prepaidUsd: aiPrepaidUsd,
        dailyBudgetLocal: dailyBudget,
        rolloverLocal: 0,
        partnerOwedLocal: 0,
      },
      activeFinanceDay: 1,
      expenses: [],
      settlementHistory: [],
      timeline: nextTimeline,
      meetup: syncMeetupFromDayNodes(day1Nodes, fallbackOffline.meetup),
      wishlist: Array.isArray(data.wishlist)
        ? (data.wishlist as TripState['wishlist'])
        : [],
      spatialSummary: spatialSummaryStr,
      spatialClustered: true,
      spatialSummariesByDay: summariesByDay,
      spatialClusteredByDay: clusteredByDay,
      rainSwapped: false,
      rainSwappedDays: {},
      smartBagOverrides: {},
      smartBagSummaryTip: '',
      packingViewMode: 'checklist',
    };
  };

  const handleCreateNewWithAi = async (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    naturalPrompt?: string
  ) => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiPlanTrip);
      return;
    }
    setTripWizardError(null);
    setIsGeneratingTrip(true);
    try {
      const data = (await fetchAiJsonWithRetry(
        '/api/ai/plan-trip',
        {
          naturalPrompt,
          setup: draftSetup,
          baggageLimits: {
            carryOnLimitKg: preferences.carryOnLimitKg,
            checkedLimitKg: preferences.checkedLimitKg,
            baggagePreset: preferences.baggagePreset,
          },
          blockedItems: neverSuggestItems,
          language: activeLang,
        },
        {
          onRetry: () => showToast(appCopy.aiRetryingToast),
        }
      )) as Record<string, unknown>;

      const nextTripState = composeTripStateFromAiResponse(
        data,
        DEFAULT_TRIP_STATE,
        draftSetup,
        draftCrew,
        Boolean(naturalPrompt && naturalPrompt.trim())
      );
      markOnboardingDone();

      if (wizardOverlayMode === 'onboarding') {
        setTrip(nextTripState);
      } else {
        resetSyncRefsForTripSwitch();
        const now = Date.now();
        const newEntry: SavedTripEntry = {
          id: `trip_ai_${now}`,
          createdAt: now,
          updatedAt: now,
          cloudRoomId: null,
          claimedSeatId: 'm1',
          state: nextTripState,
        };
        setTripBook((prev) => [newEntry, ...prev]);
        setActiveTripId(newEntry.id);
      }

      setPreReclusterByDay({});
      setWizardOverlayMode(null);
      setTripWizardError(null);
      setItineraryWarning(null);
      setTab('packing');
      showToast(appCopy.generatedSavedTripToast(nextTripState.intel.routeTitle));
    } catch (err) {
      const msg =
        err instanceof AiRequestError
          ? err.kind === 'timeout'
            ? appCopy.aiGenerationTimeout
            : err.kind === 'network'
            ? appCopy.aiNetworkInterrupted
            : err.message || appCopy.aiPlanTripFailed
          : appCopy.generationFailedKeyHint;
      setTripWizardError(msg);
      showToast(msg);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const handleRegenerateCurrentWithAi = async (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    naturalPrompt?: string
  ) => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiRegenTrip);
      return;
    }
    setTripWizardError(null);
    setIsGeneratingTrip(true);
    try {
      const data = (await fetchAiJsonWithRetry(
        '/api/ai/plan-trip',
        {
          naturalPrompt,
          setup: draftSetup,
          baggageLimits: {
            carryOnLimitKg: preferences.carryOnLimitKg,
            checkedLimitKg: preferences.checkedLimitKg,
            baggagePreset: preferences.baggagePreset,
          },
          blockedItems: neverSuggestItems,
          language: activeLang,
        },
        {
          onRetry: () => showToast(appCopy.aiRetryingToast),
        }
      )) as Record<string, unknown>;

      pushBusinessSnapshot(appCopy.snapshotLabelAiFullPlan, trip);
      const regenerated = composeTripStateFromAiResponse(
        data,
        trip,
        draftSetup,
        draftCrew,
        Boolean(naturalPrompt && naturalPrompt.trim())
      );
      setTrip(regenerated);
      setPreReclusterByDay({});
      markOnboardingDone();
      setWizardOverlayMode(null);
      setTripWizardError(null);
      setItineraryWarning(null);
      setTab('packing');
      showToast(appCopy.regeneratedTripToast(regenerated.intel.routeTitle));
    } catch (err) {
      const msg =
        err instanceof AiRequestError
          ? err.kind === 'timeout'
            ? appCopy.aiGenerationTimeout
            : err.kind === 'network'
            ? appCopy.aiNetworkInterrupted
            : err.message || appCopy.aiPlanTripFailed
          : appCopy.generationFailedKeyHint;
      setTripWizardError(msg);
      showToast(msg);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const handleGenerateCustomPackingList = async ({
    updatedSetupPatch,
    mergeMode,
    useInstantOffline,
  }: PackingWizardSubmitPayload) => {
    const nextSetup: TripSetup = {
      ...trip.setup,
      ...updatedSetupPatch,
    };
    const defaultOwnerId = trip.crew[0]?.id || 'm1';

    setPackingWizardError(null);

    if (useInstantOffline) {
      const offlineGroups = buildOfflineDeepPackingGroups({
        setup: nextSetup,
        intel: trip.intel,
        lang: activeLang,
        carryOnLimitKg: preferences.carryOnLimitKg,
        checkedLimitKg: preferences.checkedLimitKg,
        ownerId: defaultOwnerId,
        alwaysPackLibrary,
        neverSuggestItems,
      });
      const merged = mergeRegeneratedPackingGroups(trip.packing, offlineGroups, mergeMode);
      const totalItems = merged.groups.reduce((sum, g) => sum + g.items.length, 0);

      pushBusinessSnapshot(appCopy.snapshotLabelPackingRegen);
      setTrip((prev) => ({
        ...prev,
        setup: nextSetup,
        packing: merged.groups,
        smartBagOverrides: {},
      }));
      setIsPackingWizardOpen(false);
      setTab('packing');
      showToast(
        appCopy.generatedOfflinePackingToast(
          merged.groups.length,
          totalItems,
          merged.preservedDoneCount
        )
      );
      return;
    }

    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiPackingList);
      return;
    }

    setIsGeneratingPackingList(true);
    try {
      const perStopForecasts = buildPerStopWeatherForecasts(
        nextSetup.cities,
        nextSetup.departureDate,
        nextSetup.days,
        nextSetup.weatherOverrides || [],
        activeLang,
        nextSetup.cityDays
      );

      const data = (await fetchAiJsonWithRetry(
        '/api/ai/generate-packing-list',
        {
          setup: nextSetup,
          intel: trip.intel,
          perStopForecasts,
          baggageLimits: {
            carryOnLimitKg: preferences.carryOnLimitKg,
            checkedLimitKg: preferences.checkedLimitKg,
            baggagePreset: preferences.baggagePreset,
          },
          blockedItems: neverSuggestItems,
          language: activeLang,
        },
        {
          onRetry: () => showToast(appCopy.aiRetryingToast),
        }
      )) as { packing?: PackingGroup[] };

      const validColors: PackingGroup['colorKey'][] = [
        'teal',
        'lavender',
        'lemon',
        'peach',
        'rose',
        'mint',
      ];
      const rawGroups = Array.isArray(data.packing) ? (data.packing as PackingGroup[]) : [];
      if (rawGroups.length === 0) {
        throw new Error(appCopy.aiEmptyPackingListError);
      }

      const isMultiTraveler = trip.crew.length >= 2 || (nextSetup.travelers || 1) >= 2;
      const now = Date.now();
      const normalizedAiGroups: PackingGroup[] = rawGroups
        .map((g, gIdx) => {
          const colorKey = validColors.includes(g.colorKey)
            ? g.colorKey
            : validColors[gIdx % validColors.length];
          const groupId = String(g.id || `ai_grp_${gIdx}`);
          const items = (g.items || []).map((it, idx) => {
            const isShared = isMultiTraveler && it.ownership === 'shared';
            const validSmartBag =
              it.smartBagId && VALID_BAG_IDS.has(it.smartBagId) ? it.smartBagId : undefined;
            return normalizePackingItemQuantity(
              {
                ...it,
                id: String(it.id || `ai_pk_${now}_${gIdx}_${idx}`),
                tag: normalizePackingTag(it.tag),
                smartBagId: validSmartBag,
                ownership: isShared ? ('shared' as const) : ('personal' as const),
                ownerId: isShared ? undefined : defaultOwnerId,
                createdAt: now + gIdx * 40 + idx,
                done: false,
              },
              groupId
            );
          });
          return {
            id: groupId,
            title: String(g.title || groupId),
            cubeLabel: String(g.cubeLabel || ''),
            colorKey,
            items,
          };
        })
        .filter((g) => g.items.length > 0);

      // Note: AI prompt already calibrated unitWeightGrams for clothingSize, so avoid double-scaling AI output;
      // only filter blocklist + merge Always Pack library + merge packed progress.
      const filteredGroups = filterGroupsAgainstNeverSuggest(normalizedAiGroups, neverSuggestItems);
      const withAlwaysPack = mergeAlwaysPackIntoGroups(
        filteredGroups,
        alwaysPackLibrary,
        defaultOwnerId
      ).groups;
      const merged = mergeRegeneratedPackingGroups(trip.packing, withAlwaysPack, mergeMode);
      const totalItems = merged.groups.reduce((sum, g) => sum + g.items.length, 0);

      pushBusinessSnapshot(appCopy.snapshotLabelPackingRegen);
      setTrip((prev) => ({
        ...prev,
        setup: nextSetup,
        packing: merged.groups,
        smartBagOverrides: {},
      }));
      setIsPackingWizardOpen(false);
      setPackingWizardError(null);
      setTab('packing');
      showToast(
        appCopy.aiBuiltPackingToast(
          merged.groups.length,
          totalItems,
          merged.preservedDoneCount
        )
      );
    } catch (err) {
      const msg =
        err instanceof AiRequestError
          ? err.kind === 'timeout'
            ? appCopy.aiGenerationTimeout
            : err.kind === 'network'
            ? appCopy.aiNetworkInterrupted
            : err.message || appCopy.aiPackingListFailed
          : err instanceof Error &&
            err.message &&
            !/Load failed|Failed to fetch|AbortError|NetworkError/i.test(err.message)
          ? err.message
          : appCopy.aiPackingFailedKeyHint;
      setPackingWizardError(msg);
    } finally {
      setIsGeneratingPackingList(false);
    }
  };

  const handleSmartSeedPassesFromTrip = useCallback((): {
    addedCount: number;
    firstPassId?: string;
  } => {
    const { mergedPasses, addedCount } = buildSmartSeededPassesFromTrip(trip, activeLang);
    if (addedCount > 0) {
      setTrip((prev) => ({
        ...prev,
        travelPasses: mergedPasses,
      }));
    }
    return {
      addedCount,
      firstPassId: mergedPasses[0]?.id,
    };
  }, [trip, activeLang]);

  const handleOpenGoModeWallet = useCallback(
    (dayFilter?: number) => {
      let focusId: string | null = null;
      if (!trip.travelPasses || trip.travelPasses.length === 0) {
        const { mergedPasses, addedCount } = buildSmartSeededPassesFromTrip(trip, activeLang);
        if (addedCount > 0) {
          setTrip((prev) => ({
            ...prev,
            travelPasses: mergedPasses,
          }));
          focusId =
            dayFilter !== undefined
              ? mergedPasses.find((p) => (p.day ?? 1) === dayFilter)?.id ?? mergedPasses[0]?.id ?? null
              : null;
        }
      } else if (dayFilter !== undefined) {
        focusId =
          trip.travelPasses.find((p) => (p.day ?? 1) === dayFilter)?.id ?? null;
      }
      setGoModeFilterDay(dayFilter ?? null);
      setGoModeFocusPassId(focusId);
      setGoModeOpen(true);
    },
    [trip, activeLang]
  );

  const handleOpenItemInGoMode = useCallback(
    (item: PackingItem, groupId: string) => {
      const baseSeeded =
        !trip.travelPasses || trip.travelPasses.length === 0
          ? buildSmartSeededPassesFromTrip(trip, activeLang).mergedPasses
          : [...trip.travelPasses];

      let match = baseSeeded.find(
        (p) =>
          p.linkedPackingItemId === item.id ||
          p.title.trim().toLowerCase() === item.name.trim().toLowerCase()
      );

      if (!match) {
        const groupTitle = trip.packing.find((g) => g.id === groupId)?.title || '';
        match = {
          id: `pass_${Date.now()}`,
          category: inferPassCategoryFromName(item.name),
          title: item.name,
          subtitle: item.why || groupTitle,
          day: 1,
          dateTimeLabel: trip.setup.departureDate || 'Day 1',
          linkedPackingItemId: item.id,
          status: item.done ? 'ready' : 'pending',
          updatedAt: Date.now(),
        };
        baseSeeded.unshift(match);
      }

      const targetId = match.id;
      setTrip((prev) => ({
        ...prev,
        travelPasses: baseSeeded,
      }));
      setGoModeFilterDay(null);
      setGoModeFocusPassId(targetId);
      setGoModeOpen(true);
    },
    [trip, activeLang]
  );

  const handleUpsertTravelPass = useCallback(
    (nextPass: TravelPass, markLinkedPackingDone = false) => {
      setTrip((prev) => {
        const current = prev.travelPasses || [];
        const exists = current.some((p) => p.id === nextPass.id);
        const updatedPasses = exists
          ? current.map((p) => (p.id === nextPass.id ? nextPass : p))
          : [nextPass, ...current];

        const updatedPacking =
          markLinkedPackingDone && nextPass.linkedPackingItemId
            ? prev.packing.map((grp) => ({
                ...grp,
                items: grp.items.map((it) =>
                  it.id === nextPass.linkedPackingItemId ? { ...it, done: true } : it
                ),
              }))
            : prev.packing;

        return {
          ...prev,
          travelPasses: updatedPasses,
          packing: updatedPacking,
        };
      });
    },
    []
  );

  const handleDeleteTravelPass = useCallback((passId: string) => {
    setTrip((prev) => ({
      ...prev,
      travelPasses: (prev.travelPasses || []).filter((p) => p.id !== passId),
    }));
  }, []);

  const handleOpenPassByIdInGoMode = useCallback((passId: string) => {
    setGoModeFilterDay(null);
    setGoModeFocusPassId(passId);
    setGoModeOpen(true);
  }, []);

  const handleUpdateDayStay = useCallback(
    (day: number, stay: DayStayAnchor | null, applyToSameCityDays = false) => {
      setTrip((prev) => {
        const nextStays: Record<number, DayStayAnchor> = { ...(prev.dayStays || {}) };
        const totalDaysCount = Math.max(1, prev.setup.days || 1);
        if (!stay) {
          delete nextStays[day];
        } else if (applyToSameCityDays) {
          const targetDayNodes = prev.timeline.filter((n) => (n.day ?? 1) === day);
          const targetCity = getPrimaryCityName(
            getCityForDay(
              prev.setup.cities,
              day,
              totalDaysCount,
              targetDayNodes,
              undefined,
              prev.setup.cityDays
            )
          );
          for (let d = 1; d <= totalDaysCount; d += 1) {
            const dNodes = prev.timeline.filter((n) => (n.day ?? 1) === d);
            const dCity = getPrimaryCityName(
              getCityForDay(
                prev.setup.cities,
                d,
                totalDaysCount,
                dNodes,
                undefined,
                prev.setup.cityDays
              )
            );
            if (d === day || (targetCity && dCity === targetCity)) {
              nextStays[d] = stay;
            }
          }
        } else {
          nextStays[day] = stay;
        }
        return {
          ...prev,
          dayStays: nextStays,
        };
      });
      if (stay) {
        showToast(appCopy.savedStayToast(stay.placeName));
      }
    },
    [appCopy, showToast]
  );

  const handleTogglePackItem = (groupId: string, itemId: string, actorId = 'm1') => {
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) => {
                if (it.id !== itemId) return it;
                const nextDone = !it.done;
                return {
                  ...it,
                  done: nextDone,
                  packedByMemberId:
                    it.ownership === 'shared'
                      ? nextDone
                        ? actorId === 'all'
                          ? it.ownerId || 'm1'
                          : actorId
                        : undefined
                      : it.packedByMemberId,
                };
              }),
            }
      ),
    }));
  };

  const handleAddPackItem = (
    groupId: string,
    name: string,
    why: string,
    carryOnOnly: boolean,
    ownerId = 'm1',
    _ownership: 'personal' | 'shared' = 'personal',
    quantity = 1,
    unitWeightGrams?: number,
    toBuy = false
  ) => {
    const { cleanName, parsedQty } = parseNameAndQuantity(name);
    const finalName = cleanName || name.trim();
    const finalQty = Math.max(1, Math.min(99, Math.round(quantity > 1 ? quantity : parsedQty ?? quantity)));
    const finalUnitWeight = Math.max(
      5,
      Math.round(unitWeightGrams ?? estimateDefaultUnitWeightGrams(finalName, groupId))
    );
    const finalTotalWeight = finalUnitWeight * finalQty;

    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: [
                ...g.items,
                {
                  id: `u_${Date.now()}`,
                  name: finalName,
                  why,
                  tag: '备用',
                  quantity: finalQty,
                  unitWeightGrams: finalUnitWeight,
                  weightGrams: finalTotalWeight,
                  carryOnOnly,
                  remindBeforeDeparture: carryOnOnly,
                  toBuy: toBuy ? true : undefined,
                  ownership: 'personal',
                  ownerId: ownerId === 'all' ? prev.crew[0]?.id || 'm1' : ownerId,
                  packingLayer: carryOnOnly ? 'carry_on' : 'top_small',
                  createdAt: Date.now(),
                  done: false,
                },
              ],
            }
      ),
    }));
    const weightDisplay = formatItemWeightByPref(finalTotalWeight, preferences.unitSystem);
    const labelWithQty = finalQty > 1 ? `${finalName} ×${finalQty}` : finalName;
    showToast(appCopy.addedPackItemToast(labelWithQty, weightDisplay));
  };

  const handleAdjustItemQuantity = (groupId: string, itemId: string, delta: number) => {
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((it) => {
            if (it.id !== itemId) return it;
            const currQty = getItemQuantity(it);
            const nextQty = Math.max(1, Math.min(99, currQty + delta));
            if (nextQty === currQty) return it;
            const unitW = getItemUnitWeight(it, g.id);
            const { cleanName } = parseNameAndQuantity(it.name);
            return {
              ...it,
              name: cleanName || it.name,
              quantity: nextQty,
              unitWeightGrams: unitW,
              weightGrams: Math.max(0, unitW * nextQty),
            };
          }),
        };
      }),
    }));
  };

  const handleAddPackGroup = (
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey'] = 'teal',
    icon = '📦'
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const newGroup: PackingGroup = {
      id: `grp_${Date.now()}`,
      title: cleanTitle,
      icon,
      cubeLabel: cubeLabel.trim() || appCopy.customPackingCubeFallback,
      colorKey,
      items: [],
    };
    setTrip((prev) => ({
      ...prev,
      packing: [...prev.packing, newGroup],
    }));
    showToast(appCopy.createdCategoryToast(cleanTitle));
  };

  const handleUpdatePackGroup = (
    groupId: string,
    title: string,
    cubeLabel: string,
    colorKey: PackingGroup['colorKey'],
    icon?: string
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              title: cleanTitle,
              icon: icon || g.icon,
              cubeLabel: cubeLabel.trim() || g.cubeLabel,
              colorKey,
            }
      ),
    }));
    showToast(appCopy.updatedCategoryToast(cleanTitle));
  };

  const handleDeletePackGroup = (groupId: string) => {
    setTrip((prev) => {
      if (prev.packing.length <= 1) return prev;
      const target = prev.packing.find((g) => g.id === groupId);
      if (!target) return prev;
      const remaining = prev.packing.filter((g) => g.id !== groupId);
      if (target.items.length > 0 && remaining[0]) {
        remaining[0] = {
          ...remaining[0],
          items: [...remaining[0].items, ...target.items],
        };
      }
      return { ...prev, packing: remaining };
    });
    showToast(appCopy.deletedCategoryToast);
  };

  const handleUpdatePackItem = (
    groupId: string,
    itemId: string,
    updates: Partial<PackingItem>,
    targetGroupId?: string,
    silent = false
  ) => {
    setTrip((prev) => {
      const srcGroup = prev.packing.find((g) => g.id === groupId);
      const srcItem = srcGroup?.items.find((it) => it.id === itemId);
      if (!srcItem) return prev;
      const mergedRaw: PackingItem = { ...srcItem, ...updates };
      const destId = targetGroupId && targetGroupId !== groupId ? targetGroupId : groupId;
      const updatedItem = normalizePackingItemQuantity(mergedRaw, destId);
      const destGroup = prev.packing.find((g) => g.id === destId);
      if (updates.alwaysPack === true && destGroup) {
        setAlwaysPackLibrary(upsertAlwaysPackItem(updatedItem, destGroup.id, destGroup.title));
      } else if (updates.alwaysPack === false && srcItem.alwaysPack) {
        setAlwaysPackLibrary(removeAlwaysPackItemByName(updatedItem.name));
      }

      const nextPacking = prev.packing.map((g) => {
        if (destId === groupId) {
          return g.id !== groupId
            ? g
            : { ...g, items: g.items.map((it) => (it.id === itemId ? updatedItem : it)) };
        }
        if (g.id === groupId) {
          return { ...g, items: g.items.filter((it) => it.id !== itemId) };
        }
        if (g.id === destId) {
          return { ...g, items: [...g.items, updatedItem] };
        }
        return g;
      });

      const nextLearned =
        destId !== groupId && destGroup
          ? { ...(prev.learnedCategoryMap || {}), [updatedItem.name]: destGroup.title }
          : prev.learnedCategoryMap;

      return {
        ...prev,
        packing: nextPacking,
        learnedCategoryMap: nextLearned,
      };
    });
    if (!silent) {
      showToast(appCopy.savedItemChangesToast(updates.name));
    }
  };

  const handleDeletePackItem = (groupId: string, itemId: string) => {
    let deletedName = '';
    setTrip((prev) => {
      const nextOverrides = { ...(prev.smartBagOverrides || {}) };
      delete nextOverrides[itemId];
      return {
        ...prev,
        smartBagOverrides: nextOverrides,
        packing: prev.packing.map((g) => {
          if (g.id !== groupId) return g;
          const found = g.items.find((it) => it.id === itemId);
          if (found) deletedName = found.name;
          return { ...g, items: g.items.filter((it) => it.id !== itemId) };
        }),
      };
    });
    showToast(appCopy.removedItemToast(deletedName));
  };

  const handleCycleOwnership = (
    groupId: string,
    itemId: string,
    _mode: 'member' | 'ownership' = 'member'
  ) => {
    let feedback = appCopy.switchedItemOwnerFallback;
    setTrip((prev) => {
      const members =
        prev.crew.length > 0 ? prev.crew : [{ id: 'm1', name: appCopy.selfFallback }];
      return {
        ...prev,
        packing: prev.packing.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                items: g.items.map((it) => {
                  if (it.id !== itemId) return it;
                  const currentOwnerId = it.ownerId ?? members[0].id;
                  const currentIdx = members.findIndex((m) => m.id === currentOwnerId);
                  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % members.length : 0;
                  const nextMember = members[nextIdx];
                  const displayOwner = translateMemberName(nextMember.name, activeLang);
                  feedback = appCopy.assignedItemOwnerToast(it.name, displayOwner);
                  return {
                    ...it,
                    ownership: 'personal',
                    ownerId: nextMember.id,
                    packedByMemberId: undefined,
                  };
                }),
              }
        ),
      };
    });
    showToast(feedback);
  };

  const handleToggleMorningOfDeparture = (groupId: string, itemId: string) => {
    let nextVal = false;
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) => {
                if (it.id !== itemId) return it;
                nextVal = !it.morningOfDeparture;
                return {
                  ...it,
                  morningOfDeparture: nextVal,
                  remindBeforeDeparture: nextVal ? true : it.remindBeforeDeparture,
                };
              }),
            }
      ),
    }));
    showToast(
      nextVal
        ? appCopy.markedMorningDepartureToast
        : appCopy.unmarkedMorningDepartureToast
    );
  };

  const handleToggleToBuy = (groupId: string, itemId: string) => {
    const srcGrp = trip.packing.find((g) => g.id === groupId);
    const srcItem = srcGrp?.items.find((it) => it.id === itemId);
    if (!srcItem) return;
    const nextVal = !srcItem.toBuy;
    const itemName = srcItem.name;
    const alertId = `pk_tobuy_${itemId}`;

    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) =>
                it.id === itemId ? { ...it, toBuy: nextVal } : it
              ),
            }
      ),
    }));

    if (nextVal) {
      const depDateStr = trip.setup.departureDate;
      const parsedDep = depDateStr ? new Date(`${depDateStr}T10:00:00`).getTime() : NaN;
      const nowMs = Date.now();
      let triggerAtMs = nowMs + 24 * 3600_000;
      if (Number.isFinite(parsedDep)) {
        const fourteenDaysBefore = parsedDep - 14 * 24 * 3600_000;
        if (fourteenDaysBefore > nowMs + 30 * 60_000) {
          triggerAtMs = fourteenDaysBefore;
        } else if (parsedDep > nowMs + 2 * 3600_000) {
          const tomorrow10am = new Date();
          tomorrow10am.setDate(tomorrow10am.getDate() + 1);
          tomorrow10am.setHours(10, 0, 0, 0);
          triggerAtMs = Math.min(parsedDep - 2 * 3600_000, Math.max(nowMs + 3600_000, tomorrow10am.getTime()));
        }
      }

      updateActiveTripNotifState((prev) => ({
        ...prev,
        customAlerts: [
          ...prev.customAlerts.filter((c) => c.id !== alertId),
          {
            id: alertId,
            kind: 'packing_custom',
            title: appCopy.toBuyAlertTitle(itemName),
            note: appCopy.toBuyAlertNote,
            triggerAtMs,
            targetTab: 'packing',
            createdAtMs: nowMs,
          },
        ],
      }));

      showToast(appCopy.addedToBuyToast(itemName));
    } else {
      updateActiveTripNotifState((prev) => ({
        ...prev,
        customAlerts: prev.customAlerts.filter((c) => c.id !== alertId),
      }));
      showToast(appCopy.markedPurchasedToast(itemName));
    }
  };

  const handleToggleAlwaysPack = (groupId: string, itemId: string) => {
    const grp = trip.packing.find((g) => g.id === groupId);
    const targetItem = grp?.items.find((it) => it.id === itemId);
    if (!grp || !targetItem) return;
    const nextVal = !targetItem.alwaysPack;

    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) =>
                it.id === itemId ? { ...it, alwaysPack: nextVal } : it
              ),
            }
      ),
    }));

    if (nextVal) {
      setAlwaysPackLibrary(upsertAlwaysPackItem(targetItem, grp.id, grp.title));
      showToast(appCopy.addedAlwaysPackToast(targetItem.name));
    } else {
      setAlwaysPackLibrary(removeAlwaysPackItemByName(targetItem.name));
      showToast(appCopy.removedAlwaysPackToast(targetItem.name));
    }
  };

  const handleSwitchItemCabinCheckIn = (
    groupId: string,
    itemId: string,
    targetLocation: 'cabin' | 'checkin'
  ) => {
    setTrip((prev) => {
      const srcGroup = prev.packing.find((g) => g.id === groupId);
      const srcItem = srcGroup?.items.find((it) => it.id === itemId);
      if (!srcGroup || !srcItem) return prev;

      const resolvedBag = resolveSmartBagForLocationSwitch(
        srcItem,
        srcGroup,
        targetLocation,
        prev.smartBagOverrides
      );
      const nextCarryOn = targetLocation === 'cabin';

      return {
        ...prev,
        smartBagOverrides: {
          ...(prev.smartBagOverrides || {}),
          [itemId]: resolvedBag,
        },
        packing: prev.packing.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                items: g.items.map((it) =>
                  it.id === itemId
                    ? {
                        ...it,
                        carryOnOnly: nextCarryOn,
                        smartBagId: resolvedBag,
                        packingLayer: nextCarryOn ? 'carry_on' : 'middle',
                      }
                    : it
                ),
              }
        ),
      };
    });
  };

  const handleDontSuggestItemAgain = (groupId: string, itemId: string) => {
    const grp = trip.packing.find((g) => g.id === groupId);
    const targetItem = grp?.items.find((it) => it.id === itemId);
    const targetName = targetItem?.name || '';

    setTrip((prev) => {
      const nextOverrides = { ...(prev.smartBagOverrides || {}) };
      delete nextOverrides[itemId];
      return {
        ...prev,
        smartBagOverrides: nextOverrides,
        packing: prev.packing.map((g) =>
          g.id !== groupId
            ? g
            : { ...g, items: g.items.filter((it) => it.id !== itemId) }
        ),
      };
    });

    updateActiveTripNotifState((prev) => ({
      ...prev,
      customAlerts: prev.customAlerts.filter((c) => c.id !== `pk_tobuy_${itemId}`),
    }));

    if (targetName) {
      setAlwaysPackLibrary(removeAlwaysPackItemByName(targetName));
      setNeverSuggestItems(addNeverSuggestItem(targetName));
    }

    showToast(appCopy.removedDontSuggestToast(targetName));
  };

  const handleSyncAlwaysPack = () => {
    if (alwaysPackLibrary.length === 0) return;
    const res = mergeAlwaysPackIntoGroups(
      trip.packing,
      alwaysPackLibrary,
      trip.crew[0]?.id || 'm1'
    );
    if (res.addedCount === 0 && res.syncedCount === 0) {
      showToast(appCopy.allAlwaysPackAlreadyToast);
      return;
    }
    setTrip((prev) => ({ ...prev, packing: res.groups }));
    showToast(appCopy.syncedAlwaysPackToast(res.addedCount));
  };

  const handleSeedAlwaysPack = () => {
    const seeded = seedCoreAlwaysPackFromGroups(trip.packing, activeLang);
    if (seeded.length === 0) {
      showToast(appCopy.noCoreEssentialsToast);
      return;
    }
    setAlwaysPackLibrary(seeded);
    const res = mergeAlwaysPackIntoGroups(
      trip.packing,
      seeded,
      trip.crew[0]?.id || 'm1'
    );
    setTrip((prev) => ({ ...prev, packing: res.groups }));
    showToast(appCopy.extractedAlwaysPackToast(seeded.length));
  };

  const handleRemoveFromAlwaysPackLibrary = (templateId: string, itemName: string) => {
    const nextLib = removeAlwaysPackItemById(templateId);
    setAlwaysPackLibrary(nextLib);
    const key = itemName.trim().toLowerCase();
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) => ({
        ...g,
        items: g.items.map((it) =>
          it.name.trim().toLowerCase() === key ? { ...it, alwaysPack: false } : it
        ),
      })),
    }));
    showToast(appCopy.removedAlwaysPackToast(itemName));
  };

  const handleQuickAddAffiliateGear = (pick: DestinationGearGapPick) => {
    const targetGrp =
      trip.packing.find((g) => g.id === pick.targetGroupId) || trip.packing[0];
    if (!targetGrp) return;
    const ownerId =
      claimedSeatId && trip.crew.some((m) => m.id === claimedSeatId)
        ? claimedSeatId
        : trip.crew[0]?.id || 'm1';

    const newItem: PackingItem = {
      id: `item_gear_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: pick.name,
      why: pick.why,
      tag: '必需',
      quantity: 1,
      unitWeightGrams: pick.unitWeightGrams,
      weightGrams: pick.unitWeightGrams,
      carryOnOnly: pick.carryOnOnly,
      smartBagId: pick.smartBagId,
      packingLayer: pick.carryOnOnly ? 'carry_on' : 'middle',
      ownership: 'personal',
      ownerId,
      createdAt: Date.now(),
      done: false,
      toBuy: true,
    };

    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id === targetGrp.id ? { ...g, items: [newItem, ...g.items] } : g
      ),
    }));
    showToast(appCopy.quickAddGearToast(pick.name));
  };

  const handleReorderGroups = (sourceGroupId: string, targetGroupId: string) => {
    if (sourceGroupId === targetGroupId) return;
    setTrip((prev) => {
      const next = [...prev.packing];
      const fromIdx = next.findIndex((g) => g.id === sourceGroupId);
      const toIdx = next.findIndex((g) => g.id === targetGroupId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, packing: next, packingSortMode: 'custom' };
    });
  };

  const handleMoveOrReorderItem = (
    sourceGroupId: string,
    sourceItemId: string,
    targetGroupId: string,
    targetItemId?: string
  ) => {
    if (sourceGroupId === targetGroupId && sourceItemId === targetItemId) return;
    let movedItemName = '';
    let targetGroupTitle = '';
    const isCrossGroup = sourceGroupId !== targetGroupId;

    setTrip((prev) => {
      const srcGroup = prev.packing.find((g) => g.id === sourceGroupId);
      const dstGroup = prev.packing.find((g) => g.id === targetGroupId);
      if (!srcGroup || !dstGroup) return prev;
      const itemToMove = srcGroup.items.find((it) => it.id === sourceItemId);
      if (!itemToMove) return prev;

      movedItemName = itemToMove.name;
      targetGroupTitle = dstGroup.title;

      const nextPacking = prev.packing.map((g) => {
        if (g.id === sourceGroupId && g.id === targetGroupId) {
          const filtered = g.items.filter((it) => it.id !== sourceItemId);
          const idx = targetItemId ? filtered.findIndex((it) => it.id === targetItemId) : filtered.length;
          const insertAt = idx === -1 ? filtered.length : idx;
          filtered.splice(insertAt, 0, itemToMove);
          return { ...g, items: filtered };
        }
        if (g.id === sourceGroupId) {
          return { ...g, items: g.items.filter((it) => it.id !== sourceItemId) };
        }
        if (g.id === targetGroupId) {
          const copy = [...g.items];
          const idx = targetItemId ? copy.findIndex((it) => it.id === targetItemId) : copy.length;
          const insertAt = idx === -1 ? copy.length : idx;
          copy.splice(insertAt, 0, itemToMove);
          return { ...g, items: copy };
        }
        return g;
      });

      const nextLearned = isCrossGroup
        ? { ...(prev.learnedCategoryMap || {}), [itemToMove.name]: dstGroup.title }
        : prev.learnedCategoryMap;

      return {
        ...prev,
        packing: nextPacking,
        packingSortMode: 'custom',
        learnedCategoryMap: nextLearned,
      };
    });

    if (isCrossGroup && movedItemName && targetGroupTitle) {
      showToast(appCopy.movedItemRememberedToast(targetGroupTitle, movedItemName));
    }
  };

  const handleClassifyAndAddPackItem = async (
    inputText: string,
    activeMemberId: string
  ): Promise<{
    duplicateCandidateId: string;
    duplicateQuestion: string;
    pendingPayload: {
      item: Omit<PackingItem, 'id' | 'done'>;
      targetGroupId: string;
      newGroupTitle: string;
      newGroupCubeLabel: string;
      newGroupColorKey: PackingGroup['colorKey'];
    };
  } | null> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiClassify);
      throw new Error('PRO_PAYWALL_GATED');
    }
    const member = trip.crew.find((m) => m.id === activeMemberId) || trip.crew[0];
    const existingGroups = trip.packing.map((g) => ({ id: g.id, title: g.title }));
    const existingItems = trip.packing.flatMap((g) =>
      g.items.map((it) => ({
        id: it.id,
        name: it.name,
        ownership: it.ownership || 'personal',
        ownerName: trip.crew.find((c) => c.id === it.ownerId)?.name || appCopy.selfFallback,
      }))
    );

    const res = await fetch(resolveApiUrl('/api/ai/classify-pack-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputText,
        existingGroups,
        existingItems,
        learnedPreferences: trip.learnedCategoryMap || {},
        activeMemberName: member?.name || appCopy.selfFallback,
        routeTitle: trip.intel.routeTitle,
        language: activeLang,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || appCopy.aiClassifyFailed);
    }

    const validColor: PackingGroup['colorKey'] =
      data.newGroupColorKey === 'lavender' ||
      data.newGroupColorKey === 'lemon' ||
      data.newGroupColorKey === 'peach' ||
      data.newGroupColorKey === 'rose' ||
      data.newGroupColorKey === 'mint'
        ? data.newGroupColorKey
        : 'teal';
    const validLayer: PackingLayer =
      data.packingLayer === 'bottom_heavy' ||
      data.packingLayer === 'middle' ||
      data.packingLayer === 'carry_on'
        ? data.packingLayer
        : 'top_small';
    const validTag: PackingItem['tag'] =
      data.tag === '必需' || data.tag === '核心' || data.tag === '天气' || data.tag === '保暖'
        ? data.tag
        : '备用';

    const resolvedOwnerId = activeMemberId === 'all' ? trip.crew[0]?.id || 'm1' : activeMemberId;
    const { cleanName: mainCleanName, parsedQty: mainParsedQty } = parseNameAndQuantity(
      String(data.name || inputText)
    );
    const mainQty = Math.max(
      1,
      Math.min(99, Math.round(Number(data.quantity) || mainParsedQty || 1))
    );
    const mainUnitW = Math.max(
      5,
      Math.round(
        Number(data.unitWeightGrams) ||
          (Number(data.weightGrams) ? Number(data.weightGrams) / mainQty : 0) ||
          estimateDefaultUnitWeightGrams(mainCleanName || inputText, data.targetGroupId)
      )
    );

    const pendingPayload = {
      item: {
        name: mainCleanName || String(data.name || inputText),
        subCategory: data.subCategory ? String(data.subCategory).trim() : undefined,
        why: data.why || appCopy.aiWhyFallback,
        tag: validTag,
        quantity: mainQty,
        unitWeightGrams: mainUnitW,
        weightGrams: mainUnitW * mainQty,
        carryOnOnly: Boolean(data.carryOnOnly),
        remindBeforeDeparture: Boolean(data.carryOnOnly || data.morningOfDeparture),
        morningOfDeparture: Boolean(data.morningOfDeparture),
        packingLayer: validLayer,
        ownership: 'personal' as const,
        ownerId: resolvedOwnerId,
        createdAt: Date.now(),
      },
      targetGroupId: data.targetGroupId || '',
      newGroupTitle: data.newGroupTitle || '',
      newGroupCubeLabel: data.newGroupCubeLabel || appCopy.aiNewCubeLabelFallback,
      newGroupColorKey: validColor,
    };

    const rawExtras = Array.isArray(data.extraItems) ? data.extraItems : [];
    if (rawExtras.length > 0) {
      setTrip((prev) => {
        const fallbackGroupId =
          prev.packing.find((g) => g.id === 'extras')?.id || prev.packing[0]?.id || '';
        const additionsByGroup = new Map<string, PackingItem[]>();

        rawExtras.forEach((ex: Record<string, unknown>, idx: number) => {
          const rawExName = String(ex.name || '').trim();
          if (!rawExName) return;
          const { cleanName: exClean, parsedQty: exParsedQty } = parseNameAndQuantity(rawExName);
          const exName = exClean || rawExName;
          const exLayer: PackingLayer =
            ex.packingLayer === 'bottom_heavy' ||
            ex.packingLayer === 'middle' ||
            ex.packingLayer === 'carry_on'
              ? ex.packingLayer
              : 'top_small';
          const exTag: PackingItem['tag'] =
            ex.tag === '必需' || ex.tag === '核心' || ex.tag === '天气' || ex.tag === '保暖'
              ? ex.tag
              : '备用';
          const matchedGrp = prev.packing.find((g) => g.id === String(ex.targetGroupId || ''));
          const destGroupId = matchedGrp ? matchedGrp.id : fallbackGroupId;
          const exQty = Math.max(
            1,
            Math.min(99, Math.round(Number(ex.quantity) || exParsedQty || 1))
          );
          const exUnitW = Math.max(
            5,
            Math.round(
              Number(ex.unitWeightGrams) ||
                (Number(ex.weightGrams) ? Number(ex.weightGrams) / exQty : 0) ||
                estimateDefaultUnitWeightGrams(exName, destGroupId)
            )
          );
          const itemObj: PackingItem = {
            id: `ai_ex_${Date.now()}_${idx}`,
            name: exName,
            subCategory: ex.subCategory ? String(ex.subCategory).trim() : undefined,
            why: String(ex.why || appCopy.aiVoiceWhyFallback),
            tag: exTag,
            quantity: exQty,
            unitWeightGrams: exUnitW,
            weightGrams: exUnitW * exQty,
            carryOnOnly: Boolean(ex.carryOnOnly),
            remindBeforeDeparture: Boolean(ex.carryOnOnly || ex.morningOfDeparture),
            morningOfDeparture: Boolean(ex.morningOfDeparture),
            packingLayer: exLayer,
            ownership: 'personal',
            ownerId: resolvedOwnerId,
            createdAt: Date.now() + idx + 1,
            done: false,
          };
          const arr = additionsByGroup.get(destGroupId) || [];
          arr.push(itemObj);
          additionsByGroup.set(destGroupId, arr);
        });

        if (additionsByGroup.size === 0) return prev;
        return {
          ...prev,
          packing: prev.packing.map((g) => {
            const added = additionsByGroup.get(g.id);
            return added ? { ...g, items: [...g.items, ...added] } : g;
          }),
        };
      });
    }

    if (data.duplicateCandidateId && data.duplicateQuestion) {
      return {
        duplicateCandidateId: data.duplicateCandidateId,
        duplicateQuestion: data.duplicateQuestion,
        pendingPayload,
      };
    }

    handleCommitClassifiedItem(pendingPayload, false);
    if (rawExtras.length > 0) {
      showToast(appCopy.aiSortedMultiToast(rawExtras.length + 1));
    }
    return null;
  };

  const handleCommitClassifiedItem = (
    payload: {
      item: Omit<PackingItem, 'id' | 'done'>;
      targetGroupId: string;
      newGroupTitle: string;
      newGroupCubeLabel: string;
      newGroupColorKey: PackingGroup['colorKey'];
    },
    forcePersonal: boolean
  ) => {
    const newItem: PackingItem = {
      ...payload.item,
      ownership: forcePersonal ? 'personal' : payload.item.ownership,
      id: `ai_${Date.now()}`,
      done: false,
    };

    let createdGroupTitle = '';
    let matchedGroupTitle = '';

    setTrip((prev) => {
      const targetExists = prev.packing.find((g) => g.id === payload.targetGroupId);
      if (targetExists) {
        matchedGroupTitle = targetExists.title;
        return {
          ...prev,
          packing: prev.packing.map((g) =>
            g.id !== targetExists.id ? g : { ...g, items: [...g.items, newItem] }
          ),
        };
      }

      const desiredTitle =
        payload.newGroupTitle || appCopy.personalExtrasFallback;
      const sameTitleGroup = prev.packing.find((g) => g.title === desiredTitle);
      if (sameTitleGroup) {
        matchedGroupTitle = sameTitleGroup.title;
        return {
          ...prev,
          packing: prev.packing.map((g) =>
            g.id !== sameTitleGroup.id ? g : { ...g, items: [...g.items, newItem] }
          ),
        };
      }

      createdGroupTitle = desiredTitle;
      const newGroup: PackingGroup = {
        id: `grp_${Date.now()}`,
        title: desiredTitle,
        cubeLabel: payload.newGroupCubeLabel,
        colorKey: payload.newGroupColorKey,
        items: [newItem],
      };
      return {
        ...prev,
        packing: [...prev.packing, newGroup],
      };
    });

    const displayLabel = formatItemDisplayName(newItem);
    if (createdGroupTitle) {
      showToast(appCopy.aiCreatedGroupAddedToast(createdGroupTitle, displayLabel));
    } else {
      showToast(appCopy.aiAddedToGroupToast(matchedGroupTitle, displayLabel));
    }
  };

  const handleDeduplicateExistingItem = (existingItemId: string) => {
    let existingName = '';
    let ownerName = appCopy.selfFallback;
    setTrip((prev) => {
      for (const g of prev.packing) {
        const found = g.items.find((it) => it.id === existingItemId);
        if (found) {
          existingName = found.name;
          ownerName =
            prev.crew.find((c) => c.id === found.ownerId)?.name || appCopy.selfFallback;
          break;
        }
      }
      return prev;
    });
    const localizedOwner = translateMemberName(ownerName, activeLang);
    showToast(
      existingName
        ? appCopy.dedupKeepingToast(localizedOwner, existingName)
        : appCopy.dedupGenericToast
    );
  };

  const handleTriggerMorningReminder = () => {
    setReminderDismissed(false);
    const morningItems = getMorningPendingItems();
    const headline =
      morningItems.length > 0
        ? appCopy.departureMorningAlertHeadline(morningItems.length)
        : appCopy.departureMorningAllPackedHeadline;
    fireReminderNotification(
      headline,
      morningItems.map((i) => formatItemDisplayName(i)),
      true
    );
    showToast(appCopy.previewedMorningReminderToast);
  };

  const handleTogglePinReminder = (groupId: string, itemId: string) => {
    setTrip((prev) => ({
      ...prev,
      packing: prev.packing.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) =>
                it.id === itemId ? { ...it, remindBeforeDeparture: !it.remindBeforeDeparture } : it
              ),
            }
      ),
    }));
  };

  const handleUpdateReminder = (next: PackingReminderSettings) => {
    setReminderDismissed(false);
    setTrip((prev) => ({
      ...prev,
      reminder: { ...next, snoozedUntil: undefined },
    }));
    showToast(
      next.enabled ? appCopy.reminderRulesUpdatedToast : appCopy.reminderPausedToast
    );
  };

  const handleRequestBrowserPermission = async (): Promise<
    NotificationPermission | 'unsupported'
  > => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast(appCopy.notifUnsupportedToast);
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        void registerNotificationServiceWorker();
      }
      showToast(perm === 'granted' ? appCopy.notifGrantedToast : appCopy.notifDeniedToast);
      return perm;
    } catch {
      showToast(appCopy.notifRestrictedToast);
      return Notification.permission;
    }
  };

  const ensurePermissionWhenScheduling = () => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      void handleRequestBrowserPermission();
    }
  };

  const handleChangeItineraryLeadMinutes = (mins: ItineraryAlertLeadMinutes) => {
    const now = Date.now();
    updateActiveTripNotifState((prev) => {
      const updatedStops: TripLocalNotificationState['armedStops'] = {};
      for (const [nodeId, cfg] of Object.entries(prev.armedStops)) {
        updatedStops[nodeId] = { ...cfg, leadMinutes: mins, armedAtMs: now };
      }
      return {
        ...prev,
        itineraryLeadMinutes: mins,
        armedStops: updatedStops,
      };
    });
    showToast(appCopy.itineraryLeadSetToast(mins));
  };

  const handleToggleStopAlert = (nodeId: string) => {
    const stopNode = trip.timeline.find((n) => n.id === nodeId);
    const stopLabel = stopNode
      ? translateDemoStopTitle(stopNode.title, activeLang)
      : appCopy.stopFallback;
    const isCurrentlyArmed = Boolean(activeTripNotifState.armedStops[nodeId]);

    if (isCurrentlyArmed) {
      updateActiveTripNotifState((prev) => {
        const nextStops = { ...prev.armedStops };
        delete nextStops[nodeId];
        const nextSnoozed = { ...prev.snoozedAlerts };
        delete nextSnoozed[`stop_${nodeId}`];
        return {
          ...prev,
          armedStops: nextStops,
          snoozedAlerts: nextSnoozed,
        };
      });
      showToast(appCopy.cancelledStopAlertToast(stopLabel));
      return;
    }

    ensurePermissionWhenScheduling();
    const leadMins = activeTripNotifState.itineraryLeadMinutes;
    updateActiveTripNotifState((prev) => {
      const nextSnoozed = { ...prev.snoozedAlerts };
      delete nextSnoozed[`stop_${nodeId}`];
      return {
        ...prev,
        armedStops: {
          ...prev.armedStops,
          [nodeId]: {
            leadMinutes: prev.itineraryLeadMinutes,
            armedAtMs: Date.now(),
          },
        },
        snoozedAlerts: nextSnoozed,
      };
    });
    showToast(appCopy.scheduledStopAlertToast(leadMins, stopLabel));
  };

  const handleToggleDayStopsAlerts = (day: number) => {
    const dayUnvisited = trip.timeline.filter((n) => {
      const nDay = Math.max(1, n.day ?? 1);
      const visited = n.visited !== undefined ? n.visited : Boolean(n.logged);
      return nDay === day && !visited;
    });
    if (dayUnvisited.length === 0) return;

    const allArmed = dayUnvisited.every((n) => Boolean(activeTripNotifState.armedStops[n.id]));
    if (allArmed) {
      updateActiveTripNotifState((prev) => {
        const nextStops = { ...prev.armedStops };
        for (const n of dayUnvisited) {
          delete nextStops[n.id];
        }
        return { ...prev, armedStops: nextStops };
      });
      showToast(appCopy.clearedDayAlertsToast(day));
      return;
    }

    ensurePermissionWhenScheduling();
    const now = Date.now();
    const leadMins = activeTripNotifState.itineraryLeadMinutes;
    updateActiveTripNotifState((prev) => {
      const nextStops = { ...prev.armedStops };
      for (const n of dayUnvisited) {
        nextStops[n.id] = {
          leadMinutes: prev.itineraryLeadMinutes,
          armedAtMs: now,
        };
      }
      return { ...prev, armedStops: nextStops };
    });
    showToast(appCopy.scheduledDayAlertsToast(leadMins, dayUnvisited.length, day));
  };

  const handleToggleMeetupAlert = (day: number) => {
    const currentlyArmed = Boolean(activeTripNotifState.armedMeetupDays[day]);
    if (currentlyArmed) {
      updateActiveTripNotifState((prev) => {
        const nextMeetups = { ...prev.armedMeetupDays };
        delete nextMeetups[day];
        const nextSnoozed = { ...prev.snoozedAlerts };
        delete nextSnoozed[`meetup_day_${day}`];
        return {
          ...prev,
          armedMeetupDays: nextMeetups,
          snoozedAlerts: nextSnoozed,
        };
      });
      showToast(appCopy.cancelledMeetupAlertToast(day));
      return;
    }

    ensurePermissionWhenScheduling();
    const leadMins = activeTripNotifState.itineraryLeadMinutes;
    updateActiveTripNotifState((prev) => ({
      ...prev,
      armedMeetupDays: {
        ...prev.armedMeetupDays,
        [day]: Date.now(),
      },
    }));
    showToast(appCopy.scheduledMeetupAlertToast(day, leadMins, trip.meetup.time));
  };

  const handleAddCustomItineraryAlert = (payload: {
    title: string;
    triggerAtMs: number;
    day: number;
    note?: string;
  }) => {
    ensurePermissionWhenScheduling();
    const id = `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    updateActiveTripNotifState((prev) => ({
      ...prev,
      customAlerts: [
        ...prev.customAlerts,
        {
          id,
          kind: 'itinerary_custom',
          title: payload.title,
          note: payload.note,
          triggerAtMs: payload.triggerAtMs,
          targetTab: 'itinerary',
          targetDay: payload.day,
          createdAtMs: Date.now(),
        },
      ],
    }));
    const badge = formatScheduleBadgeLabel(
      payload.triggerAtMs,
      Date.now(),
      activeLang,
      preferences.timeFormat
    );
    showToast(appCopy.scheduledCustomItinAlertToast(payload.title, badge));
  };

  const handleAddCustomPackingAlert = (payload: {
    title: string;
    triggerAtMs: number;
    note?: string;
  }) => {
    ensurePermissionWhenScheduling();
    const id = `pk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    updateActiveTripNotifState((prev) => ({
      ...prev,
      customAlerts: [
        ...prev.customAlerts,
        {
          id,
          kind: 'packing_custom',
          title: payload.title,
          note: payload.note,
          triggerAtMs: payload.triggerAtMs,
          targetTab: 'packing',
          createdAtMs: Date.now(),
        },
      ],
    }));
    const badge = formatScheduleBadgeLabel(
      payload.triggerAtMs,
      Date.now(),
      activeLang,
      preferences.timeFormat
    );
    showToast(appCopy.scheduledCustomPackAlertToast(payload.title, badge));
  };

  const handleRemoveScheduledAlert = (alert: ResolvedScheduledAlert) => {
    updateActiveTripNotifState((prev) => {
      const nextStops = { ...prev.armedStops };
      const nextMeetups = { ...prev.armedMeetupDays };
      const nextSnoozed = { ...prev.snoozedAlerts };
      delete nextSnoozed[alert.baseId];

      if (alert.kind === 'itinerary_stop' && alert.nodeId) {
        delete nextStops[alert.nodeId];
      }
      if (alert.kind === 'evening_meetup' && typeof alert.targetDay === 'number') {
        delete nextMeetups[alert.targetDay];
      }

      return {
        ...prev,
        armedStops: nextStops,
        armedMeetupDays: nextMeetups,
        customAlerts: alert.customId
          ? prev.customAlerts.filter((c) => c.id !== alert.customId)
          : prev.customAlerts,
        snoozedAlerts: nextSnoozed,
      };
    });
    showToast(appCopy.removedScheduledAlertToast);
  };

  const handleSnoozeScheduledBanner = (alert: ResolvedScheduledAlert, minutes: number) => {
    const snoozedTo = Date.now() + minutes * 60_000;
    updateActiveTripNotifState((prev) => ({
      ...prev,
      snoozedAlerts: {
        ...prev.snoozedAlerts,
        [alert.baseId]: snoozedTo,
      },
    }));
    setFiredScheduledBanner(null);
    showToast(appCopy.snoozedAlertToast(minutes));
  };

  const handleTriggerTestReminder = () => {
    setReminderDismissed(false);
    const scoped = getScopedPendingItems(reminderConfig.scope, false);
    const headline =
      scoped.length > 0
        ? appCopy.preTripPackingReminderPreviewHeadline(scoped.length)
        : appCopy.allNightBeforePackedHeadline;
    fireReminderNotification(
      headline,
      scoped.map((i) => formatItemDisplayName(i)),
      true
    );
    showToast(appCopy.sentPackingPreviewToast);
  };

  const handleSnoozeReminder = (minutes: number) => {
    setTrip((prev) => ({
      ...prev,
      reminder: {
        ...(prev.reminder ?? DEFAULT_PACKING_REMINDER),
        snoozedUntil: Date.now() + minutes * 60 * 1000,
      },
    }));
    setActiveReminderBanner(null);
    showToast(appCopy.snoozedReminderToast(minutes));
  };

  const handleToggleTask = (taskId: string) => {
    setTrip((prev) => {
      const currentTasks = prev.tasks ?? DEFAULT_TRIP_TASKS;
      return {
        ...prev,
        tasks: currentTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      };
    });
  };

  const handleAddTask = (payload: {
    title: string;
    category: TripTaskCategory;
    timing: string;
    note?: string;
    ownerId?: string;
  }) => {
    const cleanTitle = payload.title.trim();
    if (!cleanTitle) return;
    setTrip((prev) => {
      const currentTasks = prev.tasks ?? DEFAULT_TRIP_TASKS;
      const defaultOwner = prev.crew[0]?.id || 'm1';
      const newTask: TripTask = {
        id: `tk_${Date.now()}`,
        title: cleanTitle,
        category: payload.category,
        timing: payload.timing.trim() || appCopy.taskDuringTripFallback,
        note: payload.note?.trim() || undefined,
        ownerId:
          !payload.ownerId || payload.ownerId === 'all' ? defaultOwner : payload.ownerId,
        done: false,
      };
      return {
        ...prev,
        tasks: [newTask, ...currentTasks],
      };
    });
    showToast(appCopy.addedTaskToast(cleanTitle));
  };

  const handleUpdateTask = (taskId: string, updates: Partial<TripTask>) => {
    setTrip((prev) => {
      const currentTasks = prev.tasks ?? DEFAULT_TRIP_TASKS;
      return {
        ...prev,
        tasks: currentTasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      };
    });
    showToast(appCopy.updatedTaskToast(updates.title));
  };

  const handleDeleteTask = (taskId: string) => {
    let removedTitle = '';
    setTrip((prev) => {
      const currentTasks = prev.tasks ?? DEFAULT_TRIP_TASKS;
      const found = currentTasks.find((t) => t.id === taskId);
      if (found) removedTitle = found.title;
      return {
        ...prev,
        tasks: currentTasks.filter((t) => t.id !== taskId),
      };
    });
    showToast(appCopy.removedTaskToast(removedTitle));
  };

  const handleCycleTaskOwner = (taskId: string) => {
    let feedback = appCopy.switchedTaskAssigneeFallback;
    setTrip((prev) => {
      const members =
        prev.crew.length > 0 ? prev.crew : [{ id: 'm1', name: appCopy.selfFallback }];
      const currentTasks = prev.tasks ?? DEFAULT_TRIP_TASKS;
      return {
        ...prev,
        tasks: currentTasks.map((t) => {
          if (t.id !== taskId) return t;
          const currentOwnerId = t.ownerId ?? members[0].id;
          const currentIdx = members.findIndex((m) => m.id === currentOwnerId);
          const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % members.length : 0;
          const nextMember = members[nextIdx];
          const nextDisplayName = translateMemberName(nextMember.name, activeLang);
          feedback = appCopy.assignedTaskToast(t.title, nextDisplayName);
          return {
            ...t,
            ownerId: nextMember.id,
          };
        }),
      };
    });
    showToast(feedback);
  };

  const handleAiParseAndAddTasks = async (
    inputText: string,
    activeMemberId: string
  ): Promise<number> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiParseTasks);
      throw new Error('PRO_PAYWALL_GATED');
    }
    const res = await fetch(resolveApiUrl('/api/ai/parse-trip-tasks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputText,
        routeTitle: trip.intel.routeTitle,
        departureDate: trip.setup.departureDate,
        language: activeLang,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || appCopy.aiParseTasksFailed);
    }

    const validTaskCategories: TripTaskCategory[] = [
      '门票预约',
      '交通接送',
      '住宿餐饮',
      '通讯金融',
      '其他事务',
    ];
    const resolvedOwner =
      activeMemberId === 'all' ? trip.crew[0]?.id || 'm1' : activeMemberId;
    const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];

    const createdTasks: TripTask[] = rawTasks
      .map((t: Record<string, unknown>, idx: number) => {
        const cleanTitle = String(t.title || '').trim();
        if (!cleanTitle) return null;
        return {
          id: `tk_ai_${Date.now()}_${idx}`,
          title: cleanTitle,
          category: validTaskCategories.includes(t.category as TripTaskCategory)
            ? (t.category as TripTaskCategory)
            : '其他事务',
          timing: String(t.timing || appCopy.fallbackTaskTiming).trim(),
          note: t.note ? String(t.note).trim() : undefined,
          ownerId: resolvedOwner,
          done: false,
        } as TripTask;
      })
      .filter((item: TripTask | null): item is TripTask => item !== null);

    if (createdTasks.length === 0) {
      throw new Error(appCopy.aiNoTasksDetected);
    }

    setTrip((prev) => ({
      ...prev,
      tasks: [...createdTasks, ...(prev.tasks ?? DEFAULT_TRIP_TASKS)],
    }));

    if (createdTasks.length === 1) {
      showToast(appCopy.aiAddedOneTaskToast(createdTasks[0].title));
    } else {
      showToast(appCopy.aiAddedMultiTasksToast(createdTasks.length));
    }

    return createdTasks.length;
  };

  const handleChangePackingViewMode = (mode: 'checklist' | 'smart_bags') => {
    setTrip((prev) =>
      prev.packingViewMode === mode ? prev : { ...prev, packingViewMode: mode }
    );
  };

  const handleSaveSmartBagPlan = (
    overrides: Record<string, SmartBagId>,
    summaryTip: string
  ) => {
    pushBusinessSnapshot(appCopy.snapshotLabelSmartBags);
    setTrip((prev) => {
      const normalized = normalizeSmartBagOverrides(overrides, prev.packing);
      return {
        ...prev,
        smartBagOverrides: normalized,
        smartBagSummaryTip: summaryTip,
        packing: prev.packing.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            normalized[it.id] ? { ...it, smartBagId: normalized[it.id] } : it
          ),
        })),
      };
    });
    showToast(appCopy.savedSmartBagPlanToast);
  };

  const handleAssignItemSmartBag = (
    itemId: string,
    bagId: SmartBagId | null,
    itemName?: string
  ) => {
    if (!bagId) {
      setTrip((prev) => {
        const nextOverrides = { ...(prev.smartBagOverrides || {}) };
        delete nextOverrides[itemId];
        return {
          ...prev,
          smartBagOverrides: nextOverrides,
          packing: prev.packing.map((g) => ({
            ...g,
            items: g.items.map((it) =>
              it.id === itemId ? { ...it, smartBagId: undefined } : it
            ),
          })),
        };
      });
      showToast(appCopy.resetItemSmartBagToast(itemName));
      return;
    }

    if (!VALID_BAG_IDS.has(bagId)) return;
    const bagSpec = getLocalizedSmartBagSpec(bagId, activeLang) || SMART_BAG_SPECS[0];
    setTrip((prev) => ({
      ...prev,
      smartBagOverrides: {
        ...(prev.smartBagOverrides || {}),
        [itemId]: bagId,
      },
      packing: prev.packing.map((g) => ({
        ...g,
        items: g.items.map((it) =>
          it.id === itemId ? { ...it, smartBagId: bagId } : it
        ),
      })),
    }));
    showToast(appCopy.pinnedItemSmartBagToast(itemName, bagSpec.shortLabel));
  };

  const handleResetSmartBagOverrides = () => {
    pushBusinessSnapshot(appCopy.snapshotLabelSmartBags);
    setTrip((prev) => ({
      ...prev,
      smartBagOverrides: {},
      smartBagSummaryTip: '',
      packing: prev.packing.map((g) => ({
        ...g,
        items: g.items.map((it) =>
          it.smartBagId !== undefined ? { ...it, smartBagId: undefined } : it
        ),
      })),
    }));
    showToast(appCopy.restoredSmartBagRulesToast);
  };

  const handleAuditMissingItems = async (): Promise<{
    diagnosisSummary: string;
    suggestions: AiMissingItemSuggestion[];
  }> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiGapCheck);
      throw new Error('PRO_PAYWALL_GATED');
    }
    if (
      !membershipStatus.isProActive &&
      preferences.aiAuditUsedCount >= FREE_AI_AUDIT_LIMIT
    ) {
      openProPaywallWithReason(appCopy.paywallAiGapCheckQuota(FREE_AI_AUDIT_LIMIT));
      throw new Error('PRO_PAYWALL_GATED');
    }

    const existingItems = trip.packing.flatMap((g) => g.items.map((it) => it.name));
    const timelineTitles = trip.timeline.map(
      (n) => `${n.title}${n.isOutdoor ? '(Outdoor)' : ''}`
    );

    const res = await fetch(resolveApiUrl('/api/ai/audit-missing-items'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setup: trip.setup,
        intel: trip.intel,
        timelineTitles,
        existingItems,
        baggageLimits: {
          carryOnLimitKg: preferences.carryOnLimitKg,
          checkedLimitKg: preferences.checkedLimitKg,
          baggagePreset: preferences.baggagePreset,
        },
        language: activeLang,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || appCopy.aiGapCheckFailed);
    }

    if (!membershipStatus.isProActive) {
      handleUpdatePreferences({
        aiAuditUsedCount: (preferences.aiAuditUsedCount || 0) + 1,
      });
    }

    const rawList = Array.isArray(data.suggestions) ? data.suggestions : [];
    const normalized: AiMissingItemSuggestion[] = rawList
      .map((s: Record<string, unknown>) => {
        const { cleanName: sugClean, parsedQty: sugParsedQty } = parseNameAndQuantity(
          String(s.name || '').trim()
        );
        const name = sugClean || String(s.name || '').trim();
        if (!name) return null;
        const validTag: PackingItem['tag'] = normalizePackingTag(s.tag);
        const rawBag = String(s.smartBagId || 'edc_bag') as SmartBagId;
        const validBag: SmartBagId = VALID_BAG_IDS.has(rawBag) ? rawBag : 'edc_bag';
        const targetGrpId = String(s.targetGroupId || 'extras');
        const qty = Math.max(
          1,
          Math.min(99, Math.round(Number(s.quantity) || sugParsedQty || 1))
        );
        const unitW = Math.max(
          5,
          Math.round(
            Number(s.unitWeightGrams) ||
              (Number(s.weightGrams) ? Number(s.weightGrams) / qty : 0) ||
              estimateDefaultUnitWeightGrams(name, targetGrpId)
          )
        );
        return {
          name,
          why: String(s.why || appCopy.aiGapWhyFallback),
          targetGroupId: targetGrpId,
          targetGroupTitle: String(s.targetGroupTitle || appCopy.aiGapGroupFallback),
          tag: validTag,
          quantity: qty,
          unitWeightGrams: unitW,
          weightGrams: unitW * qty,
          carryOnOnly: Boolean(s.carryOnOnly),
          morningOfDeparture: Boolean(s.morningOfDeparture),
          smartBagId: validBag,
        };
      })
      .filter(
        (x: AiMissingItemSuggestion | null): x is AiMissingItemSuggestion =>
          x !== null && !isItemNeverSuggested(x.name, neverSuggestItems)
      );

    return {
      diagnosisSummary: String(
        data.diagnosisSummary || appCopy.aiGapSummaryFallback
      ),
      suggestions: normalized,
    };
  };

  const handleBatchAddMissingItems = (
    itemsToAdd: AiMissingItemSuggestion[],
    activeMemberId: string
  ) => {
    if (itemsToAdd.length === 0) return;

    setTrip((prev) => {
      const resolvedOwner =
        activeMemberId === 'all' ? prev.crew[0]?.id || 'm1' : activeMemberId;
      const fallbackGroupId =
        prev.packing.find((g) => g.id === 'extras')?.id || prev.packing[0]?.id || '';
      const additionsByGroup = new Map<string, PackingItem[]>();
      const nextBagOverrides: Record<string, SmartBagId> = {
        ...(prev.smartBagOverrides || {}),
      };

      itemsToAdd.forEach((sug, idx) => {
        const matchedGroup = prev.packing.find(
          (g) => g.id === sug.targetGroupId || g.title.includes(sug.targetGroupTitle)
        );
        const destGroupId = matchedGroup ? matchedGroup.id : fallbackGroupId;
        const newId = `audit_${Date.now()}_${idx}`;
        const qty = Math.max(1, sug.quantity ?? 1);
        const unitW = Math.max(
          5,
          sug.unitWeightGrams ?? Math.round(sug.weightGrams / qty)
        );
        const newItem: PackingItem = {
          id: newId,
          name: sug.name,
          why: sug.why,
          tag: sug.tag,
          quantity: qty,
          unitWeightGrams: unitW,
          weightGrams: unitW * qty,
          carryOnOnly: sug.carryOnOnly,
          remindBeforeDeparture: sug.carryOnOnly || sug.morningOfDeparture,
          morningOfDeparture: sug.morningOfDeparture,
          packingLayer: sug.carryOnOnly ? 'carry_on' : 'top_small',
          ownership: 'personal',
          ownerId: resolvedOwner,
          createdAt: Date.now() + idx,
          done: false,
        };
        const arr = additionsByGroup.get(destGroupId) || [];
        arr.push(newItem);
        additionsByGroup.set(destGroupId, arr);
        nextBagOverrides[newId] = sug.smartBagId;
      });

      return {
        ...prev,
        smartBagOverrides: nextBagOverrides,
        packing: prev.packing.map((g) => {
          const added = additionsByGroup.get(g.id);
          return added ? { ...g, items: [...g.items, ...added] } : g;
        }),
      };
    });

    showToast(appCopy.batchAddedMissingToast(itemsToAdd.length));
  };

  const activeTravelersCount = Math.max(1, trip.setup.travelers || trip.crew.length || 1);
  const activeCompanionName =
    activeTravelersCount > 1
      ? trip.crew[1]?.name || appCopy.companionFallback
      : '';

  const activeFinanceDay = Math.min(
    Math.max(1, trip.setup.days),
    Math.max(1, trip.activeFinanceDay ?? 1)
  );

  const addExpenseAtomic = useCallback(
    (record: Omit<ExpenseRecord, 'id' | 'time'>): ExpenseRecord => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isVat = Boolean(
        record.vatEligible ||
          (record.bucket === 'shopping' && record.amountLocal >= trip.intel.vatThresholdLocal)
      );
      const effectiveSplit: ExpenseRecord['split'] =
        activeTravelersCount <= 1 && record.split === 'split' ? 'me' : record.split;
      const newRecord: ExpenseRecord = {
        ...record,
        split: effectiveSplit,
        day: record.day ?? activeFinanceDay,
        vatEligible: isVat,
        vatStatus: isVat ? record.vatStatus ?? 'pending_form' : undefined,
        id: `ex_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        time: timeStr,
      };

      const splitInfo = resolveExpenseSplitDetails(
        newRecord,
        activeCompanionName,
        trip.intel.currencySymbol,
        activeLang,
        activeTravelersCount
      );

      setTrip((prev) => {
        const prevTravelers = Math.max(1, prev.setup.travelers || prev.crew.length || 1);
        const nextExpenses = [newRecord, ...prev.expenses];
        const walletAdjusted = applyExpenseEffectToBudget(
          prev.budget,
          newRecord,
          prev.intel.fxToUsd,
          1,
          prevTravelers
        );
        return {
          ...prev,
          budget: {
            ...walletAdjusted,
            partnerOwedLocal: recomputeUnsettledPartnerOwed(nextExpenses, prevTravelers),
          },
          expenses: nextExpenses,
        };
      });

      const splitHint =
        effectiveSplit === 'ratio' || (effectiveSplit === 'split' && activeTravelersCount > 2)
          ? ` · ${splitInfo.shortLabel}`
          : '';
      const bucketLabel =
        record.bucket === 'shopping'
          ? appCopy.bucketShopping
          : record.bucket === 'prepaid'
          ? appCopy.bucketPrepaid
          : appCopy.bucketDaily;
      showToast(
        appCopy.loggedExpenseToast(
          bucketLabel,
          record.title,
          `${trip.intel.currencySymbol}${record.amountLocal.toFixed(2)}${splitHint}`
        )
      );
      return newRecord;
    },
    [
      activeCompanionName,
      activeFinanceDay,
      activeLang,
      activeTravelersCount,
      appCopy,
      showToast,
      trip.intel.currencySymbol,
      trip.intel.vatThresholdLocal,
    ]
  );

  const handleAiParseExpense = async (payload: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
  }): Promise<Omit<ExpenseRecord, 'id' | 'time'> | null> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiParseExpense);
      return null;
    }
    try {
      const res = await fetch(resolveApiUrl('/api/ai/parse-expense'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          currencyCode: trip.intel.currencyCode,
          vatThresholdLocal: trip.intel.vatThresholdLocal,
          fxToUsd: trip.intel.fxToUsd,
          companionName: activeCompanionName,
          travelersCount: activeTravelersCount,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || appCopy.aiParseExpenseFailed);
      }
      const rawSplit: ExpenseRecord['split'] =
        data.split === 'me' || data.split === 'partner' || data.split === 'ratio'
          ? data.split
          : 'split';
      const parsedSplit: ExpenseRecord['split'] =
        activeTravelersCount <= 1 && rawSplit === 'split' ? 'me' : rawSplit;
      return {
        title: data.title || appCopy.expenseTitleFallback,
        amountLocal: Number(data.amountLocal) || 0,
        bucket: data.bucket === 'shopping' || data.bucket === 'prepaid' ? data.bucket : 'daily',
        account: data.account === 'cash' || data.account === 'transit' ? data.account : 'card',
        split: parsedSplit,
        mySharePct: parsedSplit === 'ratio' ? clampSharePct(Number(data.mySharePct)) : undefined,
        paidBy:
          parsedSplit === 'ratio'
            ? data.paidBy === 'partner'
              ? 'partner'
              : 'me'
            : undefined,
        vatEligible: Boolean(data.vatEligible),
        note: data.note,
      };
    } catch (err) {
      showToast(err instanceof Error ? err.message : appCopy.aiParseExpenseFailed);
      return null;
    }
  };

  const handleOpenAiAssistant = (prompt?: string) => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiCopilot);
      return;
    }
    if (prompt) {
      setAssistantInitialPrompt(prompt);
    }
    setAiDrawerOpen(true);
  };

  const handleUploadReceiptInAssistant = async (file: File): Promise<ExpenseRecord | null> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        resolve(res.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error(appCopy.failedReadReceiptError));
      reader.readAsDataURL(file);
    });
    const parsed = await handleAiParseExpense({
      imageBase64: base64,
      mimeType: file.type || 'image/jpeg',
    });
    if (!parsed) return null;
    return addExpenseAtomic({ ...parsed, day: activeFinanceDay });
  };

  const handleAssistantDispatch = async (
    inputText: string,
    conversationHistory?: AiAssistantHistoryTurn[]
  ): Promise<AiAssistantDispatchResult> => {
    const currentDay = activeFinanceDay;
    const totalDaysCap = Math.max(1, trip.setup.days);
    const shoppingExpenses = trip.expenses.filter((e) => e.bucket === 'shopping');
    const dailySpentToday = computeMyDailySpendForDay(
      trip.expenses,
      currentDay,
      1,
      activeTravelersCount
    );
    const dynamicRollover = computeDynamicRolloverLocal(
      trip.expenses,
      trip.budget.dailyBudgetLocal,
      currentDay,
      activeTravelersCount
    );
    const dailyAvailable = Number(
      (trip.budget.dailyBudgetLocal + dynamicRollover).toFixed(2)
    );
    const dailyRemainingToday = Number((dailyAvailable - dailySpentToday).toFixed(2));
    const shoppingSpent = Number(
      shoppingExpenses.reduce((s, e) => s + e.amountLocal, 0).toFixed(2)
    );
    const vatEligibleTotal = Number(
      shoppingExpenses
        .filter((e) => e.vatEligible || e.amountLocal >= trip.intel.vatThresholdLocal)
        .reduce((s, e) => s + e.amountLocal, 0)
        .toFixed(2)
    );
    const estVatRefund = Number((vatEligibleTotal * trip.budget.vatRefundRate).toFixed(2));
    const nonEligibleShopping = Number(
      shoppingExpenses
        .filter((e) => !e.vatEligible && e.amountLocal < trip.intel.vatThresholdLocal)
        .reduce((s, e) => s + e.amountLocal, 0)
        .toFixed(2)
    );

    let carryOnGrams = 0;
    let checkedGrams = 0;
    let totalPackingCount = 0;
    let donePackingCount = 0;
    const unpackedCriticalItems: string[] = [];
    trip.packing.forEach((grp) => {
      grp.items.forEach((it) => {
        totalPackingCount += 1;
        if (it.done) {
          donePackingCount += 1;
        } else if (it.carryOnOnly || it.tag === '必需' || it.morningOfDeparture) {
          unpackedCriticalItems.push(formatItemDisplayName(it));
        }
        if (isItemCarryOnWeight(it, grp, trip.smartBagOverrides)) {
          carryOnGrams += it.weightGrams;
        } else {
          checkedGrams += it.weightGrams;
        }
      });
    });

    const activeDayRainSwapped =
      trip.rainSwappedDays?.[currentDay] ??
      (currentDay === 2 ? trip.rainSwapped : false);

    const allDaysDigest = Array.from({ length: totalDaysCap }, (_, idx) => {
      const d = idx + 1;
      const nodesForD = trip.timeline.filter((n) => (n.day ?? 1) === d);
      return {
        day: d,
        city: getCityForDay(
          trip.setup.cities,
          d,
          totalDaysCap,
          nodesForD,
          undefined,
          trip.setup.cityDays
        ),
        stops: nodesForD.map((n) => `${n.time} ${n.title}`),
      };
    });

    const currentDayTimeline = trip.timeline.filter((n) => (n.day ?? 1) === currentDay);
    const closingTightStops = currentDayTimeline
      .map((n) => {
        const urg = getClosingUrgency(
          n.time,
          n.closeTime,
          activeLang,
          n.stopType,
          n.title
        );
        return urg.status !== 'ok'
          ? `${n.time} ${n.title} (${urg.label})`
          : null;
      })
      .filter((x): x is string => x !== null);

    const tripSnapshot = {
      routeTitle: trip.intel.routeTitle,
      cities: trip.setup.cities,
      cityDays: trip.setup.cityDays,
      departureDate: trip.setup.departureDate,
      returnDate: trip.setup.returnDate,
      weekdaySchedule: buildTripWeekdaySchedule(
        trip.setup.departureDate,
        totalDaysCap,
        activeLang
      ),
      travelersCount: activeTravelersCount,
      days: totalDaysCap,
      tripStyle: trip.setup.tripStyle,
      packingTripPurpose: trip.setup.packingTripPurpose,
      specialScenarios: trip.setup.specialScenarios,
      packingCustomNote: trip.setup.packingCustomNote,
      activities: trip.setup.activities,
      currentPackingGroupCount: trip.packing.length,
      totalDays: totalDaysCap,
      currentDay,
      currentCity: getCityForDay(
        trip.setup.cities,
        currentDay,
        totalDaysCap,
        currentDayTimeline,
        undefined,
        trip.setup.cityDays
      ),
      weatherSummary: trip.intel.weatherSummary,
      tempRange: trip.intel.tempRange,
      rainChance: trip.intel.rainChance,
      rainSwapped: activeDayRainSwapped,
      currencyCode: trip.intel.currencyCode,
      currencySymbol: trip.intel.currencySymbol,
      fxToUsd: trip.intel.fxToUsd,
      vatThresholdLocal: trip.intel.vatThresholdLocal,
      vatExitAirport: trip.intel.vatExitAirport,
      vatRuleSummary: trip.intel.vatRuleSummary,
      localEmergencyNote: trip.intel.localEmergencyNote,
      finance: {
        dailyBudgetLocal: trip.budget.dailyBudgetLocal,
        rolloverLocal: dynamicRollover,
        dailyAvailable,
        dailySpentToday,
        dailyRemainingToday,
        shoppingSpent,
        shoppingReserveLocal: trip.budget.shoppingReserveLocal,
        vatEligibleTotal,
        nonEligibleShopping,
        estVatRefund,
        cashLocal: trip.budget.cashLocal,
        cardUsd: trip.budget.cardUsd,
        transitPassLocal: trip.budget.transitPassLocal,
        partnerOwedLocal: trip.budget.partnerOwedLocal,
        companionName: activeCompanionName,
        travelersCount: activeTravelersCount,
        recentShoppingItems: shoppingExpenses.slice(0, 5).map((e) => ({
          title: e.title,
          amountLocal: e.amountLocal,
          vatEligible: Boolean(e.vatEligible),
        })),
      },
      packing: {
        totalItems: totalPackingCount,
        doneItems: donePackingCount,
        pendingItems: totalPackingCount - donePackingCount,
        unpackedCriticalItems: unpackedCriticalItems.slice(0, 12),
        carryOnGrams,
        carryOnLimitGrams: Math.round(preferences.carryOnLimitKg * 1000),
        checkedGrams,
        checkedLimitGrams: Math.round(preferences.checkedLimitKg * 1000),
        groups: trip.packing.map((g) => ({ id: g.id, title: g.title })),
      },
      pendingTasks: (trip.tasks ?? DEFAULT_TRIP_TASKS)
        .filter((t) => !t.done)
        .map((t) => ({ title: t.title, category: t.category, timing: t.timing })),
      allDaysDigest,
      closingTightStops,
      allTimelineNodes: trip.timeline.map((n) => ({
        id: n.id,
        day: n.day ?? 1,
        city: n.city,
        time: n.time,
        closeTime: n.closeTime,
        stopType: n.stopType,
        title: n.title,
        district: n.district,
        isOutdoor: Boolean(n.isOutdoor),
        estLocal: n.estLocal,
      })),
      timeline: currentDayTimeline.map((n) => ({
        id: n.id,
        day: n.day ?? currentDay,
        city: n.city,
        time: n.time,
        closeTime: n.closeTime,
        title: n.title,
        district: n.district,
        isOutdoor: Boolean(n.isOutdoor),
        rainSwapTitle: n.rainSwapTitle,
        estLocal: n.estLocal,
      })),
    };

    const res = await fetch(resolveApiUrl('/api/ai/assistant-dispatch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputText,
        activeTab: tab,
        tripSnapshot,
        conversationHistory: conversationHistory || [],
        language: activeLang,
        disabledDomains: listDisabledAiWriteDomains(aiWriteDomains),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || appCopy.aiCopilotFailed);
    }

    const rawIntent = String(data.intent || 'qa_advice');
    const validIntent: AiAssistantIntent =
      rawIntent === 'add_expense' ||
      rawIntent === 'add_packing' ||
      rawIntent === 'add_task' ||
      rawIntent === 'add_stop' ||
      rawIntent === 'relax_day' ||
      rawIntent === 'toggle_rain_swap' ||
      rawIntent === 'local_card' ||
      rawIntent === 'travel_tips'
        ? rawIntent
        : rawIntent === 'change_trip_date' ||
            rawIntent === 'change_destination' ||
            rawIntent === 'rebuild_itinerary' ||
            rawIntent === 'change_packing_template'
          ? rawIntent
          : 'qa_advice';

    // 1. Parse Proposed Expenses (do NOT mutate until user taps Apply)
    const proposedExpenses: AiProposedExpense[] = [];
    const rawExpenses = Array.isArray(data.expenses) ? data.expenses : [];
    rawExpenses.forEach((ex: Record<string, unknown>) => {
      const amt = Number(ex.amountLocal) || 0;
      const title = String(ex.title || '').trim();
      if (!title || amt <= 0) return;
      const expenseDay = Math.min(
        totalDaysCap,
        Math.max(1, Math.round(Number(ex.day) || currentDay))
      );
      const bucket: ExpenseRecord['bucket'] =
        ex.bucket === 'shopping' || ex.bucket === 'prepaid' ? ex.bucket : 'daily';
      const account: ExpenseRecord['account'] =
        ex.account === 'cash' || ex.account === 'transit' ? ex.account : 'card';
      const rawSplit: ExpenseRecord['split'] =
        ex.split === 'me' || ex.split === 'partner' || ex.split === 'ratio'
          ? ex.split
          : 'split';
      const split: ExpenseRecord['split'] =
        activeTravelersCount <= 1 && rawSplit === 'split' ? 'me' : rawSplit;
      proposedExpenses.push({
        day: expenseDay,
        title,
        amountLocal: amt,
        bucket,
        account,
        split,
        mySharePct: split === 'ratio' ? clampSharePct(Number(ex.mySharePct)) : undefined,
        paidBy:
          split === 'ratio'
            ? ex.paidBy === 'partner'
              ? 'partner'
              : 'me'
            : undefined,
        vatEligible:
          Boolean(ex.vatEligible) ||
          (bucket === 'shopping' &&
            trip.intel.vatThresholdLocal > 0 &&
            amt >= trip.intel.vatThresholdLocal),
        note: ex.note ? String(ex.note).trim() || undefined : undefined,
      });
    });

    // 2. Parse Proposed Packing Items
    const proposedPackingItems: AiProposedPackingItem[] = [];
    const rawPacking = Array.isArray(data.packingItems) ? data.packingItems : [];
    if (rawPacking.length > 0) {
      const groupTitleLookup = new Map(trip.packing.map((g) => [g.id, g.title]));
      const fallbackGroup =
        trip.packing.find((g) => g.id === 'extras') || trip.packing[0];

      rawPacking.forEach((rawIt: Record<string, unknown>) => {
        const rawStr = String(rawIt.name || '').trim();
        if (!rawStr) return;
        const { cleanName, parsedQty } = parseNameAndQuantity(rawStr);
        const name = cleanName || rawStr;
        const targetId = String(rawIt.targetGroupId || '');
        const destGroupId = groupTitleLookup.has(targetId)
          ? targetId
          : fallbackGroup?.id || 'extras';
        const destTitle =
          groupTitleLookup.get(destGroupId) ||
          fallbackGroup?.title ||
          appCopy.extrasGroupFallback;
        const qty = Math.max(
          1,
          Math.min(99, Math.round(Number(rawIt.quantity) || parsedQty || 1))
        );
        const unitW = Math.max(
          5,
          Math.round(
            Number(rawIt.unitWeightGrams) ||
              (Number(rawIt.weightGrams) ? Number(rawIt.weightGrams) / qty : 0) ||
              estimateDefaultUnitWeightGrams(name, destGroupId)
          )
        );
        const totalW = unitW * qty;
        const validTag: PackingItem['tag'] = normalizePackingTag(rawIt.tag);
        proposedPackingItems.push({
          name,
          why: String(rawIt.why || appCopy.aiCopilotWhyFallback).trim(),
          tag: validTag,
          quantity: qty,
          unitWeightGrams: unitW,
          weightGrams: totalW,
          carryOnOnly: Boolean(rawIt.carryOnOnly),
          morningOfDeparture: Boolean(rawIt.morningOfDeparture),
          targetGroupId: destGroupId,
          groupTitle: destTitle,
        });
      });
    }

    // 3. Parse Proposed Travel Tasks
    const proposedTasks: AiProposedTask[] = [];
    const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
    if (rawTasks.length > 0) {
      const validCategories: TripTaskCategory[] = [
        '门票预约',
        '交通接送',
        '住宿餐饮',
        '通讯金融',
        '其他事务',
      ];
      rawTasks.forEach((rawTk: Record<string, unknown>) => {
        const title = String(rawTk.title || '').trim();
        if (!title) return;
        const cat: TripTaskCategory = validCategories.includes(
          rawTk.category as TripTaskCategory
        )
          ? (rawTk.category as TripTaskCategory)
          : '其他事务';
        const timing = String(
          rawTk.timing || appCopy.fallbackTaskTiming
        ).trim();
        proposedTasks.push({
          title,
          category: cat,
          timing,
          note: rawTk.note ? String(rawTk.note).trim() || undefined : undefined,
        });
      });
    }

    // 4. Parse Proposed Stop Additions
    const proposedStops: AiProposedStop[] = [];
    const rawStops = Array.isArray(data.stops) ? data.stops : [];
    if (rawStops.length > 0) {
      const validStopTypes: StopType[] = [
        'attraction',
        'hotel',
        'transit',
        'dining',
        'shopping',
      ];
      rawStops.forEach((rawSt: Record<string, unknown>) => {
        const title = String(rawSt.title || '').trim();
        if (!title) return;
        const targetDay = Math.min(
          totalDaysCap,
          Math.max(1, Math.round(Number(rawSt.day) || currentDay))
        );
        const dayCity = getPrimaryCityName(
          getCityForDay(
            trip.setup.cities,
            targetDay,
            totalDaysCap,
            undefined,
            undefined,
            trip.setup.cityDays
          )
        );
        const stopType: StopType = validStopTypes.includes(rawSt.stopType as StopType)
          ? (rawSt.stopType as StopType)
          : 'attraction';
        const time = /^\d{2}:\d{2}$/.test(String(rawSt.time || '').trim())
          ? String(rawSt.time).trim()
          : '14:30';
        const closeTime = /^\d{2}:\d{2}$/.test(String(rawSt.closeTime || '').trim())
          ? String(rawSt.closeTime).trim()
          : '20:00';
        const district = String(rawSt.district || dayCity).trim() || dayCity;
        const address = String(rawSt.address || `${title}, ${dayCity}`).trim();
        const estLocal = Math.max(0, Number(rawSt.estLocal) || 0);
        const isOutdoor = Boolean(rawSt.isOutdoor);
        const rainSwapTitle = String(rawSt.rainSwapTitle || '').trim();
        const rainSwapDistrict = String(rawSt.rainSwapDistrict || '').trim();
        const rainSwapAddress = String(rawSt.rainSwapAddress || '').trim();

        proposedStops.push({
          day: targetDay,
          city: dayCity,
          stopType,
          time,
          closeTime,
          title,
          district,
          address,
          lat:
            typeof rawSt.lat === 'number' && Number.isFinite(rawSt.lat)
              ? rawSt.lat
              : undefined,
          lng:
            typeof rawSt.lng === 'number' && Number.isFinite(rawSt.lng)
              ? rawSt.lng
              : undefined,
          estLocal,
          transitNote: String(
            rawSt.transitNote || appCopy.walkOrTransitFallback
          ).trim(),
          isOutdoor,
          isAnchor: Boolean(rawSt.isAnchor),
          rainSwapTitle: isOutdoor && rainSwapTitle ? rainSwapTitle : undefined,
          rainSwapDistrict:
            isOutdoor && rainSwapTitle && rainSwapDistrict ? rainSwapDistrict : undefined,
          rainSwapAddress:
            isOutdoor && rainSwapTitle && rainSwapAddress ? rainSwapAddress : undefined,
          reason: rawSt.reason ? String(rawSt.reason).trim() || undefined : undefined,
        });
      });
    }

    // 5. Parse Proposed Stop Removals (for "Make day X more relaxed" — verified against real IDs)
    const proposedRemoveStops: AiProposedRemoveStop[] = [];
    const rawRemoveStops = Array.isArray(data.removeStops) ? data.removeStops : [];
    if (rawRemoveStops.length > 0) {
      const timelineById = new Map(trip.timeline.map((n) => [n.id, n]));
      const seenRemoveIds = new Set<string>();
      rawRemoveStops.forEach((rawRm: Record<string, unknown>) => {
        const rmId = String(rawRm.id || '').trim();
        if (!rmId || seenRemoveIds.has(rmId)) return;
        const existingNode = timelineById.get(rmId);
        if (!existingNode) return;
        seenRemoveIds.add(rmId);
        proposedRemoveStops.push({
          id: existingNode.id,
          day: existingNode.day ?? 1,
          time: existingNode.time,
          title: existingNode.title,
          district: existingNode.district,
          reason: rawRm.reason ? String(rawRm.reason).trim() || undefined : undefined,
        });
      });
    }

    // 6. Parse Proposed Rain Swap Action
    const proposedRainSwap =
      data.rainSwapAction === 'enable' || data.rainSwapAction === 'disable'
        ? {
            action: data.rainSwapAction as 'enable' | 'disable',
            day: Math.min(
              totalDaysCap,
              Math.max(1, Math.round(Number(data.rainSwapDay) || currentDay))
            ),
          }
        : undefined;

    const hasProposal =
      proposedExpenses.length > 0 ||
      proposedPackingItems.length > 0 ||
      proposedTasks.length > 0 ||
      proposedStops.length > 0 ||
      proposedRemoveStops.length > 0 ||
      Boolean(proposedRainSwap);

    const proposal: AiAssistantProposal | undefined = hasProposal
      ? {
          summary: String(data.proposalSummary || '').trim() || undefined,
          expenses: proposedExpenses.length > 0 ? proposedExpenses : undefined,
          packingItems: proposedPackingItems.length > 0 ? proposedPackingItems : undefined,
          tasks: proposedTasks.length > 0 ? proposedTasks : undefined,
          stops: proposedStops.length > 0 ? proposedStops : undefined,
          removeStops: proposedRemoveStops.length > 0 ? proposedRemoveStops : undefined,
          rainSwap: proposedRainSwap,
        }
      : undefined;

    // 7. Parse Structured Travel Tips
    const validTipCats: AiTravelTipCategory[] = [
      'visa',
      'transit',
      'money',
      'culture',
      'safety',
      'food',
    ];
    const travelTips: AiTravelTip[] = (Array.isArray(data.travelTips) ? data.travelTips : [])
      .map((tip: Record<string, unknown>) => {
        const title = String(tip.title || '').trim();
        const detail = String(tip.detail || '').trim();
        if (!title || !detail) return null;
        const cat: AiTravelTipCategory = validTipCats.includes(
          tip.category as AiTravelTipCategory
        )
          ? (tip.category as AiTravelTipCategory)
          : 'culture';
        return { title, detail, category: cat };
      })
      .filter((x: AiTravelTip | null): x is AiTravelTip => x !== null)
      .slice(0, 5);

    // 8. Parse Follow-up Suggestions
    const followUpSuggestions: string[] = (
      Array.isArray(data.followUpSuggestions) ? data.followUpSuggestions : []
    )
      .map((s: unknown) => String(s || '').trim())
      .filter((s: string) => s.length >= 2)
      .slice(0, 3);

    // 8b. Parse Proposed Date Change
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    let proposedDateChange: AiProposedDateChange | undefined;
    const rawDateChange =
      data.dateChange && typeof data.dateChange === 'object'
        ? (data.dateChange as Record<string, unknown>)
        : null;
    if (rawDateChange) {
      const departureDate = String(rawDateChange.departureDate || '').trim();
      const returnDate = String(rawDateChange.returnDate || '').trim();
      const days = Math.min(
        30,
        Math.max(1, Math.round(Number(rawDateChange.days) || 0))
      );
      if (
        dateRe.test(departureDate) &&
        dateRe.test(returnDate) &&
        returnDate >= departureDate &&
        days >= 1
      ) {
        proposedDateChange = {
          departureDate,
          returnDate,
          days,
          note: String(rawDateChange.note || '').trim(),
        };
      }
    }

    // 8c. Parse Proposed Destination Change
    let proposedDestinationChange: AiProposedDestinationChange | undefined;
    const rawDestChange =
      data.destinationChange && typeof data.destinationChange === 'object'
        ? (data.destinationChange as Record<string, unknown>)
        : null;
    if (rawDestChange) {
      const cities = (Array.isArray(rawDestChange.cities) ? rawDestChange.cities : [])
        .map((c: unknown) => String(c || '').trim())
        .filter((c: string) => c.length > 0)
        .slice(0, 6);
      if (cities.length >= 1) {
        const rawCityDays = Array.isArray(rawDestChange.cityDays)
          ? rawDestChange.cityDays.map((d: unknown) => Math.round(Number(d)))
          : undefined;
        const cityDays =
          rawCityDays &&
          rawCityDays.length === cities.length &&
          rawCityDays.every((d: number) => Number.isFinite(d) && d > 0)
            ? rawCityDays
            : undefined;
        proposedDestinationChange = {
          cities,
          ...(cityDays ? { cityDays } : {}),
          note: String(rawDestChange.note || '').trim(),
        };
      }
    }

    // 8d. Parse Proposed Itinerary Rebuild
    let proposedItineraryRebuild: AiProposedItineraryRebuild | undefined;
    const rawRebuild =
      data.itineraryRebuild && typeof data.itineraryRebuild === 'object'
        ? (data.itineraryRebuild as Record<string, unknown>)
        : null;
    if (rawRebuild) {
      const naturalPrompt = String(rawRebuild.naturalPrompt || '').trim();
      if (naturalPrompt) {
        const targetMode: 'new' | 'overwrite' =
          rawRebuild.targetMode === 'overwrite' ? 'overwrite' : 'new';
        const validTripStyles: TripStyle[] = [
          '休闲度假',
          '商务出差',
          '浪漫蜜月',
          '亲子出行',
          '长期数字游民',
        ];
        let setupPatch: Partial<TripSetup> | undefined;
        const rawPatch =
          rawRebuild.setupPatch && typeof rawRebuild.setupPatch === 'object'
            ? (rawRebuild.setupPatch as Record<string, unknown>)
            : null;
        if (rawPatch) {
          const patch: Partial<TripSetup> = {};
          if (Array.isArray(rawPatch.cities)) {
            const cities = rawPatch.cities
              .map((c: unknown) => String(c || '').trim())
              .filter((c: string) => c.length > 0)
              .slice(0, 6);
            if (cities.length > 0) patch.cities = cities;
          }
          if (rawPatch.days != null) {
            const days = Math.round(Number(rawPatch.days));
            if (Number.isFinite(days) && days >= 1 && days <= 30) patch.days = days;
          }
          if (
            typeof rawPatch.departureDate === 'string' &&
            dateRe.test(rawPatch.departureDate.trim())
          ) {
            patch.departureDate = rawPatch.departureDate.trim();
          }
          if (
            typeof rawPatch.returnDate === 'string' &&
            dateRe.test(rawPatch.returnDate.trim())
          ) {
            patch.returnDate = rawPatch.returnDate.trim();
          }
          if (
            typeof rawPatch.tripStyle === 'string' &&
            validTripStyles.includes(rawPatch.tripStyle as TripStyle)
          ) {
            patch.tripStyle = rawPatch.tripStyle as TripStyle;
          }
          if (Array.isArray(rawPatch.specialScenarios)) {
            const scenarioIdSet = new Set(
              PACKING_SCENARIO_SPECS.map((s) => s.id as string)
            );
            const specialScenarios = rawPatch.specialScenarios
              .map((id: unknown) => String(id || '').trim())
              .filter((id: string) => scenarioIdSet.has(id)) as PackingScenarioId[];
            if (specialScenarios.length > 0) patch.specialScenarios = specialScenarios;
          }
          if (Array.isArray(rawPatch.activities)) {
            const activities = rawPatch.activities
              .map((a: unknown) => String(a || '').trim())
              .filter((a: string) => a.length > 0)
              .slice(0, 20);
            if (activities.length > 0) patch.activities = activities;
          }
          if (
            rawPatch.packingTripPurpose === 'leisure' ||
            rawPatch.packingTripPurpose === 'business' ||
            rawPatch.packingTripPurpose === 'both'
          ) {
            patch.packingTripPurpose = rawPatch.packingTripPurpose;
          }
          if (typeof rawPatch.packingCustomNote === 'string') {
            const note = rawPatch.packingCustomNote.trim().slice(0, 200);
            if (note) patch.packingCustomNote = note;
          }
          if (Object.keys(patch).length > 0) setupPatch = patch;
        }
        proposedItineraryRebuild = {
          naturalPrompt,
          targetMode,
          ...(setupPatch ? { setupPatch } : {}),
          confirmOverwrite: false,
          note: String(rawRebuild.note || '').trim(),
        };
      }
    }

    // 8e. Parse Proposed Packing Template
    let proposedPackingTemplate: AiProposedPackingTemplate | undefined;
    const rawPackingTpl =
      data.packingTemplate && typeof data.packingTemplate === 'object'
        ? (data.packingTemplate as Record<string, unknown>)
        : null;
    if (rawPackingTpl) {
      const scenarioIdSet = new Set(PACKING_SCENARIO_SPECS.map((s) => s.id as string));
      const scenarioIds = (
        Array.isArray(rawPackingTpl.scenarioIds) ? rawPackingTpl.scenarioIds : []
      )
        .map((id: unknown) => String(id || '').trim())
        .filter((id: string) => scenarioIdSet.has(id)) as PackingScenarioId[];
      const tripPurpose: PackingTripPurpose | undefined =
        rawPackingTpl.tripPurpose === 'leisure' ||
        rawPackingTpl.tripPurpose === 'business' ||
        rawPackingTpl.tripPurpose === 'both'
          ? rawPackingTpl.tripPurpose
          : undefined;
      const customNoteRaw =
        typeof rawPackingTpl.customNote === 'string'
          ? rawPackingTpl.customNote.trim().slice(0, 200)
          : '';
      if (scenarioIds.length > 0 || tripPurpose || customNoteRaw) {
        proposedPackingTemplate = {
          scenarioIds,
          ...(tripPurpose ? { tripPurpose } : {}),
          ...(customNoteRaw ? { customNote: customNoteRaw } : {}),
          note: String(rawPackingTpl.note || '').trim(),
        };
      }
    }

    const hasExtendedProposal =
      hasProposal ||
      Boolean(proposedDateChange) ||
      Boolean(proposedDestinationChange) ||
      Boolean(proposedItineraryRebuild) ||
      Boolean(proposedPackingTemplate);

    const extendedProposal: AiAssistantProposal | undefined = hasExtendedProposal
      ? {
          summary:
            proposal?.summary ||
            String(data.proposalSummary || '').trim() ||
            undefined,
          expenses: proposal?.expenses,
          packingItems: proposal?.packingItems,
          tasks: proposal?.tasks,
          stops: proposal?.stops,
          removeStops: proposal?.removeStops,
          rainSwap: proposal?.rainSwap,
          ...(proposedDateChange ? { dateChange: proposedDateChange } : {}),
          ...(proposedDestinationChange
            ? { destinationChange: proposedDestinationChange }
            : {}),
          ...(proposedItineraryRebuild
            ? { itineraryRebuild: proposedItineraryRebuild }
            : {}),
          ...(proposedPackingTemplate
            ? { packingTemplate: proposedPackingTemplate }
            : {}),
        }
      : undefined;

    // 9. Extract Local Communication Card if generated
    const rawCards = Array.isArray(data.localCards) ? data.localCards : [];
    const localCard: LocalCardResult | undefined =
      rawCards.length > 0 && rawCards[0]?.localTitle
        ? {
            localTitle: String(rawCards[0].localTitle),
            localAddressOrPhrase: String(rawCards[0].localAddressOrPhrase || ''),
            pronunciationHint: String(rawCards[0].pronunciationHint || ''),
            etiquetteTip: String(rawCards[0].etiquetteTip || ''),
            languageLabel: String(
              rawCards[0].languageLabel || appCopy.localLanguageFallback
            ),
          }
        : undefined;

    return {
      intent: validIntent,
      reply: String(data.reply || appCopy.aiCopilotReplyFallback),
      proposal: extendedProposal,
      travelTips: travelTips.length > 0 ? travelTips : undefined,
      followUpSuggestions:
        followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
      localCard,
    };
  };

  const handleApplyAiProposal = (proposal: AiAssistantProposal) => {
    const appliedParts: string[] = [];
    const perms = aiWriteDomains;
    const allowDates = Boolean(perms.dates);
    const allowTripCreate = Boolean(perms.tripCreate);
    const allowItinerary = Boolean(perms.itinerary);
    const allowPacking = Boolean(perms.packing);
    const allowExpense = Boolean(perms.expense);

    const touched = getTouchedDomainsForProposal(proposal);
    const blocked = getBlockedDomainsForProposal(proposal, perms);
    if (touched.length > 0 && blocked.length === touched.length) {
      showToast(appCopy.aiWriteAllBlocked);
      return;
    }

    const isBulkDestructive = Boolean(
      (allowItinerary && proposal.removeStops && proposal.removeStops.length > 0) ||
        (allowItinerary && proposal.stops && proposal.stops.length > 0) ||
        (allowTripCreate && proposal.itineraryRebuild) ||
        (allowPacking && proposal.packingTemplate) ||
        (allowDates && proposal.destinationChange) ||
        (allowDates && proposal.dateChange)
    );
    if (isBulkDestructive) {
      pushBusinessSnapshot(appCopy.snapshotLabelAiProposal);
    }

    // 1. Apply Expenses
    if (allowExpense && proposal.expenses && proposal.expenses.length > 0) {
      proposal.expenses.forEach((ex) => {
        addExpenseAtomic({
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
        });
      });
      appliedParts.push(appCopy.appliedPartExpenses(proposal.expenses.length));
    }

    // 2. Apply Packing Items
    if (allowPacking && proposal.packingItems && proposal.packingItems.length > 0) {
      const defaultOwner = trip.crew[0]?.id || 'm1';
      const additionsByGroup = new Map<string, PackingItem[]>();
      const fallbackGroupId =
        trip.packing.find((g) => g.id === 'extras')?.id ||
        trip.packing[0]?.id ||
        'extras';
      const validGroupIds = new Set(trip.packing.map((g) => g.id));

      proposal.packingItems.forEach((it, idx) => {
        const destGroupId = validGroupIds.has(it.targetGroupId)
          ? it.targetGroupId
          : fallbackGroupId;
        const newItem: PackingItem = {
          id: `ast_pk_${Date.now()}_${idx}`,
          name: it.name,
          why: it.why,
          tag: it.tag,
          quantity: it.quantity,
          unitWeightGrams: it.unitWeightGrams,
          weightGrams: it.weightGrams,
          carryOnOnly: it.carryOnOnly,
          remindBeforeDeparture: it.carryOnOnly || it.morningOfDeparture,
          morningOfDeparture: it.morningOfDeparture,
          packingLayer: it.carryOnOnly ? 'carry_on' : 'top_small',
          ownership: 'personal',
          ownerId: defaultOwner,
          createdAt: Date.now() + idx,
          done: false,
        };
        const list = additionsByGroup.get(destGroupId) || [];
        list.push(newItem);
        additionsByGroup.set(destGroupId, list);
      });

      setTrip((prev) => ({
        ...prev,
        packing: prev.packing.map((g) => {
          const added = additionsByGroup.get(g.id);
          return added ? { ...g, items: [...g.items, ...added] } : g;
        }),
      }));
      appliedParts.push(appCopy.appliedPartPacking(proposal.packingItems.length));
    }

    // 3. Apply Travel Tasks
    if (allowItinerary && proposal.tasks && proposal.tasks.length > 0) {
      const defaultOwner = trip.crew[0]?.id || 'm1';
      const newTaskObjects: TripTask[] = proposal.tasks.map((tk, idx) => ({
        id: `ast_tk_${Date.now()}_${idx}`,
        title: tk.title,
        category: tk.category,
        timing: tk.timing,
        note: tk.note,
        ownerId: defaultOwner,
        done: false,
      }));
      setTrip((prev) => ({
        ...prev,
        tasks: [...newTaskObjects, ...(prev.tasks ?? DEFAULT_TRIP_TASKS)],
      }));
      appliedParts.push(appCopy.appliedPartTasks(newTaskObjects.length));
    }

    // 4. Apply Stop Removals & Stop Additions atomically
    const removeIds = new Set(
      allowItinerary
        ? (proposal.removeStops ?? [])
            .map((r) => r.id)
            .filter((id) => {
              const node = trip.timeline.find((n) => n.id === id);
              return node ? !isNodeProtected(node, trip.travelPasses) : true;
            })
        : []
    );
    const hasStopAdds = Boolean(
      allowItinerary && proposal.stops && proposal.stops.length > 0
    );
    if (allowItinerary && (removeIds.size > 0 || hasStopAdds)) {
      const newNodes: TimelineNode[] = (proposal.stops ?? []).map((st, idx) => ({
        id: `ast_tl_${Date.now()}_${idx}`,
        day: st.day,
        city: st.city,
        stopType: st.stopType,
        time: st.time,
        closeTime: st.closeTime,
        title: st.title,
        district: st.district,
        address: st.address,
        lat: st.lat,
        lng: st.lng,
        estLocal: st.estLocal,
        rating: 4.7,
        visited: false,
        logged: false,
        isAnchor: st.isAnchor,
        isOutdoor: st.isOutdoor,
        transitNote: st.transitNote,
        rainSwapTitle: st.rainSwapTitle,
        rainSwapDistrict: st.rainSwapDistrict,
        rainSwapAddress: st.rainSwapAddress,
      }));

      const touchedDays = new Set<number>([
        ...(proposal.removeStops ?? []).map((r) => r.day),
        ...newNodes.map((n) => n.day ?? 1),
      ]);
      const primaryTouchedDay =
        newNodes[0]?.day ?? proposal.removeStops?.[0]?.day ?? activeFinanceDay;

      setTrip((prev) => {
        const filteredTimeline = prev.timeline.filter((n) => !removeIds.has(n.id));
        const otherNodes = filteredTimeline.filter(
          (n) => !touchedDays.has(n.day ?? 1)
        );
        const rebuiltDays: TimelineNode[] = [];
        let nextMeetup = prev.meetup;

        touchedDays.forEach((d) => {
          const addedForDay = newNodes.filter((n) => n.day === d);
          const hasNewAnchor = addedForDay.some((n) => n.isAnchor);
          const existingForDay = filteredTimeline
            .filter((n) => (n.day ?? 1) === d)
            .map((n) => (hasNewAnchor ? { ...n, isAnchor: false } : n));
          const sortedDay = sortNodesChronologically([
            ...existingForDay,
            ...addedForDay,
          ]);
          rebuiltDays.push(...sortedDay);
          if (d === primaryTouchedDay && hasNewAnchor) {
            nextMeetup = syncMeetupFromDayNodes(sortedDay, nextMeetup);
          }
        });

        const merged = restoreMissingProtectedNodes(
          prev.timeline,
          [...otherNodes, ...rebuiltDays].sort(
            (a, b) => (a.day ?? 1) - (b.day ?? 1)
          ),
          prev.travelPasses,
          { maxDay: prev.setup.days }
        );

        return {
          ...prev,
          activeFinanceDay: primaryTouchedDay,
          timeline: merged,
          meetup: nextMeetup,
        };
      });

      if (removeIds.size > 0 && newNodes.length > 0) {
        appliedParts.push(
          appCopy.appliedPartTrimmedAndAdded(removeIds.size, newNodes.length)
        );
      } else if (removeIds.size > 0) {
        appliedParts.push(appCopy.appliedPartTrimmed(removeIds.size));
      } else {
        appliedParts.push(appCopy.appliedPartAddedStops(newNodes.length));
      }
    }

    // 5. Apply Rain Swap
    if (allowItinerary && proposal.rainSwap) {
      const targetVal = proposal.rainSwap.action === 'enable';
      const rainDay = proposal.rainSwap.day;
      setTrip((prev) => ({
        ...prev,
        rainSwapped: targetVal,
        rainSwappedDays: {
          ...(prev.rainSwappedDays ?? {}),
          [rainDay]: targetVal,
        },
      }));
      appliedParts.push(
        targetVal
          ? appCopy.appliedPartRainPlan(rainDay)
          : appCopy.appliedPartSunnyRoute(rainDay)
      );
    }

    // 6. Apply Date Change
    if (allowDates && proposal.dateChange) {
      const { departureDate, returnDate, days } = proposal.dateChange;
      const computeSyncedReturnDate = (
        depStr: string,
        dayCount: number,
        fallbackRet: string
      ) => {
        if (!depStr || !/^\d{4}-\d{2}-\d{2}$/.test(depStr)) return fallbackRet;
        const parts = depStr.split('-').map(Number);
        const dt = new Date(
          Date.UTC(parts[0], parts[1] - 1, parts[2] + Math.max(0, dayCount - 1))
        );
        if (Number.isNaN(dt.getTime())) return fallbackRet;
        return dt.toISOString().slice(0, 10);
      };
      let dateConflictWarning: string | null = null;
      setTrip((prev) => {
        const nextDays = Math.min(30, Math.max(1, Math.round(days)));
        const nextDeparture = /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
          ? departureDate
          : prev.setup.departureDate;
        let nextReturn = /^\d{4}-\d{2}-\d{2}$/.test(returnDate)
          ? returnDate
          : prev.setup.returnDate;
        if (nextDays !== prev.setup.days) {
          nextReturn = computeSyncedReturnDate(
            nextDeparture,
            nextDays,
            nextReturn
          );
        }
        const nextCityDays = resolveCityDaysAllocation(
          prev.setup.cities,
          nextDays,
          prev.setup.cityDays
        );
        const protectedNodes = prev.timeline.filter((n) =>
          isNodeProtected(n, prev.travelPasses)
        );
        const viewCopy = getItineraryViewCopy(activeLang);
        if (nextDays < prev.setup.days) {
          dateConflictWarning = formatProtectedConflictWarning(
            detectProtectedConflicts(protectedNodes, {
              maxDay: nextDays,
              resolveCityForDay: (d) =>
                getCityForDay(
                  prev.setup.cities,
                  d,
                  nextDays,
                  undefined,
                  activeLang,
                  nextCityDays
                ),
            }).filter((r) => r.kind === 'day_out_of_range'),
            {
              dayOutOfRange: viewCopy.lockedConflictDayShrink,
              cityMismatch: viewCopy.lockedConflictCity,
            }
          );
        }
        const nextTimeline = restoreMissingProtectedNodes(
          prev.timeline,
          prev.timeline.map((n) =>
            (n.day ?? 1) > nextDays ? { ...n, day: nextDays } : n
          ),
          prev.travelPasses,
          { maxDay: nextDays }
        );
        return {
          ...prev,
          setup: {
            ...prev.setup,
            departureDate: nextDeparture,
            returnDate: nextReturn,
            days: nextDays,
            cityDays: nextCityDays,
          },
          timeline: nextTimeline,
        };
      });
      if (dateConflictWarning) setItineraryWarning(dateConflictWarning);
      appliedParts.push(
        days !== trip.setup.days
          ? appCopy.savedSetupWithScalingToast(trip.intel.routeTitle, days)
          : appCopy.savedSetupPreservedToast(trip.intel.routeTitle)
      );
    }

    // 7. Apply Destination Change
    if (allowDates && proposal.destinationChange) {
      const nextCities = proposal.destinationChange.cities
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 6);
      if (nextCities.length > 0) {
        let cityConflictWarning: string | null = null;
        setTrip((prev) => {
          const nextCityDays = resolveCityDaysAllocation(
            nextCities,
            prev.setup.days,
            proposal.destinationChange?.cityDays
          );
          const protectedNodes = prev.timeline.filter((n) =>
            isNodeProtected(n, prev.travelPasses)
          );
          const viewCopy = getItineraryViewCopy(activeLang);
          cityConflictWarning = formatProtectedConflictWarning(
            detectProtectedConflicts(protectedNodes, {
              maxDay: prev.setup.days,
              resolveCityForDay: (d) =>
                getCityForDay(
                  nextCities,
                  d,
                  prev.setup.days,
                  undefined,
                  activeLang,
                  nextCityDays
                ),
            }).filter((r) => r.kind === 'city_mismatch'),
            {
              dayOutOfRange: viewCopy.lockedConflictDayShrink,
              cityMismatch: viewCopy.lockedConflictCity,
            }
          );
          return {
            ...prev,
            setup: {
              ...prev.setup,
              cities: nextCities,
              cityDays: nextCityDays,
            },
            timeline: prev.timeline.map((n) =>
              isNodeProtected(n, prev.travelPasses)
                ? n
                : {
                    ...n,
                    city: getCityForDay(
                      nextCities,
                      n.day ?? 1,
                      prev.setup.days,
                      undefined,
                      activeLang,
                      nextCityDays
                    ),
                  }
            ),
          };
        });
        if (cityConflictWarning) setItineraryWarning(cityConflictWarning);
        appliedParts.push(appCopy.savedSetupPreservedToast(trip.intel.routeTitle));
      }
    }

    // 8. Apply Itinerary Rebuild
    if (allowTripCreate && proposal.itineraryRebuild) {
      const rebuild = proposal.itineraryRebuild;
      const patchedSetup: TripSetup = {
        ...trip.setup,
        ...(rebuild.setupPatch ?? {}),
      };
      const shouldOverwrite =
        rebuild.confirmOverwrite === true && rebuild.targetMode === 'overwrite';
      if (shouldOverwrite) {
        void handleRegenerateCurrentWithAi(
          patchedSetup,
          trip.crew,
          rebuild.naturalPrompt
        );
        appliedParts.push(appCopy.regeneratedTripToast(trip.intel.routeTitle));
      } else {
        void handleCreateNewWithAi(patchedSetup, trip.crew, rebuild.naturalPrompt);
        appliedParts.push(appCopy.generatedSavedTripToast(trip.intel.routeTitle));
      }
    }

    // 9. Apply Packing Template
    if (allowPacking && proposal.packingTemplate) {
      const tpl = proposal.packingTemplate;
      const updatedSetupPatch: Partial<TripSetup> = {};
      if (tpl.scenarioIds.length > 0) {
        updatedSetupPatch.specialScenarios = tpl.scenarioIds;
      }
      if (tpl.tripPurpose) {
        updatedSetupPatch.packingTripPurpose = tpl.tripPurpose;
      }
      if (tpl.customNote) {
        updatedSetupPatch.packingCustomNote = tpl.customNote;
      }
      void handleGenerateCustomPackingList({
        updatedSetupPatch,
        mergeMode: 'smart_merge',
        useInstantOffline: false,
      });
      appliedParts.push(
        appCopy.appliedPartPacking(Math.max(1, tpl.scenarioIds.length || 1))
      );
    }

    if (appliedParts.length > 0) {
      showToast(appCopy.appliedProposalToast(appliedParts.join(' · ')));
    } else if (touched.length > 0) {
      showToast(appCopy.aiWriteNothingApplied);
    }
  };

  const handleToggleRainSwap = () => {
    const activeDay = Math.min(
      Math.max(1, trip.setup.days),
      Math.max(1, trip.activeFinanceDay ?? 1)
    );
    setTrip((prev) => {
      const currentVal =
        prev.rainSwappedDays?.[activeDay] ??
        (activeDay === 2 ? prev.rainSwapped : false);
      const nextVal = !currentVal;
      return {
        ...prev,
        rainSwapped: nextVal,
        rainSwappedDays: {
          ...(prev.rainSwappedDays ?? {}),
          [activeDay]: nextVal,
        },
      };
    });
  };

  const handleToggleVisitedNode = (nodeId: string) => {
    let feedback = '';
    setTrip((prev) => ({
      ...prev,
      timeline: prev.timeline.map((n) => {
        if (n.id !== nodeId) return n;
        const currentlyVisited =
          n.visited !== undefined ? n.visited : Boolean(n.logged);
        const nextVisited = !currentlyVisited;
        feedback = nextVisited
          ? appCopy.checkedInStopToast(n.title)
          : appCopy.unmarkedStopToast(n.title);
        return { ...n, visited: nextVisited };
      }),
    }));
    if (feedback) showToast(feedback);
  };

  const handleQuickLogNode = (nodeId: string, payload: QuickExpenseLogPayload) => {
    const node = trip.timeline.find((n) => n.id === nodeId);
    if (!node || node.logged) return;

    const nodeDay = node.day ?? trip.activeFinanceDay ?? 1;
    const isRainActive =
      trip.rainSwappedDays?.[nodeDay] ??
      (nodeDay === 2 ? trip.rainSwapped : false);
    const activeTitle =
      isRainActive && node.isOutdoor && node.rainSwapTitle
        ? node.rainSwapTitle
        : node.title;
    const activeDistrict =
      isRainActive && node.isOutdoor && node.rainSwapDistrict
        ? node.rainSwapDistrict
        : node.district;

    const created = addExpenseAtomic({
      day: nodeDay,
      title: activeTitle,
      amountLocal: payload.amountLocal,
      bucket: payload.bucket,
      account: payload.account,
      split: payload.split,
      mySharePct: payload.mySharePct,
      paidBy: payload.split === 'ratio' ? 'me' : undefined,
      vatEligible:
        payload.bucket === 'shopping' &&
        payload.amountLocal >= trip.intel.vatThresholdLocal,
      note: appCopy.stopLogNote(activeDistrict, nodeDay),
    });

    setTrip((prev) => ({
      ...prev,
      timeline: prev.timeline.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              visited: true,
              logged: true,
              linkedExpenseId: created.id,
              estLocal: payload.amountLocal,
            }
          : n
      ),
    }));
  };

  const handleAddTimelineNode = (
    day: number,
    newNodeData: Omit<TimelineNode, 'id' | 'day' | 'logged'>
  ) => {
    const newNode: TimelineNode = {
      ...newNodeData,
      id: `tl_manual_${Date.now()}`,
      day,
      visited: Boolean(newNodeData.visited),
      logged: false,
    };

    setTrip((prev) => {
      const otherDaysNodes = prev.timeline.filter((n) => (n.day ?? 1) !== day);
      const currentDayNodes = prev.timeline
        .filter((n) => (n.day ?? 1) === day)
        .map((n) => (newNode.isAnchor ? { ...n, isAnchor: false } : n));
      const sortedDayNodes = sortNodesChronologically([
        ...currentDayNodes,
        newNode,
      ]);
      const nextTimeline = [...otherDaysNodes, ...sortedDayNodes].sort(
        (a, b) => (a.day ?? 1) - (b.day ?? 1)
      );
      return {
        ...prev,
        timeline: nextTimeline,
        meetup: newNode.isAnchor
          ? syncMeetupFromDayNodes(sortedDayNodes, prev.meetup)
          : prev.meetup,
      };
    });
    showToast(
      newNode.isAnchor
        ? appCopy.addedAnchorStopToast(newNode.title)
        : appCopy.addedDayStopToast(newNode.title, day)
    );
  };

  const handleUpdateTimelineNode = (
    nodeId: string,
    updates: Partial<TimelineNode>,
    options?: { silent?: boolean }
  ) => {
    let toastMsg = '';
    const lockOnlyUpdate =
      Object.keys(updates).length === 1 && Object.prototype.hasOwnProperty.call(updates, 'locked');
    setTrip((prev) => {
      const existing = prev.timeline.find((n) => n.id === nodeId);
      if (!existing) return prev;
      const targetDay = existing.day ?? 1;
      const updatedNode: TimelineNode = { ...existing, ...updates };
      if (lockOnlyUpdate) {
        toastMsg = updatedNode.locked
          ? appCopy.nodeLockedToast(updatedNode.title)
          : appCopy.nodeUnlockedToast(updatedNode.title);
      } else {
        toastMsg = updatedNode.isAnchor
          ? appCopy.updatedAnchorStopToast(updatedNode.title)
          : appCopy.updatedStopToast(updatedNode.title);
      }

      const nextTimeline = prev.timeline.map((n) => {
        if (n.id === nodeId) return updatedNode;
        if (
          updatedNode.isAnchor &&
          (n.day ?? 1) === targetDay &&
          n.isAnchor
        ) {
          return { ...n, isAnchor: false };
        }
        return n;
      });

      const activeDay = prev.activeFinanceDay ?? 1;
      const dayNodes = nextTimeline.filter((n) => (n.day ?? 1) === targetDay);
      const nextMeetup =
        targetDay === activeDay
          ? syncMeetupFromDayNodes(dayNodes, prev.meetup)
          : prev.meetup;

      return {
        ...prev,
        timeline: nextTimeline,
        meetup: nextMeetup,
      };
    });
    if (toastMsg && (!options?.silent || lockOnlyUpdate)) showToast(toastMsg);
  };

  const handleDeleteTimelineNode = (nodeId: string) => {
    let deletedTitle = '';
    setTrip((prev) => {
      const target = prev.timeline.find((n) => n.id === nodeId);
      if (!target) return prev;
      deletedTitle = target.title;
      return {
        ...prev,
        timeline: prev.timeline.filter((n) => n.id !== nodeId),
      };
    });
    if (deletedTitle) {
      showToast(appCopy.deletedStopToast(deletedTitle));
    }
  };

  const reassignDayTimeSlots = (
    originalDayNodes: TimelineNode[],
    reorderedDayNodes: TimelineNode[]
  ): TimelineNode[] => {
    const validTimes = sortNodesChronologically(
      originalDayNodes.filter((n) => Boolean(n.time?.trim()))
    ).map((n) => n.time);
    if (validTimes.length !== reorderedDayNodes.length) {
      return reorderedDayNodes;
    }
    return reorderedDayNodes.map((node, idx) => ({
      ...node,
      time: validTimes[idx] ?? node.time,
    }));
  };

  const handleMoveTimelineNodeOrder = (
    nodeId: string,
    direction: 'up' | 'down'
  ) => {
    setTrip((prev) => {
      const target = prev.timeline.find((n) => n.id === nodeId);
      if (!target) return prev;
      const targetDay = target.day ?? 1;
      const dayNodes = prev.timeline.filter((n) => (n.day ?? 1) === targetDay);
      const idx = dayNodes.findIndex((n) => n.id === nodeId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= dayNodes.length) return prev;

      const reordered = [...dayNodes];
      const temp = reordered[idx];
      reordered[idx] = reordered[swapIdx];
      reordered[swapIdx] = temp;
      const reorderedWithTimes = reassignDayTimeSlots(dayNodes, reordered);

      setPreReclusterByDay((prevBase) =>
        prevBase[targetDay]
          ? prevBase
          : { ...prevBase, [targetDay]: dayNodes.map((n) => ({ ...n })) }
      );

      const otherNodes = prev.timeline.filter((n) => (n.day ?? 1) !== targetDay);
      return {
        ...prev,
        timeline: [...otherNodes, ...reorderedWithTimes].sort(
          (a, b) => (a.day ?? 1) - (b.day ?? 1)
        ),
        meetup:
          targetDay === (prev.activeFinanceDay ?? 1)
            ? syncMeetupFromDayNodes(reorderedWithTimes, prev.meetup)
            : prev.meetup,
      };
    });
  };

  const handleReorderTimelineNodes = (
    day: number,
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) return;
    let movedTitle = '';
    let assignedTime = '';
    setTrip((prev) => {
      const dayNodes = prev.timeline.filter((n) => (n.day ?? 1) === day);
      if (
        fromIndex < 0 ||
        fromIndex >= dayNodes.length ||
        toIndex < 0 ||
        toIndex >= dayNodes.length
      ) {
        return prev;
      }
      const reordered = [...dayNodes];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const reorderedWithTimes = reassignDayTimeSlots(dayNodes, reordered);
      movedTitle = moved.title;
      assignedTime = reorderedWithTimes[toIndex]?.time || '';

      setPreReclusterByDay((prevBase) =>
        prevBase[day]
          ? prevBase
          : { ...prevBase, [day]: dayNodes.map((n) => ({ ...n })) }
      );

      const otherNodes = prev.timeline.filter((n) => (n.day ?? 1) !== day);
      return {
        ...prev,
        timeline: [...otherNodes, ...reorderedWithTimes].sort(
          (a, b) => (a.day ?? 1) - (b.day ?? 1)
        ),
        meetup:
          day === (prev.activeFinanceDay ?? 1)
            ? syncMeetupFromDayNodes(reorderedWithTimes, prev.meetup)
            : prev.meetup,
      };
    });
    if (movedTitle) {
      const localizedTitle = translateDemoStopTitle(movedTitle, activeLang);
      const formattedSlot = assignedTime
        ? ` · ${formatTimeByPref(assignedTime, preferences.timeFormat)}`
        : '';
      showToast(appCopy.movedStopOrderToast(localizedTitle, toIndex + 1, formattedSlot));
    }
  };

  const handleRestorePreviousDayOrder = (day: number) => {
    const baseline = preReclusterByDay[day];
    if (!baseline || baseline.length === 0) return;

    setTrip((prev) => {
      const currentDayNodes = prev.timeline.filter((n) => (n.day ?? 1) === day);
      const currentById = new Map<string, TimelineNode>(
        currentDayNodes.map((n) => [n.id, n] as [string, TimelineNode])
      );
      const restoredOrdered: TimelineNode[] = [];
      const seenIds = new Set<string>();

      for (const oldNode of baseline) {
        const live = currentById.get(oldNode.id);
        if (live) {
          restoredOrdered.push({ ...live, time: oldNode.time });
          seenIds.add(oldNode.id);
        }
      }
      for (const node of currentDayNodes) {
        if (!seenIds.has(node.id)) {
          restoredOrdered.push(node);
        }
      }

      const otherNodes = prev.timeline.filter((n) => (n.day ?? 1) !== day);
      return {
        ...prev,
        timeline: [...otherNodes, ...restoredOrdered].sort(
          (a, b) => (a.day ?? 1) - (b.day ?? 1)
        ),
        meetup: syncMeetupFromDayNodes(restoredOrdered, prev.meetup),
      };
    });
    setPreReclusterByDay((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    showToast(appCopy.restoredDayOrderToast(day));
  };

  const handleMoveNodeToWishlist = (nodeId: string) => {
    let movedTitle = '';
    setTrip((prev) => {
      const target = prev.timeline.find((n) => n.id === nodeId);
      if (!target) return prev;
      movedTitle = target.title;
      const nextWishlist = prev.wishlist.includes(target.title)
        ? prev.wishlist
        : [target.title, ...prev.wishlist];
      return {
        ...prev,
        timeline: prev.timeline.filter((n) => n.id !== nodeId),
        wishlist: nextWishlist,
      };
    });
    if (movedTitle) {
      showToast(appCopy.movedToWishlistToast(movedTitle));
    }
  };

  const handleAddWishlistItem = (item: string) => {
    const clean = item.trim();
    if (!clean) return;
    setTrip((prev) => {
      if (prev.wishlist.includes(clean)) return prev;
      return {
        ...prev,
        wishlist: [...prev.wishlist, clean],
      };
    });
    showToast(appCopy.addedToWishlistToast(clean));
  };

  const handleRemoveWishlistItem = (item: string) => {
    setTrip((prev) => ({
      ...prev,
      wishlist: prev.wishlist.filter((w) => w !== item),
    }));
  };

  const handleOptimizeItinerary = async (
    actionType: 'recluster' | 'delay' | 'insert_wishlist' | 'generate_day',
    extra?: { delayMinutes?: number; wishlistItem?: string }
  ) => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiOptimize);
      return;
    }
    const activeDay = Math.min(
      Math.max(1, trip.setup.days),
      Math.max(1, trip.activeFinanceDay ?? 1)
    );
    const currentDayNodes = trip.timeline.filter(
      (n) => (n.day ?? 1) === activeDay
    );
    const activeCityLabel = getCityForDay(
      trip.setup.cities,
      activeDay,
      trip.setup.days,
      currentDayNodes,
      undefined,
      trip.setup.cityDays
    );

    try {
      const res = await fetch(resolveApiUrl('/api/ai/optimize-itinerary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: trip.setup.cities,
          departureDate: trip.setup.departureDate,
          travelers: trip.setup.travelers,
          day: activeDay,
          city: activeCityLabel,
          totalDays: trip.setup.days,
          activities: trip.setup.activities,
          tripStyle: trip.setup.tripStyle,
          timeline: currentDayNodes,
          actionType,
          delayMinutes: extra?.delayMinutes,
          wishlistItem: extra?.wishlistItem,
          weatherSummary: trip.intel.weatherSummary,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || appCopy.optimizeFailed);
      }

      pushBusinessSnapshot(appCopy.snapshotLabelAiOptimize);

      if (actionType === 'recluster' && currentDayNodes.length >= 2) {
        setPreReclusterByDay((prev) => ({
          ...prev,
          [activeDay]: currentDayNodes,
        }));
      } else if (actionType === 'generate_day') {
        setPreReclusterByDay((prev) => {
          if (!(activeDay in prev)) return prev;
          const next = { ...prev };
          delete next[activeDay];
          return next;
        });
      }

      setTrip((prev) => {
        const prevDayMap = new Map<string, TimelineNode>(
          prev.timeline
            .filter((n) => (n.day ?? 1) === activeDay)
            .map((n) => [n.id, n] as [string, TimelineNode])
        );
        const validStopTypes: StopType[] = [
          'attraction',
          'hotel',
          'transit',
          'dining',
          'shopping',
        ];
        const incomingDayNodes: TimelineNode[] = Array.isArray(data.timeline)
          ? data.timeline.map((raw: TimelineNode, idx: number) => {
              const existing = prevDayMap.get(raw.id);
              const resolvedStopType: StopType = validStopTypes.includes(
                raw.stopType as StopType
              )
                ? (raw.stopType as StopType)
                : existing?.stopType || 'attraction';
              return {
                ...raw,
                id: raw.id || `ai_d${activeDay}_${Date.now()}_${idx}`,
                day: activeDay,
                city: raw.city || getPrimaryCityName(activeCityLabel),
                stopType: resolvedStopType,
                lat:
                  typeof raw.lat === 'number' && Number.isFinite(raw.lat)
                    ? raw.lat
                    : existing?.lat,
                lng:
                  typeof raw.lng === 'number' && Number.isFinite(raw.lng)
                    ? raw.lng
                    : existing?.lng,
                visited: existing ? existing.visited : Boolean(raw.visited),
                logged: existing ? existing.logged : Boolean(raw.logged),
                linkedExpenseId: existing?.linkedExpenseId,
                locked: existing?.locked ?? raw.locked,
                isAnchor: existing?.isAnchor ?? raw.isAnchor,
                rainSwapTitle: raw.rainSwapTitle || existing?.rainSwapTitle,
                rainSwapDistrict: raw.rainSwapDistrict || existing?.rainSwapDistrict,
                rainSwapAddress: raw.rainSwapAddress || existing?.rainSwapAddress,
              };
            })
          : currentDayNodes;

        const otherDaysNodes = prev.timeline.filter(
          (n) => (n.day ?? 1) !== activeDay
        );
        const mergedTimeline = restoreMissingProtectedNodes(
          prev.timeline,
          [...otherDaysNodes, ...incomingDayNodes].sort(
            (a, b) => (a.day ?? 1) - (b.day ?? 1)
          ),
          prev.travelPasses,
          { maxDay: prev.setup.days }
        );
        const dayNodesAfter = mergedTimeline.filter((n) => (n.day ?? 1) === activeDay);
        const nextSummary =
          data.spatialSummary ||
          prev.spatialSummariesByDay?.[activeDay] ||
          prev.spatialSummary;
        const nextClustered =
          actionType === 'recluster' || actionType === 'generate_day'
            ? true
            : prev.spatialClusteredByDay?.[activeDay] ?? prev.spatialClustered;

        return {
          ...prev,
          timeline: incomingDayNodes.length ? mergedTimeline : prev.timeline,
          meetup: syncMeetupFromDayNodes(dayNodesAfter, prev.meetup),
          spatialSummary: nextSummary,
          spatialClustered: nextClustered,
          spatialSummariesByDay: {
            ...(prev.spatialSummariesByDay ?? {}),
            [activeDay]: nextSummary,
          },
          spatialClusteredByDay: {
            ...(prev.spatialClusteredByDay ?? {}),
            [activeDay]: nextClustered,
          },
          wishlist:
            actionType === 'insert_wishlist' && extra?.wishlistItem
              ? prev.wishlist.filter((w) => w !== extra.wishlistItem)
              : prev.wishlist,
        };
      });
      setItineraryWarning(data.warningNote || null);
      showToast(
        actionType === 'recluster'
          ? appCopy.optimizedReclusterToast(activeDay)
          : actionType === 'generate_day'
          ? appCopy.optimizedGenerateDayToast(activeDay, activeCityLabel)
          : actionType === 'delay'
          ? appCopy.optimizedDelayToast(activeDay, extra?.delayMinutes ?? 0)
          : appCopy.optimizedInsertWishlistToast(extra?.wishlistItem ?? '', activeDay)
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : appCopy.adjustItineraryFailed);
    }
  };

  const handlePlanFullItinerary = async (
    options: FullItineraryPlanOptions
  ): Promise<FullItineraryPlanResult | null> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallAiFullItinerary);
      return null;
    }

    try {
      const res = await fetch(resolveApiUrl('/api/ai/plan-full-itinerary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: trip.setup.cities,
          cityDays: trip.setup.cityDays,
          departureDate: trip.setup.departureDate,
          days: trip.setup.days,
          tripStyle: trip.setup.tripStyle,
          activities: trip.setup.activities,
          travelers: trip.setup.travelers,
          intel: trip.intel,
          budgetTier: options.budgetTier,
          targetDailyBudgetLocal: options.targetDailyBudgetLocal,
          includeHotelSuggestions: options.includeHotelSuggestions,
          includeTransitDetails: options.includeTransitDetails,
          wishlist: trip.wishlist,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || appCopy.fullItineraryFailed);
      }

      const totalDays = Math.max(1, trip.setup.days);
      const rawTimeline = Array.isArray(data.timeline)
        ? (data.timeline as TimelineNode[])
        : [];
      if (rawTimeline.length === 0) {
        throw new Error(appCopy.aiNoStopsReturned);
      }

      const formattedTimeline: TimelineNode[] = rawTimeline
        .map((raw, idx) => {
          const nodeDay = Math.min(totalDays, Math.max(1, Math.round(Number(raw.day) || 1)));
          return {
            ...raw,
            id: raw.id || `ai_full_d${nodeDay}_${Date.now()}_${idx}`,
            day: nodeDay,
            city:
              raw.city ||
              getPrimaryCityName(
                getCityForDay(
                  trip.setup.cities,
                  nodeDay,
                  totalDays,
                  undefined,
                  undefined,
                  trip.setup.cityDays
                )
              ),
            lat: typeof raw.lat === 'number' && Number.isFinite(raw.lat) ? raw.lat : undefined,
            lng: typeof raw.lng === 'number' && Number.isFinite(raw.lng) ? raw.lng : undefined,
            visited: false,
            logged: false,
            linkedExpenseId: undefined,
          };
        })
        .sort((a, b) => (a.day ?? 1) - (b.day ?? 1));

      const summariesByDay: Record<number, string> = {};
      const clusteredByDay: Record<number, boolean> = {};
      if (Array.isArray(data.daySummaries)) {
        for (const item of data.daySummaries as Array<{ day?: number; summary?: string }>) {
          const d = Number(item.day);
          if (d >= 1 && d <= totalDays && item.summary) {
            summariesByDay[d] = String(item.summary);
            clusteredByDay[d] = true;
          }
        }
      }
      for (let d = 1; d <= totalDays; d += 1) {
        if (!summariesByDay[d]) {
          summariesByDay[d] = appCopy.fullItineraryDaySummary(d);
        }
        clusteredByDay[d] = true;
      }

      const activeDay = Math.min(totalDays, Math.max(1, trip.activeFinanceDay ?? 1));
      const nextDailyBudget =
        Number(data.recommendedDailyBudgetLocal) > 0
          ? Math.round(Number(data.recommendedDailyBudgetLocal))
          : options.targetDailyBudgetLocal && options.targetDailyBudgetLocal > 0
          ? Math.round(options.targetDailyBudgetLocal)
          : trip.budget.dailyBudgetLocal;

      pushBusinessSnapshot(appCopy.snapshotLabelAiFullPlan);

      let fullPlanConflictWarning: string | null = null;
      setTrip((prev) => {
        const mergedTimeline = restoreMissingProtectedNodes(
          prev.timeline,
          formattedTimeline,
          prev.travelPasses,
          { maxDay: totalDays }
        );
        const activeDayNodes = mergedTimeline.filter((n) => (n.day ?? 1) === activeDay);
        const viewCopy = getItineraryViewCopy(activeLang);
        fullPlanConflictWarning = formatProtectedConflictWarning(
          detectProtectedConflicts(
            prev.timeline.filter((n) => isNodeProtected(n, prev.travelPasses)),
            {
              maxDay: totalDays,
              resolveCityForDay: (d) =>
                getCityForDay(
                  prev.setup.cities,
                  d,
                  totalDays,
                  undefined,
                  activeLang,
                  prev.setup.cityDays
                ),
            }
          ),
          {
            dayOutOfRange: viewCopy.lockedConflictDayShrink,
            cityMismatch: viewCopy.lockedConflictCity,
          }
        );
        return {
          ...prev,
          setup: {
            ...prev.setup,
            budgetTier: options.budgetTier,
          },
          budget: {
            ...prev.budget,
            dailyBudgetLocal: nextDailyBudget,
          },
          timeline: mergedTimeline,
          meetup: syncMeetupFromDayNodes(activeDayNodes, prev.meetup),
          spatialSummary: summariesByDay[activeDay] || prev.spatialSummary,
          spatialClustered: true,
          spatialSummariesByDay: summariesByDay,
          spatialClusteredByDay: clusteredByDay,
          rainSwapped: false,
          rainSwappedDays: {},
        };
      });
      setPreReclusterByDay({});
      setPreSmartReorderSnapshot(null);
      setItineraryWarning(fullPlanConflictWarning);
      showToast(appCopy.plannedFullItineraryToast(totalDays));

      return {
        budgetStrategySummary: String(data.budgetStrategySummary || ''),
        recommendedDailyBudgetLocal: Number(data.recommendedDailyBudgetLocal) || undefined,
        recommendedHotelAndTransitTotalLocal:
          Number(data.recommendedHotelAndTransitTotalLocal) || undefined,
      };
    } catch (err) {
      showToast(err instanceof Error ? err.message : appCopy.fullItineraryFailed);
      return null;
    }
  };

  const handleSmartReorderAllUnvisited =
    async (): Promise<SmartReorderItineraryResult | null> => {
      if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
        openProPaywallWithReason(appCopy.paywallAiSmartReorder);
        return null;
      }

      const totalDays = Math.max(1, trip.setup.days);
      const activeDay = Math.min(
        totalDays,
        Math.max(1, trip.activeFinanceDay ?? 1)
      );
      const inRangeNodes = trip.timeline.filter((n) => {
        const d = n.day ?? 1;
        return d >= 1 && d <= totalDays;
      });
      const isNodeVisited = (n: TimelineNode) =>
        n.visited !== undefined ? Boolean(n.visited) : Boolean(n.logged);
      const isReorderLocked = (n: TimelineNode) =>
        isNodeVisited(n) || isNodeProtected(n, trip.travelPasses);
      const unvisitedNodes = inRangeNodes.filter((n) => !isReorderLocked(n));
      const preservedVisitedCount = inRangeNodes.length - unvisitedNodes.length;

      if (unvisitedNodes.length < 2) {
        showToast(appCopy.needTwoUnvisitedStopsToast);
        return null;
      }

      const parseClockMinutes = (raw?: string): number => {
        const m = String(raw || '')
          .trim()
          .match(/^(\d{1,2}):(\d{2})/);
        if (!m) return 9 * 60;
        const hh = Math.min(23, Math.max(0, Number(m[1]) || 0));
        const mm = Math.min(59, Math.max(0, Number(m[2]) || 0));
        return hh * 60 + mm;
      };
      const normalizeClockStr = (raw: unknown, fallback: string): string => {
        const m = String(raw || '')
          .trim()
          .match(/^(\d{1,2}):(\d{2})/);
        if (!m) return fallback;
        const hh = String(Math.min(23, Math.max(0, Number(m[1]) || 0))).padStart(2, '0');
        const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0');
        return `${hh}:${mm}`;
      };

      const dayCityMap = new Map<number, string>();
      const dayContexts = Array.from({ length: totalDays }, (_, idx) => {
        const d = idx + 1;
        const nodesOnD = inRangeNodes.filter((n) => (n.day ?? 1) === d);
        const primaryCity = getPrimaryCityName(
          getCityForDay(
            trip.setup.cities,
            d,
            totalDays,
            nodesOnD,
            undefined,
            trip.setup.cityDays
          )
        );
        dayCityMap.set(d, primaryCity);
        const stay = trip.dayStays?.[d];
        return {
          day: d,
          city: primaryCity,
          stayPlaceName: stay?.placeName || undefined,
          stayAddress: stay?.address || undefined,
          stayLat: stay?.lat,
          stayLng: stay?.lng,
        };
      });

      const compactStops = inRangeNodes.map((n) => ({
        id: n.id,
        day: n.day ?? 1,
        city: n.city || dayCityMap.get(n.day ?? 1) || trip.setup.cities[0] || '',
        stopType: n.stopType || 'attraction',
        time: n.time,
        closeTime: n.closeTime,
        durationMinutes: n.durationMinutes || 90,
        title: n.title,
        district: n.district,
        address: n.address,
        lat: n.lat,
        lng: n.lng,
        visited: isNodeVisited(n),
        isAnchor: Boolean(n.isAnchor),
        locked: Boolean(n.locked) || isNodeProtected(n, trip.travelPasses),
        transitNote: n.transitNote,
      }));

      try {
        const res = await fetch(resolveApiUrl('/api/ai/smart-reorder-itinerary'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cities: trip.setup.cities,
            departureDate: trip.setup.departureDate,
            totalDays,
            dayContexts,
            stops: compactStops,
            tripStyle: trip.setup.tripStyle,
            weatherSummary: trip.intel.weatherSummary,
            language: activeLang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || appCopy.smartReorderFailed);
        }

        const aiStopMap = new Map<string, Record<string, unknown>>();
        if (Array.isArray(data.reorderedStops)) {
          for (const item of data.reorderedStops) {
            if (item && typeof item.id === 'string') {
              aiStopMap.set(item.id, item as Record<string, unknown>);
            }
          }
        }

        const daySummaryMap = new Map<number, string>();
        if (Array.isArray(data.daySummaries)) {
          for (const ds of data.daySummaries) {
            const dNum = Number(ds?.day);
            const sumStr = String(ds?.summary || '').trim();
            if (dNum >= 1 && dNum <= totalDays && sumStr) {
              daySummaryMap.set(dNum, sumStr);
            }
          }
        }

        // Compute merged timeline preserving all stops & locking visited/protected stops
        const rebuiltNodes = trip.timeline.map((orig) => {
          const origDay = orig.day ?? 1;
          if (origDay < 1 || origDay > totalDays || isReorderLocked(orig)) {
            return orig;
          }
          const aiPatch = aiStopMap.get(orig.id);
          if (!aiPatch) return orig;

          const proposedDay = Math.min(
            totalDays,
            Math.max(1, Number(aiPatch.day) || origDay)
          );
          const origCityKey = (dayCityMap.get(origDay) || orig.city || '').toLowerCase();
          const targetCityKey = (dayCityMap.get(proposedDay) || '').toLowerCase();
          const finalDay =
            proposedDay === origDay || (origCityKey && origCityKey === targetCityKey)
              ? proposedDay
              : origDay;

          const nextTime = normalizeClockStr(aiPatch.time, orig.time);
          const nextClose =
            typeof aiPatch.closeTime === 'string' && aiPatch.closeTime.trim()
              ? aiPatch.closeTime.trim()
              : orig.closeTime;
          const nextDuration =
            Number(aiPatch.durationMinutes) >= 15
              ? Math.min(480, Math.round(Number(aiPatch.durationMinutes)))
              : orig.durationMinutes;
          const nextTransit =
            typeof aiPatch.transitNote === 'string' && aiPatch.transitNote.trim()
              ? aiPatch.transitNote.trim()
              : orig.transitNote;
          const nextLat =
            typeof orig.lat === 'number' && Number.isFinite(orig.lat)
              ? orig.lat
              : typeof aiPatch.lat === 'number' && Number.isFinite(aiPatch.lat)
              ? aiPatch.lat
              : orig.lat;
          const nextLng =
            typeof orig.lng === 'number' && Number.isFinite(orig.lng)
              ? orig.lng
              : typeof aiPatch.lng === 'number' && Number.isFinite(aiPatch.lng)
              ? aiPatch.lng
              : orig.lng;

          return {
            ...orig,
            day: finalDay,
            city: dayCityMap.get(finalDay) || orig.city,
            time: nextTime,
            closeTime: nextClose,
            durationMinutes: nextDuration,
            transitNote: nextTransit,
            lat: nextLat,
            lng: nextLng,
          };
        });

        const sortedTimeline = [...rebuiltNodes].sort((a, b) => {
          const dDiff = (a.day ?? 1) - (b.day ?? 1);
          if (dDiff !== 0) return dDiff;
          return parseClockMinutes(a.time) - parseClockMinutes(b.time);
        });

        // Detect which days changed order or schedule times
        const updatedDays: number[] = [];
        const baselineByDayPatch: Record<number, TimelineNode[]> = {};
        for (let d = 1; d <= totalDays; d++) {
          const beforeDay = trip.timeline.filter((n) => (n.day ?? 1) === d);
          const afterDay = sortedTimeline.filter((n) => (n.day ?? 1) === d);
          const sigBefore = beforeDay.map((n) => `${n.id}@${n.time}`).join('|');
          const sigAfter = afterDay.map((n) => `${n.id}@${n.time}`).join('|');
          if (sigBefore !== sigAfter) {
            updatedDays.push(d);
            if (beforeDay.length >= 2) {
              baselineByDayPatch[d] = beforeDay;
            }
          }
        }

        // Save full-trip undo snapshot + per-day route comparison baselines
        setPreSmartReorderSnapshot({
          tripId: activeEntry.id,
          timeline: trip.timeline,
          spatialSummary: trip.spatialSummary,
          spatialSummariesByDay: trip.spatialSummariesByDay,
          spatialClustered: trip.spatialClustered,
          spatialClusteredByDay: trip.spatialClusteredByDay,
          meetup: trip.meetup,
        });
        pushBusinessSnapshot(appCopy.snapshotLabelAiSmartReorder);
        if (Object.keys(baselineByDayPatch).length > 0) {
          setPreReclusterByDay((prev) => ({
            ...prev,
            ...baselineByDayPatch,
          }));
        }

        const overallSummary =
          String(data.overallSummary || '').trim() ||
          appCopy.smartReorderOverallSummary(unvisitedNodes.length, totalDays);
        const warningNote = String(data.warningNote || '').trim();

        setTrip((prev) => {
          const guardedTimeline = restoreMissingProtectedNodes(
            prev.timeline,
            sortedTimeline,
            prev.travelPasses,
            { maxDay: totalDays }
          );
          const nextSummariesByDay: Record<number, string> = {
            ...(prev.spatialSummariesByDay ?? {}),
          };
          const nextClusteredByDay: Record<number, boolean> = {
            ...(prev.spatialClusteredByDay ?? {}),
          };
          for (let d = 1; d <= totalDays; d++) {
            const hasStops = guardedTimeline.some((n) => (n.day ?? 1) === d);
            if (hasStops) {
              nextClusteredByDay[d] = true;
              const sumForD = daySummaryMap.get(d);
              if (sumForD) {
                nextSummariesByDay[d] = sumForD;
              }
            }
          }
          const activeAfterNodes = guardedTimeline.filter(
            (n) => (n.day ?? 1) === activeDay
          );

          return {
            ...prev,
            timeline: guardedTimeline,
            meetup: syncMeetupFromDayNodes(activeAfterNodes, prev.meetup),
            spatialSummary:
              nextSummariesByDay[activeDay] || overallSummary || prev.spatialSummary,
            spatialClustered: true,
            spatialSummariesByDay: nextSummariesByDay,
            spatialClusteredByDay: nextClusteredByDay,
          };
        });

        setItineraryWarning(warningNote || null);
        showToast(appCopy.smartReorderedToast(unvisitedNodes.length, totalDays));

        return {
          overallSummary,
          warningNote: warningNote || undefined,
          updatedDays,
          reorderedStopCount: unvisitedNodes.length,
          preservedVisitedCount,
        };
      } catch (err) {
        showToast(err instanceof Error ? err.message : appCopy.smartReorderFailed);
        return null;
      }
    };

  const handleUndoSmartReorder = () => {
    if (!preSmartReorderSnapshot || preSmartReorderSnapshot.tripId !== activeEntry.id) {
      return;
    }
    const snap = preSmartReorderSnapshot;
    setTrip((prev) => ({
      ...prev,
      timeline: snap.timeline,
      spatialSummary: snap.spatialSummary,
      spatialSummariesByDay: snap.spatialSummariesByDay,
      spatialClustered: snap.spatialClustered,
      spatialClusteredByDay: snap.spatialClusteredByDay,
      meetup: snap.meetup,
    }));
    setPreSmartReorderSnapshot(null);
    setPreReclusterByDay({});
    setItineraryWarning(null);
    showToast(appCopy.undidSmartReorderToast);
  };

  const handleGenerateLocalCard = async (
    scenario: string,
    targetName: string,
    targetAddress: string,
    cityOverride?: string
  ): Promise<LocalCardResult | null> => {
    if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
      openProPaywallWithReason(appCopy.paywallLocalCard);
      return null;
    }
    const activeDay = Math.min(
      Math.max(1, trip.setup.days),
      Math.max(1, trip.activeFinanceDay ?? 1)
    );
    const resolvedCity =
      cityOverride ||
      getPrimaryCityName(
        getCityForDay(
          trip.setup.cities,
          activeDay,
          trip.setup.days,
          trip.timeline.filter((n) => (n.day ?? 1) === activeDay),
          undefined,
          trip.setup.cityDays
        )
      ) ||
      trip.setup.cities[0] ||
      'Paris';
    try {
      const res = await fetch(resolveApiUrl('/api/ai/local-card'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: resolvedCity,
          scenario,
          targetName,
          targetAddress,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || appCopy.localCardFailed);
      }
      return data as LocalCardResult;
    } catch (err) {
      showToast(err instanceof Error ? err.message : appCopy.localCardFailed);
      return null;
    }
  };

  const handleSelectFinanceDay = (day: number) => {
    const safeDay = Math.min(Math.max(1, trip.setup.days), Math.max(1, day));
    setItineraryWarning(null);
    setTrip((prev) => {
      const dayNodes = prev.timeline.filter((n) => (n.day ?? 1) === safeDay);
      return {
        ...prev,
        activeFinanceDay: safeDay,
        meetup: syncMeetupFromDayNodes(dayNodes, prev.meetup),
      };
    });
  };

  const handleUpdateExpense = (
    expenseId: string,
    updates: Omit<ExpenseRecord, 'id' | 'time'>
  ) => {
    let updatedTitle = '';
    let reopenedSettled = false;
    setTrip((prev) => {
      const existing = prev.expenses.find((e) => e.id === expenseId);
      if (!existing) return prev;
      updatedTitle = updates.title;
      const prevTravelers = Math.max(1, prev.setup.travelers || prev.crew.length || 1);
      const nextRecord: ExpenseRecord = {
        ...updates,
        id: existing.id,
        time: existing.time,
      };
      if (existing.settled && !nextRecord.settled) {
        reopenedSettled = true;
      }
      const nextExpenses = prev.expenses.map((e) => (e.id === expenseId ? nextRecord : e));
      // Reverse old record wallet effect (-1), then apply updated record wallet effect (+1),
      // and recompute partnerOwedLocal cleanly from all unsettled split expenses.
      const reversedBudget = applyExpenseEffectToBudget(
        prev.budget,
        existing,
        prev.intel.fxToUsd,
        -1,
        prevTravelers
      );
      const finalBudget = applyExpenseEffectToBudget(
        reversedBudget,
        nextRecord,
        prev.intel.fxToUsd,
        1,
        prevTravelers
      );
      return {
        ...prev,
        budget: {
          ...finalBudget,
          partnerOwedLocal: recomputeUnsettledPartnerOwed(nextExpenses, prevTravelers),
        },
        expenses: nextExpenses,
      };
    });
    if (updatedTitle) {
      showToast(
        reopenedSettled
          ? appCopy.updatedExpenseReopenedToast(updatedTitle)
          : appCopy.updatedExpenseRecalcToast(updatedTitle)
      );
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    let deletedTitle = '';
    let unlinkedStop = false;
    setTrip((prev) => {
      const existing = prev.expenses.find((e) => e.id === expenseId);
      if (!existing) return prev;
      deletedTitle = existing.title;
      const prevTravelers = Math.max(1, prev.setup.travelers || prev.crew.length || 1);
      const nextExpenses = prev.expenses.filter((e) => e.id !== expenseId);
      const restoredBudget = applyExpenseEffectToBudget(
        prev.budget,
        existing,
        prev.intel.fxToUsd,
        -1,
        prevTravelers
      );
      const nextTimeline = prev.timeline.map((n) => {
        if (n.linkedExpenseId === expenseId) {
          unlinkedStop = true;
          return { ...n, logged: false, linkedExpenseId: undefined };
        }
        return n;
      });
      return {
        ...prev,
        budget: {
          ...restoredBudget,
          partnerOwedLocal: recomputeUnsettledPartnerOwed(nextExpenses, prevTravelers),
        },
        expenses: nextExpenses,
        timeline: nextTimeline,
      };
    });
    if (deletedTitle) {
      showToast(
        unlinkedStop
          ? appCopy.deletedExpenseUnlinkedToast(deletedTitle)
          : appCopy.deletedExpenseRolledBackToast(deletedTitle)
      );
    }
  };

  const handleCycleVatStatus = (expenseId: string) => {
    let nextLabel = '';
    setTrip((prev) => {
      const target = prev.expenses.find((e) => e.id === expenseId);
      if (!target) return prev;
      const nextStatus = getNextVatStatus(target.vatStatus);
      nextLabel = getVatStatusLabel(nextStatus, activeLang);
      return {
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === expenseId ? { ...e, vatEligible: true, vatStatus: nextStatus } : e
        ),
      };
    });
    if (nextLabel) {
      showToast(appCopy.vatStatusUpdatedToast(nextLabel));
    }
  };

  const handleUpdateBudgetLimits = (updates: BudgetLimitsUpdatePayload) => {
    setTrip((prev) => {
      const nextBudget = { ...prev.budget };
      if (updates.tripTotalUsd !== undefined) {
        nextBudget.tripTotalUsd = Number(updates.tripTotalUsd.toFixed(2));
      }
      if (updates.prepaidUsd !== undefined) {
        nextBudget.prepaidUsd = Number(updates.prepaidUsd.toFixed(2));
      }
      if (updates.dailyBudgetLocal !== undefined) {
        nextBudget.dailyBudgetLocal = Number(updates.dailyBudgetLocal.toFixed(2));
      }
      if (updates.shoppingReserveLocal !== undefined) {
        nextBudget.shoppingReserveLocal = Number(updates.shoppingReserveLocal.toFixed(2));
      }
      if (updates.customFxLocalToHome !== undefined) {
        if (updates.customFxLocalToHome === null) {
          delete nextBudget.customFxLocalToHome;
        } else {
          nextBudget.customFxLocalToHome = updates.customFxLocalToHome;
        }
      }
      if (updates.customFxHomeCode !== undefined) {
        if (updates.customFxHomeCode === null) {
          delete nextBudget.customFxHomeCode;
        } else {
          nextBudget.customFxHomeCode = updates.customFxHomeCode;
        }
      }
      return {
        ...prev,
        budget: nextBudget,
      };
    });
    showToast(appCopy.budgetLimitsSavedToast);
  };

  const handleAdjustWalletBalance = (
    account: PaymentAccount,
    mode: 'add' | 'set',
    amount: number
  ) => {
    setTrip((prev) => {
      const b = { ...prev.budget };
      if (account === 'cash') {
        b.cashLocal = Number(
          (mode === 'add' ? b.cashLocal + amount : amount).toFixed(2)
        );
      } else if (account === 'transit') {
        b.transitPassLocal = Number(
          (mode === 'add' ? b.transitPassLocal + amount : amount).toFixed(2)
        );
      } else {
        b.cardUsd = Number(
          (mode === 'add' ? b.cardUsd + amount : amount).toFixed(2)
        );
      }
      return { ...prev, budget: b };
    });
    const acctName =
      account === 'cash'
        ? appCopy.walletCash
        : account === 'transit'
        ? trip.intel.transitPassName
        : appCopy.walletCard;
    const amtStr = `${account === 'card' ? '$' : trip.intel.currencySymbol}${amount.toFixed(2)}`;
    showToast(
      mode === 'add'
        ? appCopy.walletToppedUpToast(acctName, amtStr)
        : appCopy.walletCalibratedToast(acctName)
    );
  };

  const handleConvertToSplit = (expenseId: string, mySharePct = 50) => {
    const safePct = clampSharePct(mySharePct);
    const equalGroupPct = Math.round(100 / Math.max(2, activeTravelersCount));
    const isEqualGroup = safePct === 50 || safePct === equalGroupPct;
    setTrip((prev) => {
      const prevTravelers = Math.max(1, prev.setup.travelers || prev.crew.length || 1);
      if (prevTravelers <= 1) return prev;
      const target = prev.expenses.find((e) => e.id === expenseId);
      if (!target || target.split !== 'me') return prev;
      const nextExpenses: ExpenseRecord[] = prev.expenses.map((e) =>
        e.id === expenseId
          ? isEqualGroup
            ? { ...e, split: 'split', mySharePct: undefined, paidBy: undefined, settled: false }
            : { ...e, split: 'ratio', mySharePct: safePct, paidBy: 'me', settled: false }
          : e
      );
      return {
        ...prev,
        budget: {
          ...prev.budget,
          partnerOwedLocal: recomputeUnsettledPartnerOwed(nextExpenses, prevTravelers),
        },
        expenses: nextExpenses,
      };
    });
    showToast(
      isEqualGroup
        ? activeTravelersCount > 2
          ? appCopy.convertedGroupSplitToast(activeTravelersCount)
          : appCopy.converted5050SplitToast
        : appCopy.convertedRatioSplitToast(safePct, 100 - safePct)
    );
  };

  const handleSettleUp = () => {
    const now = new Date();
    const stamp = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    setTrip((prev) => {
      const unsettledItems = prev.expenses.filter(
        (e) =>
          (e.split === 'split' || e.split === 'ratio' || e.split === 'partner') &&
          !e.settled
      );
      const settledAmount = prev.budget.partnerOwedLocal;
      if (Math.abs(settledAmount) < 0.01 && unsettledItems.length === 0) {
        return prev;
      }

      const newRecord: SettlementRecord = {
        id: `stl_${Date.now()}`,
        settledAt: `Day ${prev.activeFinanceDay ?? 1} · ${stamp}`,
        amountLocal: settledAmount,
        itemCount: Math.max(1, unsettledItems.length),
      };

      return {
        ...prev,
        budget: {
          ...prev.budget,
          partnerOwedLocal: 0,
        },
        expenses: prev.expenses.map((e) =>
          (e.split === 'split' || e.split === 'ratio' || e.split === 'partner') && !e.settled
            ? { ...e, settled: true }
            : e
        ),
        settlementHistory: [newRecord, ...(prev.settlementHistory ?? [])],
      };
    });
    showToast(appCopy.settledUpToast);
  };

  const handleRequestOpenCreateWizardFromBook = () => {
    if (
      membershipStatus.isTrialExpired &&
      !membershipStatus.isProActive &&
      tripBook.length >= 1
    ) {
      openProPaywallWithReason(appCopy.paywallMultiTrip);
      return;
    }
    setTripWizardError(null);
    setWizardOverlayMode('create_new');
  };

  const renderCrewAvatarsCluster = (size: 'sm' | 'xs' = 'sm') => {
    const dimClass = size === 'xs' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]';
    const ringClass = size === 'xs' ? 'ring-1.5 ring-white' : 'ring-2 ring-white/95';
    return (
      <span className="flex items-center -space-x-1.5">
        {trip.crew.slice(0, 4).map((member) => {
          const isMySeat = member.id === claimedSeatId;
          const cleanInitials = translateMemberInitials(
            member.initials,
            preferences.language
          ).toUpperCase();
          return (
            <span
              key={member.id}
              className={`relative inline-flex ${dimClass} items-center justify-center rounded-full font-bold tracking-tight ${ringClass} ${
                isMySeat ? 'z-10' : 'z-0'
              } ${HERO_AVATAR_BG[member.accent] || HERO_AVATAR_BG.teal}`}
            >
              {cleanInitials}
            </span>
          );
        })}
      </span>
    );
  };

  const appContent = (
    <div className="tk-shell-root min-h-screen flex flex-col">
      {/* Scheme A: Immersive Destination Scenic Cover + Scroll-Down Floating Sticky Bar */}
      {wizardOverlayMode === null && (
        <>
          {/* 1. Mobile Floating Glass Sticky Bar on Scroll Down (Strictly 48px, <8% viewport height) */}
          <div
            className={`tk-shell-topbar md:hidden fixed top-0 left-0 right-0 z-40 h-12 px-3.5 flex items-center justify-between gap-2 transition-[transform,opacity] duration-200 ease-out ${
              isHeaderCollapsed
                ? 'translate-y-0 opacity-100'
                : '-translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative min-w-0 flex-1">
              <button
                ref={mobileStickyMenuAnchorRef}
                type="button"
                aria-expanded={tripMenuSource === 'mobile_sticky'}
                aria-haspopup="menu"
                onClick={() =>
                  setTripMenuSource((prev) =>
                    prev === 'mobile_sticky' ? null : 'mobile_sticky'
                  )
                }
                className="inline-flex max-w-full items-center gap-2 rounded-xl py-1 pr-2 text-left cursor-pointer"
                title={t('header.switchTripTitle')}
              >
                <img
                  src={activeCoverVisual.imageUrl}
                  alt=""
                  style={{
                    objectPosition: `50% ${activeCoverVisual.focusY}%`,
                    filter: activeCoverVisual.tone.filterCss,
                  }}
                  className="tk-shell-thumb-ring h-6 w-6 rounded-lg object-cover shrink-0"
                />
                <span className="tk-shell-ink truncate text-sm font-extrabold tracking-tight">
                  {cleanDestinationTitle}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 tk-shell-muted transition-transform duration-150 shrink-0 ${
                    tripMenuSource === 'mobile_sticky' ? 'rotate-180 tk-shell-accent' : ''
                  }`}
                />
              </button>

              {tripMenuSource === 'mobile_sticky' && (
                <Suspense fallback={null}>
                  <TripBookModal
                    open
                    anchorRef={mobileStickyMenuAnchorRef}
                    onClose={() => setTripMenuSource(null)}
                    trips={tripBook}
                    activeTripId={activeEntry.id}
                    language={preferences.language}
                    onSelectTrip={handleSelectTripFromBook}
                    onOpenCreateNewWizard={handleRequestOpenCreateWizardFromBook}
                    onOpenEditCurrentSetup={() => {
                      setTripWizardError(null);
                      setWizardOverlayMode('edit_current');
                    }}
                    onOpenCoverModal={() => setCoverModalOpen(true)}
                    onDuplicateTrip={handleDuplicateTripInBook}
                    onDeleteTrip={handleDeleteTripFromBook}
                    onAddDemoTrip={handleLoadOrAddDemoTrip}
                  />
                </Suspense>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                title={t('header.inviteCrew')}
                aria-label={t('header.inviteCrew')}
                className="tk-shell-chip h-8 inline-flex items-center gap-1.5 rounded-xl px-2 text-[11px] font-bold cursor-pointer"
              >
                {renderCrewAvatarsCluster('xs')}
                {activeRoomId && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      syncStatus === 'syncing'
                        ? 'tk-shell-dot-sync animate-pulse'
                        : syncStatus === 'error'
                        ? 'tk-shell-dot-err'
                        : 'tk-shell-dot-ok'
                    }`}
                  />
                )}
                {trip.crew.length > 1 && (
                  <span className="tabular-nums tk-shell-muted">{trip.crew.length}</span>
                )}
                <UserPlus className="h-3 w-3 tk-shell-accent" />
              </button>
            </div>
          </div>

          {/* 2. Scheme A Immersive Scenic Cover Header (Supports Pull-Down Elastic Parallax) */}
          <div className="mx-auto w-full max-w-6xl md:px-6 md:pt-3.5">
            <div
              style={{
                paddingBottom: coverPullPx > 0 ? `${Math.round(coverPullPx * 0.42)}px` : undefined,
              }}
              className={`relative min-h-[176px] sm:min-h-[196px] flex flex-col justify-between px-4 sm:px-6 pt-3.5 pb-4 ${
                coverPullPx === 0 ? 'transition-[padding] duration-300 ease-out' : ''
              }`}
            >
              {/* Clipped Scenic Cover Photo + Tone + Contrast Scrims (Separate from TripBookModal dropdown so menu never clips) */}
              <div className="tk-hero-stage absolute inset-0 overflow-hidden rounded-b-3xl md:rounded-3xl">
                <img
                  src={activeCoverVisual.imageUrl}
                  alt={cleanDestinationTitle}
                  style={{
                    objectPosition: `50% ${activeCoverVisual.focusY}%`,
                    filter: activeCoverVisual.tone.filterCss,
                    transform:
                      coverPullPx > 0
                        ? `scale(${(1 + coverPullPx * 0.0022).toFixed(4)}) translateY(${(
                            coverPullPx * 0.12
                          ).toFixed(1)}px)`
                        : 'scale(1) translateY(0px)',
                  }}
                  className={`h-full w-full object-cover will-change-transform ${
                    coverPullPx === 0 ? 'transition-transform duration-300 ease-out' : ''
                  }`}
                />
                {activeCoverVisual.tone.scrimExtraClass && (
                  <div
                    className={`absolute inset-0 pointer-events-none ${activeCoverVisual.tone.scrimExtraClass}`}
                  />
                )}
                {/* Top & Bottom Measured WCAG Scrims */}
                <div className="tk-hero-scrim-top absolute inset-x-0 top-0 h-20 pointer-events-none" />
                <div className="tk-hero-scrim-bottom absolute inset-x-0 bottom-0 h-28 pointer-events-none" />
              </div>

              {/* Top-Right Overlaid Frosted Glass Action Row (Crew Avatars without "同行成员" + Cover + Export + Settings) */}
              <div className="relative z-20 flex items-center justify-end gap-2">
                {/* Compact Crew Pill (Avatars + Count + UserPlus only — "同行成员" text removed) */}
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  title={t('header.inviteCrew')}
                  aria-label={t('header.inviteCrew')}
                  className="tk-hero-crew group h-9 inline-flex items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
                >
                  {renderCrewAvatarsCluster('sm')}
                  {activeRoomId && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        syncStatus === 'syncing'
                          ? 'tk-shell-dot-sync animate-pulse'
                          : syncStatus === 'error'
                          ? 'tk-shell-dot-err'
                          : 'tk-shell-dot-ok'
                      }`}
                    />
                  )}
                  {trip.crew.length > 1 && (
                    <span className="tabular-nums tk-shell-on-card">{trip.crew.length}</span>
                  )}
                  <UserPlus className="tk-hero-crew-icon h-3.5 w-3.5 transition-colors ml-0.5" />
                </button>
              </div>

              {/* Bottom-Left Overlaid Pure Destination Title + Clean Single-Line Weather/Date Strip */}
              <div className="relative z-30 mt-8 min-w-0">
                <div className="relative inline-block max-w-full">
                  <button
                    ref={tripMenuAnchorRef}
                    type="button"
                    aria-expanded={tripMenuSource === 'hero'}
                    aria-haspopup="menu"
                    onClick={() =>
                      setTripMenuSource((prev) => (prev === 'hero' ? null : 'hero'))
                    }
                    className="tk-hero-title-hit group inline-flex items-center gap-2 rounded-xl -ml-1.5 px-1.5 py-0.5 text-left transition-colors cursor-pointer max-w-full"
                    title={t('header.switchTripTitle')}
                  >
                    <h1 className="tk-shell-on-card text-2xl sm:text-[28px] font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] truncate shrink-0">
                      {cleanDestinationTitle}
                    </h1>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-all shrink-0 ${
                        tripMenuSource === 'hero'
                          ? 'tk-hero-menu-btn--on'
                          : 'tk-hero-menu-btn--off'
                      }`}
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-150 ${
                          tripMenuSource === 'hero' ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {tripMenuSource === 'hero' && (
                    <Suspense fallback={null}>
                      <TripBookModal
                        open
                        anchorRef={tripMenuAnchorRef}
                        onClose={() => setTripMenuSource(null)}
                        trips={tripBook}
                        activeTripId={activeEntry.id}
                        language={preferences.language}
                        onSelectTrip={handleSelectTripFromBook}
                        onOpenCreateNewWizard={handleRequestOpenCreateWizardFromBook}
                        onOpenEditCurrentSetup={() => {
                          setTripWizardError(null);
                          setWizardOverlayMode('edit_current');
                        }}
                        onOpenCoverModal={() => setCoverModalOpen(true)}
                        onDuplicateTrip={handleDuplicateTripInBook}
                        onDeleteTrip={handleDeleteTripFromBook}
                        onAddDemoTrip={handleLoadOrAddDemoTrip}
                      />
                    </Suspense>
                  )}
                </div>

                {/* Clean 1-Line Travel Context (No Pro Badge, No VAT Exit Prompt) */}
                <div className="tk-hero-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
                  <button
                    type="button"
                    onClick={() => setWizardOverlayMode('edit_current')}
                    title={t('header.editDaysTitle')}
                    className="tk-hero-link tabular-nums font-semibold underline-offset-2 hover:underline transition-colors cursor-pointer"
                  >
                    {compactDateSpan
                      ? `${compactDateSpan} (${t('header.daysCount', { count: trip.setup.days })})`
                      : t('header.daysCount', { count: trip.setup.days })}
                  </button>
                  {!compactDateSpan && (
                    <>
                      <span aria-hidden="true" className="tk-hero-meta-sep">
                        ·
                      </span>
                      <span>{translateTripStyleLabel(trip.setup.tripStyle, preferences.language)}</span>
                    </>
                  )}
                  <span aria-hidden="true" className="tk-hero-meta-sep">
                    ·
                  </span>
                  <span className="tabular-nums">
                    {formatTempRangeByPref(trip.intel.tempRange, preferences.unitSystem)}{' '}
                    {translateRainChanceLabel(trip.intel.rainChance, preferences.language)}
                  </span>
                  <span aria-hidden="true" className="tk-hero-meta-sep">
                    ·
                  </span>
                  <span className="tabular-nums">
                    {t('header.sunset', {
                      time: formatTimeByPref(trip.intel.sunsetTime, preferences.timeFormat),
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Desktop Integrated Sticky Bar (Merges Destination Switcher + Tabs + Actions into 1 slim 48px row when scrolled) */}
          <div
            className={`tk-shell-desktop hidden md:block sticky top-0 z-30 transition-shadow duration-200 ${
              isHeaderCollapsed
                ? 'tk-shell-desktop--raised'
                : 'mt-2'
            }`}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-12">
              <div className="flex items-center gap-5 min-w-0 h-full">
                {/* Compact Destination Switcher (Revealed smoothly when scrolled past cover) */}
                {isHeaderCollapsed && (
                  <div className="tk-shell-rule relative flex items-center pr-4 border-r shrink-0">
                    <button
                      ref={desktopStickyMenuAnchorRef}
                      type="button"
                      aria-expanded={tripMenuSource === 'desktop_sticky'}
                      aria-haspopup="menu"
                      onClick={() =>
                        setTripMenuSource((prev) =>
                          prev === 'desktop_sticky' ? null : 'desktop_sticky'
                        )
                      }
                      className="tk-shell-hover-plate inline-flex items-center gap-2 rounded-xl px-2 py-1 -ml-2 transition-colors cursor-pointer max-w-[240px]"
                      title={t('header.switchTripTitle')}
                    >
                      <img
                        src={activeCoverVisual.imageUrl}
                        alt=""
                        style={{
                          objectPosition: `50% ${activeCoverVisual.focusY}%`,
                          filter: activeCoverVisual.tone.filterCss,
                        }}
                        className="tk-shell-thumb-ring h-6 w-6 rounded-lg object-cover shrink-0"
                      />
                      <span className="tk-shell-ink truncate text-sm font-extrabold tracking-tight">
                        {cleanDestinationTitle}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 tk-shell-muted transition-transform duration-150 shrink-0 ${
                          tripMenuSource === 'desktop_sticky' ? 'rotate-180 tk-shell-accent' : ''
                        }`}
                      />
                    </button>

                    {tripMenuSource === 'desktop_sticky' && (
                      <Suspense fallback={null}>
                        <TripBookModal
                          open
                          anchorRef={desktopStickyMenuAnchorRef}
                          onClose={() => setTripMenuSource(null)}
                          trips={tripBook}
                          activeTripId={activeEntry.id}
                          language={preferences.language}
                          onSelectTrip={handleSelectTripFromBook}
                          onOpenCreateNewWizard={handleRequestOpenCreateWizardFromBook}
                          onOpenEditCurrentSetup={() => {
                            setTripWizardError(null);
                            setWizardOverlayMode('edit_current');
                          }}
                          onOpenCoverModal={() => setCoverModalOpen(true)}
                          onDuplicateTrip={handleDuplicateTripInBook}
                          onDeleteTrip={handleDeleteTripFromBook}
                          onAddDemoTrip={handleLoadOrAddDemoTrip}
                        />
                      </Suspense>
                    )}
                  </div>
                )}

                <nav className="flex items-center gap-7 text-sm font-semibold h-full">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    const tabToken = HERO_ACCENT_PALETTE[TAB_ACCENT_MAP[item.id]];
                    const activeBorderClass =
                      item.id === 'itinerary'
                        ? 'tk-shell-tab-border-2'
                        : item.id === 'budget'
                        ? 'tk-shell-tab-border-3'
                        : item.id === 'memories'
                        ? 'tk-shell-tab-border-4'
                        : 'tk-shell-tab-border-1';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          markOnboardingDone();
                          setTab(item.id);
                        }}
                        className={`relative inline-flex h-full items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? `${activeBorderClass} ${tabToken.textClass}`
                            : 'tk-shell-tab-idle border-transparent'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? tabToken.textClass : 'tk-shell-muted'
                          }`}
                        />
                        <span>{t(item.i18nKey)}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isHeaderCollapsed && (
                  <>
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(true)}
                      title={t('header.inviteCrew')}
                      aria-label={t('header.inviteCrew')}
                      className="tk-shell-chip h-8 inline-flex items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {renderCrewAvatarsCluster('xs')}
                      {activeRoomId && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            syncStatus === 'syncing'
                              ? 'tk-shell-dot-sync animate-pulse'
                              : syncStatus === 'error'
                              ? 'tk-shell-dot-err'
                              : 'tk-shell-dot-ok'
                          }`}
                        />
                      )}
                      {trip.crew.length > 1 && (
                        <span className="tabular-nums tk-shell-muted">{trip.crew.length}</span>
                      )}
                      <UserPlus className="h-3.5 w-3.5 tk-shell-accent" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant()}
                  className="tk-shell-fill inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('nav.aiAssistant')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Workspace */}
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 box-border ${
          wizardOverlayMode !== null
            ? 'pb-[calc(120px+env(safe-area-inset-bottom))]'
            : 'pb-[calc(112px+env(safe-area-inset-bottom))] md:pb-12'
        }`}
      >
        {wizardOverlayMode !== null ? (
          <TripSetupWizard
            key={`${wizardOverlayMode}_${activeEntry.id}`}
            mode={wizardOverlayMode}
            initialSetup={
              wizardOverlayMode === 'create_new'
                ? {
                    cities: [],
                    departureDate: new Date(Date.now() + 14 * 86400000)
                      .toISOString()
                      .slice(0, 10),
                    returnDate: new Date(Date.now() + 20 * 86400000)
                      .toISOString()
                      .slice(0, 10),
                    days: 7,
                    travelers: 2,
                    tripStyle: '休闲度假',
                    laundry: true,
                    laundryIntervalDays: 4,
                    rewear: true,
                    activities: ['城市徒步', '街头摄影', '博物馆 / 看展'],
                    specialScenarios: ['photography', 'shopping_taxfree'],
                  }
                : trip.setup
            }
            initialCrew={
              wizardOverlayMode === 'create_new'
                ? resizeCrewList([], 2)
                : trip.crew
            }
            existingPacking={
              wizardOverlayMode === 'create_new' ? undefined : trip.packing
            }
            isGenerating={isGeneratingTrip}
            errorMessage={tripWizardError}
            onCancel={
              wizardOverlayMode === 'onboarding'
                ? undefined
                : () => {
                    setTripWizardError(null);
                    setWizardOverlayMode(null);
                  }
            }
            onNormalizePacking={handleNormalizePackingFromWizard}
            onSaveEditCurrent={handleSaveEditCurrentSetup}
            onCreateNewWithAi={handleCreateNewWithAi}
            onCreateNewQuickOffline={handleCreateNewQuickOffline}
            onRegenerateCurrentWithAi={handleRegenerateCurrentWithAi}
            onLoadDefaultDemo={handleLoadOrAddDemoTrip}
            onOpenPackingWizard={() => {
              setTripWizardError(null);
              setWizardOverlayMode(null);
              setPackingWizardError(null);
              setIsPackingWizardOpen(true);
            }}
          />
        ) : (
          <>
            {firedScheduledBanner && (
              <div className="mb-4 rounded-2xl border tk-bc-forest tk-bg-forest-tint px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3 min-w-0">
                  <AccentIconBadge accent="teal" icon={BellRing} size="md" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold tk-text-forest">
                      {firedScheduledBanner.title}
                    </div>
                    <p className="mt-0.5 text-xs tk-text-ink2 line-clamp-2 sm:truncate">
                      {firedScheduledBanner.body}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {(firedScheduledBanner.targetTab !== tab ||
                    (firedScheduledBanner.targetDay !== undefined &&
                      firedScheduledBanner.targetDay !== activeFinanceDay)) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (firedScheduledBanner.targetDay !== undefined) {
                          handleSelectFinanceDay(firedScheduledBanner.targetDay);
                        }
                        setTab(firedScheduledBanner.targetTab);
                        setFiredScheduledBanner(null);
                      }}
                      className="rounded-lg tk-bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:tk-bg-press whitespace-nowrap cursor-pointer"
                    >
                      {firedScheduledBanner.targetTab === 'itinerary'
                        ? appCopy.bannerViewStop
                        : appCopy.bannerOpenPacking}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSnoozeScheduledBanner(firedScheduledBanner, 15)}
                    className="rounded-lg border tk-bc-hair bg-white px-3 py-1.5 text-xs font-semibold tk-text-forest hover:tk-bg-card whitespace-nowrap cursor-pointer"
                  >
                    {appCopy.bannerSnooze15m}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiredScheduledBanner(null)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-text-ink whitespace-nowrap cursor-pointer"
                  >
                    {t('header.gotIt')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'packing' &&
              preferences.workspaceBannerEnabled &&
              activeReminderBanner && (
              <div className="mb-5 rounded-2xl border tk-bc-warning-hair tk-bg-warning-tint px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <AccentIconBadge accent="peach" icon={BellRing} size="md" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold tk-text-warning">
                      {activeReminderBanner.headline}
                    </div>
                    {activeReminderBanner.items.length > 0 && (
                      <p className="mt-0.5 text-xs tk-text-warning line-clamp-2 sm:truncate">
                        {t('header.pendingPackPrefix')}
                        {activeReminderBanner.items.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSnoozeReminder(60)}
                    className="rounded-lg border tk-bc-warning-hair bg-white px-3 py-1.5 text-xs font-semibold tk-text-warning hover:tk-bg-warning-tint whitespace-nowrap cursor-pointer"
                  >
                    {t('header.snoozeOneHour')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderDismissed(true);
                      setActiveReminderBanner(null);
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold tk-text-warning hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {t('header.gotIt')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'packing' && (
              <PackingView
                groups={trip.packing}
                tasks={trip.tasks ?? DEFAULT_TRIP_TASKS}
                crew={trip.crew}
                claimedSeatId={claimedSeatId}
                intel={trip.intel}
                setup={trip.setup}
                cities={trip.setup.cities}
                departureDate={trip.setup.departureDate}
                reminder={reminderConfig}
                learnedCategoryMap={trip.learnedCategoryMap ?? {}}
                smartBagOverrides={trip.smartBagOverrides ?? {}}
                smartBagSummaryTip={trip.smartBagSummaryTip ?? ''}
                packingViewMode={trip.packingViewMode ?? 'checklist'}
                carryOnLimitKg={preferences.carryOnLimitKg}
                checkedLimitKg={preferences.checkedLimitKg}
                unitSystem={preferences.unitSystem}
                baggagePreset={preferences.baggagePreset}
                affiliatePartners={preferences.affiliatePartners}
                alwaysPackLibrary={alwaysPackLibrary}
                neverSuggestItems={neverSuggestItems}
                onToggleToBuy={handleToggleToBuy}
                onToggleAlwaysPack={handleToggleAlwaysPack}
                onSwitchCabinCheckIn={handleSwitchItemCabinCheckIn}
                onDontSuggestItemAgain={handleDontSuggestItemAgain}
                onSyncAlwaysPack={handleSyncAlwaysPack}
                onSeedAlwaysPack={handleSeedAlwaysPack}
                onRemoveFromAlwaysPackLibrary={handleRemoveFromAlwaysPackLibrary}
                onQuickAddAffiliateGear={handleQuickAddAffiliateGear}
                onSelectBaggagePreset={(presetKey) => {
                  const spec = BAGGAGE_PRESET_SPECS[presetKey];
                  const localizedPreset = getBaggagePresetLabels(
                    presetKey,
                    activeLang,
                    preferences.unitSystem
                  );
                  handleUpdatePreferences({
                    baggagePreset: presetKey,
                    carryOnLimitKg: spec.carryOnKg,
                    checkedLimitKg: spec.checkedKg,
                  });
                  showToast(
                    t('packing.baggagePresetSwitched', { label: localizedPreset.shortLabel })
                  );
                }}
                onChangePackingViewMode={handleChangePackingViewMode}
                onSaveSmartBagPlan={handleSaveSmartBagPlan}
                onAssignItemSmartBag={handleAssignItemSmartBag}
                onResetSmartBagOverrides={handleResetSmartBagOverrides}
                onAuditMissingItems={handleAuditMissingItems}
                onBatchAddMissingItems={handleBatchAddMissingItems}
                onToggleItem={handleTogglePackItem}
                onAddItem={handleAddPackItem}
                onAdjustItemQuantity={handleAdjustItemQuantity}
                onAddGroup={handleAddPackGroup}
                onUpdateGroup={handleUpdatePackGroup}
                onDeleteGroup={handleDeletePackGroup}
                onUpdateItem={handleUpdatePackItem}
                onDeleteItem={handleDeletePackItem}
                onCycleOwnership={handleCycleOwnership}
                onToggleMorningOfDeparture={handleToggleMorningOfDeparture}
                onReorderGroups={handleReorderGroups}
                onMoveOrReorderItem={handleMoveOrReorderItem}
                onClassifyAndAddPackItem={handleClassifyAndAddPackItem}
                onCommitClassifiedItem={handleCommitClassifiedItem}
                onDeduplicateExistingItem={handleDeduplicateExistingItem}
                onTogglePinReminder={handleTogglePinReminder}
                onUpdateReminder={handleUpdateReminder}
                onTriggerTestReminder={handleTriggerTestReminder}
                onTriggerMorningReminder={handleTriggerMorningReminder}
                onRequestBrowserPermission={() => {
                  void handleRequestBrowserPermission();
                }}
                notificationPermission={notificationPermission}
                timeFormat={preferences.timeFormat}
                scheduledPackingAlerts={scheduledPackingAlerts}
                onAddCustomPackingAlert={handleAddCustomPackingAlert}
                onRemoveScheduledAlert={handleRemoveScheduledAlert}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onAiParseAndAddTasks={handleAiParseAndAddTasks}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onCycleTaskOwner={handleCycleTaskOwner}
                onApplySmartParams={handleGenerateCustomPackingList}
                onOpenItemInGoMode={handleOpenItemInGoMode}
                packingTemplates={packingTemplates}
                onSavePackingTemplate={handleSavePackingTemplate}
                onApplyPackingTemplate={handleApplyPackingTemplate}
                onDeletePackingTemplate={handleDeletePackingTemplate}
                onRenamePackingTemplate={handleRenamePackingTemplate}
                packingSegments={packingSegments}
                activePackingSegmentId={activePackingSegmentId}
                onChangePackingSegment={setActivePackingSegmentId}
                onSetItemSegments={handleSetItemSegments}
              />
            )}
            {tab === 'budget' && (
              <Suspense fallback={null}>
                <BudgetView
                  budget={trip.budget}
                  expenses={trip.expenses}
                  intel={trip.intel}
                  totalDays={trip.setup.days}
                  activeDay={activeFinanceDay}
                  cities={trip.setup.cities}
                  cityDays={trip.setup.cityDays}
                  timeline={trip.timeline}
                  travelersCount={activeTravelersCount}
                  companionName={activeCompanionName}
                  homeCurrency={preferences.homeCurrency}
                  settlementHistory={trip.settlementHistory ?? []}
                  onSelectDay={handleSelectFinanceDay}
                  onAddExpense={addExpenseAtomic}
                  onUpdateExpense={handleUpdateExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onCycleVatStatus={handleCycleVatStatus}
                  onConvertExpenseToSplit={handleConvertToSplit}
                  onSettleUp={handleSettleUp}
                  onUpdateBudgetLimits={handleUpdateBudgetLimits}
                  onUpdateHomeCurrency={(code) => {
                    handleUpdatePreferences({ homeCurrency: code });
                    showToast(appCopy.displayCurrencySetToast(getHomeCurrencyLabel(code, activeLang)));
                  }}
                  onAdjustWalletBalance={handleAdjustWalletBalance}
                  onAiParseExpense={handleAiParseExpense}
                  onOpenAiAssistant={handleOpenAiAssistant}
                />
              </Suspense>
            )}
            {tab === 'itinerary' && (() => {
              const activeDay = Math.min(
                Math.max(1, trip.setup.days),
                Math.max(1, trip.activeFinanceDay ?? 1)
              );
              const dayRainSwapped =
                trip.rainSwappedDays?.[activeDay] ??
                (activeDay === 2 ? trip.rainSwapped : false);
              const daySummary =
                trip.spatialSummariesByDay?.[activeDay] ||
                (activeDay === 2 ? trip.spatialSummary : '');
              const dayClustered =
                trip.spatialClusteredByDay?.[activeDay] ??
                (activeDay === 2 ? trip.spatialClustered : false);

              return (
                <Suspense fallback={null}>
                  <ItineraryView
                    timeline={trip.timeline}
                    wishlist={trip.wishlist}
                    cities={trip.setup.cities}
                    cityDays={trip.setup.cityDays}
                    totalDays={trip.setup.days}
                    activeDay={activeDay}
                    departureDate={trip.setup.departureDate}
                    dayStays={trip.dayStays}
                    travelPasses={trip.travelPasses}
                    affiliatePartners={preferences.affiliatePartners}
                    dailyBudgetLocal={trip.budget.dailyBudgetLocal}
                    initialBudgetTier={trip.setup.budgetTier}
                    tripStyle={trip.setup.tripStyle}
                    crew={trip.crew}
                    meetup={trip.meetup}
                    companionName={activeCompanionName}
                    timeFormat={preferences.timeFormat}
                    intel={trip.intel}
                    rainSwapped={dayRainSwapped}
                    rainSwappedDays={trip.rainSwappedDays}
                    spatialSummary={daySummary}
                    spatialClustered={dayClustered}
                    warningNote={itineraryWarning}
                    onSelectDay={handleSelectFinanceDay}
                    onToggleRainSwap={handleToggleRainSwap}
                    onToggleVisitedNode={handleToggleVisitedNode}
                    onQuickLogNode={handleQuickLogNode}
                    onAddNode={handleAddTimelineNode}
                    onUpdateNode={handleUpdateTimelineNode}
                    onDeleteNode={handleDeleteTimelineNode}
                    onMoveNodeOrder={handleMoveTimelineNodeOrder}
                    onReorderDayNodes={handleReorderTimelineNodes}
                    previousDayNodes={preReclusterByDay[activeDay]}
                    onRestorePreviousDayOrder={handleRestorePreviousDayOrder}
                    onMoveNodeToWishlist={handleMoveNodeToWishlist}
                    onAddWishlistItem={handleAddWishlistItem}
                    onRemoveWishlistItem={handleRemoveWishlistItem}
                    onUpdateMeetup={handleUpdateMeetup}
                    onOptimizeItinerary={handleOptimizeItinerary}
                    onPlanFullItinerary={handlePlanFullItinerary}
                    onSmartReorderAllUnvisited={handleSmartReorderAllUnvisited}
                    canUndoSmartReorder={Boolean(
                      preSmartReorderSnapshot &&
                        preSmartReorderSnapshot.tripId === activeEntry.id
                    )}
                    onUndoSmartReorder={handleUndoSmartReorder}
                    snapshotEntries={snapshotEntriesForUi}
                    onRestoreSnapshot={handleRestoreSnapshot}
                    onGenerateLocalCard={handleGenerateLocalCard}
                    onOpenAiAssistant={handleOpenAiAssistant}
                    notificationPermission={notificationPermission}
                    itineraryLeadMinutes={activeTripNotifState.itineraryLeadMinutes}
                    armedStopLeads={armedStopLeadsMap}
                    isMeetupAlertArmed={Boolean(
                      activeTripNotifState.armedMeetupDays[activeDay]
                    )}
                    scheduledItineraryAlerts={scheduledItineraryAlerts}
                    onRequestBrowserPermission={handleRequestBrowserPermission}
                    onChangeItineraryLeadMinutes={handleChangeItineraryLeadMinutes}
                    onToggleStopAlert={handleToggleStopAlert}
                    onToggleDayStopsAlerts={handleToggleDayStopsAlerts}
                    onToggleMeetupAlert={handleToggleMeetupAlert}
                    onAddCustomItineraryAlert={handleAddCustomItineraryAlert}
                    onRemoveScheduledAlert={handleRemoveScheduledAlert}
                    onOpenGoModeWallet={(d) => handleOpenGoModeWallet(d)}
                    onUpdateDayStay={handleUpdateDayStay}
                    onUpsertTravelPass={(p) => handleUpsertTravelPass(p)}
                    onDeleteTravelPass={handleDeleteTravelPass}
                    onOpenPassInGoMode={handleOpenPassByIdInGoMode}
                  />
                </Suspense>
              );
            })()}
            {tab === 'memories' && (
              <Suspense fallback={null}>
                <MyKitView
                  trips={tripBook}
                  activeTripId={activeEntry.id}
                  authUser={authUser}
                  preferences={preferences}
                  membershipStatus={membershipStatus}
                  isExportingPdf={isExportingPdf}
                  onExportPdf={handleExportPdf}
                  onUpdateHomeCurrency={(code) => {
                    handleUpdatePreferences({ homeCurrency: code });
                    showToast(appCopy.displayCurrencySetToast(getHomeCurrencyLabel(code, activeLang)));
                  }}
                  onOpenAuthModal={(mode) => openAuthModal(mode)}
                  onOpenSettings={(focusSection = 'top') => {
                    setSettingsInitialSubView('main');
                    setSettingsFocusSection(focusSection);
                    setSettingsOpen(true);
                  }}
                  onOpenProModal={() => setProModalOpen(true)}
                  onToast={showToast}
                />
              </Suspense>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Glass Navigation: 5 Thumb-Zone Touchpoints (within 15% sticky height cap) */}
      {wizardOverlayMode === null && (
        <nav className="tk-shell-bottomnav md:hidden fixed bottom-0 left-0 right-0 z-30">
          <div className="grid grid-cols-5 h-14 px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = !aiDrawerOpen && tab === item.id;
              const tabToken = HERO_ACCENT_PALETTE[TAB_ACCENT_MAP[item.id]];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAiDrawerOpen(false);
                    setTab(item.id);
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    active ? tabToken.textClass : 'tk-shell-muted'
                  }`}
                >
                  <span
                    className={`relative inline-flex items-center justify-center rounded-full px-3 py-0.5 transition-colors ${
                      active ? tabToken.soft10Class : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{t(item.i18nKey)}</span>
                </button>
              );
            })}

            {(() => {
              const aiToken = HERO_ACCENT_PALETTE[TAB_ACCENT_MAP.ai];
              return (
                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant()}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    aiDrawerOpen ? aiToken.textClass : 'tk-shell-muted'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 transition-colors ${
                      aiDrawerOpen ? aiToken.soft10Class : aiToken.textClass
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span>{t('nav.aiAssistant')}</span>
                </button>
              );
            })()}
          </div>
        </nav>
      )}

      {aiDrawerOpen && (
        <Suspense fallback={null}>
          <AiAssistantDrawer
            open={aiDrawerOpen}
            onClose={() => setAiDrawerOpen(false)}
            activeTab={tab}
            currencySymbol={trip.intel.currencySymbol}
            currencyCode={trip.intel.currencyCode}
            primaryCity={trip.setup.cities[0]}
            cities={trip.setup.cities}
            routeTitle={formatDestinationOnlyTitle(trip, activeLang)}
            totalDays={Math.max(1, trip.setup.days)}
            currentDay={activeFinanceDay}
            companionName={activeCompanionName}
            travelersCount={activeTravelersCount}
            carryOnLimitKg={preferences.carryOnLimitKg}
            checkedLimitKg={preferences.checkedLimitKg}
            initialPrompt={assistantInitialPrompt}
            onClearInitialPrompt={() => setAssistantInitialPrompt('')}
            onDispatchCommand={handleAssistantDispatch}
            onApplyProposal={handleApplyAiProposal}
            onUploadReceiptAndAdd={handleUploadReceiptInAssistant}
            permissionState={aiWriteDomains}
            onToggleWriteDomain={handleToggleAiWriteDomain}
            snapshotEntries={snapshotEntriesForUi}
            onRestoreSnapshot={handleRestoreSnapshot}
            diffBaseline={assistantDiffBaseline}
            onNavigateToModule={(targetTab, targetDay) => {
              if (typeof targetDay === 'number' && targetDay >= 1) {
                handleSelectFinanceDay(targetDay);
              }
              setTab(targetTab);
              setAiDrawerOpen(false);
            }}
          />
        </Suspense>
      )}

      {auditOpen && (
        <Suspense fallback={null}>
          <ExpertAuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
        </Suspense>
      )}

      {inviteModalOpen && (
        <Suspense fallback={null}>
          <CrewInviteModal
            open={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            trip={trip}
            authUser={authUser}
            authReady={authReady}
            activeRoomId={activeRoomId}
            claimedSeatId={claimedSeatId}
            syncStatus={syncStatus}
            lastSyncedByName={lastSyncedByName}
            initialJoinCode={pendingJoinCode}
            onClearInitialJoinCode={() => setPendingJoinCode(null)}
            onConnectedToRoom={handleConnectedToRoom}
            onChangeClaimedSeatLocal={(seat) => setClaimedSeatId(seat)}
            onDisconnectRoom={handleDisconnectRoom}
            onUpdateCrewMember={handleUpdateCrewMember}
            onAddCompanionSeatLocal={handleAddCompanionSeatLocal}
            onRemoveCompanionSeatLocal={handleRemoveCompanionSeatLocal}
            onRequireProForRoomCreation={() => {
              if (membershipStatus.isTrialExpired && !membershipStatus.isProActive) {
                setInviteModalOpen(false);
                openProPaywallWithReason(appCopy.paywallCreateCloudRoom);
                return true;
              }
              return false;
            }}
            onOpenAuthModal={() => openAuthModal('signin')}
            onToast={showToast}
          />
        </Suspense>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            open={settingsOpen}
            initialSubView={settingsInitialSubView}
            initialFocusSection={settingsFocusSection}
            onClose={() => {
              setSettingsOpen(false);
              setSettingsInitialSubView('main');
              setSettingsFocusSection('top');
            }}
            preferences={preferences}
            membershipStatus={membershipStatus}
            onUpdatePreferences={handleUpdatePreferences}
            onSwitchLanguage={handleSwitchLanguage}
            onFollowSystemLanguage={handleFollowSystemLanguage}
            onOpenProModal={() => {
              setSettingsOpen(false);
              setSettingsInitialSubView('main');
              setSettingsFocusSection('top');
              openProPaywallWithReason(null);
            }}
            onOpenExpertAudit={() => setAuditOpen(true)}
            groups={trip.packing}
            learnedCategoryMap={trip.learnedCategoryMap ?? {}}
            onAddGroup={handleAddPackGroup}
            onUpdateGroup={handleUpdatePackGroup}
            onDeleteGroup={handleDeletePackGroup}
            onReorderGroups={handleReorderGroups}
            onDeleteLearnedCategory={handleDeleteLearnedCategory}
            onClearLearnedCategories={handleClearLearnedCategories}
            unpackedCount={unpackedCount}
            reminder={reminderConfig}
            notificationPermission={notificationPermission}
            onUpdateReminder={handleUpdateReminder}
            onRequestBrowserPermission={handleRequestBrowserPermission}
            onTriggerTestReminder={handleTriggerTestReminder}
            scheduledAlerts={resolvedScheduledAlerts}
            onRemoveScheduledAlert={handleRemoveScheduledAlert}
            authUser={authUser}
            activeRoomId={activeRoomId}
            tripBook={tripBook}
            activeTripId={activeEntry.id}
            activeCityHint={getPrimaryCityName(
              getCityForDay(
                trip.setup.cities,
                Math.min(Math.max(1, trip.setup.days), Math.max(1, trip.activeFinanceDay ?? 2)),
                Math.max(1, trip.setup.days),
                trip.timeline,
                undefined,
                trip.setup.cityDays
              )
            )}
            onImportBackupData={handleImportBackupData}
            onOpenAuthModal={(mode) => {
              setSettingsOpen(false);
              openAuthModal(mode);
            }}
            onToast={showToast}
          />
        </Suspense>
      )}

      {authModalState.open && (
        <Suspense fallback={null}>
          <AuthModal
            open={authModalState.open}
            mode={authModalState.mode}
            authUser={authUser}
            language={activeLang}
            activeRoomId={activeRoomId}
            coverImageUrl={activeCoverVisual.imageUrl}
            onClose={() => {
              if (authModalState.mode === 'welcome') {
                markWelcomeAuthSeen();
              }
              setAuthModalState((prev) => ({ ...prev, open: false }));
            }}
            onSkipWelcome={markWelcomeAuthSeen}
            onSignedIn={() => {
              markWelcomeAuthSeen();
            }}
            onAccountDeleted={() => {
              if (activeRoomId) {
                handleDisconnectRoom();
              }
            }}
            onToast={showToast}
          />
        </Suspense>
      )}

      {proModalOpen && (
        <Suspense fallback={null}>
          <TripKitProModal
            open={proModalOpen}
            onClose={() => {
              setProModalOpen(false);
              setProTriggerReason(null);
            }}
            triggerReason={proTriggerReason}
            membershipStatus={membershipStatus}
            currentPlan={preferences.proPlan}
            redeemedCode={preferences.redeemedCode}
            authUser={authUser}
            onRedeemActivated={handleRedeemProActivated}
            onDeactivatePro={handleDeactivatePro}
            onOpenAdminCodeGenerator={() => {
              setProModalOpen(false);
              setProTriggerReason(null);
              setSettingsInitialSubView('admin_codes');
              setSettingsOpen(true);
            }}
            onToast={showToast}
          />
        </Suspense>
      )}

      {isPackingWizardOpen && (
        <Suspense fallback={null}>
          <PackingListWizardModal
            isOpen={isPackingWizardOpen}
            setup={trip.setup}
            intel={trip.intel}
            checkedLimitKg={preferences.checkedLimitKg}
            existingTotalCount={trip.packing.reduce((sum, g) => sum + g.items.length, 0)}
            existingPackedCount={trip.packing.reduce(
              (sum, g) => sum + g.items.filter((it) => it.done).length,
              0
            )}
            alwaysPackCount={alwaysPackLibrary.length}
            neverSuggestCount={neverSuggestItems.length}
            isGenerating={isGeneratingPackingList}
            errorMessage={packingWizardError}
            onClose={() => {
              if (!isGeneratingPackingList) {
                setIsPackingWizardOpen(false);
                setPackingWizardError(null);
              }
            }}
            onEditTripRoute={() => {
              setWizardOverlayMode('edit_current');
            }}
            onSubmit={handleGenerateCustomPackingList}
          />
        </Suspense>
      )}

      {goModeOpen && (
        <Suspense fallback={null}>
          <GoModeWalletModal
            open={goModeOpen}
            passes={trip.travelPasses || []}
            setup={trip.setup}
            intel={trip.intel}
            affiliatePartners={preferences.affiliatePartners}
            initialFocusPassId={goModeFocusPassId}
            initialFilterDay={goModeFilterDay}
            currentDay={Math.min(
              Math.max(1, trip.setup.days),
              Math.max(1, trip.activeFinanceDay ?? 1)
            )}
            onClose={() => {
              setGoModeOpen(false);
              setGoModeFocusPassId(null);
              setGoModeFilterDay(null);
            }}
            onUpsertPass={handleUpsertTravelPass}
            onDeletePass={handleDeleteTravelPass}
            onSmartSeedFromTrip={handleSmartSeedPassesFromTrip}
            onToast={showToast}
          />
        </Suspense>
      )}

      {coverModalOpen && (
        <Suspense fallback={null}>
          <TripCoverModal
            open={coverModalOpen}
            onClose={() => setCoverModalOpen(false)}
            tripId={activeEntry.id}
            destinationTitle={cleanDestinationTitle}
            subtitlePreview={headerSubtitlePreview}
            setup={trip.setup}
            coverConfig={trip.coverConfig}
            customCoverDataUrl={customCoverDataUrl}
            language={preferences.language}
            onSaveCover={handleSaveTripCover}
            onToast={showToast}
          />
        </Suspense>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 rounded-xl tk-bg-ink px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );

  const mapsApiKey = getConfiguredGoogleMapsApiKey();
  return mapsApiKey ? (
    <APIProvider apiKey={mapsApiKey} language={activeLang}>
      {appContent}
    </APIProvider>
  ) : (
    appContent
  );
}

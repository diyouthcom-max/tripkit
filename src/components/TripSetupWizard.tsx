import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  MapPin,
  Plus,
  Minus,
  X,
  Shirt,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Users,
  Calendar,
  Check,
  AlertTriangle,
  Zap,
  Eye,
  Compass,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Backpack,
  Luggage,
  Plane,
  Footprints,
  Camera,
  Umbrella,
  Waves,
  Flame,
  Mountain,
  Snowflake,
  Tent,
  Bike,
  Dumbbell,
  Activity,
  Landmark,
  Coffee,
  Ticket,
  Utensils,
  ShoppingBag,
  Laptop,
  Baby,
  Smile,
  Pill,
  ShieldCheck,
  Sun,
  Mic,
  User,
  Home,
  UsersRound,
  Briefcase,
  Heart,
  Palmtree,
  type LucideIcon,
} from 'lucide-react';
import { ACTIVITY_GROUPS, DEFAULT_TRIP_STATE } from '../data/presets';
import {
  redistributeCityDaysForTotal,
  resolveCityDaysAllocation,
} from '../utils/itineraryHelpers';
import {
  computeClothingNormalizationPlan,
  formatWeightCompact,
  type ClothingNormalizationPlan,
} from '../utils/packingHelpers';
import { useTranslation } from 'react-i18next';
import {
  loadAppPreferences,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import { pickLang } from '../i18n/langHelper';
import { getPackingScenarioLabel } from '../i18n/packs/packingWizardUiPack';
import {
  ACTIVITY_GROUP_TITLES,
  ACTIVITY_NAME_MAP,
  BUDGET_TIER_COPY_MAP,
  getLocalizedCrewFallbacks,
  getTripSetupWizardCopy,
  translatePopularCity,
} from '../i18n/packs/tripSetupWizardPack';
import {
  getStep1ManifestCopy,
  inferTripSeasonKey,
  type Step1VibeKey,
} from '../i18n/packs/step1ManifestPack';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import { InlineDatePickerPopover } from './InlineDatePickerPopover';
import {
  buildPerStopWeatherForecasts,
  inferDefaultScenariosFromSetup,
} from '../utils/packingWizardHelpers';
import type {
  AppLanguage,
  BudgetTier,
  CrewMember,
  PackingClothingGender,
  PackingDensityLevel,
  PackingGroup,
  PackingScenarioId,
  PackingWeatherOverride,
  TripSetup,
  TripStyle,
} from '../types';

export type WizardMode = 'onboarding' | 'create_new' | 'edit_current';
type WizardStep = 1 | 2 | 3;

interface TripSetupWizardProps {
  mode: WizardMode;
  initialSetup: TripSetup;
  initialCrew: CrewMember[];
  existingPacking?: PackingGroup[];
  isGenerating: boolean;
  errorMessage?: string | null;
  onCancel?: () => void;
  onNormalizePacking?: (
    nextSetup: TripSetup,
    normalizedPacking: PackingGroup[],
    plan: ClothingNormalizationPlan,
    isUndo?: boolean
  ) => void;
  onSaveEditCurrent?: (
    nextSetup: TripSetup,
    nextCrew: CrewMember[],
    normalizedPacking?: PackingGroup[]
  ) => void;
  onOpenPackingWizard?: () => void;
  onCreateNewWithAi: (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    naturalPrompt?: string
  ) => Promise<void>;
  onCreateNewQuickOffline: (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    customPacking?: PackingGroup[]
  ) => void;
  onRegenerateCurrentWithAi?: (
    draftSetup: TripSetup,
    draftCrew: CrewMember[],
    naturalPrompt?: string
  ) => Promise<void>;
  onLoadDefaultDemo?: () => void;
}

const TRIP_STYLE_KEYS: Step1VibeKey[] = [
  '休闲度假',
  '长期数字游民',
  '商务出差',
  '浪漫蜜月',
];

const TRIP_STYLE_ICON_MAP: Record<TripStyle, LucideIcon> = {
  休闲度假: Palmtree,
  长期数字游民: Laptop,
  商务出差: Briefcase,
  浪漫蜜月: Heart,
  亲子出行: Users,
};

const BUDGET_TIER_KEYS: BudgetTier[] = ['budget', 'comfort', 'luxury'];

/**
 * Only the 4 non-overlapping personal care constraints belong in Step 2's Special Care panel;
 * luggage volume & cabin-only rules live exclusively in Step 3's visual Luggage Constraint cards
 * so users never see duplicate luggage concepts across steps.
 */
const CARE_CONSTRAINT_SCENARIOS: PackingScenarioId[] = [
  'baby',
  'kids',
  'medication',
  'sensitive_skin',
];

const ACTIVITY_TO_SCENARIO: Partial<Record<string, PackingScenarioId>> = {
  '海滨 / 海滩度假': 'beach',
  '游泳 / 泳池': 'swimming',
  '温泉 / SPA': 'onsen',
  远足登山: 'hiking',
  雪上运动: 'ski_snow',
  露营野餐: 'camping',
  健身房: 'fitness',
  晨跑: 'fitness',
  街头摄影: 'photography',
  远程办公: 'remote_work',
  '正式晚餐 / Bistro': 'formal_event',
  '购物 & 退税': 'shopping_taxfree',
  主题乐园: 'theme_park',
};

const ACTIVITY_ICON_MAP: Record<string, LucideIcon> = {
  城市徒步: Footprints,
  街头摄影: Camera,
  '海滨 / 海滩度假': Umbrella,
  '游泳 / 泳池': Waves,
  '温泉 / SPA': Flame,
  远足登山: Mountain,
  雪上运动: Snowflake,
  露营野餐: Tent,
  骑行探索: Bike,
  健身房: Dumbbell,
  晨跑: Activity,
  '博物馆 / 看展': Landmark,
  '精品咖啡 / 市集': Coffee,
  主题乐园: Ticket,
  '正式晚餐 / Bistro': Utensils,
  '购物 & 退税': ShoppingBag,
  远程办公: Laptop,
};

const CARE_ICON_MAP: Partial<Record<PackingScenarioId, LucideIcon>> = {
  baby: Baby,
  kids: Smile,
  medication: Pill,
  sensitive_skin: ShieldCheck,
};

function computeReturnDate(departureDate: string, days: number): string {
  const base = new Date(`${departureDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return departureDate;
  base.setDate(base.getDate() + Math.max(1, days) - 1);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeDaysBetween(departureDate: string, returnDate: string): number | null {
  const start = new Date(`${departureDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(2, Math.min(30, diffDays));
}

function formatShortStopDateSpan(
  departureDate: string,
  offsetDays: number,
  stayDays: number,
  lang: AppLanguage
): string {
  const base = new Date(`${departureDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  const start = new Date(base);
  start.setDate(start.getDate() + Math.max(0, offsetDays));
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, stayDays) - 1);
  try {
    const fmt = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' });
    return stayDays <= 1 ? fmt.format(start) : `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    const sm = start.getMonth() + 1;
    const sd = start.getDate();
    const em = end.getMonth() + 1;
    const ed = end.getDate();
    return stayDays <= 1 ? `${sm}/${sd}` : `${sm}/${sd} – ${em}/${ed}`;
  }
}

function formatReadableDateRange(
  startIso: string,
  endIso: string,
  lang: AppLanguage
): { startText: string; endText: string } {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { startText: startIso, endText: endIso };
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  try {
    const startFmt = new Intl.DateTimeFormat(lang, {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
    const endFmt = new Intl.DateTimeFormat(lang, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return { startText: startFmt.format(start), endText: endFmt.format(end) };
  } catch {
    return { startText: startIso, endText: endIso };
  }
}

function resizeDraftCrew(
  prev: CrewMember[],
  count: number,
  lang: AppLanguage = 'zh-CN'
): CrewMember[] {
  const fallbacks = getLocalizedCrewFallbacks(lang);
  const safeCount = Math.max(1, Math.min(4, Math.round(count) || 1));
  const out: CrewMember[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    if (prev[i]) {
      out.push(prev[i]);
    } else {
      const tpl = fallbacks[i] || fallbacks[1];
      out.push({ ...tpl, id: `m${i + 1}` });
    }
  }
  return out;
}

export const TripSetupWizard: React.FC<TripSetupWizardProps> = ({
  mode,
  initialSetup,
  initialCrew,
  existingPacking,
  isGenerating,
  errorMessage,
  onCancel,
  onSaveEditCurrent,
  onCreateNewWithAi,
  onCreateNewQuickOffline,
  onRegenerateCurrentWithAi,
  onOpenPackingWizard,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getTripSetupWizardCopy(activeLang);
  const step1Copy = getStep1ManifestCopy(activeLang);
  const unitSystem = loadAppPreferences().unitSystem;

  const isEditMode = mode === 'edit_current';
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState<WizardStep>(() =>
    isEditMode ? 3 : 1
  );

  const [setup, setSetup] = useState<TripSetup>(() => ({
    ...initialSetup,
    cityDays: resolveCityDaysAllocation(
      initialSetup.cities,
      initialSetup.days,
      initialSetup.cityDays
    ),
    specialScenarios:
      initialSetup.specialScenarios !== undefined
        ? initialSetup.specialScenarios
        : inferDefaultScenariosFromSetup(initialSetup, 23),
    returnDate: computeReturnDate(initialSetup.departureDate, initialSetup.days),
  }));
  const [crew, setCrew] = useState<CrewMember[]>(() =>
    resizeDraftCrew(initialCrew, initialSetup.travelers, activeLang)
  );
  const [cityInput, setCityInput] = useState('');
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [showAiQuickInput, setShowAiQuickInput] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiProgressStageIdx, setAiProgressStageIdx] = useState(0);
  const [confirmOverwriteAi, setConfirmOverwriteAi] = useState(false);

  const workingPacking = useMemo<PackingGroup[]>(() => {
    if (isEditMode && existingPacking && existingPacking.length > 0) {
      return existingPacking;
    }
    return [];
  }, [isEditMode, existingPacking]);
  const baselineDays = initialSetup.days;
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const wizardRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGenerating) {
      setAiProgressStageIdx(0);
      return;
    }
    setAiProgressStageIdx(0);
    const t15 = window.setTimeout(() => setAiProgressStageIdx(1), 15_000);
    const t35 = window.setTimeout(() => setAiProgressStageIdx(2), 35_000);
    return () => {
      window.clearTimeout(t15);
      window.clearTimeout(t35);
    };
  }, [isGenerating]);

  const updateSetup = (patch: Partial<TripSetup>) => {
    const nextCities = patch.cities !== undefined ? patch.cities : setup.cities;
    const minTripDays = Math.max(2, nextCities.length);

    if (patch.days !== undefined) {
      const clampedDays = Math.max(minTripDays, Math.min(30, Math.round(patch.days) || minTripDays));
      patch = { ...patch, days: clampedDays };
    }
    setSetup((prev) => {
      const next = { ...prev, ...patch };
      if (patch.days !== undefined && patch.cityDays === undefined && next.cities.length > 0) {
        const curAlloc = resolveCityDaysAllocation(next.cities, prev.days, prev.cityDays);
        next.cityDays = redistributeCityDaysForTotal(curAlloc, next.days);
      }
      next.returnDate = computeReturnDate(next.departureDate, next.days);
      if (patch.travelers !== undefined && patch.travelers !== prev.travelers) {
        setCrew((cPrev) => resizeDraftCrew(cPrev, next.travelers, activeLang));
      }
      return next;
    });
  };

  const handleSelectTripStyle = (styleKey: TripStyle) => {
    const patch: Partial<TripSetup> = { tripStyle: styleKey };
    const curScenarios = setup.specialScenarios || [];
    const curActs = setup.activities || [];

    if (styleKey === '亲子出行' && !curScenarios.includes('kids')) {
      patch.specialScenarios = [...curScenarios, 'kids'];
    } else if (styleKey === '长期数字游民') {
      if (!curActs.includes('远程办公')) {
        patch.activities = [...curActs, '远程办公'];
      }
      if (!curScenarios.includes('remote_work')) {
        patch.specialScenarios = [...curScenarios, 'remote_work'];
      }
      patch.laundry = true;
    }

    updateSetup(patch);
  };

  const parseCityTokens = (raw: string): string[] =>
    raw
      .split(/\s*(?:→|->|、|,|，|\/)\s*/)
      .map((c) => c.trim())
      .filter(Boolean);

  const resolvedCityDays = useMemo(
    () => resolveCityDaysAllocation(setup.cities, setup.days, setup.cityDays),
    [setup.cities, setup.days, setup.cityDays]
  );

  const addCity = (name: string) => {
    const tokens = parseCityTokens(name);
    if (tokens.length === 0) return;
    setValidationError(null);
    const merged = [...setup.cities];
    const currentAlloc = resolveCityDaysAllocation(setup.cities, setup.days, setup.cityDays);
    let addedCount = 0;

    for (const token of tokens) {
      if (!merged.includes(token)) {
        merged.push(token);
        addedCount += 1;
      }
    }
    if (addedCount === 0) {
      setCityInput('');
      return;
    }

    let nextAlloc: number[];
    let nextTotal: number;
    if (setup.cities.length === 0) {
      nextTotal = Math.max(Math.max(2, merged.length * 2), Math.min(30, setup.days));
      nextAlloc = resolveCityDaysAllocation(merged, nextTotal);
    } else {
      nextAlloc = [...currentAlloc];
      for (let i = 0; i < addedCount; i += 1) {
        const curSum = nextAlloc.reduce((s, v) => s + v, 0);
        const headroom = 30 - curSum;
        if (headroom >= 1) {
          nextAlloc.push(Math.min(3, headroom));
        } else {
          let maxIdx = 0;
          for (let j = 1; j < nextAlloc.length; j += 1) {
            if (nextAlloc[j] > nextAlloc[maxIdx]) maxIdx = j;
          }
          if (nextAlloc[maxIdx] > 1) {
            nextAlloc[maxIdx] -= 1;
          }
          nextAlloc.push(1);
        }
      }
      nextTotal = Math.max(
        Math.max(2, merged.length),
        Math.min(30, nextAlloc.reduce((s, v) => s + v, 0))
      );
    }

    updateSetup({ cities: merged, cityDays: nextAlloc, days: nextTotal });
    setCityInput('');
  };

  const removeCityAt = (removeIdx: number) => {
    const nextCities = setup.cities.filter((_, i) => i !== removeIdx);
    if (nextCities.length === 0) {
      updateSetup({ cities: [], cityDays: [] });
      return;
    }
    const nextAlloc = resolvedCityDays.filter((_, i) => i !== removeIdx);
    const rawSum = nextAlloc.reduce((s, v) => s + v, 0);
    const nextTotal = Math.max(Math.max(2, nextCities.length), Math.min(30, rawSum));
    const finalAlloc =
      nextCities.length === 1
        ? [nextTotal]
        : rawSum === nextTotal
        ? nextAlloc
        : redistributeCityDaysForTotal(nextAlloc, nextTotal);
    updateSetup({ cities: nextCities, cityDays: finalAlloc, days: nextTotal });
  };

  const moveCity = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= setup.cities.length) return;
    const nextCities = [...setup.cities];
    const nextAlloc = [...resolvedCityDays];
    [nextCities[idx], nextCities[targetIdx]] = [nextCities[targetIdx], nextCities[idx]];
    [nextAlloc[idx], nextAlloc[targetIdx]] = [nextAlloc[targetIdx], nextAlloc[idx]];
    updateSetup({ cities: nextCities, cityDays: nextAlloc });
  };

  const updateCityStayDays = (idx: number, desiredDays: number) => {
    if (idx < 0 || idx >= setup.cities.length) return;
    const otherSum = resolvedCityDays.reduce((s, v, i) => (i === idx ? s : s + v), 0);
    const maxForThis = Math.max(1, 30 - otherSum);
    const clamped = Math.max(1, Math.min(maxForThis, Math.round(desiredDays) || 1));
    const nextAlloc = resolvedCityDays.map((v, i) => (i === idx ? clamped : v));
    const nextTotal = Math.max(
      Math.max(2, setup.cities.length),
      Math.min(30, nextAlloc.reduce((s, v) => s + v, 0))
    );
    updateSetup({ cityDays: nextAlloc, days: nextTotal });
  };

  const handleEqualSplitCityDays = () => {
    if (setup.cities.length < 2) return;
    const evenAlloc = resolveCityDaysAllocation(setup.cities, setup.days);
    updateSetup({ cityDays: evenAlloc });
  };

  const resolveSubmissionSetup = (allowNaturalPromptOnly = false): TripSetup | null => {
    const pendingTokens = parseCityTokens(cityInput);
    const effectiveCities = [...setup.cities];
    let addedPending = 0;
    for (const token of pendingTokens) {
      if (!effectiveCities.includes(token)) {
        effectiveCities.push(token);
        addedPending += 1;
      }
    }
    const effectiveDays = Math.max(
      Math.max(2, effectiveCities.length),
      Math.min(30, setup.days)
    );
    const effectiveCityDays =
      addedPending > 0
        ? resolveCityDaysAllocation(effectiveCities, effectiveDays)
        : resolveCityDaysAllocation(effectiveCities, effectiveDays, setup.cityDays);

    if (pendingTokens.length > 0) {
      setCityInput('');
      updateSetup({
        cities: effectiveCities,
        cityDays: effectiveCityDays,
        days: effectiveDays,
      });
    }
    if (effectiveCities.length === 0 && (!allowNaturalPromptOnly || !naturalPrompt.trim())) {
      setValidationError(copy.validationNoCity);
      return null;
    }
    setValidationError(null);
    return {
      ...setup,
      cities: effectiveCities,
      cityDays: effectiveCityDays,
      days: effectiveDays,
      returnDate: computeReturnDate(setup.departureDate, effectiveDays),
    };
  };

  const scrollWizardToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (target: WizardStep) => {
    if (!isEditMode && target > 1 && activeStep === 1) {
      const effective = resolveSubmissionSetup(false);
      if (!effective) return;
    }
    setValidationError(null);
    setActiveStep(target);
    setMaxVisitedStep((prev) => (target > prev ? target : prev));
    scrollWizardToTop();
  };

  const toggleActivity = (act: string) => {
    const exists = setup.activities.includes(act);
    const nextActivities = exists
      ? setup.activities.filter((a) => a !== act)
      : [...setup.activities, act];
    const linkedScenario = ACTIVITY_TO_SCENARIO[act];
    const currentScenarios = setup.specialScenarios || [];
    let nextScenarios = currentScenarios;
    if (linkedScenario) {
      if (!exists && !currentScenarios.includes(linkedScenario)) {
        nextScenarios = [...currentScenarios, linkedScenario];
      } else if (exists && currentScenarios.includes(linkedScenario)) {
        const stillNeeded = nextActivities.some((a) => ACTIVITY_TO_SCENARIO[a] === linkedScenario);
        if (!stillNeeded) {
          nextScenarios = currentScenarios.filter((s) => s !== linkedScenario);
        }
      }
    }
    updateSetup({
      activities: nextActivities,
      specialScenarios: nextScenarios,
    });
  };

  const toggleWeatherOverride = (target: PackingWeatherOverride) => {
    const current = setup.weatherOverrides || [];
    const exists = current.includes(target);
    if (exists) {
      updateSetup({ weatherOverrides: current.filter((x) => x !== target) });
      return;
    }
    const cleaned =
      target === 'colder'
        ? current.filter((x) => x !== 'warmer')
        : target === 'warmer'
        ? current.filter((x) => x !== 'colder')
        : current;
    updateSetup({ weatherOverrides: [...cleaned, target] });
  };

  const toggleCareConstraint = (id: PackingScenarioId) => {
    const current = setup.specialScenarios || [];
    const exists = current.includes(id);
    const nextScenarios = exists ? current.filter((x) => x !== id) : [...current, id];
    updateSetup({ specialScenarios: nextScenarios });
  };

  const handleSelectLuggageMode = (modeId: PackingDensityLevel) => {
    const current = setup.specialScenarios || [];
    const withoutCabin = current.filter((s) => s !== 'cabin_only');
    const nextScenarios: PackingScenarioId[] =
      modeId === 'fully_loaded' ? withoutCabin : [...withoutCabin, 'cabin_only'];
    updateSetup({
      packingDensity: modeId,
      specialScenarios: nextScenarios,
    });
  };

  const activeCareConstraints = useMemo(
    () =>
      CARE_CONSTRAINT_SCENARIOS.filter((id) =>
        (setup.specialScenarios || []).includes(id)
      ),
    [setup.specialScenarios]
  );

  const wizardStopForecasts = useMemo(
    () =>
      buildPerStopWeatherForecasts(
        setup.cities.length > 0 ? setup.cities : parseCityTokens(cityInput),
        setup.departureDate,
        setup.days,
        setup.weatherOverrides || [],
        activeLang,
        setup.cities.length > 0 ? resolvedCityDays : undefined
      ),
    [
      setup.cities,
      cityInput,
      setup.departureDate,
      setup.days,
      setup.weatherOverrides,
      activeLang,
      resolvedCityDays,
    ]
  );

  const normalizationPlan = useMemo(
    () =>
      isEditMode && workingPacking.length > 0
        ? computeClothingNormalizationPlan(workingPacking, baselineDays, setup, activeLang)
        : computeClothingNormalizationPlan(DEFAULT_TRIP_STATE.packing, setup.days, setup, activeLang),
    [
      isEditMode,
      workingPacking,
      baselineDays,
      setup.days,
      setup.laundry,
      setup.laundryIntervalDays,
      setup.rewear,
      activeLang,
    ]
  );

  const capsuleCycleDays = normalizationPlan.effectiveCycleDays;

  const currentClothingSignature = `${setup.days}_${setup.laundry ? 1 : 0}_${setup.laundryIntervalDays}_${setup.rewear ? 1 : 0}`;
  const isDaysChanged = isEditMode && setup.days !== baselineDays;
  const isCycleSettingChanged =
    isEditMode &&
    (setup.laundry !== initialSetup.laundry ||
      setup.laundryIntervalDays !== initialSetup.laundryIntervalDays ||
      setup.rewear !== initialSetup.rewear);
  const hasAnyClothingDiff =
    isEditMode &&
    workingPacking.length > 0 &&
    (isDaysChanged || isCycleSettingChanged) &&
    normalizationPlan.changedItems.length > 0;
  const shouldPromptNormalization =
    hasAnyClothingDiff && currentClothingSignature !== dismissedSignature;
  const isDismissedWithPendingDiff =
    hasAnyClothingDiff && currentClothingSignature === dismissedSignature;

  const formatSignedWeight = (grams: number): string => {
    if (grams === 0) return unitSystem === 'imperial' ? '0 oz' : '0g';
    return grams > 0
      ? `+${formatWeightCompact(grams, unitSystem)}`
      : `-${formatWeightCompact(Math.abs(grams), unitSystem)}`;
  };

  useEffect(() => {
    if (!previewModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen]);

  const stepTabs: Array<{ id: WizardStep; label: string; icon: typeof MapPin }> = [
    { id: 1, label: copy.step1Short, icon: MapPin },
    { id: 2, label: copy.step2Short, icon: Compass },
    { id: 3, label: copy.step3Short, icon: SlidersHorizontal },
  ];

  const activeLuggageMode: PackingDensityLevel = setup.packingDensity || 'moderate';
  const estimatedLaundryOutfitSets = useMemo(() => {
    const laundryCycle = Math.min(setup.days, Math.max(3, setup.laundryIntervalDays || 4) + 1);
    const boost = activeLuggageMode === 'fully_loaded' ? 1 : activeLuggageMode === 'light' ? -1 : 0;
    return Math.max(2, Math.min(6, Math.ceil(laundryCycle * 0.75) + boost));
  }, [setup.days, setup.laundryIntervalDays, activeLuggageMode]);

  const readableDateRange = useMemo(
    () => formatReadableDateRange(setup.departureDate, setup.returnDate, activeLang),
    [setup.departureDate, setup.returnDate, activeLang]
  );

  const climateSeasonLabel = useMemo(() => {
    const seasonKey = inferTripSeasonKey(setup.departureDate, setup.cities);
    return step1Copy.climateSeasons[seasonKey];
  }, [setup.departureDate, setup.cities, step1Copy]);

  const isWarmPaperStep = activeStep === 1 || activeStep === 2 || activeStep === 3;

  return (
    <div ref={wizardRootRef} className={`space-y-5 sm:space-y-6${isWarmPaperStep ? ' tk-scope tk-wizard-surface' : ''}`}>
      {/* Borderless Editorial Top Navigation (← Back  |  1 of 3  |  ×) */}
      <nav aria-label={copy.stepProgressLabel(activeStep)} className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Back control */}
          <div className={`flex items-center shrink-0 ${isWarmPaperStep ? 'tk-nav-side' : 'min-w-[76px]'}`}>
            {activeStep > 1 ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => goToStep((activeStep - 1) as WizardStep)}
                aria-label={step1Copy.backBtn}
                className={
                  isWarmPaperStep
                    ? 'tk-nav-back'
                    : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2 -ml-2 text-[13px] font-semibold tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-forest disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer'
                }
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{step1Copy.backBtn}</span>
              </button>
            ) : onCancel ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={onCancel}
                aria-label={step1Copy.backBtn}
                className={
                  isWarmPaperStep
                    ? 'tk-nav-back'
                    : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2 -ml-2 text-[13px] font-semibold tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-forest disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer'
                }
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{step1Copy.backBtn}</span>
              </button>
            ) : (
              <span aria-hidden="true" className="w-4" />
            )}
          </div>

          {/* Center: Clean Editorial Step Counter (1 of 3) + Quiet Interactive Progress Hairline */}
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <span className={isWarmPaperStep ? 'tk-num tk-num--cap' : 'font-num tabular-nums text-xs font-semibold tracking-wide tk-text-ink2'}>
              {step1Copy.stepOfTotal(activeStep, 3)}
            </span>
            <div
              role="tablist"
              aria-label={copy.stepProgressLabel(activeStep)}
              className="flex items-center gap-1.5"
            >
              {stepTabs.map((tabItem) => {
                const isActive = activeStep === tabItem.id;
                const isCompleted = tabItem.id < activeStep;
                const isLocked =
                  !isEditMode && tabItem.id > maxVisitedStep && tabItem.id > activeStep;
                const canJump = isEditMode || !isLocked || tabItem.id === activeStep + 1;
                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={tabItem.label}
                    title={tabItem.label}
                    disabled={!canJump}
                    onClick={() => {
                      if (canJump) goToStep(tabItem.id);
                    }}
                    className={`h-1 rounded-full transition-all focus:outline-none ${
 isWarmPaperStep
 ? isActive
 ? 'w-7 tk-bg-forest'
 : isCompleted
 ? 'w-4 tk-bg-done'
 : 'w-4 tk-bg-idle'
 : isActive
 ? 'w-7 tk-bg-forest'
 : isCompleted
 ? 'w-4 tk-bg-forest-plate hover:tk-bg-forest'
 : 'w-4 tk-bg-forest-plate'
 } ${canJump ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Close action */}
          <div className={`flex items-center justify-end shrink-0 ${isWarmPaperStep ? 'tk-nav-side' : 'min-w-[76px]'}`}>
            {onCancel ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={onCancel}
                aria-label={t('wizard.backToWorkspace')}
                title={t('wizard.backToWorkspace')}
                className={
                  isWarmPaperStep
                    ? 'tk-nav-close'
                    : 'inline-flex h-10 w-10 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink disabled:opacity-45 transition-colors shrink-0 cursor-pointer'
                }
              >
                <X className="h-4.5 w-4.5" />
              </button>
            ) : (
              <span aria-hidden="true" className="w-4" />
            )}
          </div>
        </div>

        {/* Open Editorial Serif Headline Directly on Canvas (Zero Card Wrapper) */}
        <div className="space-y-1.5">
          <h1 className={isWarmPaperStep ? 'tk-t-display text-balance' : 'font-editorial text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] tk-text-forest leading-[1.15] text-balance'}>
            {activeStep === 1 ? step1Copy.title : copy.pageTitles[activeStep]}
          </h1>
          <p className={isWarmPaperStep ? 'tk-t-sub' : 'text-sm sm:text-[15px] tk-text-ink2 leading-relaxed'}>
            {activeStep === 1 ? step1Copy.subtitle : copy.headerStepSubtitles[activeStep]}
          </p>

          {/* Subtle Optional Voice / AI Quick-Fill Trigger (Step 1 Non-Edit Only) */}
          {!isEditMode && activeStep === 1 && (
            <div className="pt-1.5 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowAiQuickInput((prev) => !prev)}
                className="tk-link-voice cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5 shrink-0 tk-glyph--m" />
                <span>
                  {showAiQuickInput ? copy.headerAiHideBtn : copy.headerAiShortcutBtn}
                </span>
              </button>

              {showAiQuickInput && (
                <div className="space-y-2">
                  <div className="tk-ai-bar flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5">
                    <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                      <Sparkles className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                      <input
                        type="text"
                        value={naturalPrompt}
                        onChange={(e) => {
                          setNaturalPrompt(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                          if (e.key === 'Enter' && naturalPrompt.trim() && !isGenerating) {
                            const effective = resolveSubmissionSetup(true);
                            if (effective) {
                              void onCreateNewWithAi(effective, crew, naturalPrompt);
                            }
                          }
                        }}
                        placeholder={copy.optionAPlaceholder}
                        className="tk-ai-input py-1.5 focus:outline-none"
                      />
                      {naturalPrompt && (
                        <button
                          type="button"
                          onClick={() => setNaturalPrompt('')}
                          title={copy.clearTextLabel}
                          aria-label={copy.clearTextLabel}
                          className="tk-icon-btn cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <AiVoiceInputButton
                        compact
                        className="tk-voice"
                        contextHint="trip_setup"
                        disabled={isGenerating}
                        label={copy.voiceInputLabel}
                        onInterimTranscript={(live) => {
                          setVoiceError(null);
                          setValidationError(null);
                          setNaturalPrompt(live);
                        }}
                        onTranscript={(text) => {
                          setVoiceError(null);
                          setValidationError(null);
                          setNaturalPrompt((prev) => {
                            const trimmedPrev = prev.trim();
                            if (!trimmedPrev || trimmedPrev === text.trim()) return text.trim();
                            return `${trimmedPrev}，${text.trim()}`;
                          });
                        }}
                        onError={(msg) => setVoiceError(msg || null)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isGenerating || !naturalPrompt.trim()}
                      onClick={() => {
                        const effective = resolveSubmissionSetup(true);
                        if (effective) {
                          void onCreateNewWithAi(effective, crew, naturalPrompt);
                        }
                      }}
                      className="tk-ai-submit"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{copy.aiQuickBuildShortBtn}</span>
                    </button>
                  </div>

                  {voiceError && (
                    <div className="tk-note">
                      <span>{voiceError}</span>
                      <button
                        type="button"
                        onClick={() => setVoiceError(null)}
                        className="tk-note__dismiss"
                      >
                        {copy.dismissBtn}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Step Body Container — Paired with parent 120px+safe-area clearance so last card is never clipped */}
      <div className="space-y-6 pb-6">
      {/* STEP 1: Open Editorial Departure Manifest (Destination · Dates · Who's Packing · Trip Vibe) */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Left Column: Destination Manifest + Unified Climate Date Row */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: Destination — Single-line minimal stops + inline borderless "+ Add a stop" */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h2 className="tk-step1-label">
                  {step1Copy.sectionDestination}
                </h2>
                {setup.cities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateSetup({ cities: [], cityDays: [] })}
                    className="tk-btn-ghost hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copy.clearAllBtn}
                  </button>
                )}
              </div>

              <div className="tk-dest-card">
                {/* Single Stop: Minimal clean single line */}
                {setup.cities.length === 1 && (() => {
                  const displayCity = translatePopularCity(setup.cities[0], activeLang);
                  return (
                    <div className="tk-h-btn px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="h-4 w-4 tk-glyph--on shrink-0" />
                        <span className="tk-t-option truncate">
                          {displayCity}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCityAt(0)}
                        title={copy.removeCityLabel(displayCity)}
                        aria-label={copy.removeCityLabel(displayCity)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })()}

                {/* Multi-Stop Clean Manifest Rows (Only When >= 2 Cities Added) */}
                {setup.cities.length >= 2 && (() => {
                  let runningOffset = 0;
                  return (
                    <>
                      {setup.cities.map((city, idx) => {
                        const displayCity = translatePopularCity(city, activeLang);
                        const stayDays = resolvedCityDays[idx] ?? 1;
                        const otherSum = resolvedCityDays.reduce(
                          (acc, v, i) => (i === idx ? acc : acc + v),
                          0
                        );
                        const maxForStop = Math.max(1, 30 - otherSum);
                        const dateSpan = formatShortStopDateSpan(
                          setup.departureDate,
                          runningOffset,
                          stayDays,
                          activeLang
                        );
                        runningOffset += stayDays;
                        const isLast = idx === setup.cities.length - 1;

                        return (
                          <div
                            key={`${city}_${idx}`}
                            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                          >
                            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full tk-bg-card tk-num tk-text-forest shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="tk-t-option truncate">
                                    {displayCity}
                                  </div>
                                  {dateSpan && (
                                    <div className="tk-num tk-text-ink2">
                                      {dateSpan}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Mobile reorder & delete */}
                              <div className="flex sm:hidden items-center gap-0.5 shrink-0 -mr-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveCity(idx, -1)}
                                  aria-label={copy.moveCityUpAria(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25 cursor-pointer"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => moveCity(idx, 1)}
                                  aria-label={copy.moveCityDownAria(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25 cursor-pointer"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCityAt(idx)}
                                  aria-label={copy.removeCityLabel(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 shrink-0">
                              <div className="inline-flex items-center rounded-lg p-0.5">
                                <button
                                  type="button"
                                  disabled={stayDays <= 1}
                                  onClick={() => updateCityStayDays(idx, stayDays - 1)}
                                  aria-label={copy.decDayLabel}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white disabled:opacity-35 cursor-pointer"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <div className="inline-flex items-center justify-center px-1.5">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={maxForStop}
                                    value={stayDays}
                                    aria-label={copy.stayDaysInputAria(displayCity)}
                                    onChange={(e) => {
                                      const parsed = parseInt(e.target.value, 10);
                                      if (!Number.isNaN(parsed)) {
                                        updateCityStayDays(idx, parsed);
                                      }
                                    }}
                                    className="w-6 bg-transparent text-center tk-num tk-text-forest focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="tk-text-ink2 select-none pr-0.5">
                                    {copy.dayUnitShort(stayDays).replace(/^\d+\s*/, '')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={stayDays >= maxForStop}
                                  onClick={() => updateCityStayDays(idx, stayDays + 1)}
                                  aria-label={copy.incDayLabel}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white disabled:opacity-35 cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="hidden sm:flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveCity(idx, -1)}
                                  aria-label={copy.moveCityUpAria(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25 cursor-pointer"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => moveCity(idx, 1)}
                                  aria-label={copy.moveCityDownAria(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25 cursor-pointer"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCityAt(idx)}
                                  aria-label={copy.removeCityLabel(displayCity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`tk-num ${setup.days >= 30 ? 'tk-text-forest' : 'tk-text-ink2'}`}
                        >
                          {setup.days >= 30
                            ? copy.perCityMaxCapHint
                            : copy.perCityTotalSynced(setup.days, setup.cities.length)}
                        </span>
                        <button
                          type="button"
                          onClick={handleEqualSplitCityDays}
                          className="font-semibold hover:underline whitespace-nowrap cursor-pointer"
                        >
                          {copy.equalSplitBtn}
                        </button>
                      </div>
                    </>
                  );
                })()}

                {/* Inline Borderless "+ Add a stop" Row (No Box-Inside-Box Nesting) */}
                <div className="px-4 py-1 flex items-center gap-2 tk-input-row">
                  <PlaceAutocompleteInput
                    value={cityInput}
                    onChange={(val) => {
                      setCityInput(val);
                      if (validationError) setValidationError(null);
                    }}
                    includedPrimaryTypes={['(cities)']}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCity(cityInput);
                      }
                    }}
                    onSelectPlace={(place) => {
                      addCity(place.name);
                    }}
                    wrapperClassName="flex-1 min-w-0"
                    leftIcon={
                      <Plus className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 tk-glyph--on pointer-events-none" />
                    }
                    placeholder={
                      setup.cities.length > 0
                        ? step1Copy.addStopPlaceholder
                        : step1Copy.firstStopPlaceholder
                    }
                    className="w-full tk-h-pill-min bg-transparent pl-7 pr-2 py-2.5 text-sm font-medium tk-text-ink focus:outline-none"
                  />
                  {cityInput.trim() && (
                    <button
                      type="button"
                      onClick={() => addCity(cityInput)}
                      className="inline-flex tk-h-plate items-center tk-r-ctl tk-bg-forest px-3 text-xs font-bold tk-text-card whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {step1Copy.addActionShort}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 2: Dates & Duration — Unified Single-Surface Date Row with Live Season */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h2 className="text-xs font-semibold tracking-wide">
                  {step1Copy.sectionDates}
                </h2>
                {setup.cities.length >= 2 && (
                  <span className="tk-t-cap">
                    {copy.returnAutoSyncedHint}
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-expanded={datePickerOpen}
                onClick={() => setDatePickerOpen((prev) => !prev)}
                className="w-full tk-datebar-btn tk-deboss px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Calendar className="h-4.5 w-4.5 tk-glyph--on mt-0.5 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 tk-num tk-datebar__val">
                      <span>{readableDateRange.startText}</span>
                      <ArrowRight className="h-3.5 w-3.5 tk-glyph--on shrink-0" />
                      <span>{readableDateRange.endText}</span>
                    </div>
                    <div className="tk-num tk-datebar__sub">
                      {t('wizard.daysNights', {
                        days: setup.days,
                        nights: Math.max(1, setup.days - 1),
                      })}{''}
                      <span className="tk-t-cap">({climateSeasonLabel})</span>
                    </div>
                  </div>
                </div>

                <ChevronDown
                  className={`h-4 w-4 tk-text-ink2 shrink-0 transition-transform duration-150 ${
 datePickerOpen ? 'rotate-180 tk-text-forest' : ''
 }`}
                />
              </button>

              {datePickerOpen && (
                <InlineDatePickerPopover
                  departureDate={setup.departureDate}
                  returnDate={setup.returnDate}
                  singleStartOnly={setup.cities.length >= 2}
                  lang={activeLang}
                  pickStartLabel={copy.pickDeparturePrompt}
                  pickEndLabel={copy.pickReturnPrompt}
                  onSelectRange={(startIso, endIso) => {
                    const nextDays = computeDaysBetween(startIso, endIso) ?? setup.days;
                    updateSetup({ departureDate: startIso, days: nextDays });
                    setDatePickerOpen(false);
                  }}
                  onSelectStartOnly={(startIso) => {
                    updateSetup({ departureDate: startIso });
                    setDatePickerOpen(false);
                  }}
                  onClose={() => setDatePickerOpen(false)}
                />
              )}
            </section>
          </div>

          {/* Right Column (Flows Cleanly Below on Mobile): Who's Packing + 2x2 Trip Vibe */}
          <div className="lg:col-span-5 space-y-6">
            {/* SECTION 3: Who's Packing? — 4 Equal-Width Tactile Light Capsules in One Row */}
            <section className="space-y-2.5">
              <h2 className="px-0.5 tk-step1-label">
                {step1Copy.sectionWho}
              </h2>

              <div
                className="grid grid-cols-4 gap-1.5 sm:gap-2"
                role="radiogroup"
                aria-label={step1Copy.sectionWho}
              >
                {([
                  { count: 1, Icon: User },
                  { count: 2, Icon: Users },
                  { count: 3, Icon: Home },
                  { count: 4, Icon: UsersRound },
                ] as const).map(({ count, Icon }, idx) => {
                  const active = setup.travelers === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateSetup({ travelers: count })}
                      className={`tk-opt-pill tk-pressable inline-flex items-center justify-center gap-1 px-1 sm:px-2.5 py-2 tk-t-micro leading-none cursor-pointer whitespace-nowrap ${
 active ? 'tk-sel' : ''
 }`}
                    >
                      <Icon
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
                      />
                      <span>{step1Copy.whoPresets[idx]}</span>
                      {active && (
                        <Check
                          className="hidden sm:inline-block h-3 w-3 shrink-0"
                          strokeWidth={2.75}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SECTION 4: Trip Vibe — Crisp 2x2 Balanced Mini-Cards with Micro-Icons */}
            <section className="space-y-2.5">
              <h2 className="px-0.5 tk-step1-label">
                {step1Copy.sectionVibe}
              </h2>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {TRIP_STYLE_KEYS.map((styleKey) => {
                  const active = setup.tripStyle === styleKey;
                  const StyleIcon = TRIP_STYLE_ICON_MAP[styleKey];
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectTripStyle(styleKey)}
                      className={`relative tk-vibe tk-pressable flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer ${
 active ? 'tk-sel' : ''
 }`}
                    >
                      <span
                        className="tk-vibe__plate inline-flex items-center justify-center shrink-0"
                      >
                        <StyleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </span>
                      <span className="flex-1 min-w-0 tk-t-option leading-tight">
                        {step1Copy.vibeLabels[styleKey]}
                      </span>
                      {active && (
                        <Check
                          className="absolute top-2 right-2 sm:static h-3.5 w-3.5 sm:h-4 sm:w-4 tk-glyph--on shrink-0"
                          strokeWidth={2.75}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* STEP 2: Flowing Icon Pills + Airy Care Needs (V3 warm-paper tokens) */}
      {activeStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Experiences & Activities */}
          <div className="lg:col-span-7">
            <section className="tk-card">
              <div className="flex items-center justify-between gap-2">
                <div className="tk-sec min-w-0">
                  <span className="tk-plate inline-flex items-center justify-center shrink-0">
                    <Compass className="tk-glyph" strokeWidth={1.5} />
                  </span>
                  <h3 className="tk-t-section">
                    {copy.sec4Title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="tk-num tk-num--cap whitespace-nowrap">
                    {copy.selectedCount(setup.activities.length)}
                  </span>
                  {setup.activities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const activityScenarioSet = new Set(Object.values(ACTIVITY_TO_SCENARIO));
                        updateSetup({
                          activities: [],
                          specialScenarios: (setup.specialScenarios || []).filter(
                            (s) => !activityScenarioSet.has(s)
                          ),
                        });
                      }}
                      className="tk-btn-ghost hover:underline whitespace-nowrap cursor-pointer"
                    >
                      {copy.clearBtn}
                    </button>
                  )}
                </div>
              </div>

              <div className="tk-stack">
                {ACTIVITY_GROUPS.map((grp, grpIdx) => {
                  const groupSelectedCount = grp.items.filter((i) =>
                    setup.activities.includes(i.name)
                  ).length;
                  return (
                    <div key={grp.id} className="tk-stack">
                      {grpIdx > 0 && <hr className="tk-card__rule" />}
                      <div className="flex items-center justify-between gap-2">
                        <p className="tk-t-group">
                          {ACTIVITY_GROUP_TITLES[grp.id]
                            ? pickLang(activeLang, ACTIVITY_GROUP_TITLES[grp.id])
                            : grp.title}
                        </p>
                        {groupSelectedCount > 0 && (
                          <span className="tk-num tk-num--cap">
                            {copy.selectedCount(groupSelectedCount)}
                          </span>
                        )}
                      </div>
                      <div className="tk-grid2 w-full">
                        {grp.items.map((item, itemIdx) => {
                          const active = setup.activities.includes(item.name);
                          const label = ACTIVITY_NAME_MAP[item.name]?.[activeLang] || item.name;
                          const IconComponent = ACTIVITY_ICON_MAP[item.name] || Compass;
                          const isLastOdd =
                            grp.items.length % 2 === 1 && itemIdx === grp.items.length - 1;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleActivity(item.name)}
                              className={`tk-pill tk-pill--wrap tk-pressable w-full cursor-pointer ${
 isLastOdd ? 'tk-span2 justify-center' : ''
 } ${active ? 'tk-sel' : ''}`}
                            >
                              <IconComponent
                                className="tk-glyph shrink-0"
                                strokeWidth={1.5}
                              />
                              <span>{label}</span>
                              {active && (
                                <Check
                                  className="tk-pill__tick"
                                  strokeWidth={1.5}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right: Special Care Needs + Extra Notes */}
          <div className="lg:col-span-5">
            <section className="tk-card">
              <div className="tk-stack">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="tk-t-section">
                    {copy.careConstraintsTitle}
                  </h3>
                  {activeCareConstraints.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSetup({
                          specialScenarios: (setup.specialScenarios || []).filter(
                            (s) => !CARE_CONSTRAINT_SCENARIOS.includes(s)
                          ),
                        })
                      }
                      className="tk-btn-ghost hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.clearScenariosBtn}
                    </button>
                  )}
                </div>
                <p className="tk-t-cap">
                  {copy.careConstraintsSub}
                </p>

                <div className="tk-grid2 w-full">
                  {CARE_CONSTRAINT_SCENARIOS.map((id, careIdx) => {
                    const active = (setup.specialScenarios || []).includes(id);
                    const label = getPackingScenarioLabel(id, activeLang);
                    const CareIcon = CARE_ICON_MAP[id] || ShieldCheck;
                    const isFamilyAutoLinked =
                      id === 'kids' && active && setup.tripStyle === '亲子出行';
                    const isLastOdd =
                      CARE_CONSTRAINT_SCENARIOS.length % 2 === 1 &&
                      careIdx === CARE_CONSTRAINT_SCENARIOS.length - 1;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCareConstraint(id)}
                        className={`tk-pill tk-pressable w-full cursor-pointer ${
 isLastOdd ? 'tk-span2 justify-center' : ''
 } ${active ? 'tk-sel' : ''}`}
                      >
                        <CareIcon
                          className="tk-glyph shrink-0"
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="tk-t-option">{label}</div>
                          {isFamilyAutoLinked && (
                            <div className="tk-t-cap">
                              {copy.autoLinkedFamilyHint}
                            </div>
                          )}
                        </div>
                        {active && (
                          <Check
                            className="tk-pill__tick"
                            strokeWidth={1.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="tk-card__rule" />

              <div className="tk-stack">
                <label className="tk-field">
                  {copy.customNoteLabel}
                </label>
                <div className="tk-input">
                  <input
                    type="text"
                    value={setup.packingCustomNote || ''}
                    onChange={(e) => updateSetup({ packingCustomNote: e.target.value })}
                    placeholder={copy.customNotePlaceholder}
                    className="flex-1 min-w-0 bg-transparent focus:outline-none tk-text-ink"
                  />
                  <AiVoiceInputButton
                    compact
                    iconOnly
                    className="tk-voice"
                    contextHint="trip_setup"
                    disabled={isGenerating}
                    onTranscript={(text) => {
                      setVoiceError(null);
                      const prev = (setup.packingCustomNote || '').trim();
                      updateSetup({
                        packingCustomNote: prev ? `${prev}；${text.trim()}` : text.trim(),
                      });
                    }}
                    onError={(msg) => setVoiceError(msg || null)}
                  />
                </div>
                {voiceError && (
                  <p className="tk-t-cap tk-text-ink">{voiceError}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* STEP 3: Climate Feel, Wardrobe Style, Budget + Visual Luggage Constraints & Tactile Laundry Toggle */}
      {activeStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Climate Forecast Micro-Adjustment + Wardrobe Style + Budget Tier */}
          <div className="lg:col-span-6">
            <section className="tk-card">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="tk-plate mt-0.5 shrink-0">
                      <Shirt className="tk-glyph" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="tk-t-section text-balance">
                        {copy.sec5Title}
                      </h3>
                      <p className="mt-0.5 tk-t-cap">
                        {copy.weatherSectionSub}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Per-Stop Weather Preview + Colder / Warmer / Wetter */}
                <div className="mt-4 tk-deboss tk-r-btn p-4 space-y-3">
                  <div className="space-y-1.5">
                    {wizardStopForecasts.map((st, idx) => (
                      <div
                        key={`${st.city}_${idx}`}
                        className="flex flex-wrap items-baseline justify-between gap-2"
                      >
                        <span className="tk-t-group">{st.city}</span>
                        <span className="tk-t-cap">{st.summaryText}</span>
                      </div>
                    ))}
                  </div>

                  <hr className="tk-card__rule" />
                  <div className="space-y-2">
                    <span className="block tk-t-micro tk-text-ink2">
                      {copy.expectDifferentShort}
                    </span>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {(
                        [
                          { id: 'colder' as const, Icon: Snowflake, wet: false },
                          { id: 'warmer' as const, Icon: Sun, wet: false },
                          { id: 'wetter' as const, Icon: Umbrella, wet: true },
                        ] as const
                      ).map(({ id: optId, Icon, wet }) => {
                        const active = (setup.weatherOverrides || []).includes(optId);
                        return (
                          <button
                            key={optId}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleWeatherOverride(optId)}
                            className={`tk-pill tk-pill--compact tk-pressable w-full justify-center cursor-pointer ${
 active ? 'tk-sel' : ''
 }`}
                          >
                            <Icon
                              className={`tk-glyph shrink-0 ${wet ? 'tk-glyph--w' : ''}`}
                              strokeWidth={1.5}
                            />
                            <span>{copy.weatherOverrides[optId]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wardrobe & Care Profile */}
              <div className="pt-1">
                <hr className="tk-card__rule" />
                <label className="tk-field">
                  {copy.clothingStyleFieldLabel}
                </label>
                <div className="tk-seg" role="group" aria-label={copy.clothingStyleFieldLabel}>
                  {(['male', 'female', 'other'] as PackingClothingGender[]).map((gId) => {
                    const active = (setup.clothingStyle || 'other') === gId;
                    return (
                      <button
                        key={gId}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateSetup({ clothingStyle: gId })}
                        className="tk-seg__item cursor-pointer"
                      >
                        {copy.clothingStyles[gId]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Tier & Optional Target Cap */}
              <div className="space-y-3">
                <hr className="tk-card__rule" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="tk-t-group">{copy.budgetTierHeading}</h4>
                  <label className="inline-flex items-center gap-1.5 tk-t-cap">
                    <span>{copy.targetTotalUsdLabel}</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={setup.targetTotalBudgetUsd || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateSetup({ targetTotalBudgetUsd: val > 0 ? val : undefined });
                      }}
                      placeholder={copy.autoPlaceholder}
                      className="w-24 tk-r-btn tk-border-hair tk-bg-paper px-2.5 py-1.5 tk-num tk-text-ink focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {BUDGET_TIER_KEYS.map((tierId) => {
                    const active = (setup.budgetTier || 'comfort') === tierId;
                    const tierCopy = BUDGET_TIER_COPY_MAP[tierId][activeLang];
                    return (
                      <button
                        key={tierId}
                        type="button"
                        onClick={() => updateSetup({ budgetTier: tierId })}
                        className={`tk-r-btn p-2.5 text-left tk-pressable cursor-pointer ${
 active ? 'tk-sel' : 'tk-border-hair tk-bg-paper'
 }`}
                      >
                        <div className="tk-t-group leading-snug">
                          {tierCopy.label}
                        </div>
                        <div className="mt-0.5 tk-t-cap leading-snug">
                          {tierCopy.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Right: Visual Luggage Physical Constraints (3 Cards) + Tactile Mid-Trip Laundry Switch */}
          <div className="lg:col-span-6 space-y-5">
            <section className="tk-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="tk-plate shrink-0">
                    <Luggage className="tk-glyph" strokeWidth={1.5} />
                  </span>
                  <h3 className="tk-t-section">{copy.packingStrategyTitle}</h3>
                </div>
                <p className="tk-t-cap leading-relaxed">
                  {copy.luggageConstraintSub}
                </p>
              </div>

              {/* 3 Visual Luggage Constraint Cards (Replaces Body Size + Abstract Density + Cabin-Only Duplicate) */}
              <div className="tk-stack" role="radiogroup" aria-label={copy.packingDensityFieldLabel}>
                {(
                  [
                    { id: 'light' as PackingDensityLevel, Icon: Backpack },
                    { id: 'moderate' as PackingDensityLevel, Icon: Luggage },
                    { id: 'fully_loaded' as PackingDensityLevel, Icon: Plane },
                  ] as const
                ).map(({ id, Icon }) => {
                  const active = activeLuggageMode === id;
                  const card = copy.luggageCards[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleSelectLuggageMode(id)}
                      className={`w-full flex items-start gap-3 tk-r-card p-3.5 text-left tk-pressable cursor-pointer ${
 active ? 'tk-sel' : 'tk-border-hair tk-bg-paper'
 }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${active ? 'tk-plate tk-plate--on' : 'tk-plate'}`}>
                        <Icon className="tk-glyph" strokeWidth={1.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="tk-t-option leading-snug">
                              {card.title}
                            </span>
                            <span className="tk-t-cap">
                              {card.badge}
                            </span>
                          </div>
                          {active && (
                            <span
                              className={`tk-badge shrink-0 ${
 id === 'moderate' ? 'tk-badge--cognac' : ''
 }`}
                            >
                              <Check className="tk-glyph" strokeWidth={1.5} />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 tk-t-cap leading-snug">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tactile Mid-Trip Laundry Toggle Switch with Live Positive Feedback */}
              <div className="space-y-3">
                <hr className="tk-card__rule" />
                <div className="tk-r-card tk-border-hair tk-bg-paper p-3.5">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="tk-t-option leading-snug">
                        {copy.laundryTitle}
                      </div>
                      <div
                        className={`tk-t-cap leading-snug ${
 setup.laundry ? 'tk-text-forest' : ''
 }`}
                      >
                        {setup.laundry
                          ? copy.laundryLiveOnFeedback(estimatedLaundryOutfitSets)
                          : copy.laundryLiveOffFeedback(capsuleCycleDays)}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={setup.laundry}
                      aria-label={copy.laundryToggleAria}
                      onClick={() => updateSetup({ laundry: !setup.laundry })}
                      className="tk-toggle cursor-pointer"
                    />
                  </div>
                </div>

                {/* Edit-Mode Non-Intrusive Clothing Diff Preview (Never pops up mid-flow; settles on Save) */}
                {isEditMode && shouldPromptNormalization && (
                  <div
                    role="region"
                    aria-label={copy.normPromptAria}
                    aria-live="polite"
                    className="tk-r-ctl tk-border-hair tk-bg-paper p-3.5 space-y-2"
                  >
                    <p className="tk-t-group">
                      {isDaysChanged
                        ? copy.normPromptDaysChanged(baselineDays, setup.days)
                        : copy.normPromptCycleChanged(setup.days)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 tk-t-cap">
                      <span>
                        {copy.normPromptScaledCount(normalizationPlan.changedItems.length)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {copy.normPromptDeltaLabel}
                        {normalizationPlan.totalDeltaPieces > 0
                          ? `+${normalizationPlan.totalDeltaPieces}`
                          : normalizationPlan.totalDeltaPieces}
                        {copy.pcsUnit}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {copy.normPromptEstWeight}
                        {formatSignedWeight(normalizationPlan.totalDeltaWeightGrams)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setDismissedSignature(currentClothingSignature)}
                        className="inline-flex items-center justify-center tk-r-ctl tk-border-hair tk-bg-card px-3 py-1.5 tk-t-btn-sec cursor-pointer"
                      >
                        {copy.keepExistingBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewModalOpen(true)}
                        className="inline-flex items-center gap-1 tk-btn-ghost cursor-pointer"
                      >
                        <Eye className="tk-glyph" strokeWidth={1.5} />
                        {copy.viewDetailsBtn}
                      </button>
                    </div>
                  </div>
                )}

                {isEditMode && isDismissedWithPendingDiff && (
                  <div className="flex flex-wrap items-center justify-between gap-2 tk-r-ctl tk-border-hair tk-bg-paper px-3.5 py-2 tk-t-cap">
                    <span>
                      {copy.keptOriginalCounts(normalizationPlan.changedItems.length, setup.days)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedSignature(null);
                        setPreviewModalOpen(true);
                      }}
                      className="tk-btn-ghost hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.reapplyPreviewBtn}
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Mode Extra Packing / Regenerate Actions */}
              {isEditMode && (onOpenPackingWizard || onRegenerateCurrentWithAi) && (
                <div className="space-y-2.5">
                  <hr className="tk-card__rule" />
                  {onOpenPackingWizard && (
                    <button
                      type="button"
                      onClick={onOpenPackingWizard}
                      className="w-full tk-btn-secondary cursor-pointer"
                    >
                      <Shirt className="tk-glyph" strokeWidth={1.5} />
                      <span className="truncate">{copy.openPackingWizardBtn}</span>
                    </button>
                  )}

                  {onRegenerateCurrentWithAi && (
                    <div className="pt-1">
                      {!confirmOverwriteAi ? (
                        <button
                          type="button"
                          onClick={() => setConfirmOverwriteAi(true)}
                          className="w-full text-center tk-btn-ghost py-1.5 cursor-pointer"
                        >
                          {copy.regenAiPromptLink}
                        </button>
                      ) : (
                        <div className="tk-note flex-col items-stretch">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="tk-glyph shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>{copy.regenAiWarning}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmOverwriteAi(false)}
                              className="inline-flex items-center justify-center tk-r-ctl tk-border-hair tk-bg-card px-3 py-1.5 tk-t-btn-sec cursor-pointer"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              disabled={isGenerating}
                              onClick={() => {
                                const effective = resolveSubmissionSetup(false);
                                if (effective) {
                                  void onRegenerateCurrentWithAi(effective, crew);
                                }
                              }}
                              className="inline-flex items-center justify-center gap-1.5 tk-r-ctl tk-bg-forest tk-text-card px-3 py-1.5 tk-t-btn cursor-pointer disabled:opacity-50"
                            >
                              {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {copy.confirmOverwriteBtn}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* AI generation staged progress (shown only while waiting, never over CTA) */}
      {isGenerating && !validationError && !errorMessage && (
        <div className="flex items-start gap-2 min-w-0 px-0.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5 tk-text-ink2" />
          <p className="tk-t-cap tk-text-ink2 leading-snug min-w-0">
            {copy.aiProgressStages[aiProgressStageIdx] || copy.aiProgressStages[0]}
          </p>
        </div>
      )}

      {/* Inline Validation / Generation Error */}
      {(validationError || errorMessage) && (
        isWarmPaperStep ? (
          <div className="tk-note items-start">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="tk-glyph shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="space-y-1 min-w-0">
                <p className="tk-t-group">{validationError || errorMessage}</p>
                {errorMessage && !validationError && !isEditMode && (
                  <p className="tk-t-cap">{copy.offlineFallbackHint}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border tk-bc-danger-hair tk-bg-danger-tint p-3.5 text-xs tk-text-danger flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 tk-text-danger" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold">{validationError || errorMessage}</p>
              {errorMessage && !validationError && !isEditMode && (
                <p className="tk-text-danger">{copy.offlineFallbackHint}</p>
              )}
            </div>
          </div>
        )
      )}
      </div>

      {/* Pure Full-Width Bottom Action CTA Anchored Flush to Viewport Bottom */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] ${
 isWarmPaperStep
 ? 'tk-step1-dock'
 : 'tk-grad-wizard-paper'
 }`}>
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-2">
          {/* Edit-mode silent settle-on-save summary strip (Shown on Step 3 right before Save) */}
          {isEditMode && activeStep === 3 && shouldPromptNormalization && (
            <div className="flex flex-wrap items-center justify-between gap-2 tk-r-ctl tk-border-hair tk-bg-card px-3.5 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Shirt className="tk-glyph shrink-0" strokeWidth={1.5} />
                <span className="tk-t-group truncate">
                  {copy.normFooterPendingBanner(
                    normalizationPlan.changedItems.length,
                    normalizationPlan.totalDeltaPieces > 0
                      ? `+${normalizationPlan.totalDeltaPieces}`
                      : String(normalizationPlan.totalDeltaPieces),
                    formatSignedWeight(normalizationPlan.totalDeltaWeightGrams)
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="inline-flex items-center gap-1 tk-btn-ghost hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="tk-glyph" strokeWidth={1.5} />
                <span>{copy.viewDetailsBtn}</span>
              </button>
            </div>
          )}

          {activeStep === 1 && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => goToStep(2)}
              className="tk-btn-primary tk-pressable disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <span>{step1Copy.nextWhatToPackBtn}</span>
              <ArrowRight className="h-4.5 w-4.5 shrink-0" />
            </button>
          )}

          {activeStep === 2 && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => goToStep(3)}
              className="tk-btn-primary tk-pressable disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <span>{copy.nextStepTo3Btn}</span>
              <ArrowRight className="h-4.5 w-4.5 shrink-0" />
            </button>
          )}

          {activeStep === 3 && (
            isEditMode ? (
              <div className="flex items-center gap-2">
                {shouldPromptNormalization ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const effective = resolveSubmissionSetup(false);
                        if (effective) {
                          onSaveEditCurrent?.(effective, crew, undefined);
                        }
                      }}
                      className="tk-btn-secondary shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      {copy.saveRouteOnlyBtn}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          const effective = resolveSubmissionSetup(false);
                          if (effective) {
                            onSaveEditCurrent?.(effective, crew, normalizationPlan.updatedGroups);
                          }
                        }}
                        className="tk-btn-primary tk-pressable whitespace-nowrap cursor-pointer"
                      >
                        <Check className="h-4.5 w-4.5 shrink-0" strokeWidth={1.5} />
                        <span>{copy.saveAndScaleBtn(normalizationPlan.changedItems.length)}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const effective = resolveSubmissionSetup(false);
                      if (effective) {
                        onSaveEditCurrent?.(effective, crew, undefined);
                      }
                    }}
                    className="tk-btn-primary tk-pressable whitespace-nowrap cursor-pointer"
                  >
                    <Check className="h-4.5 w-4.5 shrink-0" strokeWidth={1.5} />
                    <span>{copy.saveChangesBtn}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    const effective = resolveSubmissionSetup(false);
                    if (effective) {
                      onCreateNewQuickOffline(effective, crew, undefined);
                    }
                  }}
                  className="tk-btn-secondary shrink-0 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <Zap className="tk-glyph tk-glyph--z shrink-0" strokeWidth={1.5} />
                  <span className="sm:hidden">{copy.offlineShortBtn}</span>
                  <span className="hidden sm:inline">{copy.startOfflineBtn}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => {
                      const effective = resolveSubmissionSetup(true);
                      if (effective) {
                        void onCreateNewWithAi(effective, crew, naturalPrompt || undefined);
                      }
                    }}
                    className="tk-btn-primary tk-pressable whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin shrink-0" />
                        <span>{copy.generatingTripBtn}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        <span>{copy.generateTripWithAiBtn}</span>
                        <ArrowRight className="h-4.5 w-4.5 shrink-0" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* On-Demand Clothing Diff Preview Modal (Edit Mode Only, User-Triggered) */}
      {isEditMode && previewModalOpen && normalizationPlan.changedItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center tk-bg-overlay p-4"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clothing-norm-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border tk-bc-hair bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b tk-bc-hair tk-bg-forest-tint px-5 py-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl tk-bg-forest-12 tk-text-forest">
                  <Shirt className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="clothing-norm-modal-title"
                      className="text-base font-extrabold tk-text-ink"
                    >
                      {copy.normPreviewModalTitle}
                    </h3>
                    {baselineDays !== setup.days && (
                      <span className="font-num text-xs font-bold tk-text-forest">
                        {copy.normModalDaysBadge(baselineDays, setup.days)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs tk-text-ink2">
                    {copy.normModalSub(
                      normalizationPlan.laundryEnabled,
                      normalizationPlan.laundryIntervalDays,
                      normalizationPlan.effectiveCycleDays,
                      normalizationPlan.rewearEnabled
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                aria-label={copy.closePreviewAria}
                className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-3 gap-2.5 px-5 pt-4">
              <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2.5">
                <div className="text-[11px] font-medium tk-text-ink2">{copy.kpiAdjusted}</div>
                <div className="mt-0.5 font-num tabular-nums text-sm font-extrabold tk-text-ink">
                  {copy.kpiAdjustedValue(normalizationPlan.changedItems.length)}
                </div>
              </div>
              <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2.5">
                <div className="text-[11px] font-medium tk-text-ink2">
                  {copy.kpiPieceDelta}
                </div>
                <div
                  className={`mt-0.5 font-num tabular-nums text-sm font-extrabold ${
 normalizationPlan.totalDeltaPieces > 0
 ? 'tk-text-forest'
 : 'tk-text-ink2'
 }`}
                >
                  {normalizationPlan.totalDeltaPieces > 0
                    ? `+${normalizationPlan.totalDeltaPieces}`
                    : normalizationPlan.totalDeltaPieces}
                  {copy.pcsUnit}
                </div>
              </div>
              <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2.5">
                <div className="text-[11px] font-medium tk-text-ink2">
                  {copy.kpiEstWeight}
                </div>
                <div className="mt-0.5 font-num tabular-nums text-sm font-extrabold tk-text-ink">
                  {formatSignedWeight(normalizationPlan.totalDeltaWeightGrams)}
                </div>
              </div>
            </div>

            {/* Adjusted Clothing Item List */}
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold tk-text-ink">{copy.breakdownHeading}</span>
                <span className="text-[11px] tk-text-ink2">{copy.breakdownRightNote}</span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border tk-bc-hair bg-white divide-y tk-divide-hair">
                {normalizationPlan.changedItems.map((diff) => {
                  const isIncrease = diff.deltaQuantity > 0;
                  return (
                    <div
                      key={`${diff.groupId}_${diff.itemId}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:tk-bg-paper transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold tk-text-ink truncate">
                            {diff.itemName}
                          </span>
                          {diff.alreadyPacked && (
                            <span
                              className={`text-[11px] font-semibold ${
 isIncrease ? 'tk-text-warning' : 'tk-text-forest'
 }`}
                            >
                              ·{' '}
                              {isIncrease
                                ? copy.packedAddTag(diff.deltaQuantity)
                                : copy.packedTrimTag(Math.abs(diff.deltaQuantity))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] tk-text-ink2">
                          <span className="truncate">{diff.groupTitle}</span>
                          <span aria-hidden="true">·</span>
                          <span className="whitespace-nowrap">{diff.scaleRuleLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 font-num tabular-nums">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border tk-bc-hair tk-bg-paper px-2.5 py-1">
                          <span className="tk-text-ink2 line-through">
                            ×{diff.prevQuantity}
                          </span>
                          <span className="tk-text-ink2">→</span>
                          <span
                            className={`font-extrabold ${
 isIncrease ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                          >
                            ×{diff.nextQuantity}
                          </span>
                        </div>
                        <div className="min-w-[3.75rem] text-right">
                          <div
                            className={`font-bold ${
 isIncrease ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                          >
                            {isIncrease ? `+${diff.deltaQuantity}` : diff.deltaQuantity}
                            {copy.pcsUnit}
                          </div>
                          <div className="text-[10px] tk-text-ink2">
                            {formatSignedWeight(diff.deltaWeightGrams)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t tk-bc-hair tk-bg-card px-5 py-3.5">
              <button
                type="button"
                onClick={() => {
                  setDismissedSignature(currentClothingSignature);
                  setPreviewModalOpen(false);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border tk-bc-hair bg-white px-3.5 py-2 text-xs font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-ink transition-colors whitespace-nowrap cursor-pointer"
              >
                {copy.keepExistingBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  const effective = resolveSubmissionSetup(false);
                  setPreviewModalOpen(false);
                  if (effective) {
                    onSaveEditCurrent?.(effective, crew, normalizationPlan.updatedGroups);
                  }
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl tk-bg-forest px-4 py-2 text-xs font-bold text-white hover:tk-bg-press transition-colors whitespace-nowrap cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                {copy.saveAndScaleBtn(normalizationPlan.changedItems.length)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

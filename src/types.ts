export type AppTab = 'packing' | 'itinerary' | 'budget' | 'memories';

export type TripStyle = '休闲度假' | '商务出差' | '浪漫蜜月' | '亲子出行' | '长期数字游民';

export type ExpenseBucket = 'daily' | 'shopping' | 'prepaid';
export type PaymentAccount = 'cash' | 'card' | 'transit';
export type SplitMode = 'me' | 'split' | 'partner' | 'ratio';
export type VatDocStatus = 'pending_form' | 'form_ready' | 'stamped';

export interface SettlementRecord {
  id: string;
  settledAt: string;
  /** Positive = companion paid me; Negative = I paid companion */
  amountLocal: number;
  itemCount: number;
}

export type BudgetTier = 'budget' | 'comfort' | 'luxury';
export type StopType = 'attraction' | 'hotel' | 'transit' | 'dining' | 'shopping';

export type PackingWeatherOverride = 'colder' | 'warmer' | 'wetter';
export type PackingTripPurpose = 'leisure' | 'business' | 'both';
export type PackingClothingGender = 'male' | 'female' | 'other';
export type ClothingSizeCode = 'S' | 'M' | 'L' | 'XL' | '2XL';
export type PackingDensityLevel = 'light' | 'moderate' | 'fully_loaded';
export type PackingScenarioId =
  | 'baby'
  | 'kids'
  | 'hiking'
  | 'beach'
  | 'swimming'
  | 'onsen'
  | 'ski_snow'
  | 'theme_park'
  | 'camping'
  | 'fitness'
  | 'remote_work'
  | 'photography'
  | 'formal_event'
  | 'shopping_taxfree'
  | 'medication'
  | 'sensitive_skin'
  | 'cabin_only';

export interface PerStopWeatherForecast {
  city: string;
  stayDays: number;
  lowC: number;
  highC: number;
  rainDays: number;
  isRainy: boolean;
  summaryText: string;
}

export interface TripSetup {
  cities: string[];
  /** Per-stop days matching cities[] order; sum equals days when defined */
  cityDays?: number[];
  departureDate: string;
  returnDate: string;
  days: number;
  tripStyle: TripStyle;
  budgetTier?: BudgetTier;
  targetTotalBudgetUsd?: number;
  activities: string[];
  rewear: boolean;
  laundry: boolean;
  laundryIntervalDays: number;
  travelers: number;
  weatherOverrides?: PackingWeatherOverride[];
  packingTripPurpose?: PackingTripPurpose;
  clothingStyle?: PackingClothingGender;
  clothingSize?: ClothingSizeCode;
  packingDensity?: PackingDensityLevel;
  specialScenarios?: PackingScenarioId[];
  packingCustomNote?: string;
}

export interface TripIntelligence {
  routeTitle: string;
  weatherSummary: string;
  tempRange: string;
  rainChance: string;
  sunsetTime: string;
  timezoneOffset: string;
  plugType: string;
  voltage: string;
  currencyCode: string;
  currencySymbol: string;
  fxToUsd: number;
  vatThresholdLocal: number;
  vatExitAirport: string;
  vatRuleSummary: string;
  transitPassName: string;
  localEmergencyNote: string;
}

export type PackingLayer = 'bottom_heavy' | 'middle' | 'top_small' | 'carry_on';
export type PackingSortMode = 'custom' | 'physical' | 'countdown' | 'created';

export type SmartBagId =
  | 'cube_xl'
  | 'cube_l'
  | 'cube_m'
  | 'cube_s'
  | 'shoe_bag'
  | 'toiletry_bag'
  | 'doc_pouch'
  | 'pill_box'
  | 'edc_bag';

export interface AiMissingItemSuggestion {
  name: string;
  why: string;
  subCategory?: string;
  targetGroupId: string;
  targetGroupTitle: string;
  tag: '必需' | '核心' | '天气' | '保暖' | '备用';
  quantity?: number;
  unitWeightGrams?: number;
  weightGrams: number;
  carryOnOnly: boolean;
  morningOfDeparture: boolean;
  smartBagId: SmartBagId;
}

export interface PackingItem {
  id: string;
  name: string;
  why: string;
  /** Granular sub-category inside a PackingGroup (e.g. "防风防雨外层", "随身供电与转换", "海滩防晒与下水") */
  subCategory?: string;
  tag: '必需' | '核心' | '天气' | '保暖' | '备用';
  quantity?: number;
  unitWeightGrams?: number;
  weightGrams: number;
  carryOnOnly?: boolean;
  remindBeforeDeparture?: boolean;
  morningOfDeparture?: boolean;
  packingLayer?: PackingLayer;
  smartBagId?: SmartBagId;
  ownership?: 'personal' | 'shared';
  ownerId?: string;
  packedByMemberId?: string;
  createdAt?: number;
  done: boolean;
  /** Marked for pre-trip purchase ("To Buy") */
  toBuy?: boolean;
  /** Saved in persistent Always Pack library across future trips */
  alwaysPack?: boolean;
}

export interface PackingReminderSettings {
  enabled: boolean;
  mode: 'preset' | 'custom';
  leadHours: 72 | 24 | 12 | 3;
  customDateTime: string;
  scope: 'all_pending' | 'pinned_only' | 'carry_on_only';
  snoozedUntil?: number;
  lastTriggeredAt?: string;
}

export interface PackingGroup {
  id: string;
  title: string;
  icon?: string;
  cubeLabel: string;
  colorKey: 'teal' | 'lavender' | 'lemon' | 'peach' | 'rose' | 'mint';
  items: PackingItem[];
}

export type TripTaskCategory = '门票预约' | '交通接送' | '住宿餐饮' | '通讯金融' | '其他事务';

export interface TripTask {
  id: string;
  title: string;
  category: TripTaskCategory;
  timing: string;
  note?: string;
  ownerId?: string;
  done: boolean;
}

export interface BudgetState {
  tripTotalUsd: number;
  prepaidUsd: number;
  dailyBudgetLocal: number;
  rolloverLocal: number;
  shoppingReserveLocal: number;
  cashLocal: number;
  cardUsd: number;
  transitPassLocal: number;
  partnerOwedLocal: number;
  vatRefundRate: number;
  /** Optional user-locked exchange rate: 1 Trip Local Currency = X Home Currency */
  customFxLocalToHome?: number;
  /** The HomeCurrencyCode against which customFxLocalToHome was locked */
  customFxHomeCode?: HomeCurrencyCode;
}

export interface ExpenseRecord {
  id: string;
  day?: number;
  title: string;
  amountLocal: number;
  bucket: ExpenseBucket;
  account: PaymentAccount;
  split: SplitMode;
  /** My percentage share (0-100) when split === 'ratio' (default 50 for 'split'/'partner', 100 for 'me') */
  mySharePct?: number;
  /** Who physically paid the merchant when split === 'ratio' (defaults to 'me') */
  paidBy?: 'me' | 'partner';
  time: string;
  vatEligible?: boolean;
  /** Tax-free document lifecycle for VAT-eligible shopping items */
  vatStatus?: VatDocStatus;
  /** Whether this shared expense has already been settled in the Finance Split Workspace */
  settled?: boolean;
  note?: string;
}

export interface DayStayAnchor {
  placeName: string;
  address: string;
  district?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  checkInNote?: string;
}

export interface TimelineNode {
  id: string;
  day?: number;
  city?: string;
  stopType?: StopType;
  time: string;
  closeTime: string;
  durationMinutes?: number;
  title: string;
  district: string;
  address: string;
  placeId?: string;
  estLocal: number;
  rating: number;
  lat?: number;
  lng?: number;
  visited?: boolean;
  logged: boolean;
  linkedExpenseId?: string;
  isAnchor?: boolean;
  isOutdoor?: boolean;
  transitNote: string;
  mustVisitReason?: string;
  stopNote?: string;
  rainSwapTitle?: string;
  rainSwapDistrict?: string;
  rainSwapAddress?: string;
}

export type SeatId = 'm1' | 'm2' | 'm3' | 'm4';

export interface CrewMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  location: string;
  distanceKm: number;
  etaMinutes: number;
  accent: 'peach' | 'lavender' | 'teal';
  /** Non-PII Firebase Auth UID of the collaborator who claimed this seat */
  claimedByUid?: string;
}

export interface MeetupPlan {
  time: string;
  placeName: string;
  address: string;
  note: string;
}

export interface LocalCardResult {
  localTitle: string;
  localAddressOrPhrase: string;
  pronunciationHint: string;
  etiquetteTip: string;
  languageLabel: string;
}

export type AiAssistantIntent =
  | 'add_expense'
  | 'add_packing'
  | 'add_task'
  | 'add_stop'
  | 'relax_day'
  | 'toggle_rain_swap'
  | 'local_card'
  | 'travel_tips'
  | 'qa_advice';

export interface AiAssistantHistoryTurn {
  userPrompt: string;
  intent: AiAssistantIntent;
  reply: string;
}

export type AiTravelTipCategory =
  | 'visa'
  | 'transit'
  | 'money'
  | 'culture'
  | 'safety'
  | 'food';

export interface AiTravelTip {
  title: string;
  detail: string;
  category: AiTravelTipCategory;
}

export interface AiProposedExpense {
  day: number;
  title: string;
  amountLocal: number;
  bucket: ExpenseBucket;
  account: PaymentAccount;
  split: ExpenseRecord['split'];
  mySharePct?: number;
  paidBy?: 'me' | 'partner';
  vatEligible: boolean;
  note?: string;
}

export interface AiProposedPackingItem {
  name: string;
  why: string;
  tag: PackingItem['tag'];
  quantity: number;
  unitWeightGrams: number;
  weightGrams: number;
  carryOnOnly: boolean;
  morningOfDeparture: boolean;
  targetGroupId: string;
  groupTitle: string;
}

export interface AiProposedTask {
  title: string;
  category: TripTaskCategory;
  timing: string;
  note?: string;
}

export interface AiProposedStop {
  day: number;
  city: string;
  stopType: StopType;
  time: string;
  closeTime: string;
  title: string;
  district: string;
  address: string;
  lat?: number;
  lng?: number;
  estLocal: number;
  transitNote: string;
  isOutdoor: boolean;
  isAnchor: boolean;
  rainSwapTitle?: string;
  rainSwapDistrict?: string;
  rainSwapAddress?: string;
  reason?: string;
}

export interface AiProposedRemoveStop {
  id: string;
  day: number;
  time: string;
  title: string;
  district?: string;
  reason?: string;
}

export interface AiProposedRainSwap {
  action: 'enable' | 'disable';
  day: number;
}

export interface AiAssistantProposal {
  summary?: string;
  expenses?: AiProposedExpense[];
  packingItems?: AiProposedPackingItem[];
  tasks?: AiProposedTask[];
  stops?: AiProposedStop[];
  removeStops?: AiProposedRemoveStop[];
  rainSwap?: AiProposedRainSwap;
}

export interface AiAssistantDispatchResult {
  intent: AiAssistantIntent;
  reply: string;
  proposal?: AiAssistantProposal;
  travelTips?: AiTravelTip[];
  followUpSuggestions?: string[];
  addedExpenses?: ExpenseRecord[];
  addedPackingItems?: Array<{
    name: string;
    quantity: number;
    weightGrams: number;
    groupTitle: string;
  }>;
  addedTasks?: Array<{
    title: string;
    category: TripTaskCategory;
    timing: string;
  }>;
  addedStops?: Array<{
    id: string;
    day: number;
    time: string;
    title: string;
    district: string;
    stopType: StopType;
    estLocal: number;
  }>;
  rainSwappedNow?: boolean;
  localCard?: LocalCardResult;
}

export type TravelPassCategory =
  | 'passport'
  | 'visa'
  | 'border_qr'
  | 'insurance'
  | 'flight'
  | 'train'
  | 'hotel'
  | 'attraction'
  | 'dining'
  | 'car_rental'
  | 'esim'
  | 'tax_free_other'
  | 'esim_insurance';

export type TravelPassStatus = 'ready' | 'pending';

export interface TravelPass {
  id: string;
  category: TravelPassCategory;
  title: string;
  subtitle?: string;
  day?: number;
  dateTimeLabel?: string;
  confirmationCode?: string;
  qrPayload?: string;
  terminalOrPlatform?: string;
  seatOrRoom?: string;
  localLanguageTitle?: string;
  localLanguageAddress?: string;
  note?: string;
  bookingUrl?: string;
  linkedPackingItemId?: string;
  linkedTimelineNodeId?: string;
  hasOfflineImage?: boolean;
  offlineMimeType?: string;
  offlineFileName?: string;
  status: TravelPassStatus;
  updatedAt: number;
}

export type CoverPresetId =
  | 'europe_classic'
  | 'canal_autumn'
  | 'japan_fuji'
  | 'tropical_coast'
  | 'alpine_peaks'
  | 'modern_metropolis';

export type CoverToneId = 'natural' | 'golden' | 'forest' | 'azure' | 'noir';

export interface TripCoverConfig {
  mode: 'auto' | 'preset' | 'custom';
  presetId?: CoverPresetId;
  /** Vertical focal point percentage (0 = top, 50 = center, 100 = bottom) */
  focusY?: number;
  tone?: CoverToneId;
  updatedAt?: number;
}

export interface TripState {
  setup: TripSetup;
  intel: TripIntelligence;
  packing: PackingGroup[];
  budget: BudgetState;
  expenses: ExpenseRecord[];
  timeline: TimelineNode[];
  wishlist: string[];
  crew: CrewMember[];
  meetup: MeetupPlan;
  rainSwapped: boolean;
  rainSwappedDays?: Record<number, boolean>;
  spatialSummary: string;
  spatialSummariesByDay?: Record<number, string>;
  spatialClustered: boolean;
  spatialClusteredByDay?: Record<number, boolean>;
  reminder?: PackingReminderSettings;
  packingSortMode?: PackingSortMode;
  learnedCategoryMap?: Record<string, string>;
  tasks?: TripTask[];
  smartBagOverrides?: Record<string, SmartBagId>;
  smartBagSummaryTip?: string;
  packingViewMode?: 'checklist' | 'smart_bags';
  activeFinanceDay?: number;
  settlementHistory?: SettlementRecord[];
  travelPasses?: TravelPass[];
  dayStays?: Record<number, DayStayAnchor>;
  coverConfig?: TripCoverConfig;
}

export interface SavedTripEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  cloudRoomId?: string | null;
  claimedSeatId?: SeatId;
  state: TripState;
}

export type AppLanguage =
  | 'zh-CN'
  | 'en-US'
  | 'en-GB'
  | 'es-MX'
  | 'fr-FR'
  | 'de-DE'
  | 'pt-BR'
  | 'ja-JP';
export type HomeCurrencyCode =
  | 'CNY'
  | 'USD'
  | 'EUR'
  | 'HKD'
  | 'JPY'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'THB'
  | 'KRW'
  | 'SGD'
  | 'MYR'
  | 'TWD'
  | 'MOP'
  | 'VND'
  | 'IDR'
  | 'PHP'
  | 'NZD'
  | 'AED'
  | 'TRY'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK'
  | 'HUF'
  | 'MXN'
  | 'BRL'
  | 'INR'
  | 'ZAR'
  | 'EGP';
export type UnitSystem = 'metric' | 'imperial';
export type TimeFormatPref = '24h' | '12h';
export type BaggagePresetId = 'lcc' | 'standard' | 'business' | 'custom';
export type ProPlanId = 'annual' | 'monthly' | 'lifetime';
export type TrialSimulationMode = 'normal' | 'expired';

export interface AlwaysPackTemplateItem {
  id: string;
  name: string;
  why: string;
  subCategory?: string;
  tag: PackingItem['tag'];
  quantity: number;
  unitWeightGrams: number;
  carryOnOnly: boolean;
  morningOfDeparture?: boolean;
  smartBagId?: SmartBagId;
  groupId: string;
  groupTitle: string;
  updatedAt: number;
}

export interface AffiliatePartnerConfig {
  amazonTag: string;
  klookAid: string;
  getYourGuidePartnerId: string;
  tripComAllianceId: string;
  airaloRef: string;
  taobaoPid: string;
  disclosureEnabled: boolean;
}

export interface AppPreferences {
  language: AppLanguage;
  followSystemLanguage?: boolean;
  unitSystem: UnitSystem;
  timeFormat: TimeFormatPref;
  homeCurrency: HomeCurrencyCode;
  baggagePreset: BaggagePresetId;
  carryOnLimitKg: number;
  checkedLimitKg: number;
  tabBadgeEnabled: boolean;
  workspaceBannerEnabled: boolean;
  isProUnlocked: boolean;
  proPlan: ProPlanId;
  trialStartedAt: number;
  proExpiresAt: number | null;
  redeemedCode: string;
  aiAuditUsedCount: number;
  trialSimulationMode: TrialSimulationMode;
  affiliatePartners?: AffiliatePartnerConfig;
}

export type PhotobookTemplateId = 'kinfolk' | 'editorial' | 'scrapbook';
export type PhotobookFormatId = 'square_210' | 'portrait_a5';
export type PhotobookBindingId = 'hardcover_matte' | 'softcover_textured';
export type PhotoPrintDpiGrade = 'optimal_300dpi' | 'good_200dpi' | 'low_res_grid_only';

export interface MemoryPhotoMeta {
  id: string;
  fileName: string;
  takenAtIso: string;
  takenTimestamp: number;
  width: number;
  height: number;
  lat?: number;
  lng?: number;
  cameraLabel?: string;
  matchedTripId: string;
  matchedDay: number;
  matchedCity: string;
  matchedStopId?: string;
  matchedStopTitle?: string;
  isFavorite: boolean;
  userNote?: string;
  sourceType: 'local_exif' | 'native_capacitor' | 'demo_sample';
  sampleImageUrl?: string;
  createdAt: number;
}

export interface PhotobookPhotoCaption {
  photoId: string;
  headline: string;
  storyCaption: string;
  layoutHint: 'hero_full' | 'editorial_split' | 'polaroid_pair';
}

export interface PhotobookChapterStory {
  tripId: string;
  chapterNumber: number;
  chapterTitle: string;
  dateSpanLabel: string;
  routeLine: string;
  narrativeIntro: string;
  highlightsLine: string;
}

export interface PhotobookDraft {
  id: string;
  selectedTripIds: string[];
  templateId: PhotobookTemplateId;
  formatId: PhotobookFormatId;
  bindingId: PhotobookBindingId;
  bookTitle: string;
  bookSubtitle: string;
  epigraph: string;
  colophonSummary: string;
  chapters: PhotobookChapterStory[];
  photoCaptions: Record<string, PhotobookPhotoCaption>;
  includedPhotoIds: string[];
  pageCount: number;
  generatedByAi: boolean;
  updatedAt: number;
}

export type PhotobookOrderStatus =
  | 'pending_payment'
  | 'paid_queued'
  | 'printing'
  | 'shipped'
  | 'cancelled';

export interface PhotobookShippingInfo {
  recipientName: string;
  phone: string;
  shippingAddress: string;
  customerNote: string;
}

export interface PhotobookOrderRecord {
  orderId: string;
  uid: string;
  bookTitle: string;
  tripTitlesSummary: string;
  templateId: PhotobookTemplateId;
  formatSpec: PhotobookFormatId;
  bindingSpec: PhotobookBindingId;
  pageCount: number;
  photoCount: number;
  copies: number;
  currencyCode: string;
  totalPrice: number;
  status: PhotobookOrderStatus;
  trackingNumber: string;
  createdAtMs: number;
  updatedAtMs: number;
  shipping?: PhotobookShippingInfo;
}

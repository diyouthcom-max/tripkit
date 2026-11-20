import type {
  AlwaysPackTemplateItem,
  AppLanguage,
  ClothingSizeCode,
  PackingClothingGender,
  PackingDensityLevel,
  PackingGroup,
  PackingItem,
  PackingScenarioId,
  PackingTripPurpose,
  PackingWeatherOverride,
  PerStopWeatherForecast,
  SmartBagId,
  TripIntelligence,
  TripSetup,
} from '../types';
import {
  filterGroupsAgainstNeverSuggest,
  loadAlwaysPackLibrary,
  loadNeverSuggestList,
  mergeAlwaysPackIntoGroups,
} from './alwaysPackHelpers';
import { getItemQuantity, getItemUnitWeight } from './packingHelpers';
import { getPackingWizardUiCopy } from '../i18n/packs/packingWizardUiPack';
import {
  getPackingGroupCopy,
  getPackingSeedDynamicCopy,
  getPackingSubCategory,
  type PackingGroupCopyKey,
  type PackingSubCategoryKey,
} from '../i18n/packs/packingSeedGroupsPack';
import {
  getPackingSeedItemA,
  type PackingSeedItemKeyA,
} from '../i18n/packs/packingSeedItemsPackA';
import {
  getPackingSeedItemB,
  type PackingSeedItemKeyB,
} from '../i18n/packs/packingSeedItemsPackB';

export const CLOTHING_SIZE_MULTIPLIERS: Record<ClothingSizeCode, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.12,
  XL: 1.24,
  '2XL': 1.36,
};

export interface PackingScenarioSpec {
  id: PackingScenarioId;
  labelZh: string;
  labelUs: string;
  labelGb: string;
}

export const PACKING_SCENARIO_SPECS: PackingScenarioSpec[] = [
  {
    id: 'beach',
    labelZh: '海滨 / 海滩度假',
    labelUs: 'Beach & Coastal',
    labelGb: 'Beach & Coastal',
  },
  {
    id: 'swimming',
    labelZh: '游泳 / 浮潜',
    labelUs: 'Swimming & Snorkel',
    labelGb: 'Swimming & Snorkel',
  },
  {
    id: 'onsen',
    labelZh: '温泉 / SPA',
    labelUs: 'Hot Spring / Onsen',
    labelGb: 'Hot Spring / Spa',
  },
  {
    id: 'hiking',
    labelZh: '徒步登山',
    labelUs: 'Hiking & Trails',
    labelGb: 'Hillwalking & Trails',
  },
  {
    id: 'ski_snow',
    labelZh: '滑雪 / 冰雪极寒',
    labelUs: 'Ski & Snow',
    labelGb: 'Ski & Snow',
  },
  {
    id: 'theme_park',
    labelZh: '主题乐园暴走',
    labelUs: 'Theme Parks',
    labelGb: 'Theme Parks',
  },
  {
    id: 'camping',
    labelZh: '露营户外',
    labelUs: 'Camping',
    labelGb: 'Camping',
  },
  {
    id: 'fitness',
    labelZh: '健身 / 晨跑',
    labelUs: 'Gym & Running',
    labelGb: 'Gym & Running',
  },
  {
    id: 'photography',
    labelZh: '摄影 / 航拍器材',
    labelUs: 'Photography & Drone',
    labelGb: 'Photography & Drone',
  },
  {
    id: 'remote_work',
    labelZh: '远程办公',
    labelUs: 'Work remotely',
    labelGb: 'Work remotely',
  },
  {
    id: 'formal_event',
    labelZh: '正装 / 婚礼晚宴',
    labelUs: 'Formal / Fine Dining',
    labelGb: 'Smart / Occasion',
  },
  {
    id: 'shopping_taxfree',
    labelZh: '免税血拼 / 代购',
    labelUs: 'Tax-Free Shopping',
    labelGb: 'VAT-Free Shopping',
  },
  {
    id: 'baby',
    labelZh: '带婴儿同行',
    labelUs: 'Traveling with a baby',
    labelGb: 'Travelling with a baby',
  },
  {
    id: 'kids',
    labelZh: '儿童同行',
    labelUs: 'Kids',
    labelGb: 'Kids',
  },
  {
    id: 'medication',
    labelZh: '规律服药',
    labelUs: 'Medication',
    labelGb: 'Medication',
  },
  {
    id: 'sensitive_skin',
    labelZh: '敏感肌修护',
    labelUs: 'Sensitive skin',
    labelGb: 'Sensitive skin',
  },
  {
    id: 'cabin_only',
    labelZh: '仅带登机箱',
    labelUs: 'Carry-on only',
    labelGb: 'Cabin bag only',
  },
];

export function inferDefaultTripPurpose(style: TripSetup['tripStyle']): PackingTripPurpose {
  if (style === '商务出差') return 'business';
  if (style === '长期数字游民') return 'both';
  return 'leisure';
}

export function inferDefaultScenariosFromSetup(
  setup: TripSetup,
  checkedLimitKg = 23
): PackingScenarioId[] {
  // Respect explicit empty array [] when user intentionally deleted all scenario tags
  if (Array.isArray(setup.specialScenarios)) {
    return setup.specialScenarios;
  }
  const inferred = new Set<PackingScenarioId>();
  const joinedActs = (setup.activities || []).join(' ').toLowerCase();
  const joinedCities = (setup.cities || []).join(' ').toLowerCase();
  const note = (setup.packingCustomNote || '').toLowerCase();
  const combined = `${joinedActs} ${joinedCities} ${note}`;

  if (setup.tripStyle === '亲子出行') inferred.add('kids');
  if (setup.tripStyle === '长期数字游民' || /远程办公|remote/i.test(joinedActs)) {
    inferred.add('remote_work');
  }
  if (/摄影|航拍|无人机|photo|drone/i.test(combined)) inferred.add('photography');
  if (/远足|登山|徒步|hik|trail/i.test(joinedActs)) inferred.add('hiking');
  if (/露营|野餐|camp/i.test(joinedActs)) inferred.add('camping');
  if (/海滨|海滩|海岛|冲绳|三亚|普吉|巴厘岛|夏威夷|迈阿密|马尔代夫|beach|okinawa|phuket|bali|hawaii/i.test(combined)) {
    inferred.add('beach');
  }
  if (/游泳|泳池|浮潜|潜水|swim|snorkel|pool/i.test(combined)) inferred.add('swimming');
  if (/温泉|泡汤|spa|箱根|热海|草津|别府|登别|onsen|hakone/i.test(combined)) {
    inferred.add('onsen');
  }
  if (/雪上运动|滑雪|极寒|二世谷|富良野|长白山|ski|snowboard/i.test(combined)) {
    inferred.add('ski_snow');
  }
  if (/主题乐园|迪士尼|环球影城|disney|universal/i.test(combined)) {
    inferred.add('theme_park');
  }
  if (/健身房|晨跑|骑行|gym|run|fitness/i.test(joinedActs)) {
    inferred.add('fitness');
  }
  if (/正式晚餐|bistro|米其林|婚礼|晚宴|礼服|formal|wedding|michelin/i.test(combined)) {
    inferred.add('formal_event');
  }
  if (/购物|退税|血拼|shopping|tax-free|vat/i.test(joinedActs)) {
    inferred.add('shopping_taxfree');
  }
  if (checkedLimitKg <= 0) inferred.add('cabin_only');
  return Array.from(inferred);
}

interface StopClimateBase {
  matcher: RegExp;
  lowC: number;
  highC: number;
  rainPct: number;
  seasonalFactor: number;
}

const STOP_CLIMATE_PROFILES: StopClimateBase[] = [
  // Alpine / Cold Mountain Microclimates
  {
    matcher:
      /(汤加里罗|库克山|皇后镇|瓦纳卡|采尔马特|少女峰|因特拉肯|北海道|札幌|小樽|富良野|箱根|河口湖|长白山|拉萨|班夫|tongariro|mount cook|queenstown|wanaka|wānaka|zermatt|interlaken|hokkaido|sapporo|hakone|banff)/i,
    lowC: 3,
    highC: 12,
    rainPct: 42,
    seasonalFactor: 0.85,
  },
  // Wet Fjord / Pacific NW / Maritime Rainy Zones
  {
    matcher:
      /(米尔福德|峡湾|爱丁堡|苏格兰|西雅图|温哥华|卑尔根|阿姆斯特丹|伦敦|都柏林|milford|fiordland|edinburgh|scotland|seattle|vancouver|bergen|amsterdam|london|dublin)/i,
    lowC: 7,
    highC: 15,
    rainPct: 48,
    seasonalFactor: 0.75,
  },
  // Oceania Coastal / North Island NZ / Sydney / Melbourne
  {
    matcher:
      /(奥克兰|科罗曼德|丰盛湾|塔拉纳基|特卡波|基督城|惠灵顿|悉尼|墨尔本|布里斯班|黄金海岸|新西兰|澳洲|澳大利亚|auckland|coromandel|bay of plenty|taranaki|tekapo|christchurch|wellington|sydney|melbourne|brisbane|new zealand|australia)/i,
    lowC: 11,
    highC: 20,
    rainPct: 26,
    seasonalFactor: -0.75,
  },
  // Japan / Korea / East China Temperate
  {
    matcher:
      /(东京|京都|大阪|奈良|神户|横滨|名古屋|福冈|冲绳|首尔|釜山|济州|上海|杭州|苏州|成都|北京|西安|tokyo|kyoto|osaka|nara|fukuoka|seoul|busan|jeju|shanghai|beijing)/i,
    lowC: 9,
    highC: 18,
    rainPct: 28,
    seasonalFactor: 1.0,
  },
  // Tropical / Southeast Asia
  {
    matcher:
      /(曼谷|清迈|普吉|巴厘岛|新加坡|吉隆坡|胡志明|岘港|马尼拉|三亚|夏威夷|迈阿密|bangkok|chiang mai|phuket|bali|singapore|kuala lumpur|danang|sanya|hawaii|miami)/i,
    lowC: 23,
    highC: 32,
    rainPct: 38,
    seasonalFactor: 0.2,
  },
  // Desert / Gulf
  {
    matcher: /(迪拜|阿布扎比|多哈|开罗|拉斯维加斯|dubai|abu dhabi|doha|cairo|las vegas)/i,
    lowC: 20,
    highC: 31,
    rainPct: 8,
    seasonalFactor: 0.7,
  },
  // Mediterranean / Southern Europe / California
  {
    matcher:
      /(里斯本|波尔图|巴塞罗那|马德里|罗马|佛罗伦萨|米兰|威尼斯|雅典|尼斯|洛杉矶|旧金山|圣迭戈|lisbon|porto|barcelona|madrid|rome|florence|milan|venice|athens|nice|los angeles|san francisco)/i,
    lowC: 11,
    highC: 21,
    rainPct: 22,
    seasonalFactor: 0.85,
  },
];

const DEFAULT_STOP_CLIMATE: StopClimateBase = {
  matcher: /.*/,
  lowC: 8,
  highC: 16,
  rainPct: 30,
  seasonalFactor: 0.9,
};

function computeMonthlySeasonalShift(departureDate: string, seasonalFactor: number): number {
  if (!departureDate || !/^\d{4}-\d{2}/.test(departureDate)) return 0;
  const month = Number(departureDate.slice(5, 7));
  if (!Number.isFinite(month) || month < 1 || month > 12) return 0;
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
  const isSouthernNzAlpine =
    seasonalFactor > 0
      ? false
      : true;
  const rawDelta = northernMonthlyDelta[month] ?? 0;
  return Math.round(rawDelta * (isSouthernNzAlpine ? seasonalFactor : seasonalFactor));
}

export function buildPerStopWeatherForecasts(
  cities: string[],
  departureDate: string,
  totalDays: number,
  overrides: PackingWeatherOverride[] = [],
  lang: AppLanguage = 'zh-CN',
  cityDays?: number[]
): PerStopWeatherForecast[] {
  const uiCopy = getPackingWizardUiCopy(lang);
  const rawStops = cities
    .flatMap((entry) => String(entry || '').split(/\s*(?:→|->|—>|／|\/|,|，|、)\s*/))
    .map((s) => s.replace(/[（(]?\s*\d+(?:\.\d+)?\s*(?:天|日|晚|nights?|days?|d)\s*[)）]?/gi, '').trim())
    .filter(Boolean);

  const uniqueOrderedStops: string[] = [];
  rawStops.forEach((st) => {
    if (uniqueOrderedStops[uniqueOrderedStops.length - 1] !== st) {
      uniqueOrderedStops.push(st);
    }
  });
  const stops = uniqueOrderedStops.length > 0 ? uniqueOrderedStops : [uiCopy.destinationFallback];
  const safeDays = Math.max(1, Math.round(totalDays) || 5);
  const n = stops.length;

  const stayDaysArr = new Array<number>(n).fill(1);
  if (Array.isArray(cityDays) && cityDays.length === n) {
    for (let i = 0; i < n; i += 1) {
      stayDaysArr[i] = Math.max(1, Math.round(Number(cityDays[i]) || 1));
    }
  } else if (safeDays >= n) {
    stayDaysArr.fill(0);
    for (let d = 0; d < safeDays; d += 1) {
      const idx = Math.min(n - 1, Math.floor((d * n) / safeDays));
      stayDaysArr[idx] += 1;
    }
  }

  const hasColder = overrides.includes('colder');
  const hasWarmer = overrides.includes('warmer');
  const hasWetter = overrides.includes('wetter');
  const tempDelta = (hasColder ? -4 : 0) + (hasWarmer ? 4 : 0);

  return stops.map((city, idx) => {
    const stayDays = Math.max(1, stayDaysArr[idx] || 1);
    const matched =
      STOP_CLIMATE_PROFILES.find((p) => p.matcher.test(city)) || DEFAULT_STOP_CLIMATE;

    // Southern hemisphere alpine check for NZ south island stops
    const isNzSouthern =
      /(汤加里罗|库克山|皇后镇|瓦纳卡|米尔福德|特卡波|基督城|惠灵顿|tongariro|mount cook|queenstown|wanaka|wānaka|milford|tekapo|christchurch|wellington)/i.test(
        city
      );
    const effectiveFactor = isNzSouthern ? -Math.abs(matched.seasonalFactor) : matched.seasonalFactor;
    const seasonalShift = computeMonthlySeasonalShift(departureDate, effectiveFactor);

    // Deterministic slight per-city variation so multi-stop routes show natural microclimate spread
    const cityHash = city.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const jitterLow = (cityHash % 3) - 1;
    const jitterHigh = ((cityHash >> 2) % 4) - 1;

    const lowC = Math.round(matched.lowC + seasonalShift + jitterLow + tempDelta);
    const highC = Math.max(
      lowC + 4,
      Math.round(matched.highC + seasonalShift + jitterHigh + tempDelta)
    );

    const effectiveRainPct = Math.min(90, matched.rainPct + (hasWetter ? 26 : 0));
    let rainDays = 0;
    if (effectiveRainPct >= 36) {
      rainDays = Math.max(1, Math.min(stayDays, Math.round((stayDays * effectiveRainPct) / 100)));
    } else if (effectiveRainPct >= 28 && stayDays >= 3) {
      rainDays = 1;
    }

    const isRainy = rainDays >= 1;
    const rainPhrase = isRainy
      ? uiCopy.rainForecastPhrase(rainDays, stayDays)
      : uiCopy.littleRainPhrase;

    return {
      city,
      stayDays,
      lowC,
      highC,
      rainDays,
      isRainy,
      summaryText: `${lowC}–${highC}°C · ${rainPhrase}`,
    };
  });
}

const GARMENT_OR_WEARABLE_RE =
  /(衣|衫|T恤|短袖|长袖|外套|夹克|风衣|羽绒|抓绒|毛衣|卫衣|开衫|背心|西装|礼服|裙|裤|牛仔|短裤|打底|内衣|内裤|文胸|胸罩|袜|睡衣|泳衣|泳裤|比基尼|鞋|靴|拖鞋|凉鞋|帽|围巾|手套|shirt|tee|top|blouse|jacket|coat|parka|fleece|sweater|hoodie|cardigan|blazer|suit|dress|skirt|jeans|trousers|pants|shorts|leggings|base layer|thermal|underwear|briefs|bra|socks|pajama|pyjama|sleepwear|swimsuit|trunks|bikini|shoes|sneakers|trainers|boots|sandals|slippers|hat|beanie|scarf|gloves|camisa|playera|sudadera|chamarra|pantalón|falda|vestido|calcetines|ropa interior|pantuflas|tenis|traje de baño|chemise|pull|veste|doudoune|pantalon|jupe|robe|chaussettes|sous-vêtements|baskets|maillot|Hemd|Pullover|Jacke|Hose|Rock|Kleid|Socken|Unterwäsche|Schuhe|camiseta|jaqueta|calça|saia|meias|tênis|chinelo|シャツ|カットソー|ニット|ジャケット|パンツ|スカート|ワンピース|靴下|下着|パジャマ|スニーカー|水着)/i;

const NON_GARMENT_EXCLUDE_RE =
  /(洗衣|衣架|晾衣|袋|包|巾|膜|贴|霜|液|皂|器|线|卡|证|伞|镜|laundry|hanger|bag|cube|pouch|towel|sheet|wipe|detergent|steamer|bolsa|toalla|sac|serviette|Beutel|Handtuch|saco|toalha|ポーチ|バッグ|タオル|洗剤)/i;

export function isClothingSizeScalableItem(groupId: string, itemName: string): boolean {
  const gLower = groupId.toLowerCase();
  const isApparelGroup =
    gLower.includes('cloth') ||
    gLower.includes('top') ||
    gLower.includes('bottom') ||
    gLower.includes('footwear') ||
    gLower.includes('formal');
  if (NON_GARMENT_EXCLUDE_RE.test(itemName)) return false;
  if (GARMENT_OR_WEARABLE_RE.test(itemName)) return true;
  return isApparelGroup;
}

export function scaleUnitWeightBySize(
  baseUnitWeightGrams: number,
  groupId: string,
  itemName: string,
  size: ClothingSizeCode = 'M'
): number {
  if (baseUnitWeightGrams <= 0) return 0;
  const mult = CLOTHING_SIZE_MULTIPLIERS[size] ?? 1.0;
  if (mult === 1.0) return Math.round(baseUnitWeightGrams);
  if (!isClothingSizeScalableItem(groupId, itemName)) {
    return Math.round(baseUnitWeightGrams);
  }
  return Math.max(15, Math.round((baseUnitWeightGrams * mult) / 5) * 5);
}

export function applySizeScaleToPackingGroups(
  groups: PackingGroup[],
  size: ClothingSizeCode = 'M'
): PackingGroup[] {
  if (!size || size === 'M') return groups;
  return groups.map((grp) => ({
    ...grp,
    items: grp.items.map((it) => {
      const qty = getItemQuantity(it);
      const rawUnit = getItemUnitWeight(it, grp.id);
      const scaledUnit = scaleUnitWeightBySize(rawUnit, grp.id, it.name, size);
      if (scaledUnit === rawUnit) return it;
      return {
        ...it,
        unitWeightGrams: scaledUnit,
        weightGrams: Math.max(0, scaledUnit * qty),
      };
    }),
  }));
}

type DraftSeedRef =
  | { pack: 'A'; key: PackingSeedItemKeyA }
  | { pack: 'B'; key: PackingSeedItemKeyB };

interface DraftSeedItem {
  seedRef: DraftSeedRef;
  subCategoryKey: PackingSubCategoryKey;
  nameOverride?: string;
  whyOverride?: string;
  tag: PackingItem['tag'];
  quantity: number;
  unitWeightGrams: number;
  carryOnOnly: boolean;
  morningOfDeparture?: boolean;
  smartBagId: SmartBagId;
  ownership?: 'personal' | 'shared';
  minDensity?: PackingDensityLevel;
}

function passesDensity(
  itemMin: PackingDensityLevel | undefined,
  selected: PackingDensityLevel
): boolean {
  const rank: Record<PackingDensityLevel, number> = {
    light: 1,
    moderate: 2,
    fully_loaded: 3,
  };
  return rank[selected] >= rank[itemMin || 'light'];
}

export interface OfflineDeepPackingOptions {
  setup: TripSetup;
  intel?: TripIntelligence;
  lang?: AppLanguage;
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  ownerId?: string;
  alwaysPackLibrary?: AlwaysPackTemplateItem[];
  neverSuggestItems?: string[];
}

export function buildOfflineDeepPackingGroups(
  opts: OfflineDeepPackingOptions
): PackingGroup[] {
  const {
    setup,
    intel,
    lang = 'zh-CN',
    checkedLimitKg = 23,
    ownerId = 'm1',
    alwaysPackLibrary = loadAlwaysPackLibrary(),
    neverSuggestItems = loadNeverSuggestList(),
  } = opts;

  const dynCopy = getPackingSeedDynamicCopy(lang);
  const size: ClothingSizeCode = setup.clothingSize || 'M';
  const density: PackingDensityLevel = setup.packingDensity || 'moderate';
  const gender: PackingClothingGender = setup.clothingStyle || 'other';
  const purpose: PackingTripPurpose =
    setup.packingTripPurpose || inferDefaultTripPurpose(setup.tripStyle);
  const overrides: PackingWeatherOverride[] = setup.weatherOverrides || [];
  const scenarios = new Set<PackingScenarioId>(
    Array.isArray(setup.specialScenarios)
      ? setup.specialScenarios
      : inferDefaultScenariosFromSetup(setup, checkedLimitKg)
  );
  const customNote = (setup.packingCustomNote || '').trim();
  if (/carry-on|cabin only|仅登机|只带登机箱|无托运/i.test(customNote) || checkedLimitKg <= 0) {
    scenarios.add('cabin_only');
  }
  if (/温泉|泡汤|onsen|hot spring/i.test(customNote)) scenarios.add('onsen');
  if (/海滨|海滩|冲浪|浮潜|beach|snorkel/i.test(customNote)) scenarios.add('beach');
  if (/滑雪|雪场|ski|snowboard/i.test(customNote)) scenarios.add('ski_snow');
  if (/迪士尼|环球影城|乐园|disney|universal/i.test(customNote)) scenarios.add('theme_park');
  if (/婚礼|晚宴|礼服|求婚|歌剧|米其林|wedding|gala|formal|michelin|opera/i.test(customNote)) {
    scenarios.add('formal_event');
  }

  const isCabinOnly = scenarios.has('cabin_only');
  const isMultiTraveler = (setup.travelers || 1) >= 2;

  const forecasts = buildPerStopWeatherForecasts(
    setup.cities,
    setup.departureDate,
    setup.days,
    overrides,
    lang,
    setup.cityDays
  );
  const minTempC = Math.min(...forecasts.map((f) => f.lowC));
  const maxTempC = Math.max(...forecasts.map((f) => f.highC));
  const anyRainy = forecasts.some((f) => f.isRainy) || overrides.includes('wetter');

  const cycleDays = setup.laundry
    ? Math.min(setup.days, Math.max(3, setup.laundryIntervalDays || 4) + 1)
    : Math.min(10, Math.max(2, setup.days));
  const densityQtyBoost = density === 'fully_loaded' ? 1 : density === 'light' ? -1 : 0;
  const baseTopsQty = Math.max(
    2,
    Math.min(8, (setup.rewear ? Math.ceil(cycleDays * 0.75) : cycleDays) + densityQtyBoost)
  );
  const underwearQty = Math.max(3, Math.min(10, cycleDays + (density === 'fully_loaded' ? 2 : 1)));
  const bottomsQty = Math.max(
    2,
    Math.min(5, Math.ceil(cycleDays / 2.5) + (density === 'fully_loaded' ? 1 : 0))
  );

  const now = Date.now();
  let groupCounter = 0;

  const resolveSeedText = (ref: DraftSeedRef): { name: string; why: string } => {
    return ref.pack === 'A' ? getPackingSeedItemA(ref.key, lang) : getPackingSeedItemB(ref.key, lang);
  };

  const materializeGroup = (
    id: string,
    groupKey: PackingGroupCopyKey,
    colorKey: PackingGroup['colorKey'],
    seeds: DraftSeedItem[],
    cubeLabelOverride?: string
  ): PackingGroup | null => {
    const filtered = seeds.filter((s) => passesDensity(s.minDensity, density));
    if (filtered.length === 0) return null;
    const gIndex = groupCounter++;
    const gCopy = getPackingGroupCopy(groupKey, lang);
    return {
      id,
      title: gCopy.title,
      cubeLabel: cubeLabelOverride || gCopy.cubeLabel,
      colorKey,
      items: filtered.map((s, idx) => {
        const seedText = resolveSeedText(s.seedRef);
        const name = s.nameOverride ?? seedText.name;
        const unitW = scaleUnitWeightBySize(s.unitWeightGrams, id, name, size);
        const qty = Math.max(1, s.quantity);
        const isShared = Boolean(isMultiTraveler && s.ownership === 'shared');
        const forceCabin = isCabinOnly ? true : s.carryOnOnly;
        return {
          id: `pk_wiz_${now}_${gIndex}_${idx}`,
          name,
          subCategory: getPackingSubCategory(s.subCategoryKey, lang),
          why: s.whyOverride ?? seedText.why,
          tag: s.tag,
          quantity: qty,
          unitWeightGrams: unitW,
          weightGrams: Math.max(0, unitW * qty),
          carryOnOnly: forceCabin,
          morningOfDeparture: Boolean(s.morningOfDeparture),
          smartBagId: s.smartBagId,
          ownership: isShared ? 'shared' : 'personal',
          ownerId: isShared ? undefined : ownerId,
          createdAt: now + gIndex * 30 + idx,
          done: false,
        };
      }),
    };
  };

  const groups: Array<PackingGroup | null> = [];
  const routeJoined = setup.cities.join(' ');
  const isJapan = /(东京|京都|大阪|北海道|冲绳|箱根|日本|tokyo|kyoto|osaka|japan|okinawa|hokkaido|東京|京都|大阪|北海道|沖縄)/i.test(
    routeJoined
  );

  // 1. Documents & Digital Passes
  groups.push(
    materializeGroup('documents', 'documents', 'peach', [
      {
        seedRef: { pack: 'A', key: 'doc_passport' },
        subCategoryKey: 'sub_physical_ids',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 45,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
      },
      {
        seedRef: { pack: 'A', key: isJapan ? 'doc_qr_japan' : 'doc_qr_default' },
        subCategoryKey: 'sub_digital_passes',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 0,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
      },
      {
        seedRef: { pack: 'A', key: 'doc_esim' },
        subCategoryKey: 'sub_digital_passes',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 0,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
      },
      {
        seedRef: { pack: 'A', key: isJapan ? 'doc_cash_japan' : 'doc_cash_default' },
        subCategoryKey: 'sub_cards_cash',
        whyOverride: !isJapan && intel?.vatThresholdLocal ? dynCopy.docVatWhyExtra : undefined,
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 60,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
      },
      {
        seedRef: { pack: 'A', key: 'doc_insurance' },
        subCategoryKey: 'sub_digital_passes',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 0,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
        minDensity: 'moderate',
      },
      {
        seedRef: { pack: 'A', key: 'doc_receipts' },
        subCategoryKey: 'sub_cards_cash',
        tag: '备用',
        quantity: 1,
        unitWeightGrams: 35,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
        ownership: 'shared',
        minDensity: 'moderate',
      },
    ])
  );

  // 2. Tops & Weather Outerwear
  const topSeeds: DraftSeedItem[] = [
    {
      seedRef: { pack: 'A', key: maxTempC >= 20 ? 'top_tee_warm' : 'top_tee_cool' },
      subCategoryKey: 'sub_base_tops',
      whyOverride: dynCopy.topBaseWhy(cycleDays, size),
      tag: '核心',
      quantity: baseTopsQty,
      unitWeightGrams: 165,
      carryOnOnly: false,
      smartBagId: 'cube_m',
    },
  ];

  if (minTempC <= 15 || maxTempC - minTempC >= 8) {
    topSeeds.push({
      seedRef: { pack: 'A', key: 'top_midlayer' },
      subCategoryKey: 'sub_mid_layers',
      whyOverride: dynCopy.topMidWhy(minTempC),
      tag: '保暖',
      quantity: minTempC <= 8 ? 2 : 1,
      unitWeightGrams: 340,
      carryOnOnly: false,
      smartBagId: 'cube_l',
    });
  }

  if (anyRainy || minTempC <= 14) {
    topSeeds.push({
      seedRef: { pack: 'A', key: 'top_rain_shell' },
      subCategoryKey: 'sub_weather_shells',
      tag: '天气',
      quantity: 1,
      unitWeightGrams: 430,
      carryOnOnly: true,
      smartBagId: 'cube_xl',
    });
  }

  if (minTempC <= 7 || scenarios.has('ski_snow')) {
    topSeeds.push(
      {
        seedRef: { pack: 'A', key: 'top_down_jacket' },
        subCategoryKey: 'sub_weather_shells',
        whyOverride: dynCopy.topDownWhy(minTempC),
        tag: '保暖',
        quantity: 1,
        unitWeightGrams: 390,
        carryOnOnly: false,
        smartBagId: 'cube_xl',
      },
      {
        seedRef: { pack: 'A', key: 'top_thermal_base' },
        subCategoryKey: 'sub_base_tops',
        tag: '保暖',
        quantity: density === 'fully_loaded' ? 2 : 1,
        unitWeightGrams: 240,
        carryOnOnly: false,
        smartBagId: 'cube_m',
        minDensity: 'moderate',
      }
    );
  }

  if (maxTempC >= 22 || scenarios.has('beach')) {
    topSeeds.push({
      seedRef: { pack: 'A', key: 'top_sun_shirt' },
      subCategoryKey: 'sub_weather_shells',
      tag: '天气',
      quantity: 1,
      unitWeightGrams: 185,
      carryOnOnly: true,
      smartBagId: 'cube_m',
    });
  }

  if (gender === 'female') {
    topSeeds.push({
      seedRef: { pack: 'A', key: maxTempC >= 18 ? 'top_dress_warm' : 'top_dress_cool' },
      subCategoryKey: 'sub_smart_outfits',
      tag: '核心',
      quantity: density === 'fully_loaded' ? 2 : 1,
      unitWeightGrams: 260,
      carryOnOnly: false,
      smartBagId: 'cube_l',
      minDensity: 'moderate',
    });
  }

  if (purpose === 'business' || purpose === 'both') {
    topSeeds.push({
      seedRef: { pack: 'A', key: 'top_business_suit' },
      subCategoryKey: 'sub_smart_outfits',
      tag: '核心',
      quantity: purpose === 'business' ? 2 : 1,
      unitWeightGrams: 520,
      carryOnOnly: false,
      smartBagId: 'cube_l',
    });
  }

  groups.push(
    materializeGroup(
      'tops_layers',
      'tops_layers',
      'teal',
      topSeeds,
      dynCopy.topsCubeLabel(size, cycleDays)
    )
  );

  // 3. Bottoms, Undergarments & Sleepwear
  const bottomSeeds: DraftSeedItem[] = [
    {
      seedRef: { pack: 'A', key: 'bot_trousers' },
      subCategoryKey: 'sub_outer_bottoms',
      tag: '核心',
      quantity: bottomsQty,
      unitWeightGrams: 430,
      carryOnOnly: false,
      smartBagId: 'cube_l',
    },
    {
      seedRef: { pack: 'A', key: 'bot_underwear' },
      subCategoryKey: 'sub_daily_underwear',
      tag: '必需',
      quantity: underwearQty,
      unitWeightGrams: 45,
      carryOnOnly: false,
      smartBagId: 'cube_s',
    },
    {
      seedRef: { pack: 'A', key: 'bot_socks' },
      subCategoryKey: 'sub_daily_underwear',
      tag: '必需',
      quantity: underwearQty,
      unitWeightGrams: 55,
      carryOnOnly: false,
      smartBagId: 'cube_s',
    },
    {
      seedRef: { pack: 'A', key: 'bot_sleepwear' },
      subCategoryKey: 'sub_sleepwear',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 260,
      carryOnOnly: false,
      smartBagId: 'cube_m',
      minDensity: 'moderate',
    },
  ];

  if (gender === 'female') {
    bottomSeeds.push({
      seedRef: { pack: 'A', key: 'bot_bra' },
      subCategoryKey: 'sub_daily_underwear',
      tag: '必需',
      quantity: Math.max(2, Math.min(4, Math.ceil(cycleDays / 2))),
      unitWeightGrams: 75,
      carryOnOnly: false,
      smartBagId: 'cube_s',
    });
  }

  if (maxTempC >= 22 || scenarios.has('beach')) {
    bottomSeeds.push({
      seedRef: { pack: 'A', key: 'bot_shorts' },
      subCategoryKey: 'sub_outer_bottoms',
      tag: '天气',
      quantity: 2,
      unitWeightGrams: 220,
      carryOnOnly: false,
      smartBagId: 'cube_m',
    });
  }

  groups.push(materializeGroup('bottoms_underwear', 'bottoms_underwear', 'mint', bottomSeeds));

  // 4. Footwear & Daily Accessories
  const footwearSeeds: DraftSeedItem[] = [
    {
      seedRef: { pack: 'A', key: 'fw_sneakers' },
      subCategoryKey: 'sub_footwear_main',
      tag: '必需',
      quantity: 1,
      unitWeightGrams: 680,
      carryOnOnly: true,
      morningOfDeparture: true,
      smartBagId: 'shoe_bag',
    },
    {
      seedRef: { pack: 'A', key: 'fw_slippers' },
      subCategoryKey: 'sub_footwear_main',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 160,
      carryOnOnly: false,
      smartBagId: 'shoe_bag',
      minDensity: 'moderate',
    },
    {
      seedRef: { pack: 'A', key: anyRainy ? 'fw_umbrella_rain' : 'fw_umbrella_clear' },
      subCategoryKey: 'sub_weather_acc',
      tag: '天气',
      quantity: 1,
      unitWeightGrams: 235,
      carryOnOnly: true,
      smartBagId: 'edc_bag',
    },
    {
      seedRef: { pack: 'A', key: 'fw_sunglasses' },
      subCategoryKey: 'sub_weather_acc',
      tag: '天气',
      quantity: 1,
      unitWeightGrams: 55,
      carryOnOnly: true,
      smartBagId: 'edc_bag',
      minDensity: 'moderate',
    },
    {
      seedRef: { pack: 'A', key: minTempC <= 9 ? 'fw_beanie_gloves' : 'fw_suncap' },
      subCategoryKey: 'sub_weather_acc',
      tag: minTempC <= 9 ? '保暖' : '天气',
      quantity: 1,
      unitWeightGrams: minTempC <= 9 ? 135 : 85,
      carryOnOnly: false,
      smartBagId: 'cube_s',
      minDensity: 'moderate',
    },
    {
      seedRef: { pack: 'A', key: 'fw_backup_shoes' },
      subCategoryKey: 'sub_footwear_main',
      tag: '备用',
      quantity: 1,
      unitWeightGrams: 490,
      carryOnOnly: false,
      smartBagId: 'shoe_bag',
      minDensity: 'fully_loaded',
    },
  ];

  groups.push(materializeGroup('footwear_accessories', 'footwear_accessories', 'peach', footwearSeeds));

  // 5. Toiletries & Skincare
  const toiletrySeeds: DraftSeedItem[] = [
    {
      seedRef: { pack: 'A', key: 'toi_toothbrush' },
      subCategoryKey: 'sub_oral_bath',
      tag: '必需',
      quantity: 1,
      unitWeightGrams: 95,
      carryOnOnly: true,
      morningOfDeparture: true,
      smartBagId: 'toiletry_bag',
    },
    {
      seedRef: { pack: 'A', key: isCabinOnly ? 'toi_wash_cabin' : 'toi_wash_checked' },
      subCategoryKey: 'sub_oral_bath',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: isCabinOnly ? 180 : 280,
      carryOnOnly: isCabinOnly,
      smartBagId: 'toiletry_bag',
    },
    {
      seedRef: { pack: 'A', key: scenarios.has('sensitive_skin') ? 'toi_skin_sensitive' : 'toi_skin_default' },
      subCategoryKey: 'sub_skincare_sun',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 210,
      carryOnOnly: isCabinOnly,
      smartBagId: 'toiletry_bag',
    },
    {
      seedRef: { pack: 'A', key: 'toi_lip_wipes' },
      subCategoryKey: 'sub_skincare_sun',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 95,
      carryOnOnly: true,
      smartBagId: 'edc_bag',
      minDensity: 'moderate',
    },
  ];

  if (scenarios.has('sensitive_skin')) {
    toiletrySeeds.push({
      seedRef: { pack: 'A', key: 'toi_masks_mist' },
      subCategoryKey: 'sub_skincare_sun',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 145,
      carryOnOnly: true,
      smartBagId: 'toiletry_bag',
    });
  }

  if (gender === 'female') {
    toiletrySeeds.push(
      {
        seedRef: { pack: 'A', key: 'toi_makeup' },
        subCategoryKey: 'sub_grooming',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 240,
        carryOnOnly: isCabinOnly,
        smartBagId: 'toiletry_bag',
        minDensity: 'moderate',
      },
      {
        seedRef: { pack: 'A', key: 'toi_feminine' },
        subCategoryKey: 'sub_grooming',
        tag: '备用',
        quantity: 1,
        unitWeightGrams: 65,
        carryOnOnly: true,
        smartBagId: 'toiletry_bag',
        minDensity: 'moderate',
      }
    );
  } else if (gender === 'male') {
    toiletrySeeds.push({
      seedRef: { pack: 'A', key: 'toi_shaver' },
      subCategoryKey: 'sub_grooming',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 155,
      carryOnOnly: true,
      morningOfDeparture: true,
      smartBagId: 'toiletry_bag',
      minDensity: 'moderate',
    });
  }

  if (setup.laundry) {
    toiletrySeeds.push({
      seedRef: { pack: 'A', key: 'toi_laundry' },
      subCategoryKey: 'sub_laundry',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 75,
      carryOnOnly: true,
      smartBagId: 'toiletry_bag',
      ownership: 'shared',
    });
  }

  groups.push(
    materializeGroup(
      'toiletries',
      scenarios.has('sensitive_skin') ? 'toiletries_sensitive' : 'toiletries',
      'lemon',
      toiletrySeeds
    )
  );

  // 6. Electronics & Charging
  const plugHint = intel?.plugType || (isJapan ? dynCopy.japanPlugLabel : dynCopy.universalPlugLabel);
  groups.push(
    materializeGroup('electronics', 'electronics', 'lavender', [
      {
        seedRef: { pack: 'A', key: 'elec_powerbank' },
        subCategoryKey: 'sub_power_adapters',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 215,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
      },
      {
        seedRef: { pack: 'A', key: isMultiTraveler ? 'elec_adapter_multi' : 'elec_adapter_single' },
        subCategoryKey: 'sub_power_adapters',
        nameOverride: dynCopy.adapterItemName(plugHint),
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 145,
        carryOnOnly: true,
        morningOfDeparture: true,
        smartBagId: 'edc_bag',
        ownership: 'shared',
      },
      {
        seedRef: { pack: 'A', key: 'elec_cables' },
        subCategoryKey: 'sub_power_adapters',
        tag: '必需',
        quantity: 2,
        unitWeightGrams: 40,
        carryOnOnly: true,
        morningOfDeparture: true,
        smartBagId: 'edc_bag',
      },
      {
        seedRef: { pack: 'A', key: 'elec_earbuds' },
        subCategoryKey: 'sub_audio_trackers',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 65,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
      },
      {
        seedRef: { pack: 'A', key: 'elec_tracker' },
        subCategoryKey: 'sub_audio_trackers',
        tag: '备用',
        quantity: 1,
        unitWeightGrams: 20,
        carryOnOnly: false,
        smartBagId: 'cube_s',
        minDensity: 'moderate',
      },
    ])
  );

  // 7. First Aid & Medications
  const medSeeds: DraftSeedItem[] = [
    {
      seedRef: { pack: 'B', key: 'med_fever' },
      subCategoryKey: 'sub_oral_meds',
      tag: '必需',
      quantity: 1,
      unitWeightGrams: 65,
      carryOnOnly: true,
      smartBagId: 'pill_box',
      ownership: 'shared',
    },
    {
      seedRef: { pack: 'B', key: 'med_stomach' },
      subCategoryKey: 'sub_oral_meds',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 55,
      carryOnOnly: true,
      smartBagId: 'pill_box',
      ownership: 'shared',
    },
    {
      seedRef: { pack: 'B', key: 'med_allergy' },
      subCategoryKey: 'sub_oral_meds',
      tag: '备用',
      quantity: 1,
      unitWeightGrams: 30,
      carryOnOnly: true,
      smartBagId: 'pill_box',
      ownership: 'shared',
      minDensity: 'moderate',
    },
    {
      seedRef: { pack: 'B', key: 'med_blister' },
      subCategoryKey: 'sub_blister_wound',
      tag: '核心',
      quantity: 1,
      unitWeightGrams: 40,
      carryOnOnly: true,
      smartBagId: 'pill_box',
      ownership: 'shared',
    },
  ];

  if (scenarios.has('medication')) {
    medSeeds.push(
      {
        seedRef: { pack: 'B', key: 'med_rx_pills' },
        subCategoryKey: 'sub_prescriptions',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 95,
        carryOnOnly: true,
        morningOfDeparture: true,
        smartBagId: 'pill_box',
      },
      {
        seedRef: { pack: 'B', key: 'med_rx_note' },
        subCategoryKey: 'sub_prescriptions',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 0,
        carryOnOnly: true,
        smartBagId: 'doc_pouch',
      }
    );
  }

  groups.push(
    materializeGroup(
      'first_aid',
      scenarios.has('medication') ? 'first_aid_medication' : 'first_aid',
      'rose',
      medSeeds
    )
  );

  // 8. Beach & Swimming
  if (scenarios.has('beach') || scenarios.has('swimming')) {
    const waterSeeds: DraftSeedItem[] = [
      {
        seedRef: { pack: 'B', key: 'water_swimwear' },
        subCategoryKey: 'sub_swimwear_shoes',
        tag: '必需',
        quantity: scenarios.has('beach') && scenarios.has('swimming') ? 2 : 1,
        unitWeightGrams: 185,
        carryOnOnly: false,
        smartBagId: 'cube_s',
      },
      {
        seedRef: { pack: 'B', key: 'water_drybag' },
        subCategoryKey: 'sub_dry_bags_towels',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 220,
        carryOnOnly: false,
        smartBagId: 'cube_m',
      },
      {
        seedRef: { pack: 'B', key: 'water_phone_pouch' },
        subCategoryKey: 'sub_dry_bags_towels',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 55,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
      },
    ];
    if (scenarios.has('beach')) {
      waterSeeds.push(
        {
          seedRef: { pack: 'B', key: 'water_sunscreen' },
          subCategoryKey: 'sub_beach_sunscreen',
          tag: '天气',
          quantity: 1,
          unitWeightGrams: isCabinOnly ? 160 : 260,
          carryOnOnly: isCabinOnly,
          smartBagId: 'toiletry_bag',
          ownership: 'shared',
        },
        {
          seedRef: { pack: 'B', key: 'water_reef_shoes' },
          subCategoryKey: 'sub_swimwear_shoes',
          tag: '备用',
          quantity: 1,
          unitWeightGrams: 240,
          carryOnOnly: false,
          smartBagId: 'shoe_bag',
          minDensity: 'moderate',
        }
      );
    }
    if (scenarios.has('swimming') && !scenarios.has('beach')) {
      waterSeeds.push({
        seedRef: { pack: 'B', key: 'water_goggles' },
        subCategoryKey: 'sub_swimwear_shoes',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 115,
        carryOnOnly: false,
        smartBagId: 'cube_s',
      });
    }

    groups.push(materializeGroup('beach_water', 'beach_water', 'teal', waterSeeds));
  }

  // 9. Onsen / Hot Spring / SPA
  if (scenarios.has('onsen')) {
    groups.push(
      materializeGroup('onsen_spa', 'onsen_spa', 'peach', [
        {
          seedRef: { pack: 'B', key: 'onsen_caddy' },
          subCategoryKey: 'sub_onsen_etiquette',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 85,
          carryOnOnly: false,
          smartBagId: 'toiletry_bag',
        },
        {
          seedRef: { pack: 'B', key: 'onsen_cover' },
          subCategoryKey: 'sub_onsen_post',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 135,
          carryOnOnly: isCabinOnly,
          smartBagId: 'toiletry_bag',
        },
      ])
    );
  }

  // 10. Ski & Snow
  if (scenarios.has('ski_snow')) {
    groups.push(
      materializeGroup('ski_snow', 'ski_snow', 'lavender', [
        {
          seedRef: { pack: 'B', key: 'ski_gloves_socks' },
          subCategoryKey: 'sub_slope_thermal',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 360,
          carryOnOnly: false,
          smartBagId: 'cube_l',
        },
        {
          seedRef: { pack: 'B', key: 'ski_goggles_cleats' },
          subCategoryKey: 'sub_snow_optics',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 310,
          carryOnOnly: false,
          smartBagId: 'shoe_bag',
        },
        {
          seedRef: { pack: 'B', key: 'ski_warmers' },
          subCategoryKey: 'sub_subzero_warmers',
          tag: '保暖',
          quantity: 1,
          unitWeightGrams: 280,
          carryOnOnly: false,
          smartBagId: 'cube_s',
          ownership: 'shared',
        },
      ])
    );
  }

  // 11. Hiking & Camping
  if (scenarios.has('hiking') || scenarios.has('camping')) {
    const trailSeeds: DraftSeedItem[] = [
      {
        seedRef: { pack: 'B', key: 'hike_shoes' },
        subCategoryKey: 'sub_trail_footwear',
        tag: '必需',
        quantity: 1,
        unitWeightGrams: 780,
        carryOnOnly: false,
        smartBagId: 'shoe_bag',
      },
      {
        seedRef: { pack: 'B', key: 'hike_daypack' },
        subCategoryKey: 'sub_trail_footwear',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 380,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
      },
      {
        seedRef: { pack: 'B', key: 'hike_safety' },
        subCategoryKey: 'sub_trail_safety',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 165,
        carryOnOnly: isCabinOnly,
        smartBagId: 'cube_s',
        ownership: 'shared',
      },
    ];
    if (scenarios.has('camping')) {
      trailSeeds.push({
        seedRef: { pack: 'B', key: 'hike_camp_light' },
        subCategoryKey: 'sub_camp_lighting',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 230,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
        ownership: 'shared',
      });
    }

    groups.push(materializeGroup('hiking_camping', 'hiking_camping', 'mint', trailSeeds));
  }

  // 12. Theme Park All-Day Kit
  if (scenarios.has('theme_park')) {
    groups.push(
      materializeGroup('theme_park', 'theme_park', 'lemon', [
        {
          seedRef: { pack: 'B', key: 'park_ponchos' },
          subCategoryKey: 'sub_park_rides',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 140,
          carryOnOnly: false,
          smartBagId: 'edc_bag',
          ownership: 'shared',
        },
        {
          seedRef: { pack: 'B', key: 'park_cushion' },
          subCategoryKey: 'sub_park_recovery',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 130,
          carryOnOnly: false,
          smartBagId: 'cube_s',
        },
      ])
    );
  }

  // 13. Fitness & Running
  if (scenarios.has('fitness')) {
    groups.push(
      materializeGroup('fitness_sport', 'fitness_sport', 'teal', [
        {
          seedRef: { pack: 'B', key: 'fit_apparel' },
          subCategoryKey: 'sub_workout_apparel',
          tag: '核心',
          quantity: density === 'fully_loaded' ? 2 : 1,
          unitWeightGrams: 260,
          carryOnOnly: false,
          smartBagId: 'cube_s',
        },
        {
          seedRef: { pack: 'B', key: 'fit_bands' },
          subCategoryKey: 'sub_fitness_acc',
          tag: '备用',
          quantity: 1,
          unitWeightGrams: 85,
          carryOnOnly: false,
          smartBagId: 'cube_s',
          minDensity: 'moderate',
        },
      ])
    );
  }

  // 14. Baby & Kids
  if (scenarios.has('baby') || scenarios.has('kids')) {
    const isBaby = scenarios.has('baby');
    groups.push(
      materializeGroup('baby_kids', 'baby_kids', 'peach', [
        ...(isBaby
          ? ([
              {
                seedRef: { pack: 'B', key: 'baby_diapers' },
                subCategoryKey: 'sub_baby_feeding',
                tag: '必需',
                quantity: 1,
                unitWeightGrams: 420,
                carryOnOnly: true,
                smartBagId: 'edc_bag',
                ownership: 'shared',
              },
              {
                seedRef: { pack: 'B', key: 'baby_warmer' },
                subCategoryKey: 'sub_baby_feeding',
                tag: '必需',
                quantity: 1,
                unitWeightGrams: 360,
                carryOnOnly: true,
                smartBagId: 'edc_bag',
                ownership: 'shared',
              },
              {
                seedRef: { pack: 'B', key: 'baby_stroller' },
                subCategoryKey: 'sub_stroller_comfort',
                tag: '核心',
                quantity: 1,
                unitWeightGrams: 680,
                carryOnOnly: true,
                smartBagId: 'cube_xl',
                ownership: 'shared',
              },
            ] as DraftSeedItem[])
          : []),
        {
          seedRef: { pack: 'B', key: 'kids_wipes_safety' },
          subCategoryKey: 'sub_stroller_comfort',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 290,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
          ownership: 'shared',
        },
        {
          seedRef: { pack: 'B', key: 'kids_meds' },
          subCategoryKey: 'sub_pediatric_meds',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 140,
          carryOnOnly: true,
          smartBagId: 'pill_box',
          ownership: 'shared',
        },
      ])
    );
  }

  // 15. Remote Work
  if (scenarios.has('remote_work') || purpose === 'business' || purpose === 'both') {
    groups.push(
      materializeGroup('remote_work', 'remote_work', 'lavender', [
        {
          seedRef: { pack: 'B', key: 'work_laptop' },
          subCategoryKey: 'sub_laptop_gan',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 1280,
          carryOnOnly: true,
          morningOfDeparture: true,
          smartBagId: 'edc_bag',
        },
        {
          seedRef: { pack: 'B', key: 'work_gan' },
          subCategoryKey: 'sub_laptop_gan',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 145,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
        },
        {
          seedRef: { pack: 'B', key: 'work_mouse_hub' },
          subCategoryKey: 'sub_peripherals',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 115,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
          minDensity: 'moderate',
        },
        {
          seedRef: { pack: 'B', key: 'work_stand' },
          subCategoryKey: 'sub_peripherals',
          tag: '备用',
          quantity: 1,
          unitWeightGrams: 185,
          carryOnOnly: false,
          smartBagId: 'cube_s',
          minDensity: 'fully_loaded',
        },
      ])
    );
  }

  // 16. Photography & Drone
  if (scenarios.has('photography')) {
    groups.push(
      materializeGroup('photography', 'photography', 'teal', [
        {
          seedRef: { pack: 'B', key: 'photo_camera' },
          subCategoryKey: 'sub_camera_body',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 760,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
        },
        {
          seedRef: { pack: 'B', key: 'photo_batteries' },
          subCategoryKey: 'sub_batteries_sd',
          tag: '必需',
          quantity: 2,
          unitWeightGrams: 85,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
        },
        {
          seedRef: { pack: 'B', key: 'photo_sd' },
          subCategoryKey: 'sub_batteries_sd',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 35,
          carryOnOnly: true,
          smartBagId: 'edc_bag',
        },
        {
          seedRef: { pack: 'B', key: 'photo_tripod' },
          subCategoryKey: 'sub_optics_support',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: isCabinOnly ? 360 : 680,
          carryOnOnly: isCabinOnly,
          smartBagId: isCabinOnly ? 'edc_bag' : 'cube_l',
          ownership: 'shared',
          minDensity: 'moderate',
        },
      ])
    );
  }

  // 17. Formal Event / Fine Dining
  if (scenarios.has('formal_event')) {
    groups.push(
      materializeGroup('formal_event', 'formal_event', 'rose', [
        {
          seedRef: { pack: 'B', key: gender === 'female' ? 'formal_women' : 'formal_men' },
          subCategoryKey: 'sub_formal_attire',
          whyOverride: customNote ? dynCopy.formalCustomWhy(customNote.slice(0, 22)) : undefined,
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 640,
          carryOnOnly: true,
          smartBagId: 'cube_l',
        },
        {
          seedRef: { pack: 'B', key: 'formal_spray' },
          subCategoryKey: 'sub_garment_care',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 120,
          carryOnOnly: isCabinOnly,
          smartBagId: 'toiletry_bag',
          ownership: 'shared',
        },
      ])
    );
  }

  // 18. Tax-Free Shopping & Extra Bag Kit
  if (scenarios.has('shopping_taxfree')) {
    groups.push(
      materializeGroup('shopping_taxfree', 'shopping_taxfree', 'lavender', [
        {
          seedRef: { pack: 'B', key: 'shop_duffle' },
          subCategoryKey: 'sub_return_expansion',
          tag: '必需',
          quantity: 1,
          unitWeightGrams: 220,
          carryOnOnly: false,
          smartBagId: 'cube_s',
          ownership: 'shared',
        },
        {
          seedRef: { pack: 'B', key: 'shop_bubble' },
          subCategoryKey: 'sub_return_expansion',
          tag: '核心',
          quantity: 1,
          unitWeightGrams: 65,
          carryOnOnly: false,
          smartBagId: 'cube_s',
          ownership: 'shared',
        },
      ])
    );
  }

  // 19. Daypack & Travel Extras
  groups.push(
    materializeGroup('extras', 'extras', 'lemon', [
      {
        seedRef: { pack: 'B', key: 'extra_tether' },
        subCategoryKey: 'sub_anti_theft',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 75,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
      },
      {
        seedRef: { pack: 'B', key: 'extra_scale' },
        subCategoryKey: 'sub_weighing_sleep',
        tag: '核心',
        quantity: 1,
        unitWeightGrams: 85,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
        ownership: 'shared',
        minDensity: 'moderate',
      },
      {
        seedRef: { pack: 'B', key: 'extra_sleepkit' },
        subCategoryKey: 'sub_weighing_sleep',
        tag: '备用',
        quantity: 1,
        unitWeightGrams: 125,
        carryOnOnly: true,
        smartBagId: 'edc_bag',
        minDensity: 'fully_loaded',
      },
    ])
  );

  const validGroups = groups.filter((g): g is PackingGroup => Boolean(g && g.items.length > 0));
  const filtered = filterGroupsAgainstNeverSuggest(validGroups, neverSuggestItems);
  return mergeAlwaysPackIntoGroups(filtered, alwaysPackLibrary, ownerId).groups;
}

function normalizeMatchKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（()）\[\]·•×\d]/g, '');
}

export function mergeRegeneratedPackingGroups(
  existingGroups: PackingGroup[],
  incomingGroups: PackingGroup[],
  mode: 'smart_merge' | 'replace_all'
): { groups: PackingGroup[]; preservedDoneCount: number; keptCustomCount: number } {
  if (mode === 'replace_all' || existingGroups.length === 0) {
    return { groups: incomingGroups, preservedDoneCount: 0, keptCustomCount: 0 };
  }

  const existingByKey = new Map<string, { item: PackingItem; groupId: string; groupTitle: string }>();
  existingGroups.forEach((g) => {
    g.items.forEach((it) => {
      existingByKey.set(normalizeMatchKey(it.name), {
        item: it,
        groupId: g.id,
        groupTitle: g.title,
      });
    });
  });

  let preservedDoneCount = 0;
  const matchedKeys = new Set<string>();

  const mergedGroups = incomingGroups.map((g) => ({
    ...g,
    items: g.items.map((it) => {
      const key = normalizeMatchKey(it.name);
      const hit = existingByKey.get(key);
      if (hit) {
        matchedKeys.add(key);
        if (hit.item.done) preservedDoneCount += 1;
        return {
          ...it,
          done: hit.item.done,
          packedByMemberId: hit.item.packedByMemberId,
          toBuy: hit.item.toBuy ?? it.toBuy,
          alwaysPack: hit.item.alwaysPack ?? it.alwaysPack,
        };
      }
      return it;
    }),
  }));

  // Preserve already-packed items from previous list so user never loses checked-off progress
  let keptCustomCount = 0;
  existingGroups.forEach((oldG) => {
    oldG.items.forEach((oldIt) => {
      const key = normalizeMatchKey(oldIt.name);
      if (matchedKeys.has(key)) return;
      if (!oldIt.done && !oldIt.toBuy && !oldIt.alwaysPack) return;

      const targetIdx = mergedGroups.findIndex(
        (ng) => ng.id === oldG.id || ng.title === oldG.title
      );
      if (targetIdx >= 0) {
        mergedGroups[targetIdx] = {
          ...mergedGroups[targetIdx],
          items: [oldIt, ...mergedGroups[targetIdx].items],
        };
      } else if (mergedGroups.length > 0) {
        mergedGroups[mergedGroups.length - 1] = {
          ...mergedGroups[mergedGroups.length - 1],
          items: [...mergedGroups[mergedGroups.length - 1].items, oldIt],
        };
      }
      if (oldIt.done) preservedDoneCount += 1;
      keptCustomCount += 1;
      matchedKeys.add(key);
    });
  });

  return { groups: mergedGroups, preservedDoneCount, keptCustomCount };
}

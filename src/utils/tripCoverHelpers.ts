import coverAlpinePeaks from '../assets/images/cover_alpine_peaks_1794973483787.jpg';
import coverCanalAutumn from '../assets/images/cover_canal_autumn_1794973439350.jpg';
import coverEuropeClassic from '../assets/images/cover_europe_classic_1794973437090.jpg';
import coverJapanFuji from '../assets/images/cover_japan_fuji_1794973441072.jpg';
import coverModernMetropolis from '../assets/images/cover_modern_metropolis_1794973484056.jpg';
import coverTropicalCoast from '../assets/images/cover_tropical_coast_1794973443012.jpg';
import { translateCityName, translateRouteTitle } from '../i18n';
import { getTripCoverCopy } from '../i18n/packs/utilsAndModalsPack';
import type {
  AppLanguage,
  CoverPresetId,
  CoverToneId,
  TripCoverConfig,
  TripSetup,
  TripState,
} from '../types';

export interface CoverPresetMeta {
  id: CoverPresetId;
  imageUrl: string;
  labelZh: string;
  labelEn: string;
  subtitleZh: string;
  subtitleEn: string;
  defaultFocusY: number;
}

export const COVER_PRESETS: CoverPresetMeta[] = [
  {
    id: 'europe_classic',
    imageUrl: coverEuropeClassic,
    labelZh: '塞纳暮色',
    labelEn: 'Seine Twilight',
    subtitleZh: '巴黎 · 欧洲古典天际线',
    subtitleEn: 'Paris & European Rooftops',
    defaultFocusY: 48,
  },
  {
    id: 'canal_autumn',
    imageUrl: coverCanalAutumn,
    labelZh: '运河金秋',
    labelEn: 'Autumn Canal',
    subtitleZh: '阿姆斯特丹 · 欧陆水岸',
    subtitleEn: 'Amsterdam & Historic Canals',
    defaultFocusY: 52,
  },
  {
    id: 'japan_fuji',
    imageUrl: coverJapanFuji,
    labelZh: '富士晨樱',
    labelEn: 'Fuji Dawn',
    subtitleZh: '东京 · 京都 · 日韩山湖',
    subtitleEn: 'Japan & East Asia Scenery',
    defaultFocusY: 46,
  },
  {
    id: 'tropical_coast',
    imageUrl: coverTropicalCoast,
    labelZh: '蔚蓝海岸',
    labelEn: 'Azure Coast',
    subtitleZh: '海岛 · 地中海 · 阳光沙滩',
    subtitleEn: 'Islands & Coastal Sunset',
    defaultFocusY: 54,
  },
  {
    id: 'alpine_peaks',
    imageUrl: coverAlpinePeaks,
    labelZh: '雪山冰湖',
    labelEn: 'Alpine Lake',
    subtitleZh: '瑞士 · 户外徒步 · 自然秘境',
    subtitleEn: 'Alps, Fjords & Nature',
    defaultFocusY: 45,
  },
  {
    id: 'modern_metropolis',
    imageUrl: coverModernMetropolis,
    labelZh: '港湾蓝调',
    labelEn: 'Harbor Dusk',
    subtitleZh: '现代都市 · 商务与夜景',
    subtitleEn: 'Cosmopolitan Skyline',
    defaultFocusY: 50,
  },
];

export interface CoverToneMeta {
  id: CoverToneId;
  labelZh: string;
  labelEn: string;
  filterCss: string;
  scrimExtraClass: string;
}

export const COVER_TONES: CoverToneMeta[] = [
  {
    id: 'natural',
    labelZh: '原片自然',
    labelEn: 'Natural',
    filterCss: 'none',
    scrimExtraClass: '',
  },
  {
    id: 'golden',
    labelZh: '暖金黄昏',
    labelEn: 'Golden Hour',
    filterCss: 'saturate(1.12) contrast(1.03) sepia(0.12)',
    scrimExtraClass: 'bg-amber-950/10',
  },
  {
    id: 'forest',
    labelZh: '胶片森系',
    labelEn: 'Film Sage',
    filterCss: 'saturate(0.92) contrast(1.06) brightness(0.97)',
    scrimExtraClass: 'bg-emerald-950/12',
  },
  {
    id: 'azure',
    labelZh: '清透蔚蓝',
    labelEn: 'Crisp Azure',
    filterCss: 'saturate(1.1) contrast(1.05) hue-rotate(-4deg)',
    scrimExtraClass: 'bg-sky-950/10',
  },
  {
    id: 'noir',
    labelZh: '电影暗调',
    labelEn: 'Cinema Dark',
    filterCss: 'saturate(0.88) contrast(1.12) brightness(0.86)',
    scrimExtraClass: 'bg-black/22',
  },
];

const PRESET_MAP: Record<CoverPresetId, CoverPresetMeta> = Object.fromEntries(
  COVER_PRESETS.map((p) => [p.id, p])
) as Record<CoverPresetId, CoverPresetMeta>;

const TONE_MAP: Record<CoverToneId, CoverToneMeta> = Object.fromEntries(
  COVER_TONES.map((t) => [t.id, t])
) as Record<CoverToneId, CoverToneMeta>;

/**
 * Automatically selects the best scenic preset based on the trip's destination cities and style.
 */
export function resolveAutoCoverPresetId(
  cities: string[],
  tripStyle?: string,
  tripStyles?: string[]
): CoverPresetId {
  const joined = (cities || []).join(' ').toLowerCase();

  if (
    /阿姆斯特丹|amsterdam|鹿特丹|rotterdam|布鲁日|bruges|威尼斯|venice|哥本哈根|copenhagen/.test(
      joined
    ) &&
    !/巴黎|paris/.test(joined)
  ) {
    return 'canal_autumn';
  }
  if (
    /巴黎|paris|罗马|rome|佛罗伦萨|米兰|milan|维也纳|vienna|布拉格|prague|布达佩斯|柏林|berlin|马德里|巴塞罗那|barcelona|欧洲|法国|意大利/.test(
      joined
    )
  ) {
    return 'europe_classic';
  }
  if (
    /东京|tokyo|京都|kyoto|大阪|osaka|北海道|札幌|冲绳|福冈|名古屋|富士山|日本|japan|首尔|seoul|釜山|济州/.test(
      joined
    )
  ) {
    return 'japan_fuji';
  }
  if (
    /普吉|phuket|巴厘|bali|马尔代夫|夏威夷|hawaii|三亚|清迈|曼谷|bangkok|泰国|尼斯|nice|里斯本|lisbon|圣托里尼|冲绳|海岛|黄金海岸/.test(
      joined
    )
  ) {
    return 'tropical_coast';
  }
  if (
    /瑞士|苏黎世|zurich|日内瓦|因特拉肯|采尔马特|冰岛|iceland|挪威|皇后镇|新西兰|班夫|banff|川西|新疆|西藏|丽江|大理|阿尔卑斯/.test(
      joined
    )
  ) {
    return 'alpine_peaks';
  }
  if (
    /纽约|new york|伦敦|london|新加坡|singapore|香港|hong kong|迪拜|dubai|上海|深圳|悉尼|sydney|墨尔本|多伦多|旧金山/.test(
      joined
    )
  ) {
    return 'modern_metropolis';
  }

  // Optional multi-select fallback (cities still win above); legacy single tripStyle unchanged.
  if (Array.isArray(tripStyles) && tripStyles.length > 0) {
    if (tripStyles.includes('商务出差')) return 'modern_metropolis';
    if (tripStyles.includes('浪漫蜜月')) return 'tropical_coast';
  } else {
    if (tripStyle === '商务出差') return 'modern_metropolis';
    if (tripStyle === '浪漫蜜月') return 'tropical_coast';
  }
  return 'europe_classic';
}

export function resolveActiveCoverVisual(
  trip: Pick<TripState, 'setup' | 'coverConfig'>,
  customCoverDataUrl: string | null
): {
  imageUrl: string;
  focusY: number;
  tone: CoverToneMeta;
  activePresetId: CoverPresetId;
  isCustom: boolean;
} {
  const cfg: TripCoverConfig | undefined = trip.coverConfig;
  const autoPresetId = resolveAutoCoverPresetId(
    trip.setup?.cities ?? [],
    trip.setup?.tripStyle,
    trip.setup?.tripStyles
  );
  const presetId: CoverPresetId =
    cfg?.mode === 'preset' && cfg.presetId && PRESET_MAP[cfg.presetId]
      ? cfg.presetId
      : autoPresetId;
  const presetMeta = PRESET_MAP[presetId] || COVER_PRESETS[0];
  const isCustom = cfg?.mode === 'custom' && Boolean(customCoverDataUrl);
  const imageUrl = isCustom && customCoverDataUrl ? customCoverDataUrl : presetMeta.imageUrl;
  const focusY =
    typeof cfg?.focusY === 'number' && Number.isFinite(cfg.focusY)
      ? Math.max(0, Math.min(100, Math.round(cfg.focusY)))
      : presetMeta.defaultFocusY;
  const tone = (cfg?.tone && TONE_MAP[cfg.tone]) || COVER_TONES[0];

  return {
    imageUrl,
    focusY,
    tone,
    activePresetId: presetId,
    isCustom,
  };
}

/**
 * Formats ONLY pure destination city names (e.g., "巴黎 → 阿姆斯特丹" or "Paris → Amsterdam"),
 * stripping any AI marketing suffixes like "6日秋日艺文轻奢之旅".
 */
export function formatDestinationOnlyTitle(
  trip: Pick<TripState, 'setup' | 'intel'>,
  lang: AppLanguage
): string {
  const rawCities = (trip.setup?.cities ?? [])
    .map((c) => c.trim())
    .filter(Boolean);

  // Deduplicate consecutive identical cities while keeping multi-leg route order
  const dedupedCities: string[] = [];
  for (const city of rawCities) {
    if (dedupedCities[dedupedCities.length - 1] !== city) {
      dedupedCities.push(city);
    }
  }

  if (dedupedCities.length > 0) {
    return dedupedCities.map((c) => translateCityName(c, lang)).join(' → ');
  }

  // Fallback: sanitize intel.routeTitle if cities array was empty
  const rawRoute = (trip.intel?.routeTitle ?? '').trim();
  if (!rawRoute) {
    return getTripCoverCopy(lang).unnamedDestination;
  }
  const stripped = rawRoute
    .replace(/\s*\d+\s*[日天晚].*$/u, '')
    .replace(/\s*(?:秋日|春日|夏日|冬日|艺文|轻奢|深度|慢游|自由行|之旅|行程|攻略).*$/u, '')
    .replace(/-/g, ' → ')
    .trim();

  return translateRouteTitle(stripped || rawRoute, lang);
}

/**
 * Formats a concise date range ("11.14 - 11.19") when valid ISO dates exist on TripSetup.
 */
export function formatCompactTripDateRange(
  setup: Pick<TripSetup, 'departureDate' | 'returnDate'>,
  lang: AppLanguage
): string | null {
  const parseIso = (iso?: string) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
    const [y, m, d] = iso.trim().split('-').map(Number);
    if (!y || !m || !d) return null;
    return { y, m, d };
  };

  const dep = parseIso(setup.departureDate);
  if (!dep) return null;
  const ret = parseIso(setup.returnDate);

  if (lang === 'zh-CN') {
    const startStr = `${dep.m}.${String(dep.d).padStart(2, '0')}`;
    if (!ret) return startStr;
    const endStr = `${ret.m}.${String(ret.d).padStart(2, '0')}`;
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  }

  const months = getTripCoverCopy(lang).monthsShort;
  const startStr = `${months[dep.m - 1] || dep.m} ${dep.d}`;
  if (!ret) return startStr;
  const endStr =
    ret.m === dep.m ? `${ret.d}` : `${months[ret.m - 1] || ret.m} ${ret.d}`;
  return `${startStr}–${endStr}`;
}

import type { AppLanguage, ExpenseBucket, LocalCardResult, StopType, TimelineNode } from '../types';
import { translateRouteTitle } from '../i18n/demoTranslations';
import { getItineraryUtilsCopy } from '../i18n/packs/itineraryUtilsPack';

export function getStopTypeLabel(stopType?: StopType, lang: AppLanguage = 'en-US'): string {
  if (!stopType) return '';
  const map: Record<AppLanguage, Record<StopType, string>> = {
    'zh-CN': {
      hotel: '酒店住宿',
      transit: '交通接驳',
      dining: '餐饮美食',
      shopping: '购物退税',
      attraction: '景点体验',
    },
    'en-US': {
      hotel: 'Hotel & Stay',
      transit: 'Transit',
      dining: 'Dining',
      shopping: 'Shopping & Tax-Free',
      attraction: 'Sightseeing',
    },
    'en-GB': {
      hotel: 'Accommodation',
      transit: 'Transit & Rail',
      dining: 'Food & Drink',
      shopping: 'Shopping & VAT',
      attraction: 'Attraction',
    },
    'es-MX': {
      hotel: 'Hospedaje',
      transit: 'Transporte',
      dining: 'Comida',
      shopping: 'Compras y Tax-Free',
      attraction: 'Atracción',
    },
    'fr-FR': {
      hotel: 'Hébergement',
      transit: 'Transport',
      dining: 'Restauration',
      shopping: 'Shopping & Détaxe',
      attraction: 'Visite',
    },
    'de-DE': {
      hotel: 'Unterkunft',
      transit: 'Transfer',
      dining: 'Gastronomie',
      shopping: 'Shopping & Tax-Free',
      attraction: 'Sehenswürdigkeit',
    },
    'pt-BR': {
      hotel: 'Hospedagem',
      transit: 'Transporte',
      dining: 'Alimentação',
      shopping: 'Compras e Tax-Free',
      attraction: 'Passeio',
    },
    'ja-JP': {
      hotel: '宿泊',
      transit: '交通・移動',
      dining: 'グルメ・食事',
      shopping: '買物・免税',
      attraction: '観光スポット',
    },
  };
  return (map[lang] || map['en-US'])[stopType] || '';
}

export interface ClosingUrgencyInfo {
  status: 'ok' | 'tight' | 'conflict';
  minutesLeft: number | null;
  label: string;
}

/**
 * Parses "HH:MM" into minutes since 00:00.
 */
export function parseTimeMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 29 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

function estimateMinimumStayMinutes(stopType?: StopType, title = ''): {
  tightThresholdMin: number;
  lastEntryCutoffMin: number;
  isMajorMuseum: boolean;
} {
  const isMajorMuseum =
    /卢浮宫|奥赛|国立博物馆|梵高|大英|美术馆|博物馆|凡尔赛|橘园|louvre|orsay|rijksmuseum|van gogh|british museum|versailles|orangerie|museum|gallery|palace/i.test(
      title
    );
  if (isMajorMuseum) {
    // Major museums stop admitting 30m before close and realistically need >= 105-120m
    return { tightThresholdMin: 110, lastEntryCutoffMin: 30, isMajorMuseum: true };
  }
  if (stopType === 'hotel' || stopType === 'transit') {
    return { tightThresholdMin: 40, lastEntryCutoffMin: 0, isMajorMuseum: false };
  }
  if (stopType === 'attraction' || stopType === 'dining') {
    return { tightThresholdMin: 75, lastEntryCutoffMin: 15, isMajorMuseum: false };
  }
  return { tightThresholdMin: 60, lastEntryCutoffMin: 0, isMajorMuseum: false };
}

/**
 * Evaluates whether a stop's arrival time is dangerously close to or past its closing time,
 * accounting for realistic sightseeing/dining dwell time and museum last-admission cutoffs.
 */
export function getClosingUrgency(
  time: string,
  closeTime: string,
  lang: AppLanguage = 'zh-CN',
  stopType?: StopType,
  title?: string
): ClosingUrgencyInfo {
  const arr = parseTimeMinutes(time);
  let cls = parseTimeMinutes(closeTime);
  if (arr === null || cls === null) {
    return { status: 'ok', minutesLeft: null, label: '' };
  }
  // Handle post-midnight closing hours (e.g., 01:00 bar/bistro when arriving at 21:00)
  if (cls < 6 * 60 && arr >= 12 * 60) {
    cls += 24 * 60;
  }

  const diff = cls - arr;
  const { tightThresholdMin, lastEntryCutoffMin, isMajorMuseum } = estimateMinimumStayMinutes(
    stopType,
    title
  );

  if (diff <= 0) {
    const labels: Record<AppLanguage, string> = {
      'zh-CN': `打烊冲突（关门 ${closeTime}）`,
      'en-US': `Closed on arrival (Closes ${closeTime})`,
      'en-GB': `Closed on arrival (Closes ${closeTime})`,
      'es-MX': `Cerrado al llegar (Cierra ${closeTime})`,
      'fr-FR': `Fermé à l’arrivée (Fermeture ${closeTime})`,
      'de-DE': `Bei Ankunft geschlossen (Schließt ${closeTime})`,
      'pt-BR': `Fechado na chegada (Fecha ${closeTime})`,
      'ja-JP': `到着時は営業時間外（閉店 ${closeTime}）`,
    };
    return {
      status: 'conflict',
      minutesLeft: diff,
      label: labels[lang] || labels['en-US'],
    };
  }
  if (lastEntryCutoffMin > 0 && diff <= lastEntryCutoffMin) {
    const labels: Record<AppLanguage, string> = {
      'zh-CN': `可能停止入场（距闭馆仅 ${diff} 分钟）`,
      'en-US': `Past last entry (${diff}m to ${closeTime} close)`,
      'en-GB': `Past last entry (${diff}m to ${closeTime} close)`,
      'es-MX': `Último acceso superado (${diff} min para cierre ${closeTime})`,
      'fr-FR': `Dernière entrée passée (${diff} min avant ${closeTime})`,
      'de-DE': `Einlass evtl. beendet (${diff} Min. vor ${closeTime})`,
      'pt-BR': `Última entrada próxima (${diff} min para fechar ${closeTime})`,
      'ja-JP': `最終入場締切の恐れ（閉館 ${diff}分前）`,
    };
    return {
      status: 'conflict',
      minutesLeft: diff,
      label: labels[lang] || labels['en-US'],
    };
  }
  if (diff <= tightThresholdMin) {
    const tightMuseum: Record<AppLanguage, string> = {
      'zh-CN': `游览偏紧（距闭馆余 ${diff} 分钟，展馆建议预留 2h）`,
      'en-US': `Tight visit (${diff}m before close · 2h recommended)`,
      'en-GB': `Tight visit (${diff}m before close · 2h recommended)`,
      'es-MX': `Visita justa (${diff} min antes del cierre · se recomiendan 2 h)`,
      'fr-FR': `Visite rapide (${diff} min avant fermeture · 2 h conseillées)`,
      'de-DE': `Knappe Zeit (${diff} Min. bis Schließung · 2 Std. empfohlen)`,
      'pt-BR': `Visita corrida (${diff} min até fechar · 2 h recomendadas)`,
      'ja-JP': `滞在時間短め（閉館まで ${diff}分・2時間推奨）`,
    };
    const tightNormal: Record<AppLanguage, string> = {
      'zh-CN': `临近打烊（仅余 ${diff} 分钟停留）`,
      'en-US': `Closing soon (${diff}m stay window)`,
      'en-GB': `Closing soon (${diff}m stay window)`,
      'es-MX': `Cierra pronto (${diff} min disponibles)`,
      'fr-FR': `Ferme bientôt (${diff} min sur place)`,
      'de-DE': `Schließt bald (${diff} Min. Aufenthalt)`,
      'pt-BR': `Fecha em breve (${diff} min disponíveis)`,
      'ja-JP': `閉店間近（滞在残り ${diff}分）`,
    };
    return {
      status: 'tight',
      minutesLeft: diff,
      label: isMajorMuseum
        ? tightMuseum[lang] || tightMuseum['en-US']
        : tightNormal[lang] || tightNormal['en-US'],
    };
  }
  return { status: 'ok', minutesLeft: diff, label: '' };
}

/**
 * Computes exact date & weekday labels for Day 1..totalDays given YYYY-MM-DD departureDate.
 */
export function buildTripWeekdaySchedule(
  departureDate?: string,
  totalDays = 5,
  lang: AppLanguage = 'en-US'
): Array<{ day: number; dateIso: string; weekdayLabel: string }> {
  const safeDays = Math.max(1, Math.min(60, Math.round(totalDays) || 1));
  if (!departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate.trim())) {
    return [];
  }
  const [y, m, d] = departureDate.trim().split('-').map(Number);
  const weekdayMap: Record<AppLanguage, string[]> = {
    'zh-CN': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    'en-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'en-GB': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'es-MX': ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    'fr-FR': ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    'de-DE': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    'pt-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    'ja-JP': ['日', '月', '火', '水', '木', '金', '土'],
  };
  const weekdays = weekdayMap[lang] || weekdayMap['en-US'];
  const result: Array<{ day: number; dateIso: string; weekdayLabel: string }> = [];

  for (let i = 0; i < safeDays; i += 1) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    if (Number.isNaN(dt.getTime())) break;
    const iso = dt.toISOString().slice(0, 10);
    const wd = dt.getUTCDay();
    result.push({
      day: i + 1,
      dateIso: iso,
      weekdayLabel: weekdays[wd],
    });
  }
  return result;
}

/**
 * Normalizes or generates per-city day counts matching `cities.length`.
 * Ensures every city has >= 1 day (when totalDays >= cities.length) and sum === safeTotal.
 */
export function resolveCityDaysAllocation(
  cities: string[],
  totalDays: number,
  cityDays?: number[]
): number[] {
  const n = cities.length;
  if (n === 0) return [];
  const safeTotal = Math.max(1, Math.round(totalDays) || 1);
  if (n === 1) return [safeTotal];

  if (Array.isArray(cityDays) && cityDays.length === n) {
    const clean = cityDays.map((v) => Math.max(1, Math.round(Number(v) || 1)));
    const sum = clean.reduce((acc, v) => acc + v, 0);
    if (sum === safeTotal) {
      return clean;
    }
    return redistributeCityDaysForTotal(clean, safeTotal);
  }

  // Default even/proportional split matching legacy getCityForDay boundaries
  const counts = new Array<number>(n).fill(0);
  if (safeTotal >= n) {
    for (let d = 1; d <= safeTotal; d += 1) {
      const idx = Math.min(n - 1, Math.floor(((d - 1) * n) / safeTotal));
      counts[idx] += 1;
    }
    return counts.map((c) => Math.max(1, c));
  }
  return new Array<number>(n).fill(1);
}

/**
 * Proportionally scales an existing per-city allocation to match a new totalDays value.
 */
export function redistributeCityDaysForTotal(
  prevAllocation: number[],
  nextTotal: number
): number[] {
  const n = prevAllocation.length;
  if (n === 0) return [];
  const safeTotal = Math.max(1, Math.round(nextTotal) || 1);
  if (n === 1) return [safeTotal];
  if (safeTotal < n) {
    return new Array<number>(n).fill(1);
  }

  const weights = prevAllocation.map((v) => Math.max(1, Math.round(Number(v) || 1)));
  const weightSum = weights.reduce((acc, v) => acc + v, 0) || n;

  // Give every city a guaranteed baseline of 1 day, then distribute remaining (safeTotal - n) proportionally
  const result = new Array<number>(n).fill(1);
  const remaining = safeTotal - n;
  if (remaining <= 0) return result;

  const extraExact = weights.map((w) => (w / weightSum) * remaining);
  const extraFloor = extraExact.map((e) => Math.floor(e));
  let left = remaining - extraFloor.reduce((acc, v) => acc + v, 0);

  const remainders = extraExact
    .map((e, idx) => ({ idx, frac: e - extraFloor[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < n; i += 1) {
    result[i] += extraFloor[i];
  }
  for (let i = 0; i < left; i += 1) {
    result[remainders[i % n].idx] += 1;
  }
  return result;
}

/**
 * Infers per-city day counts from an AI-generated timeline when available.
 */
export function inferCityDaysFromTimeline(
  cities: string[],
  totalDays: number,
  timeline: Array<Pick<TimelineNode, 'day' | 'city'>>
): number[] {
  const cleanCities = cities.map((c) => c.trim()).filter(Boolean);
  if (cleanCities.length === 0) return [];
  const safeTotal = Math.max(1, Math.round(totalDays) || 1);
  if (cleanCities.length === 1) return [safeTotal];

  const counts = new Array<number>(cleanCities.length).fill(0);
  let matchedDays = 0;
  for (let d = 1; d <= safeTotal; d += 1) {
    const dayCity = timeline.find((n) => (n.day ?? 1) === d && n.city?.trim())?.city?.trim();
    if (!dayCity) continue;
    const primary = getPrimaryCityName(dayCity).toLowerCase();
    const matchIdx = cleanCities.findIndex(
      (c) =>
        primary.includes(c.toLowerCase()) ||
        c.toLowerCase().includes(primary)
    );
    if (matchIdx >= 0) {
      counts[matchIdx] += 1;
      matchedDays += 1;
    }
  }

  if (matchedDays >= Math.max(2, Math.floor(safeTotal * 0.6)) && counts.every((c) => c >= 1)) {
    const sum = counts.reduce((acc, v) => acc + v, 0);
    return sum === safeTotal ? counts : redistributeCityDaysForTotal(counts, safeTotal);
  }
  return resolveCityDaysAllocation(cleanCities, safeTotal);
}

/**
 * Resolves the primary city label for a given day across a multi-city route.
 */
export function getCityForDay(
  cities: string[],
  day: number,
  totalDays: number,
  dayNodes?: TimelineNode[],
  lang: AppLanguage = 'zh-CN',
  cityDays?: number[]
): string {
  if (dayNodes && dayNodes.length > 0) {
    const explicit = dayNodes.find((n) => n.city && n.city.trim())?.city?.trim();
    if (explicit) return translateRouteTitle(explicit, lang);
  }

  const cleanCities = cities.map((c) => c.trim()).filter(Boolean);
  if (cleanCities.length === 0) return getItineraryUtilsCopy(lang).destinationFallback;
  if (cleanCities.length === 1 || totalDays <= 1) {
    return translateRouteTitle(cleanCities[0], lang);
  }

  const safeTotal = Math.max(1, totalDays);
  const clampedDay = Math.min(safeTotal, Math.max(1, day));
  const allocation = resolveCityDaysAllocation(cleanCities, safeTotal, cityDays);

  const findCityIdxForDay = (targetDay: number): number => {
    let acc = 0;
    for (let i = 0; i < allocation.length; i += 1) {
      acc += allocation[i];
      if (targetDay <= acc) return i;
    }
    return cleanCities.length - 1;
  };

  const currIdx = findCityIdxForDay(clampedDay);
  const prevIdx = clampedDay > 1 ? findCityIdxForDay(clampedDay - 1) : 0;

  if (clampedDay > 1 && currIdx > prevIdx) {
    return translateRouteTitle(`${cleanCities[prevIdx]} → ${cleanCities[currIdx]}`, lang);
  }
  return translateRouteTitle(cleanCities[currIdx], lang);
}

/**
 * Extracts a single destination city name for AI translation / local cards
 * (e.g., "巴黎 → 阿姆斯特丹" -> "阿姆斯特丹").
 */
export function getPrimaryCityName(cityLabel: string): string {
  if (!cityLabel) return '巴黎';
  const parts = cityLabel
    .split(/→|->|—/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || cityLabel;
}

/**
 * Smartly infers the right finance bucket when logging a timeline stop as an expense,
 * preventing department stores / shopping stops from polluting the Daily Food & Transit budget.
 */
export function inferDefaultBucketForNode(
  node: Pick<TimelineNode, 'title' | 'estLocal' | 'stopType'>,
  vatThresholdLocal: number
): ExpenseBucket {
  if (node.stopType === 'shopping') return 'shopping';
  if (node.stopType === 'hotel') return 'prepaid';
  if (node.stopType === 'transit' && node.estLocal >= 35) return 'prepaid';

  const t = node.title.toLowerCase();
  const shoppingKeywords = [
    '老佛爷',
    '百货',
    '买手店',
    '购物',
    '免税',
    '奥特莱斯',
    '伴手礼',
    'merci',
    'bijenkorf',
    'galeries',
    'printemps',
    '春天百货',
    'department store',
    'outlet',
    'duty free',
    'tax-free',
    'boutique',
  ];
  if (shoppingKeywords.some((kw) => t.includes(kw)) || node.estLocal >= vatThresholdLocal) {
    return 'shopping';
  }

  const prepaidKeywords = [
    'eurostar',
    '跨国高铁',
    '机场快线车票',
    '入住酒店',
    '酒店',
    '航班',
    '高铁',
    'shinkansen',
    'hotel check-in',
    'flight',
  ];
  if (prepaidKeywords.some((kw) => t.includes(kw)) && node.estLocal >= 60) {
    return 'prepaid';
  }

  return 'daily';
}

/**
 * Sorts timeline nodes chronologically by HH:MM while keeping unparseable times stable.
 */
export function sortNodesChronologically(nodes: TimelineNode[]): TimelineNode[] {
  return [...nodes].sort((a, b) => {
    const ma = parseTimeMinutes(a.time);
    const mb = parseTimeMinutes(b.time);
    if (ma === null && mb === null) return 0;
    if (ma === null) return 1;
    if (mb === null) return -1;
    return ma - mb;
  });
}

/**
 * Builds an instant (0ms), offline-resilient native-language taxi card for a stop
 * so tapping "给司机看" opens a ready-to-show fullscreen card immediately while AI refines details.
 */
export function buildInstantDriverFallback(
  city: string,
  title: string,
  address: string,
  lang: AppLanguage = 'zh-CN'
): LocalCardResult {
  const c = city.toLowerCase();
  const cleanAddr = address.trim() || title.trim();
  const { driverFallback } = getItineraryUtilsCopy(lang);

  if (c.includes('巴黎') || c.includes('paris') || c.includes('里昂') || c.includes('尼斯')) {
    return {
      localTitle: title,
      localAddressOrPhrase: `Bonjour, pouvez-vous m’emmener à cette adresse, s’il vous plaît ?\n${cleanAddr}`,
      pronunciationHint: driverFallback.parisPronunciation,
      etiquetteTip: driverFallback.parisTip,
      languageLabel: driverFallback.parisLangLabel(city),
    };
  }

  if (c.includes('阿姆斯特丹') || c.includes('amsterdam') || c.includes('鹿特丹')) {
    return {
      localTitle: title,
      localAddressOrPhrase: `Goedendag, kunt u mij naar dit adres brengen, alstublieft?\n${cleanAddr}`,
      pronunciationHint: driverFallback.amsterdamPronunciation,
      etiquetteTip: driverFallback.amsterdamTip,
      languageLabel: driverFallback.amsterdamLangLabel(city),
    };
  }

  if (
    c.includes('东京') ||
    c.includes('大阪') ||
    c.includes('京都') ||
    c.includes('japan') ||
    c.includes('tokyo') ||
    c.includes('kyoto') ||
    c.includes('osaka')
  ) {
    return {
      localTitle: title,
      localAddressOrPhrase: `すみません、こちらの住所までお願いします：\n${cleanAddr}`,
      pronunciationHint: driverFallback.japanPronunciation,
      etiquetteTip: driverFallback.japanTip,
      languageLabel: driverFallback.japanLangLabel(city),
    };
  }

  return {
    localTitle: title,
    localAddressOrPhrase: `Hello, could you please take me to this address?\n${cleanAddr}`,
    pronunciationHint: driverFallback.genericPronunciation,
    etiquetteTip: driverFallback.genericTip,
    languageLabel: driverFallback.genericLangLabel(city),
  };
}

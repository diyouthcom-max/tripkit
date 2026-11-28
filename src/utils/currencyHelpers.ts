import type { AppLanguage, BudgetState, HomeCurrencyCode } from '../types';

export interface CurrencyCatalogSpec {
  code: HomeCurrencyCode;
  symbol: string;
  nameZh: string;
  nameEn: string;
  /** Offline baseline: 1 USD = perUsd units of this currency */
  perUsd: number;
  /** True when everyday amounts are displayed without decimals (e.g. JPY, KRW, VND, IDR) */
  zeroDecimals?: boolean;
  /** Search keywords (regions, aliases) */
  keywords: string;
}

export const CURRENCY_CATALOG: Record<HomeCurrencyCode, CurrencyCatalogSpec> = {
  CNY: {
    code: 'CNY',
    symbol: '¥',
    nameZh: '人民币',
    nameEn: 'Chinese Yuan',
    perUsd: 7.22,
    keywords: 'rmb china 中国 大陆 元',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    nameZh: '美元',
    nameEn: 'US Dollar',
    perUsd: 1.0,
    keywords: 'usa america 美国 美金',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    nameZh: '欧元',
    nameEn: 'Euro',
    perUsd: 0.92,
    keywords: 'europe france italy spain germany netherlands 欧洲 法国 意大利 德国 荷兰',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    nameZh: '日元',
    nameEn: 'Japanese Yen',
    perUsd: 153.5,
    zeroDecimals: true,
    keywords: 'japan tokyo osaka kyoto 日本 东京 大阪 日币',
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    nameZh: '港币',
    nameEn: 'Hong Kong Dollar',
    perUsd: 7.78,
    keywords: 'hongkong 香港 港元',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    nameZh: '英镑',
    nameEn: 'British Pound',
    perUsd: 0.79,
    keywords: 'uk london britain 英国 伦敦',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    nameZh: '澳元',
    nameEn: 'Australian Dollar',
    perUsd: 1.53,
    keywords: 'australia sydney melbourne 澳大利亚 澳洲 悉尼',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    nameZh: '加元',
    nameEn: 'Canadian Dollar',
    perUsd: 1.39,
    keywords: 'canada toronto vancouver 加拿大 温哥华 多伦多',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    nameZh: '瑞士法郎',
    nameEn: 'Swiss Franc',
    perUsd: 0.88,
    keywords: 'switzerland zurich geneva 瑞士 瑞郎',
  },
  THB: {
    code: 'THB',
    symbol: '฿',
    nameZh: '泰铢',
    nameEn: 'Thai Baht',
    perUsd: 34.6,
    keywords: 'thailand bangkok phuket chiangmai 泰国 曼谷 普吉 清迈',
  },
  KRW: {
    code: 'KRW',
    symbol: '₩',
    nameZh: '韩元',
    nameEn: 'South Korean Won',
    perUsd: 1395,
    zeroDecimals: true,
    keywords: 'korea seoul jeju 韩国 首尔 济州 韩币',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    nameZh: '新加坡元',
    nameEn: 'Singapore Dollar',
    perUsd: 1.34,
    keywords: 'singapore 新加坡 新币',
  },
  MYR: {
    code: 'MYR',
    symbol: 'RM',
    nameZh: '马来西亚林吉特',
    nameEn: 'Malaysian Ringgit',
    perUsd: 4.45,
    keywords: 'malaysia kualalumpur sabah 马来西亚 吉隆坡 马币',
  },
  TWD: {
    code: 'TWD',
    symbol: 'NT$',
    nameZh: '新台币',
    nameEn: 'New Taiwan Dollar',
    perUsd: 32.4,
    zeroDecimals: true,
    keywords: 'taiwan taipei 台湾 台北 台币',
  },
  MOP: {
    code: 'MOP',
    symbol: 'MOP$',
    nameZh: '澳门元',
    nameEn: 'Macanese Pataca',
    perUsd: 8.02,
    keywords: 'macau macao 澳门 葡币',
  },
  VND: {
    code: 'VND',
    symbol: '₫',
    nameZh: '越南盾',
    nameEn: 'Vietnamese Dong',
    perUsd: 25350,
    zeroDecimals: true,
    keywords: 'vietnam hanoi saigon danang 越南 河内 胡志明 岘港',
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    nameZh: '印尼盾',
    nameEn: 'Indonesian Rupiah',
    perUsd: 15850,
    zeroDecimals: true,
    keywords: 'indonesia bali jakarta 印尼 印度尼西亚 巴厘岛 卢比',
  },
  PHP: {
    code: 'PHP',
    symbol: '₱',
    nameZh: '菲律宾比索',
    nameEn: 'Philippine Peso',
    perUsd: 58.6,
    keywords: 'philippines manila boracay 菲律宾 马尼拉 长滩岛',
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    nameZh: '新西兰元',
    nameEn: 'New Zealand Dollar',
    perUsd: 1.69,
    keywords: 'newzealand queenstown auckland 新西兰 纽币 皇后镇',
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    nameZh: '阿联酋迪拉姆',
    nameEn: 'UAE Dirham',
    perUsd: 3.67,
    keywords: 'uae dubai abudhabi 迪拜 阿布扎比 阿联酋',
  },
  TRY: {
    code: 'TRY',
    symbol: '₺',
    nameZh: '土耳其里拉',
    nameEn: 'Turkish Lira',
    perUsd: 34.4,
    keywords: 'turkey istanbul cappadocia 土耳其 伊斯坦布尔',
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    nameZh: '瑞典克朗',
    nameEn: 'Swedish Krona',
    perUsd: 10.85,
    keywords: 'sweden stockholm 瑞典 斯德哥尔摩',
  },
  NOK: {
    code: 'NOK',
    symbol: 'kr',
    nameZh: '挪威克朗',
    nameEn: 'Norwegian Krone',
    perUsd: 11.05,
    keywords: 'norway oslo tromso 挪威 奥斯陆',
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    nameZh: '丹麦克朗',
    nameEn: 'Danish Krone',
    perUsd: 6.88,
    keywords: 'denmark copenhagen 丹麦 哥本哈根',
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    nameZh: '波兰兹罗提',
    nameEn: 'Polish Zloty',
    perUsd: 4.02,
    keywords: 'poland warsaw krakow 波兰 华沙',
  },
  CZK: {
    code: 'CZK',
    symbol: 'Kč',
    nameZh: '捷克克朗',
    nameEn: 'Czech Koruna',
    perUsd: 23.4,
    keywords: 'czech prague 捷克 布拉格',
  },
  HUF: {
    code: 'HUF',
    symbol: 'Ft',
    nameZh: '匈牙利福林',
    nameEn: 'Hungarian Forint',
    perUsd: 376,
    zeroDecimals: true,
    keywords: 'hungary budapest 匈牙利 布达佩斯',
  },
  MXN: {
    code: 'MXN',
    symbol: 'Mex$',
    nameZh: '墨西哥比索',
    nameEn: 'Mexican Peso',
    perUsd: 20.3,
    keywords: 'mexico cancun 墨西哥 坎昆',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    nameZh: '巴西雷亚尔',
    nameEn: 'Brazilian Real',
    perUsd: 5.78,
    keywords: 'brazil rio saopaulo 巴西 里约',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    nameZh: '印度卢比',
    nameEn: 'Indian Rupee',
    perUsd: 84.4,
    keywords: 'india delhi mumbai 印度 新德里',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    nameZh: '南非兰特',
    nameEn: 'South African Rand',
    perUsd: 18.1,
    keywords: 'southafrica capetown 南非 开普敦',
  },
  EGP: {
    code: 'EGP',
    symbol: 'E£',
    nameZh: '埃及镑',
    nameEn: 'Egyptian Pound',
    perUsd: 49.3,
    keywords: 'egypt cairo luxor 埃及 开罗',
  },
};

export const ORDERED_CURRENCY_CODES: HomeCurrencyCode[] = [
  'CNY',
  'EUR',
  'USD',
  'JPY',
  'GBP',
  'HKD',
  'AUD',
  'CAD',
  'CHF',
  'THB',
  'KRW',
  'SGD',
  'MYR',
  'TWD',
  'MOP',
  'IDR',
  'VND',
  'PHP',
  'NZD',
  'MXN',
  'AED',
  'TRY',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'BRL',
  'INR',
  'ZAR',
  'EGP',
];

const LIVE_FX_STORAGE_KEY = 'tripkit_live_fx_cache_v1';
const LIVE_FX_TTL_MS = 6 * 3600 * 1000; // 6 hours

interface CachedLiveFxPayload {
  updatedAt: number;
  ratesPerUsd: Record<string, number>;
}

let memoryLiveFxCache: CachedLiveFxPayload | null = null;
let inflightFxPromise: Promise<CachedLiveFxPayload | null> | null = null;

export function loadCachedLiveFx(): CachedLiveFxPayload | null {
  if (memoryLiveFxCache) return memoryLiveFxCache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LIVE_FX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLiveFxPayload;
    if (
      parsed &&
      typeof parsed.updatedAt === 'number' &&
      parsed.ratesPerUsd &&
      typeof parsed.ratesPerUsd === 'object'
    ) {
      memoryLiveFxCache = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export async function refreshLiveUsdRates(force = false): Promise<{
  ok: boolean;
  updatedAt: number | null;
}> {
  const existing = loadCachedLiveFx();
  if (!force && existing && Date.now() - existing.updatedAt < LIVE_FX_TTL_MS) {
    return { ok: true, updatedAt: existing.updatedAt };
  }
  if (typeof fetch === 'undefined') {
    return { ok: false, updatedAt: existing?.updatedAt ?? null };
  }

  if (!inflightFxPromise) {
    inflightFxPromise = (async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
          method: 'GET',
        });
        if (!res.ok) return null;
        const json = (await res.json()) as {
          result?: string;
          rates?: Record<string, number>;
        };
        if (!json?.rates || typeof json.rates !== 'object') return null;
        const cleanRates: Record<string, number> = { USD: 1 };
        for (const [k, v] of Object.entries(json.rates)) {
          if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
            cleanRates[k.toUpperCase()] = v;
          }
        }
        const payload: CachedLiveFxPayload = {
          updatedAt: Date.now(),
          ratesPerUsd: cleanRates,
        };
        memoryLiveFxCache = payload;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LIVE_FX_STORAGE_KEY, JSON.stringify(payload));
          } catch {
            // Ignore quota errors
          }
        }
        return payload;
      } catch {
        return null;
      } finally {
        inflightFxPromise = null;
      }
    })();
  }

  const fetched = await inflightFxPromise;
  if (fetched) {
    return { ok: true, updatedAt: fetched.updatedAt };
  }
  return { ok: false, updatedAt: existing?.updatedAt ?? null };
}

export function isHomeCurrencyCode(code: string): code is HomeCurrencyCode {
  return Boolean(code && code.toUpperCase() in CURRENCY_CATALOG);
}

export function normalizeToHomeCurrencyCode(
  rawCode: string | undefined | null,
  fallback: HomeCurrencyCode = 'CNY'
): HomeCurrencyCode {
  const upper = (rawCode || '').trim().toUpperCase();
  if (upper in CURRENCY_CATALOG) {
    return upper as HomeCurrencyCode;
  }
  return fallback;
}

export function isSameCurrency(codeA?: string | null, codeB?: string | null): boolean {
  if (!codeA || !codeB) return false;
  return codeA.trim().toUpperCase() === codeB.trim().toUpperCase();
}

export function getCurrencyPerUsd(code: string, fallbackFxToUsd?: number): number {
  const upper = (code || 'USD').trim().toUpperCase();
  if (upper === 'USD') return 1;

  const live = loadCachedLiveFx();
  if (live?.ratesPerUsd?.[upper] && live.ratesPerUsd[upper] > 0) {
    return live.ratesPerUsd[upper];
  }

  if (upper in CURRENCY_CATALOG) {
    return CURRENCY_CATALOG[upper as HomeCurrencyCode].perUsd;
  }

  if (fallbackFxToUsd && fallbackFxToUsd > 0) {
    return 1 / fallbackFxToUsd;
  }

  return 1;
}

/**
 * Computes exact exchange rate: 1 unit of `fromCode` = X units of `toCode`.
 * Honors user-locked custom trip FX (`customFxLocalToHome`) whenever converting between
 * the trip's destination currency and the locked home currency.
 */
export function resolveExchangeRate(params: {
  fromCode: string;
  toCode: string;
  intelFxToUsd?: number;
  tripCurrencyCode?: string;
  budgetFx?: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> | null;
}): {
  rate: number;
  source: 'same' | 'custom' | 'live' | 'offline';
  liveUpdatedAt: number | null;
} {
  const from = (params.fromCode || 'USD').trim().toUpperCase();
  const to = (params.toCode || 'USD').trim().toUpperCase();
  const live = loadCachedLiveFx();

  if (from === to) {
    return { rate: 1, source: 'same', liveUpdatedAt: live?.updatedAt ?? null };
  }

  const tripCode = (params.tripCurrencyCode || '').trim().toUpperCase();
  const customRate = params.budgetFx?.customFxLocalToHome;
  const customHome = (params.budgetFx?.customFxHomeCode || '').trim().toUpperCase();

  if (
    customRate &&
    Number.isFinite(customRate) &&
    customRate > 0 &&
    tripCode &&
    customHome &&
    tripCode !== customHome
  ) {
    if (from === tripCode && to === customHome) {
      return { rate: customRate, source: 'custom', liveUpdatedAt: live?.updatedAt ?? null };
    }
    if (from === customHome && to === tripCode) {
      return {
        rate: 1 / customRate,
        source: 'custom',
        liveUpdatedAt: live?.updatedAt ?? null,
      };
    }
  }

  const fromPerUsd = getCurrencyPerUsd(
    from,
    from === tripCode ? params.intelFxToUsd : undefined
  );
  const toPerUsd = getCurrencyPerUsd(
    to,
    to === tripCode ? params.intelFxToUsd : undefined
  );

  const hasLive =
    Boolean(live?.ratesPerUsd) &&
    (from === 'USD' || Boolean(live?.ratesPerUsd?.[from])) &&
    (to === 'USD' || Boolean(live?.ratesPerUsd?.[to]));

  const safeRate = fromPerUsd > 0 ? toPerUsd / fromPerUsd : 1;
  return {
    rate: safeRate,
    source: hasLive ? 'live' : 'offline',
    liveUpdatedAt: live?.updatedAt ?? null,
  };
}

export function convertCurrencyAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  options?: {
    intelFxToUsd?: number;
    tripCurrencyCode?: string;
    budgetFx?: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> | null;
  }
): number {
  if (!Number.isFinite(amount)) return 0;
  const { rate } = resolveExchangeRate({
    fromCode,
    toCode,
    intelFxToUsd: options?.intelFxToUsd,
    tripCurrencyCode: options?.tripCurrencyCode,
    budgetFx: options?.budgetFx,
  });
  return amount * rate;
}

export function getCurrencySymbol(code: string, fallbackSymbol?: string): string {
  const upper = (code || '').trim().toUpperCase();
  if (upper in CURRENCY_CATALOG) {
    return CURRENCY_CATALOG[upper as HomeCurrencyCode].symbol;
  }
  return fallbackSymbol || upper;
}

export function isZeroDecimalCurrency(code: string): boolean {
  const upper = (code || '').trim().toUpperCase();
  if (upper in CURRENCY_CATALOG) {
    return Boolean(CURRENCY_CATALOG[upper as HomeCurrencyCode].zeroDecimals);
  }
  return false;
}

export function formatCurrencyAmount(
  amount: number,
  code: string,
  options?: {
    withCode?: boolean;
    compactDecimals?: boolean;
    signed?: boolean;
    fallbackSymbol?: string;
  }
): string {
  const safeVal = Number.isFinite(amount) ? amount : 0;
  const absVal = Math.abs(safeVal);
  const upper = (code || 'USD').trim().toUpperCase();
  const sym = getCurrencySymbol(upper, options?.fallbackSymbol);
  const zeroDec = isZeroDecimalCurrency(upper) || (options?.compactDecimals && absVal >= 100);

  const numStr = zeroDec
    ? Math.round(absVal).toLocaleString('en-US')
    : absVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const signPrefix =
    safeVal < -0.004 ? '-' : options?.signed && safeVal > 0.004 ? '+' : '';
  return `${signPrefix}${sym}${numStr}${options?.withCode ? ` ${upper}` : ''}`;
}

export function formatCurrencyFullLabel(
  code: HomeCurrencyCode,
  lang: AppLanguage = 'en-US'
): string {
  const spec = CURRENCY_CATALOG[code] ?? CURRENCY_CATALOG.CNY;
  if (lang === 'zh-CN') {
    return `${spec.nameZh} ${spec.code} (${spec.symbol})`;
  }
  const localizedMap: Partial<Record<HomeCurrencyCode, Partial<Record<AppLanguage, string>>>> = {
    CNY: { 'es-MX': 'Yuan chino', 'fr-FR': 'Yuan chinois', 'de-DE': 'Chinesischer Yuan', 'pt-BR': 'Yuan chinês', 'ja-JP': '中国人民元' },
    USD: { 'es-MX': 'Dólar estadounidense', 'fr-FR': 'Dollar américain', 'de-DE': 'US-Dollar', 'pt-BR': 'Dólar americano', 'ja-JP': '米ドル' },
    EUR: { 'es-MX': 'Euro', 'fr-FR': 'Euro', 'de-DE': 'Euro', 'pt-BR': 'Euro', 'ja-JP': 'ユーロ' },
    JPY: { 'es-MX': 'Yen japonés', 'fr-FR': 'Yen japonais', 'de-DE': 'Japanischer Yen', 'pt-BR': 'Iene japonês', 'ja-JP': '日本円' },
    GBP: { 'es-MX': 'Libra esterlina', 'fr-FR': 'Livre sterling', 'de-DE': 'Britisches Pfund', 'pt-BR': 'Libra esterlina', 'ja-JP': '英ポンド' },
    MXN: { 'es-MX': 'Peso mexicano', 'fr-FR': 'Peso mexicain', 'de-DE': 'Mexikanischer Peso', 'pt-BR': 'Peso mexicano', 'ja-JP': 'メキシコペソ' },
    BRL: { 'es-MX': 'Real brasileño', 'fr-FR': 'Réal brésilien', 'de-DE': 'Brasilianischer Real', 'pt-BR': 'Real brasileiro', 'ja-JP': 'ブラジルレアル' },
  };
  const label = localizedMap[spec.code]?.[lang] ?? spec.nameEn;
  return `${label} · ${spec.code} (${spec.symbol})`;
}

export function filterCurrencySpecs(
  queryText: string,
  excludeCode?: string
): CurrencyCatalogSpec[] {
  const q = queryText.trim().toLowerCase();
  const excludedUpper = (excludeCode || '').trim().toUpperCase();

  return ORDERED_CURRENCY_CODES.map((c) => CURRENCY_CATALOG[c]).filter((spec) => {
    if (excludedUpper && spec.code === excludedUpper) return false;
    if (!q) return true;
    return (
      spec.code.toLowerCase().includes(q) ||
      spec.nameZh.toLowerCase().includes(q) ||
      spec.nameEn.toLowerCase().includes(q) ||
      spec.symbol.toLowerCase().includes(q) ||
      spec.keywords.toLowerCase().includes(q)
    );
  });
}

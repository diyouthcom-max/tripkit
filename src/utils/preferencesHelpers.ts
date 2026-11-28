import type {
  AffiliatePartnerConfig,
  AppLanguage,
  AppPreferences,
  BaggagePresetId,
  BudgetState,
  HomeCurrencyCode,
  TimeFormatPref,
  TrialSimulationMode,
  UnitSystem,
} from '../types';
import {
  CURRENCY_CATALOG,
  ORDERED_CURRENCY_CODES,
  convertCurrencyAmount,
  formatCurrencyAmount,
  formatCurrencyFullLabel,
} from './currencyHelpers';

export const PREFERENCES_STORAGE_KEY = 'tripkit_preferences_v1';

export const FREE_TRIAL_DAYS = 30;
export const FREE_AI_AUDIT_LIMIT = 2;
export const ADMIN_OWNER_EMAIL = 'diyouth.com@gmail.com';
export const WHATSAPP_DISPLAY = '+86 18934580778';
export const WHATSAPP_NUMBER_CLEAN = '8618934580778';
export const FACEBOOK_PAGE_URL = 'https://www.facebook.com/BagailStore/';
export const FACEBOOK_PAGE_HANDLE = '@BagailStore';

/** Languages shown in Settings / switcher UI (zh-CN kept in AppLanguage + packs as type baseline only). */
export const SUPPORTED_APP_LANGUAGES: readonly AppLanguage[] = [
  'en-US',
  'en-GB',
  'es-MX',
  'fr-FR',
  'de-DE',
  'pt-BR',
  'ja-JP',
] as const;

export function normalizeAppLanguage(raw: unknown, fallback: AppLanguage = 'en-US'): AppLanguage {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  const lc = trimmed.toLowerCase();
  // Legacy zh-CN prefs / system locales map to en-US — Simplified Chinese is no longer a UI option.
  if (trimmed === 'zh-CN' || lc === 'zh' || lc.startsWith('zh-')) return 'en-US';
  if ((SUPPORTED_APP_LANGUAGES as readonly string[]).includes(trimmed)) {
    return trimmed as AppLanguage;
  }
  if (lc === 'es' || lc.startsWith('es-')) return 'es-MX';
  if (lc === 'fr' || lc.startsWith('fr-')) return 'fr-FR';
  if (lc === 'de' || lc.startsWith('de-')) return 'de-DE';
  if (lc === 'pt' || lc.startsWith('pt-')) return 'pt-BR';
  if (lc === 'ja' || lc.startsWith('ja-')) return 'ja-JP';
  if (
    lc.startsWith('en-gb') ||
    lc.startsWith('en-au') ||
    lc.startsWith('en-nz') ||
    lc.startsWith('en-ie') ||
    lc.startsWith('en-sg') ||
    lc.startsWith('en-za')
  ) {
    return 'en-GB';
  }
  if (lc === 'en' || lc.startsWith('en-')) return 'en-US';
  return fallback;
}

export function buildWhatsAppClaimUrl(customMessage?: string, lang: AppLanguage = 'en-US'): string {
  const defaultByLang: Record<AppLanguage, string> = {
    'zh-CN':
      '你好！我正在使用 Trip Kit 筹备旅行，想申领早期旅行者专属的 1 年免费 Pro 授权兑换码，谢谢！',
    'en-US':
      'Hi! I am using Trip Kit to plan my trip and would like to request an early-traveler 1-Year Free Pro redemption code. Thank you!',
    'en-GB':
      'Hi! I am using Trip Kit to plan my journey and would like to request an early-traveller 1-Year Free Pro redemption code. Thank you!',
    'es-MX':
      '¡Hola! Estoy usando Trip Kit para planear mi viaje y me gustaría solicitar un código de 1 año gratis de Pro para viajeros pioneros. ¡Gracias!',
    'fr-FR':
      'Bonjour ! J’utilise Trip Kit pour préparer mon voyage et je souhaiterais demander un code Pro gratuit de 1 an pour les premiers voyageurs. Merci !',
    'de-DE':
      'Hallo! Ich plane meine Reise mit Trip Kit und möchte gerne einen 1-Jahres-Pro-Gutschein für frühe Reisende anfragen. Vielen Dank!',
    'pt-BR':
      'Olá! Estou usando o Trip Kit para planejar minha viagem e gostaria de solicitar um código de 1 ano grátis do Pro para viajantes pioneiros. Obrigado!',
    'ja-JP':
      'こんにちは！Trip Kit で旅行を計画しています。アーリートラベラー向けの 1 年無料 Pro 特典コードを申請したいです。よろしくお願いします！',
  };
  const text = encodeURIComponent(customMessage || defaultByLang[lang] || defaultByLang['en-US']);
  return `https://wa.me/${WHATSAPP_NUMBER_CLEAN}?text=${text}`;
}

export const LANGUAGE_SPECS: Record<
  AppLanguage,
  {
    code: AppLanguage;
    shortBadge: string;
    nativeLabel: string;
    regionNote: string;
    recommendedUnit: UnitSystem;
    recommendedTimeFormat: TimeFormatPref;
    recommendedCurrency: HomeCurrencyCode;
  }
> = {
  'zh-CN': {
    code: 'zh-CN',
    shortBadge: '中文',
    nativeLabel: '简体中文',
    regionNote: '公制 kg/°C · 24小时制 · YYYY-MM-DD',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'CNY',
  },
  'en-US': {
    code: 'en-US',
    shortBadge: 'EN · US',
    nativeLabel: 'English (North America)',
    regionNote: 'Imperial lb/°F · 12h AM/PM · MM/DD/YYYY',
    recommendedUnit: 'imperial',
    recommendedTimeFormat: '12h',
    recommendedCurrency: 'USD',
  },
  'en-GB': {
    code: 'en-GB',
    shortBadge: 'EN · EU',
    nativeLabel: 'English (Europe / UK)',
    regionNote: 'Metric kg/°C · 24h · DD/MM/YYYY · VAT',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'EUR',
  },
  'es-MX': {
    code: 'es-MX',
    shortBadge: 'ES · MX',
    nativeLabel: 'Español (México)',
    regionNote: 'Métrico kg/°C · 24h · DD/MM/YYYY · MXN',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'MXN',
  },
  'fr-FR': {
    code: 'fr-FR',
    shortBadge: 'FR',
    nativeLabel: 'Français',
    regionNote: 'Métrique kg/°C · 24h · DD/MM/YYYY · EUR',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'EUR',
  },
  'de-DE': {
    code: 'de-DE',
    shortBadge: 'DE',
    nativeLabel: 'Deutsch',
    regionNote: 'Metrisch kg/°C · 24 Std. · TT.MM.JJJJ · EUR',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'EUR',
  },
  'pt-BR': {
    code: 'pt-BR',
    shortBadge: 'PT',
    nativeLabel: 'Português',
    regionNote: 'Métrico kg/°C · 24h · DD/MM/AAAA · BRL',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'BRL',
  },
  'ja-JP': {
    code: 'ja-JP',
    shortBadge: '日本語',
    nativeLabel: '日本語',
    regionNote: 'メートル法 kg/°C · 24時間 · YYYY/MM/DD · JPY',
    recommendedUnit: 'metric',
    recommendedTimeFormat: '24h',
    recommendedCurrency: 'JPY',
  },
};

export const DEFAULT_AFFILIATE_PARTNERS: AffiliatePartnerConfig = {
  amazonTag: 'tripkit-20',
  klookAid: 'tripkit_klook',
  getYourGuidePartnerId: 'TRIPKIT',
  tripComAllianceId: 'tripkit_aff',
  airaloRef: 'TRIPKIT',
  taobaoPid: 'mm_tripkit_0_0',
  disclosureEnabled: true,
};

export function detectSystemLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en-US';
  const rawList: string[] = [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    rawList.push(...navigator.languages);
  }
  if (navigator.language) {
    rawList.push(navigator.language);
  }

  for (const raw of rawList) {
    const lc = String(raw || '').trim().toLowerCase();
    if (!lc) continue;
    // Chinese system locales fall through to en-US (zh-CN removed from UI).
    if (lc === 'zh' || lc.startsWith('zh-')) return 'en-US';
    if (lc === 'es' || lc.startsWith('es-')) return 'es-MX';
    if (lc === 'fr' || lc.startsWith('fr-')) return 'fr-FR';
    if (lc === 'de' || lc.startsWith('de-')) return 'de-DE';
    if (lc === 'pt' || lc.startsWith('pt-')) return 'pt-BR';
    if (lc === 'ja' || lc.startsWith('ja-')) return 'ja-JP';
    if (
      lc.startsWith('en-gb') ||
      lc.startsWith('en-au') ||
      lc.startsWith('en-nz') ||
      lc.startsWith('en-ie') ||
      lc.startsWith('en-sg') ||
      lc.startsWith('en-za')
    ) {
      return 'en-GB';
    }
    if (lc === 'en' || lc.startsWith('en-')) {
      return 'en-US';
    }
    // Other European metric locales fall back to European English (Metric + 24h)
    if (
      /^(nl|it|sv|nb|no|da|fi|pl|cs|el|hu|ro|bg|hr|sk|sl|et|lv|lt|uk)(-|$)/.test(lc)
    ) {
      return 'en-GB';
    }
  }
  // Global default fallback: English (US)
  return 'en-US';
}

function detectInitialHomeCurrency(detectedLang: AppLanguage): HomeCurrencyCode {
  if (typeof navigator !== 'undefined') {
    const primary = String(
      (Array.isArray(navigator.languages) && navigator.languages[0]) || navigator.language || ''
    )
      .trim()
      .toLowerCase();
    if (primary.startsWith('zh-hk') || primary.startsWith('zh-mo')) return 'HKD';
    if (primary.startsWith('zh-tw')) return 'TWD';
    if (primary.startsWith('en-gb')) return 'GBP';
    if (primary.startsWith('en-au')) return 'AUD';
    if (primary.startsWith('en-ca') || primary.startsWith('fr-ca')) return 'CAD';
    if (primary.startsWith('en-nz')) return 'NZD';
    if (primary.startsWith('en-sg')) return 'SGD';
    if (primary.startsWith('de-ch') || primary.startsWith('fr-ch')) return 'CHF';
    if (primary.startsWith('es-es') || primary.startsWith('pt-pt')) return 'EUR';
    if (primary.startsWith('es-mx')) return 'MXN';
    if (primary.startsWith('pt-br')) return 'BRL';
    if (primary.startsWith('ja')) return 'JPY';
  }
  return LANGUAGE_SPECS[detectedLang].recommendedCurrency;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'en-US',
  followSystemLanguage: true,
  unitSystem: 'imperial',
  timeFormat: '12h',
  homeCurrency: 'USD',
  baggagePreset: 'standard',
  carryOnLimitKg: 7.0,
  checkedLimitKg: 23.0,
  tabBadgeEnabled: true,
  workspaceBannerEnabled: true,
  isProUnlocked: false,
  proPlan: 'annual',
  trialStartedAt: Date.now(),
  proExpiresAt: null,
  redeemedCode: '',
  aiAuditUsedCount: 0,
  trialSimulationMode: 'normal',
  affiliatePartners: DEFAULT_AFFILIATE_PARTNERS,
};

export function buildSystemDefaultPreferences(nowMs = Date.now()): AppPreferences {
  const detectedLang = detectSystemLanguage();
  const spec = LANGUAGE_SPECS[detectedLang];
  return {
    ...DEFAULT_APP_PREFERENCES,
    language: detectedLang,
    followSystemLanguage: true,
    unitSystem: spec.recommendedUnit,
    timeFormat: spec.recommendedTimeFormat,
    homeCurrency: detectInitialHomeCurrency(detectedLang),
    trialStartedAt: nowMs,
  };
}

export interface MembershipStatus {
  isProActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  proDaysRemaining: number | null;
  expiresDateLabel: string | null;
  freeAiAuditsRemaining: number;
}

export function computeMembershipStatus(
  prefs: AppPreferences,
  nowMs = Date.now()
): MembershipStatus {
  const isProActive =
    prefs.isProUnlocked &&
    (prefs.proPlan === 'lifetime' ||
      prefs.proExpiresAt === null ||
      prefs.proExpiresAt > nowMs);

  const rawTrialEndMs = prefs.trialStartedAt + FREE_TRIAL_DAYS * 86_400_000;
  const trialDaysRemaining =
    prefs.trialSimulationMode === 'expired'
      ? 0
      : Math.max(0, Math.ceil((rawTrialEndMs - nowMs) / 86_400_000));

  const isTrialExpired = !isProActive && trialDaysRemaining <= 0;

  const proDaysRemaining =
    isProActive && prefs.proPlan !== 'lifetime' && prefs.proExpiresAt
      ? Math.max(1, Math.ceil((prefs.proExpiresAt - nowMs) / 86_400_000))
      : null;

  const lifetimeLabelByLang: Record<AppLanguage, string> = {
    'zh-CN': '终身有效',
    'en-US': 'Lifetime',
    'en-GB': 'Lifetime',
    'es-MX': 'De por vida',
    'fr-FR': 'À vie',
    'de-DE': 'Lebenslang',
    'pt-BR': 'Vitalício',
    'ja-JP': '永久有効',
  };

  const expiresDateLabel = isProActive
    ? prefs.proPlan === 'lifetime' || prefs.proExpiresAt === null
      ? lifetimeLabelByLang[prefs.language] || 'Lifetime'
      : formatDateByPref(new Date(prefs.proExpiresAt).toISOString().slice(0, 10), prefs.language)
    : null;

  const freeAiAuditsRemaining = Math.max(
    0,
    FREE_AI_AUDIT_LIMIT - Math.max(0, prefs.aiAuditUsedCount || 0)
  );

  return {
    isProActive,
    isTrialExpired,
    trialDaysRemaining,
    proDaysRemaining,
    expiresDateLabel,
    freeAiAuditsRemaining,
  };
}

export const BAGGAGE_PRESET_SPECS: Record<
  Exclude<BaggagePresetId, 'custom'>,
  { label: string; shortLabel: string; carryOnKg: number; checkedKg: number }
> = {
  lcc: {
    label: '廉航轻装 (随身 7kg · 无托运)',
    shortLabel: '廉航 7/0kg',
    carryOnKg: 7.0,
    checkedKg: 0,
  },
  standard: {
    label: '经济舱标准 (随身 7kg · 托运 23kg)',
    shortLabel: '经济舱 7/23kg',
    carryOnKg: 7.0,
    checkedKg: 23.0,
  },
  business: {
    label: '公务/高额舱 (随身 10kg · 托运 32kg)',
    shortLabel: '公务舱 10/32kg',
    carryOnKg: 10.0,
    checkedKg: 32.0,
  },
};

export const HOME_CURRENCY_SPECS: Record<
  HomeCurrencyCode,
  { code: HomeCurrencyCode; symbol: string; label: string; perUsd: number }
> = ORDERED_CURRENCY_CODES.reduce(
  (acc, code) => {
    const spec = CURRENCY_CATALOG[code];
    acc[code] = {
      code: spec.code,
      symbol: spec.symbol,
      label: `${spec.nameZh} ${spec.code} (${spec.symbol})`,
      perUsd: spec.perUsd,
    };
    return acc;
  },
  {} as Record<
    HomeCurrencyCode,
    { code: HomeCurrencyCode; symbol: string; label: string; perUsd: number }
  >
);

export function getBaggagePresetLabels(
  preset: BaggagePresetId,
  lang: AppLanguage = 'en-US',
  unitSystem: UnitSystem = 'metric'
): { label: string; shortLabel: string; tierTitle: string; allowanceSub: string } {
  if (preset === 'custom') {
    const customMap: Record<
      AppLanguage,
      { label: string; shortLabel: string; tierTitle: string; allowanceSub: string }
    > = {
      'zh-CN': {
        label: '自定义额度（手动设置随身/托运上限）',
        shortLabel: '自定义',
        tierTitle: '自定义',
        allowanceSub: '手动上限',
      },
      'en-US': {
        label: 'Custom Weight Limits (Manual)',
        shortLabel: 'Custom',
        tierTitle: 'Custom',
        allowanceSub: 'Manual',
      },
      'en-GB': {
        label: 'Custom Allowance (Manual)',
        shortLabel: 'Custom',
        tierTitle: 'Custom',
        allowanceSub: 'Manual',
      },
      'es-MX': {
        label: 'Límites personalizados (Manual)',
        shortLabel: 'Personalizado',
        tierTitle: 'Personalizado',
        allowanceSub: 'Manual',
      },
      'fr-FR': {
        label: 'Franchise personnalisée (Manuel)',
        shortLabel: 'Personnalisé',
        tierTitle: 'Personnalisé',
        allowanceSub: 'Manuel',
      },
      'de-DE': {
        label: 'Eigene Freigepäckgrenzen (Manuell)',
        shortLabel: 'Eigene',
        tierTitle: 'Eigene',
        allowanceSub: 'Manuell',
      },
      'pt-BR': {
        label: 'Limites personalizados (Manual)',
        shortLabel: 'Personalizado',
        tierTitle: 'Personalizado',
        allowanceSub: 'Manual',
      },
      'ja-JP': {
        label: 'カスタム上限（手動設定）',
        shortLabel: 'カスタム',
        tierTitle: 'カスタム',
        allowanceSub: '手動設定',
      },
    };
    return customMap[lang] || customMap['en-US'];
  }
  const base =
    BAGGAGE_PRESET_SPECS[preset as Exclude<BaggagePresetId, 'custom'>] ??
    BAGGAGE_PRESET_SPECS.standard;
  const fmtKgLb = (kg: number) =>
    unitSystem === 'imperial' ? `${Math.round(kg * 2.20462262)}lb` : `${kg}kg`;
  const cStr = fmtKgLb(base.carryOnKg);
  const kStr = fmtKgLb(base.checkedKg);

  if (lang === 'zh-CN') {
    return {
      label:
        preset === 'lcc'
          ? `廉航轻装 (随身 ${cStr} · 无托运)`
          : preset === 'standard'
          ? `经济舱标准 (随身 ${cStr} · 托运 ${kStr})`
          : `公务/高额舱 (随身 ${cStr} · 托运 ${kStr})`,
      shortLabel:
        preset === 'lcc'
          ? `廉航 ${cStr} · 无托运`
          : preset === 'standard'
          ? `经济舱 ${cStr} + ${kStr}`
          : `公务舱 ${cStr} + ${kStr}`,
      tierTitle: preset === 'lcc' ? '廉航轻装' : preset === 'standard' ? '经济舱' : '公务舱',
      allowanceSub: preset === 'lcc' ? `${cStr} · 无托运` : `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'es-MX') {
    if (preset === 'lcc') {
      return {
        label: `Tarifa Básica (Mano ${cStr} · Sin documentar)`,
        shortLabel: `Básica ${cStr} · Sin doc.`,
        tierTitle: 'Básica',
        allowanceSub: `${cStr} · Sin doc.`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `Económica Estándar (Mano ${cStr} · Doc. ${kStr})`,
        shortLabel: `Económica ${cStr} + ${kStr}`,
        tierTitle: 'Económica',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `Ejecutiva / Premier (Mano ${cStr} · Doc. ${kStr})`,
      shortLabel: `Ejecutiva ${cStr} + ${kStr}`,
      tierTitle: 'Ejecutiva',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'fr-FR') {
    if (preset === 'lcc') {
      return {
        label: `Low-Cost (Cabine ${cStr} · Sans soute)`,
        shortLabel: `Low-Cost ${cStr}`,
        tierTitle: 'Low-Cost',
        allowanceSub: `${cStr} · Sans soute`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `Économique Standard (Cabine ${cStr} · Soute ${kStr})`,
        shortLabel: `Éco ${cStr} + ${kStr}`,
        tierTitle: 'Économique',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `Affaires / Business (Cabine ${cStr} · Soute ${kStr})`,
      shortLabel: `Affaires ${cStr} + ${kStr}`,
      tierTitle: 'Affaires',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'de-DE') {
    if (preset === 'lcc') {
      return {
        label: `Light-Tarif (Handgepäck ${cStr} · Ohne Aufgabe)`,
        shortLabel: `Light ${cStr}`,
        tierTitle: 'Light',
        allowanceSub: `${cStr} · Ohne Aufgabe`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `Economy Standard (Handgepäck ${cStr} · Aufgabe ${kStr})`,
        shortLabel: `Economy ${cStr} + ${kStr}`,
        tierTitle: 'Economy',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `Business Class (Handgepäck ${cStr} · Aufgabe ${kStr})`,
      shortLabel: `Business ${cStr} + ${kStr}`,
      tierTitle: 'Business',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'pt-BR') {
    if (preset === 'lcc') {
      return {
        label: `Tarifa Light (Mão ${cStr} · Sem despachar)`,
        shortLabel: `Light ${cStr}`,
        tierTitle: 'Light',
        allowanceSub: `${cStr} · Sem desp.`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `Econômica Padrão (Mão ${cStr} · Desp. ${kStr})`,
        shortLabel: `Econômica ${cStr} + ${kStr}`,
        tierTitle: 'Econômica',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `Executiva / Business (Mão ${cStr} · Desp. ${kStr})`,
      shortLabel: `Executiva ${cStr} + ${kStr}`,
      tierTitle: 'Executiva',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'ja-JP') {
    if (preset === 'lcc') {
      return {
        label: `LCC ライト（機内持込 ${cStr} · 受託なし）`,
        shortLabel: `LCC ${cStr} · 受託なし`,
        tierTitle: 'LCC',
        allowanceSub: `${cStr} · 受託なし`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `エコノミー標準（機内 ${cStr} · 受託 ${kStr}）`,
        shortLabel: `エコノミー ${cStr} + ${kStr}`,
        tierTitle: 'エコノミー',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `ビジネスクラス（機内 ${cStr} · 受託 ${kStr}）`,
      shortLabel: `ビジネス ${cStr} + ${kStr}`,
      tierTitle: 'ビジネス',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  if (lang === 'en-GB') {
    if (preset === 'lcc') {
      return {
        label: `Low-Cost Carrier (Cabin ${cStr} · No hold)`,
        shortLabel: `LCC ${cStr} · No Hold`,
        tierTitle: 'LCC',
        allowanceSub: `${cStr} · No Hold`,
      };
    }
    if (preset === 'standard') {
      return {
        label: `Economy Standard (Cabin ${cStr} · Hold ${kStr})`,
        shortLabel: `Economy ${cStr} + ${kStr}`,
        tierTitle: 'Economy',
        allowanceSub: `${cStr} + ${kStr}`,
      };
    }
    return {
      label: `Business / Club (Cabin ${cStr} · Hold ${kStr})`,
      shortLabel: `Business ${cStr} + ${kStr}`,
      tierTitle: 'Business',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  // en-US default
  if (preset === 'lcc') {
    return {
      label: `Basic / Budget (Carry-on ${cStr} · No checked)`,
      shortLabel: `Basic ${cStr} · No Bag`,
      tierTitle: 'Basic',
      allowanceSub: `${cStr} · No Bag`,
    };
  }
  if (preset === 'standard') {
    return {
      label: `Economy Standard (Carry-on ${cStr} · Checked ${kStr})`,
      shortLabel: `Economy ${cStr} + ${kStr}`,
      tierTitle: 'Economy',
      allowanceSub: `${cStr} + ${kStr}`,
    };
  }
  return {
    label: `Business Class (Carry-on ${cStr} · Checked ${kStr})`,
    shortLabel: `Business ${cStr} + ${kStr}`,
    tierTitle: 'Business',
    allowanceSub: `${cStr} + ${kStr}`,
  };
}

export function getHomeCurrencyLabel(code: HomeCurrencyCode, lang: AppLanguage = 'en-US'): string {
  return formatCurrencyFullLabel(code, lang);
}

export function sanitizePreferences(
  raw: Partial<AppPreferences> | null | undefined
): AppPreferences {
  const fallbackNow = Date.now();
  if (!raw || typeof raw !== 'object') {
    return buildSystemDefaultPreferences(fallbackNow);
  }
  const followSystemLanguage =
    typeof raw.followSystemLanguage === 'boolean' ? raw.followSystemLanguage : false;
  const language: AppLanguage = followSystemLanguage
    ? detectSystemLanguage()
    : raw.language
    ? normalizeAppLanguage(raw.language, detectSystemLanguage())
    : detectSystemLanguage();
  const unitSystem: UnitSystem = raw.unitSystem === 'imperial' ? 'imperial' : 'metric';
  const timeFormat: TimeFormatPref = raw.timeFormat === '12h' ? '12h' : '24h';
  const homeCurrency: HomeCurrencyCode =
    raw.homeCurrency && raw.homeCurrency in HOME_CURRENCY_SPECS
      ? raw.homeCurrency
      : LANGUAGE_SPECS[language].recommendedCurrency;
  const baggagePreset: BaggagePresetId =
    raw.baggagePreset === 'lcc' ||
    raw.baggagePreset === 'standard' ||
    raw.baggagePreset === 'business' ||
    raw.baggagePreset === 'custom'
      ? raw.baggagePreset
      : 'standard';

  const carryOnLimitKg =
    typeof raw.carryOnLimitKg === 'number' && Number.isFinite(raw.carryOnLimitKg)
      ? Math.min(25, Math.max(0, Number(raw.carryOnLimitKg.toFixed(1))))
      : DEFAULT_APP_PREFERENCES.carryOnLimitKg;
  const checkedLimitKg =
    typeof raw.checkedLimitKg === 'number' && Number.isFinite(raw.checkedLimitKg)
      ? Math.min(64, Math.max(0, Number(raw.checkedLimitKg.toFixed(1))))
      : DEFAULT_APP_PREFERENCES.checkedLimitKg;

  const trialStartedAt =
    typeof raw.trialStartedAt === 'number' &&
    Number.isFinite(raw.trialStartedAt) &&
    raw.trialStartedAt > 1_600_000_000_000
      ? Math.round(raw.trialStartedAt)
      : fallbackNow;

  const proExpiresAt =
    typeof raw.proExpiresAt === 'number' &&
    Number.isFinite(raw.proExpiresAt) &&
    raw.proExpiresAt > 1_600_000_000_000
      ? Math.round(raw.proExpiresAt)
      : null;

  const redeemedCode =
    typeof raw.redeemedCode === 'string' ? raw.redeemedCode.trim().slice(0, 20) : '';

  const aiAuditUsedCount =
    typeof raw.aiAuditUsedCount === 'number' && Number.isFinite(raw.aiAuditUsedCount)
      ? Math.max(0, Math.min(9999, Math.floor(raw.aiAuditUsedCount)))
      : 0;

  const trialSimulationMode: TrialSimulationMode =
    raw.trialSimulationMode === 'expired' ? 'expired' : 'normal';

  const rawAff = raw.affiliatePartners;
  const cleanStr = (val: unknown, fallback: string) =>
    typeof val === 'string' && val.trim() ? val.trim().slice(0, 64) : fallback;
  const affiliatePartners: AffiliatePartnerConfig = {
    amazonTag: cleanStr(rawAff?.amazonTag, DEFAULT_AFFILIATE_PARTNERS.amazonTag),
    klookAid: cleanStr(rawAff?.klookAid, DEFAULT_AFFILIATE_PARTNERS.klookAid),
    getYourGuidePartnerId: cleanStr(
      rawAff?.getYourGuidePartnerId,
      DEFAULT_AFFILIATE_PARTNERS.getYourGuidePartnerId
    ),
    tripComAllianceId: cleanStr(
      rawAff?.tripComAllianceId,
      DEFAULT_AFFILIATE_PARTNERS.tripComAllianceId
    ),
    airaloRef: cleanStr(rawAff?.airaloRef, DEFAULT_AFFILIATE_PARTNERS.airaloRef),
    taobaoPid: cleanStr(rawAff?.taobaoPid, DEFAULT_AFFILIATE_PARTNERS.taobaoPid),
    disclosureEnabled:
      typeof rawAff?.disclosureEnabled === 'boolean'
        ? rawAff.disclosureEnabled
        : DEFAULT_AFFILIATE_PARTNERS.disclosureEnabled,
  };

  return {
    language,
    followSystemLanguage,
    unitSystem,
    timeFormat,
    homeCurrency,
    baggagePreset,
    carryOnLimitKg,
    checkedLimitKg,
    tabBadgeEnabled:
      typeof raw.tabBadgeEnabled === 'boolean'
        ? raw.tabBadgeEnabled
        : DEFAULT_APP_PREFERENCES.tabBadgeEnabled,
    workspaceBannerEnabled:
      typeof raw.workspaceBannerEnabled === 'boolean'
        ? raw.workspaceBannerEnabled
        : DEFAULT_APP_PREFERENCES.workspaceBannerEnabled,
    isProUnlocked: Boolean(raw.isProUnlocked),
    proPlan:
      raw.proPlan === 'monthly' || raw.proPlan === 'lifetime' || raw.proPlan === 'annual'
        ? raw.proPlan
        : 'annual',
    trialStartedAt,
    proExpiresAt,
    redeemedCode,
    aiAuditUsedCount,
    trialSimulationMode,
    affiliatePartners,
  };
}

export function loadAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_APP_PREFERENCES, trialStartedAt: Date.now() };
  }
  try {
    const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!saved) {
      const initial = sanitizePreferences(null);
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(saved) as Partial<AppPreferences>;
    const normalized = sanitizePreferences(parsed);
    // Persist when migrating legacy zh-CN prefs (or first-run trial stamp) to en-US / selectable langs.
    if (!parsed.trialStartedAt || parsed.language !== normalized.language) {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return sanitizePreferences(null);
  }
}

const GRAMS_TO_LB = 0.00220462262;
const GRAMS_TO_OZ = 0.0352739619;
const KG_TO_LB = 2.20462262;

export function formatTotalWeightByPref(grams: number, unitSystem: UnitSystem): string {
  const safeGrams = Math.max(0, grams);
  if (unitSystem === 'imperial') {
    return `${(safeGrams * GRAMS_TO_LB).toFixed(1)} lb`;
  }
  return `${(safeGrams / 1000).toFixed(1)} kg`;
}

export function formatWeightAgainstLimit(
  grams: number,
  limitKg: number,
  unitSystem: UnitSystem,
  decimalsForLimit = 1
): string {
  const safeGrams = Math.max(0, grams);
  const safeLimitKg = Math.max(0, limitKg);
  if (unitSystem === 'imperial') {
    const curLb = safeGrams * GRAMS_TO_LB;
    const limLb = safeLimitKg * KG_TO_LB;
    return `${curLb.toFixed(1)}/${limLb.toFixed(1)}lb`;
  }
  const curKg = safeGrams / 1000;
  const limText =
    decimalsForLimit === 0 && Number.isInteger(safeLimitKg)
      ? safeLimitKg.toFixed(0)
      : safeLimitKg.toFixed(1);
  return `${curKg.toFixed(2)}/${limText}kg`;
}

export function formatItemWeightByPref(grams: number, unitSystem: UnitSystem): string {
  const safeGrams = Math.max(0, Math.round(grams));
  if (unitSystem === 'imperial') {
    if (safeGrams >= 454) {
      return `${(safeGrams * GRAMS_TO_LB).toFixed(2)}lb`;
    }
    return `${(safeGrams * GRAMS_TO_OZ).toFixed(1)}oz`;
  }
  return `${safeGrams}g`;
}

export function formatTempRangeByPref(tempRange: string, unitSystem: UnitSystem): string {
  if (!tempRange || unitSystem === 'metric') return tempRange;
  if (!tempRange.includes('°C') && !tempRange.includes('℃')) return tempRange;

  const toF = (c: number) => Math.round((c * 9) / 5 + 32);

  return tempRange
    .replace(
      /(-?\d+)\s*([-~–—至到])\s*(-?\d+)\s*(?:°C|℃)/g,
      (_match, c1, sep, c2) => `${toF(Number(c1))}${sep}${toF(Number(c2))}°F`
    )
    .replace(/(-?\d+)\s*(?:°C|℃)/g, (_match, c) => `${toF(Number(c))}°F`);
}

export function formatTimeByPref(timeStr: string, timeFormat: TimeFormatPref): string {
  if (!timeStr || timeFormat === '24h') return timeStr;
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!m) return timeStr;
  const hour24 = Number(m[1]);
  const minute = m[2];
  if (!Number.isFinite(hour24) || hour24 < 0 || hour24 > 23) return timeStr;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

export function formatHomeCurrencyEquivalent(
  localAmount: number,
  localCurrencyCode: string,
  fxToUsd: number,
  homeCurrency: HomeCurrencyCode,
  budgetFx?: Pick<BudgetState, 'customFxLocalToHome' | 'customFxHomeCode'> | null
): string {
  const fromCode = (localCurrencyCode || 'USD').trim().toUpperCase();
  const converted = convertCurrencyAmount(Math.abs(localAmount), fromCode, homeCurrency, {
    intelFxToUsd: fxToUsd,
    tripCurrencyCode: fromCode,
    budgetFx,
  });
  return formatCurrencyAmount(converted, homeCurrency, {
    withCode: true,
    compactDecimals: homeCurrency === 'CNY' || homeCurrency === 'HKD',
  });
}

export function formatDateByPref(dateStr: string, language: AppLanguage): string {
  if (!dateStr) return dateStr;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return dateStr;
  const [, yyyy, mm, dd] = m;
  if (language === 'en-US') {
    return `${mm}/${dd}/${yyyy}`;
  }
  if (language === 'de-DE') {
    return `${dd}.${mm}.${yyyy}`;
  }
  if (
    language === 'en-GB' ||
    language === 'es-MX' ||
    language === 'fr-FR' ||
    language === 'pt-BR'
  ) {
    return `${dd}/${mm}/${yyyy}`;
  }
  if (language === 'ja-JP') {
    return `${yyyy}/${mm}/${dd}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}


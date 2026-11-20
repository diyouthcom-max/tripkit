import type {
  AppLanguage,
  PackingClothingGender,
  PackingDensityLevel,
  PackingScenarioId,
  PackingTripPurpose,
  PackingWeatherOverride,
} from '../../types';
import { pickLang } from '../langHelper';

export interface PackingWizardUiCopy {
  backAria: string;
  closeAria: string;
  title: string;
  subtitle: string;
  tripLinkedLabel: string;
  tripCurrentLabel: string;
  routeSeparator: string;
  tripDaysPax: (days: number, travelers: number) => string;
  tripDaysOnly: (days: number) => string;
  weatherHeading: string;
  weatherFromForecast: string;
  expectDifferentWeather: string;
  weatherOverrides: Record<PackingWeatherOverride, string>;
  tripStyleHeading: string;
  tripPurposes: Record<PackingTripPurpose, string>;
  clothingStyleHeading: string;
  clothingStyles: Record<PackingClothingGender, string>;
  sizeHeading: string;
  sizeHelper: (mult: number) => string;
  densityHeading: string;
  luggageCards: Record<PackingDensityLevel, { title: string; badge: string; desc: string }>;
  densities: Record<PackingDensityLevel, string>;
  densityCaptions: Record<PackingDensityLevel, string>;
  laundryTitle: string;
  laundryLiveOnFeedback: (sets: number) => string;
  laundryLiveOffFeedback: (days: number) => string;
  laundryOn: string;
  laundryOff: string;
  anythingElseHeading: string;
  scenariosOptionalCount: (count: number) => string;
  clearAll: string;
  extraNotesLabel: string;
  voiceNoteBtn: string;
  notePlaceholder: string;
  memorySummary: (alwaysCount: number, neverCount: number) => string;
  alreadyPackedTitle: (count: number) => string;
  keepPackedBtn: string;
  startFreshBtn: string;
  errorFallbackHint: string;
  generatingBtn: string;
  generateBtn: string;
  instantOfflineBtn: string;
  destinationFallback: string;
  rainForecastPhrase: (rainDays: number, stayDays: number) => string;
  littleRainPhrase: string;
}

export const PACKING_SCENARIO_LABELS: Record<
  PackingScenarioId,
  {
    'zh-CN': string;
    'en-US': string;
    'en-GB': string;
    'es-MX': string;
    'fr-FR': string;
    'de-DE': string;
    'pt-BR': string;
    'ja-JP': string;
  }
> = {
  beach: {
    'zh-CN': '海滨 / 海滩度假',
    'en-US': 'Beach & Coastal',
    'en-GB': 'Beach & Coastal',
    'es-MX': 'Playa y costa',
    'fr-FR': 'Plage & littoral',
    'de-DE': 'Strand & Küste',
    'pt-BR': 'Praia e litoral',
    'ja-JP': 'ビーチ・海辺リゾート',
  },
  swimming: {
    'zh-CN': '游泳 / 浮潜',
    'en-US': 'Swimming & Snorkel',
    'en-GB': 'Swimming & Snorkel',
    'es-MX': 'Natación y esnórquel',
    'fr-FR': 'Natation & snorkeling',
    'de-DE': 'Schwimmen & Schnorcheln',
    'pt-BR': 'Natação e snorkel',
    'ja-JP': '水泳・シュノーケリング',
  },
  onsen: {
    'zh-CN': '温泉 / SPA',
    'en-US': 'Hot Spring / Onsen',
    'en-GB': 'Hot Spring / Spa',
    'es-MX': 'Aguas termales / Spa',
    'fr-FR': 'Sources chaudes / Spa',
    'de-DE': 'Therme / Onsen & Spa',
    'pt-BR': 'Termas / Spa',
    'ja-JP': '温泉・スパ',
  },
  hiking: {
    'zh-CN': '徒步登山',
    'en-US': 'Hiking & Trails',
    'en-GB': 'Hillwalking & Trails',
    'es-MX': 'Senderismo y montaña',
    'fr-FR': 'Randonnée & sentiers',
    'de-DE': 'Wandern & Trails',
    'pt-BR': 'Trilhas e montanha',
    'ja-JP': 'ハイキング・登山',
  },
  ski_snow: {
    'zh-CN': '滑雪 / 冰雪极寒',
    'en-US': 'Ski & Snow',
    'en-GB': 'Ski & Snow',
    'es-MX': 'Esquí y nieve',
    'fr-FR': 'Ski & neige',
    'de-DE': 'Ski & Schnee',
    'pt-BR': 'Esqui e neve',
    'ja-JP': 'スキー・雪山',
  },
  theme_park: {
    'zh-CN': '主题乐园暴走',
    'en-US': 'Theme Parks',
    'en-GB': 'Theme Parks',
    'es-MX': 'Parques temáticos',
    'fr-FR': 'Parcs à thème',
    'de-DE': 'Freizeitparks',
    'pt-BR': 'Parques temáticos',
    'ja-JP': 'テーマパーク',
  },
  camping: {
    'zh-CN': '露营户外',
    'en-US': 'Camping',
    'en-GB': 'Camping',
    'es-MX': 'Campamento',
    'fr-FR': 'Camping',
    'de-DE': 'Camping',
    'pt-BR': 'Camping',
    'ja-JP': 'キャンプ・アウトドア',
  },
  fitness: {
    'zh-CN': '健身 / 晨跑',
    'en-US': 'Gym & Running',
    'en-GB': 'Gym & Running',
    'es-MX': 'Gimnasio y carrera',
    'fr-FR': 'Sport & footing',
    'de-DE': 'Fitness & Laufen',
    'pt-BR': 'Academia e corrida',
    'ja-JP': 'ジム・ランニング',
  },
  photography: {
    'zh-CN': '摄影 / 航拍器材',
    'en-US': 'Photography & Drone',
    'en-GB': 'Photography & Drone',
    'es-MX': 'Fotografía y dron',
    'fr-FR': 'Photo & drone',
    'de-DE': 'Kamera & Drohne',
    'pt-BR': 'Fotografia e drone',
    'ja-JP': 'カメラ・ドローン撮影',
  },
  remote_work: {
    'zh-CN': '远程办公',
    'en-US': 'Work remotely',
    'en-GB': 'Work remotely',
    'es-MX': 'Trabajo remoto',
    'fr-FR': 'Télétravail',
    'de-DE': 'Remote-Arbeit',
    'pt-BR': 'Trabalho remoto',
    'ja-JP': 'リモートワーク',
  },
  formal_event: {
    'zh-CN': '正装 / 婚礼晚宴',
    'en-US': 'Formal / Fine Dining',
    'en-GB': 'Smart / Occasion',
    'es-MX': 'Etiqueta / Cena formal',
    'fr-FR': 'Tenue habillée / Gala',
    'de-DE': 'Abendgarderobe / Event',
    'pt-BR': 'Traje formal / Jantar',
    'ja-JP': 'フォーマル・記念日ディナー',
  },
  shopping_taxfree: {
    'zh-CN': '免税血拼 / 代购',
    'en-US': 'Tax-Free Shopping',
    'en-GB': 'VAT-Free Shopping',
    'es-MX': 'Compras Tax-Free',
    'fr-FR': 'Shopping & détaxe',
    'de-DE': 'Tax-Free-Shopping',
    'pt-BR': 'Compras Tax-Free',
    'ja-JP': '免税ショッピング',
  },
  baby: {
    'zh-CN': '带婴儿同行',
    'en-US': 'Traveling with a baby',
    'en-GB': 'Travelling with a baby',
    'es-MX': 'Viajar con bebé',
    'fr-FR': 'Voyager avec un bébé',
    'de-DE': 'Reisen mit Baby',
    'pt-BR': 'Viajando com bebê',
    'ja-JP': '赤ちゃん連れ',
  },
  kids: {
    'zh-CN': '儿童同行',
    'en-US': 'Kids',
    'en-GB': 'Kids',
    'es-MX': 'Niños',
    'fr-FR': 'Enfants',
    'de-DE': 'Kinder',
    'pt-BR': 'Crianças',
    'ja-JP': '子ども連れ',
  },
  medication: {
    'zh-CN': '规律服药',
    'en-US': 'Medication',
    'en-GB': 'Medication',
    'es-MX': 'Medicación',
    'fr-FR': 'Traitement médical',
    'de-DE': 'Medikamente',
    'pt-BR': 'Medicação contínua',
    'ja-JP': '常備・処方薬',
  },
  sensitive_skin: {
    'zh-CN': '敏感肌修护',
    'en-US': 'Sensitive skin',
    'en-GB': 'Sensitive skin',
    'es-MX': 'Piel sensible',
    'fr-FR': 'Peau sensible',
    'de-DE': 'Empfindliche Haut',
    'pt-BR': 'Pele sensível',
    'ja-JP': '敏感肌ケア',
  },
  cabin_only: {
    'zh-CN': '仅带登机箱',
    'en-US': 'Carry-on only',
    'en-GB': 'Cabin bag only',
    'es-MX': 'Solo equipaje de mano',
    'fr-FR': 'Bagage cabine seul',
    'de-DE': 'Nur Handgepäck',
    'pt-BR': 'Só bagagem de mão',
    'ja-JP': '機内持ち込みのみ',
  },
};

export function getPackingScenarioLabel(id: PackingScenarioId, lang: AppLanguage): string {
  return pickLang(lang, PACKING_SCENARIO_LABELS[id]);
}

const PACKING_WIZARD_UI_MAP = {
  'zh-CN': {
    backAria: '返回',
    closeAria: '关闭',
    title: '定制专属打包清单',
    subtitle: '根据途经站点微气候、箱包空间与出行场景，动态生成多维细分清单。',
    tripLinkedLabel: '关联行程',
    tripCurrentLabel: '当前行程',
    routeSeparator: ' → ',
    tripDaysPax: (days, travelers) => `${days} 天 · ${travelers} 人同行`,
    tripDaysOnly: (days) => `${days} 天`,
    weatherHeading: '途经天气',
    weatherFromForecast: '按站点与出行月份推算',
    expectDifferentWeather: '个人体感不同或担心变天？',
    weatherOverrides: {
      colder: '保暖+',
      warmer: '轻薄',
      wetter: '防雨+',
    },
    tripStyleHeading: '出行性质',
    tripPurposes: {
      leisure: '休闲度假',
      business: '商务出差',
      both: '商务+休闲',
    },
    clothingStyleHeading: '穿搭与个人护理偏好',
    clothingStyles: {
      male: '男装护理',
      female: '女装美护',
      other: '通用中性',
    },
    sizeHeading: '衣物尺码',
    sizeHelper: (mult) => `用于精准校准随身/托运行李克重预测（当前衣物克重系数 ×${mult.toFixed(2)}）。`,
    densityHeading: '箱包物理约束',
    luggageCards: {
      light: {
        title: '极简随身',
        badge: '双肩包 / 随身袋',
        desc: 'AI 严苛过滤备用衣物与大件，严格遵循登机限制',
      },
      moderate: {
        title: '标准登机',
        badge: '20 寸登机箱',
        desc: '标准 4~5 套胶囊分装，兼顾轻便与防遗漏',
      },
      fully_loaded: {
        title: '满载托运',
        badge: '24~28 寸托运箱',
        desc: '全场景完整收纳，含备用穿搭与大瓶洗护空间',
      },
    },
    densities: {
      light: '极简随身',
      moderate: '标准登机',
      fully_loaded: '满载托运',
    },
    densityCaptions: {
      light: '极简胶囊行装 · 仅留核心刚需（约 26 项）',
      moderate: '均衡防遗漏清单 · 兼顾细致单品与轻便（约 45 项）',
      fully_loaded: '全场景完备清单 · 含备用件与细节护理（约 62 项）',
    },
    laundryTitle: '中途洗衣（可少带 40% 衣物）',
    laundryLiveOnFeedback: (sets) => `开启后，衣物清单自动精简至 ${sets} 套`,
    laundryLiveOffFeedback: (days) => `未开启 · 按全程 ${days} 天备衣`,
    laundryOn: '途中洗衣减重 已开启 ✓',
    laundryOff: '开启途中洗衣减重',
    anythingElseHeading: '还有其他特殊场景吗？',
    scenariosOptionalCount: (count) => `可选 · 已勾选 ${count} 个专属分类场景`,
    clearAll: '清空已选',
    extraNotesLabel: '补充特殊装备说明（支持语音输入）',
    voiceNoteBtn: '语音补充',
    notePlaceholder: '例如：参加朋友婚礼、冲绳浮潜、泡日式温泉、需要带微单三脚架...',
    memorySummary: (a, n) =>
      `个人记忆已生效：自动并入 ${a} 件「常备必带」· 自动过滤 ${n} 件「不再推荐」单品。`,
    alreadyPackedTitle: (count) => `当前清单已勾选打包 ${count} 件物品`,
    keepPackedBtn: '智能合并（保留已勾选）',
    startFreshBtn: '全新覆盖生成',
    errorFallbackHint: '你可以重试 AI 生成，或点击下方「免等待秒速生成」立即使用。',
    generatingBtn: '正在深度定制多分类打包清单...',
    generateBtn: 'AI 生成我的专属清单',
    instantOfflineBtn: '免等待 · 按所选箱包与场景秒速生成清单',
    destinationFallback: '目的地',
    rainForecastPhrase: (rainDays, stayDays) => `${stayDays} 天中约 ${rainDays} 天有雨`,
    littleRainPhrase: '降水概率低',
  },
  'en-US': {
    backAria: 'Back',
    closeAria: 'Close',
    title: 'New Packing List',
    subtitle: "Built from your trip's destinations, dates and weather.",
    tripLinkedLabel: 'Trip',
    tripCurrentLabel: 'Trip',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} days · ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}`,
    tripDaysOnly: (days) => `${days} days`,
    weatherHeading: 'Weather',
    weatherFromForecast: 'From the forecast',
    expectDifferentWeather: 'Expect different weather?',
    weatherOverrides: {
      colder: 'Warmer',
      warmer: 'Lighter',
      wetter: 'Rain+',
    },
    tripStyleHeading: 'Trip style',
    tripPurposes: {
      leisure: 'Leisure',
      business: 'Business',
      both: 'Both',
    },
    clothingStyleHeading: 'Clothing style',
    clothingStyles: {
      male: 'Male',
      female: 'Female',
      other: 'Other',
    },
    sizeHeading: 'Size',
    sizeHelper: (mult) => `Helps estimate your bag weight (garment weight factor ×${mult.toFixed(2)}).`,
    densityHeading: 'Luggage & Space Constraint',
    luggageCards: {
      light: {
        title: 'Ultralight Personal',
        badge: 'Backpack / Under-seat',
        desc: 'Strict AI trim on spare outfits & bulky gear; carry-on compliant',
      },
      moderate: {
        title: 'Standard Carry-On',
        badge: '20" Cabin Roller',
        desc: 'Balanced 4–5 outfit capsule packing; skip baggage claim',
      },
      fully_loaded: {
        title: 'Full Checked Bag',
        badge: '24–28" Suitcase',
        desc: 'Full-scene packing with spare looks, full-size toiletries & shopping room',
      },
    },
    densities: {
      light: 'Ultralight Personal',
      moderate: 'Standard Carry-On',
      fully_loaded: 'Full Checked Bag',
    },
    densityCaptions: {
      light: 'Ultralight essentials only (~26 items)',
      moderate: 'A balanced list (~45 items)',
      fully_loaded: 'Every detail & backup covered (~62 items)',
    },
    laundryTitle: 'Mid-Trip Laundry (Pack ~40% less)',
    laundryLiveOnFeedback: (sets) => `On — wardrobe auto-trimmed to ${sets} outfits`,
    laundryLiveOffFeedback: (days) => `Off — packing full ${days}-day wardrobe`,
    laundryOn: 'Mid-trip laundry ON ✓',
    laundryOff: 'Add mid-trip laundry',
    anythingElseHeading: 'Anything else?',
    scenariosOptionalCount: (count) => `Optional · ${count} active`,
    clearAll: 'Clear all',
    extraNotesLabel: 'Extra packing notes (voice or text)',
    voiceNoteBtn: 'Voice Note',
    notePlaceholder: 'e.g. carry-on only, attending a wedding, bringing a drone',
    memorySummary: (a, n) =>
      `Memory active: auto-includes ${a} Always-Pack item(s) · blocks ${n} hidden item(s).`,
    alreadyPackedTitle: (count) => `You already packed ${count} item(s)`,
    keepPackedBtn: 'Keep packed progress',
    startFreshBtn: 'Start fresh list',
    errorFallbackHint: 'You can retry AI generation or click "Instant smart template" below.',
    generatingBtn: 'Generating tailored list...',
    generateBtn: 'Generate my list',
    instantOfflineBtn: 'Or generate instant offline smart list (0s)',
    destinationFallback: 'Destination',
    rainForecastPhrase: (rainDays, stayDays) =>
      `rain likely on ${rainDays} of ${stayDays} ${stayDays === 1 ? 'day' : 'days'}`,
    littleRainPhrase: 'little rain expected',
  },
  'en-GB': {
    backAria: 'Back',
    closeAria: 'Close',
    title: 'New Packing List',
    subtitle: "Built from your journey's destinations, dates and weather.",
    tripLinkedLabel: 'Journey',
    tripCurrentLabel: 'Journey',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} days · ${travelers} ${travelers === 1 ? 'traveller' : 'travellers'}`,
    tripDaysOnly: (days) => `${days} days`,
    weatherHeading: 'Weather',
    weatherFromForecast: 'From the forecast',
    expectDifferentWeather: 'Expect different weather?',
    weatherOverrides: {
      colder: 'Warmer',
      warmer: 'Lighter',
      wetter: 'Rain+',
    },
    tripStyleHeading: 'Journey style',
    tripPurposes: {
      leisure: 'Leisure',
      business: 'Business',
      both: 'Both',
    },
    clothingStyleHeading: 'Clothing style',
    clothingStyles: {
      male: 'Male',
      female: 'Female',
      other: 'Other',
    },
    sizeHeading: 'Size',
    sizeHelper: (mult) => `Helps estimate your bag weight (garment weight factor ×${mult.toFixed(2)}).`,
    densityHeading: 'Luggage & Space Constraint',
    luggageCards: {
      light: {
        title: 'Ultralight Personal',
        badge: 'Backpack / Under-seat',
        desc: 'Strict AI trim on spare outfits & bulky kit; cabin compliant',
      },
      moderate: {
        title: 'Standard Cabin Bag',
        badge: '20" Cabin Case',
        desc: 'Balanced 4–5 outfit capsule packing; skip baggage reclaim',
      },
      fully_loaded: {
        title: 'Full Hold Luggage',
        badge: '24–28" Suitcase',
        desc: 'Full-scene packing with spare looks, full-size toiletries & shopping room',
      },
    },
    densities: {
      light: 'Ultralight Personal',
      moderate: 'Standard Cabin Bag',
      fully_loaded: 'Full Hold Luggage',
    },
    densityCaptions: {
      light: 'Ultralight essentials only (~26 items)',
      moderate: 'A balanced list (~45 items)',
      fully_loaded: 'Every detail & backup covered (~62 items)',
    },
    laundryTitle: 'Mid-Trip Laundry (Pack ~40% less)',
    laundryLiveOnFeedback: (sets) => `On — wardrobe auto-trimmed to ${sets} outfits`,
    laundryLiveOffFeedback: (days) => `Off — packing full ${days}-day wardrobe`,
    laundryOn: 'Mid-trip laundry ON ✓',
    laundryOff: 'Add mid-trip laundry',
    anythingElseHeading: 'Anything else?',
    scenariosOptionalCount: (count) => `Optional · ${count} active`,
    clearAll: 'Clear all',
    extraNotesLabel: 'Extra packing notes (voice or text)',
    voiceNoteBtn: 'Voice Note',
    notePlaceholder: 'e.g. cabin bag only, attending a wedding, bringing a drone',
    memorySummary: (a, n) =>
      `Memory active: auto-includes ${a} Always-Pack item(s) · blocks ${n} hidden item(s).`,
    alreadyPackedTitle: (count) => `You already packed ${count} item(s)`,
    keepPackedBtn: 'Keep packed progress',
    startFreshBtn: 'Start fresh list',
    errorFallbackHint: 'You can retry AI generation or click "Instant smart template" below.',
    generatingBtn: 'Generating tailored list...',
    generateBtn: 'Generate my list',
    instantOfflineBtn: 'Or generate instant offline smart list (0s)',
    destinationFallback: 'Destination',
    rainForecastPhrase: (rainDays, stayDays) =>
      `rain likely on ${rainDays} of ${stayDays} ${stayDays === 1 ? 'day' : 'days'}`,
    littleRainPhrase: 'little rain expected',
  },
  'es-MX': {
    backAria: 'Volver',
    closeAria: 'Cerrar',
    title: 'Nueva lista de equipaje',
    subtitle: 'Creada según tus destinos, fechas, clima y equipaje.',
    tripLinkedLabel: 'Viaje',
    tripCurrentLabel: 'Viaje',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} días · ${travelers} ${travelers === 1 ? 'viajero' : 'viajeros'}`,
    tripDaysOnly: (days) => `${days} días`,
    weatherHeading: 'Clima',
    weatherFromForecast: 'Según el pronóstico',
    expectDifferentWeather: '¿Esperas otro clima?',
    weatherOverrides: {
      colder: 'Abrigo+',
      warmer: 'Ligero',
      wetter: 'Lluvia+',
    },
    tripStyleHeading: 'Tipo de viaje',
    tripPurposes: {
      leisure: 'Vacaciones',
      business: 'Negocios',
      both: 'Ambos',
    },
    clothingStyleHeading: 'Estilo de ropa',
    clothingStyles: {
      male: 'Hombre',
      female: 'Mujer',
      other: 'Unisex',
    },
    sizeHeading: 'Talla',
    sizeHelper: (mult) =>
      `Calibra el peso estimado de tu maleta (factor de prenda ×${mult.toFixed(2)}).`,
    densityHeading: 'Tipo de equipaje',
    luggageCards: {
      light: {
        title: 'Mochila minimalista',
        badge: 'Artículo personal',
        desc: 'IA filtra ropa extra y bultos; 100% apto para cabina',
      },
      moderate: {
        title: 'Cabina estándar',
        badge: 'Maleta 20" de mano',
        desc: 'Cápsula equilibrada de 4–5 conjuntos sin documentar',
      },
      fully_loaded: {
        title: 'Maleta documentada',
        badge: 'Maleta 24–28"',
        desc: 'Equipaje completo para todo escenario, extras y compras',
      },
    },
    densities: {
      light: 'Mochila minimalista',
      moderate: 'Cabina estándar',
      fully_loaded: 'Maleta documentada',
    },
    densityCaptions: {
      light: 'Solo lo esencial ultraligero (~26 artículos)',
      moderate: 'Lista equilibrada sin olvidos (~45 artículos)',
      fully_loaded: 'Todos los extras y respaldos (~62 artículos)',
    },
    laundryTitle: 'Lavado en ruta (lleva ~40% menos ropa)',
    laundryLiveOnFeedback: (sets) => `Activo — ropa reducida a ${sets} conjuntos`,
    laundryLiveOffFeedback: (days) => `Inactivo · Ropa para ${days} días`,
    laundryOn: 'Lavado a mitad de viaje SÍ ✓',
    laundryOff: 'Agregar lavado a mitad de viaje',
    anythingElseHeading: '¿Algo más?',
    scenariosOptionalCount: (count) => `Opcional · ${count} activos`,
    clearAll: 'Limpiar todo',
    extraNotesLabel: 'Notas adicionales (voz o texto)',
    voiceNoteBtn: 'Nota de voz',
    notePlaceholder: 'ej. solo equipaje de mano, boda, llevar dron',
    memorySummary: (a, n) =>
      `Memoria activa: incluye ${a} fijo(s) de Siempre empacar · oculta ${n} bloqueado(s).`,
    alreadyPackedTitle: (count) => `Ya marcaste ${count} artículo(s) como empacados`,
    keepPackedBtn: 'Conservar progreso',
    startFreshBtn: 'Empezar de cero',
    errorFallbackHint: 'Puedes reintentar con IA o usar la plantilla inteligente sin conexión.',
    generatingBtn: 'Generando tu lista personalizada...',
    generateBtn: 'Generar mi lista con IA',
    instantOfflineBtn: 'O generar lista inteligente sin conexión (0s)',
    destinationFallback: 'Destino',
    rainForecastPhrase: (rainDays, stayDays) =>
      `lluvia probable ${rainDays} de ${stayDays} ${stayDays === 1 ? 'día' : 'días'}`,
    littleRainPhrase: 'poca lluvia esperada',
  },
  'fr-FR': {
    backAria: 'Retour',
    closeAria: 'Fermer',
    title: 'Nouvelle liste de bagages',
    subtitle: 'Adaptée à vos étapes, dates, météo et bagage.',
    tripLinkedLabel: 'Voyage',
    tripCurrentLabel: 'Voyage',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} jours · ${travelers} ${travelers === 1 ? 'voyageur' : 'voyageurs'}`,
    tripDaysOnly: (days) => `${days} jours`,
    weatherHeading: 'Météo',
    weatherFromForecast: 'D’après les prévisions',
    expectDifferentWeather: 'Une autre météo attendue ?',
    weatherOverrides: {
      colder: 'Chaud+',
      warmer: 'Léger',
      wetter: 'Pluie+',
    },
    tripStyleHeading: 'Type de voyage',
    tripPurposes: {
      leisure: 'Loisirs',
      business: 'Affaires',
      both: 'Les deux',
    },
    clothingStyleHeading: 'Style vestimentaire',
    clothingStyles: {
      male: 'Homme',
      female: 'Femme',
      other: 'Mixte',
    },
    sizeHeading: 'Taille',
    sizeHelper: (mult) =>
      `Affine l’estimation du poids des vêtements (facteur ×${mult.toFixed(2)}).`,
    densityHeading: 'Format de bagage',
    luggageCards: {
      light: {
        title: 'Sac minimaliste',
        badge: 'Sac à dos / Cabine',
        desc: 'Tri strict IA des tenues de rechange ; format cabine strict',
      },
      moderate: {
        title: 'Valise cabine',
        badge: 'Valise 55 cm',
        desc: 'Capsule équilibrée de 4 à 5 tenues, sans attente en soute',
      },
      fully_loaded: {
        title: 'Valise en soute',
        badge: 'Grande valise',
        desc: 'Rangement complet tous scénarios, tenues de rechange & achats',
      },
    },
    densities: {
      light: 'Sac minimaliste',
      moderate: 'Valise cabine',
      fully_loaded: 'Valise en soute',
    },
    densityCaptions: {
      light: 'Essentiels ultralégers uniquement (~26 articles)',
      moderate: 'Liste équilibrée sans oubli (~45 articles)',
      fully_loaded: 'Tout le nécessaire et les extras (~62 articles)',
    },
    laundryTitle: 'Lessive en voyage (-40% de vêtements)',
    laundryLiveOnFeedback: (sets) => `Activé — garde-robe allégée à ${sets} tenues`,
    laundryLiveOffFeedback: (days) => `Désactivé · Prévu pour ${days} jours`,
    laundryOn: 'Lessive en cours de séjour OUI ✓',
    laundryOff: 'Ajouter une lessive en séjour',
    anythingElseHeading: 'Autre chose ?',
    scenariosOptionalCount: (count) => `Optionnel · ${count} actifs`,
    clearAll: 'Tout effacer',
    extraNotesLabel: 'Précisions supplémentaires (voix ou texte)',
    voiceNoteBtn: 'Dictée vocale',
    notePlaceholder: 'ex. bagage cabine seul, mariage, emporter un drone',
    memorySummary: (a, n) =>
      `Mémoire active : ${a} article(s) Toujours emporter · ${n} masqué(s).`,
    alreadyPackedTitle: (count) => `Vous avez déjà préparé ${count} article(s)`,
    keepPackedBtn: 'Garder la progression',
    startFreshBtn: 'Repartir à zéro',
    errorFallbackHint: 'Réessayez la génération IA ou utilisez le modèle hors ligne ci-dessous.',
    generatingBtn: 'Création de votre liste sur mesure...',
    generateBtn: 'Générer ma liste avec l’IA',
    instantOfflineBtn: 'Ou générer la liste hors ligne instantanément (0s)',
    destinationFallback: 'Destination',
    rainForecastPhrase: (rainDays, stayDays) =>
      `pluie probable ${rainDays} ${stayDays === 1 ? 'jour' : 'jours'} sur ${stayDays}`,
    littleRainPhrase: 'peu de pluie attendue',
  },
  'de-DE': {
    backAria: 'Zurück',
    closeAria: 'Schließen',
    title: 'Neue Packliste',
    subtitle: 'Passend zu deinen Zielen, Reisedaten, Wetter und Gepäck.',
    tripLinkedLabel: 'Reise',
    tripCurrentLabel: 'Reise',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} Tage · ${travelers} ${travelers === 1 ? 'Person' : 'Personen'}`,
    tripDaysOnly: (days) => `${days} Tage`,
    weatherHeading: 'Wetter',
    weatherFromForecast: 'Laut Prognose',
    expectDifferentWeather: 'Anderes Wetter erwartet?',
    weatherOverrides: {
      colder: 'Wärmer',
      warmer: 'Leicht',
      wetter: 'Regen+',
    },
    tripStyleHeading: 'Reiseart',
    tripPurposes: {
      leisure: 'Freizeit',
      business: 'Geschäftlich',
      both: 'Beides',
    },
    clothingStyleHeading: 'Kleidungsstil',
    clothingStyles: {
      male: 'Herren',
      female: 'Damen',
      other: 'Unisex',
    },
    sizeHeading: 'Kleidergröße',
    sizeHelper: (mult) =>
      `Kalibriert das geschätzte Bekleidungsgewicht (Faktor ×${mult.toFixed(2)}).`,
    densityHeading: 'Gepäckgröße',
    luggageCards: {
      light: {
        title: 'Ultraleicht-Rucksack',
        badge: 'Handgepäck klein',
        desc: 'KI streicht Ersatzkleidung strikt; voll kabinentauglich',
      },
      moderate: {
        title: 'Standard-Handgepäck',
        badge: 'Kabinentrolley',
        desc: 'Ausgewogene 4–5 Outfits als Kapsel; kein Gepäckband',
      },
      fully_loaded: {
        title: 'Aufgabegepäck',
        badge: 'Großer Koffer',
        desc: 'Komplett-Packliste mit Ersatz-Outfits, Pflege & Platz für Einkäufe',
      },
    },
    densities: {
      light: 'Ultraleicht-Rucksack',
      moderate: 'Standard-Handgepäck',
      fully_loaded: 'Aufgabegepäck',
    },
    densityCaptions: {
      light: 'Ultraleichte Essentials (~26 Teile)',
      moderate: 'Ausgewogene Liste (~45 Teile)',
      fully_loaded: 'Jedes Detail & Backup abgedeckt (~62 Teile)',
    },
    laundryTitle: 'Unterwegs waschen (~40% weniger Kleidung)',
    laundryLiveOnFeedback: (sets) => `Aktiv — automatisch auf ${sets} Outfits gekürzt`,
    laundryLiveOffFeedback: (days) => `Aus · Kleidung für volle ${days} Tage`,
    laundryOn: 'Unterwegs waschen AN ✓',
    laundryOff: 'Unterwegs waschen einplanen',
    anythingElseHeading: 'Noch etwas Besonderes?',
    scenariosOptionalCount: (count) => `Optional · ${count} aktiv`,
    clearAll: 'Alle löschen',
    extraNotesLabel: 'Zusätzliche Packnotizen (Sprache oder Text)',
    voiceNoteBtn: 'Sprachnotiz',
    notePlaceholder: 'z. B. nur Handgepäck, Hochzeit, Drohne mitnehmen',
    memorySummary: (a, n) =>
      `Gedächtnis aktiv: ${a} Immer-einpacken-Teil(e) · ${n} ausgeblendet.`,
    alreadyPackedTitle: (count) => `Bereits ${count} Teil(e) abgehakt`,
    keepPackedBtn: 'Fortschritt behalten',
    startFreshBtn: 'Neu erstellen',
    errorFallbackHint: 'Erneut per KI versuchen oder die Offline-Vorlage unten nutzen.',
    generatingBtn: 'Erstelle maßgeschneiderte Liste...',
    generateBtn: 'Meine Packliste generieren',
    instantOfflineBtn: 'Oder sofortige Offline-Vorlage erstellen (0s)',
    destinationFallback: 'Reiseziel',
    rainForecastPhrase: (rainDays, stayDays) =>
      `Regen an ca. ${rainDays} von ${stayDays} ${stayDays === 1 ? 'Tag' : 'Tagen'}`,
    littleRainPhrase: 'kaum Regen erwartet',
  },
  'pt-BR': {
    backAria: 'Voltar',
    closeAria: 'Fechar',
    title: 'Nova lista de bagagem',
    subtitle: 'Montada com base nos destinos, datas, clima e bagagem.',
    tripLinkedLabel: 'Viagem',
    tripCurrentLabel: 'Viagem',
    routeSeparator: ', ',
    tripDaysPax: (days, travelers) =>
      `${days} dias · ${travelers} ${travelers === 1 ? 'viajante' : 'viajantes'}`,
    tripDaysOnly: (days) => `${days} dias`,
    weatherHeading: 'Clima',
    weatherFromForecast: 'Pela previsão',
    expectDifferentWeather: 'Espera um clima diferente?',
    weatherOverrides: {
      colder: 'Quente+',
      warmer: 'Leve',
      wetter: 'Chuva+',
    },
    tripStyleHeading: 'Estilo da viagem',
    tripPurposes: {
      leisure: 'Lazer',
      business: 'Negócios',
      both: 'Ambos',
    },
    clothingStyleHeading: 'Estilo de roupa',
    clothingStyles: {
      male: 'Masculino',
      female: 'Feminino',
      other: 'Unissex',
    },
    sizeHeading: 'Tamanho',
    sizeHelper: (mult) =>
      `Ajuda a estimar o peso da mala (fator de roupa ×${mult.toFixed(2)}).`,
    densityHeading: 'Tipo de bagagem',
    luggageCards: {
      light: {
        title: 'Mochila minimalista',
        badge: 'Item pessoal',
        desc: 'IA filtra roupas extras e volumes; 100% padrão de cabine',
      },
      moderate: {
        title: 'Mala de bordo',
        badge: 'Mala 20" cabine',
        desc: 'Cápsula equilibrada de 4–5 looks sem despachar bagagem',
      },
      fully_loaded: {
        title: 'Mala despachada',
        badge: 'Mala 24–28"',
        desc: 'Organização completa para todos os cenários, reservas e compras',
      },
    },
    densities: {
      light: 'Mochila minimalista',
      moderate: 'Mala de bordo',
      fully_loaded: 'Mala despachada',
    },
    densityCaptions: {
      light: 'Apenas o essencial ultraleve (~26 itens)',
      moderate: 'Lista equilibrada (~45 itens)',
      fully_loaded: 'Todos os detalhes e reservas (~62 itens)',
    },
    laundryTitle: 'Lavanderia na viagem (~40% menos roupas)',
    laundryLiveOnFeedback: (sets) => `Ativo — roupas reduzidas para ${sets} looks`,
    laundryLiveOffFeedback: (days) => `Inativo · Mala para ${days} dias completos`,
    laundryOn: 'Lavanderia na viagem SIM ✓',
    laundryOff: 'Incluir lavanderia na viagem',
    anythingElseHeading: 'Algo mais?',
    scenariosOptionalCount: (count) => `Opcional · ${count} ativos`,
    clearAll: 'Limpar tudo',
    extraNotesLabel: 'Notas extras de mala (voz ou texto)',
    voiceNoteBtn: 'Nota de voz',
    notePlaceholder: 'ex. só bagagem de mão, casamento, levar drone',
    memorySummary: (a, n) =>
      `Memória ativa: inclui ${a} item(ns) fixo(s) · bloqueia ${n} oculto(s).`,
    alreadyPackedTitle: (count) => `Você já marcou ${count} item(ns)`,
    keepPackedBtn: 'Manter progresso',
    startFreshBtn: 'Começar do zero',
    errorFallbackHint: 'Tente gerar com IA novamente ou use o modelo offline abaixo.',
    generatingBtn: 'Gerando lista sob medida...',
    generateBtn: 'Gerar minha lista com IA',
    instantOfflineBtn: 'Ou gerar lista inteligente offline (0s)',
    destinationFallback: 'Destino',
    rainForecastPhrase: (rainDays, stayDays) =>
      `chuva provável em ${rainDays} de ${stayDays} ${stayDays === 1 ? 'dia' : 'dias'}`,
    littleRainPhrase: 'pouca chuva prevista',
  },
  'ja-JP': {
    backAria: '戻る',
    closeAria: '閉じる',
    title: 'パッキングリストを作成',
    subtitle: '経由地の気候・バッグ規格・旅のシーンから多角的に自動設計します。',
    tripLinkedLabel: '対象の旅',
    tripCurrentLabel: '現在の旅',
    routeSeparator: '・',
    tripDaysPax: (days, travelers) => `${days}日間 · ${travelers}名`,
    tripDaysOnly: (days) => `${days}日間`,
    weatherHeading: '経由地の天気',
    weatherFromForecast: '季節予報から算出',
    expectDifferentWeather: '寒暖や雨の備えを調整しますか？',
    weatherOverrides: {
      colder: '暖かめ',
      warmer: '軽装',
      wetter: '雨対策+',
    },
    tripStyleHeading: '旅の目的',
    tripPurposes: {
      leisure: '観光・レジャー',
      business: '出張・ビジネス',
      both: '仕事＋観光',
    },
    clothingStyleHeading: '服装・ケアの好み',
    clothingStyles: {
      male: 'メンズ',
      female: 'レディース',
      other: 'ユニセックス',
    },
    sizeHeading: '衣類サイズ',
    sizeHelper: (mult) =>
      `手荷物・預け荷物の重量予測を補正します（衣類係数 ×${mult.toFixed(2)}）。`,
    densityHeading: 'バッグ規格と容量',
    luggageCards: {
      light: {
        title: 'ミニマル手荷物',
        badge: 'リュック / 機内持込',
        desc: '予備服やかさばる荷物をAIが厳格カット・機内持込対応',
      },
      moderate: {
        title: '標準キャリー',
        badge: '機内持込スーツケース',
        desc: '4〜5着の標準カプセル構成・預け入れ不要でスマート移動',
      },
      fully_loaded: {
        title: 'フル預け荷物',
        badge: '大型スーツケース',
        desc: '全シーン対応のフル収納・予備コーデや買い物スペースも確保',
      },
    },
    densities: {
      light: 'ミニマル手荷物',
      moderate: '標準キャリー',
      fully_loaded: 'フル預け荷物',
    },
    densityCaptions: {
      light: '必要最小限のカプセル装備（約26点）',
      moderate: '軽さと漏れ防止を両立（約45点）',
      fully_loaded: '予備品・細かいケアまで網羅（約62点）',
    },
    laundryTitle: '旅先で洗濯する（衣類を約40%削減）',
    laundryLiveOnFeedback: (sets) => `ON — 衣類リストを自動で ${sets} セットに最適化`,
    laundryLiveOffFeedback: (days) => `OFF · 全 ${days}日分で計算`,
    laundryOn: '旅先での洗濯 ON ✓',
    laundryOff: '旅先での洗濯を追加',
    anythingElseHeading: 'その他の特別シーン',
    scenariosOptionalCount: (count) => `任意 · ${count}件選択中`,
    clearAll: 'すべて解除',
    extraNotesLabel: '補足メモ（音声・テキスト）',
    voiceNoteBtn: '音声メモ',
    notePlaceholder: '例：機内持ち込み7kgのみ、結婚式、温泉、ドローン持参など',
    memorySummary: (a, n) =>
      `マイメモリ適用中：「必須常備」${a}件を追加 ·「提案しない」${n}件を除外。`,
    alreadyPackedTitle: (count) => `すでに ${count} 件がパッキング済みです`,
    keepPackedBtn: '進捗を保持して統合',
    startFreshBtn: '新しく作り直す',
    errorFallbackHint: 'AI 生成を再試行するか、下の「オフライン即時作成」をご利用ください。',
    generatingBtn: '専用パッキングリストを生成中...',
    generateBtn: 'AI で専用リストを生成',
    instantOfflineBtn: 'またはオフラインで即時生成 (0秒)',
    destinationFallback: '目的地',
    rainForecastPhrase: (rainDays, stayDays) => `${stayDays}日間のうち約${rainDays}日雨予報`,
    littleRainPhrase: '降水確率低め',
  },
} satisfies Record<AppLanguage, PackingWizardUiCopy>;

export function getPackingWizardUiCopy(lang: AppLanguage): PackingWizardUiCopy {
  return pickLang(lang, PACKING_WIZARD_UI_MAP);
}

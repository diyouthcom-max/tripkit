import type { AppLanguage } from '../../types';
import { pickLang } from '../langHelper';

export type ClimateSeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
export type Step1VibeKey = '休闲度假' | '长期数字游民' | '商务出差' | '浪漫蜜月';

export interface Step1ManifestCopy {
  stepOfTotal: (step: number, total: number) => string;
  backBtn: string;
  title: string;
  subtitle: string;
  sectionDestination: string;
  addStopPlaceholder: string;
  firstStopPlaceholder: string;
  addActionShort: string;
  sectionDates: string;
  climateSeasons: Record<ClimateSeasonKey, string>;
  sectionWho: string;
  whoPresets: [string, string, string, string];
  sectionVibe: string;
  vibeLabels: Record<Step1VibeKey, string>;
  nextWhatToPackBtn: string;
}

const STEP1_MANIFEST_MAP: Record<AppLanguage, Step1ManifestCopy> = {
  'zh-CN': {
    stepOfTotal: (step, total) => `${step} / ${total}`,
    backBtn: '返回',
    title: '去哪儿，何时启程？',
    subtitle: '路线、日程与同行伙伴，一页定好启程单。',
    sectionDestination: '目的地',
    addStopPlaceholder: '添加下一站（如 上海、杭州）',
    firstStopPlaceholder: '添加目的地（如 苏州、京都、巴黎）',
    addActionShort: '添加',
    sectionDates: '日程跨度',
    climateSeasons: {
      spring: '春季气候',
      summer: '夏季气候',
      autumn: '秋季气候',
      winter: '冬季气候',
    },
    sectionWho: '同行成员',
    whoPresets: ['独行', '双人', '家庭', '多人'],
    sectionVibe: '旅行主旋律',
    vibeLabels: {
      休闲度假: '休闲与美食',
      长期数字游民: '数字游民',
      商务出差: '商务差旅',
      浪漫蜜月: '浪漫蜜月',
    },
    nextWhatToPackBtn: '下一步：准备清单',
  },
  'en-US': {
    stepOfTotal: (step, total) => `${step} of ${total}`,
    backBtn: 'Back',
    title: 'Where & when?',
    subtitle: 'Route, calendar, and who you’re traveling with.',
    sectionDestination: 'Destination',
    addStopPlaceholder: 'Add a stop (e.g. Shanghai, Hangzhou)',
    firstStopPlaceholder: 'Add a destination (e.g. Suzhou, Kyoto, Paris)',
    addActionShort: 'Add',
    sectionDates: 'Dates & Duration',
    climateSeasons: {
      spring: 'Spring Climate',
      summer: 'Summer Climate',
      autumn: 'Autumn Climate',
      winter: 'Winter Climate',
    },
    sectionWho: 'Who’s Packing?',
    whoPresets: ['Solo', 'Couple', 'Family', 'Group'],
    sectionVibe: 'Trip Vibe',
    vibeLabels: {
      休闲度假: 'Leisure & Food',
      长期数字游民: 'Digital Nomad',
      商务出差: 'Business & Tech',
      浪漫蜜月: 'Honeymoon',
    },
    nextWhatToPackBtn: 'Next: What to Pack',
  },
  'en-GB': {
    stepOfTotal: (step, total) => `${step} of ${total}`,
    backBtn: 'Back',
    title: 'Where & when?',
    subtitle: 'Route, calendar, and who you’re travelling with.',
    sectionDestination: 'Destination',
    addStopPlaceholder: 'Add a stop (e.g. Bath, Edinburgh)',
    firstStopPlaceholder: 'Add a destination (e.g. Suzhou, Kyoto, Paris)',
    addActionShort: 'Add',
    sectionDates: 'Dates & Duration',
    climateSeasons: {
      spring: 'Spring Climate',
      summer: 'Summer Climate',
      autumn: 'Autumn Climate',
      winter: 'Winter Climate',
    },
    sectionWho: 'Who’s Packing?',
    whoPresets: ['Solo', 'Couple', 'Family', 'Group'],
    sectionVibe: 'Trip Vibe',
    vibeLabels: {
      休闲度假: 'Leisure & Food',
      长期数字游民: 'Digital Nomad',
      商务出差: 'Business & Tech',
      浪漫蜜月: 'Honeymoon',
    },
    nextWhatToPackBtn: 'Next: What to Pack',
  },
  'es-MX': {
    stepOfTotal: (step, total) => `${step} de ${total}`,
    backBtn: 'Atrás',
    title: '¿Dónde y cuándo?',
    subtitle: 'Ruta, calendario y con quién viajas.',
    sectionDestination: 'Destino',
    addStopPlaceholder: 'Agregar parada (ej. Oaxaca, Kioto)',
    firstStopPlaceholder: 'Agregar destino (ej. Suzhou, Kioto, París)',
    addActionShort: 'Agregar',
    sectionDates: 'Fechas y duración',
    climateSeasons: {
      spring: 'Clima primaveral',
      summer: 'Clima de verano',
      autumn: 'Clima de otoño',
      winter: 'Clima de invierno',
    },
    sectionWho: '¿Quiénes empacan?',
    whoPresets: ['Solo', 'Pareja', 'Familia', 'Grupo'],
    sectionVibe: 'Estilo del viaje',
    vibeLabels: {
      休闲度假: 'Ocio y comida',
      长期数字游民: 'Nómada digital',
      商务出差: 'Negocios y tech',
      浪漫蜜月: 'Luna de miel',
    },
    nextWhatToPackBtn: 'Siguiente: Qué empacar',
  },
  'fr-FR': {
    stepOfTotal: (step, total) => `${step} sur ${total}`,
    backBtn: 'Retour',
    title: 'Où et quand ?',
    subtitle: 'Itinéraire, dates et compagnons de voyage.',
    sectionDestination: 'Destination',
    addStopPlaceholder: 'Ajouter une étape (ex. Lyon, Kyoto)',
    firstStopPlaceholder: 'Ajouter une destination (ex. Suzhou, Paris)',
    addActionShort: 'Ajouter',
    sectionDates: 'Dates et durée',
    climateSeasons: {
      spring: 'Climat printanier',
      summer: 'Climat estival',
      autumn: 'Climat d’automne',
      winter: 'Climat hivernal',
    },
    sectionWho: 'Qui part ?',
    whoPresets: ['Solo', 'À deux', 'Famille', 'Groupe'],
    sectionVibe: 'Ambiance du voyage',
    vibeLabels: {
      休闲度假: 'Détente & Table',
      长期数字游民: 'Nomade digital',
      商务出差: 'Affaires & Tech',
      浪漫蜜月: 'Lune de miel',
    },
    nextWhatToPackBtn: 'Suivant : Quoi emporter',
  },
  'de-DE': {
    stepOfTotal: (step, total) => `${step} von ${total}`,
    backBtn: 'Zurück',
    title: 'Wohin & wann?',
    subtitle: 'Route, Kalender und wer mitreist.',
    sectionDestination: 'Reiseziel',
    addStopPlaceholder: 'Stopp hinzufügen (z. B. Hamburg, Kyoto)',
    firstStopPlaceholder: 'Reiseziel hinzufügen (z. B. Suzhou, Paris)',
    addActionShort: 'Dazu',
    sectionDates: 'Zeitraum & Dauer',
    climateSeasons: {
      spring: 'Frühlingsklima',
      summer: 'Sommerklima',
      autumn: 'Herbstklima',
      winter: 'Winterklima',
    },
    sectionWho: 'Wer packt mit?',
    whoPresets: ['Solo', 'Paar', 'Familie', 'Gruppe'],
    sectionVibe: 'Reisestimmung',
    vibeLabels: {
      休闲度假: 'Genuss & Freizeit',
      长期数字游民: 'Digital Nomad',
      商务出差: 'Business & Tech',
      浪漫蜜月: 'Flitterwochen',
    },
    nextWhatToPackBtn: 'Weiter: Was einpacken',
  },
  'pt-BR': {
    stepOfTotal: (step, total) => `${step} de ${total}`,
    backBtn: 'Voltar',
    title: 'Onde e quando?',
    subtitle: 'Rota, calendário e quem vai com você.',
    sectionDestination: 'Destino',
    addStopPlaceholder: 'Adicionar parada (ex. Lisboa, Quioto)',
    firstStopPlaceholder: 'Adicionar destino (ex. Suzhou, Paris)',
    addActionShort: 'Adicionar',
    sectionDates: 'Datas e duração',
    climateSeasons: {
      spring: 'Clima de primavera',
      summer: 'Clima de verão',
      autumn: 'Clima de outono',
      winter: 'Clima de inverno',
    },
    sectionWho: 'Quem vai na viagem?',
    whoPresets: ['Solo', 'Casal', 'Família', 'Grupo'],
    sectionVibe: 'Ritmo da viagem',
    vibeLabels: {
      休闲度假: 'Lazer e gastronomia',
      长期数字游民: 'Nômade digital',
      商务出差: 'Negócios e tech',
      浪漫蜜月: 'Lua de mel',
    },
    nextWhatToPackBtn: 'Próximo: O que levar',
  },
  'ja-JP': {
    stepOfTotal: (step, total) => `${step} / ${total}`,
    backBtn: '戻る',
    title: 'どこへ、いつ出発？',
    subtitle: 'ルート・日程・同行者を1ページでスマートに設定。',
    sectionDestination: '目的地',
    addStopPlaceholder: '経由地を追加（例：上海、杭州）',
    firstStopPlaceholder: '目的地を追加（例：蘇州、京都、パリ）',
    addActionShort: '追加',
    sectionDates: '日程と滞在数',
    climateSeasons: {
      spring: '春の気候',
      summer: '夏の気候',
      autumn: '秋の気候',
      winter: '冬の気候',
    },
    sectionWho: '同行メンバー',
    whoPresets: ['ひとり', 'ふたり', '家族', 'グループ'],
    sectionVibe: '旅のスタイル',
    vibeLabels: {
      休闲度假: 'グルメ・街歩き',
      长期数字游民: 'デジタルノマド',
      商务出差: '出張・ビジネス',
      浪漫蜜月: 'ハネムーン',
    },
    nextWhatToPackBtn: '次へ：持ち物を選ぶ',
  },
};

export function getStep1ManifestCopy(lang: AppLanguage): Step1ManifestCopy {
  return pickLang(lang, STEP1_MANIFEST_MAP);
}

const SOUTHERN_HEMISPHERE_PATTERN =
  /sydney|melbourne|brisbane|perth|auckland|queenstown|wellington|christchurch|cape town|johannesburg|buenos aires|santiago|lima|cusco|rio de janeiro|s[aã]o paulo|florian[oó]polis|bali|悉尼|墨尔本|奥克兰|皇后镇|开普敦|布宜诺斯艾利斯|圣地亚哥|里约|圣保罗|巴厘岛|シドニー|メルボルン|オークランド|ケープタウン|バリ/i;

export function inferTripSeasonKey(
  departureIso: string,
  cities: string[]
): ClimateSeasonKey {
  const dt = new Date(`${departureIso}T00:00:00`);
  const month = Number.isNaN(dt.getTime()) ? new Date().getMonth() + 1 : dt.getMonth() + 1;
  const joinedCities = cities.join(' ');
  const isSouthern = SOUTHERN_HEMISPHERE_PATTERN.test(joinedCities);

  if (month >= 3 && month <= 5) return isSouthern ? 'autumn' : 'spring';
  if (month >= 6 && month <= 8) return isSouthern ? 'winter' : 'summer';
  if (month >= 9 && month <= 11) return isSouthern ? 'spring' : 'autumn';
  return isSouthern ? 'summer' : 'winter';
}

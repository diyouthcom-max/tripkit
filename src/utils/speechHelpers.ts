import type {
  AppLanguage,
  ExpenseBucket,
  ExpenseRecord,
  PackingGroup,
  PaymentAccount,
  SplitMode,
  StopType,
  TimelineNode,
} from '../types';
import { estimateDefaultUnitWeightGrams, parseNameAndQuantity } from './packingHelpers';
import { normalizeAppLanguage } from './preferencesHelpers';
import { clampSharePct } from './splitHelpers';
import { getSpeechHelpersCopy } from '../i18n/packs/utilsAndModalsPack';

export interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

export interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

export interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

export interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface BrowserSpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: BrowserSpeechRecognitionInstance, ev: Event) => void) | null;
  onresult:
    | ((this: BrowserSpeechRecognitionInstance, ev: BrowserSpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: BrowserSpeechRecognitionInstance, ev: BrowserSpeechRecognitionErrorEvent) => void)
    | null;
  onend: ((this: BrowserSpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export function getBrowserSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getBrowserSpeechRecognitionConstructor() !== null;
}

export function resolveSpeechRecognitionLang(appLang?: string): AppLanguage {
  return normalizeAppLanguage(appLang, 'en-US');
}

export interface ParsedVoicePackItem {
  name: string;
  quantity: number;
  unitWeightGrams: number;
  carryOnOnly: boolean;
  targetGroupId: string;
}

const DOCS_KEYWORDS =
  /护照|签证|身份证|驾照|机票|登机牌|现金|欧元|美元|信用卡|银行卡|保单|passport|visa|boarding|ticket|wallet|card|cash|insurance|id\b/i;
const TECH_KEYWORDS =
  /充电|数据线|转换头|插头|充电宝|移动电源|相机|镜头|耳机|电脑|手机|电池|电话卡|流量卡|esim|charger|cable|adapter|adaptor|power\s*bank|camera|laptop|airpods|earbuds|headphone|phone/i;
const CARE_KEYWORDS =
  /牙刷|牙膏|洗发|沐浴|护肤|防晒|面膜|化妆|剃须|纸巾|湿巾|退烧|感冒|创可贴|防磨|药|眼药水|隐形眼镜|toothbrush|toothpaste|sunscreen|shampoo|lotion|razor|medicine|pill|plaster|band-?aid|moleskin|toiletr/i;
const WEATHER_KEYWORDS =
  /雨伞|折叠伞|雨衣|墨镜|太阳镜|保温杯|水壶|眼罩|耳塞|颈枕|斜挎包|背包|防盗|umbrella|raincoat|poncho|sunglasses|bottle|pillow|daypack|backpack/i;
const CLOTHING_KEYWORDS =
  /衣|裤|裙|袜|鞋|帽|围巾|外套|夹克|风衣|羽绒|毛衣|卫衣|短袖|长袖|内衣|内裤|睡衣|T恤|shirt|tee|t-shirt|pants|trousers|jeans|socks|shoes|sneakers|jacket|coat|sweater|hoodie|underwear|dress|scarf|hat/i;

function pickBestPackingGroupId(itemName: string, groups: PackingGroup[]): string {
  const findByIdOrTitle = (ids: string[], titleRegex: RegExp): string | null => {
    const byId = groups.find((g) => ids.includes(g.id));
    if (byId) return byId.id;
    const byTitle = groups.find((g) => titleRegex.test(g.title));
    return byTitle ? byTitle.id : null;
  };

  if (DOCS_KEYWORDS.test(itemName)) {
    const id = findByIdOrTitle(['documents', 'g_docs'], /证件|资金|支付|passport|doc|wallet/i);
    if (id) return id;
  }
  if (TECH_KEYWORDS.test(itemName)) {
    const id = findByIdOrTitle(['electronics', 'g_tech'], /数码|充电|电器|tech|electr/i);
    if (id) return id;
  }
  if (CARE_KEYWORDS.test(itemName)) {
    const id = findByIdOrTitle(['toiletries', 'g_care'], /洗护|洗漱|医药|药|toiletr|washbag|med/i);
    if (id) return id;
  }
  if (WEATHER_KEYWORDS.test(itemName)) {
    const id = findByIdOrTitle(['weather_gear'], /防雨|随身|装备|weather|daypack/i);
    if (id) return id;
  }
  if (CLOTHING_KEYWORDS.test(itemName)) {
    const id = findByIdOrTitle(['clothing', 'g_clothes'], /衣|穿搭|apparel|wardrobe|cloth/i);
    if (id) return id;
  }

  return groups[0]?.id || 'documents';
}

const CN_NUM_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  俩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const EN_NUM_MAP: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseSpokenPackSegment(rawSegment: string, groups: PackingGroup[]): ParsedVoicePackItem | null {
  let cleaned = rawSegment
    .trim()
    .replace(/^(请)?(帮我|给我|我要|我想|再|顺便)?(添加|加上|加|带上|带|装入|装|放入|买|补充|准备|add|pack|bring|put\s+in)\s*/i, '')
    .replace(/[。！!？?.;；]+$/g, '')
    .trim();

  if (!cleaned) return null;

  let qty = 1;
  // Leading Chinese quantity e.g. "两件短袖", "3双羊毛袜"
  const cnLeadMatch = /^(\d+|[一二两俩三四五六七八九十])\s*(件|双|条|个|盒|包|瓶|把|套|张|本|副|支|块|只|台|根)\s*(.+)$/.exec(
    cleaned
  );
  if (cnLeadMatch) {
    const rawNum = cnLeadMatch[1];
    qty = Number(rawNum) || CN_NUM_MAP[rawNum] || 1;
    cleaned = cnLeadMatch[3].trim();
  } else {
    // Leading English quantity e.g. "2 pairs of merino socks", "three power adapters"
    const enLeadMatch =
      /^(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:pairs?\s+of\s+|packs?\s+of\s+|bottles?\s+of\s+|boxes?\s+of\s+|sets?\s+of\s+)?(.+)$/i.exec(
        cleaned
      );
    if (enLeadMatch) {
      const rawNum = enLeadMatch[1].toLowerCase();
      qty = Number(rawNum) || EN_NUM_MAP[rawNum] || 1;
      cleaned = enLeadMatch[2].trim();
    }
  }

  const { cleanName, parsedQty } = parseNameAndQuantity(cleaned);
  const finalName = (cleanName || cleaned).trim();
  if (!finalName) return null;

  const finalQty = Math.max(1, Math.min(99, parsedQty || qty || 1));
  const targetGroupId = pickBestPackingGroupId(finalName, groups);
  const unitWeightGrams = estimateDefaultUnitWeightGrams(finalName, targetGroupId);
  const carryOnOnly = /护照|充电宝|移动电源|现金|信用卡|相机|电脑|passport|power\s*bank|laptop|camera/i.test(
    finalName
  );

  return {
    name: finalName,
    quantity: finalQty,
    unitWeightGrams,
    carryOnOnly,
    targetGroupId,
  };
}

/**
 * Splits a natural voice utterance (e.g. "带两件速干T恤和一把折叠伞" or "2 quick-dry tees, sunscreen and an umbrella")
 * into structured packing items when offline or when instant local parsing is needed.
 */
export function parseVoicePackingFallback(
  transcript: string,
  groups: PackingGroup[]
): ParsedVoicePackItem[] {
  const normalized = transcript.trim();
  if (!normalized) return [];

  const rawParts = normalized
    .split(/(?:、|，|,|；|;|以及|还有|外加|加上|和|\band\b|\bplus\b|\bwith\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: ParsedVoicePackItem[] = [];
  for (const part of rawParts) {
    const parsed = parseSpokenPackSegment(part, groups);
    if (parsed) {
      items.push(parsed);
    }
  }

  if (items.length === 0) {
    const single = parseSpokenPackSegment(normalized, groups);
    if (single) items.push(single);
  }
  return items;
}

/**
 * Deterministic voice expense parser used both for auto-filling manual fields
 * and as a zero-failure fallback if the AI endpoint is offline/unavailable.
 */
export function parseVoiceExpenseFallback(
  transcript: string,
  options: {
    currentDay: number;
    totalDays: number;
    vatThresholdLocal: number;
    companionName?: string;
    lang?: AppLanguage;
  }
): Omit<ExpenseRecord, 'id' | 'time'> | null {
  const raw = transcript.trim();
  if (!raw) return null;

  // Detect optional spoken day e.g. "第3天" / "Day 3" / "D3"
  let day = options.currentDay;
  const dayMatch = /(?:第\s*(\d+)\s*天|\bday\s*(\d+)\b|\bD(\d+)\b)/i.exec(raw);
  if (dayMatch) {
    const parsedDay = Number(dayMatch[1] || dayMatch[2] || dayMatch[3]);
    if (parsedDay >= 1 && parsedDay <= Math.max(1, options.totalDays)) {
      day = parsedDay;
    }
  }

  // Detect percentage split e.g. "7:3" / "70%" / "60:40"
  let split: SplitMode = 'split';
  let mySharePct: number | undefined;
  let paidBy: 'me' | 'partner' | undefined;

  const ratioColonMatch = /\b(\d{1,2})\s*[:：/]\s*(\d{1,2})\b/.exec(raw);
  const pctMatch = /(?:我出|我承担|my\s*share|i\s*pay)\s*(\d{1,3})\s*%/i.exec(raw);

  if (pctMatch) {
    split = 'ratio';
    mySharePct = clampSharePct(Number(pctMatch[1]));
    paidBy = 'me';
  } else if (ratioColonMatch) {
    const left = Number(ratioColonMatch[1]);
    const right = Number(ratioColonMatch[2]);
    if (left > 0 && right >= 0 && left + right > 0) {
      const pct = Math.round((left / (left + right)) * 100);
      if (pct !== 50) {
        split = 'ratio';
        mySharePct = clampSharePct(pct);
        paidBy = 'me';
      }
    }
  } else if (/自己|个人|全算我的|我一个人|不平摊|just\s+me|mine\s+only|personal|my\s+own/i.test(raw)) {
    split = 'me';
  } else if (
    (options.companionName &&
      new RegExp(`${options.companionName}\\s*(垫付|付|买单|paid)`, 'i').test(raw)) ||
    /同伴垫付|朋友垫付|partner\s+paid/i.test(raw)
  ) {
    split = 'partner';
  } else if (/AA|均摊|平摊|分摊|一人一半|50\s*[:/]\s*50|\bsplit\b|\bshare\b/i.test(raw)) {
    split = 'split';
  }

  // Extract monetary amount (prefer number followed by currency unit or decimal)
  const cleanedForAmt = raw
    .replace(/第\s*\d+\s*天/g, ' ')
    .replace(/\bday\s*\d+\b/gi, ' ')
    .replace(/\b\d{1,2}\s*[:：/]\s*\d{1,2}\b/g, ' ')
    .replace(/\d{1,3}\s*%/g, ' ');

  const currencyAmtMatch =
    /(?:€|\$|£|¥|EUR|USD|GBP|JPY|CNY)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:欧元?|美元|美金|英镑|日元|块|元|刀|euros?|eur|dollars?|usd|pounds?|gbp|yen)/i.exec(
      cleanedForAmt
    );

  let amountLocal = 0;
  let matchedAmtToken = '';
  if (currencyAmtMatch) {
    matchedAmtToken = currencyAmtMatch[0];
    amountLocal = Number(currencyAmtMatch[1] || currencyAmtMatch[2]) || 0;
  } else {
    const genericNumMatch = /(\d+(?:\.\d{1,2})?)/.exec(cleanedForAmt);
    if (genericNumMatch) {
      matchedAmtToken = genericNumMatch[0];
      amountLocal = Number(genericNumMatch[1]) || 0;
    }
  }

  if (amountLocal <= 0) return null;

  // Detect payment account
  let account: PaymentAccount = 'card';
  if (/现金|纸币|硬币|\bcash\b|\bnotes\b|\bcoins\b/i.test(raw)) {
    account = 'cash';
  } else if (/交通卡|地铁卡|公交卡|储值卡|navigo|suica|pasmo|oyster|travelcard|transit/i.test(raw)) {
    account = 'transit';
  }

  // Detect bucket
  let bucket: ExpenseBucket = 'daily';
  if (
    /百货|专柜|奢侈品|买包|围巾|香水|化妆品|手表|衣服|鞋子|退税|手信|伴手礼|纪念品|shopping|boutique|souvenir|gift|department\s+store|tax[-\s]*free|vat/i.test(
      raw
    )
  ) {
    bucket = 'shopping';
  } else if (/酒店|住宿|民宿|机票|高铁|火车票|欧洲之星|hotel|airbnb|hostel|flight|train\s+ticket|eurostar/i.test(raw)) {
    bucket = 'prepaid';
  }

  // Extract concise title
  let title = raw;
  if (matchedAmtToken) {
    title = title.replace(matchedAmtToken, ' ');
  }
  title = title
    .replace(/^(请)?(帮我|给我)?(记一笔|记账|记录|入账|花了|消费|买了|log|add\s+expense|spent|paid\s+for)\s*/i, '')
    .replace(/(刷信用卡|刷卡|用现金|付现金|刷交通卡|by\s+credit\s+card|by\s+card|in\s+cash|by\s+cash)/gi, ' ')
    .replace(/(和.+?(均摊|平摊|分摊|AA)|AA\s*均摊|AA制|全算我的|算我自己的|split\s+50\/50.*|split\s+with\s+\w+)/gi, ' ')
    .replace(/(花了|一共|共计|总计|花费)/g, ' ')
    .replace(/[，,。.;；！!？?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    const copy = getSpeechHelpersCopy(normalizeAppLanguage(options.lang, 'en-US'));
    title = bucket === 'shopping' ? copy.shoppingExpense : copy.dailyExpense;
  }

  const vatEligible =
    bucket === 'shopping' &&
    (amountLocal >= options.vatThresholdLocal || /退税|tax[-\s]*free|\bvat\b/i.test(raw));

  return {
    day,
    title,
    amountLocal: Number(amountLocal.toFixed(2)),
    bucket,
    account,
    split,
    mySharePct,
    paidBy,
    vatEligible,
    vatStatus: vatEligible ? 'pending_form' : undefined,
  };
}

export interface ParsedVoiceStopDraft {
  day: number;
  time: string;
  closeTime: string;
  stopType: StopType;
  title: string;
  district: string;
  address: string;
  estLocal: number;
  transitNote: string;
  isOutdoor: boolean;
}

export type ParsedVoiceItineraryCommand =
  | {
      type: 'update_description';
      targetNodeId: string;
      targetTitle: string;
      targetIndex: number;
      newDescription: string;
    }
  | {
      type: 'add_stop';
      draft: ParsedVoiceStopDraft;
    };

function parseChineseSpokenHour(rawHour: string): number {
  const num = Number(rawHour);
  if (!Number.isNaN(num)) return num;
  if (rawHour === '十二') return 12;
  if (rawHour === '十一') return 11;
  return CN_NUM_MAP[rawHour] ?? 10;
}

function addHoursHHMM(hhmm: string, hoursToAdd: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr) || 10;
  const m = Number(mStr) || 0;
  const totalMins = Math.min(23 * 60 + 55, Math.max(0, h * 60 + m + hoursToAdd * 60));
  const outH = Math.floor(totalMins / 60);
  const outM = totalMins % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

function parseSpokenTime(text: string): { time: string; matchedToken: string } | null {
  // 1) English 12h: "3:30 PM", "7 pm", "10:15am"
  const en12Match = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(text);
  if (en12Match) {
    let hour = Number(en12Match[1]);
    const minute = Math.min(59, Number(en12Match[2] || '0'));
    const isPm = en12Match[3].toLowerCase().startsWith('p');
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    hour = Math.max(0, Math.min(23, hour));
    return {
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      matchedToken: en12Match[0],
    };
  }

  // 2) Chinese spoken time: "下午3点半", "晚上7点15分", "15点30", "上午十点"
  const cnTimeMatch =
    /(早上|上午|清晨|凌晨|中午|下午|傍晚|晚上|夜间)?\s*(\d{1,2}|十[一二]|[一二两三四五六七八九十])\s*(?:点|时|：|:)\s*(半|(\d{1,2})\s*分?)?/i.exec(
      text
    );
  if (cnTimeMatch) {
    const period = cnTimeMatch[1] || '';
    let hour = parseChineseSpokenHour(cnTimeMatch[2]);
    let minute = 0;
    if (cnTimeMatch[3] === '半') {
      minute = 30;
    } else if (cnTimeMatch[4]) {
      minute = Math.min(59, Number(cnTimeMatch[4]) || 0);
    }
    if (/下午|傍晚|晚上|夜间/.test(period) && hour < 12) {
      hour += 12;
    } else if (/中午/.test(period) && hour < 11) {
      hour += 12;
    } else if (/凌晨/.test(period) && hour === 12) {
      hour = 0;
    }
    hour = Math.max(0, Math.min(23, hour));
    return {
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      matchedToken: cnTimeMatch[0],
    };
  }

  // 3) 24-hour HH:MM e.g. "14:30", "09:00"
  const hhmmMatch = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const minute = Number(hhmmMatch[2]);
    return {
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      matchedToken: hhmmMatch[0],
    };
  }

  return null;
}

function parseChineseStepIndex(rawToken: string): number {
  const num = Number(rawToken);
  if (!Number.isNaN(num) && num > 0) return num;
  return CN_NUM_MAP[rawToken] || 0;
}

/**
 * Parses a natural spoken itinerary command for either:
 * 1) Updating an existing node's description (`transitNote`), e.g.:
 *    - "把第2站备注改成地铁4号线直达"
 *    - "把卢浮宫的描述改成提前网上买票免排队"
 *    - "Update stop 2 description to Take metro line 4"
 *    - "Update Louvre Museum note to Enter via Porte des Lions"
 * 2) Adding a new stop on the active or spoken day.
 */
export function parseVoiceItineraryCommand(
  transcript: string,
  options: {
    currentDay: number;
    totalDays: number;
    primaryCity: string;
    dayNodes: TimelineNode[];
    lang?: AppLanguage;
  }
): ParsedVoiceItineraryCommand | null {
  const raw = transcript.trim();
  if (!raw) return null;

  const { dayNodes } = options;

  // A. Update by 1-based stop index (e.g. "第2站备注改成...", "update stop 2 description to ...")
  const cnIndexDescMatch =
    /(?:把|将|给)?\s*第\s*(\d+|[一二两三四五六七八九十])\s*(?:站|个站点|个行程|个景点)\s*(?:的)?\s*(?:备注|描述|说明|交通|笔记|note|description)\s*(?:修改为|改为|改成|更新为|更新成|变成|设为|是|[:：]|为)\s*(.+)$/i.exec(
      raw
    );
  if (cnIndexDescMatch && dayNodes.length > 0) {
    const idx = parseChineseStepIndex(cnIndexDescMatch[1]);
    const desc = cnIndexDescMatch[2].replace(/[。！!]+$/g, '').trim();
    const targetNode = idx >= 1 && idx <= dayNodes.length ? dayNodes[idx - 1] : null;
    if (targetNode && desc) {
      return {
        type: 'update_description',
        targetNodeId: targetNode.id,
        targetTitle: targetNode.title,
        targetIndex: idx,
        newDescription: desc,
      };
    }
  }

  const enIndexDescMatch =
    /(?:update|edit|change|set)\s+(?:stop|node|item)\s*#?\s*(\d+)\s*(?:'s)?\s*(?:description|note|transit\s*note|details|memo)\s*(?:to|as|:)\s*(.+)$/i.exec(
      raw
    );
  if (enIndexDescMatch && dayNodes.length > 0) {
    const idx = Number(enIndexDescMatch[1]);
    const desc = enIndexDescMatch[2].replace(/[.!]+$/g, '').trim();
    const targetNode = idx >= 1 && idx <= dayNodes.length ? dayNodes[idx - 1] : null;
    if (targetNode && desc) {
      return {
        type: 'update_description',
        targetNodeId: targetNode.id,
        targetTitle: targetNode.title,
        targetIndex: idx,
        newDescription: desc,
      };
    }
  }

  // B. Update by matching an existing node title in the active day
  const descVerbPattern =
    /(备注|描述|说明|笔记|note|description)\s*(?:修改为|改为|改成|更新为|更新成|变成|设为|to|as|[:：])\s*(.+)$/i;
  const descMatch = descVerbPattern.exec(raw);
  if (descMatch && dayNodes.length > 0) {
    const newDesc = descMatch[2].replace(/[。！!.]+$/g, '').trim();
    const beforeClause = raw.slice(0, descMatch.index).toLowerCase();

    if (newDesc) {
      // Match longest node title contained in the prefix clause
      const sortedNodes = dayNodes
        .map((node, i) => ({ node, i: i + 1 }))
        .sort((a, b) => b.node.title.length - a.node.title.length);

      for (const candidate of sortedNodes) {
        const normalizedTitle = candidate.node.title.trim().toLowerCase();
        if (!normalizedTitle) continue;
        // Direct match or partial token match (e.g. "卢浮宫" in "卢浮宫博物馆 Louvre")
        const titleTokens = normalizedTitle
          .split(/[\s·\-/()（）]+/)
          .filter((tok) => tok.length >= 2);
        const isMatched =
          beforeClause.includes(normalizedTitle) ||
          titleTokens.some((tok) => beforeClause.includes(tok));
        if (isMatched) {
          return {
            type: 'update_description',
            targetNodeId: candidate.node.id,
            targetTitle: candidate.node.title,
            targetIndex: candidate.i,
            newDescription: newDesc,
          };
        }
      }

      // If there's only one stop on this day and user explicitly asked to update description
      if (
        dayNodes.length === 1 &&
        /(?:修改|改成|改为|更新|update|edit|change|set)/i.test(beforeClause)
      ) {
        return {
          type: 'update_description',
          targetNodeId: dayNodes[0].id,
          targetTitle: dayNodes[0].title,
          targetIndex: 1,
          newDescription: newDesc,
        };
      }
    }
  }

  // C. Default: parse as a new stop draft
  const draft = parseVoiceStopFallback(raw, {
    currentDay: options.currentDay,
    totalDays: options.totalDays,
    primaryCity: options.primaryCity,
    lang: options.lang,
  });
  return {
    type: 'add_stop',
    draft,
  };
}

/**
 * Deterministic fallback parser for spoken "add stop" voice commands when offline or AI parsing fails.
 */
export function parseVoiceStopFallback(
  transcript: string,
  options: {
    currentDay: number;
    totalDays: number;
    primaryCity: string;
    lang?: AppLanguage;
  }
): ParsedVoiceStopDraft {
  const raw = transcript.trim();

  // 1. Optional target day ("第3天" / "Day 3" / "D3")
  let day = options.currentDay;
  let working = raw;
  const dayMatch = /(?:第\s*(\d+)\s*天|\bday\s*(\d+)\b|\bD(\d+)\b)/i.exec(working);
  if (dayMatch) {
    const parsedDay = Number(dayMatch[1] || dayMatch[2] || dayMatch[3]);
    if (parsedDay >= 1 && parsedDay <= Math.max(1, options.totalDays)) {
      day = parsedDay;
    }
    working = working.replace(dayMatch[0], ' ');
  }

  // 2. Spoken arrival time
  const spokenTime = parseSpokenTime(working);
  const time = spokenTime?.time || '14:00';
  if (spokenTime?.matchedToken) {
    working = working.replace(spokenTime.matchedToken, ' ');
  }

  // 3. Optional inline description/note after "备注" / "描述" / "note:"
  let explicitNote = '';
  const noteMatch = /(?:备注|描述|说明|note|tip)\s*[:：]?\s*(.+)$/i.exec(working);
  if (noteMatch) {
    explicitNote = noteMatch[1].replace(/[。！!.]+$/g, '').trim();
    working = working.slice(0, noteMatch.index).trim();
  }

  // 4. Optional estimated spend/ticket price
  let estLocal = 0;
  const priceMatch =
    /(?:门票|票价|人均|预算|预估|大约|约|花了|ticket|budget|est(?:imate)?|cost)?\s*(?:€|\$|£|¥|EUR|USD|GBP)?\s*(\d+(?:\.\d{1,2})?)\s*(?:欧元?|美元|美金|英镑|日元|块|元|刀|euros?|eur|dollars?|usd|pounds?|gbp)?/i.exec(
      working
    );
  if (
    priceMatch &&
    /(?:€|\$|£|¥|EUR|USD|GBP|欧元?|美元|英镑|日元|块|元|门票|预算|euro|dollar|pound|budget|ticket)/i.test(
      priceMatch[0]
    )
  ) {
    estLocal = Number(priceMatch[1]) || 0;
    working = working.replace(priceMatch[0], ' ');
  }

  // 5. Infer stopType
  let stopType: StopType = 'attraction';
  if (/酒店|民宿|旅馆|入住|check[-\s]*in|hotel|hostel|airbnb/i.test(raw)) {
    stopType = 'hotel';
  } else if (/机场|车站|火车站|高铁|地铁|大巴|乘车|出发|航班|airport|station|train|flight|eurostar|transit/i.test(raw)) {
    stopType = 'transit';
  } else if (/餐厅|吃饭|午饭|午餐|晚饭|晚餐|早饭|早餐|咖啡|甜品|bistro|cafe|café|coffee|dinner|lunch|breakfast|restaurant|eat/i.test(raw)) {
    stopType = 'dining';
  } else if (/百货|老佛爷|购物|买买买|商场|奥莱|免税|shopping|mall|boutique|store|market/i.test(raw)) {
    stopType = 'shopping';
  }

  const closeTime =
    stopType === 'hotel'
      ? '23:59'
      : stopType === 'dining'
      ? addHoursHHMM(time, 3)
      : addHoursHHMM(time, 5);

  const isOutdoor =
    /公园|广场|花园|铁塔|桥|老街|游船|河畔|海滩|山|park|square|garden|tower|bridge|cruise|walk|outdoor/i.test(
      raw
    );

  // 6. Clean up stop title
  const cleanedTitle = working
    .replace(/^(请)?(帮我|给我)?(在行程中?|日程里?)?(添加|新增|加上|加一个|加个|安排|加|去|逛|参观|吃|住|add|visit|go\s+to|schedule|book)\s*/i, '')
    .replace(/^(今天|明天|后天|明日|at|on|to)\s+/i, '')
    .replace(/^(去|逛|吃|到|at)\s*/i, '')
    .replace(/[，,。.;；！!？?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const copy = getSpeechHelpersCopy(normalizeAppLanguage(options.lang, 'en-US'));
  const title = cleanedTitle || copy.highlightStop(options.primaryCity);
  const district = copy.districtCenter(options.primaryCity);

  return {
    day,
    time,
    closeTime,
    stopType,
    title,
    district,
    address: `${title}, ${options.primaryCity}`,
    estLocal: Number(estLocal.toFixed(2)),
    transitNote: explicitNote || copy.defaultTransitNote(time),
    isOutdoor,
  };
}


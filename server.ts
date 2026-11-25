import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const MODEL = 'gemini-4-hydrogen';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiJson<T = Record<string, unknown>>(
  rawText: string | undefined,
  fallback: T
): T {
  const trimmed = (rawText ?? '').trim();
  if (!trimmed) return fallback;
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(unfenced) as T;
}

async function callGeminiWithRetry<T>(
  operation: () => Promise<T>,
  options?: { maxAttempts?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const backoffMs = [800, 1600];
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastErr = err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      // Hard exclusions — never retry auth / key / argument errors.
      if (
        /MISSING_GEMINI_API_KEY|API_KEY_INVALID|PERMISSION_DENIED|403|INVALID_ARGUMENT/i.test(
          rawMsg
        )
      ) {
        throw err;
      }
      const isTransient =
        /FAILED_PRECONDITION|User location is not supported|location is not supported|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|DEADLINE_EXCEEDED|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
          rawMsg
        );
      if (!isTransient || attempt === maxAttempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
    }
  }
  throw lastErr;
}

type ClientLang =
  | 'zh-CN'
  | 'en-US'
  | 'en-GB'
  | 'es-MX'
  | 'fr-FR'
  | 'de-DE'
  | 'pt-BR'
  | 'ja-JP';

function resolveClientLang(raw: unknown): ClientLang {
  if (
    raw === 'zh-CN' ||
    raw === 'en-US' ||
    raw === 'en-GB' ||
    raw === 'es-MX' ||
    raw === 'fr-FR' ||
    raw === 'de-DE' ||
    raw === 'pt-BR' ||
    raw === 'ja-JP'
  ) {
    return raw;
  }
  if (typeof raw === 'string') {
    const lc = raw.trim().toLowerCase();
    if (lc === 'zh' || lc.startsWith('zh-')) return 'zh-CN';
    if (lc === 'es' || lc.startsWith('es-')) return 'es-MX';
    if (lc === 'fr' || lc.startsWith('fr-')) return 'fr-FR';
    if (lc === 'de' || lc.startsWith('de-')) return 'de-DE';
    if (lc === 'pt' || lc.startsWith('pt-')) return 'pt-BR';
    if (lc === 'ja' || lc.startsWith('ja-')) return 'ja-JP';
    if (lc.startsWith('en-gb') || lc.startsWith('en-au') || lc.startsWith('en-nz')) return 'en-GB';
  }
  return 'en-US';
}

function getAiLangDirective(lang: ClientLang): string {
  switch (lang) {
    case 'zh-CN':
      return 'Respond in Simplified Chinese for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'en-GB':
      return 'Respond in natural British/European English (UK spelling, Cabin Bag, VAT Refund, Travellers, Organiser) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'es-MX':
      return 'Respond in natural Mexican Spanish (Español de México: equipaje de mano, equipaje documentado, boleto, presupuesto, itinerario) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'fr-FR':
      return 'Respond in natural French (Français: bagage cabine, bagage en soute, itinéraire, détaxe, budget) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'de-DE':
      return 'Respond in natural German (Deutsch: Handgepäck, Aufgabegepäck, Reiseplan, Steuererstattung, Budget) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'pt-BR':
      return 'Respond in natural Portuguese (Português: bagagem de mão, mala despachada, roteiro, orçamento, reembolso de impostos) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'ja-JP':
      return 'Respond in natural polite Japanese (日本語・です/ます調: 機内持ち込み、受託手荷物、旅程、予算、免税) for all human-readable titles, reasons, summaries, notes, and replies.';
    case 'en-US':
    default:
      return 'Respond in natural North American English (US spelling, Carry-On, Tax-Free, Travelers) for all human-readable titles, reasons, summaries, notes, and replies.';
  }
}

function buildServerWeekdaySchedule(
  departureDate: unknown,
  totalDays: number,
  lang: ClientLang
): string {
  const raw = typeof departureDate === 'string' ? departureDate.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `Day 1..Day ${totalDays} (exact departure date unspecified)`;
  }
  const [y, m, d] = raw.split('-').map(Number);
  const weekdayMap: Record<ClientLang, string[]> = {
    'zh-CN': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    'en-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'en-GB': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'es-MX': ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    'fr-FR': ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    'de-DE': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    'pt-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    'ja-JP': ['日', '月', '火', '水', '木', '金', '土'],
  };
  const daysArr = weekdayMap[lang] || weekdayMap['en-US'];
  const safeDays = Math.min(30, Math.max(1, Math.round(totalDays) || 1));
  const labels: string[] = [];
  for (let i = 0; i < safeDays; i += 1) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    if (Number.isNaN(dt.getTime())) break;
    const dateStr = dt.toISOString().slice(0, 10);
    const wd = dt.getUTCDay();
    labels.push(`Day ${i + 1}: ${dateStr} (${daysArr[wd]})`);
  }
  return labels.join(' | ');
}

function getPackingGroupSchemaGuide(lang: ClientLang): string {
  if (
    lang === 'en-GB' ||
    lang === 'es-MX' ||
    lang === 'fr-FR' ||
    lang === 'de-DE' ||
    lang === 'pt-BR' ||
    lang === 'ja-JP'
  ) {
    return `   Core categories (always include — keep the exact id & colorKey, and localize title & cubeLabel into the target language):
   - id="documents", title="Documents & Wallet", icon="📄", cubeLabel="Anti-theft sling · Keep on person", colorKey="peach"
   - id="tops_layers", title="Tops & Weather Layers", icon="👕", cubeLabel="Compression cube M/XL · By climate", colorKey="teal"
   - id="bottoms_underwear", title="Bottoms, Underwear & Socks", icon="👖", cubeLabel="Compression cube L/S · Laundry cycle", colorKey="mint"
   - id="footwear_accessories", title="Footwear & Weather Gear", icon="👟", cubeLabel="Shoe bag & outer pocket", colorKey="peach"
   - id="toiletries", title="Washbag & Skincare", icon="🧴", cubeLabel="100ml clear zip pouch · Top layer", colorKey="lemon"
   - id="electronics", title="Tech & Charging", icon="🔌", cubeLabel="Tech organiser pouch · Cabin access", colorKey="lavender"
   - id="first_aid", title="First Aid & Meds", icon="🩹", cubeLabel="Compact medical kit · Quick reach", colorKey="rose"
   Dynamic scenario categories (MUST add 1 to 6 of these whenever destination, activities, or specialScenarios match, localized into the target language):
   - id="beach_water", title="Beach & Swim Gear", icon="🏖️", cubeLabel="Wet/dry bag · UV & water gear", colorKey="teal"
   - id="onsen_spa", title="Onsen & Hot Spring", icon="♨️", cubeLabel="Quick-grab spa pouch", colorKey="lemon"
   - id="ski_snow", title="Ski & Snow Thermal Gear", icon="🎿", cubeLabel="XL thermal cube · Wind/snow proof", colorKey="lavender"
   - id="hiking_camping", title="Hiking & Outdoor Gear", icon="🥾", cubeLabel="Foldable daypack · Trail essentials", colorKey="mint"
   - id="theme_park", title="Theme Park & Queue Gear", icon="🎢", cubeLabel="Crossbody daypack · All-day stamina", colorKey="peach"
   - id="fitness_sport", title="Gym & Running Gear", icon="🏃", cubeLabel="Breathable sport pouch", colorKey="mint"
   - id="baby_kids", title="Baby & Kids Essentials", icon="🍼", cubeLabel="Cabin nanny bag · Quick access", colorKey="rose"
   - id="remote_work", title="Remote Work & Business", icon="💻", cubeLabel="Padded laptop sleeve · Cabin", colorKey="lavender"
   - id="photography", title="Camera & Creator Kit", icon="📷", cubeLabel="Shockproof camera insert · Cabin", colorKey="lavender"
   - id="formal_event", title="Formal & Fine Dining", icon="👔", cubeLabel="Garment folder · Wrinkle-free", colorKey="peach"
   - id="shopping_taxfree", title="Shopping & Tax-Free Prep", icon="🛍️", cubeLabel="Expandable tote · Receipt folder", colorKey="lemon"
   - id="extras", title="Daypack & Flight Comfort", icon="🎒", cubeLabel="Outer pocket · Transit essentials", colorKey="mint"`;
  }
  if (lang === 'en-US') {
    return `   Core categories (always include):
   - id="documents", title="Documents & Wallet", icon="📄", cubeLabel="Crossbody anti-theft bag · Carry-on", colorKey="peach"
   - id="tops_layers", title="Tops & Weather Layers", icon="👕", cubeLabel="Compression cube M/XL · By climate", colorKey="teal"
   - id="bottoms_underwear", title="Bottoms, Underwear & Socks", icon="👖", cubeLabel="Compression cube L/S · Laundry cycle", colorKey="mint"
   - id="footwear_accessories", title="Shoes & Weather Accessories", icon="👟", cubeLabel="Shoe bag & outer pocket", colorKey="peach"
   - id="toiletries", title="Toiletries & Skincare", icon="🧴", cubeLabel="100ml quart zip bag · Top access", colorKey="lemon"
   - id="electronics", title="Tech & Chargers", icon="🔌", cubeLabel="Tech organizer pouch · Easy reach", colorKey="lavender"
   - id="first_aid", title="First Aid & Meds", icon="🩹", cubeLabel="Compact travel med kit · Emergency", colorKey="rose"
   Dynamic scenario categories (MUST add 1 to 6 of these whenever destination, activities, or specialScenarios match!):
   - id="beach_water", title="Beach & Swim Gear", icon="🏖️", cubeLabel="Wet/dry pouch · Reef-safe & water gear", colorKey="teal"
   - id="onsen_spa", title="Onsen & Spa Essentials", icon="♨️", cubeLabel="Quick-grab spa pouch", colorKey="lemon"
   - id="ski_snow", title="Ski & Snow Thermal Gear", icon="🎿", cubeLabel="XL thermal cube · Snow & ice protection", colorKey="lavender"
   - id="hiking_camping", title="Hiking & Trail Gear", icon="🥾", cubeLabel="Packable daypack · Trail gear", colorKey="mint"
   - id="theme_park", title="Theme Park & All-Day Queue", icon="🎢", cubeLabel="Light daypack · Park essentials", colorKey="peach"
   - id="fitness_sport", title="Gym & Running Gear", icon="🏃", cubeLabel="Breathable workout pouch", colorKey="mint"
   - id="baby_kids", title="Baby & Kids Essentials", icon="🍼", cubeLabel="Cabin diaper/kid bag · Easy reach", colorKey="rose"
   - id="remote_work", title="Remote Work & Business", icon="💻", cubeLabel="Padded laptop compartment · Carry-on", colorKey="lavender"
   - id="photography", title="Photography & Creator Gear", icon="📷", cubeLabel="Padded camera cube · Carry-on", colorKey="lavender"
   - id="formal_event", title="Formal & Dress Attire", icon="👔", cubeLabel="Garment folder · Wrinkle-free", colorKey="peach"
   - id="shopping_taxfree", title="Shopping & Tax-Free Prep", icon="🛍️", cubeLabel="Foldable duffel · Tax-free pouch", colorKey="lemon"
   - id="extras", title="Daypack & Flight Comfort", icon="🎒", cubeLabel="Quick-grab pocket · Transit gear", colorKey="mint"`;
  }
  return `   核心基础分类（必含 7 类，拆分精细清晰）：
   - id="documents", title="证件文件与数字通行", icon="📄", cubeLabel="斜挎防盗包 · 全程随身携带", colorKey="peach"
   - id="tops_layers", title="上装与温差外层", icon="👕", cubeLabel="M/XL 压缩收纳袋 · 按温差叠穿", colorKey="teal"
   - id="bottoms_underwear", title="下装与贴身内衣袜", icon="👖", cubeLabel="L/S 压缩分装袋 · 按洗烘周期", colorKey="mint"
   - id="footwear_accessories", title="鞋履与防晒雨具配饰", icon="👟", cubeLabel="独立防尘鞋袋 + 箱包侧袋", colorKey="peach"
   - id="toiletries", title="洗漱护肤与个护", icon="🧴", cubeLabel="100ml 透明防漏洗漱包 · 顶层快取", colorKey="lemon"
   - id="electronics", title="电子数码与供电转换", icon="🔌", cubeLabel="数码配件收纳包 · 锂电严禁托运", colorKey="lavender"
   - id="first_aid", title="随行医药与急救防护", icon="🩹", cubeLabel="便携常备药盒 · 随身应急", colorKey="rose"
   动态场景专属分类（根据目的地特征如东京/冲绳/北海道、活动标签或 specialScenarios，动态开启 1~6 个专属分类，总分类保持在 8~14 个）：
   - id="beach_water", title="海滨沙滩与戏水装备", icon="🏖️", cubeLabel="干湿分离防水袋 · 海岛防晒涉水", colorKey="teal"
   - id="onsen_spa", title="温泉泡汤与桑拿洗浴", icon="♨️", cubeLabel="便携泡汤小提袋 · 私汤/大浴场", colorKey="lemon"
   - id="ski_snow", title="冰雪极寒与滑雪装备", icon="🎿", cubeLabel="XL 防寒装备袋 · 防风防雪防滑", colorKey="lavender"
   - id="hiking_camping", title="山野徒步与露营装备", icon="🥾", cubeLabel="轻量化攻顶背包 · 户外机能", colorKey="mint"
   - id="theme_park", title="主题乐园暴走与排队神器", icon="🎢", cubeLabel="解放双手随身小包 · 全天续航", colorKey="peach"
   - id="fitness_sport", title="运动健身与晨跑装备", icon="🏃", cubeLabel="透气运动收纳袋 · 速干排汗", colorKey="mint"
   - id="baby_kids", title="婴童随行与喂养安抚", icon="🍼", cubeLabel="登机妈咪包 · 随时快取", colorKey="rose"
   - id="remote_work", title="移动办公与商务生产力", icon="💻", cubeLabel="防震电脑夹层 · 随身登机", colorKey="lavender"
   - id="photography", title="摄影航拍与创作器材", icon="📷", cubeLabel="加厚相机内胆包 · 电池随身", colorKey="lavender"
   - id="formal_event", title="正装晚宴与礼仪穿搭", icon="👔", cubeLabel="防皱西装礼服袋 · 平铺上层", colorKey="peach"
   - id="shopping_taxfree", title="免税血拼与扩容收纳", icon="🛍️", cubeLabel="可折叠扩容旅行袋 · 退税票据夹", colorKey="lemon"
   - id="extras", title="机舱舒适与防盗实用小物", icon="🎒", cubeLabel="外层快取袋 · 旅途好物", colorKey="mint"`;
}

function mapGeminiError(
  err: unknown,
  fallbackMessageZh: string,
  lang: ClientLang = 'zh-CN',
  fallbackMessageEn = 'AI request failed. Please try again.'
): { status: number; error: string } {
  const isEn = lang !== 'zh-CN';
  const fallbackMessage = isEn ? fallbackMessageEn : fallbackMessageZh;
  const raw = err instanceof Error ? err.message : String(err || '');
  if (
    raw.includes('MISSING_GEMINI_API_KEY') ||
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|403/i.test(raw)
  ) {
    return {
      status: 403,
      error: isEn
        ? 'Server GEMINI_API_KEY is missing or invalid. Please check Settings > Secrets in the top right.'
        : '服务端 GEMINI_API_KEY 未配置或无效，请在右上角 Settings > Secrets 中检查密钥配置。',
    };
  }
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(raw)) {
    return {
      status: 429,
      error: isEn
        ? 'AI service rate limit or quota reached. Please wait a few seconds and try again.'
        : 'AI 服务请求过于频繁或配额暂时受限，请稍候几秒再试。',
    };
  }
  if (
    /FAILED_PRECONDITION|location is not supported|User location is not supported/i.test(raw)
  ) {
    return {
      status: 503,
      error: isEn
        ? 'The AI service is temporarily unavailable in your current region. Please try again shortly or switch networks.'
        : 'AI 服务在当前网络地区暂不可用，请稍后重试或切换网络后重试。',
    };
  }
  if (err instanceof SyntaxError) {
    return {
      status: 502,
      error: isEn
        ? `${fallbackMessage} (Invalid AI JSON format — please retry)`
        : `${fallbackMessage}（AI 返回格式异常，请重试一次）`,
    };
  }
  const looksLikeRawDump =
    raw.includes('{') ||
    raw.includes('"error"') ||
    raw.includes('"status"') ||
    raw.includes('\n') ||
    raw.includes(' at ') ||
    raw.length > 120;
  return {
    status: 500,
    error: raw && !looksLikeRawDump ? raw : fallbackMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '18mb' }));

  // 1. AI Trip & Packing Architect
  app.post('/api/ai/plan-trip', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const { naturalPrompt, setup, baggageLimits } = req.body;
      const ai = getAiClient();
      const hasNaturalPrompt = Boolean(naturalPrompt && String(naturalPrompt).trim());
      const plannedDays = Math.min(30, Math.max(1, Number(setup?.days) || 5));
      const travelersCount = Math.max(1, Math.min(8, Number(setup?.travelers) || 2));
      const carryOnLimitKg = Number(baggageLimits?.carryOnLimitKg) || 7;
      const checkedLimitKg =
        baggageLimits?.checkedLimitKg !== undefined ? Number(baggageLimits.checkedLimitKg) : 23;
      const isCabinOnlyLcc = checkedLimitKg <= 0;
      const weekdayCalendar = buildServerWeekdaySchedule(
        setup?.departureDate,
        plannedDays,
        lang
      );
      const stopsPerDayGuide = plannedDays <= 10 ? '3 to 4' : '2 to 3';
      const budgetTier = setup?.budgetTier || 'comfort';
      const budgetTierDesc =
        budgetTier === 'budget'
          ? '经济省钱档（青旅/高性价比三星酒店、地铁公交为主、平价地道街头美食、精选免费或高性价比景点）'
          : budgetTier === 'luxury'
          ? '品质尊享档（核心区四五星精品/奢华酒店、机场专车或高铁一等座、景观/高分餐厅、免排队快速通道门票）'
          : '舒适轻奢档（市中心优质三四星精品酒店、城际高铁+地铁高效衔接、口碑Bistro与经典必游场馆）';
      const targetBudgetNote =
        Number(setup?.targetTotalBudgetUsd) > 0
          ? `Target total trip budget (approx USD): $${Number(setup.targetTotalBudgetUsd)}`
          : 'No fixed USD cap specified; calibrate costs realistically to the budget tier.';
      const baggageConstraintNote = isCabinOnlyLcc
        ? `AIRLINE BAGGAGE: Strict Cabin-Only / LCC Basic Fare (${carryOnLimitKg}kg carry-on ONLY, 0kg checked luggage!). Keep total item weights ultralight within ${carryOnLimitKg}kg, strictly enforce <=100ml liquids in a clear zip bag, forbid full-size liquids/blades, set carryOnOnly=true on essentials, and advise wearing the heaviest jacket/shoes onto the plane.`
        : `AIRLINE BAGGAGE: ${carryOnLimitKg}kg carry-on + ${checkedLimitKg}kg checked luggage. Strictly set carryOnOnly=true on passports, lithium power banks, spare camera batteries, laptops, and medications (aviation safety rule: NEVER check lithium batteries), while placing heavier clothing/toiletries >100ml in checked luggage.`;
      const crewGearNote =
        travelersCount >= 2
          ? `GROUP SIZE: ${travelersCount} travelers. Highlight shared 1-per-group items (e.g., multi-port GaN charger, mini first-aid kit, luggage scale) in item "why" and set ownership="shared" on group-shared gear so companions avoid packing redundant duplicates.`
          : `GROUP SIZE: Solo traveler (1 person). Optimize safety & solo convenience (e.g., anti-theft phone lanyard, portable power bank, compact solo gear).`;
      const blockedItemsList = Array.isArray(req.body?.blockedItems)
        ? (req.body.blockedItems as string[]).filter(Boolean)
        : [];
      const customPackPrefs = [
        setup?.clothingStyle ? `clothingStyle=${setup.clothingStyle}` : '',
        setup?.packingDensity
          ? `luggageMode=${
              setup.packingDensity === 'light'
                ? 'ultralight_personal_backpack (strictly filter spare clothing & bulky gear; carry-on compliant)'
                : setup.packingDensity === 'fully_loaded'
                ? 'full_checked_suitcase (comprehensive full-scene packing)'
                : 'standard_20in_carry_on (balanced 4-5 outfit capsule)'
            }`
          : '',
        Array.isArray(setup?.weatherOverrides) && setup.weatherOverrides.length > 0
          ? `subjectiveWeatherOverrides=${setup.weatherOverrides.join(',')}`
          : '',
        Array.isArray(setup?.specialScenarios) && setup.specialScenarios.length > 0
          ? `specialScenarios=${setup.specialScenarios.join(',')}`
          : '',
        setup?.packingCustomNote ? `customPackingNote="${String(setup.packingCustomNote).trim()}"` : '',
        blockedItemsList.length > 0
          ? `NEVER SUGGEST THESE BLOCKED ITEMS: ${blockedItemsList.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const setupCities: string[] = Array.isArray(setup?.cities) && setup.cities.length > 0 ? setup.cities : ['巴黎'];
      const setupCityDays: number[] =
        Array.isArray(setup?.cityDays) && setup.cityDays.length === setupCities.length
          ? setup.cityDays.map((v: unknown) => Math.max(1, Math.round(Number(v) || 1)))
          : [];
      const perCityScheduleLine =
        setupCityDays.length === setupCities.length && setupCities.length >= 2
          ? (() => {
              let cursor = 1;
              return setupCities
                .map((city, idx) => {
                  const len = setupCityDays[idx];
                  const startD = cursor;
                  const endD = cursor + len - 1;
                  cursor += len;
                  return `${city}: ${len} ${len === 1 ? 'day' : 'days'} (Day ${startD}${endD > startD ? `–Day ${endD}` : ''})`;
                })
                .join(' -> ');
            })()
          : '';

      const prompt = hasNaturalPrompt
        ? `User described their upcoming trip in natural language: "${String(naturalPrompt).trim()}".
Fallback baseline if unspecified in user text: days=${plannedDays}, departureDate=${setup?.departureDate || '2026-11-14'}, Weekday Calendar=[${weekdayCalendar}], travelers=${travelersCount}, budgetTier=${budgetTierDesc}.
${baggageConstraintNote}
${crewGearNote}
${customPackPrefs ? `Packing Customization: ${customPackPrefs}` : ''}
Parse all destinations, exact trip duration ("days" between 1 and 30; use the duration stated in user text first, or ${plannedDays} if not mentioned), budget preference, style, activities, and laundry preference, then generate a complete, realistic multi-day travel plan covering EVERY SINGLE DAY from Day 1 through Day N.`
        : `Generate a complete, realistic multi-city travel intelligence, laundry- & airline-weight-aware packing list, budget-aligned daily & hotel/transit benchmark, and a FULL ${plannedDays}-day spatially clustered itinerary covering EVERY SINGLE DAY from Day 1 to Day ${plannedDays} for:
Destinations (in travel order): ${setupCities.join(' -> ')}${perCityScheduleLine ? `\nEXACT Per-City Day Allocation (MUST FOLLOW STRICTLY): ${perCityScheduleLine}` : ''}
Dates: ${setup?.departureDate || '2026-11-14'} to ${setup?.returnDate || '2026-11-18'} (strictly ${plannedDays} days; output "days": ${plannedDays})
Exact Calendar & Weekdays: ${weekdayCalendar}
Travel Style: ${setup?.tripStyle || '休闲度假'}
Budget Tier: ${budgetTierDesc}
${targetBudgetNote}
${baggageConstraintNote}
${crewGearNote}
Activities: ${(setup?.activities || ['城市徒步', '美食']).join(', ')}
Preferences: rewear=${Boolean(setup?.rewear)}, midTripLaundry=${Boolean(setup?.laundry)} (cycle every ${setup?.laundryIntervalDays || 5} days), travelers=${travelersCount}.${customPackPrefs ? `\nPacking Customization: ${customPackPrefs}` : ''}`;

      const dayCoverageRule = hasNaturalPrompt
        ? 'from Day 1 through Day N (where N is the returned "days" field, 1..30; 3-4 stops/day if N<=10, 2-3 key stops/day if N>10 — NEVER leave middle or final days empty)'
        : `from Day 1 through Day ${plannedDays} (${stopsPerDayGuide} realistic stops per day — NEVER leave middle or final days empty, and set "days": ${plannedDays})`;

      const response = await callGeminiWithRetry(
        () =>
          ai.models.generateContent({
            model: MODEL,
            contents: prompt,
            config: {
              systemInstruction: `You are an elite travel architect, budget strategist & aviation-savvy packing optimizer. ${getAiLangDirective(lang)} Keep accurate local street addresses and ISO currency codes.
CRITICAL DOMAIN & INSIDER TRAVELER RULES:
1. CAPSULE WARDROBE & AIRLINE LIMITS: If midTripLaundry is true or days > 7, cap clothing quantities to a 5-7 day capsule cycle and mention laundry strategy in "why". Strictly respect the airline baggage allowance (${carryOnLimitKg}kg carry-on / ${checkedLimitKg}kg checked).
2. DESTINATION-ACCURATE TAX REFUND (VAT) INTELLIGENCE:
   - Multi-country EU/Schengen: VAT customs validation MUST happen at the FINAL Schengen exit airport/border in the route (e.g., Paris -> Amsterdam stamps at Amsterdam Schiphol AMS, NOT Paris CDG). Mention same-day same-store receipt consolidation and note that refunding to a credit card saves 10-15% over airport cash-counter handling fees.
   - Japan: Tax-free applies in-store (>= 5,000 JPY same-store same-day; consumables sealed until departure; passport/Visit Japan Web QR required).
   - Non-refund countries (e.g., UK, USA, Hong Kong): Set vatThresholdLocal=0 and clearly state in vatRuleSummary that tourist retail VAT refund is not available (or zero-tax port) so travelers don't waste airport time.
3. LOCAL INSIDER SURVIVAL NOTE ("localEmergencyNote"): Provide 2-3 concrete, high-value local tips (e.g., free restaurant tap water etiquette like "Une carafe d'eau" in France, contactless bank card tap-in/out vs transit pass break-even rides, high-risk pickpocket station alerts, plus emergency number like 112/110).
4. REAL CALENDAR WEEKDAYS, DWELL BUFFERS & WALK-IN RAIN SWAPS:
   - Generate a COMPLETE multi-day itinerary in "timeline" covering EVERY SINGLE DAY ${dayCoverageRule}.
   - Cross-check the exact Weekday Calendar (${weekdayCalendar})! NEVER schedule an attraction on its weekly closed day (e.g., Louvre closed Tuesdays, Musée d'Orsay & Versailles closed Mondays, many European boutiques closed Sundays).
   - Arrival & Departure Pacing: On Day 1, account for airport arrival transfer + hotel bag drop before afternoon exploration. On the final Day, account for 11:00 hotel checkout + luggage storage and reserve a 3.5-hour pre-flight buffer at the exit airport if customs VAT stamping is required.
   - Dwell & Last-Entry Buffer: Schedule major museums at least 2 hours before closeTime (accounting for 30-45 min last-admission cutoffs).
   - Walk-In Friendly Rain Backups: For every outdoor stop (isOutdoor=true), provide an indoor rainSwapTitle/rainSwapDistrict/rainSwapAddress in the SAME or adjacent neighborhood that is WALK-IN FRIENDLY on rainy days (e.g., historic covered arcades/passages, permanent free/walk-in galleries, indoor food markets, grand museum cafes) — NEVER use venues that sell out weeks in advance (like Anne Frank House) as a spontaneous rain backup!
   - Every node MUST specify integer "day" (1..days), "city", "stopType" ("attraction" | "hotel" | "transit" | "dining" | "shopping"), accurate real-world WGS84 decimal coordinates ("lat", "lng") so 3D flight trajectories turn along real geography, realistic "estLocal" calibrated to the budget tier, and 1 evening anchor stop per day with isAnchor=true.
5. Set realistic "dailyBudgetLocal" (food, tickets, local transit per person in local currency) and "prepaidBudgetUsd" (estimated flights + hotels + intercity rail total in USD for the trip) aligned with the budget tier.
6. Organize packing into 8 to 13 rich, scenario-tailored categories AND assign every item a crisp "subCategory" (2 to 4 sub-categories per category, e.g. "核心身份与支付" / "0g数字通关与网络", "贴身基础打底" / "防风防雨外层", "海滩防晒修护" / "涉水浮潜装备"):
${getPackingGroupSchemaGuide(lang)}
   IMPORTANT for packing items:
   - Include zero-weight (unitWeightGrams=0, weightGrams=0) digital border passes/eSIM/QR codes where relevant (e.g., Visit Japan Web QR + ICOCA/Suica in Apple Wallet for Japan, destination eSIM, insurance PDF).
   - NEVER append "×2" or quantity suffixes inside item "name". Output clean item "name", concise "subCategory", integer "quantity", realistic single-piece "unitWeightGrams", and "weightGrams" = quantity * unitWeightGrams.
   - Map each item's "smartBagId" among: "cube_xl" | "cube_l" | "cube_m" | "cube_s" | "shoe_bag" | "toiletry_bag" | "doc_pouch" | "pill_box" | "edc_bag", set "morningOfDeparture" boolean, and set "ownership" ("shared" or "personal").
   - Set item "tag" strictly to one of these canonical enum values: "必需" | "核心" | "天气" | "保暖" | "备用" (the UI translates canonical tags automatically).
7. Generate 4-5 non-packing travel tasks in "tasks" (e.g., timed museum tickets that book out early, intercity rail seat reservation, eSIM/transit card setup, VAT customs prep) with category strictly among "门票预约" | "交通接送" | "住宿餐饮" | "通讯金融" | "其他事务", concise timing, and practical note.`,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              httpOptions: { timeout: 90_000 },
              responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cities: { type: Type.ARRAY, items: { type: Type.STRING } },
              days: { type: Type.INTEGER },
              tripStyle: { type: Type.STRING },
              intel: {
                type: Type.OBJECT,
                properties: {
                  routeTitle: { type: Type.STRING },
                  weatherSummary: { type: Type.STRING },
                  tempRange: { type: Type.STRING },
                  rainChance: { type: Type.STRING },
                  sunsetTime: { type: Type.STRING },
                  timezoneOffset: { type: Type.STRING },
                  plugType: { type: Type.STRING },
                  voltage: { type: Type.STRING },
                  currencyCode: { type: Type.STRING },
                  currencySymbol: { type: Type.STRING },
                  fxToUsd: { type: Type.NUMBER },
                  vatThresholdLocal: { type: Type.NUMBER },
                  vatExitAirport: { type: Type.STRING },
                  vatRuleSummary: { type: Type.STRING },
                  transitPassName: { type: Type.STRING },
                  localEmergencyNote: { type: Type.STRING },
                },
                required: [
                  'routeTitle', 'weatherSummary', 'tempRange', 'rainChance',
                  'sunsetTime', 'plugType', 'voltage', 'currencyCode',
                  'currencySymbol', 'fxToUsd', 'vatThresholdLocal', 'vatExitAirport',
                  'vatRuleSummary', 'transitPassName', 'localEmergencyNote',
                ],
              },
              dailyBudgetLocal: { type: Type.NUMBER },
              prepaidBudgetUsd: { type: Type.NUMBER },
              packing: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    icon: { type: Type.STRING },
                    cubeLabel: { type: Type.STRING },
                    colorKey: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          subCategory: { type: Type.STRING },
                          why: { type: Type.STRING },
                          tag: { type: Type.STRING },
                          quantity: { type: Type.INTEGER },
                          unitWeightGrams: { type: Type.INTEGER },
                          weightGrams: { type: Type.INTEGER },
                          carryOnOnly: { type: Type.BOOLEAN },
                          morningOfDeparture: { type: Type.BOOLEAN },
                          smartBagId: { type: Type.STRING },
                          ownership: { type: Type.STRING },
                        },
                        required: ['id', 'name', 'subCategory', 'why', 'tag', 'quantity', 'unitWeightGrams', 'weightGrams'],
                      },
                    },
                  },
                  required: ['id', 'title', 'cubeLabel', 'colorKey', 'items'],
                },
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    day: { type: Type.INTEGER },
                    city: { type: Type.STRING },
                    stopType: { type: Type.STRING },
                    time: { type: Type.STRING },
                    closeTime: { type: Type.STRING },
                    title: { type: Type.STRING },
                    district: { type: Type.STRING },
                    address: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    estLocal: { type: Type.NUMBER },
                    rating: { type: Type.NUMBER },
                    isAnchor: { type: Type.BOOLEAN },
                    isOutdoor: { type: Type.BOOLEAN },
                    transitNote: { type: Type.STRING },
                    rainSwapTitle: { type: Type.STRING },
                    rainSwapDistrict: { type: Type.STRING },
                    rainSwapAddress: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'day',
                    'city',
                    'stopType',
                    'time',
                    'closeTime',
                    'title',
                    'district',
                    'address',
                    'estLocal',
                    'rating',
                    'transitNote',
                  ],
                },
              },
              wishlist: { type: Type.ARRAY, items: { type: Type.STRING } },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    timing: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['id', 'title', 'category', 'timing'],
                },
              },
              spatialSummary: { type: Type.STRING },
            },
            required: ['cities', 'days', 'intel', 'dailyBudgetLocal', 'packing', 'timeline', 'wishlist', 'tasks', 'spatialSummary'],
          },
        },
          })
      ,
        { maxAttempts: 2 }
      );

      const parsed = parseGeminiJson(response.text, {});
      res.json(parsed);
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 生成行程方案失败', lang, 'Failed to generate AI trip plan');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 2. AI Multimodal Expense & Receipt Parser
  app.post('/api/ai/parse-expense', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        text,
        imageBase64,
        mimeType,
        currencyCode,
        vatThresholdLocal,
        fxToUsd,
        companionName,
        travelersCount,
      } = req.body;
      const ai = getAiClient();
      const targetCurrency = currencyCode || 'EUR';
      const safeTravelers = Math.max(1, Math.min(8, Number(travelersCount) || 2));
      const isSolo = safeTravelers <= 1;
      const partnerLabel = isSolo
        ? ''
        : String(companionName || '').trim() || (lang === 'zh-CN' ? '同行伙伴' : 'Companion');
      const equalSharePct = Math.round(100 / Math.max(2, safeTravelers));

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64 && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        });
      }
      parts.push({
        text: `Parse this travel expense into structured ledger fields.
Destination currency: ${targetCurrency} (approx 1 ${targetCurrency} = ${Number(fxToUsd) || 1.08} USD), local VAT refund threshold: ${vatThresholdLocal ?? 100.01}, group size: ${safeTravelers} traveler(s)${isSolo ? ' (Solo trip)' : `, companion name: "${partnerLabel}"`}.
User input / note: "${text || 'Please read the attached receipt image and extract merchant, total amount, category, and tax info.'}"`,
      });

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: { parts },
          config: {
            systemInstruction: `You are a travel finance & tax-refund parser. Classify expenses accurately into:
- amountLocal: numeric total converted into destination currency (${targetCurrency}). If the receipt or text explicitly uses another currency (e.g. USD, CNY/人民币, JPY, GBP, CHF), convert it accurately to ${targetCurrency} and state the original currency & amount in "note".
- bucket: "daily" (meals, coffee, museum tickets, subway, groceries) OR "shopping" (retail, fashion, electronics, souvenirs, gear, pharmacy cosmetics) OR "prepaid" (flights, intercity trains, hotels).
- account: "cash" | "card" | "transit"
- split:
  ${
    isSolo
      ? '* Because group size is 1 (Solo trip), ALWAYS set split to "me", mySharePct to 100, and paidBy to "me" unless the user explicitly states splitting with another person.'
      : `* "me": 100% personal expense paid by me (default for personal shopping/souvenirs unless AA mentioned)
  * "split": equal ${safeTravelers}-person AA split paid by me (mySharePct=${equalSharePct})
  * "partner": equal ${safeTravelers}-person AA split paid upfront by companion (${partnerLabel})
  * "ratio": custom percentage/ratio split OR proxy payment (e.g. "三七开我出70%", "六四开", "帮${partnerLabel}代买全算她的"). When split === "ratio", set integer mySharePct (0..100 for MY share %) and set paidBy to "me" or "partner".`
  }
- vatEligible: true ONLY if bucket === "shopping", local VAT threshold > 0, and amountLocal >= local threshold (or receipt explicitly states Tax-Free / Détaxe).
- SMART VAT CONSOLIDATION TIP IN "note": If bucket === "shopping", local VAT threshold > 0, and amountLocal is between 55% and 99.9% of the threshold, append a concise helpful tip in "note" stating the exact remaining gap to reach same-day same-store tax-free eligibility (e.g., how much more in the same store today unlocks VAT refund). If vatEligible is true, briefly remind to keep passport/Tax-Free form & choose card refund over high-fee airport cash refund.
${getAiLangDirective(lang)}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                amountLocal: { type: Type.NUMBER },
                bucket: { type: Type.STRING },
                account: { type: Type.STRING },
                split: { type: Type.STRING },
                mySharePct: { type: Type.INTEGER },
                paidBy: { type: Type.STRING },
                vatEligible: { type: Type.BOOLEAN },
                note: { type: Type.STRING },
              },
              required: ['title', 'amountLocal', 'bucket', 'account', 'split', 'mySharePct', 'paidBy', 'vatEligible', 'note'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 消费小票解析失败', lang, 'Failed to parse receipt or expense');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 3. AI Spatial & Weather Itinerary Optimizer (Per-Day Recluster / Delay / Wishlist Insert / Generate Day)
  app.post('/api/ai/optimize-itinerary', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        cities,
        departureDate,
        travelers,
        day,
        city,
        totalDays,
        activities,
        tripStyle,
        timeline,
        actionType,
        delayMinutes,
        wishlistItem,
        weatherSummary,
      } = req.body;
      const ai = getAiClient();
      const safeTotalDays = Math.max(1, Number(totalDays) || 5);
      const targetDay = Number(day) || 1;
      const targetCity = String(city || (cities && cities[0]) || '巴黎');
      const weekdayCalendar = buildServerWeekdaySchedule(departureDate, safeTotalDays, lang);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Action requested: "${actionType}" on Day ${targetDay} of ${safeTotalDays} (City: "${targetCity}", delayMinutes=${delayMinutes || 0}, wishlistItem="${wishlistItem || ''}").
Trip Calendar & Weekdays: ${weekdayCalendar}. Travelers: ${Number(travelers) || 2}.
Full trip route: ${(cities || ['巴黎']).join(' -> ')}. Style: ${tripStyle || '休闲度假'}. Interests: ${(activities || []).join(', ')}. Weather: ${weatherSummary || '阵雨'}.
Current Day ${targetDay} timeline JSON: ${JSON.stringify(timeline || [])}`,
          config: {
            systemInstruction: `You are a spatial route, weekday-closure & dwell-time optimizer for travelers focusing ONLY on Day ${targetDay} (${targetCity}).
- NEVER remove nodes whose locked is true, whose isAnchor is true, or whose id appears in any travelPass.linkedTimelineNodeId; if a date or city conflict makes this impossible, return a conflict warning instead of deleting.
- Every returned timeline node MUST have day=${targetDay}, city="${targetCity}", accurate real-world WGS84 decimal coordinates ("lat", "lng"), and stopType strictly among "attraction" | "hotel" | "transit" | "dining" | "shopping" (preserving existing stopType/lat/lng on existing IDs).
- WEEKDAY CLOSURE & DWELL-TIME DISCIPLINE: Check Day ${targetDay}'s exact weekday in Trip Calendar (${weekdayCalendar})! Never add or move a museum/shop onto its weekly closed day (e.g., Louvre closed Tue, Orsay/Versailles closed Mon, EU shops closed Sun); if an existing stop falls on a closed weekday or leaves <90 minutes visit buffer before closeTime (or hits the 30-min museum last-entry cutoff), flag it clearly in warningNote!
- WALK-IN RAIN BACKUPS: Whenever providing indoor rainSwapTitle/rainSwapDistrict/rainSwapAddress for outdoor stops, pick walk-in friendly indoor spots in the same neighborhood (covered arcades, free/walk-in permanent collections, indoor food halls) — NEVER venues that sell out weeks ahead!
- If actionType === "recluster": Re-order non-anchored, non-visited daytime stops on Day ${targetDay} so geographic districts flow smoothly without cross-town zig-zags, keeping anchor dinner/sunset fixed. Preserve stopType, visited, logged, and linkedExpenseId fields on existing IDs. Explain exact time/distance saved in spatialSummary.
- If actionType === "delay": Shift non-visited, non-logged upcoming stops on Day ${targetDay} forward by delayMinutes, check if any stop now leaves <90m museum dwell time or <45m general visit time before closeTime (30m last-entry cutoff), and warn explicitly in warningNote! Preserve stopType, visited, logged, and linkedExpenseId fields.
- If actionType === "insert_wishlist": Insert wishlistItem into the most geographically adjacent free slot on Day ${targetDay} without creating rush, weekday closure, or closing conflict. Preserve existing nodes' stopType, visited, logged, and linkedExpenseId fields.
- If actionType === "generate_day": Generate 4 to 5 realistic, spatially clustered stops for Day ${targetDay} in "${targetCity}" respecting Day ${targetDay}'s weekday, arrival pacing on Day 1, and a 3.5-hour pre-flight + VAT customs buffer if Day ${targetDay} === ${safeTotalDays}. Include 1 outdoor stop with walk-in indoor rainSwapTitle/rainSwapDistrict/rainSwapAddress and 1 evening dinner/anchor stop with isAnchor=true.
${getAiLangDirective(lang)} Keep real local street addresses.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                spatialSummary: { type: Type.STRING },
                warningNote: { type: Type.STRING },
                timeline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      day: { type: Type.INTEGER },
                      city: { type: Type.STRING },
                      stopType: { type: Type.STRING },
                      time: { type: Type.STRING },
                      closeTime: { type: Type.STRING },
                      title: { type: Type.STRING },
                      district: { type: Type.STRING },
                      address: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      estLocal: { type: Type.NUMBER },
                      rating: { type: Type.NUMBER },
                      visited: { type: Type.BOOLEAN },
                      logged: { type: Type.BOOLEAN },
                      linkedExpenseId: { type: Type.STRING },
                      isAnchor: { type: Type.BOOLEAN },
                      isOutdoor: { type: Type.BOOLEAN },
                      transitNote: { type: Type.STRING },
                      rainSwapTitle: { type: Type.STRING },
                      rainSwapDistrict: { type: Type.STRING },
                      rainSwapAddress: { type: Type.STRING },
                    },
                    required: [
                      'id',
                      'day',
                      'city',
                      'stopType',
                      'time',
                      'closeTime',
                      'title',
                      'district',
                      'address',
                      'estLocal',
                      'rating',
                      'logged',
                      'transitNote',
                    ],
                  },
                },
              },
              required: ['spatialSummary', 'warningNote', 'timeline'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 行程动线优化失败', lang, 'Failed to optimize day route');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 3B. AI Full-Trip Budget-Aware Itinerary Architect (Covers ALL Days 1..N with Attractions, Hotels & Transit)
  app.post('/api/ai/plan-full-itinerary', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        cities,
        cityDays,
        departureDate,
        days,
        tripStyle,
        activities,
        travelers,
        intel,
        budgetTier,
        targetDailyBudgetLocal,
        includeHotelSuggestions,
        includeTransitDetails,
        wishlist,
      } = req.body;

      const ai = getAiClient();
      const plannedDays = Math.min(30, Math.max(1, Number(days) || 5));
      const weekdayCalendar = buildServerWeekdaySchedule(departureDate, plannedDays, lang);
      const stopsPerDayGuide = plannedDays <= 10 ? '3 to 4' : '2 to 3';
      const cleanCities = Array.isArray(cities) && cities.length > 0 ? cities : ['巴黎'];
      const cleanCityDays: number[] =
        Array.isArray(cityDays) && cityDays.length === cleanCities.length
          ? cityDays.map((v: unknown) => Math.max(1, Math.round(Number(v) || 1)))
          : [];
      const perCityFullScheduleLine =
        cleanCityDays.length === cleanCities.length && cleanCities.length >= 2
          ? (() => {
              let cursor = 1;
              return cleanCities
                .map((city: string, idx: number) => {
                  const len = cleanCityDays[idx];
                  const startD = cursor;
                  const endD = cursor + len - 1;
                  cursor += len;
                  return `${city}: ${len} ${len === 1 ? 'day' : 'days'} (Day ${startD}${endD > startD ? `–Day ${endD}` : ''})`;
                })
                .join(' -> ');
            })()
          : '';
      const tier = budgetTier === 'budget' || budgetTier === 'luxury' ? budgetTier : 'comfort';
      const tierLabel =
        tier === 'budget'
          ? '经济省钱档（高性价比青旅或位置便利的三星酒店、地铁/城际快线二等座为主、地道平价小馆、优选免费/高性价比景点）'
          : tier === 'luxury'
          ? '品质尊享档（地标奢华或五星精品酒店、机场专车/高铁头等座、景观高分餐厅、免排队快速通道门票）'
          : '舒适轻奢档（核心街区口碑四星精品酒店、高效城际高铁+市内地铁、高分 Bistro 与必游文化场馆）';

      const currencyCode = intel?.currencyCode || 'EUR';
      const currencySymbol = intel?.currencySymbol || '€';
      const targetDaily = Number(targetDailyBudgetLocal) > 0 ? Number(targetDailyBudgetLocal) : 0;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Design a COMPLETE ${plannedDays}-day itinerary covering EVERY SINGLE DAY from Day 1 to Day ${plannedDays}.
Route (in travel order): ${cleanCities.join(' -> ')}${perCityFullScheduleLine ? `\nEXACT Per-City Day Allocation (MUST FOLLOW STRICTLY): ${perCityFullScheduleLine}` : ''}
Exact Calendar & Weekdays: ${weekdayCalendar}
Travelers: ${Number(travelers) || 2}, Style: ${tripStyle || '休闲度假'}, Interests: ${(activities || []).join(', ')}.
Weather: ${intel?.weatherSummary || '温和微凉'}, Final Departure Exit Airport: ${intel?.vatExitAirport || `${cleanCities[cleanCities.length - 1]} 机场`}.
Currency: ${currencyCode} (${currencySymbol}).
Budget Tier: ${tierLabel}
${targetDaily > 0 ? `User Target Daily Food/Sightseeing Budget per person: ${currencySymbol}${targetDaily} ${currencyCode}/day (calibrate stop estLocal accordingly!).` : 'Suggest an ideal daily budget in recommendedDailyBudgetLocal for this tier.'}
Include hotel recommendations on arrival/city-transfer days: ${includeHotelSuggestions !== false ? 'YES' : 'NO'}.
Include airport/intercity transit legs: ${includeTransitDetails !== false ? 'YES' : 'NO'}.
Wishlist places to weave into appropriate days if feasible: ${JSON.stringify(wishlist || [])}.`,
          config: {
            systemInstruction: `You are an expert multi-city travel architect specializing in budget-calibrated, weekday-aware, zero-backtracking itineraries.
${getAiLangDirective(lang)} Keep accurate real-world street addresses.
NEVER remove nodes whose locked is true, whose isAnchor is true, or whose id appears in any travelPass.linkedTimelineNodeId; if a date or city conflict makes this impossible, return a conflict warning instead of deleting.

MANDATORY COVERAGE & REAL-WORLD PACING RULES:
1. You MUST output nodes for EVERY SINGLE DAY from day=1 through day=${plannedDays} (${stopsPerDayGuide} worthwhile stops per day — NEVER omit any day between 1 and ${plannedDays}).
2. WEEKDAY CLOSURE AVOIDANCE: Strictly cross-check ${weekdayCalendar}! Never schedule museums or shopping districts on their weekly closed day (e.g., Louvre closed Tue, Orsay/Versailles closed Mon, European shops closed Sun). Mention weekday advantage in daySummaries when relevant.
3. ARRIVAL & DEPARTURE REALISM:
   - On Day 1, start with airport arrival transfer + hotel bag drop before afternoon neighborhood sightseeing.
   - On a city transition day, set "city" to "CityA → CityB", start with the intercity train/flight ("stopType": "transit"), followed by hotel check-in ("stopType": "hotel") and afternoon stops in CityB.
   - On Day ${plannedDays}, account for 11:00 hotel checkout + luggage storage and schedule final airport arrival at ${intel?.vatExitAirport || 'departure airport'} at least 3.5 hours before international flight for customs VAT refund stamping ("stopType": "transit").
4. For each node, provide:
   - "stopType": strictly one of "attraction" | "hotel" | "transit" | "dining" | "shopping"
   - Accurate real-world WGS84 decimal "lat" and "lng" coordinates for the stop's venue.
   - Leave >= 2 hours dwell time before closeTime for major museums (respecting 30-45 min last-admission cutoffs).
   - Every node's "transitNote" MUST specify concrete local transit directions (metro/tram line, contactless tap tip, or walking minutes).
   - Mark 1 evening dinner or key evening meetup stop per day with "isAnchor": true.
   - For outdoor spots ("isOutdoor": true), always provide WALK-IN FRIENDLY indoor "rainSwapTitle", "rainSwapDistrict", and "rainSwapAddress" in the same neighborhood (covered arcades, walk-in galleries, indoor food halls — NEVER sold-out-weeks-ahead ticketed venues).
   - Set realistic "estLocal" per person (in ${currencyCode}) strictly matching the requested budget tier & target daily budget.
5. Return:
   - "budgetStrategySummary": 2-3 crisp sentences summarizing hotel tier & neighborhood picks, intercity/local transit pass vs contactless strategy, daily food/ticket pacing, and VAT customs reminder.
   - "recommendedDailyBudgetLocal": realistic daily spending budget per person (food, attractions, local transit — excluding hotel & international flight).
   - "recommendedHotelAndTransitTotalLocal": estimated total accommodation + airport/intercity rail cost across the ${plannedDays} days in ${currencyCode}.
   - "daySummaries": array of { "day": 1..${plannedDays}, "summary": "1-sentence spatial, weekday & pacing note for that day" }.
   - "timeline": complete list of stops across Days 1..${plannedDays}.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              budgetStrategySummary: { type: Type.STRING },
              recommendedDailyBudgetLocal: { type: Type.NUMBER },
              recommendedHotelAndTransitTotalLocal: { type: Type.NUMBER },
              daySummaries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                  },
                  required: ['day', 'summary'],
                },
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    day: { type: Type.INTEGER },
                    city: { type: Type.STRING },
                    stopType: { type: Type.STRING },
                    time: { type: Type.STRING },
                    closeTime: { type: Type.STRING },
                    title: { type: Type.STRING },
                    district: { type: Type.STRING },
                    address: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    estLocal: { type: Type.NUMBER },
                    rating: { type: Type.NUMBER },
                    isAnchor: { type: Type.BOOLEAN },
                    isOutdoor: { type: Type.BOOLEAN },
                    transitNote: { type: Type.STRING },
                    rainSwapTitle: { type: Type.STRING },
                    rainSwapDistrict: { type: Type.STRING },
                    rainSwapAddress: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'day',
                    'city',
                    'stopType',
                    'time',
                    'closeTime',
                    'title',
                    'district',
                    'address',
                    'estLocal',
                    'rating',
                    'transitNote',
                  ],
                },
              },
            },
            required: [
              'budgetStrategySummary',
              'recommendedDailyBudgetLocal',
              'recommendedHotelAndTransitTotalLocal',
              'daySummaries',
              'timeline',
            ],
          },
        },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 全行程智能规划失败', lang, 'Failed to generate full itinerary');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 4. AI Local Phrase / Taxi / Tax-Free / Dietary Card
  app.post('/api/ai/local-card', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const { city, scenario, targetName, targetAddress } = req.body;
      const ai = getAiClient();

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Destination city: ${city}. Scenario: ${scenario}. Place: ${targetName || ''} (${targetAddress || ''}).`,
          config: {
            systemInstruction: `Generate a crystal-clear, large-text communication card in the native language of the destination city so a traveler can show their phone screen directly to a taxi driver, waiter, or store clerk. Include simple phonetic pronunciation and 1 practical local etiquette tip. ${getAiLangDirective(lang)} Keep localTitle and localAddressOrPhrase in the destination's native language!`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                localTitle: { type: Type.STRING },
                localAddressOrPhrase: { type: Type.STRING },
                pronunciationHint: { type: Type.STRING },
                etiquetteTip: { type: Type.STRING },
                languageLabel: { type: Type.STRING },
              },
              required: ['localTitle', 'localAddressOrPhrase', 'pronunciationHint', 'etiquetteTip', 'languageLabel'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 当地沟通卡生成失败', lang, 'Failed to generate local communication card');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 4b. AI Nearby Hotels Recommendation (Places API fallback)
  app.post('/api/ai/recommend-nearby-hotels', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const city = String(req.body?.city || '').trim();
      if (!city) {
        res.status(400).json({
          error:
            lang === 'zh-CN'
              ? '缺少目的地城市，无法推荐附近酒店'
              : 'Missing destination city for nearby hotel recommendations',
        });
        return;
      }

      const day = Math.max(1, Math.round(Number(req.body?.day) || 1));
      const budgetTier = String(req.body?.budgetTier || 'comfort');
      const currencyCode = String(req.body?.currencyCode || 'EUR');
      const currencySymbol = String(req.body?.currencySymbol || '€');
      const tripStyle = String(req.body?.tripStyle || '').trim();
      const rawStops = Array.isArray(req.body?.stops) ? req.body.stops : [];
      type NearbyStop = {
        title: string;
        district: string;
        address: string;
        lat?: number;
        lng?: number;
      };
      const stops: NearbyStop[] = rawStops
        .map((s: Record<string, unknown>) => ({
          title: String(s?.title || '').trim(),
          district: String(s?.district || '').trim(),
          address: String(s?.address || '').trim(),
          lat: typeof s?.lat === 'number' ? s.lat : undefined,
          lng: typeof s?.lng === 'number' ? s.lng : undefined,
        }))
        .filter((s: NearbyStop) => Boolean(s.title));

      const stopTitles = stops.map((s) => s.title);
      const fallbackNearest = stopTitles[0] || city;

      const stopLines =
        stops.length > 0
          ? stops
              .map(
                (s, idx) =>
                  `${idx + 1}. ${s.title}${s.district ? ` · ${s.district}` : ''}${
                    s.address ? ` · ${s.address}` : ''
                  }${
                    typeof s.lat === 'number' && typeof s.lng === 'number'
                      ? ` · (~${s.lat.toFixed(4)},${s.lng.toFixed(4)})`
                      : ''
                  }`
              )
              .join('\n')
          : '(No stop list provided — recommend well-located hotels near the city center for this day.)';

      const budgetGuide =
        budgetTier === 'budget'
          ? 'budget / value stays (clean mid-range or well-reviewed hostels/boutique value)'
          : budgetTier === 'luxury'
          ? 'upscale / luxury boutique or 5-star stays in prime districts'
          : 'comfort / quality 3–4 star boutique stays with strong location';

      const scrubNearestTitleJunk = (raw: string): string => {
        let t = String(raw || '').trim();
        t = t.replace(/\?\s*No,\s*exact title:\s*/gi, ' ');
        t = t.replace(/\bexact title:\s*/gi, ' ');
        t = t.replace(/\s*\?\s*$/g, '');
        t = t.replace(/\s{2,}/g, ' ').trim();
        return t;
      };

      const matchNearestStopTitle = (raw: string): string => {
        const cleaned = scrubNearestTitleJunk(raw);
        if (!cleaned) return fallbackNearest;
        const exact = stopTitles.find((title) => title === cleaned);
        if (exact) return exact;
        if (cleaned.length >= 4) {
          const includesHit = stopTitles.find(
            (title) =>
              (title.length >= 4 && cleaned.includes(title)) ||
              (cleaned.length >= 4 && title.includes(cleaned))
          );
          if (includesHit) return includesHit;
        }
        return fallbackNearest;
      };

      const haversineWalkMinutes = (
        hotelLat?: number,
        hotelLng?: number
      ): number | null => {
        if (
          typeof hotelLat !== 'number' ||
          typeof hotelLng !== 'number' ||
          !Number.isFinite(hotelLat) ||
          !Number.isFinite(hotelLng)
        ) {
          return null;
        }
        const withCoords = stops.filter(
          (s) =>
            typeof s.lat === 'number' &&
            typeof s.lng === 'number' &&
            Number.isFinite(s.lat) &&
            Number.isFinite(s.lng)
        );
        if (withCoords.length === 0) return null;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000;
        let best = Infinity;
        for (const s of withCoords) {
          const dLat = toRad((s.lat as number) - hotelLat);
          const dLng = toRad((s.lng as number) - hotelLng);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(hotelLat)) *
              Math.cos(toRad(s.lat as number)) *
              Math.sin(dLng / 2) ** 2;
          const meters = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (meters < best) best = meters;
        }
        if (!Number.isFinite(best)) return null;
        return Math.max(1, Math.min(60, Math.round(best / 80)));
      };

      type CleanHotel = {
        name: string;
        district: string;
        address: string;
        lat: number;
        lng: number;
        walkMinutes: number;
        nearestStopTitle: string;
        estNightlyLocal: number;
        reason: string;
      };

      const sanitizeNearbyHotels = (raw: unknown): CleanHotel[] => {
        const root =
          raw && typeof raw === 'object' ? (raw as { hotels?: unknown }) : {};
        const list = Array.isArray(root.hotels) ? root.hotels : [];
        const seen = new Set<string>();
        const out: CleanHotel[] = [];

        for (const item of list) {
          if (!item || typeof item !== 'object') continue;
          const row = item as Record<string, unknown>;
          const name = String(row.name || '').trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          const latNum = Number(row.lat);
          const lngNum = Number(row.lng);
          const lat = Number.isFinite(latNum) ? latNum : 0;
          const lng = Number.isFinite(lngNum) ? lngNum : 0;

          let walkMinutes: number;
          const rawWalk = Number(row.walkMinutes);
          if (Number.isFinite(rawWalk)) {
            walkMinutes = Math.max(1, Math.min(60, Math.round(rawWalk)));
          } else {
            walkMinutes = haversineWalkMinutes(lat, lng) ?? 10;
          }

          const estRaw = Number(row.estNightlyLocal);
          const estNightlyLocal =
            Number.isFinite(estRaw) && estRaw >= 0 ? estRaw : 0;

          const reason = String(row.reason || '')
            .trim()
            .slice(0, 140);

          out.push({
            name,
            district: String(row.district || '').trim(),
            address: String(row.address || '').trim(),
            lat,
            lng,
            walkMinutes,
            nearestStopTitle: matchNearestStopTitle(
              String(row.nearestStopTitle || '')
            ),
            estNightlyLocal,
            reason,
          });
          if (out.length >= 4) break;
        }
        return out;
      };

      const buildContents = (strictFill: boolean) =>
        `${
          strictFill
            ? 'CRITICAL RETRY: previous response had fewer than 4 hotels. You MUST return EXACTLY 4 distinct real hotels now.\n'
            : ''
        }Recommend exactly 4 real hotels for overnight stay.
City: ${city}
Day: ${day}
Budget tier: ${budgetTier} (${budgetGuide})
Trip style: ${tripStyle || 'general leisure'}
Local currency: ${currencySymbol} (${currencyCode})
Allowed nearestStopTitle values (copy EXACTLY one of these strings, never invent or annotate):
${stopTitles.length > 0 ? stopTitles.map((t, i) => `${i + 1}. ${t}`).join('\n') : `(use "${city}")`}
Today's attraction / dining stops (prefer hotels walkable to these districts):
${stopLines}`;

      const systemInstruction = `You are a local hotel scout for travelers. ${getAiLangDirective(lang)}
CRITICAL RULES:
1. Recommend ONLY real, currently operating hotels that exist in ${city}. Never invent fake hotel names.
2. Pick 4 hotels covering a sensible spread for the budget tier (${budgetGuide}), prioritizing walkability to the listed stop neighborhoods/districts.
3. NEVER invent star ratings, guest review scores, or review counts. Do not mention fabricated ratings in "reason".
4. "estNightlyLocal" is an approximate nightly rate in ${currencyCode} (${currencySymbol}) for the budget tier — a realistic estimate, not a live quote.
5. "reason" must be one short sentence in the traveler's language explaining why the hotel fits TODAY's route / districts.
6. "walkMinutes" is an approximate walking time in minutes from the hotel to the nearest listed stop (integer ≥ 1 when estimable).
7. "nearestStopTitle" MUST be copied EXACTLY from the provided stop title list — never append translations, questions marks, "exact title:", or commentary.
8. "lat"/"lng" are approximate WGS84 coordinates near the hotel — never claim precise pin-level accuracy.
9. You MUST output an array containing EXACTLY 4 hotel objects. Returning 1, 2, 3 or 5+ is a validation failure.`;

      const hotelsSchema = {
        type: Type.OBJECT,
        properties: {
          hotels: {
            type: Type.ARRAY,
            minItems: '4',
            maxItems: '4',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                district: { type: Type.STRING },
                address: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                walkMinutes: { type: Type.NUMBER },
                nearestStopTitle: { type: Type.STRING },
                estNightlyLocal: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
              required: [
                'name',
                'district',
                'address',
                'lat',
                'lng',
                'walkMinutes',
                'nearestStopTitle',
                'estNightlyLocal',
                'reason',
              ],
            },
          },
        },
        required: ['hotels'],
      };

      const ai = getAiClient();
      const callOnce = async (strictFill: boolean) => {
        const response = await callGeminiWithRetry(() =>
          ai.models.generateContent({
            model: MODEL,
            contents: buildContents(strictFill),
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: hotelsSchema,
            },
          })
        );
        return sanitizeNearbyHotels(
          parseGeminiJson(response.text, { hotels: [] })
        );
      };

      let hotels = await callOnce(false);

      if (hotels.length < 4) {
        try {
          const refill = await callOnce(true);
          const seen = new Set(hotels.map((h) => h.name.toLowerCase()));
          for (const h of refill) {
            if (seen.has(h.name.toLowerCase())) continue;
            seen.add(h.name.toLowerCase());
            hotels.push(h);
            if (hotels.length >= 4) break;
          }
        } catch {
          // Keep first sanitized result — never 500 on refill failure.
        }
      }

      hotels = hotels.slice(0, 4);
      res.json({ hotels });
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 附近酒店推荐失败',
        lang,
        'Failed to recommend nearby hotels'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 5. AI Packing Item Auto-Classifier, New Group Creator & Duplicate Detector
  app.post('/api/ai/classify-pack-item', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        inputText,
        existingGroups,
        existingItems,
        learnedPreferences,
        activeMemberName,
        routeTitle,
      } = req.body;
      const ai = getAiClient();

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Trip route: ${routeTitle || '巴黎 -> 阿姆斯特丹'}.
Current traveler adding item: ${activeMemberName || '本人'}.
User input: "${inputText}".
Existing packing groups: ${JSON.stringify(existingGroups || [])}.
Existing items across the trip (with owner info): ${JSON.stringify(existingItems || [])}.
User's learned category preferences (item keyword -> preferred group title): ${JSON.stringify(learnedPreferences || {})}.`,
        config: {
          systemInstruction: `You are an intelligent travel packing organizer. ${getAiLangDirective(lang)}
1. Parse the user's natural language or voice input into:
   - Clean item "name" WITHOUT any quantity words or "×N" suffixes (e.g. if user says "加三件短袖T恤" or "3 merino tees", output clean singular/base item name).
   - Integer "quantity" (>= 1, default 1 if unspecified; e.g. "三件" -> 3, "two pairs" -> 2).
   - Realistic single-piece estimated weight in grams "unitWeightGrams" (e.g. T-shirt=160, base layer=170, jeans=460, socks/underwear=65, adapter=90, umbrella=240).
   - Proportional total "weightGrams" = quantity * unitWeightGrams.
   - Practical 1-sentence reason ("why").
2. Respect learnedPreferences FIRST if the item matches any keyword/item the user previously moved manually!
3. Choose an existing group ID from existingGroups in targetGroupId whenever a matching category already exists (including scenario groups such as tops_layers, bottoms_underwear, footwear_accessories, beach_water, onsen_spa, ski_snow, hiking_camping, theme_park, fitness_sport, photography, remote_work, shopping_taxfree, baby_kids, formal_event, documents, clothing, electronics, toiletries, first_aid, extras). Also output a concise "subCategory" label (2-6 chars in Chinese or 2-3 words in English) matching the item's functional sub-type!
   Only create a brand-new group when no existing category fits (leave targetGroupId as "" and provide newGroupTitle, newGroupCubeLabel, and newGroupColorKey among "teal" | "lavender" | "lemon" | "peach" | "rose" | "mint").
4. Always set ownership to "personal". Check existingItems for semantic duplicates of shareable items (e.g., umbrella, power bank, adapter, medicine, hair dryer, camera tripod). If another member already packs a functionally equivalent item, set duplicateCandidateId to that item's id and write a warm question in duplicateQuestion in the requested response language. If no match exists, leave duplicateCandidateId as "" and duplicateQuestion as "".
5. Set morningOfDeparture=true for items typically used until departure morning (e.g., phone charger currently in use, toothbrush, contact lenses, coat worn out).
6. Set packingLayer: "bottom_heavy" (shoes, heavy coats, jeans), "middle" (shirts, sweaters), "top_small" (toiletries, pouches, medicine, cables), or "carry_on" (passport, power bank, camera, umbrella).
7. If the user's spoken or typed sentence mentions MULTIPLE distinct packing items, put the first item in the top-level fields and put all remaining items in extraItems (each with clean name, subCategory, quantity, unitWeightGrams, and weightGrams = quantity * unitWeightGrams). If only 1 item is mentioned, return extraItems as an empty array [].`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              why: { type: Type.STRING },
              tag: { type: Type.STRING },
              quantity: { type: Type.INTEGER },
              unitWeightGrams: { type: Type.INTEGER },
              weightGrams: { type: Type.INTEGER },
              carryOnOnly: { type: Type.BOOLEAN },
              morningOfDeparture: { type: Type.BOOLEAN },
              packingLayer: { type: Type.STRING },
              ownership: { type: Type.STRING },
              targetGroupId: { type: Type.STRING },
              newGroupTitle: { type: Type.STRING },
              newGroupCubeLabel: { type: Type.STRING },
              newGroupColorKey: { type: Type.STRING },
              duplicateCandidateId: { type: Type.STRING },
              duplicateQuestion: { type: Type.STRING },
              extraItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    subCategory: { type: Type.STRING },
                    why: { type: Type.STRING },
                    tag: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    unitWeightGrams: { type: Type.INTEGER },
                    weightGrams: { type: Type.INTEGER },
                    carryOnOnly: { type: Type.BOOLEAN },
                    morningOfDeparture: { type: Type.BOOLEAN },
                    packingLayer: { type: Type.STRING },
                    targetGroupId: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'why',
                    'tag',
                    'quantity',
                    'unitWeightGrams',
                    'weightGrams',
                    'carryOnOnly',
                    'morningOfDeparture',
                    'packingLayer',
                    'targetGroupId',
                  ],
                },
              },
            },
            required: [
              'name',
              'why',
              'tag',
              'quantity',
              'unitWeightGrams',
              'weightGrams',
              'carryOnOnly',
              'morningOfDeparture',
              'packingLayer',
              'ownership',
              'targetGroupId',
              'newGroupTitle',
              'newGroupCubeLabel',
              'newGroupColorKey',
              'duplicateCandidateId',
              'duplicateQuestion',
              'extraItems',
            ],
          },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 物品智能归类失败', lang, 'Failed to classify packing item');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 6. AI Smart Packing 9-Bag / Cube Allocator (Allocates items without mutating checklist categories)
  app.post('/api/ai/smart-pack-cubes', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const { routeTitle, weatherSummary, items } = req.body;
      const ai = getAiClient();

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Trip route: ${routeTitle || '巴黎 -> 阿姆斯特丹'} (${weatherSummary || '阴转阵雨'}).
Checklist items to allocate into 9 physical packing containers: ${JSON.stringify(items || [])}.`,
        config: {
          systemInstruction: `You are an expert travel luggage organizer. Allocate EVERY input item into the single best physical container among these exact 9 bagId values:
- "cube_xl": XL Packing Cube (heavy coats, trenches, down jackets, bulky outerwear)
- "cube_l": L Packing Cube (jeans, trousers, sweaters, hoodies, dresses)
- "cube_m": M Packing Cube (base layers, shirts, T-shirts, mid-size tops, sleepwear)
- "cube_s": S Packing Cube (underwear, socks, small accessories, travel adapters/cables not needed mid-flight)
- "shoe_bag": Shoe Bag (sneakers, backup walking shoes, foldable hotel slippers)
- "toiletry_bag": 洗漱包 (100ml liquid bottles, toothbrush/toothpaste, contact lenses, skincare/cosmetics)
- "doc_pouch": 证件包 (passport, visa, flight/hotel printouts, travel insurance, currency/cards)
- "pill_box": 药盒 (fever/pain meds, stomach meds, band-aids, personal prescriptions)
- "edc_bag": 随时携带的包 (power bank, camera + spare battery, phone charger needed until departure morning, compact umbrella, in-flight essentials)
Also return a concise 1-sentence summaryTip on how to arrange these bags inside the suitcase. ${getAiLangDirective(lang)}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryTip: { type: Type.STRING },
              allocations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemId: { type: Type.STRING },
                    bagId: { type: Type.STRING },
                  },
                  required: ['itemId', 'bagId'],
                },
              },
            },
            required: ['summaryTip', 'allocations'],
          },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 智能分包计算失败', lang, 'Failed to allocate smart packing bags');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 7. AI Audio Transcription for Voice Packing & Travel Tasks (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe-audio', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    const isEn = lang !== 'zh-CN';
    try {
      const { audioBase64, mimeType, contextHint } = req.body;
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: isEn ? 'Missing audio data' : '缺少音频数据' });
        return;
      }

      const cleanMimeType =
        typeof mimeType === 'string' && mimeType.trim()
          ? mimeType.split(';')[0].trim()
          : 'audio/webm';

      const ai = getAiClient();
      const domainPrompt = isEn
        ? 'Transcribe this travel voice command, destination trip description, expense, packing item, task, or itinerary stop accurately in the exact language spoken (preserving city names like Tokyo/Kyoto/Okinawa/Paris, trip days, currency numbers, split ratios, venue names, and item quantities). Output ONLY the plain transcribed text with no quotes or explanation. Output an empty string if silent.'
        : contextHint === 'trip_setup'
        ? '请将这段新建旅行或定制打包偏好的语音准确转写为文本（精准保留东京、京都、大阪、冲绳、北海道、海滨、首尔、巴黎等目的地名，出行天数、人数、预算档位，以及海滩度假、温泉泡汤、滑雪、徒步、主题乐园、摄影、带娃、只带登机箱等场景描述）。只输出转写后的纯文本，不要任何解释、引号或前缀。如果完全没有说话声，请输出空字符串。'
        : contextHint === 'assistant' || contextHint === 'expense'
        ? '请将这段旅行随行指令、消费记账、行李补充、待办或行程咨询语音准确转写为文本（精准保留日元/欧元/美元等货币金额与小数、AA均摊、餐厅/商户/景点中英文名、物品件数等关键信息）。只输出转写后的纯文本，不要任何解释、引号或前缀。如果完全没有说话声，请输出空字符串。'
        : contextHint === 'task'
        ? '请将这段旅行待办事项语音准确转写为文本（保留景点名、eSIM、航班、时间等专有名词与数字）。只输出转写后的纯文本，不要任何解释、引号或前缀。如果完全没有说话声，请输出空字符串。'
        : '请将这段旅行打包物品语音准确转写为文本（保留物品名称、数量、品牌与专有名词）。只输出转写后的纯文本，不要任何解释、引号或前缀。如果完全没有说话声，请输出空字符串。';

      const audioContents = {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audioBase64,
            },
          },
          {
            text: domainPrompt,
          },
        ],
      };

      let response;
      try {
        response = await callGeminiWithRetry(() =>
          ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: audioContents,
          })
        );
      } catch (primaryTranscribeErr) {
        console.warn('gemini-3.5-transcribe unavailable, falling back to multimodal MODEL:', primaryTranscribeErr);
        response = await callGeminiWithRetry(() =>
          ai.models.generateContent({
            model: MODEL,
            contents: audioContents,
          })
        );
      }

      const transcript = (response.text ?? '').trim().replace(/^["'「『]+|["'」』]+$/g, '');
      res.json({ transcript });
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 语音转写失败', lang, 'Failed to transcribe voice audio');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 8. AI Natural-Language & Voice Travel Tasks Parser
  app.post('/api/ai/parse-trip-tasks', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    const isEn = lang !== 'zh-CN';
    try {
      const { inputText, routeTitle, departureDate } = req.body;
      if (!inputText || !String(inputText).trim()) {
        res.status(400).json({ error: isEn ? 'Please enter or dictate a travel to-do' : '请输入或说出要添加的旅行事务' });
        return;
      }

      const ai = getAiClient();
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Trip route: ${routeTitle || '巴黎 -> 阿姆斯特丹'}, Departure date: ${departureDate || '2026-11-14'}.
User spoken/typed input: "${String(inputText).trim()}".`,
        config: {
          systemInstruction: `You are a smart travel concierge assistant. Parse the user's spoken or typed sentence into 1 or more actionable non-packing travel tasks (such as buying museum/attraction tickets, booking airport/hotel transfers, reserving restaurants, activating eSIM/roaming, currency exchange, travel insurance, online check-in, pet/plant care, etc.).
Rules:
1. Extract every distinct task mentioned in the input (if the user mentions 2 or 3 tasks in one breath, return all of them as separate items in tasks).
2. Set category strictly to one of these canonical enum keys: "门票预约" | "交通接送" | "住宿餐饮" | "通讯金融" | "其他事务".
3. Set timing to a concise timing phrase extracted from the user's words or sensibly inferred.
4. Write a short, practical 1-sentence reminder in note. ${getAiLangDirective(lang)}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    timing: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['title', 'category', 'timing', 'note'],
                },
              },
            },
            required: ['tasks'],
          },
          },
        })
      );

      res.json(parseGeminiJson(response.text, { tasks: [] }));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 解析旅行事务失败', lang, 'Failed to parse travel to-dos');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 9. AI Packing Gap Diagnostic (Cross-audits itinerary, weather, airline baggage limits, crew size, VAT & transit against current items)
  app.post('/api/ai/audit-missing-items', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const { setup, intel, timelineTitles, existingItems, baggageLimits } = req.body;
      const ai = getAiClient();
      const travelersCount = Math.max(1, Number(setup?.travelers) || 2);
      const carryOnLimitKg = Number(baggageLimits?.carryOnLimitKg) || 7;
      const checkedLimitKg =
        baggageLimits?.checkedLimitKg !== undefined ? Number(baggageLimits.checkedLimitKg) : 23;
      const isCabinOnlyLcc = checkedLimitKg <= 0;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Trip route: ${intel?.routeTitle || (setup?.cities || ['巴黎']).join(' -> ')} (${setup?.days || 5} days, travelers: ${travelersCount}, style: ${setup?.tripStyle || '休闲度假'}).
Airline Baggage Limits: Carry-on ${carryOnLimitKg}kg / Checked ${checkedLimitKg}kg (${isCabinOnlyLcc ? 'STRICT CABIN-ONLY LCC — NO CHECKED BAG' : 'Standard carry-on + checked allowance'}).
Activities: ${(setup?.activities || []).join(', ')}.
Weather & Conditions: ${intel?.weatherSummary || ''} (${intel?.tempRange || ''}, ${intel?.rainChance || ''}).
Plug/Voltage: ${intel?.plugType || ''} (${intel?.voltage || ''}).
VAT Refund & Local Rules: ${intel?.vatExitAirport || ''} - ${intel?.vatRuleSummary || ''} | ${intel?.localEmergencyNote || ''}.
Planned Itinerary Stops: ${(timelineTitles || []).join(' -> ')}.
Items ALREADY in packing checklist (DO NOT suggest any duplicate or equivalent of these): ${JSON.stringify(existingItems || [])}.`,
        config: {
          systemInstruction: `You are a meticulous international travel & airline-compliance packing auditor.
Cross-reference the traveler's exact destinations, airline baggage rules (${carryOnLimitKg}kg carry-on / ${checkedLimitKg}kg checked), group size (${travelersCount}), weather/rain forecast, cobblestone/museum/rail stops, and customs VAT rules against their current packing list.
Identify 4 high-value, easily forgotten practical items that are genuinely MISSING from existingItems (for example: waterproof tax-free receipt folder for customs, hydrocolloid blister plasters, anti-theft wrist/crossbody phone tether for metro hubs, luggage scale for shopping return flight, solid shampoo bar or <=100ml silicone bottles for cabin-only flights, coin pouch for European lockers, etc.).
Rules:
1. NEVER suggest anything semantically overlapping with existingItems.
2. AIRLINE COMPLIANCE: ${
            isCabinOnlyLcc
              ? `Because Checked Allowance is 0kg (Cabin-Only LCC), NEVER suggest liquids >100ml, sharp tools, or bulky heavy gear; every suggestion MUST be 100% cabin-legal and ultralight (set carryOnOnly=true).`
              : `Ensure any lithium battery/electronics/customs document has carryOnOnly=true; heavier or >100ml items should have carryOnOnly=false.`
          }
3. GROUP EFFICIENCY: ${
            travelersCount >= 2
              ? `Because ${travelersCount} travelers are traveling together, include at least 1 high-utility group-shared item (quantity=1) and note in "why" that bringing 1 for the whole group saves weight.`
              : `Tailor items for solo travel self-reliance and anti-theft convenience.`
          }
4. Map targetGroupId strictly to one of the 6 standard IDs: "documents" | "clothing" | "electronics" | "toiletries" | "first_aid" | "extras", and provide its matching targetGroupTitle.
5. Map smartBagId strictly to one of: "cube_xl" | "cube_l" | "cube_m" | "cube_s" | "shoe_bag" | "toiletry_bag" | "doc_pouch" | "pill_box" | "edc_bag", and set "tag" strictly among "必需" | "核心" | "天气" | "保暖" | "备用".
6. Output clean item "name" WITHOUT "×N" suffixes, set integer "quantity" (>= 1) and single-piece "unitWeightGrams", with "weightGrams" = quantity * unitWeightGrams.
7. Write a specific, convincing 1-sentence reason in "why" tied directly to this trip's stops, airline limit, weather, or VAT/transit rules, and return a 1-sentence diagnosisSummary. ${getAiLangDirective(lang)}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosisSummary: { type: Type.STRING },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    why: { type: Type.STRING },
                    targetGroupId: { type: Type.STRING },
                    targetGroupTitle: { type: Type.STRING },
                    tag: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    unitWeightGrams: { type: Type.INTEGER },
                    weightGrams: { type: Type.INTEGER },
                    carryOnOnly: { type: Type.BOOLEAN },
                    morningOfDeparture: { type: Type.BOOLEAN },
                    smartBagId: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'why',
                    'targetGroupId',
                    'targetGroupTitle',
                    'tag',
                    'quantity',
                    'unitWeightGrams',
                    'weightGrams',
                    'carryOnOnly',
                    'morningOfDeparture',
                    'smartBagId',
                  ],
                },
              },
            },
            required: ['diagnosisSummary', 'suggestions'],
          },
          },
        })
      );

      res.json(parseGeminiJson(response.text, { diagnosisSummary: '', suggestions: [] }));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 查漏补缺诊断失败', lang, 'AI gap check failed');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 10. Unified AI Travel Assistant Dispatcher (Intent Classification + Multi-Module Execution + Live Data Q&A)
  app.post('/api/ai/assistant-dispatch', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    const isEn = lang !== 'zh-CN';
    try {
      const { inputText, activeTab, tripSnapshot, conversationHistory } = req.body;
      const trimmed = String(inputText || '').trim();
      if (!trimmed) {
        res.status(400).json({
          error: isEn
            ? 'Please enter or speak your travel command or question'
            : '请输入或说出你的旅行指令或问题',
        });
        return;
      }

      const recentHistory = Array.isArray(conversationHistory)
        ? conversationHistory.slice(-4)
        : [];
      const travelersCount = Math.max(
        1,
        Number(tripSnapshot?.travelersCount || tripSnapshot?.finance?.travelersCount) || 2
      );
      const isSolo = travelersCount <= 1;
      const fallbackCompanion = isEn ? 'Companion' : '同行伙伴';
      const companionName = isSolo
        ? ''
        : String(tripSnapshot?.finance?.companionName || fallbackCompanion).trim() ||
          fallbackCompanion;
      const equalSharePct = Math.round(100 / Math.max(2, travelersCount));

      const ai = getAiClient();
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Current active screen tab: "${activeTab || 'budget'}".
Recent session conversation history (for follow-up context like "再加一份" / "add one more" / "move to tomorrow"):
${recentHistory.length > 0 ? JSON.stringify(recentHistory) : '[]'}

Live Trip Snapshot (ground-truth numbers, weekdaySchedule, unpackedCriticalItems, closingTightStops, multi-day itinerary digest, airline weight limits & state):
${JSON.stringify(tripSnapshot || {})}

User spoken/typed input: "${trimmed}"`,
          config: {
            systemInstruction: `You are Trip Kit's world-class travel concierge and trip-editing assistant. Analyze the user's natural language input (along with recent conversation history if this is a follow-up) against the Live Trip Snapshot and return a helpful, concrete response. ${getAiLangDirective(lang)}
NEVER remove nodes whose locked is true, whose isAnchor is true, or whose id appears in any travelPass.linkedTimelineNodeId; if a date or city conflict makes this impossible, return a conflict warning instead of deleting.

CRITICAL PROPOSAL-FIRST RULE ("Nothing changes until you tap Apply"):
- Whenever you propose adding/removing itinerary stops, adding packing items, adding tasks, logging expenses, or toggling rainy-day mode, NEVER claim the change is already saved! Instead, phrase "reply" cleanly as a ready-to-apply proposal (e.g. in Chinese: "已为你准备好调整提案，点击下方「一键应用」即可写入行程。" / in English: "I've drafted this update for you—tap Apply below whenever you're ready to save it."), and provide a crisp 1-line "proposalSummary".
- The same proposal-first rule applies to date / destination / full-itinerary rebuild / packing-template changes: never claim they are already saved; clearly tell the user the update only writes after they tap Apply.

INTENT CLASSIFICATION & EXECUTION RULES:
1. "add_expense": Choose when the user logs 1 or more real expenses/purchases/meals/tickets.
   - Populate "expenses" array:
     * day: integer 1..(tripSnapshot.totalDays || 5). Default to tripSnapshot.currentDay unless user explicitly mentions another day (e.g. "昨天" -> Math.max(1, currentDay - 1), "Day 1"/"第一天" -> 1).
     * amountLocal: numeric total in destination currency (if user states USD/CNY/other currency, convert to destination currency using fxToUsd / standard rate and note the original currency in "note").
     * bucket: "daily" (meals, coffee, museum tickets, metro, snacks) | "shopping" (retail, fashion, luxury, souvenirs, duty-free) | "prepaid" (flights, hotels, intercity rail)
     * account: "cash" | "card" | "transit"
     * split:
       ${
         isSolo
           ? '- Group size is 1 (Solo trip): ALWAYS set split="me", mySharePct=100, paidBy="me" unless user explicitly states splitting with someone.'
           : `- "me" (100% personal)
       - "split" (equal ${travelersCount}-way AA paid by me; mySharePct=${equalSharePct})
       - "partner" (equal ${travelersCount}-way AA paid upfront by companion ${companionName})
       - "ratio" (unequal percentage/ratio split like 七三开/六四开/我承担70%, OR 100% proxy payment like 帮${companionName}代买). Set integer "mySharePct" (0..100 for MY share %) and "paidBy" ("me" | "partner").`
       }
     * vatEligible: true ONLY if bucket === "shopping", tripSnapshot.vatThresholdLocal > 0, AND amountLocal >= tripSnapshot.vatThresholdLocal
   - In "reply", summarize the proposed ledger entry and briefly mention remaining daily budget or VAT consolidation tip.
2. "add_packing": Choose when the user asks to add 1 or more luggage/packing items.
   - Populate "packingItems" array:
     * Clean item "name" in the target output language WITHOUT any quantity words or "×N" suffix
     * Integer "quantity" >= 1
     * Realistic single-piece "unitWeightGrams" and "weightGrams" = quantity * unitWeightGrams
     * Enforce aviation safety: set carryOnOnly=true on lithium power banks, spare batteries, passports, laptops, cameras, and essential meds!
     * "targetGroupId" strictly among: "documents" | "clothing" | "electronics" | "toiletries" | "first_aid" | "extras"
     * "tag" strictly among: "必需" | "核心" | "天气" | "保暖" | "备用"
3. "add_task": Choose when the user wants to add 1 or more non-packing travel to-dos/reminders.
   - Populate "tasks" array with "title", "category" strictly among "门票预约" | "交通接送" | "住宿餐饮" | "通讯金融" | "其他事务", concise "timing", and practical 1-sentence "note".
4. "add_stop": Choose when the user asks to add 1 or more attractions, great dinner spots, cafes, sunset photo spots, hidden gems, hotels, shops, or transit stops to any day of their itinerary (including inspiration requests like "Add a great dinner spot to day 1" or "给 Day 1 加一家本地口碑晚餐").
   - Pick a REAL, beloved, geographically logical venue matching that day's city and nearby neighborhood in tripSnapshot.allTimelineNodes.
   - Cross-check tripSnapshot.weekdaySchedule so you avoid closed days or warn if tight before closeTime!
   - Populate "stops" array with structured timeline nodes ("day", 24h "time", "closeTime", "stopType" among "attraction"|"hotel"|"transit"|"dining"|"shopping", "title", "district", "address", accurate WGS84 decimal "lat" and "lng", "estLocal", "transitNote", "isOutdoor", "isAnchor", "reason" explaining in 1 crisp line why this spot fits that day, and walk-in friendly indoor "rainSwapTitle"/"rainSwapDistrict"/"rainSwapAddress" when isOutdoor=true).
5. "relax_day": Choose when the user asks to make a specific day more relaxed, calmer, less rushed, slower-paced, or trim busy/redundant stops (e.g., "Make day 2 more relaxed", "把 Day 2 排轻松一点").
   - Inspect tripSnapshot.allTimelineNodes for the target day (default Day 2 if user says Day 2, or currentDay if unspecified).
   - Select 1–2 secondary, rushed, or out-of-the-way stops from that target day and put their EXACT existing "id" strings (verbatim from tripSnapshot.allTimelineNodes — NEVER invent fake IDs!) into "removeStops" with a clear "reason".
   - Optionally include 1 slow-paced local inspiration stop (such as a scenic café, riverside walk, or quiet garden) in "stops" if it improves the day's rhythm.
   - Explain in "reply" how much breathing room this frees up and ask the user to tap Apply to update the day.
6. "toggle_rain_swap": Choose when the user asks to switch to indoor rain backup stops or turn on/off rain mode.
   - Set "rainSwapAction" to "enable" (or "disable"), set "rainSwapDay" to the target day (default tripSnapshot.currentDay), and explain which outdoor stops switch to which walk-in indoor alternatives in "reply".
7. "local_card": Choose when the user asks for a foreign-language communication/translation card to show a waiter, shop clerk, or taxi driver.
   - Populate "localCards" with 1 crisp card in the destination's native language including phonetic "pronunciationHint" and 1 cultural "etiquetteTip".
8. "travel_tips": Choose when the user asks practical destination travel tips or local inspiration questions without explicitly requesting a timeline edit (e.g., visa/entry requirements, cheapest/fastest way from the airport into the city, tipping & cash vs. card culture, tax-free shopping & airport customs tips, safety/pickpocket alerts, best sunset photo spots, local dining etiquette).
   - Leave mutation arrays empty and "rainSwapAction": "none" (unless user explicitly asked to add a spot to a day, in which case use "add_stop" and you may STILL include helpful "travelTips").
   - Populate "travelTips" with 2–4 crisp, high-signal cards: each has a concise "title", concrete actionable "detail" (with real train/bus line names, realistic local fares, and insider advice), and "category" strictly among "visa" | "transit" | "money" | "culture" | "safety" | "food".
   - Keep "reply" to a crisp 1–2 sentence executive takeaway so the tip cards shine without repetition.
9. "qa_advice": Choose when the user asks a question about their specific trip data: pre-departure readiness, remaining budget, VAT tax-refund threshold gap, AA split balance, airline carry-on / checked luggage weight margin (use exact carryOnLimitGrams and checkedLimitGrams from tripSnapshot.packing!), multi-day schedule overview, or pending checklist items.
   - Leave mutation arrays empty and "rainSwapAction": "none".
   - Cite 100% EXACT figures from Live Trip Snapshot in a concise 2–4 sentence "reply". You may also include 1–3 structured "travelTips" cards if helpful.
10. "change_trip_date": Choose when the user wants to change departure/return dates, delay or advance the trip, or change trip length (e.g. "延后 3 天", "改成 7 天", "push departure one week").
   - Read current values from tripSnapshot.departureDate / returnDate / days.
   - For relative requests, compute absolute YYYY-MM-DD dates. Populate "dateChange" with departureDate, returnDate (YYYY-MM-DD), days (integer 1..30), and a one-line "note".
   - If the user only changes days, keep departureDate and sync returnDate by adding (days - 1) in UTC.
   - In "reply", warn that date changes affect weekdays, closing hours, weather and daily budgets—ask them to review after Apply. Never claim dates are already updated.
11. "change_destination": Choose when the user wants to swap cities/countries or redirect a day to another city.
   - Populate "destinationChange" with "cities" (1..6 trimmed city strings), optional "cityDays" (same length as cities), and "note".
   - ALSO populate "itineraryRebuild" (targetMode default "new", naturalPrompt = the user's original request) because city swaps make existing stop addresses/coords/weather inconsistent—full regenerations must go through the existing plan-trip pipeline.
   - In "reply", state clearly that a NEW trip copy will be saved and the current trip stays unchanged, unless the user explicitly asked to overwrite the current trip.
12. "rebuild_itinerary": Choose when the user wants a full replan / brand-new itinerary / cross-province rethink.
   - Populate "itineraryRebuild" with naturalPrompt (verbatim user text—must not be empty), targetMode ("new" | "overwrite"; DEFAULT "new"; only use "overwrite" when the user explicitly says overwrite/replace current/don't create a new copy), optional setupPatch (only existing TripSetup keys like cities/days/departureDate/tripStyle/specialScenarios), confirmOverwrite fixed false, and note.
   - Do NOT invent per-day stops, lat/lng, or addresses here—rebuild always reuses /api/ai/plan-trip.
   - In "reply", explain default save-as-new behavior, and that overwrite resets packing checks / expenses / visited marks.
13. "change_packing_template": Choose when the user wants to switch packing scenarios/templates (ski, kids, business, beach, etc.) or regenerate the packing list for a new purpose.
   - Populate "packingTemplate" with scenarioIds (ONLY valid PACKING_SCENARIO_SPECS ids such as baby/kids/hiking/beach/swimming/onsen/ski_snow/theme_park/camping/fitness/photography/remote_work/formal_event/shopping_taxfree/medication/sensitive_skin/cabin_only), optional tripPurpose (leisure|business|both), optional customNote, and note.
   - In "reply", explain the list will smart_merge so already-checked packing progress is preserved.

FOLLOW-UP SUGGESTIONS:
- Always populate "followUpSuggestions" with 2–3 short, natural, clickable next questions/actions relevant to the user's trip and this turn (max ~18 Chinese characters or ~8 English words each). Examples: "把 Day 2 排得更轻松一点", "机场进城最省钱路线？", "给 Day 1 加一家本地晚餐".
- When this turn involves dates, cities, or packing templates, include related next-step suggestions.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: { type: Type.STRING },
                reply: { type: Type.STRING },
                proposalSummary: { type: Type.STRING },
                rainSwapAction: { type: Type.STRING },
                rainSwapDay: { type: Type.INTEGER },
                expenses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      amountLocal: { type: Type.NUMBER },
                      bucket: { type: Type.STRING },
                      account: { type: Type.STRING },
                      split: { type: Type.STRING },
                      mySharePct: { type: Type.INTEGER },
                      paidBy: { type: Type.STRING },
                      vatEligible: { type: Type.BOOLEAN },
                      note: { type: Type.STRING },
                    },
                    required: ['day', 'title', 'amountLocal', 'bucket', 'account', 'split', 'mySharePct', 'paidBy', 'vatEligible', 'note'],
                  },
                },
                packingItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      why: { type: Type.STRING },
                      tag: { type: Type.STRING },
                      quantity: { type: Type.INTEGER },
                      unitWeightGrams: { type: Type.INTEGER },
                      weightGrams: { type: Type.INTEGER },
                      carryOnOnly: { type: Type.BOOLEAN },
                      morningOfDeparture: { type: Type.BOOLEAN },
                      targetGroupId: { type: Type.STRING },
                    },
                    required: [
                      'name',
                      'why',
                      'tag',
                      'quantity',
                      'unitWeightGrams',
                      'weightGrams',
                      'carryOnOnly',
                      'morningOfDeparture',
                      'targetGroupId',
                    ],
                  },
                },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      timing: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                    required: ['title', 'category', 'timing', 'note'],
                  },
                },
                stops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.INTEGER },
                      time: { type: Type.STRING },
                      closeTime: { type: Type.STRING },
                      stopType: { type: Type.STRING },
                      title: { type: Type.STRING },
                      district: { type: Type.STRING },
                      address: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      estLocal: { type: Type.NUMBER },
                      transitNote: { type: Type.STRING },
                      isOutdoor: { type: Type.BOOLEAN },
                      isAnchor: { type: Type.BOOLEAN },
                      rainSwapTitle: { type: Type.STRING },
                      rainSwapDistrict: { type: Type.STRING },
                      rainSwapAddress: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: [
                      'day',
                      'time',
                      'closeTime',
                      'stopType',
                      'title',
                      'district',
                      'address',
                      'estLocal',
                      'transitNote',
                      'isOutdoor',
                      'isAnchor',
                      'rainSwapTitle',
                      'rainSwapDistrict',
                      'rainSwapAddress',
                      'reason',
                    ],
                  },
                },
                removeStops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['id', 'reason'],
                  },
                },
                travelTips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                      category: { type: Type.STRING },
                    },
                    required: ['title', 'detail', 'category'],
                  },
                },
                localCards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      localTitle: { type: Type.STRING },
                      localAddressOrPhrase: { type: Type.STRING },
                      pronunciationHint: { type: Type.STRING },
                      etiquetteTip: { type: Type.STRING },
                      languageLabel: { type: Type.STRING },
                    },
                    required: [
                      'localTitle',
                      'localAddressOrPhrase',
                      'pronunciationHint',
                      'etiquetteTip',
                      'languageLabel',
                    ],
                  },
                },
                followUpSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                dateChange: {
                  type: Type.OBJECT,
                  properties: {
                    departureDate: { type: Type.STRING },
                    returnDate: { type: Type.STRING },
                    days: { type: Type.INTEGER },
                    note: { type: Type.STRING },
                  },
                  required: ['departureDate', 'returnDate', 'days', 'note'],
                },
                destinationChange: {
                  type: Type.OBJECT,
                  properties: {
                    cities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    cityDays: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                    },
                    note: { type: Type.STRING },
                  },
                  required: ['cities', 'note'],
                },
                itineraryRebuild: {
                  type: Type.OBJECT,
                  properties: {
                    naturalPrompt: { type: Type.STRING },
                    targetMode: { type: Type.STRING },
                    setupPatch: {
                      type: Type.OBJECT,
                      properties: {
                        cities: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        days: { type: Type.INTEGER },
                        departureDate: { type: Type.STRING },
                        tripStyle: { type: Type.STRING },
                        specialScenarios: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                    },
                    confirmOverwrite: { type: Type.BOOLEAN },
                    note: { type: Type.STRING },
                  },
                  required: ['naturalPrompt', 'targetMode', 'confirmOverwrite', 'note'],
                },
                packingTemplate: {
                  type: Type.OBJECT,
                  properties: {
                    scenarioIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    tripPurpose: { type: Type.STRING },
                    customNote: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['scenarioIds', 'note'],
                },
              },
              required: [
                'intent',
                'reply',
                'proposalSummary',
                'rainSwapAction',
                'rainSwapDay',
                'expenses',
                'packingItems',
                'tasks',
                'stops',
                'removeStops',
                'travelTips',
                'localCards',
                'followUpSuggestions',
              ],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 随行助手处理失败', lang, 'AI Copilot failed to process request');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 11. AI Single-Stop Quick-Prefill Parser for Immersive AddStopModal
  app.post('/api/ai/parse-stop', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    const isEn = lang !== 'zh-CN';
    try {
      const { inputText, activeDay, totalDays, cities, currencyCode, existingStops } = req.body;
      const trimmed = String(inputText || '').trim();
      if (!trimmed) {
        res.status(400).json({ error: isEn ? 'Please enter a stop description' : '请输入想要新增的站点描述' });
        return;
      }

      const ai = getAiClient();
      const safeTotalDays = Math.max(1, Number(totalDays) || 5);
      const safeActiveDay = Math.min(safeTotalDays, Math.max(1, Number(activeDay) || 1));

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Trip cities: ${(Array.isArray(cities) ? cities : ['巴黎']).join(' -> ')}.
Total days: ${safeTotalDays}. Current viewing day: D${safeActiveDay}. Currency: ${currencyCode || 'EUR'}.
Existing stops snapshot: ${JSON.stringify(existingStops || [])}.
User request: "${trimmed}"`,
          config: {
            systemInstruction: `You parse a traveler's natural-language stop description to pre-fill an "Add Stop" itinerary modal.
Rules:
1. "day": integer 1..${safeTotalDays}. Use ${safeActiveDay} for "今天"/omitted; Math.min(${safeTotalDays}, ${safeActiveDay} + 1) for "明天"; parse "D3"/"第3天" accurately, or match the day corresponding to the destination city if multi-city.
2. "time": 24-hour "HH:MM" arrival time. If the user didn't specify an exact time, pick a practical open slot on that day avoiding overlap with existing stops on that day.
3. "closeTime": 24-hour "HH:MM" expected closing/end time based on stop type (e.g. museums 18:00, restaurants 22:30, hotels/transit 23:59).
4. "stopType": strictly one of "attraction" | "hotel" | "transit" | "dining" | "shopping".
5. "searchQuery": clean, searchable destination name (Chinese or local name) suitable for Google Places lookup (e.g. "奥赛博物馆", "Café de Flore", "Charles de Gaulle Airport").
6. "title": clean human-readable stop title (plus local name if landmark/restaurant).
7. "district": real local neighborhood / arrondissement / ward name (e.g. "Saint-Germain · 7e", "浅草 · 台东区", "Jordaan").
8. "address": accurate real-world local street address suitable for map navigation and taxi drivers. Also provide accurate WGS84 decimal "lat" and "lng" coordinates for the place.
9. "estLocal": realistic per-person estimated cost in ${currencyCode || 'EUR'} (0 if free or explicitly prepaid).
10. "transitNote": short 1-sentence local metro/bus/walk arrival note.
11. "isOutdoor": true for parks, plazas, outdoor markets, walking tours, viewpoints; false otherwise.
12. "rainSwapTitle", "rainSwapDistrict", "rainSwapAddress": if isOutdoor is true, suggest 1 nearby WALK-IN FRIENDLY indoor backup alternative (e.g., covered arcade, walk-in permanent gallery, indoor food hall — never venues requiring sold-out weeks-ahead tickets) with its neighborhood and street address; otherwise "".
13. "isAnchor": true ONLY if the user explicitly mentions meeting point / 汇合点.
14. "summaryTip": 1 crisp sentence summarizing the prefilled fields (plus any weekly closure / last-entry reminder if it's a museum). ${getAiLangDirective(lang)}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                time: { type: Type.STRING },
                closeTime: { type: Type.STRING },
                stopType: { type: Type.STRING },
                searchQuery: { type: Type.STRING },
                title: { type: Type.STRING },
                district: { type: Type.STRING },
                address: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                estLocal: { type: Type.NUMBER },
                transitNote: { type: Type.STRING },
                isOutdoor: { type: Type.BOOLEAN },
                rainSwapTitle: { type: Type.STRING },
                rainSwapDistrict: { type: Type.STRING },
                rainSwapAddress: { type: Type.STRING },
                isAnchor: { type: Type.BOOLEAN },
                summaryTip: { type: Type.STRING },
              },
              required: [
                'day',
                'time',
                'closeTime',
                'stopType',
                'searchQuery',
                'title',
                'district',
                'address',
                'estLocal',
                'transitNote',
                'isOutdoor',
                'rainSwapTitle',
                'rainSwapDistrict',
                'rainSwapAddress',
                'isAnchor',
                'summaryTip',
              ],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err, 'AI 解析站点失败', lang, 'Failed to parse stop details');
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 11b. Packy-Style Multimodal Stop Extractor & Context-Aware Recommender (Screenshot / Link & AI / For You)
  app.post('/api/ai/extract-stops', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    const isEn = lang !== 'zh-CN';
    try {
      const {
        mode,
        inputText,
        imageBase64,
        mimeType,
        forYouCategory,
        activeDay,
        totalDays,
        targetCity,
        cities,
        currencyCode,
        existingStops,
      } = req.body;

      const cleanMode: 'screenshot' | 'link_or_text' | 'for_you' =
        mode === 'screenshot' || mode === 'for_you' ? mode : 'link_or_text';
      const cleanedText = String(inputText || '').trim();
      const cleanedBase64 = String(imageBase64 || '').trim();

      if (cleanMode === 'screenshot' && !cleanedBase64) {
        res.status(400).json({
          error: isEn ? 'Please upload a travel screenshot first' : '请先上传包含地点的截图照片',
        });
        return;
      }
      if (cleanMode === 'link_or_text' && !cleanedText) {
        res.status(400).json({
          error: isEn
            ? 'Please paste a map link, travel post, or stop description'
            : '请粘贴地图链接、种草笔记文本或一句话行程描述',
        });
        return;
      }

      // Safely unroll shortened Google Maps URLs (e.g. maps.app.goo.gl/...) so place names & @lat,lng in redirect URLs are visible
      let resolvedUrlHints = '';
      if (cleanMode === 'link_or_text' && /https?:\/\/[^\s]+/i.test(cleanedText)) {
        const urls = cleanedText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        const resolvedParts: string[] = [];
        for (const rawUrl of urls.slice(0, 2)) {
          try {
            const parsedUrl = new URL(rawUrl);
            const host = parsedUrl.hostname.toLowerCase();
            if (
              host.endsWith('goo.gl') ||
              host.includes('google.') ||
              host.endsWith('xiaohongshu.com') ||
              host.endsWith('xhslink.com')
            ) {
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 3200);
              try {
                const resp = await fetch(rawUrl, {
                  method: 'GET',
                  redirect: 'follow',
                  signal: ctrl.signal,
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (compatible; TripKitBot/1.0)',
                  },
                });
                if (resp.url && resp.url !== rawUrl) {
                  resolvedParts.push(decodeURIComponent(resp.url));
                }
              } finally {
                clearTimeout(timer);
              }
            }
          } catch {
            // Ignore shortlink unroll timeouts/network errors and rely on raw text
          }
        }
        if (resolvedParts.length > 0) {
          resolvedUrlHints = `\nResolved redirect URLs: ${resolvedParts.join(' | ')}`;
        }
      }

      const ai = getAiClient();
      const safeTotalDays = Math.max(1, Number(totalDays) || 5);
      const safeActiveDay = Math.min(safeTotalDays, Math.max(1, Number(activeDay) || 1));
      const routeCities = Array.isArray(cities) && cities.length > 0 ? cities : ['巴黎'];
      const cityFocus = String(targetCity || routeCities[0] || '巴黎').trim();
      const existingList = Array.isArray(existingStops) ? existingStops : [];

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (cleanMode === 'screenshot' && cleanedBase64) {
        const normalizedMime =
          typeof mimeType === 'string' && mimeType.startsWith('image/')
            ? mimeType
            : 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType: normalizedMime,
            data: cleanedBase64,
          },
        });
        parts.push({
          text: `Identify all concrete travel places, attractions, restaurants, cafes, shops, or hotels visible in this screenshot (e.g. Xiaohongshu/Instagram post, Google Maps screenshot, guide list, or business card).
Trip cities: ${routeCities.join(' -> ')}. Current target day: D${safeActiveDay} (${cityFocus}). Currency: ${currencyCode || 'EUR'}.
Existing stops already in itinerary (avoid exact duplicates unless screenshot specifically focuses on it): ${JSON.stringify(existingList.slice(0, 18))}.
${cleanedText ? `Optional user note: "${cleanedText}"` : ''}
Extract 1 to 6 real, specific places shown in the image so the traveler can add them in 1 tap.`,
        });
      } else if (cleanMode === 'for_you') {
        const cat = String(forYouCategory || 'for_you');
        const categoryFocus =
          cat === 'top_attractions'
            ? 'Must-visit iconic landmarks, world-class museums, architectural icons, and signature viewpoints'
            : cat === 'local_dining'
            ? 'Beloved local restaurants, bistros, cafes, bakeries, street food markets, and culinary favorites'
            : 'Smart spatially-clustered recommendations near the current day stops & open time gaps (blending nearby walk-in sights, characterful cafes/dining, and hidden gems without backtracking)';
        parts.push({
          text: `Curate 5 authentic, high-value stop recommendations for Day ${safeActiveDay} in "${cityFocus}".
Category focus: ${categoryFocus}.
Full trip route: ${routeCities.join(' -> ')}. Currency: ${currencyCode || 'EUR'}.
Existing stops already planned (DO NOT recommend places already in this list; cluster smoothly around Day ${safeActiveDay}'s existing neighborhoods and open time slots):
${JSON.stringify(existingList.slice(0, 20))}`,
        });
      } else {
        parts.push({
          text: `Extract 1 to 5 concrete travel stops from the traveler's pasted map link, social post text, or natural-language instruction.
Trip cities: ${routeCities.join(' -> ')}. Target day: D${safeActiveDay} (${cityFocus}). Total days: ${safeTotalDays}. Currency: ${currencyCode || 'EUR'}.
Existing stops snapshot: ${JSON.stringify(existingList.slice(0, 18))}.
User input:
"""
${cleanedText}
"""${resolvedUrlHints}`,
        });
      }

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: { parts },
          config: {
            systemInstruction: `You are a precision travel place extractor and spatial route curator. ${getAiLangDirective(lang)}
STRICT RULES:
1. Every item in "stops" MUST be a real, specific, verifiable venue/landmark/restaurant/hotel/station (NEVER generic placeholders like "当地餐厅" or "市中心漫步" unless the user explicitly typed a custom personal errand).
2. "day": integer 1..${safeTotalDays} (default ${safeActiveDay}; parse "明天"/"D3" if specified in user text).
3. "time": 24-hour "HH:MM" arrival time sequenced cleanly into open slots on that day without colliding with existing stops. If returning multiple stops, stagger their times realistically (+90 mins apart).
4. "closeTime": realistic 24-hour "HH:MM" closing time (e.g. museums 18:00, restaurants 22:30, parks 21:00, hotels/transit 23:59).
5. "durationMinutes": realistic stay duration in minutes (e.g. 45, 60, 90, 120).
6. "stopType": strictly one of "attraction" | "dining" | "hotel" | "transit" | "shopping".
7. "searchQuery": exact official venue name + city suitable for Google Places lookup (e.g. "Musée d'Orsay Paris", "Café de Flore Paris", "浅草寺 东京").
8. "title": concise human-readable display name.
9. "district": real neighborhood / ward / arrondissement (e.g. "玛黑区 · 4e", "Saint-Germain", "浅草").
10. "address": accurate local street address + accurate WGS84 decimal "lat" and "lng".
11. "estLocal": realistic per-person spend in ${currencyCode || 'EUR'} (0 if free).
12. "reason": 1 concise, helpful sentence explaining why it fits or what was extracted (no hype clichés).
13. "transitNote": short transit/walk hint from nearby district or previous stop.
14. "isOutdoor": boolean; if true, populate "rainSwapTitle", "rainSwapDistrict", "rainSwapAddress" with a nearby walk-in indoor backup; otherwise "".
15. "isAnchor": true ONLY if the user explicitly requested setting it as a group meetup anchor / 汇合点.
16. "summaryTip": 1 crisp sentence summarizing what was found or curated.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summaryTip: { type: Type.STRING },
                stops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.INTEGER },
                      time: { type: Type.STRING },
                      closeTime: { type: Type.STRING },
                      durationMinutes: { type: Type.INTEGER },
                      stopType: { type: Type.STRING },
                      searchQuery: { type: Type.STRING },
                      title: { type: Type.STRING },
                      district: { type: Type.STRING },
                      address: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      estLocal: { type: Type.NUMBER },
                      reason: { type: Type.STRING },
                      transitNote: { type: Type.STRING },
                      isOutdoor: { type: Type.BOOLEAN },
                      rainSwapTitle: { type: Type.STRING },
                      rainSwapDistrict: { type: Type.STRING },
                      rainSwapAddress: { type: Type.STRING },
                      isAnchor: { type: Type.BOOLEAN },
                    },
                    required: [
                      'day',
                      'time',
                      'closeTime',
                      'durationMinutes',
                      'stopType',
                      'searchQuery',
                      'title',
                      'district',
                      'address',
                      'lat',
                      'lng',
                      'estLocal',
                      'reason',
                      'transitNote',
                      'isOutdoor',
                      'rainSwapTitle',
                      'rainSwapDistrict',
                      'rainSwapAddress',
                      'isAnchor',
                    ],
                  },
                },
              },
              required: ['summaryTip', 'stops'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, { summaryTip: '', stops: [] }));
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 识别与推荐地点失败',
        lang,
        'Failed to extract or recommend stops'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 12. Dedicated AI Deep Packing List Architect (Decoupled 100% Token Budget + Dynamic Scenario Categories)
  app.post('/api/ai/generate-packing-list', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        setup,
        intel,
        perStopForecasts,
        baggageLimits,
        blockedItems,
      } = req.body;
      const ai = getAiClient();

      const cities: string[] =
        Array.isArray(setup?.cities) && setup.cities.length > 0 ? setup.cities : ['东京'];
      const plannedDays = Math.min(30, Math.max(1, Number(setup?.days) || 7));
      const travelersCount = Math.max(1, Math.min(8, Number(setup?.travelers) || 2));
      const purpose = setup?.packingTripPurpose || 'leisure';
      const clothingStyle = setup?.clothingStyle || 'other';
      const density = setup?.packingDensity || 'moderate';
      const weatherOverrides: string[] = Array.isArray(setup?.weatherOverrides)
        ? setup.weatherOverrides
        : [];
      const specialScenarios: string[] = Array.isArray(setup?.specialScenarios)
        ? setup.specialScenarios
        : [];
      const customNote = String(setup?.packingCustomNote || '').trim();
      const blockedList: string[] = Array.isArray(blockedItems)
        ? blockedItems.filter((x: unknown): x is string => typeof x === 'string' && Boolean(x.trim()))
        : [];

      const carryOnLimitKg = Number(baggageLimits?.carryOnLimitKg) || 7;
      const checkedLimitKg =
        baggageLimits?.checkedLimitKg !== undefined ? Number(baggageLimits.checkedLimitKg) : 23;
      const isCabinOnly =
        checkedLimitKg <= 0 ||
        specialScenarios.includes('cabin_only') ||
        /carry-on only|cabin only|仅带登机箱|只带登机箱|无托运/i.test(customNote);

      const densityRule =
        density === 'light'
          ? 'ULTRALIGHT PERSONAL BACKPACK (Strict Cabin Trim): Target ~24 to 30 essential, multi-purpose items across 6 to 7 categories. Strictly filter out spare clothing, backup shoes, and bulky gear; maximize capsule rewear.'
          : density === 'fully_loaded'
          ? 'FULL CHECKED SUITCASE (Comprehensive Full-Scene): Target ~52 to 68 specific, granular items across 8 to 11 categories so the traveler has spare outfits, full-size skincare, adapters, comfort items, and shopping room.'
          : 'STANDARD 20" CARRY-ON ROLLER (Balanced 4-5 Outfit Capsule): Target ~38 to 50 specific, actionable items across 7 to 9 categories — granular enough that every real item has its own checkbox while fitting comfortably inside a standard cabin bag.';

      const stopWeatherDigest = Array.isArray(perStopForecasts) && perStopForecasts.length > 0
        ? perStopForecasts
            .map((s: Record<string, unknown>) => `${s.city}: ${s.summaryText}`)
            .join(' | ')
        : `${intel?.tempRange || '10-18°C'}, ${intel?.rainChance || 'occasional rain'}`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Build a dedicated, hyper-tailored packing list for this trip:
- Route (in travel order): ${cities.join(' -> ')}
- Dates & Duration: ${setup?.departureDate || '2026-11-14'} (${plannedDays} days)
- Per-Stop Weather Forecast (already reflecting user's subjective feel [${weatherOverrides.join(', ') || 'forecast baseline'}]): ${stopWeatherDigest}
- Destination Plug/Voltage & VAT: ${intel?.plugType || 'Local adapter'} (${intel?.voltage || '220V'}), Exit VAT: ${intel?.vatExitAirport || 'N/A'}
- Trip Purpose: ${purpose} (Leisure / Business / Both)
- Clothing Style / Care Profile: ${clothingStyle} (Male / Female / Other)
- Luggage Physical Constraint: ${densityRule}
- Laundry Strategy: midTripLaundry=${Boolean(setup?.laundry)} (cycle every ${setup?.laundryIntervalDays || 4} days), rewearLayers=${Boolean(setup?.rewear)}
- Group Size: ${travelersCount} traveler(s)
- Airline Baggage Allowance: Carry-on ${carryOnLimitKg}kg / Checked ${isCabinOnly ? '0kg (STRICT CABIN-ONLY)' : `${checkedLimitKg}kg`}
- Selected Special Scenarios: ${specialScenarios.length > 0 ? specialScenarios.join(', ') : 'None'}
- User Free-Text Note: "${customNote || 'None'}"
${blockedList.length > 0 ? `- STRICT BLOCKLIST (User clicked "Don't suggest this again" — NEVER output any of these): ${blockedList.join(', ')}` : ''}`,
          config: {
            systemInstruction: `You are an elite packing list architect combining Packy-style granular sub-item completeness with aviation weight engineering. ${getAiLangDirective(lang)}

MANDATORY ARCHITECTURAL RULES:
1. DYNAMIC MULTI-CATEGORY & SUB-CATEGORY TAXONOMY (8 to 14 Categories + 2 to 4 Subcategories per Category!):
   - Start with 7 well-structured core categories:
     * id="documents" (Passports, Wallet & 0g Digital Border QR/eSIM Passes — ALWAYS include destination arrival QR/digital pass e.g. Visit Japan Web QR + mobile transit IC card and travel eSIM with unitWeightGrams=0, weightGrams=0!)
     * id="tops_layers" (Tops, Mid-layers & Weather Outerwear covering the UNION of coldest to warmest stop microclimates)
     * id="bottoms_underwear" (Bottoms, Undergarments, Socks & Sleepwear tailored to clothingStyle=${clothingStyle})
     * id="footwear_accessories" (Broken-in walking shoes, packable slippers, rain umbrella, UV sunglasses, hat/gloves)
     * id="toiletries" (Washbag, Skincare & Hygiene — tailored to clothingStyle=${clothingStyle}; hypoallergenic barrier care if sensitive_skin is selected)
     * id="electronics" (Power bank, destination plug adapter ${intel?.plugType || ''}, multi-port GaN charger, braided cables, earbuds)
     * id="first_aid" (Pain/fever, GI meds, hydrocolloid blister plasters; plus original-box prescriptions + 0g doctor note PDF if "medication" is selected)
   - Dynamically ADD dedicated scenario categories whenever matching scenarios, activities, destination climate, or custom notes apply:
     * id="beach_water" (if "beach" or "swimming" selected or coastal/island destination: swimwear, rashguard, reef-safe SPF50+, wet-dry bag, microfiber towel, IPX8 waterproof phone pouch, water sandals)
     * id="onsen_spa" (if "onsen" selected or Japan hot spring route: modesty towel, waterproof zip pouch, hair ties, post-soak body lotion, coin pouch for locker/milk)
     * id="ski_snow" (if "ski_snow" selected or sub-zero snow destination: thermal merino base, snow gloves, ski goggles/balaclava, ice cleats, hand/toe warmers)
     * id="hiking_camping" (if "hiking" or "camping" selected: trail shoes, packable 18L daypack, trekking poles, insulated bottle, headlamp, electrolytes)
     * id="theme_park" (if "theme_park" selected: hands-free crossbody bag, disposable rain poncho, high-capacity power bank, portable cushion, insulated bottle)
     * id="fitness_sport" (if "fitness" selected: quick-dry workout set, running/training shoes, sport socks, resistance band)
     * id="baby_kids" (if "baby" or "kids" selected: transit diapers, bottle warmer/formula, water wipes, changing mat, compact stroller/carrier, pediatric fever drops, flight activity book/headphones)
     * id="remote_work" (if "remote_work" or purpose is "business"/"both": laptop + sleeve, 65W+ GaN charger, wireless mouse, USB-C hub, privacy screen)
     * id="photography" (if "photography" selected: camera + lens, spare lithium batteries, SD cards + USB-C reader, air blower/lens cloth, travel tripod)
     * id="formal_event" (if "formal_event" selected or custom note mentions wedding/fine dining/gala: wrinkle-free blazer/dress, dress shoes, portable steamer/wrinkle spray)
     * id="shopping_taxfree" (if "shopping_taxfree" selected or major tax-free hub like Tokyo/Osaka/Paris: packable 35L expansion duffel, passport + tax-free receipt organizer, digital luggage scale, bubble-wrap sleeves)
     * id="extras" (Anti-theft phone tether, flight comfort kit, coin pouch, foldable grocery tote)
   - Set each group's "colorKey" among strictly: "teal" | "lavender" | "lemon" | "peach" | "rose" | "mint", and write a crisp, practical "cubeLabel".
2. MANDATORY SUB-CATEGORIES ("subCategory") & GRANULAR ITEMS:
   - EVERY item MUST include a crisp "subCategory" string grouping items into 2 to 4 clear sub-clusters inside each category (for example inside tops_layers: "贴身透气打底" / "中层保暖叠穿" / "防风防雨外层"; inside beach_water: "泳装与防晒水母衣" / "海岛高倍防晒修护" / "涉水防水数码配件"; inside electronics: "核心充电与转换" / "随身续航与音频").
   - Never output vague catch-all names like "充电器" or "洗漱包". List concrete checkable items.
   - Digital items (arrival QR code, eSIM, PDF insurance/tickets) MUST have unitWeightGrams=0 and weightGrams=0.
   - Estimate realistic standard adult unitWeightGrams for every physical item.
   - NEVER include "×2" inside item "name"; set clean "name", integer "quantity" >= 1, "unitWeightGrams" >= 0, and "weightGrams" = quantity * unitWeightGrams.
3. AVIATION COMPLIANCE & 9-BAG MAPPING:
   - ${
     isCabinOnly
       ? `STRICT CABIN-ONLY MODE (0kg checked): Every single item MUST be cabin-legal (<=100ml liquids or solid bars, no blades/sharp poles), ultralight within ${carryOnLimitKg}kg total, and have carryOnOnly=true.`
       : `Standard Cabin (${carryOnLimitKg}kg) + Checked (${checkedLimitKg}kg): Strictly set carryOnOnly=true on passports, lithium power banks, spare camera batteries, laptops, cameras, and essential meds; set carryOnOnly=false on bulkier clothing cubes, full-size liquids >100ml, and spare shoes.`
   }
   - Map every item's "smartBagId" strictly to one of: "cube_xl" | "cube_l" | "cube_m" | "cube_s" | "shoe_bag" | "toiletry_bag" | "doc_pouch" | "pill_box" | "edc_bag".
   - Set "morningOfDeparture": true on items used until leaving home (toothbrush, phone cable, daily meds, primary walking shoes).
   - Set "ownership": ${
     travelersCount >= 2
       ? `"shared" on group-shareable gear (multi-port adapter, first-aid kit, laundry sheets, luggage scale, stroller, tripod) so ${travelersCount} companions don't pack duplicates, and "personal" on individual clothing/IDs.`
       : `"personal" on all items (solo traveler).`
   }
   - Set "tag" strictly among: "必需" | "核心" | "天气" | "保暖" | "备用".
4. Return a 1-2 sentence "strategySummary" explaining how microclimates, luggage capacity, laundry cycle, and scenarios shaped this list.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strategySummary: { type: Type.STRING },
                packing: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      cubeLabel: { type: Type.STRING },
                      colorKey: { type: Type.STRING },
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            subCategory: { type: Type.STRING },
                            why: { type: Type.STRING },
                            tag: { type: Type.STRING },
                            quantity: { type: Type.INTEGER },
                            unitWeightGrams: { type: Type.INTEGER },
                            weightGrams: { type: Type.INTEGER },
                            carryOnOnly: { type: Type.BOOLEAN },
                            morningOfDeparture: { type: Type.BOOLEAN },
                            smartBagId: { type: Type.STRING },
                            ownership: { type: Type.STRING },
                          },
                          required: [
                            'id',
                            'name',
                            'subCategory',
                            'why',
                            'tag',
                            'quantity',
                            'unitWeightGrams',
                            'weightGrams',
                            'carryOnOnly',
                            'morningOfDeparture',
                            'smartBagId',
                            'ownership',
                          ],
                        },
                      },
                    },
                    required: ['id', 'title', 'cubeLabel', 'colorKey', 'items'],
                  },
                },
              },
              required: ['strategySummary', 'packing'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 定制打包清单生成失败',
        lang,
        'Failed to generate custom AI packing list'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 13. AI Smart Travel Pass & Confirmation Parser (Text or Screenshot -> Offline Go-Mode Pass)
  app.post('/api/ai/parse-travel-pass', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const { rawText, imageBase64, mimeType, cities } = req.body;
      const cleanedText = String(rawText || '').trim();
      const cleanedBase64 = String(imageBase64 || '').trim();

      if (!cleanedText && !cleanedBase64) {
        res.status(400).json({
          error:
            lang === 'zh-CN'
              ? '请粘贴确认单文本或上传票据截图'
              : 'Please paste confirmation text or upload a ticket screenshot',
        });
        return;
      }

      const ai = getAiClient();
      const routeHint =
        Array.isArray(cities) && cities.length > 0 ? cities.join(' -> ') : 'International Trip';

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (cleanedBase64) {
        const normalizedMime =
          typeof mimeType === 'string' &&
          (mimeType === 'application/pdf' || mimeType.startsWith('image/'))
            ? mimeType
            : 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType: normalizedMime,
            data: cleanedBase64,
          },
        });
      }

      parts.push({
        text: `Extract structured Go-Mode offline travel document / pass fields from this uploaded photo, PDF confirmation, QR screenshot, or text.
Trip Route Context: ${routeHint}
${cleanedText ? `User Context / Confirmation Text:\n${cleanedText}` : 'Extract all visible travel document, identity, or booking details from the attached image or PDF.'}`,
      });

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: { parts },
          config: {
            systemInstruction: `You are a precision travel document, passport/visa, insurance policy & boarding pass parser. ${getAiLangDirective(lang)}
Extract clean, accurate fields for an offline travel document wallet:
- "category": strictly one of:
  "passport" (passport bio page, national ID, travel permit) |
  "visa" (visa sticker, e-Visa, Schengen visa, K-ETA, ESTA, EVUS) |
  "border_qr" (Visit Japan Web, SG Arrival Card, customs/health declaration QR) |
  "insurance" (travel medical/flight insurance policy, emergency assistance card) |
  "flight" (airline boarding pass, e-ticket itinerary PDF) |
  "train" (high-speed rail, Shinkansen, Eurostar, airport express, ferry/bus pass) |
  "hotel" (hotel/ryokan/Airbnb booking confirmation) |
  "attraction" (museum, theme park, observation deck, tour ticket) |
  "dining" (restaurant reservation, Michelin/TableCheck/Omakase booking) |
  "car_rental" (car rental voucher, International Driving Permit / IDP translation) |
  "esim" (eSIM activation QR, roaming data voucher) |
  "tax_free_other" (tax-free refund receipt, luggage storage voucher, other travel doc)
- "title": concise human-readable document title (e.g., "ANA NH860 东京羽田登机牌", "申根多次往返签证", "安联境外旅行险保单", or "Shinjuku Southern Tower Hotel")
- "subtitle": route, holder/validity summary, or stay details (e.g., "PVG -> HND · Economy", "Valid until 2031-05 · Multiple Entry", or "2 Nights · Check-in 15:00")
- "dateTimeLabel": departure / check-in / reservation / expiry date & time string (e.g., "2026-11-14 09:25" or "Exp 2032-08-19")
- "confirmationCode": PNR, booking reference, passport/visa number, policy number, or voucher ID if present (empty string if none)
- "qrPayload": exact URL, barcode text, or reference code suitable for QR rendering if visible in text (empty string if image-only QR or passport/ID)
- "terminalOrPlatform": terminal + gate, station platform/car, or pickup counter (e.g., "T2 · Gate D65" or "Platform 14 · Car 6")
- "seatOrRoom": seat number, room type, table type, or vehicle class (e.g., "24A" or "Deluxe Twin")
- "localLanguageTitle": for hotels/restaurants/stations/attractions/car-rental counters, the venue name written in the DESTINATION'S NATIVE LOCAL SCRIPT (e.g. Japanese Kanji/Kana in Japan, Korean Hangul in Korea, French in Paris, Thai in Thailand) so the traveler can show it fullscreen to a local taxi driver (empty string for passports/visas/eSIMs)
- "localLanguageAddress": the street address in the destination's native local script (infer official address if a well-known hotel/station/landmark/restaurant is named, otherwise empty string)
- "note": 1-line helpful gate/check-in/validity/emergency hotline/customs reminder.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                dateTimeLabel: { type: Type.STRING },
                confirmationCode: { type: Type.STRING },
                qrPayload: { type: Type.STRING },
                terminalOrPlatform: { type: Type.STRING },
                seatOrRoom: { type: Type.STRING },
                localLanguageTitle: { type: Type.STRING },
                localLanguageAddress: { type: Type.STRING },
                note: { type: Type.STRING },
              },
              required: [
                'category',
                'title',
                'subtitle',
                'dateTimeLabel',
                'confirmationCode',
                'qrPayload',
                'terminalOrPlatform',
                'seatOrRoom',
                'localLanguageTitle',
                'localLanguageAddress',
                'note',
              ],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 识别票据确认单失败',
        lang,
        'Failed to parse travel confirmation'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 13. AI Multi-Day Smart Route & Opening-Hours Reorder (Day 1..X Unvisited Stops)
  app.post('/api/ai/smart-reorder-itinerary', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        cities,
        departureDate,
        totalDays,
        dayContexts,
        stops,
        tripStyle,
        weatherSummary,
      } = req.body;

      const ai = getAiClient();
      const safeTotalDays = Math.max(1, Number(totalDays) || 5);
      const weekdayCalendar = buildServerWeekdaySchedule(departureDate, safeTotalDays, lang);

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const calcHaversineKm = (
        lat1?: number,
        lng1?: number,
        lat2?: number,
        lng2?: number
      ): number | null => {
        if (
          typeof lat1 !== 'number' ||
          typeof lng1 !== 'number' ||
          typeof lat2 !== 'number' ||
          typeof lng2 !== 'number' ||
          !Number.isFinite(lat1) ||
          !Number.isFinite(lng1) ||
          !Number.isFinite(lat2) ||
          !Number.isFinite(lng2)
        ) {
          return null;
        }
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
      };

      const rawStops: Array<Record<string, unknown>> = Array.isArray(stops) ? stops : [];
      const rawDayContexts: Array<Record<string, unknown>> = Array.isArray(dayContexts)
        ? dayContexts
        : [];
      const stayByDay = new Map<number, Record<string, unknown>>();
      for (const ctx of rawDayContexts) {
        const d = Number(ctx.day);
        if (Number.isFinite(d) && d >= 1) stayByDay.set(d, ctx);
      }

      // Build compact distance hints per day (hotel -> stop & pairwise stop distances)
      const spatialHintsByDay: Record<string, string[]> = {};
      for (let d = 1; d <= safeTotalDays; d++) {
        const dStops = rawStops.filter((s) => (Number(s.day) || 1) === d);
        if (dStops.length === 0) continue;
        const hints: string[] = [];
        const stay = stayByDay.get(d);
        if (stay && stay.stayPlaceName) {
          for (const s of dStops) {
            const km = calcHaversineKm(
              Number(stay.stayLat),
              Number(stay.stayLng),
              Number(s.lat),
              Number(s.lng)
            );
            if (km !== null) {
              hints.push(`Hotel("${stay.stayPlaceName}") -> "${s.title}": ${km}km`);
            }
          }
        }
        for (let i = 0; i < dStops.length; i++) {
          for (let j = i + 1; j < dStops.length; j++) {
            const km = calcHaversineKm(
              Number(dStops[i].lat),
              Number(dStops[i].lng),
              Number(dStops[j].lat),
              Number(dStops[j].lng)
            );
            if (km !== null) {
              hints.push(`"${dStops[i].title}" <-> "${dStops[j].title}": ${km}km`);
            }
          }
        }
        if (hints.length > 0) {
          spatialHintsByDay[`Day_${d}`] = hints.slice(0, 28);
        }
      }

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Smart Reorder Request across Day 1 to Day ${safeTotalDays}.
Route cities: ${(cities || []).join(' -> ')}. Style: ${tripStyle || '休闲度假'}. Weather: ${weatherSummary || ''}.
Trip Calendar & Weekdays: ${weekdayCalendar}.
Per-day cities & hotel stay anchors: ${JSON.stringify(rawDayContexts)}.
Pre-computed straight-line geographic distance hints (km): ${JSON.stringify(spatialHintsByDay)}.
Current stops across Day 1..Day ${safeTotalDays} (visited=true stops are LOCKED; visited=false stops MUST be optimally sequenced):
${JSON.stringify(rawStops)}`,
          config: {
            systemInstruction: `You are an expert travel operations & TSP route scheduler optimizing an existing multi-day itinerary across Day 1 to Day ${safeTotalDays}.
STRICT RULES:
0. NEVER remove nodes whose locked is true, whose isAnchor is true, or whose id appears in any travelPass.linkedTimelineNodeId; if a date or city conflict makes this impossible, return a conflict warning instead of deleting. Keep their exact id/day/time unchanged.
1. LOCKED VISITED STOPS: Any stop with "visited": true has ALREADY been visited by the traveler. You MUST keep its exact "id", "day", and "time" completely unchanged! Schedule unvisited ("visited": false) stops on that day cleanly around the locked visited stop(s) without time collisions.
2. COMPLETE ID PRESERVATION: "reorderedStops" MUST include EVERY SINGLE input stop "id" (both visited and unvisited) — never drop, duplicate, or invent stop IDs.
3. GEOGRAPHIC DISTANCE + OPENING HOURS + TICKET WINDOWS (Core Optimization):
   - Sequence unvisited stops on each day to minimize total travel distance and eliminate cross-city zig-zagging using (lat, lng), district clustering, and the day's hotel anchor (starting near the hotel in the morning when applicable).
   - Strictly respect venue opening hours, ticketed entry windows, and "closeTime":
     * Morning markets, shrines/parks, or popular ticketed museums with early closing times (e.g. 16:30–17:30) go earlier in the day so travelers have >= 60–90 min dwell time plus a 30-min last-entry buffer before closeTime.
     * Check exact weekdays in "${weekdayCalendar}"! If an unvisited museum/venue falls on its weekly closed day (e.g. Louvre Tue, Orsay Mon, many Japanese museums Mon) AND another day in the SAME city is open, you may move that unvisited stop to the open day in the SAME city (never move stops across different cities). Otherwise keep stops on their original day and flag any unavoidable closure in warningNote.
     * Keep dining stops (stopType="dining") in natural meal windows (lunch 12:00–13:45, dinner 18:00–20:30), night views/bars in evening slots, and transit/airport/hotel check-in-out stops anchored at logical arrival/departure times.
4. REALISTIC TIMELINE & TRANSIT NOTES:
   - Assign realistic 24-hour "time" ("HH:MM", strictly ascending within each day) accounting for each stop's "durationMinutes" (default 60–120m for attractions/museums, 60–90m for dining, 30–60m for shopping/hotels) PLUS realistic transit travel time between consecutive stops.
   - Update "transitNote" on each unvisited stop with concise, actionable transit mode + duration + approximate distance from the previous stop or hotel (e.g. "步行 8 分钟 (0.6km)" or "地铁银座线 14 分钟 (3.2km)").
   - If an input stop is missing lat/lng, populate accurate WGS84 decimal lat/lng for its real address.
5. OUTPUT SUMMARIES:
   - "overallSummary": 1–2 concise sentences explaining key route improvements across Day 1–Day ${safeTotalDays} (backtracking eliminated, opening-hour/ticket window alignments, estimated transit time saved).
   - "warningNote": Empty string "" if all opening hours and weekdays are conflict-free; otherwise concise heads-up on tight closing cutoffs, weekly closures, or advance reservation needs.
   - "daySummaries": One concise 1-sentence spatial routing summary for each day that has stops.
${getAiLangDirective(lang)}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallSummary: { type: Type.STRING },
                warningNote: { type: Type.STRING },
                daySummaries: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.INTEGER },
                      summary: { type: Type.STRING },
                    },
                    required: ['day', 'summary'],
                  },
                },
                reorderedStops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      day: { type: Type.INTEGER },
                      time: { type: Type.STRING },
                      closeTime: { type: Type.STRING },
                      durationMinutes: { type: Type.INTEGER },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      transitNote: { type: Type.STRING },
                    },
                    required: ['id', 'day', 'time', 'transitNote'],
                  },
                },
              },
              required: ['overallSummary', 'warningNote', 'daySummaries', 'reorderedStops'],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 智能重排行程顺序失败',
        lang,
        'Failed to smart-reorder itinerary stops'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  // 14. AI Multimodal Printable Photobook Story & Layout Director
  app.post('/api/ai/generate-photobook', async (req, res) => {
    const lang = resolveClientLang(req.body?.language);
    try {
      const {
        templateId,
        allowPhotoVision,
        tripsContext,
        photosContext,
      } = req.body;
      const ai = getAiClient();
      const styleLabel =
        templateId === 'editorial'
          ? 'Monocle 城市人文纪实杂志风（精准坐标、时刻、建筑与风物细节、克制有深度的纪实笔触）'
          : templateId === 'scrapbook'
          ? '胶片手账纪念册风（温暖细腻、旅途烟火气、拍立得私语感与生活小确幸）'
          : 'Kinfolk 极简留白艺术画册风（诗意克制、光影呼吸感、慢旅行文学质感）';

      const safeTrips = Array.isArray(tripsContext) ? tripsContext.slice(0, 6) : [];
      const safePhotos = Array.isArray(photosContext) ? photosContext.slice(0, 24) : [];

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (allowPhotoVision) {
        let attachedCount = 0;
        for (const p of safePhotos) {
          if (attachedCount >= 10) break;
          const rawThumb = typeof p?.thumbDataUrl === 'string' ? p.thumbDataUrl : '';
          const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(rawThumb);
          if (m && m[2]) {
            parts.push({
              inlineData: {
                mimeType: m[1],
                data: m[2],
              },
            });
            parts.push({
              text: `[Photo ID="${String(p.id)}"] Day ${Number(p.matchedDay) || 1} · ${String(p.matchedCity || '')}${p.matchedStopTitle ? ` · Stop: ${String(p.matchedStopTitle)}` : ''}${p.userNote ? ` · Traveler Note: ${String(p.userNote)}` : ''}`,
            });
            attachedCount += 1;
          }
        }
      }

      parts.push({
        text: `Curate a print-ready travel monograph / photobook in style: ${styleLabel}.
Compiled Trips (${safeTrips.length}):
${JSON.stringify(safeTrips)}

Curated Photos Metadata (${safePhotos.length} photos — generate a caption entry for EVERY photoId):
${JSON.stringify(
  safePhotos.map((p: Record<string, unknown>) => ({
    id: p.id,
    tripId: p.matchedTripId,
    day: p.matchedDay,
    city: p.matchedCity,
    stopTitle: p.matchedStopTitle,
    takenAtIso: p.takenAtIso,
    cameraLabel: p.cameraLabel,
    userNote: p.userNote,
  }))
)}`,
      });

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: { parts },
          config: {
            systemInstruction: `You are an award-winning print photobook editor & travel essayist designing a physical 300DPI hardcover monograph.
1. Craft an evocative, publication-worthy "bookTitle" (<= 24 chars), "bookSubtitle" (<= 48 chars, incorporating destinations & season/year), a poetic 1-2 sentence opening "epigraph", and a refined back-cover "colophonSummary".
2. Generate one "chapters" object for EACH compiled trip in order ("tripId", "chapterNumber", "chapterTitle", "dateSpanLabel", "routeLine", a 2-3 sentence literary "narrativeIntro" weaving real itinerary stops & local atmosphere, and a crisp "highlightsLine" summarizing distance/stops/signature moments).
3. Generate one "photoCaptions" entry for EVERY input photo ("photoId", concise 4-12 word "headline", vivid 1-2 sentence "storyCaption" grounded in visual details + matched stop/city, and "layoutHint" chosen rhythmically among "hero_full" | "editorial_split" | "polaroid_pair").
${getAiLangDirective(lang)}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bookTitle: { type: Type.STRING },
                bookSubtitle: { type: Type.STRING },
                epigraph: { type: Type.STRING },
                colophonSummary: { type: Type.STRING },
                chapters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tripId: { type: Type.STRING },
                      chapterNumber: { type: Type.INTEGER },
                      chapterTitle: { type: Type.STRING },
                      dateSpanLabel: { type: Type.STRING },
                      routeLine: { type: Type.STRING },
                      narrativeIntro: { type: Type.STRING },
                      highlightsLine: { type: Type.STRING },
                    },
                    required: [
                      'tripId',
                      'chapterNumber',
                      'chapterTitle',
                      'dateSpanLabel',
                      'routeLine',
                      'narrativeIntro',
                      'highlightsLine',
                    ],
                  },
                },
                photoCaptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      photoId: { type: Type.STRING },
                      headline: { type: Type.STRING },
                      storyCaption: { type: Type.STRING },
                      layoutHint: { type: Type.STRING },
                    },
                    required: ['photoId', 'headline', 'storyCaption', 'layoutHint'],
                  },
                },
              },
              required: [
                'bookTitle',
                'bookSubtitle',
                'epigraph',
                'colophonSummary',
                'chapters',
                'photoCaptions',
              ],
            },
          },
        })
      );

      res.json(parseGeminiJson(response.text, {}));
    } catch (err: unknown) {
      const mapped = mapGeminiError(
        err,
        'AI 纪念册故事排版生成失败',
        lang,
        'Failed to generate AI photobook story & layout'
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trip Kit server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import type { AppLanguage } from '../types';

const CITY_NAME_EN_MAP: Record<string, string> = {
  巴黎: 'Paris',
  阿姆斯特丹: 'Amsterdam',
  东京: 'Tokyo',
  京都: 'Kyoto',
  大阪: 'Osaka',
  清迈: 'Chiang Mai',
  曼谷: 'Bangkok',
  里斯本: 'Lisbon',
  伦敦: 'London',
  罗马: 'Rome',
  巴塞罗那: 'Barcelona',
  苏黎世: 'Zurich',
  柏林: 'Berlin',
  维也纳: 'Vienna',
  布拉格: 'Prague',
  首尔: 'Seoul',
  新加坡: 'Singapore',
  里昂: 'Lyon',
  尼斯: 'Nice',
  鹿特丹: 'Rotterdam',
  目的地: 'Destination',
};

export function translateCityName(city: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !city) return city;
  const trimmed = city.trim();
  if (CITY_NAME_EN_MAP[trimmed]) return CITY_NAME_EN_MAP[trimmed];
  return translateRouteTitle(city, lang);
}

export function translateRouteTitle(routeTitle: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !routeTitle) return routeTitle;
  const trimmed = routeTitle.trim();
  if (CITY_NAME_EN_MAP[trimmed]) return CITY_NAME_EN_MAP[trimmed];
  if (/→|->|—/.test(trimmed)) {
    return trimmed
      .split(/\s*(?:→|->|—)\s*/)
      .map((part) => CITY_NAME_EN_MAP[part.trim()] || part.trim())
      .join(' → ');
  }
  return routeTitle;
}

export function translateIntelField(
  field:
    | 'weatherSummary'
    | 'plugType'
    | 'vatExitAirport'
    | 'vatRuleSummary'
    | 'transitPassName'
    | 'localEmergencyNote',
  value: string,
  lang: AppLanguage
): string {
  if (lang === 'zh-CN' || !value) return value;
  const v = value.trim();
  const isGB = lang === 'en-GB';

  switch (field) {
    case 'weatherSummary':
      if (v === '阴转阵雨 · 体感湿冷') {
        return isGB ? 'Cloudy with showers · Damp & chilly' : 'Cloudy w/ showers · Crisp & damp';
      }
      return value;
    case 'plugType':
      if (v === 'Type E / C 欧标双圆孔') {
        return isGB ? 'Type C / E Europlug (2-pin)' : 'Type C / E EU 2-Pin';
      }
      return value;
    case 'vatExitAirport':
      if (v === '阿姆斯特丹史基浦机场 (AMS) 海关退税点') {
        return 'Amsterdam Schiphol (AMS) Customs';
      }
      return value;
    case 'vatRuleSummary':
      if (v.startsWith('法国同店同日消费满 €100.01')) {
        return isGB
          ? 'Spend over €100.01 in a single French shop on the same day to request a Détaxe VAT form, then get it stamped at your final EU exit (Amsterdam AMS).'
          : 'Spend €100.01+ in one French store on the same day to request a Détaxe tax-free form, then stamp it at your final EU exit (Amsterdam AMS).';
      }
      return value;
    case 'transitPassName':
      if (v === 'Navigo 交通卡') {
        return isGB ? 'Navigo Travelcard' : 'Navigo Transit Pass';
      }
      return value;
    case 'localEmergencyNote':
      if (
        v.startsWith('法国/荷兰消费税及服务费已包含在账单内') ||
        v.startsWith('法荷账单已含税及服务费')
      ) {
        return isGB
          ? 'Tax & service included in FR/NL bills (ask for "une carafe d’eau" for free tap water); tap contactless cards via OVpay on Amsterdam trams; keep bags zipped in front on RER B & Gare du Nord.'
          : 'Tax & service included in France/NL (ask for "une carafe d’eau" for free tap water); tap contactless cards via OVpay on Amsterdam trams; keep bags zipped in front on RER B & Gare du Nord.';
      }
      return value;
    default:
      return value;
  }
}

const DEMO_PACK_ITEM_NAME_MAP: Record<string, { us: string; gb: string }> = {
  '护照 + 申根签页': {
    us: 'Passport + Schengen Visa',
    gb: 'Passport + Schengen Visa',
  },
  '机酒行程单 + 申根旅行保险单': {
    us: 'Flight/Hotel Confirmations + Travel Insurance',
    gb: 'Flight/Hotel Bookings + Travel Insurance',
  },
  美利奴羊毛打底衫: {
    us: 'Merino Wool Base Layer Tee',
    gb: 'Merino Wool Base Layer Top',
  },
  防水防风硬壳外套: {
    us: 'Waterproof Windproof Hardshell Jacket',
    gb: 'Waterproof Breathable Shell Jacket',
  },
  薄款格纹风衣: {
    us: 'Lightweight Plaid Trench Coat',
    gb: 'Lightweight Check Trench Coat',
  },
  深色直筒牛仔裤: {
    us: 'Dark Straight-Leg Jeans',
    gb: 'Dark Straight-Leg Jeans',
  },
  '换洗贴身内衣 + 美利奴袜': {
    us: 'Underwear + Merino Walking Socks',
    gb: 'Underwear + Merino Walking Socks',
  },
  '防滑防水步行鞋（备用）': {
    us: 'Water-Resistant Walking Shoes (Spare)',
    gb: 'Water-Resistant Walking Shoes (Spare)',
  },
  '欧标 Type-C/E 双圆孔转换头': {
    us: 'EU Type-C/E Power Adapter',
    gb: 'EU Type-C/E Travel Adaptor',
  },
  '10,000mAh 快充充电宝': {
    us: '10,000mAh Fast-Charge Power Bank',
    gb: '10,000mAh Fast-Charge Power Bank',
  },
  '微单相机 + 备用电池': {
    us: 'Mirrorless Camera + Spare Battery',
    gb: 'Mirrorless Camera + Spare Battery',
  },
  '常用手机快充器 + 1.5m 线': {
    us: 'Phone Fast Charger + 5ft Cable',
    gb: 'Phone Fast Charger + 1.5m Cable',
  },
  '100ml 硅胶分装瓶': {
    us: '3.4oz / 100ml Travel Bottles',
    gb: '100ml Silicone Travel Bottles',
  },
  隐形眼镜与护理液: {
    us: 'Contact Lenses & Solution',
    gb: 'Contact Lenses & Solution',
  },
  '便携牙刷牙膏 + 保湿润唇膏': {
    us: 'Travel Toothbrush, Paste + Lip Balm',
    gb: 'Travel Toothbrush, Paste + Lip Balm',
  },
  '随身急救药包（布洛芬 / 肠胃药 / 防水创可贴）': {
    us: 'Mini First-Aid Kit (Ibuprofen, Stomach Meds, Band-Aids)',
    gb: 'Pocket First-Aid Kit (Ibuprofen, GI Meds, Plasters)',
  },
  抗风轻量折叠伞: {
    us: 'Windproof Compact Umbrella',
    gb: 'Windproof Compact Umbrella',
  },
  轻量折叠酒店拖鞋: {
    us: 'Packable Hotel Slippers',
    gb: 'Foldable Hotel Slippers',
  },
};

export function translateDemoPackItemName(name: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !name) return name;
  const trimmed = name.trim();
  const hit = DEMO_PACK_ITEM_NAME_MAP[trimmed];
  if (hit) return lang === 'en-GB' ? hit.gb : hit.us;
  // Handle formatted names with trailing " ×2"
  const qtyMatch = /^(.+?)\s*(×\d+)$/.exec(trimmed);
  if (qtyMatch) {
    const baseHit = DEMO_PACK_ITEM_NAME_MAP[qtyMatch[1].trim()];
    if (baseHit) {
      return `${lang === 'en-GB' ? baseHit.gb : baseHit.us} ${qtyMatch[2]}`;
    }
  }
  return name;
}

const DEMO_PACK_ITEM_WHY_MAP: Record<string, string> = {
  老佛爷等店开退税单与酒店入住必须核验护照原件:
    'Original passport required for hotel check-in and in-store tax-free forms',
  '入境边检偶查返程机票与医疗保单，离线保存并备纸质版':
    'Border control may check return flights & medical cover — save offline + print a copy',
  '3–10°C 湿冷天气，两件轮换可穿 5 天不留异味':
    'Chilly damp weather — rotating 2 merino tops stays odor-free across 5 days',
  '下午 40% 阵雨概率，兼顾塞纳河边防风':
    '40% afternoon rain chance + windy Seine riverbanks',
  '早晚温差 7°C，防风兼顾街拍':
    'Crisp mornings & evenings — wind-resistant and great for street photos',
  '耐脏抗风，兼顾日行 1.4 万步与晚餐 Bistro':
    'Versatile for 14k daily steps and smart-casual bistro dinners',
  '5 天胶囊周期定量配置，透气速干防磨脚':
    'Sized for a 5-day capsule wardrobe — breathable & blister-free',
  '巴黎石板路雨后易滑，足弓支撑优先':
    'Wet Paris cobblestones get slick — arch support & grip matter',
  '法荷通用 230V/50Hz，多口快充头同时满足设备供电':
    'Fits France & Netherlands 230V/50Hz outlets with multi-port USB-C charging',
  '航空强制随身携带（Wh < 100），严禁放入托运行李':
    'Airline rule: lithium power banks (<100Wh) must stay in carry-on baggage',
  '10°C 以下低温续航下降约 20%，多备一块电池':
    'Cold weather drains camera batteries ~20% faster — bring a spare',
  '出发前一晚还要充手机，出发当天早晨拔下装随身包':
    'Used overnight before departure — unplug & pack on departure morning',
  '单瓶 ≤100ml 且总容量 ≤1L 透明封口袋，免开箱复检':
    'Each ≤100ml inside a 1L clear zip pouch for smooth airport security',
  '出发早晨佩戴后装入随身盒，提前一晚无法装箱':
    'Used on departure morning — pack solution into carry-on pouch last',
  '欧洲精品酒店不常备一次性洗漱，出发早晨洗漱完装包':
    'Many European boutique hotels skip disposable kits — pack after morning routine',
  '欧洲买处方药不便，备齐止痛退烧与磨脚创可贴更安心':
    'Keep pain relief, digestive meds & blister plasters handy in your daypack',
  '15:00 阵雨预警，折叠伞轻量随身携带':
    'Afternoon shower forecast — light enough for your everyday carry bag',
  '欧洲多数酒店不提供一次性拖鞋，装入外层防污袋':
    'Most European hotels do not provide slippers — stash in outer shoe pocket',
};

export function translateDemoPackItemWhy(why: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !why) return why;
  return DEMO_PACK_ITEM_WHY_MAP[why.trim()] || why;
}

const DEMO_TASK_TITLE_MAP: Record<string, string> = {
  '预订卢浮宫 & 圣礼拜堂分时门票': 'Book Louvre & Sainte-Chapelle timed-entry tickets',
  '预约戴高乐机场 (CDG) 酒店专车接机': 'Book CDG Airport private transfer to hotel',
  '购买巴黎 → 阿姆斯特丹 Eurostar 高铁票': 'Book Paris → Amsterdam Eurostar rail tickets',
  '购买并激活欧洲多国 eSIM 数据流量包': 'Buy & activate multi-country Europe eSIM data plan',
  '电话确认 Bistrot Paul Bert 靠窗晚餐留位': 'Confirm Bistrot Paul Bert dinner table reservation',
};

const DEMO_TASK_NOTE_MAP: Record<string, string> = {
  '旺季现场不售当日票，锁定上午场次并离线保存二维码':
    'No same-day walk-up tickets in peak season — lock morning slots & save QR passes offline',
  '核对航班号与航站楼，避免拖大箱换乘地铁老旧楼梯':
    'Confirm flight & terminal so you avoid hauling heavy bags up metro stairs',
  '选靠近大件行李架座位，保存离线 PDF 车票':
    'Pick seats near luggage racks and save offline PDF tickets',
  '落地自动连网，保留主卡接收银行退税与验证码短信':
    'Connects on landing while keeping your primary SIM active for bank 2FA texts',
  '迟到超 15 分钟会自动释放座位，提前请酒店前台代拨确认':
    'Tables release after 15 mins — ask hotel reception to reconfirm ahead of time',
};

export function translateDemoTaskTitle(title: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !title) return title;
  return DEMO_TASK_TITLE_MAP[title.trim()] || title;
}

export function translateDemoTaskNote(note: string | undefined, lang: AppLanguage): string | undefined {
  if (lang === 'zh-CN' || !note) return note;
  return DEMO_TASK_NOTE_MAP[note.trim()] || note;
}

const DEMO_STOP_TITLE_MAP: Record<string, string> = {
  '戴高乐机场 RER B 进城 & 入住玛黑区酒店': 'CDG Airport RER B into City & Le Marais Hotel Check-In',
  卢浮宫德农馆重点看展: 'Louvre Museum — Denon Wing Highlights',
  '杜乐丽花园秋叶漫步 & 热巧': 'Tuileries Garden Autumn Walk & Hot Chocolate',
  橘园美术馆莫奈睡莲椭圆厅: 'Musée de l’Orangerie — Monet Water Lilies',
  圣日耳曼左岸传统小酒馆晚餐: 'Saint-Germain Left Bank Classic Bistro Dinner',
  圣礼拜堂彩窗: 'Sainte-Chapelle Stained Glass',
  红孩儿市集午餐: 'Marché des Enfants Rouges Lunch',
  老佛爷穹顶与屋顶露台: 'Galeries Lafayette Dome & Rooftop Terrace',
  '薇薇安拱廊街 (Galerie Vivienne)': 'Galerie Vivienne Covered Passage',
  埃菲尔铁塔闪灯: 'Eiffel Tower Sunset Sparkle',
  '夏乐宫室内观景廊 & 建筑博物馆': 'Palais de Chaillot Indoor Viewing Gallery',
  'Bistrot Paul Bert 晚餐': 'Bistrot Paul Bert Dinner',
  '巴黎北站 Eurostar 跨国高铁 → 阿姆斯特丹中央站':
    'Gare du Nord Eurostar → Amsterdam Centraal',
  '入住运河区精品酒店 & 午餐轻食': 'Canal Ring Boutique Hotel Check-In & Light Lunch',
  '约旦区九小街 (De 9 Straatjes) 运河街拍': 'Jordaan & De 9 Straatjes Canal Walk',
  '安妮之家博物馆 & 运河摄影展馆 (Huis Marseille)':
    'Anne Frank House & Huis Marseille Photography Museum',
  'Café Winkel 43 招牌苹果派 & 荷兰炖牛肉晚餐':
    'Café Winkel 43 Dutch Apple Pie & Dinner',
  '梵高博物馆（向日葵与麦田群鸦真迹）': 'Van Gogh Museum (Sunflowers & Masterpieces)',
  'Albert Cuyp 露天市集现烤焦糖华夫饼 & 鲱鱼午餐':
    'Albert Cuyp Market Fresh Stroopwafel & Lunch',
  'Foodhallen 室内复古电车厂美食市集': 'Foodhallen Indoor Tram Depot Food Market',
  '阿姆斯特丹国立博物馆 (Rijksmuseum) 荣誉画廊': 'Rijksmuseum Gallery of Honour',
  '玻璃顶暖气运河游船 & 岸边晚餐': 'Heated Glass-Top Canal Cruise & Waterside Dinner',
  'De Bijenkorf 女王百货（离境前退税凑单 & 伴手礼）':
    'De Bijenkorf Dept. Store (Tax-Free Shopping & Gifts)',
  '史基浦机场 (AMS) 3 号出发厅海关退税盖章 & 值机':
    'Schiphol Airport (AMS) Hall 3 Customs VAT Stamp & Check-In',
};

const DEMO_TRANSIT_NOTE_MAP: Record<string, string> = {
  'RER B 直达 Châtelet-Les Halles 后步行 7 分钟寄存行李':
    'Direct RER B train to Châtelet-Les Halles, then a 7-min walk to drop bags',
  '地铁 1 号线 Hôtel de Ville → Palais Royal 仅 5 分钟（走地下卡鲁塞尔入口免淋雨）':
    'Metro Line 1 Hôtel de Ville → Palais Royal in 5m (enter via Carrousel du Louvre underground)',
  '从卢浮宫玻璃金字塔西侧直接步入花园中轴线':
    'Walk straight west from the Louvre Pyramid into the central garden promenade',
  '步行跨过艺术桥 (Pont des Arts) 12 分钟即达':
    'Scenic 12-min walk across the Seine via Pont des Arts',
  '酒店步行 6 分钟': '6-min walk from hotel',
  '地铁 1 号线直达 14 分钟（安检排队预留 20m）':
    'Metro Line 1 direct, 14m (allow ~20m for security queue)',
  '步行跨过塞纳河 18 分钟（有顶棚）': '18-min walk back across the Seine (covered market stalls)',
  '地铁 8 号线 Filles du Calvaire → Chaussée d’Antin 22 分钟':
    'Metro Line 8 Filles du Calvaire → Chaussée d’Antin, 22m',
  'RER C / 地铁 9 号线换乘约 28 分钟（17:12 日落准时亮灯）':
    'RER C / Metro Line 9 ~28m (tower sparkles on the hour from sunset)',
  '地铁 8 号线直达 Faidherbe-Chaligny 约 32 分钟':
    'Metro Line 8 direct to Faidherbe-Chaligny, ~32m',
  '车程 3h19m（12:44 抵达阿姆斯特丹，车票已计入预付机酒池）':
    '3h 19m journey (arrives 12:44 in Amsterdam; rail fare counted in prepaid pool)',
  '有轨电车 2 号线 Spui 站下车步行 4 分钟': 'Tram 2 to Spui stop, then a 4-min canal walk',
  '从酒店沿绅士运河步行 6 分钟即进入九小街独立买手区':
    '6-min walk along Herengracht into the 9 Streets boutique district',
  '沿王子运河向北步行 11 分钟': '11-min walk north along Prinsengracht',
  '电车 2 号线直达梵高博物馆站（须凭分时电子票准点入场）':
    'Tram 2 direct to Van Gogh Museum stop (timed-entry QR ticket required)',
  '从博物馆广场向东步行 12 分钟进入 De Pijp 街区':
    '12-min walk east from Museumplein into De Pijp',
  '步行返回博物馆广场 10 分钟（重点看伦勃朗《夜巡》与维米尔）':
    '10-min walk back to Museumplein (don’t miss Rembrandt’s Night Watch & Vermeer)',
  '电车 5 号线至 Westermarkt 码头登船（全封闭玻璃顶防雨保暖）':
    'Tram 5 to Westermarkt dock (enclosed heated glass roof)',
  '步行至水坝广场 8 分钟，顶楼客服中心可直接合并开具 Global Blue 退税单':
    '8-min walk to Dam Square; top-floor service desk issues consolidated Global Blue forms',
  'NS 机场快线 17 分钟直达！先带巴黎+阿姆全部退税商品找海关盖章，再办托运':
    '17m NS Intercity direct! Get customs stamps for Paris + Amsterdam goods BEFORE checking bags',
};

export function translateDemoStopTitle(title: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !title) return title;
  return DEMO_STOP_TITLE_MAP[title.trim()] || title;
}

export function translateDemoTransitNote(note: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !note) return note;
  return DEMO_TRANSIT_NOTE_MAP[note.trim()] || note;
}

const DEMO_WISHLIST_MAP: Record<string, string> = {
  奥赛博物馆印象派展厅: 'Musée d’Orsay Impressionist Gallery',
  巴黎圣日耳曼花神咖啡: 'Café de Flore, Saint-Germain',
  '玛黑区 Merci 买手店': 'Merci Concept Store, Le Marais',
  '阿姆斯特丹冯德尔公园 (Vondelpark)': 'Vondelpark, Amsterdam',
};

export function translateDemoWishlistItem(item: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !item) return item;
  return DEMO_WISHLIST_MAP[item.trim()] || item;
}

export function translateDemoCrewRole(role: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !role) return role;
  const trimmed = role.trim();
  if (trimmed === '行程发起人') return lang === 'en-GB' ? 'Lead Organiser' : 'Trip Organizer';
  if (trimmed === '同行伙伴') return lang === 'en-GB' ? 'Co-Traveller' : 'Co-Traveler';
  return role;
}

export function translateDemoMeetupNote(note: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !note) return note;
  if (note.trim() === '已订靠窗双人桌 · 迟到超过 15 分钟需电话告知') {
    return 'Window table for 2 booked · Call ahead if running >15 mins late';
  }
  return note;
}

const DEMO_SPATIAL_SUMMARY_MAP: Record<string, string> = {
  '当前 Day 2 线路跨越 3e → 1er → 3e → 9e → 7e → 11e，下午 9e→7e→11e 存在折返，累计地铁约 48 分钟。建议用 AI 动线优化减少跨区折返。':
    'Day 2 currently zigzags across 3e → 1er → 3e → 9e → 7e → 11e (~48m total metro time). Tap Optimize Route to cut cross-city backtracking.',
  'Day 2 当前线路跨越 3e → 1er → 3e → 9e → 7e → 11e，下午 9e→7e→11e 存在折返，累计地铁约 48 分钟。建议用 AI 动线优化减少跨区折返。':
    'Day 2 currently zigzags across 3e → 1er → 3e → 9e → 7e → 11e (~48m total metro time). Tap Optimize Route to cut cross-city backtracking.',
  'Day 1 沿塞纳河核心区顺向推进（玛黑区 3e → 卢浮宫 1er → 杜乐丽花园 → 跨艺术桥至左岸 6e），零折返步行友好。':
    'Day 1 flows west along the Seine (Le Marais 3e → Louvre 1er → Tuileries → Pont des Arts to Left Bank 6e) with zero backtracking.',
  'Day 3 上午 Eurostar 跨国直达阿姆斯特丹中央车站，下午集中在运河环带与约旦区步行圈（半径 900 米内），节奏舒缓。':
    'Day 3 takes morning Eurostar straight to Amsterdam Centraal, then keeps afternoon stops within a relaxed 900m Canal Ring & Jordaan loop.',
  'Day 4 聚焦南区博物馆广场与 De Pijp 市集，注意国立博物馆 15:30 入场距 17:00 闭馆较近，建议控制午餐停留时长。':
    'Day 4 clusters Museumplein & De Pijp Market — note Rijksmuseum 15:30 entry leaves 90m before 17:00 closing, so keep lunch brisk.',
  'Day 5 返程日动线紧凑：水坝广场百货 → 中央站快线 17 分钟直达史基浦机场，预留充足海关退税核验与托运时间。':
    'Day 5 departure flow is compact: Dam Square shopping → 17m direct train to Schiphol Airport with ample buffer for customs VAT stamps.',
};

export function translateDemoSpatialSummary(summary: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !summary) return summary;
  return DEMO_SPATIAL_SUMMARY_MAP[summary.trim()] || summary;
}

const DEMO_EXPENSE_TITLE_MAP: Record<string, string> = {
  '埃菲尔铁塔登顶门票 ×2': 'Eiffel Tower Summit Tickets ×2',
  'Boulangerie Utopie 早餐可颂': 'Boulangerie Utopie Croissant & Coffee',
  老佛爷羊绒围巾: 'Galeries Lafayette Cashmere Scarf',
  '戴高乐机场 RER B 进城 + 地铁充值': 'CDG RER B Train + Metro Top-Up',
  '卢浮宫门票 ×2 + 左岸小酒馆晚餐': 'Louvre Tickets ×2 + Left Bank Bistro Dinner',
  '卢浮宫分时预约门票 ×2': 'Louvre Timed-Entry Tickets ×2',
  圣日耳曼左岸小酒馆晚餐: 'Saint-Germain Left Bank Bistro Dinner',
};

const DEMO_EXPENSE_NOTE_MAP: Record<string, string> = {
  官方预约电子票: 'Official timed-entry e-tickets',
  '黑芝麻牛角包 + 浓缩咖啡': 'Black sesame croissant + espresso',
  '计入大额购物桶，已开具退税单待离境海关盖章':
    'Counted in Shopping reserve · Tax-free form issued, awaiting customs stamp at exit',
  'Day 1 个人交通支出': 'Day 1 personal airport & metro transit',
  'Day 1 晚间双方已当面结清 AA 份额 (€37.50/人)':
    'Settled 50/50 in person on Day 1 evening (€37.50/each)',
  'Day 1 晚间双方已当面结清 AA 份额 (€11.00/人)':
    'Settled 50/50 in person on Day 1 evening (€11.00/each)',
  'Day 1 晚间双方已当面结清 AA 份额 (€26.50/人)':
    'Settled 50/50 in person on Day 1 evening (€26.50/each)',
};

export function translateDemoExpenseTitle(title: string, lang: AppLanguage): string {
  if (lang === 'zh-CN' || !title) return title;
  return DEMO_EXPENSE_TITLE_MAP[title.trim()] || title;
}

export function translateDemoExpenseNote(
  note: string | undefined,
  lang: AppLanguage
): string | undefined {
  if (lang === 'zh-CN' || !note) return note;
  return DEMO_EXPENSE_NOTE_MAP[note.trim()] || note;
}

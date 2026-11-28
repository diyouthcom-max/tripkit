import type { AppLanguage, PackingGroup, PackingItem, PackingLayer, SmartBagId, TripSetup, UnitSystem } from '../types';
import { getPackingUtilsCopy } from '../i18n/packs/packingUtilsPack';

export interface SmartBagSpec {
  id: SmartBagId;
  title: string;
  shortLabel: string;
  subtitle: string;
  dotColor: string;
  defaultCarryOn: boolean;
}

export const CARRY_ON_LIMIT_KG = 7.0;
export const CHECKED_LIMIT_KG = 23.0;

export const SMART_BAG_SPECS: SmartBagSpec[] = [
  {
    id: 'cube_xl',
    title: 'XL Packing Cube · 外套与大件包',
    shortLabel: 'XL 大件包',
    subtitle: 'Bagail XL 压缩袋 · 箱底主力层 · 厚外套 / 风衣大件',
    dotColor: '#078C88',
    defaultCarryOn: false,
  },
  {
    id: 'cube_l',
    title: 'L Packing Cube · 裤装与厚装包',
    shortLabel: 'L 裤装包',
    subtitle: 'Bagail L 压缩袋 · 箱底主力层 · 牛仔裤 / 重磅下装',
    dotColor: '#7E63B8',
    defaultCarryOn: false,
  },
  {
    id: 'cube_m',
    title: 'M Packing Cube · 上衣与打底包',
    shortLabel: 'M 上衣包',
    subtitle: 'Bagail M 压缩袋 · 箱中层 · 打底衫 / 衬衫日常上衣',
    dotColor: '#2E8B6E',
    defaultCarryOn: false,
  },
  {
    id: 'cube_s',
    title: 'S Packing Cube · 贴身与小配件包',
    shortLabel: 'S 贴身小件包',
    subtitle: 'Bagail S 收纳袋 · 缝隙填充层 · 换洗内衣袜 / 转换插头',
    dotColor: '#C9A227',
    defaultCarryOn: false,
  },
  {
    id: 'shoe_bag',
    title: 'Shoe Bag · 独立防尘鞋袋',
    shortLabel: 'Shoe Bag 鞋袋',
    subtitle: '防污防尘隔离鞋袋 · 靠滚轮轴心侧 · 备用步行鞋 / 折叠拖鞋',
    dotColor: '#5B7370',
    defaultCarryOn: false,
  },
  {
    id: 'toiletry_bag',
    title: '洗漱包',
    shortLabel: '洗漱包',
    subtitle: '100ml 透明干湿分离包 · 箱面顶层快取 · 液体分装与洗护',
    dotColor: '#0ABAB5',
    defaultCarryOn: false,
  },
  {
    id: 'doc_pouch',
    title: '证件包',
    shortLabel: '证件包',
    subtitle: '贴身防盗证件夹 · 全程随身核验 · 护照签证 / 机酒保单',
    dotColor: '#D97E4A',
    defaultCarryOn: true,
  },
  {
    id: 'pill_box',
    title: '药盒',
    shortLabel: '药盒',
    subtitle: '便携分格急救药盒 · 随身快取层 · 退烧止痛 / 肠胃 / 创可贴',
    dotColor: '#C9637B',
    defaultCarryOn: true,
  },
  {
    id: 'edc_bag',
    title: '随时携带的包',
    shortLabel: '随时携带的包',
    subtitle: '随身登机斜挎包 · 严禁托运与高频取用 · 充电宝 / 相机 / 雨具',
    dotColor: '#174F4B',
    defaultCarryOn: true,
  },
];

export const VALID_BAG_IDS = new Set<SmartBagId>(SMART_BAG_SPECS.map((b) => b.id));

const CARRY_ON_BAG_IDS = new Set<SmartBagId>(['doc_pouch', 'pill_box', 'edc_bag']);

const SMART_BAG_I18N: Partial<
  Record<
    Exclude<AppLanguage, 'zh-CN'>,
    Record<SmartBagId, { title: string; shortLabel: string; subtitle: string }>
  >
> = {
  'en-US': {
    cube_xl: {
      title: 'XL Packing Cube · Coats & Bulky Gear',
      shortLabel: 'XL Outerwear Cube',
      subtitle: 'Compression Cube XL · Base layer · Jackets, trench coats & bulky items',
    },
    cube_l: {
      title: 'L Packing Cube · Pants & Midlayers',
      shortLabel: 'L Bottoms Cube',
      subtitle: 'Compression Cube L · Base layer · Jeans, trousers & knitwear',
    },
    cube_m: {
      title: 'M Packing Cube · Tops & Base Layers',
      shortLabel: 'M Tops Cube',
      subtitle: 'Compression Cube M · Mid layer · Shirts, tees & everyday tops',
    },
    cube_s: {
      title: 'S Packing Cube · Socks & Small Gear',
      shortLabel: 'S Basics Cube',
      subtitle: 'Organizer Pouch S · Gap filler · Underwear, socks & plug adapters',
    },
    shoe_bag: {
      title: 'Shoe Bag · Dustproof Footwear Pouch',
      shortLabel: 'Shoe Bag',
      subtitle: 'Isolated shoe pouch · Near suitcase wheels · Spare sneakers / slippers',
    },
    toiletry_bag: {
      title: 'Toiletry Bag',
      shortLabel: 'Toiletry Bag',
      subtitle: 'TSA-friendly wet/dry pouch · Top layer · Liquids & personal care',
    },
    doc_pouch: {
      title: 'Document Pouch',
      shortLabel: 'Docs Pouch',
      subtitle: 'RFID carry pouch · Always on you · Passport, visas & confirmations',
    },
    pill_box: {
      title: 'Pill & First-Aid Case',
      shortLabel: 'Med Kit',
      subtitle: 'Compact pill organizer · Quick cabin access · Pain relief & bandages',
    },
    edc_bag: {
      title: 'Everyday Carry Bag',
      shortLabel: 'Everyday Carry',
      subtitle: 'Personal carry-on sling · Keep in cabin · Power bank, camera & umbrella',
    },
  },
  'en-GB': {
    cube_xl: {
      title: 'XL Compression Cube · Coats & Bulky Kit',
      shortLabel: 'XL Outerwear Cube',
      subtitle: 'Compression Cube XL · Case base · Coats, waterproofs & bulky kit',
    },
    cube_l: {
      title: 'L Compression Cube · Trousers & Knits',
      shortLabel: 'L Trousers Cube',
      subtitle: 'Compression Cube L · Case base · Jeans, trousers & heavy jumpers',
    },
    cube_m: {
      title: 'M Compression Cube · Tops & Shirts',
      shortLabel: 'M Tops Cube',
      subtitle: 'Compression Cube M · Mid layer · Shirts, T-shirts & base layers',
    },
    cube_s: {
      title: 'S Organiser Cube · Underwear & Adaptors',
      shortLabel: 'S Smalls Cube',
      subtitle: 'Organiser Pouch S · Gap filler · Underwear, socks & plug adaptors',
    },
    shoe_bag: {
      title: 'Shoe Bag · Dustproof Footwear Pouch',
      shortLabel: 'Shoe Bag',
      subtitle: 'Isolated footwear pouch · By wheel base · Spare trainers / slippers',
    },
    toiletry_bag: {
      title: 'Washbag',
      shortLabel: 'Washbag',
      subtitle: '100ml clear wet/dry pouch · Top access · Toiletries & skincare',
    },
    doc_pouch: {
      title: 'Document Wallet',
      shortLabel: 'Docs Wallet',
      subtitle: 'RFID travel wallet · Keep on person · Passport, boarding & insurance',
    },
    pill_box: {
      title: 'Pill Box & First Aid',
      shortLabel: 'First-Aid Kit',
      subtitle: 'Compact pill case · Cabin pocket · Painkillers, plasters & meds',
    },
    edc_bag: {
      title: 'Cabin Daypack / Crossbody',
      shortLabel: 'Cabin Daypack',
      subtitle: 'Personal cabin bag · Keep overhead/underseat · Power bank, camera & brolly',
    },
  },
  'es-MX': {
    cube_xl: {
      title: 'Cubo XL · Chamarras y abrigo',
      shortLabel: 'Cubo XL Abrigo',
      subtitle: 'Cubo compresión XL · Fondo de maleta · Chamarras, abrigos y volumen',
    },
    cube_l: {
      title: 'Cubo L · Pantalones y suéteres',
      shortLabel: 'Cubo L Pantalones',
      subtitle: 'Cubo compresión L · Fondo de maleta · Jeans, pantalones y tejido',
    },
    cube_m: {
      title: 'Cubo M · Playeras y camisas',
      shortLabel: 'Cubo M Playeras',
      subtitle: 'Cubo compresión M · Capa media · Playeras, camisas y prendas diarias',
    },
    cube_s: {
      title: 'Cubo S · Ropa interior y cables',
      shortLabel: 'Cubo S Menudos',
      subtitle: 'Bolsa S · Espacios libres · Calcetines, ropa interior y adaptadores',
    },
    shoe_bag: {
      title: 'Bolsa de calzado',
      shortLabel: 'Bolsa Calzado',
      subtitle: 'Bolsa antipolvo · Junto a las ruedas · Tenis extra o sandalias',
    },
    toiletry_bag: {
      title: 'Neceser de aseo',
      shortLabel: 'Neceser',
      subtitle: 'Bolsa 100ml transparente · Parte superior · Aseo y cuidado facial',
    },
    doc_pouch: {
      title: 'Portadocumentos',
      shortLabel: 'Documentos',
      subtitle: 'Cartera RFID · Siempre contigo · Pasaporte, boletos y tarjetas',
    },
    pill_box: {
      title: 'Botiquín portátil',
      shortLabel: 'Botiquín',
      subtitle: 'Estuche compacto · Bolsillo de mano · Analgésicos, curitas y recetas',
    },
    edc_bag: {
      title: 'Mochila de día / Cabina',
      shortLabel: 'Mochila Diaria',
      subtitle: 'Artículo personal en cabina · Batería portátil, cámara y paraguas',
    },
  },
  'fr-FR': {
    cube_xl: {
      title: 'Cube XL · Manteaux et gros volumes',
      shortLabel: 'Cube XL Manteaux',
      subtitle: 'Cube compression XL · Fond de valise · Vestes, manteaux et volumineux',
    },
    cube_l: {
      title: 'Cube L · Pantalons et pulls',
      shortLabel: 'Cube L Pantalons',
      subtitle: 'Cube compression L · Fond de valise · Jeans, pantalons et mailles',
    },
    cube_m: {
      title: 'Cube M · Hauts et chemises',
      shortLabel: 'Cube M Hauts',
      subtitle: 'Cube compression M · Couche centrale · T-shirts, chemises et hauts',
    },
    cube_s: {
      title: 'Cube S · Sous-vêtements et accessoires',
      shortLabel: 'Cube S Petits',
      subtitle: 'Pochette S · Interstices · Chaussettes, sous-vêtements et adaptateurs',
    },
    shoe_bag: {
      title: 'Sac à chaussures',
      shortLabel: 'Chaussures',
      subtitle: 'Housse isolée · Côté roulettes · Baskets de rechange ou chaussons',
    },
    toiletry_bag: {
      title: 'Trousse de toilette',
      shortLabel: 'Toilette',
      subtitle: 'Pochette 100ml étanche · Accès rapide · Soins et liquides',
    },
    doc_pouch: {
      title: 'Pochette documents',
      shortLabel: 'Documents',
      subtitle: 'Étui RFID · Sur soi · Passeport, billets, cartes et assurance',
    },
    pill_box: {
      title: 'Trousse pharmacie',
      shortLabel: 'Pharmacie',
      subtitle: 'Boîtier compact · Cabine · Médicaments, pansements et ordonnances',
    },
    edc_bag: {
      title: 'Sac de jour cabine',
      shortLabel: 'Sac du jour',
      subtitle: 'Bagage personnel cabine · Batterie externe, appareil photo et parapluie',
    },
  },
  'de-DE': {
    cube_xl: {
      title: 'XL-Packwürfel · Jacken & Volumen',
      shortLabel: 'XL Jacken',
      subtitle: 'Kompressionswürfel XL · Kofferboden · Mäntel, Jacken & Sperriges',
    },
    cube_l: {
      title: 'L-Packwürfel · Hosen & Pullover',
      shortLabel: 'L Hosen',
      subtitle: 'Kompressionswürfel L · Kofferboden · Jeans, Hosen & Strick',
    },
    cube_m: {
      title: 'M-Packwürfel · Oberteile & Hemden',
      shortLabel: 'M Oberteile',
      subtitle: 'Kompressionswürfel M · Mittlere Lage · Shirts, Hemden & Tops',
    },
    cube_s: {
      title: 'S-Packwürfel · Wäsche & Kleinteile',
      shortLabel: 'S Kleinteile',
      subtitle: 'Beutel S · Lückenfüller · Socken, Unterwäsche & Reiseadapter',
    },
    shoe_bag: {
      title: 'Schuhbeutel',
      shortLabel: 'Schuhbeutel',
      subtitle: 'Staubdichter Beutel · An den Rollen · Ersatzschuhe / Hausschuhe',
    },
    toiletry_bag: {
      title: 'Kulturbeutel',
      shortLabel: 'Kulturbeutel',
      subtitle: '100ml-Klarsichtbeutel · Obenauf · Pflege, Kosmetik & Flüssigkeiten',
    },
    doc_pouch: {
      title: 'Dokumententasche',
      shortLabel: 'Dokumente',
      subtitle: 'RFID-Etui · Immer am Körper · Reisepass, Tickets & Karten',
    },
    pill_box: {
      title: 'Reiseapotheke',
      shortLabel: 'Apotheke',
      subtitle: 'Kompakte Box · Handgepäck · Schmerzmittel, Pflaster & Rezepte',
    },
    edc_bag: {
      title: 'Tagesrucksack / Handgepäck',
      shortLabel: 'Tagesrucksack',
      subtitle: 'Persönliches Handgepäck · Powerbank, Kamera & Regenschirm',
    },
  },
  'pt-BR': {
    cube_xl: {
      title: 'Cubo XL · Casacos e peças volumosas',
      shortLabel: 'Cubo XL Casacos',
      subtitle: 'Cubo compressão XL · Fundo da mala · Jaquetas, casacos e itens grandes',
    },
    cube_l: {
      title: 'Cubo L · Calças e malhas',
      shortLabel: 'Cubo L Calças',
      subtitle: 'Cubo compressão L · Fundo da mala · Jeans, calças e suéteres',
    },
    cube_m: {
      title: 'Cubo M · Camisetas e camisas',
      shortLabel: 'Cubo M Blusas',
      subtitle: 'Cubo compressão M · Camada média · Camisetas, camisas e blusas',
    },
    cube_s: {
      title: 'Cubo S · Roupas íntimas e miudezas',
      shortLabel: 'Cubo S Pequenos',
      subtitle: 'Bolsa S · Espaços livres · Meias, roupas íntimas e adaptadores',
    },
    shoe_bag: {
      title: 'Saco de calçados',
      shortLabel: 'Calçados',
      subtitle: 'Bolsa protetora · Perto das rodinhas · Tênis extra ou chinelo',
    },
    toiletry_bag: {
      title: 'Nécessaire',
      shortLabel: 'Nécessaire',
      subtitle: 'Bolsa 100ml impermeável · Topo da mala · Higiene e cuidados',
    },
    doc_pouch: {
      title: 'Porta-documentos',
      shortLabel: 'Documentos',
      subtitle: 'Carteira RFID · Sempre com você · Passaporte, cartões e seguro',
    },
    pill_box: {
      title: 'Farmacinha portátil',
      shortLabel: 'Farmácia',
      subtitle: 'Estojo compacto · Bagagem de mão · Remédios, curativos e receitas',
    },
    edc_bag: {
      title: 'Mochila do dia / Cabine',
      shortLabel: 'Mochila Diária',
      subtitle: 'Item pessoal na cabine · Power bank, câmera e guarda-chuva',
    },
  },
  'ja-JP': {
    cube_xl: {
      title: 'XL圧縮キューブ · アウター・かさばる衣類',
      shortLabel: 'XL アウター',
      subtitle: '圧縮キューブ XL · スーツケース底 · コート・ジャケット・厚手衣類',
    },
    cube_l: {
      title: 'L圧縮キューブ · ボトムス・ニット',
      shortLabel: 'L ボトムス',
      subtitle: '圧縮キューブ L · スーツケース底 · パンツ・ジーンズ・セーター',
    },
    cube_m: {
      title: 'M圧縮キューブ · トップス・シャツ',
      shortLabel: 'M トップス',
      subtitle: '圧縮キューブ M · 中段 · Tシャツ・シャツ・インナー',
    },
    cube_s: {
      title: 'S整理ポーチ · 下着・靴下・小物',
      shortLabel: 'S 小物',
      subtitle: 'ポーチ S · 隙間収納 · 下着・靴下・変換プラグなど',
    },
    shoe_bag: {
      title: 'シューズバッグ',
      shortLabel: '靴袋',
      subtitle: '防塵シューズ袋 · キャスター側 · 予備スニーカー・スリッパ',
    },
    toiletry_bag: {
      title: '洗面・スキンケアポーチ',
      shortLabel: '洗面用具',
      subtitle: '100ml透明防水ポーチ · 上段 · 化粧品・歯ブラシ・液体類',
    },
    doc_pouch: {
      title: '貴重品・パスポートケース',
      shortLabel: '貴重品',
      subtitle: 'スキミング防止ケース · 常時携帯 · パスポート・搭乗券・カード',
    },
    pill_box: {
      title: '常備薬・救急ポーチ',
      shortLabel: '常備薬',
      subtitle: 'コンパクト救急ケース · 機内持込 · 鎮痛剤・絆創膏・処方薬',
    },
    edc_bag: {
      title: '機内デイパック・斜め掛け',
      shortLabel: 'デイパック',
      subtitle: '機内持ち込み身の回り品 · モバイルバッテリー・カメラ・折り畳み傘',
    },
  },
};

export function getLocalizedSmartBagSpec(
  bagId: SmartBagId,
  lang: AppLanguage = 'en-US'
): SmartBagSpec {
  const base = SMART_BAG_SPECS.find((b) => b.id === bagId) || SMART_BAG_SPECS[0];
  if (lang === 'zh-CN') return base;
  const table = SMART_BAG_I18N[lang] || SMART_BAG_I18N['en-US'];
  const tr = table?.[base.id];
  return tr ? { ...base, ...tr } : base;
}

export function getLocalizedSmartBagSpecs(lang: AppLanguage = 'en-US'): SmartBagSpec[] {
  return SMART_BAG_SPECS.map((b) => getLocalizedSmartBagSpec(b.id, lang));
}

export function getPackingLayerLabel(layer: PackingLayer, lang: AppLanguage = 'en-US'): string {
  const maps: Record<AppLanguage, Record<PackingLayer, string>> = {
    'zh-CN': {
      bottom_heavy: '箱底重物层',
      middle: '箱中衣物层',
      top_small: '箱面小件袋',
      carry_on: '随身外层包',
    },
    'en-US': {
      bottom_heavy: 'Bottom Heavy Layer',
      middle: 'Middle Apparel Layer',
      top_small: 'Top Quick-Access Pouch',
      carry_on: 'Carry-On Exterior Pocket',
    },
    'en-GB': {
      bottom_heavy: 'Base Heavy Layer',
      middle: 'Middle Wardrobe Layer',
      top_small: 'Top Quick-Access Pouch',
      carry_on: 'Cabin Outer Pocket',
    },
    'es-MX': {
      bottom_heavy: 'Capa inferior pesada',
      middle: 'Capa media de ropa',
      top_small: 'Capa superior rápida',
      carry_on: 'Bolsillo exterior de mano',
    },
    'fr-FR': {
      bottom_heavy: 'Fond de valise (lourd)',
      middle: 'Couche centrale (vêtements)',
      top_small: 'Dessus accès rapide',
      carry_on: 'Poche extérieure cabine',
    },
    'de-DE': {
      bottom_heavy: 'Untere Lage (schwer)',
      middle: 'Mittlere Kleidungslage',
      top_small: 'Obere Schnellzugriffstasche',
      carry_on: 'Handgepäck-Außenfach',
    },
    'pt-BR': {
      bottom_heavy: 'Fundo da mala (pesado)',
      middle: 'Camada média de roupas',
      top_small: 'Topo de acesso rápido',
      carry_on: 'Bolso externo de mão',
    },
    'ja-JP': {
      bottom_heavy: '底面・重量層',
      middle: '中段・衣類層',
      top_small: '上段・小物ポーチ',
      carry_on: '機内・外ポケット',
    },
  };
  return (maps[lang] || maps['en-US'])[layer];
}

/**
 * Strips trailing quantity markers like "×2", "x3", "*4", "2件" from an item name
 * so quantity is managed cleanly as a numeric field rather than hardcoded text.
 */
export function normalizePackingTag(rawTag: unknown): PackingItem['tag'] {
  const s = String(rawTag || '').trim().toLowerCase();
  if (rawTag === '必需' || /^(essential|must|required|mandatory|critical)/i.test(s)) return '必需';
  if (rawTag === '核心' || /^(core|key|main|primary)/i.test(s)) return '核心';
  if (rawTag === '天气' || /^(weather|rain|waterproof|sun|wind)/i.test(s)) return '天气';
  if (rawTag === '保暖' || /^(warm|thermal|cold|winter|layer)/i.test(s)) return '保暖';
  return '备用';
}

export function parseNameAndQuantity(rawName: string): { cleanName: string; parsedQty: number | null } {
  const trimmed = rawName.trim();
  if (!trimmed) return { cleanName: '', parsedQty: null };

  // Match trailing " ×2", " x2", " X2", " *2"
  const suffixMult = trimmed.match(/^(.*?)\s*[×xX*]\s*(\d{1,2})\s*$/);
  if (suffixMult && suffixMult[1].trim()) {
    const qty = Math.max(1, Math.min(99, parseInt(suffixMult[2], 10)));
    return { cleanName: suffixMult[1].trim(), parsedQty: qty };
  }

  // Match trailing " 2件", " 3双", " 2 pcs", " 3 pairs", " 2 sets", " 3 bottles" when preceded by whitespace
  const suffixUnit = trimmed.match(
    /^(.*?)\s+(\d{1,2})\s*(?:件|双|条|套|个|瓶|盒|包|张|本|把|pcs?|pairs?|sets?|bottles?|packs?)\s*$/i
  );
  if (suffixUnit && suffixUnit[1].trim()) {
    const qty = Math.max(1, Math.min(99, parseInt(suffixUnit[2], 10)));
    return { cleanName: suffixUnit[1].trim(), parsedQty: qty };
  }

  return { cleanName: trimmed, parsedQty: null };
}

/**
 * Estimates a realistic single-unit weight in grams based on item name keywords (Chinese & English) and category.
 */
export function estimateDefaultUnitWeightGrams(name: string, groupId?: string): number {
  const n = name.trim();
  if (!n) {
    if (groupId === 'documents') return 45;
    if (groupId === 'clothing') return 200;
    if (groupId === 'electronics') return 140;
    if (groupId === 'toiletries') return 90;
    if (groupId === 'first_aid') return 85;
    return 150;
  }

  // Zero-weight digital / virtual items (QR codes, eSIM, electronic passes)
  if (
    /二维码|电子票|电子签|电子凭证|\b(qr\s*code|qr|esim|digital\s*pass|e[-\s]?ticket|visit\s*japan\s*web)\b/i.test(
      n
    )
  ) {
    return 0;
  }

  // Documents & small pouches
  if (/护照|签证|身份证|驾照|\b(passport|visa|driver'?s?\s*licen[cs]e|national\s*id)\b/i.test(n)) return 55;
  if (
    /行程单|保单|机票|退税|信封|复印件|现金|外币|信用卡|\b(itinerary|insurance|boarding|ticket|tax[-\s]?free|vat|envelope|cash|currency|credit\s*card|wallet)\b/i.test(
      n
    )
  ) {
    return 35;
  }

  // Footwear
  if (/拖鞋|凉鞋|\b(slippers?|sandals?|flip[-\s]?flops?)\b/i.test(n)) return 140;
  if (/靴|登山鞋|徒步鞋|\b(boots?|hiking\s*shoes?|trekking)\b/i.test(n)) return 860;
  if (/鞋|运动鞋|步行鞋|板鞋|皮鞋|\b(shoes?|sneakers?|trainers?|loafers?|flats?)\b/i.test(n)) return 720;

  // Clothing
  if (/羽绒|大衣|毛呢|西装|冲锋衣|\b(parka|down\s*jacket|overcoat|wool\s*coat|blazer|suit|hardshell)\b/i.test(n)) {
    return 560;
  }
  if (/风衣|硬壳|外套|夹克|\b(trench|shell|jacket|coat|windbreaker|anorak)\b/i.test(n)) return 480;
  if (/牛仔裤|\b(jeans|denim)\b/i.test(n)) return 460;
  if (
    /毛衣|卫衣|抓绒|针织衫|长裤|休闲裤|西裤|半身裙|连衣裙|\b(sweater|jumper|hoodie|fleece|cardigan|knitwear|trousers?|pants|chinos?|skirt|dress)\b/i.test(
      n
    )
  ) {
    return 360;
  }
  if (/衬衫|长袖|\b(shirt|blouse|long[-\s]?sleeve)\b/i.test(n)) return 210;
  if (
    /打底衫|美利奴|T恤|短袖|背心|睡衣|\b(base\s*layer|merino|t[-\s]?shirt|tee|tank|pajamas?|pyjamas?|sleepwear)\b/i.test(
      n
    )
  ) {
    return 170;
  }
  if (
    /内衣|内裤|袜|文胸|丝巾|领带|手套|帽|腰带|皮带|\b(underwear|briefs?|boxers?|socks?|bra|tie|gloves?|hat|beanie|cap|belt)\b/i.test(
      n
    )
  ) {
    return 65;
  }
  if (/围巾|披肩|\b(scarf|shawl|wrap)\b/i.test(n)) return 190;

  // Electronics
  if (/笔记本|电脑|MacBook|\b(laptop|macbook|notebook\s*pc)\b/i.test(n)) return 1280;
  if (/iPad|平板|Kindle|\b(ipad|tablet|kindle|e[-\s]?reader)\b/i.test(n)) return 460;
  if (/相机|微单|单反|镜头|\b(camera|mirrorless|dslr|lens)\b/i.test(n)) return 620;
  if (/充电宝|移动电源|\b(power\s*bank|battery\s*pack|portable\s*charger)\b/i.test(n)) return 210;
  if (/转换头|转换插头|\b(adapter|adaptor|plug\s*converter)\b/i.test(n)) return 90;
  if (
    /快充|充电器|数据线|耳机|读卡器|记忆卡|电池|\b(charger|cable|cord|earbuds?|airpods?|headphones?|sd\s*card|battery)\b/i.test(
      n
    )
  ) {
    return 105;
  }

  // Toiletries & First Aid
  if (
    /分装瓶|洗发|沐浴|防晒|护肤|乳液|卸妆|护理液|\b(travel\s*bottle|shampoo|body\s*wash|sunscreen|suncream|skincare|lotion|cleanser|solution)\b/i.test(
      n
    )
  ) {
    return 85;
  }
  if (
    /牙刷|牙膏|润唇|口红|剃须|梳|隐形眼镜|化妆|\b(toothbrush|toothpaste|lip\s*balm|lipstick|razor|shaver|comb|brush|contact\s*lens|makeup|cosmetics?)\b/i.test(
      n
    )
  ) {
    return 75;
  }
  if (
    /创可贴|防磨脚|水泡贴|棉签|碘伏|酒精棉|口罩|\b(band[-\s]?aid|plaster|blister|swab|alcohol\s*pad|mask)\b/i.test(
      n
    )
  ) {
    return 35;
  }
  if (/药|布洛芬|退烧|肠胃|维生素|药包|药盒|\b(medicine|meds|ibuprofen|painkiller|paracetamol|vitamin|first[-\s]?aid|pill)\b/i.test(n)) {
    return 95;
  }

  // Extras
  if (/伞|折叠伞|\b(umbrella|brolly)\b/i.test(n)) return 240;
  if (/雨衣|\b(poncho|raincoat)\b/i.test(n)) return 80;
  if (/保温杯|水杯|水壶|\b(tumbler|water\s*bottle|flask|thermos)\b/i.test(n)) return 260;
  if (/颈枕|U型枕|\b(neck\s*pillow|travel\s*pillow)\b/i.test(n)) return 220;
  if (/墨镜|太阳镜|眼镜|\b(sunglasses|glasses|eyewear)\b/i.test(n)) return 65;

  if (groupId === 'documents') return 45;
  if (groupId === 'clothing') return 220;
  if (groupId === 'electronics') return 140;
  if (groupId === 'toiletries') return 90;
  if (groupId === 'first_aid') return 85;
  return 150;
}

export function getItemQuantity(item: Pick<PackingItem, 'name' | 'quantity'>): number {
  if (typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 1) {
    return Math.min(99, Math.round(item.quantity));
  }
  const { parsedQty } = parseNameAndQuantity(item.name);
  return parsedQty ?? 1;
}

export function getItemUnitWeight(
  item: Pick<PackingItem, 'name' | 'quantity' | 'unitWeightGrams' | 'weightGrams'>,
  groupId?: string
): number {
  const qty = getItemQuantity(item);
  if (
    typeof item.unitWeightGrams === 'number' &&
    Number.isFinite(item.unitWeightGrams) &&
    item.unitWeightGrams >= 0
  ) {
    return Math.round(item.unitWeightGrams);
  }
  if (typeof item.weightGrams === 'number' && item.weightGrams >= 0) {
    return Math.max(0, Math.round(item.weightGrams / qty));
  }
  return estimateDefaultUnitWeightGrams(item.name, groupId);
}

export function formatItemDisplayName(item: Pick<PackingItem, 'name' | 'quantity'>): string {
  const { cleanName } = parseNameAndQuantity(item.name);
  const qty = getItemQuantity(item);
  return qty > 1 ? `${cleanName} ×${qty}` : cleanName;
}

/**
 * Migrates legacy items (e.g. "美利奴羊毛打底衫 ×2", weightGrams: 340) into clean decoupled
 * { name: "美利奴羊毛打底衫", quantity: 2, unitWeightGrams: 170, weightGrams: 340 }.
 */
export function normalizePackingItemQuantity(item: PackingItem, groupId?: string): PackingItem {
  const { cleanName, parsedQty } = parseNameAndQuantity(item.name);
  const rawQty =
    typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 1
      ? Math.round(item.quantity)
      : parsedQty ?? 1;
  const qty = Math.max(1, Math.min(99, rawQty));

  let unitWeight: number;
  if (
    typeof item.unitWeightGrams === 'number' &&
    Number.isFinite(item.unitWeightGrams) &&
    item.unitWeightGrams >= 0
  ) {
    unitWeight = Math.round(item.unitWeightGrams);
  } else if (typeof item.weightGrams === 'number' && item.weightGrams >= 0) {
    unitWeight = Math.max(0, Math.round(item.weightGrams / qty));
  } else {
    unitWeight = estimateDefaultUnitWeightGrams(cleanName, groupId);
  }

  return {
    ...item,
    name: cleanName || item.name,
    quantity: qty,
    unitWeightGrams: unitWeight,
    weightGrams: Math.max(0, unitWeight * qty),
  };
}

export function normalizePackingGroups(groups: PackingGroup[]): PackingGroup[] {
  return groups.map((grp) => ({
    ...grp,
    items: grp.items.map((it) => normalizePackingItemQuantity(it, grp.id)),
  }));
}

export type ClothingScaleCategory =
  | 'innerwear'
  | 'top'
  | 'bottom'
  | 'midlayer'
  | 'sleep_sport'
  | 'proportional';

export interface ClothingNormalizationItemDiff {
  groupId: string;
  groupTitle: string;
  itemId: string;
  itemName: string;
  scaleCategory: ClothingScaleCategory;
  scaleRuleLabel: string;
  alreadyPacked: boolean;
  prevQuantity: number;
  nextQuantity: number;
  deltaQuantity: number;
  unitWeightGrams: number;
  prevWeightGrams: number;
  nextWeightGrams: number;
  deltaWeightGrams: number;
}

export interface ClothingNormalizationPlan {
  previousDays: number;
  targetDays: number;
  effectiveCycleDays: number;
  laundryEnabled: boolean;
  laundryIntervalDays: number;
  rewearEnabled: boolean;
  evaluatedCount: number;
  changedItems: ClothingNormalizationItemDiff[];
  unchangedCount: number;
  totalDeltaPieces: number;
  totalDeltaWeightGrams: number;
  updatedGroups: PackingGroup[];
}

function computeEffectiveClothingCycleDays(
  days: number,
  laundry: boolean,
  laundryIntervalDays: number
): number {
  const safeDays = Math.max(1, Math.min(60, Math.round(days) || 1));
  if (!laundry) {
    return safeDays;
  }
  const interval = Math.max(2, Math.min(14, Math.round(laundryIntervalDays) || 5));
  if (safeDays <= interval) {
    return safeDays;
  }
  const extraLaundryCycles = Math.min(
    3,
    Math.max(0, Math.floor((safeDays - interval - 1) / interval))
  );
  return Math.min(safeDays, interval + 1 + extraLaundryCycles);
}

function classifyDayScaledClothingCategory(
  cleanName: string,
  isClothingGroup: boolean,
  prevQty: number,
  lang: AppLanguage = 'en-US'
): { category: ClothingScaleCategory; label: string } | null {
  const { clothingRules } = getPackingUtilsCopy(lang);
  // Exclude non-clothing equipment, electronics, toiletries, meds, documents
  if (
    /护照|签证|身份证|行程单|保单|机票|充电|移动电源|转换头|转换插|数据线|相机|微单|镜头|电脑|笔记本|iPad|平板|耳机|分装瓶|洗发|沐浴|护肤|防晒|牙刷|牙膏|润唇|隐形眼镜|护理液|药|布洛芬|创可贴|折叠伞|雨伞|水杯|保温杯|颈枕|passport|visa|charger|power bank|adapter|adaptor|camera|laptop|tablet|earbuds|sunscreen|suncream|toothbrush|medicine|umbrella|bottle|pillow/i.test(
      cleanName
    )
  ) {
    return null;
  }

  // Exclude footwear (spare shoes/slippers don't multiply with days)
  if (/鞋|靴|拖鞋|凉鞋|shoe|sneaker|trainer|boot|sandal|slipper/i.test(cleanName)) {
    return null;
  }

  // Exclude heavy outerwear and single-piece accessories
  if (
    /硬壳|冲锋衣|羽绒|大衣|风衣|夹克|皮衣|西装外套|棉服|雨衣|浴巾|腰带|皮带|帽|手套|围巾|披肩|墨镜|太阳镜|领带|丝巾|jacket|coat|trench|parka|blazer|raincoat|towel|belt|hat|gloves|scarf|sunglasses/i.test(
      cleanName
    )
  ) {
    return null;
  }

  // 1. Innerwear & socks
  if (/内衣|内裤|袜|文胸|安全裤|胸贴|秋衣|秋裤|保暖内衣|underwear|briefs|socks|bra|thermal/i.test(cleanName)) {
    const isDisposable = /一次性|disposable/i.test(cleanName);
    return {
      category: 'innerwear',
      label: isDisposable ? clothingRules.innerwearDisposable : clothingRules.innerwearCycle,
    };
  }

  // 2. Sleepwear & activewear
  if (/睡衣|家居服|运动服|健身服|速干套装|泳衣|泳裤|pajama|pyjama|sleepwear|activewear|swimwear/i.test(cleanName)) {
    return {
      category: 'sleep_sport',
      label: clothingRules.sleepSport,
    };
  }

  // 3. Mid-layers (sweaters, hoodies, fleece, cardigans)
  if (/毛衣|卫衣|针织衫|抓绒|开衫|羊绒衫|马甲|sweater|jumper|hoodie|fleece|cardigan|knitwear/i.test(cleanName)) {
    return {
      category: 'midlayer',
      label: clothingRules.midlayer,
    };
  }

  // 4. Bottoms & dresses
  if (/牛仔裤|长裤|休闲裤|西裤|短裤|运动裤|阔腿裤|工装裤|裤装|半身裙|短裙|长裙|连衣裙|jeans|trouser|pants|chino|shorts|skirt|dress/i.test(cleanName)) {
    return {
      category: 'bottom',
      label: clothingRules.bottom,
    };
  }

  // 5. Tops & base layers
  if (
    /打底衫|美利奴|T恤|短袖|长袖|衬衫|衬衣|POLO|Polo|背心|上衣|针织短袖|速干衣|shirt|tee|t-shirt|top|blouse|merino/i.test(cleanName) ||
    (isClothingGroup && /衫|袖|衣/.test(cleanName))
  ) {
    return {
      category: 'top',
      label: clothingRules.top,
    };
  }

  // 6. Custom multi-piece items inside the clothing group
  if (isClothingGroup && prevQty >= 2) {
    return {
      category: 'proportional',
      label: clothingRules.proportional,
    };
  }

  return null;
}

function syncDayScaledWhyText(
  why: string,
  targetDays: number,
  effectiveCycleDays: number,
  nextQty: number,
  laundry: boolean,
  lang: AppLanguage = 'en-US'
): string {
  if (!why) return why;
  const { syncDayWhy } = getPackingUtilsCopy(lang);
  const nextCycleText =
    laundry && effectiveCycleDays < targetDays
      ? syncDayWhy.laundryCycle(targetDays, effectiveCycleDays)
      : syncDayWhy.capsuleCycle(targetDays);

  let updated = why;
  if (/\d+-day\s+(?:capsule|trip|cycle)/i.test(updated)) {
    updated = updated.replace(/\d+-day\s+(?:capsule|trip|cycle)[^·.]*/i, nextCycleText);
  }
  if (/\d+\s*天(?:胶囊周期|行程.*?)定量(?:换洗)?配置/.test(updated)) {
    updated = updated.replace(/\d+\s*天(?:胶囊周期|行程.*?)定量(?:换洗)?配置/, nextCycleText);
  }
  if (/(?:[两二三四五六七八九十]|\d+)\s*件轮换(?:可穿|适配)\s*\d+\s*天/.test(updated)) {
    updated = updated.replace(
      /(?:[两二三四五六七八九十]|\d+)\s*件轮换(?:可穿|适配)\s*\d+\s*天/,
      syncDayWhy.rotationDays(nextQty, targetDays)
    );
  }
  return updated;
}

/**
 * Computes normalized clothing quantities when total trip days (or laundry/rewear settings) change,
 * returning both a detailed item-by-item preview diff and the normalized PackingGroup[] array.
 */
export function computeClothingNormalizationPlan(
  groups: PackingGroup[],
  previousDays: number,
  targetSetup: Pick<TripSetup, 'days' | 'laundry' | 'laundryIntervalDays' | 'rewear'>,
  lang: AppLanguage = 'en-US'
): ClothingNormalizationPlan {
  const safePrevDays = Math.max(1, Math.min(60, Math.round(previousDays) || 1));
  const safeTargetDays = Math.max(1, Math.min(60, Math.round(targetSetup.days) || 1));
  const laundryEnabled = Boolean(targetSetup.laundry);
  const laundryIntervalDays = Math.max(
    2,
    Math.min(14, Math.round(targetSetup.laundryIntervalDays) || 5)
  );
  const rewearEnabled = Boolean(targetSetup.rewear);

  const prevCycleDays = computeEffectiveClothingCycleDays(
    safePrevDays,
    laundryEnabled,
    laundryIntervalDays
  );
  const effectiveCycleDays = computeEffectiveClothingCycleDays(
    safeTargetDays,
    laundryEnabled,
    laundryIntervalDays
  );

  const changedItems: ClothingNormalizationItemDiff[] = [];
  let evaluatedCount = 0;

  const updatedGroups: PackingGroup[] = groups.map((grp) => {
    const isClothingGroup =
      grp.id === 'clothing' ||
      grp.id === 'g_clothes' ||
      /衣|穿搭|服饰|apparel|wardrobe|cloth/i.test(grp.title);

    let nextCubeLabel = grp.cubeLabel;
    if (isClothingGroup && /(?:胶囊衣橱|核心衣物)\s*·\s*\d+天/.test(nextCubeLabel)) {
      nextCubeLabel = laundryEnabled
        ? `胶囊衣橱 · ${effectiveCycleDays}天循环`
        : `核心衣物 · ${effectiveCycleDays}天份`;
    }

    const nextItems = grp.items.map((rawItem) => {
      const normalizedCurrent = normalizePackingItemQuantity(rawItem, grp.id);
      const prevQty = getItemQuantity(normalizedCurrent);
      const unitWeight = getItemUnitWeight(normalizedCurrent, grp.id);
      const prevWeight = normalizedCurrent.weightGrams;

      const classification = classifyDayScaledClothingCategory(
        normalizedCurrent.name,
        isClothingGroup,
        prevQty,
        lang
      );
      if (!classification) {
        return normalizedCurrent;
      }

      evaluatedCount += 1;
      const { category, label } = classification;
      let rawNextQty = prevQty;

      if (category === 'innerwear') {
        if (/一次性/.test(normalizedCurrent.name)) {
          rawNextQty = Math.max(1, safeTargetDays);
        } else if (/换洗|备用/.test(normalizedCurrent.name)) {
          rawNextQty = Math.max(1, effectiveCycleDays - 1);
        } else {
          rawNextQty = safeTargetDays <= 1 ? 1 : Math.max(2, effectiveCycleDays);
        }
      } else if (category === 'top') {
        rawNextQty = rewearEnabled
          ? Math.max(1, Math.ceil((effectiveCycleDays - 1) / 2))
          : Math.max(1, effectiveCycleDays - 1);
      } else if (category === 'bottom') {
        rawNextQty = rewearEnabled
          ? Math.max(1, Math.ceil(effectiveCycleDays / 3))
          : Math.max(1, Math.ceil(effectiveCycleDays / 2));
      } else if (category === 'midlayer') {
        rawNextQty = rewearEnabled
          ? Math.max(1, Math.ceil(effectiveCycleDays / 5))
          : Math.max(1, Math.ceil(effectiveCycleDays / 3));
      } else if (category === 'sleep_sport') {
        if (/运动|健身|速干/.test(normalizedCurrent.name)) {
          rawNextQty = Math.max(1, Math.ceil(effectiveCycleDays / 4));
        } else {
          rawNextQty = effectiveCycleDays >= 7 ? 2 : 1;
        }
      } else if (category === 'proportional') {
        const ratio = effectiveCycleDays / Math.max(1, prevCycleDays);
        rawNextQty = Math.max(1, Math.round(prevQty * ratio));
      }

      const nextQty = Math.max(1, Math.min(60, rawNextQty));
      const nextWeight = Math.max(5, unitWeight * nextQty);

      if (nextQty !== prevQty) {
        changedItems.push({
          groupId: grp.id,
          groupTitle: grp.title,
          itemId: normalizedCurrent.id,
          itemName: normalizedCurrent.name,
          scaleCategory: category,
          scaleRuleLabel: label,
          alreadyPacked: Boolean(normalizedCurrent.done),
          prevQuantity: prevQty,
          nextQuantity: nextQty,
          deltaQuantity: nextQty - prevQty,
          unitWeightGrams: unitWeight,
          prevWeightGrams: prevWeight,
          nextWeightGrams: nextWeight,
          deltaWeightGrams: nextWeight - prevWeight,
        });
      }

      return {
        ...normalizedCurrent,
        why: syncDayScaledWhyText(
          normalizedCurrent.why,
          safeTargetDays,
          effectiveCycleDays,
          nextQty,
          laundryEnabled,
          lang
        ),
        quantity: nextQty,
        unitWeightGrams: unitWeight,
        weightGrams: nextWeight,
      };
    });

    return {
      ...grp,
      cubeLabel: nextCubeLabel,
      items: nextItems,
    };
  });

  const totalDeltaPieces = changedItems.reduce((sum, item) => sum + item.deltaQuantity, 0);
  const totalDeltaWeightGrams = changedItems.reduce(
    (sum, item) => sum + item.deltaWeightGrams,
    0
  );

  return {
    previousDays: safePrevDays,
    targetDays: safeTargetDays,
    effectiveCycleDays,
    laundryEnabled,
    laundryIntervalDays,
    rewearEnabled,
    evaluatedCount,
    changedItems,
    unchangedCount: Math.max(0, evaluatedCount - changedItems.length),
    totalDeltaPieces,
    totalDeltaWeightGrams,
    updatedGroups,
  };
}

export function classifyItemToSmartBag(item: PackingItem, group: PackingGroup): SmartBagId {
  const name = item.name;
  const gTitle = group.title;
  const isClothing =
    group.id === 'clothing' || /衣|服饰|穿搭|cloth|apparel|wardrobe/i.test(gTitle);

  if (
    group.id === 'documents' ||
    /证件|document/i.test(gTitle) ||
    /护照|签证|身份证|行程单|保单|机票|驾照|外币|现金|信用卡|退税|\b(passport|visa|boarding|insurance|itinerary|cash|currency|credit\s*card|tax[-\s]?free|vat\s*form)\b/i.test(
      name
    )
  ) {
    return 'doc_pouch';
  }

  if (
    group.id === 'first_aid' ||
    /医|药|first[-\s]?aid|med/i.test(gTitle) ||
    /药|创可贴|布洛芬|退烧|碘伏|酒精棉|体温计|维生素|药盒|防磨脚|水泡贴|\b(medicine|meds|ibuprofen|painkiller|paracetamol|band[-\s]?aid|plaster|blister|thermometer|vitamin|pill|first[-\s]?aid)\b/i.test(
      name
    )
  ) {
    return 'pill_box';
  }

  if (
    /充电宝|移动电源|相机|微单|镜头|耳机|雨伞|折叠伞|水杯|墨镜|太阳镜|颈枕|眼罩|纸巾|湿巾|电脑|iPad|平板|\b(power\s*bank|battery\s*pack|camera|mirrorless|lens|earbuds?|airpods?|headphones?|umbrella|brolly|sunglasses|neck\s*pillow|eye\s*mask|wipes|tissues?|laptop|macbook|ipad|tablet|kindle)\b/i.test(
      name
    ) ||
    item.carryOnOnly ||
    ((group.id === 'electronics' || /数码|电子|electronic|tech/i.test(gTitle)) &&
      item.morningOfDeparture)
  ) {
    return 'edc_bag';
  }

  if (
    group.id === 'toiletries' ||
    /洗漱|护|toiletr|washbag/i.test(gTitle) ||
    /洗漱|牙刷|牙膏|分装瓶|洗发|沐浴|护肤|防晒|润唇|隐形眼镜|护理液|剃须|化妆|卸妆|梳|\b(toiletr|washbag|toothbrush|toothpaste|travel\s*bottle|shampoo|body\s*wash|skincare|sunscreen|suncream|lip\s*balm|contact\s*lens|razor|makeup|cosmetics?|cleanser|comb)\b/i.test(
      name
    )
  ) {
    return 'toiletry_bag';
  }

  if (/鞋|靴|拖鞋|凉鞋|\b(shoes?|sneakers?|trainers?|boots?|slippers?|sandals?)\b/i.test(name)) {
    return 'shoe_bag';
  }

  // Volume-aware cube escalation as clothing quantity/total weight grows
  if (
    /外套|风衣|大衣|羽绒|硬壳|冲锋衣|西装|毛呢|浴巾|\b(coat|trench|parka|down\s*jacket|hardshell|jacket|blazer|overcoat|bath\s*towel)\b/i.test(
      name
    ) ||
    (isClothing && item.weightGrams >= 950) ||
    (isClothing &&
      item.weightGrams >= 450 &&
      !/裤|牛仔|打底|T恤|短袖|衬衫|内衣|袜|\b(pants|trousers?|jeans|tee|t[-\s]?shirt|shirt|underwear|socks?)\b/i.test(
        name
      ))
  ) {
    return 'cube_xl';
  }

  if (
    /裤|牛仔|裙|毛衣|卫衣|针织衫|抓绒|\b(pants|trousers?|jeans|chinos?|skirt|dress|sweater|jumper|hoodie|knitwear|fleece)\b/i.test(
      name
    ) ||
    (isClothing && item.weightGrams >= 680)
  ) {
    return 'cube_l';
  }

  if (
    /内衣|内裤|袜|文胸|领带|手套|帽|围巾|腰带|皮带|转换头|转换插头|数据线|充电器|读卡器|记忆卡|收纳|\b(underwear|briefs?|socks?|bra|tie|gloves?|hat|cap|scarf|belt|adapter|adaptor|cable|charger|sd\s*card|organizer)\b/i.test(
      name
    )
  ) {
    // If many sets of socks/underwear exceed 450g, promote to M cube
    if (isClothing && item.weightGrams >= 480) {
      return 'cube_m';
    }
    return 'cube_s';
  }

  return 'cube_m';
}

export function normalizeSmartBagOverrides(
  rawOverrides: unknown,
  groups?: PackingGroup[]
): Record<string, SmartBagId> {
  const validItemIds = groups
    ? new Set(groups.flatMap((g) => g.items.map((it) => it.id)))
    : null;
  const normalized: Record<string, SmartBagId> = {};

  // 1. Recover any item-level smartBagId first
  if (groups) {
    for (const grp of groups) {
      for (const it of grp.items) {
        if (it.smartBagId && VALID_BAG_IDS.has(it.smartBagId)) {
          normalized[it.id] = it.smartBagId;
        }
      }
    }
  }

  // 2. Apply trip.smartBagOverrides as primary source of truth
  if (rawOverrides && typeof rawOverrides === 'object') {
    for (const [itemId, bagId] of Object.entries(rawOverrides as Record<string, unknown>)) {
      if (
        typeof itemId === 'string' &&
        itemId.length > 0 &&
        typeof bagId === 'string' &&
        VALID_BAG_IDS.has(bagId as SmartBagId) &&
        (!validItemIds || validItemIds.has(itemId))
      ) {
        normalized[itemId] = bagId as SmartBagId;
      }
    }
  }

  return normalized;
}

export function resolveItemSmartBag(
  item: PackingItem,
  group: PackingGroup,
  overrides?: Record<string, SmartBagId>
): SmartBagId {
  const custom = overrides?.[item.id];
  if (custom && VALID_BAG_IDS.has(custom)) {
    return custom;
  }
  if (item.smartBagId && VALID_BAG_IDS.has(item.smartBagId)) {
    return item.smartBagId;
  }
  return classifyItemToSmartBag(item, group);
}

export function isSmartBagCarryOn(bagId: SmartBagId): boolean {
  return CARRY_ON_BAG_IDS.has(bagId);
}

export function isItemCarryOnWeight(
  item: PackingItem,
  group: PackingGroup,
  overrides?: Record<string, SmartBagId>
): boolean {
  const resolved = resolveItemSmartBag(item, group, overrides);
  return CARRY_ON_BAG_IDS.has(resolved);
}

export function resolveSmartBagForLocationSwitch(
  item: PackingItem,
  group: PackingGroup,
  targetLocation: 'cabin' | 'checkin',
  overrides?: Record<string, SmartBagId>
): SmartBagId {
  const currentBag = resolveItemSmartBag(item, group, overrides);
  if (targetLocation === 'cabin') {
    if (CARRY_ON_BAG_IDS.has(currentBag)) return currentBag;
    const text = `${item.name} ${group.id} ${group.title}`.toLowerCase();
    if (/护照|签证|身份证|机票|行程单|保单|退税|现金|信用卡|qr|esim|document|passport|visa|ticket/i.test(text)) {
      return 'doc_pouch';
    }
    if (/药|创可贴|维生素|急救|退烧|肠胃|first_aid|med|pill|vitamin|plaster/i.test(text)) {
      return 'pill_box';
    }
    return 'edc_bag';
  }

  // targetLocation === 'checkin'
  if (!CARRY_ON_BAG_IDS.has(currentBag)) return currentBag;
  const candidate = classifyItemToSmartBag(
    { ...item, carryOnOnly: false, smartBagId: undefined },
    group
  );
  if (!CARRY_ON_BAG_IDS.has(candidate)) {
    return candidate;
  }
  const text = `${item.name} ${group.id} ${group.title}`.toLowerCase();
  if (/洗漱|护肤|牙刷|防晒|沐浴|toiletr/i.test(text)) return 'toiletry_bag';
  if (/鞋|靴|拖鞋|凉鞋|shoe|boot|sandal|slipper/i.test(text)) return 'shoe_bag';
  if (getItemUnitWeight(item, group.id) >= 420) return 'cube_l';
  if (getItemUnitWeight(item, group.id) <= 120) return 'cube_s';
  return 'cube_m';
}

export function formatWeightCompact(
  grams: number,
  unitSystem: UnitSystem = 'metric'
): string {
  const safeGrams = Math.max(0, grams);
  if (unitSystem === 'imperial') {
    if (safeGrams >= 454) {
      return `${(safeGrams * 0.00220462262).toFixed(1)} lb`;
    }
    return `${(safeGrams * 0.0352739619).toFixed(1)} oz`;
  }
  if (safeGrams >= 1000) {
    return `${(safeGrams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(safeGrams)}g`;
}

export type CarryOnShellPreset = 'backpack' | 'spinner20';
export type CheckedShellPreset = 'case24' | 'case28';

export const CARRY_ON_SHELL_SPECS: Record<
  CarryOnShellPreset,
  { id: CarryOnShellPreset; label: string; grams: number }
> = {
  backpack: { id: 'backpack', label: '随身双肩包 (+0.85kg)', grams: 850 },
  spinner20: { id: 'spinner20', label: '20寸登机箱 (+2.60kg)', grams: 2600 },
};

export const CHECKED_SHELL_SPECS: Record<
  CheckedShellPreset,
  { id: CheckedShellPreset; label: string; grams: number }
> = {
  case24: { id: 'case24', label: '24寸托运箱 (+3.80kg)', grams: 3800 },
  case28: { id: 'case28', label: '28寸大箱 (+4.60kg)', grams: 4600 },
};

export function getCarryOnShellLabel(
  preset: CarryOnShellPreset,
  lang: AppLanguage = 'en-US',
  unitSystem: UnitSystem = 'metric'
): string {
  const grams = CARRY_ON_SHELL_SPECS[preset].grams;
  const w = formatWeightCompact(grams, unitSystem);
  return getPackingUtilsCopy(lang).carryOnShell[preset](w);
}

export function getCheckedShellLabel(
  preset: CheckedShellPreset,
  lang: AppLanguage = 'en-US',
  unitSystem: UnitSystem = 'metric'
): string {
  const grams = CHECKED_SHELL_SPECS[preset].grams;
  const w = formatWeightCompact(grams, unitSystem);
  return getPackingUtilsCopy(lang).checkedShell[preset](w);
}

export interface BagWeightBreakdown {
  bagId: SmartBagId;
  shortLabel: string;
  dotColor: string;
  isCarryOnBag: boolean;
  itemCount: number;
  packedCount: number;
  weightGrams: number;
  packedGrams: number;
  shareOfItemsPct: number;
}

export interface RebalanceRecommendation {
  itemId: string;
  groupId: string;
  itemName: string;
  weightGrams: number;
  fromBagId: SmartBagId;
  fromBagLabel: string;
  toBagId: SmartBagId;
  toBagLabel: string;
  reasonType: 'safety_must_carry_on' | 'relieve_carry_on' | 'relieve_checked';
  reasonText: string;
}

export interface LuggageWeightForecast {
  carryOnNetGrams: number;
  carryOnPackedGrams: number;
  carryOnTareGrams: number;
  carryOnTotalGrams: number;
  carryOnLimitGrams: number;
  carryOnUtilizationPct: number;
  /** Positive = remaining margin; Negative = overweight amount */
  carryOnDeltaGrams: number;

  checkedNetGrams: number;
  checkedPackedGrams: number;
  checkedTareGrams: number;
  checkedTotalGrams: number;
  checkedLimitGrams: number;
  checkedUtilizationPct: number;
  /** Positive = remaining margin; Negative = overweight amount */
  checkedDeltaGrams: number;

  totalGrams: number;
  carryOnRatioPct: number;
  checkedRatioPct: number;

  statusLevel: 'healthy' | 'caution' | 'overweight';
  headlineAdvice: string;
  wearableReliefCandidate: { itemName: string; weightGrams: number } | null;
  recommendations: RebalanceRecommendation[];
  bagBreakdowns: BagWeightBreakdown[];
}

function isStrictAviationCarryOnItem(name: string): boolean {
  return /充电宝|移动电源|锂电|备用电池|护照|签证|身份证|通行证|驾照|笔记本|电脑|MacBook|相机|微单|单反|镜头|现金|外币|信用卡|\b(power\s*bank|battery\s*pack|lithium|spare\s*batter(y|ies)|passport|visa|national\s*id|driver'?s?\s*licen[cs]e|laptop|macbook|camera|mirrorless|dslr|lens|cash|foreign\s*currency|credit\s*card)\b/i.test(
    name
  );
}

function isRestrictedFromCarryOnTransfer(name: string, groupId: string): boolean {
  if (groupId === 'toiletries') return true;
  return /洗发|沐浴|护肤|防晒|乳液|卸妆|护理液|分装瓶|液体|香水|喷雾|剪刀|剃须刀|指甲刀|水果刀|红酒|酒|\b(shampoo|body\s*wash|skincare|sunscreen|suncream|lotion|cleanser|solution|liquid|perfume|cologne|aerosol|spray|scissors|razor|blade|pocket\s*knife|nail\s*clipper|wine|liquor|alcohol)\b/i.test(
    name
  );
}

function inferTargetCheckedBagForItem(name: string, groupId: string, weightGrams: number): SmartBagId {
  if (/鞋|靴|拖鞋|凉鞋|\b(shoes?|sneakers?|trainers?|boots?|slippers?|sandals?)\b/i.test(name)) {
    return 'shoe_bag';
  }
  if (
    groupId === 'toiletries' ||
    /洗漱|牙刷|牙膏|分装瓶|洗发|沐浴|护肤|防晒|润唇|剃须|化妆|卸妆|梳|\b(toiletr|toothbrush|toothpaste|shampoo|skincare|sunscreen|lip\s*balm|razor|makeup|cosmetics?|cleanser)\b/i.test(
      name
    )
  ) {
    return 'toiletry_bag';
  }
  if (/外套|风衣|大衣|羽绒|硬壳|冲锋衣|西装|毛呢|浴巾|\b(coat|trench|parka|jacket|hardshell|blazer|towel)\b/i.test(name)) {
    return 'cube_xl';
  }
  if (/裤|牛仔|裙|毛衣|卫衣|针织衫|抓绒|\b(pants|trousers?|jeans|skirt|dress|sweater|jumper|hoodie|fleece)\b/i.test(name)) {
    return 'cube_l';
  }
  if (groupId === 'clothing' && weightGrams >= 260) return 'cube_m';
  return 'cube_s';
}

export function computeLuggageWeightForecast(params: {
  entries: Array<{
    groupId: string;
    groupTitle: string;
    item: PackingItem;
    bagId: SmartBagId;
  }>;
  carryOnLimitKg: number;
  checkedLimitKg: number;
  includeTare: boolean;
  carryOnShell: CarryOnShellPreset;
  checkedShell: CheckedShellPreset;
  language?: AppLanguage;
  unitSystem?: UnitSystem;
}): LuggageWeightForecast {
  const {
    entries,
    carryOnLimitKg,
    checkedLimitKg,
    includeTare,
    carryOnShell,
    checkedShell,
    language = 'en-US',
    unitSystem = 'metric',
  } = params;

  const copy = getPackingUtilsCopy(language);
  const bagSpecMap = new Map(
    getLocalizedSmartBagSpecs(language).map((b) => [b.id, b])
  );

  let carryOnNetGrams = 0;
  let carryOnPackedGrams = 0;
  let checkedNetGrams = 0;
  let checkedPackedGrams = 0;

  for (const entry of entries) {
    const w = Math.max(0, entry.item.weightGrams || 0);
    if (CARRY_ON_BAG_IDS.has(entry.bagId)) {
      carryOnNetGrams += w;
      if (entry.item.done) carryOnPackedGrams += w;
    } else {
      checkedNetGrams += w;
      if (entry.item.done) checkedPackedGrams += w;
    }
  }

  const totalNetItemsGrams = carryOnNetGrams + checkedNetGrams;

  const carryOnTareGrams =
    includeTare && (carryOnNetGrams > 0 || carryOnLimitKg > 0)
      ? CARRY_ON_SHELL_SPECS[carryOnShell].grams
      : 0;
  const checkedTareGrams =
    includeTare && (checkedNetGrams > 0 || checkedLimitKg > 0)
      ? checkedLimitKg <= 0 && checkedNetGrams === 0
        ? 0
        : CHECKED_SHELL_SPECS[checkedShell].grams
      : 0;

  const carryOnTotalGrams = carryOnNetGrams + carryOnTareGrams;
  const checkedTotalGrams =
    checkedLimitKg <= 0 && checkedNetGrams === 0
      ? 0
      : checkedNetGrams + (checkedNetGrams > 0 || checkedLimitKg > 0 ? checkedTareGrams : 0);

  const carryOnLimitGrams = Math.max(0, Math.round(carryOnLimitKg * 1000));
  const checkedLimitGrams = Math.max(0, Math.round(checkedLimitKg * 1000));

  const carryOnDeltaGrams = carryOnLimitGrams - carryOnTotalGrams;
  const checkedDeltaGrams = checkedLimitGrams - checkedTotalGrams;

  const carryOnUtilizationPct =
    carryOnLimitGrams > 0
      ? Math.round((carryOnTotalGrams / carryOnLimitGrams) * 100)
      : carryOnTotalGrams > 0
      ? 100
      : 0;

  const checkedUtilizationPct =
    checkedLimitGrams > 0
      ? Math.round((checkedTotalGrams / checkedLimitGrams) * 100)
      : checkedNetGrams > 0
      ? 100
      : 0;

  const totalGrams = carryOnTotalGrams + checkedTotalGrams;
  const carryOnRatioPct =
    totalGrams > 0 ? Math.round((carryOnTotalGrams / totalGrams) * 100) : 0;
  const checkedRatioPct = totalGrams > 0 ? Math.max(0, 100 - carryOnRatioPct) : 0;

  const bagBreakdowns: BagWeightBreakdown[] = SMART_BAG_SPECS.map((baseSpec) => {
    const spec = bagSpecMap.get(baseSpec.id) || baseSpec;
    const bagItems = entries.filter((e) => e.bagId === spec.id);
    const weightGrams = bagItems.reduce((s, e) => s + Math.max(0, e.item.weightGrams || 0), 0);
    const packedGrams = bagItems
      .filter((e) => e.item.done)
      .reduce((s, e) => s + Math.max(0, e.item.weightGrams || 0), 0);
    const packedCount = bagItems.filter((e) => e.item.done).length;
    const shareOfItemsPct =
      totalNetItemsGrams > 0 ? Math.round((weightGrams / totalNetItemsGrams) * 100) : 0;
    return {
      bagId: spec.id,
      shortLabel: spec.shortLabel,
      dotColor: spec.dotColor,
      isCarryOnBag: CARRY_ON_BAG_IDS.has(spec.id),
      itemCount: bagItems.length,
      packedCount,
      weightGrams,
      packedGrams,
      shareOfItemsPct,
    };
  });

  const recommendations: RebalanceRecommendation[] = [];
  const usedItemIds = new Set<string>();

  // 1. Check strict aviation carry-on items mistakenly placed in Checked bags
  for (const entry of entries) {
    if (!CARRY_ON_BAG_IDS.has(entry.bagId) && isStrictAviationCarryOnItem(entry.item.name)) {
      const toBagId: SmartBagId = /护照|签证|身份证|通行证|驾照|外币|现金|信用卡|\b(passport|visa|national\s*id|driver'?s?\s*licen[cs]e|cash|currency|credit\s*card)\b/i.test(
        entry.item.name
      )
        ? 'doc_pouch'
        : 'edc_bag';
      const fromSpec = bagSpecMap.get(entry.bagId);
      const toSpec = bagSpecMap.get(toBagId);
      recommendations.push({
        itemId: entry.item.id,
        groupId: entry.groupId,
        itemName: formatItemDisplayName(entry.item),
        weightGrams: entry.item.weightGrams,
        fromBagId: entry.bagId,
        fromBagLabel: fromSpec?.shortLabel || copy.bagFallback.checked,
        toBagId,
        toBagLabel: toSpec?.shortLabel || copy.bagFallback.carryOn,
        reasonType: 'safety_must_carry_on',
        reasonText: copy.rebalanceReasons.safetyCarryOn,
      });
      usedItemIds.add(entry.item.id);
      if (recommendations.length >= 2) break;
    }
  }

  // 2. Carry-on overweight or >= 90% warning -> move safe items to Checked bags (if checked allowance > 0)
  const isCarryOnOver = carryOnDeltaGrams < 0;
  const isCheckedOver =
    (checkedLimitGrams === 0 && checkedNetGrams > 0) ||
    (checkedLimitGrams > 0 && checkedDeltaGrams < 0);

  if ((isCarryOnOver || carryOnUtilizationPct >= 90) && checkedLimitGrams > 0 && checkedDeltaGrams > 150) {
    const movableFromCarryOn = entries
      .filter(
        (e) =>
          CARRY_ON_BAG_IDS.has(e.bagId) &&
          e.bagId !== 'doc_pouch' &&
          !usedItemIds.has(e.item.id) &&
          !isStrictAviationCarryOnItem(e.item.name) &&
          e.item.weightGrams >= 80
      )
      .sort((a, b) => b.item.weightGrams - a.item.weightGrams);

    let remainingToRelieve = isCarryOnOver
      ? Math.abs(carryOnDeltaGrams) + 200
      : 450;

    for (const cand of movableFromCarryOn) {
      if (recommendations.length >= 4 || remainingToRelieve <= 0) break;
      if (cand.item.weightGrams > checkedDeltaGrams) continue;
      const toBagId = inferTargetCheckedBagForItem(
        cand.item.name,
        cand.groupId,
        cand.item.weightGrams
      );
      const fromSpec = bagSpecMap.get(cand.bagId);
      const toSpec = bagSpecMap.get(toBagId);
      recommendations.push({
        itemId: cand.item.id,
        groupId: cand.groupId,
        itemName: formatItemDisplayName(cand.item),
        weightGrams: cand.item.weightGrams,
        fromBagId: cand.bagId,
        fromBagLabel: fromSpec?.shortLabel || copy.bagFallback.carryOn,
        toBagId,
        toBagLabel: toSpec?.shortLabel || copy.bagFallback.checked,
        reasonType: 'relieve_carry_on',
        reasonText: isCarryOnOver
          ? copy.rebalanceReasons.carryOnOver
          : copy.rebalanceReasons.carryOnNear,
      });
      usedItemIds.add(cand.item.id);
      remainingToRelieve -= cand.item.weightGrams;
    }
  }

  // 3. Checked overweight (or LCC 0kg checked with items) -> move compact non-liquid items to Carry-On if margin permits
  if (isCheckedOver && carryOnDeltaGrams >= 150) {
    const movableFromChecked = entries
      .filter(
        (e) =>
          !CARRY_ON_BAG_IDS.has(e.bagId) &&
          !usedItemIds.has(e.item.id) &&
          !isRestrictedFromCarryOnTransfer(e.item.name, e.groupId) &&
          e.item.weightGrams >= 80 &&
          e.item.weightGrams <= carryOnDeltaGrams
      )
      .sort((a, b) => b.item.weightGrams - a.item.weightGrams);

    let remainingCarryOnMargin = carryOnDeltaGrams;
    const edcSpec = bagSpecMap.get('edc_bag');
    for (const cand of movableFromChecked) {
      if (recommendations.length >= 4) break;
      if (cand.item.weightGrams > remainingCarryOnMargin) continue;
      const fromSpec = bagSpecMap.get(cand.bagId);
      recommendations.push({
        itemId: cand.item.id,
        groupId: cand.groupId,
        itemName: formatItemDisplayName(cand.item),
        weightGrams: cand.item.weightGrams,
        fromBagId: cand.bagId,
        fromBagLabel: fromSpec?.shortLabel || copy.bagFallback.checked,
        toBagId: 'edc_bag',
        toBagLabel: edcSpec?.shortLabel || copy.bagFallback.edc,
        reasonType: 'relieve_checked',
        reasonText:
          checkedLimitGrams === 0
            ? copy.rebalanceReasons.checkedNone
            : copy.rebalanceReasons.checkedOver,
      });
      usedItemIds.add(cand.item.id);
      remainingCarryOnMargin -= cand.item.weightGrams;
    }
  }

  // Find heaviest wearable coat / shoes in case overweight persists
  const wearableCandidateEntry = entries
    .filter((e) =>
      /羽绒|大衣|风衣|外套|夹克|冲锋衣|毛衣|卫衣|运动鞋|步行鞋|登山鞋|靴|\b(parka|coat|trench|jacket|hardshell|sweater|jumper|hoodie|sneakers?|trainers?|walking\s*shoes?|boots?)\b/i.test(
        e.item.name
      )
    )
    .sort((a, b) => b.item.weightGrams - a.item.weightGrams)[0];

  const wearableReliefCandidate = wearableCandidateEntry
    ? {
        itemName: wearableCandidateEntry.item.name,
        weightGrams: wearableCandidateEntry.item.weightGrams,
      }
    : null;

  const hasSafetyIssue = recommendations.some((r) => r.reasonType === 'safety_must_carry_on');

  let statusLevel: LuggageWeightForecast['statusLevel'] = 'healthy';
  if (isCarryOnOver || isCheckedOver) {
    statusLevel = 'overweight';
  } else if (
    hasSafetyIssue ||
    carryOnUtilizationPct >= 85 ||
    (checkedLimitGrams > 0 && checkedUtilizationPct >= 85)
  ) {
    statusLevel = 'caution';
  }

  let headlineAdvice = '';
  if (checkedLimitGrams === 0 && checkedNetGrams > 0) {
    const wStr = formatWeightCompact(checkedNetGrams, unitSystem);
    headlineAdvice = copy.weightForecastAdvice.zeroChecked(wStr);
  } else if (isCarryOnOver && isCheckedOver) {
    const overStr = formatWeightCompact(Math.abs(carryOnDeltaGrams) + Math.abs(checkedDeltaGrams), unitSystem);
    headlineAdvice = copy.weightForecastAdvice.bothOver(overStr);
  } else if (isCarryOnOver) {
    const overStr = formatWeightCompact(Math.abs(carryOnDeltaGrams), unitSystem);
    const availStr = formatWeightCompact(checkedDeltaGrams, unitSystem);
    headlineAdvice =
      checkedDeltaGrams > 200
        ? copy.weightForecastAdvice.carryOverWithSpace(overStr, availStr)
        : copy.weightForecastAdvice.carryOverNoSpace(overStr);
  } else if (isCheckedOver) {
    const overStr = formatWeightCompact(Math.abs(checkedDeltaGrams), unitSystem);
    const availStr = formatWeightCompact(carryOnDeltaGrams, unitSystem);
    headlineAdvice =
      carryOnDeltaGrams > 200
        ? copy.weightForecastAdvice.checkedOverWithSpace(overStr, availStr)
        : copy.weightForecastAdvice.checkedOverNoSpace(overStr);
  } else if (hasSafetyIssue) {
    headlineAdvice = copy.weightForecastAdvice.safetyDetected;
  } else if (statusLevel === 'caution') {
    const bufStr = unitSystem === 'imperial' ? '2–4 lb' : '1–2 kg';
    headlineAdvice = copy.weightForecastAdvice.nearLimit85(bufStr);
  } else {
    const totalBufferGrams =
      Math.max(0, carryOnDeltaGrams) + Math.max(0, checkedDeltaGrams);
    const bufStr = formatWeightCompact(totalBufferGrams, unitSystem);
    headlineAdvice = copy.weightForecastAdvice.healthy(bufStr);
  }

  return {
    carryOnNetGrams,
    carryOnPackedGrams,
    carryOnTareGrams,
    carryOnTotalGrams,
    carryOnLimitGrams,
    carryOnUtilizationPct,
    carryOnDeltaGrams,
    checkedNetGrams,
    checkedPackedGrams,
    checkedTareGrams,
    checkedTotalGrams,
    checkedLimitGrams,
    checkedUtilizationPct,
    checkedDeltaGrams,
    totalGrams,
    carryOnRatioPct,
    checkedRatioPct,
    statusLevel,
    headlineAdvice,
    wearableReliefCandidate,
    recommendations,
    bagBreakdowns,
  };
}


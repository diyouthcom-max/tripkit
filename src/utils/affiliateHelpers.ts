import type {
  AffiliatePartnerConfig,
  AppLanguage,
  SmartBagId,
  TripIntelligence,
} from '../types';
import { DEFAULT_AFFILIATE_PARTNERS } from './preferencesHelpers';
import { getPackingUtilsCopy } from '../i18n/packs/packingUtilsPack';

export interface AffiliateOfferLink {
  id: string;
  merchant: 'Amazon' | 'Taobao' | 'Klook' | 'Airalo' | 'GetYourGuide' | 'Trip.com';
  label: string;
  sublabel: string;
  url: string;
  commissionTier: string;
}

export interface DestinationGearGapPick {
  id: string;
  name: string;
  why: string;
  unitWeightGrams: number;
  carryOnOnly: boolean;
  targetGroupId: string;
  smartBagId: SmartBagId;
  primaryOffer: AffiliateOfferLink;
  secondaryOffer?: AffiliateOfferLink;
}

function mergePartners(cfg?: Partial<AffiliatePartnerConfig>): AffiliatePartnerConfig {
  return {
    ...DEFAULT_AFFILIATE_PARTNERS,
    ...(cfg || {}),
  };
}

export function buildAmazonSearchUrl(
  query: string,
  partners?: Partial<AffiliatePartnerConfig>
): string {
  const { amazonTag } = mergePartners(partners);
  const url = new URL('https://www.amazon.com/s');
  url.searchParams.set('k', query.trim());
  if (amazonTag) url.searchParams.set('tag', amazonTag);
  return url.toString();
}

export function buildTaobaoSearchUrl(
  query: string,
  partners?: Partial<AffiliatePartnerConfig>
): string {
  const { taobaoPid } = mergePartners(partners);
  const url = new URL('https://s.taobao.com/search');
  url.searchParams.set('q', query.trim());
  if (taobaoPid) url.searchParams.set('pid', taobaoPid);
  return url.toString();
}

export function buildEsimAffiliateUrl(
  cities: string[],
  lang: AppLanguage,
  partners?: Partial<AffiliatePartnerConfig>
): AffiliateOfferLink {
  const cfg = mergePartners(partners);
  const copy = getPackingUtilsCopy(lang).affiliate;
  const regionKeyword = cities.join(' ') || 'Global';
  const airaloUrl = new URL('https://www.airalo.com/');
  if (cfg.airaloRef) airaloUrl.searchParams.set('ref', cfg.airaloRef);
  airaloUrl.searchParams.set('q', regionKeyword);

  return {
    id: 'esim_airalo',
    merchant: 'Airalo',
    label: copy.airaloLabel,
    sublabel: copy.airaloSublabel,
    url: airaloUrl.toString(),
    commissionTier: '10%–20%',
  };
}

export function buildKlookSearchUrl(
  query: string,
  partners?: Partial<AffiliatePartnerConfig>
): string {
  const { klookAid } = mergePartners(partners);
  const url = new URL('https://www.klook.com/search/result/');
  url.searchParams.set('query', query.trim());
  if (klookAid) url.searchParams.set('aid', klookAid);
  return url.toString();
}

export function buildGetYourGuideSearchUrl(
  query: string,
  partners?: Partial<AffiliatePartnerConfig>
): string {
  const { getYourGuidePartnerId } = mergePartners(partners);
  const url = new URL('https://www.getyourguide.com/s/');
  url.searchParams.set('q', query.trim());
  if (getYourGuidePartnerId) url.searchParams.set('partner_id', getYourGuidePartnerId);
  return url.toString();
}

export function buildTripComHotelUrl(
  cityQuery: string,
  partners?: Partial<AffiliatePartnerConfig>
): string {
  const { tripComAllianceId } = mergePartners(partners);
  const url = new URL('https://www.trip.com/hotels/list');
  url.searchParams.set('keyword', cityQuery.trim());
  if (tripComAllianceId) url.searchParams.set('Allianceid', tripComAllianceId);
  return url.toString();
}

function enrichGearSearchKeyword(
  itemName: string,
  intel: Pick<TripIntelligence, 'plugType' | 'routeTitle'>,
  lang: AppLanguage
): { enQuery: string; zhQuery: string; contextTip: string } {
  const copy = getPackingUtilsCopy(lang).affiliate;
  const lower = itemName.toLowerCase();

  if (/插头|adapter|adaptor|adaptador|adaptateur|plug|converter|変換プラグ/.test(lower)) {
    const plug = intel.plugType || 'Universal';
    return {
      enQuery: `${plug} universal travel power adapter GaN`,
      zhQuery: `全球通用转换插头 ${plug} 快充`,
      contextTip: copy.tipAdapter(plug),
    };
  }
  if (/esim|sim|流量|漫游|wifi|datos|données|daten|通信/.test(lower)) {
    return {
      enQuery: `${intel.routeTitle || 'Europe'} travel eSIM unlimited data`,
      zhQuery: `${intel.routeTitle || '欧洲'} 旅游 eSIM 流量卡`,
      contextTip: copy.tipEsim,
    };
  }
  if (/雨|伞|雨衣|冲锋|umbrella|rain|poncho|waterproof|paraguas|parapluie|regenschirm|guarda-chuva|折りたたみ傘/.test(lower)) {
    return {
      enQuery: 'compact windproof travel umbrella waterproof shoes cover',
      zhQuery: '超轻折叠晴雨伞 防雨鞋套 便携',
      contextTip: copy.tipRain,
    };
  }
  if (/收纳|分装|压缩|cube|pouch|toiletry|cubo|housse|packwürfel|ポーチ/.test(lower)) {
    return {
      enQuery: 'ultralight compression packing cubes travel set',
      zhQuery: '超轻压缩收纳袋 旅行分装瓶',
      contextTip: copy.tipCube,
    };
  }
  if (/充电宝|移动电源|power\s*bank|batería|batterie|モバイルバッテリー/.test(lower)) {
    return {
      enQuery: '10000mAh airline approved slim power bank USB-C',
      zhQuery: '10000毫安 民航合规超薄快充充电宝',
      contextTip: copy.tipPowerBank,
    };
  }
  if (/秤|scale|báscula|pèse-bagage|kofferwaage|balança|はかり/.test(lower)) {
    return {
      enQuery: 'digital handheld luggage weight scale travel',
      zhQuery: '便携电子行李秤 机场防超重',
      contextTip: copy.tipScale,
    };
  }

  return {
    enQuery: `${itemName} travel`,
    zhQuery: `${itemName} 旅行便携`,
    contextTip: copy.tipDefault,
  };
}

export function buildGearAffiliateOffers(
  itemName: string,
  intel: Pick<TripIntelligence, 'plugType' | 'routeTitle'>,
  cities: string[],
  lang: AppLanguage,
  partners?: Partial<AffiliatePartnerConfig>
): AffiliateOfferLink[] {
  const copy = getPackingUtilsCopy(lang).affiliate;
  const enriched = enrichGearSearchKeyword(itemName, intel, lang);
  const offers: AffiliateOfferLink[] = [];

  if (/esim|sim|流量|漫游|datos|données|daten|通信/.test(itemName.toLowerCase())) {
    offers.push(buildEsimAffiliateUrl(cities, lang, partners));
    offers.push({
      id: `klook_esim_${itemName}`,
      merchant: 'Klook',
      label: copy.klookCompareLabel,
      sublabel: enriched.contextTip,
      url: buildKlookSearchUrl(`${cities[0] || ''} eSIM`, partners),
      commissionTier: '5%–8%',
    });
    return offers;
  }

  if (lang !== 'zh-CN') {
    offers.push({
      id: `amz_${itemName}`,
      merchant: 'Amazon',
      label: copy.amazonLabel,
      sublabel: enriched.contextTip,
      url: buildAmazonSearchUrl(enriched.enQuery, partners),
      commissionTier: '3%–8%',
    });
    offers.push({
      id: `klk_${itemName}`,
      merchant: 'Klook',
      label: copy.klookGearLabel,
      sublabel: copy.klookGearSub,
      url: buildKlookSearchUrl(enriched.enQuery, partners),
      commissionTier: '5%–8%',
    });
  } else {
    offers.push({
      id: `tb_${itemName}`,
      merchant: 'Taobao',
      label: copy.taobaoLabel,
      sublabel: enriched.contextTip,
      url: buildTaobaoSearchUrl(enriched.zhQuery, partners),
      commissionTier: '3%–10%',
    });
    offers.push({
      id: `amz_${itemName}`,
      merchant: 'Amazon',
      label: copy.amazonLabel,
      sublabel: enriched.enQuery,
      url: buildAmazonSearchUrl(enriched.enQuery, partners),
      commissionTier: '3%–8%',
    });
  }

  return offers;
}

export function getDestinationGearGapRecommendations(
  intel: Pick<TripIntelligence, 'plugType' | 'rainChance' | 'routeTitle'>,
  cities: string[],
  existingItemNames: string[],
  lang: AppLanguage,
  partners?: Partial<AffiliatePartnerConfig>,
  blockedNames: string[] = []
): DestinationGearGapPick[] {
  const copy = getPackingUtilsCopy(lang).affiliate;
  const joinedExisting = [...existingItemNames, ...blockedNames].join(' ').toLowerCase();
  const blockedLowerSet = new Set(
    blockedNames.map((n) => n.trim().toLowerCase().replace(/\s+/g, ''))
  );
  const picks: DestinationGearGapPick[] = [];

  const hasAdapter = /转换插头|adapter|adaptor|adaptador|adaptateur|plug|reiseadapter|変換プラグ/.test(
    joinedExisting
  );
  if (!hasAdapter) {
    const plugLabel = intel.plugType || copy.defaultPlugLabel;
    const name = copy.gapAdapterName(plugLabel);
    const offers = buildGearAffiliateOffers(name, intel, cities, lang, partners);
    picks.push({
      id: 'gap_adapter',
      name,
      why: copy.gapAdapterWhy(plugLabel),
      unitWeightGrams: 135,
      carryOnOnly: true,
      targetGroupId: 'tech',
      smartBagId: 'edc_bag',
      primaryOffer: offers[0],
      secondaryOffer: offers[1],
    });
  }

  const hasRainGear =
    /雨伞|雨衣|防雨|umbrella|rain|poncho|paraguas|parapluie|regenschirm|guarda-chuva|折りたたみ傘/.test(
      joinedExisting
    );
  if (!hasRainGear) {
    const name = copy.gapUmbrellaName;
    const offers = buildGearAffiliateOffers(name, intel, cities, lang, partners);
    picks.push({
      id: 'gap_umbrella',
      name,
      why: copy.gapUmbrellaWhy(intel.rainChance || copy.defaultRainLabel),
      unitWeightGrams: 190,
      carryOnOnly: false,
      targetGroupId: 'weather',
      smartBagId: 'edc_bag',
      primaryOffer: offers[0],
      secondaryOffer: offers[1],
    });
  }

  const hasCubes =
    /压缩收纳|compression cube|收纳袋|cubos de compresión|cubes de compression|kompressions|cubos organizadores|圧縮トラベルポーチ/.test(
      joinedExisting
    );
  if (!hasCubes) {
    const name = copy.gapCubesName;
    const offers = buildGearAffiliateOffers(name, intel, cities, lang, partners);
    picks.push({
      id: 'gap_cubes',
      name,
      why: copy.gapCubesWhy,
      unitWeightGrams: 160,
      carryOnOnly: false,
      targetGroupId: 'clothing',
      smartBagId: 'cube_m',
      primaryOffer: offers[0],
      secondaryOffer: offers[1],
    });
  }

  const hasEsim = /esim|流量卡/.test(joinedExisting);
  if (!hasEsim) {
    const esimOffer = buildEsimAffiliateUrl(cities, lang, partners);
    picks.push({
      id: 'gap_esim',
      name: copy.gapEsimName(cities[0] || copy.defaultCityLabel),
      why: copy.gapEsimWhy,
      unitWeightGrams: 0,
      carryOnOnly: true,
      targetGroupId: 'documents',
      smartBagId: 'doc_pouch',
      primaryOffer: esimOffer,
    });
  }

  return picks.filter(
    (p) => !blockedLowerSet.has(p.name.trim().toLowerCase().replace(/\s+/g, ''))
  );
}

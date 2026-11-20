import { pickLang } from '../langHelper';
import type { AppLanguage } from '../../types';

export interface PackingUtilsCopy {
  clothingRules: {
    innerwearDisposable: string;
    innerwearCycle: string;
    sleepSport: string;
    midlayer: string;
    bottom: string;
    top: string;
    proportional: string;
  };
  syncDayWhy: {
    laundryCycle: (days: number, cycle: number) => string;
    capsuleCycle: (days: number) => string;
    rotationDays: (qty: number, days: number) => string;
  };
  carryOnShell: {
    backpack: (w: string) => string;
    spinner20: (w: string) => string;
  };
  checkedShell: {
    case24: (w: string) => string;
    case28: (w: string) => string;
  };
  bagFallback: {
    carryOn: string;
    checked: string;
    edc: string;
  };
  rebalanceReasons: {
    safetyCarryOn: string;
    carryOnOver: string;
    carryOnNear: string;
    checkedNone: string;
    checkedOver: string;
  };
  weightForecastAdvice: {
    zeroChecked: (wStr: string) => string;
    bothOver: (overStr: string) => string;
    carryOverWithSpace: (overStr: string, availStr: string) => string;
    carryOverNoSpace: (overStr: string) => string;
    checkedOverWithSpace: (overStr: string, availStr: string) => string;
    checkedOverNoSpace: (overStr: string) => string;
    safetyDetected: string;
    nearLimit85: (bufStr: string) => string;
    healthy: (bufStr: string) => string;
  };
  alwaysPack: {
    defaultWhy: string;
    seedEssentialWhy: string;
  };
  affiliate: {
    airaloLabel: string;
    airaloSublabel: string;
    klookCompareLabel: string;
    amazonLabel: string;
    amazonOverlaySub: string;
    klookGearLabel: string;
    klookGearSub: string;
    taobaoLabel: string;
    tipAdapter: (plug: string) => string;
    tipEsim: string;
    tipRain: string;
    tipCube: string;
    tipPowerBank: string;
    tipScale: string;
    tipDefault: string;
    gapAdapterName: (plug: string) => string;
    gapAdapterWhy: (plug: string) => string;
    gapUmbrellaName: string;
    gapUmbrellaWhy: (rain: string) => string;
    gapCubesName: string;
    gapCubesWhy: string;
    gapEsimName: (city: string) => string;
    gapEsimWhy: string;
    defaultPlugLabel: string;
    defaultRainLabel: string;
    defaultCityLabel: string;
  };
}

const PACKING_UTILS_COPY: Record<AppLanguage, PackingUtilsCopy> = {
  'zh-CN': {
    clothingRules: {
      innerwearDisposable: '一次性贴身按天配置',
      innerwearCycle: '贴身换洗按周期配置',
      sleepSport: '家居/运动换洗配置',
      midlayer: '保暖中层轮换配置',
      bottom: '下装跨日轮换配置',
      top: '日常上衣轮换配置',
      proportional: '按行程天数等比缩放',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `${days} 天行程（${cycle} 天洗衣周期）定量配置`,
      capsuleCycle: (days) => `${days} 天胶囊周期定量配置`,
      rotationDays: (qty, days) => `${qty} 件轮换可穿 ${days} 天`,
    },
    carryOnShell: {
      backpack: (w) => `随身双肩包 (+${w})`,
      spinner20: (w) => `20寸登机箱 (+${w})`,
    },
    checkedShell: {
      case24: (w) => `24寸托运箱 (+${w})`,
      case28: (w) => `28寸大箱 (+${w})`,
    },
    bagFallback: {
      carryOn: '随身包',
      checked: '托运袋',
      edc: '随时携带的包',
    },
    rebalanceReasons: {
      safetyCarryOn: '锂电 / 贵重证件严禁托运，建议移回随身包过检',
      carryOnOver: '随身超重：可安全转入托运箱释放登机额度',
      carryOnNear: '随身接近上限：转入托运箱让登机更轻松',
      checkedNone: '无免费托运额：可并入随身包免托运登机',
      checkedOver: '托运超重：利用随身剩余额度分担重量',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `当前为廉航无托运预设（0kg），但 6 个托运收纳袋内仍有 ${wStr} 物品；请精简并移入随身包，或加购托运行李额。`,
      bothOver: (overStr) =>
        `随身与托运均超出当前航司限额（合计超重 ${overStr}），建议精简备用衣物并在登机当天直接穿戴重磅外套/鞋履。`,
      carryOverWithSpace: (overStr, availStr) =>
        `随身行李预计超出限额 ${overStr}，托运箱仍有 ${availStr} 余量，可一键将非锂电重物转入托运袋。`,
      carryOverNoSpace: (overStr) =>
        `随身行李预计超出限额 ${overStr}，建议将重磅外套穿在身上登机或换用轻量随身双肩包。`,
      checkedOverWithSpace: (overStr, availStr) =>
        `托运箱预计超出限额 ${overStr}，随身包尚余 ${availStr} 空间，可将小体积高密度非液体物品移至随身包分担。`,
      checkedOverNoSpace: (overStr) =>
        `托运箱预计超出限额 ${overStr}，建议减少换洗件数或登机当天穿戴最重的外套与鞋靴。`,
      safetyDetected: '总重符合航司标准，但检测到锂电池/证件类物品位于托运袋中，请一键移回随身包以免安检开箱。',
      nearLimit85: (bufStr) =>
        `当前配重已接近航司免费限额 85% 警戒线，建议预留至少 ${bufStr} 缓冲空间应对机场秤差或回程伴手礼。`,
      healthy: (bufStr) =>
        `随身与托运配重健康均衡，距航司限额共留有 ${bufStr} 回程战利品与伴手礼余量。`,
    },
    alwaysPack: {
      defaultWhy: '常备核心随行物品',
      seedEssentialWhy: '每次出行常备必带',
    },
    affiliate: {
      airaloLabel: '购买境外 eSIM 流量卡 (Airalo)',
      airaloSublabel: '扫码即用 · 免实体换卡',
      klookCompareLabel: 'Klook 比价',
      amazonLabel: 'Amazon 亚马逊海淘',
      amazonOverlaySub: '全球精选旅行装备',
      klookGearLabel: 'Klook 机场自提装备',
      klookGearSub: '机场取还 / 打包优惠',
      taobaoLabel: '淘宝联盟比价直达',
      tipAdapter: (plug) => `已自动匹配目的地 ${plug}`,
      tipEsim: '线上即时发货免等待',
      tipRain: '轻量折叠不占随身配重',
      tipCube: '压缩体积省出 30% 箱内空间',
      tipPowerBank: '符合民航登机标准 (<100Wh)',
      tipScale: '防值机超重罚款神器',
      tipDefault: '优选轻量化便携款',
      gapAdapterName: (plug) => `多国 GaN 快充转换插头 (${plug})`,
      gapAdapterWhy: (plug) => `目的地插座制式：${plug}`,
      gapUmbrellaName: '超轻晴雨两用折叠伞',
      gapUmbrellaWhy: (rain) => `天气预警：${rain}`,
      gapCubesName: '超轻防水压缩收纳袋套装',
      gapCubesWhy: '完美适配 9 袋分包体系，箱内扩容 30%',
      gapEsimName: (city) => `${city} 境外高速 eSIM 流量卡`,
      gapEsimWhy: '零克重虚拟装备 · 落地即连网看地图',
      defaultPlugLabel: '欧标双圆孔',
      defaultRainLabel: '行程可能遇阵雨',
      defaultCityLabel: '目的地',
    },
  },
  'en-US': {
    clothingRules: {
      innerwearDisposable: 'Disposable daily base',
      innerwearCycle: 'Essentials cycle scaling',
      sleepSport: 'Sleep / workout cycle',
      midlayer: 'Mid-layer rotation',
      bottom: 'Bottoms multi-day rotation',
      top: 'Daily tops rotation',
      proportional: 'Proportional to trip length',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `${days}-day trip (${cycle}-day laundry cycle)`,
      capsuleCycle: (days) => `${days}-day capsule cycle`,
      rotationDays: (qty, days) => `${qty} items rotated across ${days} days`,
    },
    carryOnShell: {
      backpack: (w) => `Daypack (+${w})`,
      spinner20: (w) => `20" Carry-On (+${w})`,
    },
    checkedShell: {
      case24: (w) => `24" Medium Case (+${w})`,
      case28: (w) => `28" Large Case (+${w})`,
    },
    bagFallback: {
      carryOn: 'Carry-on bag',
      checked: 'Checked bag',
      edc: 'Everyday Carry',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Lithium batteries & IDs are prohibited in checked bags — move to carry-on',
      carryOnOver: 'Carry-on overweight: move into checked bag to free space',
      carryOnNear: 'Carry-on near limit: move to checked bag for lighter boarding',
      checkedNone: 'No free checked bag: move into carry-on to avoid fees',
      checkedOver: 'Checked bag overweight: shift dense items into carry-on margin',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Budget fare (0 checked bag), yet ${wStr} remains inside your 6 checked cubes. Move gear to carry-on or add checked baggage.`,
      bothOver: (overStr) =>
        `Both carry-on and checked bag exceed your airline limit by ${overStr} total. Trim spares and wear heavy coats or boots on board.`,
      carryOverWithSpace: (overStr, availStr) =>
        `Carry-on exceeds limit by ${overStr}, while your checked bag still has ${availStr} free. Shift heavy non-battery gear below.`,
      carryOverNoSpace: (overStr) =>
        `Carry-on exceeds limit by ${overStr}. Wear your heaviest coat onto the flight or switch to a lighter pack.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `Checked bag exceeds limit by ${overStr}, while carry-on has ${availStr} spare. Move dense dry items into carry-on.`,
      checkedOverNoSpace: (overStr) =>
        `Checked bag exceeds limit by ${overStr}. Trim extra outfits or wear your heaviest coat and shoes on departure day.`,
      safetyDetected:
        'Total weight meets airline limits, but lithium batteries or passports were detected in checked luggage. Move them to carry-on for security.',
      nearLimit85: (bufStr) =>
        `Weight has reached 85% of your airline allowance — keep at least ${bufStr} buffer for airport scale variance and return souvenirs.`,
      healthy: (bufStr) =>
        `Balanced load across carry-on & checked bag, with ${bufStr} spare allowance for return souvenirs.`,
    },
    alwaysPack: {
      defaultWhy: 'Always-pack travel essential',
      seedEssentialWhy: 'Always-pack travel essential',
    },
    affiliate: {
      airaloLabel: 'Get Travel eSIM (Airalo)',
      airaloSublabel: 'Instant QR activation · No roaming fees',
      klookCompareLabel: 'Compare on Klook',
      amazonLabel: 'Shop on Amazon',
      amazonOverlaySub: 'Travel-ready compact pick',
      klookGearLabel: 'Check Klook Travel Gear',
      klookGearSub: 'Airport pickup / bundles',
      taobaoLabel: 'Compare on Taobao',
      tipAdapter: (plug) => `Matches ${plug}`,
      tipEsim: 'Instant digital delivery',
      tipRain: 'Compact carry-on fit',
      tipCube: 'Saves ~30% luggage space',
      tipPowerBank: 'Airline cabin-compliant (<100Wh)',
      tipScale: 'Avoid airport overweight fees',
      tipDefault: 'Travel-ready compact pick',
      gapAdapterName: (plug) => `${plug} GaN Travel Adapter`,
      gapAdapterWhy: (plug) => `Destination outlet: ${plug}`,
      gapUmbrellaName: 'Ultralight Compact Umbrella',
      gapUmbrellaWhy: (rain) => `Weather note: ${rain}`,
      gapCubesName: 'Compression Packing Cube Set',
      gapCubesWhy: 'Fits 9-bag compartment layout & saves 30% space',
      gapEsimName: (city) => `${city} Travel eSIM Data Plan`,
      gapEsimWhy: 'Zero weight · Activate before boarding',
      defaultPlugLabel: 'Universal',
      defaultRainLabel: 'Showers possible',
      defaultCityLabel: 'Multi-City',
    },
  },
  'en-GB': {
    clothingRules: {
      innerwearDisposable: 'Disposable daily base',
      innerwearCycle: 'Essentials cycle scaling',
      sleepSport: 'Sleep / workout cycle',
      midlayer: 'Mid-layer rotation',
      bottom: 'Trousers multi-day rotation',
      top: 'Daily tops rotation',
      proportional: 'Proportional to trip length',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `${days}-day trip (${cycle}-day laundry cycle)`,
      capsuleCycle: (days) => `${days}-day capsule cycle`,
      rotationDays: (qty, days) => `${qty} items rotated across ${days} days`,
    },
    carryOnShell: {
      backpack: (w) => `Cabin Rucksack (+${w})`,
      spinner20: (w) => `20" Cabin Case (+${w})`,
    },
    checkedShell: {
      case24: (w) => `24" Hold Case (+${w})`,
      case28: (w) => `28" Large Hold Case (+${w})`,
    },
    bagFallback: {
      carryOn: 'Cabin bag',
      checked: 'Hold bag',
      edc: 'Cabin Daypack',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Lithium batteries & passports are prohibited in hold luggage — move to cabin bag',
      carryOnOver: 'Cabin overweight: safe to move into hold luggage to free allowance',
      carryOnNear: 'Cabin nearing limit: move to hold bag for easier boarding',
      checkedNone: 'No hold allowance: move into cabin bag to fly without checked fees',
      checkedOver: 'Hold bag overweight: shift compact gear into spare cabin allowance',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Budget fare (0 hold luggage), yet ${wStr} remains inside your 6 hold cubes. Move gear to cabin bag or add hold baggage.`,
      bothOver: (overStr) =>
        `Both cabin bag and hold luggage exceed your airline limit by ${overStr} total. Trim spares and wear heavy coats or boots on board.`,
      carryOverWithSpace: (overStr, availStr) =>
        `Cabin bag exceeds limit by ${overStr}, while your hold luggage still has ${availStr} free. Shift heavy non-battery gear below.`,
      carryOverNoSpace: (overStr) =>
        `Cabin bag exceeds limit by ${overStr}. Wear your heaviest coat onto the flight or switch to a lighter pack.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `Hold case exceeds limit by ${overStr}, while cabin bag has ${availStr} spare. Move dense dry items into cabin bag.`,
      checkedOverNoSpace: (overStr) =>
        `Hold case exceeds limit by ${overStr}. Trim extra outfits or wear your heaviest coat and shoes on departure day.`,
      safetyDetected:
        'Total weight meets airline limits, but lithium batteries or passports were detected in hold luggage. Move them to cabin bag for security.',
      nearLimit85: (bufStr) =>
        `Weight has reached 85% of your airline allowance — keep at least ${bufStr} buffer for airport scale variance and return souvenirs.`,
      healthy: (bufStr) =>
        `Balanced load across cabin bag & hold luggage, with ${bufStr} spare allowance for return souvenirs.`,
    },
    alwaysPack: {
      defaultWhy: 'Always-pack travel essential',
      seedEssentialWhy: 'Always-pack travel essential',
    },
    affiliate: {
      airaloLabel: 'Get Travel eSIM (Airalo)',
      airaloSublabel: 'Instant QR activation · No roaming fees',
      klookCompareLabel: 'Compare on Klook',
      amazonLabel: 'Shop on Amazon',
      amazonOverlaySub: 'Travel-ready compact pick',
      klookGearLabel: 'Check Klook Travel Gear',
      klookGearSub: 'Airport pickup / bundles',
      taobaoLabel: 'Compare on Taobao',
      tipAdapter: (plug) => `Matches ${plug}`,
      tipEsim: 'Instant digital delivery',
      tipRain: 'Compact cabin fit',
      tipCube: 'Saves ~30% luggage space',
      tipPowerBank: 'Airline cabin-compliant (<100Wh)',
      tipScale: 'Avoid airport excess baggage fees',
      tipDefault: 'Travel-ready compact pick',
      gapAdapterName: (plug) => `${plug} GaN Travel Adaptor`,
      gapAdapterWhy: (plug) => `Destination socket: ${plug}`,
      gapUmbrellaName: 'Ultralight Compact Umbrella',
      gapUmbrellaWhy: (rain) => `Weather note: ${rain}`,
      gapCubesName: 'Compression Packing Cube Set',
      gapCubesWhy: 'Fits 9-bag compartment layout & saves 30% space',
      gapEsimName: (city) => `${city} Travel eSIM Data Plan`,
      gapEsimWhy: 'Zero weight · Activate before boarding',
      defaultPlugLabel: 'Universal',
      defaultRainLabel: 'Showers possible',
      defaultCityLabel: 'Multi-City',
    },
  },
  'es-MX': {
    clothingRules: {
      innerwearDisposable: 'Básico diario desechable',
      innerwearCycle: 'Ajuste por ciclo de ropa interior',
      sleepSport: 'Ciclo de pijama y deporte',
      midlayer: 'Rotación de capa media',
      bottom: 'Rotación de pantalones',
      top: 'Rotación diaria de playeras',
      proportional: 'Proporcional a los días del viaje',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `Viaje de ${days} días (lavado cada ${cycle} días)`,
      capsuleCycle: (days) => `Ciclo cápsula de ${days} días`,
      rotationDays: (qty, days) => `${qty} prendas para rotar ${days} días`,
    },
    carryOnShell: {
      backpack: (w) => `Mochila de cabina (+${w})`,
      spinner20: (w) => `Maleta 20" de mano (+${w})`,
    },
    checkedShell: {
      case24: (w) => `Maleta 24" documentada (+${w})`,
      case28: (w) => `Maleta grande 28" (+${w})`,
    },
    bagFallback: {
      carryOn: 'Equipaje de mano',
      checked: 'Equipaje documentado',
      edc: 'Mochila diaria',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Baterías de litio y documentos prohibidos al documentar: pásalos a mano',
      carryOnOver: 'Sobrepeso en cabina: muévelo al equipaje documentado',
      carryOnNear: 'Cerca del límite de mano: pásalo a documentar para abordar ligero',
      checkedNone: 'Sin equipaje documentado: pásalo a mano para evitar cargos',
      checkedOver: 'Sobrepeso al documentar: mueve artículos compactos a tu equipaje de mano',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Tarifa sin maleta documentada, pero aún hay ${wStr} en tus 6 bolsas para documentar. Pásalo a mano o agrega equipaje.`,
      bothOver: (overStr) =>
        `Tanto cabina como documentado exceden el límite por ${overStr} en total. Reduce extras y lleva puesto abrigo o botas.`,
      carryOverWithSpace: (overStr, availStr) =>
        `La maleta de mano excede por ${overStr}, y la documentada tiene ${availStr} libre. Mueve artículos pesados sin batería abajo.`,
      carryOverNoSpace: (overStr) =>
        `La maleta de mano excede por ${overStr}. Ponte la chamarra más pesada al abordar o usa una mochila más ligera.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `La maleta documentada excede por ${overStr}, pero en cabina sobran ${availStr}. Pasa objetos densos y secos a mano.`,
      checkedOverNoSpace: (overStr) =>
        `La maleta documentada excede por ${overStr}. Quita cambios extra o usa el abrigo y calzado más pesados el día del vuelo.`,
      safetyDetected:
        'El peso cumple límites, pero hay baterías de litio o pasaportes en documentado. Pásalos a equipaje de mano.',
      nearLimit85: (bufStr) =>
        `Peso al 85% del límite: deja al menos ${bufStr} de margen para básculas de aeropuerto y compras de regreso.`,
      healthy: (bufStr) =>
        `Carga equilibrada entre cabina y documentado, con ${bufStr} libres para recuerdos de regreso.`,
    },
    alwaysPack: {
      defaultWhy: 'Básico fijo de cada viaje',
      seedEssentialWhy: 'Esencial permanente de viaje',
    },
    affiliate: {
      airaloLabel: 'Obtener eSIM de viaje (Airalo)',
      airaloSublabel: 'QR instantáneo · Sin cargos de roaming',
      klookCompareLabel: 'Comparar en Klook',
      amazonLabel: 'Comprar en Amazon',
      amazonOverlaySub: 'Selección compacta para viaje',
      klookGearLabel: 'Ver equipo en Klook',
      klookGearSub: 'Recolección en aeropuerto / paquetes',
      taobaoLabel: 'Comparar en Taobao',
      tipAdapter: (plug) => `Compatible con ${plug}`,
      tipEsim: 'Entrega digital inmediata',
      tipRain: 'Tamaño compacto para cabina',
      tipCube: 'Ahorra ~30% de espacio en maleta',
      tipPowerBank: 'Apto para cabina (<100Wh)',
      tipScale: 'Evita cargos por exceso de equipaje',
      tipDefault: 'Opción compacta lista para viajar',
      gapAdapterName: (plug) => `Adaptador GaN universal (${plug})`,
      gapAdapterWhy: (plug) => `Enchufe de destino: ${plug}`,
      gapUmbrellaName: 'Paraguas plegable ultraligero',
      gapUmbrellaWhy: (rain) => `Pronóstico: ${rain}`,
      gapCubesName: 'Set de cubos de compresión',
      gapCubesWhy: 'Encaja en las 9 bolsas y ahorra 30% de espacio',
      gapEsimName: (city) => `Plan eSIM de datos para ${city}`,
      gapEsimWhy: 'Cero gramos · Activa antes de despegar',
      defaultPlugLabel: 'Universal',
      defaultRainLabel: 'Posibles lluvias',
      defaultCityLabel: 'Multi-ciudad',
    },
  },
  'fr-FR': {
    clothingRules: {
      innerwearDisposable: 'Sous-vêtements jetables par jour',
      innerwearCycle: 'Ajustement cycle sous-vêtements',
      sleepSport: 'Cycle nuit / sport',
      midlayer: 'Rotation couches intermédiaires',
      bottom: 'Rotation bas multi-jours',
      top: 'Rotation quotidienne des hauts',
      proportional: 'Proportionnel à la durée',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `Séjour de ${days} j (lessive tous les ${cycle} j)`,
      capsuleCycle: (days) => `Cycle capsule de ${days} jours`,
      rotationDays: (qty, days) => `${qty} pièces en rotation sur ${days} jours`,
    },
    carryOnShell: {
      backpack: (w) => `Sac à dos cabine (+${w})`,
      spinner20: (w) => `Valise cabine 20" (+${w})`,
    },
    checkedShell: {
      case24: (w) => `Valise soute 24" (+${w})`,
      case28: (w) => `Grande valise 28" (+${w})`,
    },
    bagFallback: {
      carryOn: 'Bagage cabine',
      checked: 'Bagage soute',
      edc: 'Sac quotidien',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Batteries lithium et papiers interdits en soute — déplacez en cabine',
      carryOnOver: 'Excès cabine : transférez en soute pour libérer du poids',
      carryOnNear: 'Cabine proche du seuil : passez en soute pour embarquer léger',
      checkedNone: 'Aucun bagage soute inclus : passez en cabine sans frais',
      checkedOver: 'Excès soute : glissez les objets compacts dans votre marge cabine',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Tarif sans soute (0 kg), mais ${wStr} restent dans vos 6 pochettes soute. Passez-les en cabine ou ajoutez un bagage.`,
      bothOver: (overStr) =>
        `Cabine et soute dépassent la limite de ${overStr} au total. Allégez les rechanges et portez manteau ou bottes.`,
      carryOverWithSpace: (overStr, availStr) =>
        `La cabine dépasse de ${overStr}, alors que la soute garde ${availStr} libres. Déplacez les objets lourds sans batterie.`,
      carryOverNoSpace: (overStr) =>
        `La cabine dépasse de ${overStr}. Portez votre veste la plus lourde à bord ou optez pour un sac plus léger.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `La soute dépasse de ${overStr}, mais il reste ${availStr} en cabine. Déplacez des articles denses sans liquide.`,
      checkedOverNoSpace: (overStr) =>
        `La soute dépasse de ${overStr}. Réduisez les tenues ou portez manteau et chaussures lourds le jour du départ.`,
      safetyDetected:
        'Poids conforme, mais des batteries lithium ou passeports sont en soute. Remettez-les en cabine avant le contrôle.',
      nearLimit85: (bufStr) =>
        `Poids à 85 % de la franchise — gardez au moins ${bufStr} de marge pour les balances et souvenirs.`,
      healthy: (bufStr) =>
        `Répartition équilibrée cabine & soute, avec ${bufStr} de marge pour vos souvenirs de retour.`,
    },
    alwaysPack: {
      defaultWhy: 'Indispensable permanent de voyage',
      seedEssentialWhy: 'Indispensable à emporter à chaque voyage',
    },
    affiliate: {
      airaloLabel: 'Obtenir une eSIM voyage (Airalo)',
      airaloSublabel: 'Activation QR instantanée · Zéro frais',
      klookCompareLabel: 'Comparer sur Klook',
      amazonLabel: 'Voir sur Amazon',
      amazonOverlaySub: 'Format compact spécial voyage',
      klookGearLabel: 'Équipement sur Klook',
      klookGearSub: 'Retrait aéroport / packs',
      taobaoLabel: 'Comparer sur Taobao',
      tipAdapter: (plug) => `Compatible ${plug}`,
      tipEsim: 'Livraison numérique immédiate',
      tipRain: 'Format compact cabine',
      tipCube: 'Économise ~30 % d’espace valise',
      tipPowerBank: 'Conforme avion (<100Wh)',
      tipScale: 'Évite les frais d’excédent bagage',
      tipDefault: 'Modèle compact pensé pour voyager',
      gapAdapterName: (plug) => `Adaptateur universel GaN (${plug})`,
      gapAdapterWhy: (plug) => `Prise à destination : ${plug}`,
      gapUmbrellaName: 'Parapluie pliant ultraléger',
      gapUmbrellaWhy: (rain) => `Météo : ${rain}`,
      gapCubesName: 'Set de cubes de compression',
      gapCubesWhy: 'Adapté aux 9 compartiments · +30 % d’espace',
      gapEsimName: (city) => `Forfait eSIM ${city}`,
      gapEsimWhy: 'Zéro gramme · Activez avant le décollage',
      defaultPlugLabel: 'Universel',
      defaultRainLabel: 'Averses possibles',
      defaultCityLabel: 'Multi-villes',
    },
  },
  'de-DE': {
    clothingRules: {
      innerwearDisposable: 'Einweg-Basisteile pro Tag',
      innerwearCycle: 'Wäschezyklus-Skalierung',
      sleepSport: 'Schlaf- / Sportzyklus',
      midlayer: 'Midlayer-Rotation',
      bottom: 'Hosen-Mehrtagesrotation',
      top: 'Tägliche Oberteil-Rotation',
      proportional: 'Proportional zur Reisedauer',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `${days}-Tage-Reise (${cycle}-Tage-Waschzyklus)`,
      capsuleCycle: (days) => `${days}-Tage-Capsule-Zyklus`,
      rotationDays: (qty, days) => `${qty} Teile für ${days} Tage im Wechsel`,
    },
    carryOnShell: {
      backpack: (w) => `Handgepäck-Rucksack (+${w})`,
      spinner20: (w) => `20" Kabinen-Trolley (+${w})`,
    },
    checkedShell: {
      case24: (w) => `24" Koffer mittel (+${w})`,
      case28: (w) => `28" Koffer groß (+${w})`,
    },
    bagFallback: {
      carryOn: 'Handgepäck',
      checked: 'Aufgabegepäck',
      edc: 'Tagesrucksack',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Lithium-Akkus & Pässe gehören nicht in den Frachtraum — ab ins Handgepäck',
      carryOnOver: 'Handgepäck zu schwer: sicher ins Aufgabegepäck verlagern',
      carryOnNear: 'Handgepäck fast voll: für leichteres Boarding aufgeben',
      checkedNone: 'Kein Aufgabegepäck inklusive: ins Handgepäck verschieben',
      checkedOver: 'Aufgabegepäck zu schwer: kompakte Teile ins Handgepäck legen',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Basistarif ohne Aufgabegepäck, doch ${wStr} liegen noch in den 6 Aufgabe-Fächern. Ins Handgepäck verlagern oder Gepäck dazubuchen.`,
      bothOver: (overStr) =>
        `Hand- und Aufgabegepäck überschreiten das Limit um insgesamt ${overStr}. Reserven streichen und Jacke/Stiefel anziehen.`,
      carryOverWithSpace: (overStr, availStr) =>
        `Handgepäck liegt ${overStr} über dem Limit, Aufgabegepäck hat noch ${availStr} frei. Schwere Teile ohne Akku nach unten legen.`,
      carryOverNoSpace: (overStr) =>
        `Handgepäck liegt ${overStr} drüber. Schwerste Jacke beim Einsteigen anziehen oder leichteren Rucksack wählen.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `Aufgabegepäck liegt ${overStr} drüber, Handgepäck hat ${availStr} Luft. Dichte, trockene Teile ins Handgepäck verlagern.`,
      checkedOverNoSpace: (overStr) =>
        `Aufgabegepäck liegt ${overStr} drüber. Outfits reduzieren oder schwerste Jacke und Schuhe am Abflugtag tragen.`,
      safetyDetected:
        'Gewicht im Limit, aber Lithium-Akkus oder Pässe wurden im Aufgabegepäck erkannt. Für die Sicherheitskontrolle ins Handgepäck legen.',
      nearLimit85: (bufStr) =>
        `85 % des Freigepäcks erreicht — mindestens ${bufStr} Puffer für Flughafenwaagen und Souvenirs freihalten.`,
      healthy: (bufStr) =>
        `Ausgewogene Verteilung zwischen Hand- & Aufgabegepäck mit ${bufStr} Spielraum für Mitbringsel.`,
    },
    alwaysPack: {
      defaultWhy: 'Fester Reise-Standardartikel',
      seedEssentialWhy: 'Immer-dabei-Reiseessenzial',
    },
    affiliate: {
      airaloLabel: 'Reise-eSIM holen (Airalo)',
      airaloSublabel: 'Sofort per QR · Keine Roaminggebühren',
      klookCompareLabel: 'Auf Klook vergleichen',
      amazonLabel: 'Bei Amazon ansehen',
      amazonOverlaySub: 'Kompakte Reiseempfehlung',
      klookGearLabel: 'Klook Reisezubehör',
      klookGearSub: 'Flughafenabholung / Pakete',
      taobaoLabel: 'Bei Taobao vergleichen',
      tipAdapter: (plug) => `Passend für ${plug}`,
      tipEsim: 'Sofortige digitale Aktivierung',
      tipRain: 'Kompakt für die Kabine',
      tipCube: 'Spart ca. 30 % Koffervolumen',
      tipPowerBank: 'Flugzeugzugelassen (<100Wh)',
      tipScale: 'Vermeidet Übergepäckgebühren',
      tipDefault: 'Kompakt & reisetauglich',
      gapAdapterName: (plug) => `GaN-Reiseadapter (${plug})`,
      gapAdapterWhy: (plug) => `Steckertyp am Ziel: ${plug}`,
      gapUmbrellaName: 'Ultraleichter Taschenschirm',
      gapUmbrellaWhy: (rain) => `Wetterhinweis: ${rain}`,
      gapCubesName: 'Kompressions-Packwürfel-Set',
      gapCubesWhy: 'Passt ins 9-Taschen-System & spart 30 % Platz',
      gapEsimName: (city) => `${city} Reise-eSIM Datentarif`,
      gapEsimWhy: '0 Gramm · Vor dem Abflug aktivieren',
      defaultPlugLabel: 'Universal',
      defaultRainLabel: 'Schauer möglich',
      defaultCityLabel: 'Mehrere Städte',
    },
  },
  'pt-BR': {
    clothingRules: {
      innerwearDisposable: 'Peças descartáveis por dia',
      innerwearCycle: 'Escala pelo ciclo de troca',
      sleepSport: 'Ciclo pijama / treino',
      midlayer: 'Rotação de camada média',
      bottom: 'Rotação de calças e saias',
      top: 'Rotação diária de blusas',
      proportional: 'Proporcional aos dias da viagem',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `Viagem de ${days} dias (lavagem a cada ${cycle} dias)`,
      capsuleCycle: (days) => `Ciclo cápsula de ${days} dias`,
      rotationDays: (qty, days) => `${qty} peças em rotação por ${days} dias`,
    },
    carryOnShell: {
      backpack: (w) => `Mochila de bordo (+${w})`,
      spinner20: (w) => `Mala 20" de mão (+${w})`,
    },
    checkedShell: {
      case24: (w) => `Mala 24" despachada (+${w})`,
      case28: (w) => `Mala grande 28" (+${w})`,
    },
    bagFallback: {
      carryOn: 'Bagagem de mão',
      checked: 'Mala despachada',
      edc: 'Mochila diária',
    },
    rebalanceReasons: {
      safetyCarryOn: 'Baterias de lítio e documentos são proibidos no despacho — leve na mão',
      carryOnOver: 'Excesso na cabine: mova para a mala despachada',
      carryOnNear: 'Cabine perto do limite: transfira para embarcar mais leve',
      checkedNone: 'Sem bagagem despachada: mova para a mão para evitar taxas',
      checkedOver: 'Mala despachada acima do limite: leve itens compactos na mão',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `Tarifa sem mala despachada (0 kg), mas ainda há ${wStr} nos 6 cubos de despacho. Mova para bordo ou compre franquia.`,
      bothOver: (overStr) =>
        `Bagagem de mão e despachada excedem o limite em ${overStr} no total. Reduza extras e vista casaco ou bota no voo.`,
      carryOverWithSpace: (overStr, availStr) =>
        `A bagagem de mão excede em ${overStr}, enquanto a despachada ainda tem ${availStr} livres. Transfira itens pesados sem bateria.`,
      carryOverNoSpace: (overStr) =>
        `A bagagem de mão excede em ${overStr}. Vista o casaco mais pesado ao embarcar ou use mochila mais leve.`,
      checkedOverWithSpace: (overStr, availStr) =>
        `A mala despachada excede em ${overStr}, mas há ${availStr} livres na mão. Passe itens densos e secos para bordo.`,
      checkedOverNoSpace: (overStr) =>
        `A mala despachada excede em ${overStr}. Reduza trocas ou use o casaco e calçado mais pesados no dia do embarque.`,
      safetyDetected:
        'Peso dentro do limite, mas há baterias de lítio ou passaportes na mala despachada. Mova para a bagagem de mão.',
      nearLimit85: (bufStr) =>
        `Peso em 85% do limite — reserve pelo menos ${bufStr} para diferenças de balança e lembranças na volta.`,
      healthy: (bufStr) =>
        `Peso equilibrado entre bordo e despacho, com ${bufStr} de folga para compras de retorno.`,
    },
    alwaysPack: {
      defaultWhy: 'Item essencial fixo de viagem',
      seedEssentialWhy: 'Essencial de todas as viagens',
    },
    affiliate: {
      airaloLabel: 'Comprar eSIM de viagem (Airalo)',
      airaloSublabel: 'QR instantâneo · Sem tarifa de roaming',
      klookCompareLabel: 'Comparar na Klook',
      amazonLabel: 'Ver na Amazon',
      amazonOverlaySub: 'Escolha compacta para viagem',
      klookGearLabel: 'Ver itens na Klook',
      klookGearSub: 'Retirada no aeroporto / kits',
      taobaoLabel: 'Comparar no Taobao',
      tipAdapter: (plug) => `Compatível com ${plug}`,
      tipEsim: 'Entrega digital imediata',
      tipRain: 'Compacto para bagagem de mão',
      tipCube: 'Economiza ~30% do espaço na mala',
      tipPowerBank: 'Permitido na cabine (<100Wh)',
      tipScale: 'Evita taxas de excesso no check-in',
      tipDefault: 'Modelo compacto e leve',
      gapAdapterName: (plug) => `Adaptador universal GaN (${plug})`,
      gapAdapterWhy: (plug) => `Tomada no destino: ${plug}`,
      gapUmbrellaName: 'Guarda-chuva dobrável ultraleve',
      gapUmbrellaWhy: (rain) => `Previsão: ${rain}`,
      gapCubesName: 'Kit de cubos organizadores compactos',
      gapCubesWhy: 'Encaixa nas 9 divisões e economiza 30% de espaço',
      gapEsimName: (city) => `Plano de dados eSIM (${city})`,
      gapEsimWhy: 'Zero peso · Ative antes de embarcar',
      defaultPlugLabel: 'Universal',
      defaultRainLabel: 'Pancadas de chuva possíveis',
      defaultCityLabel: 'Várias cidades',
    },
  },
  'ja-JP': {
    clothingRules: {
      innerwearDisposable: '使い捨てインナー日数換算',
      innerwearCycle: 'インナー洗濯サイクル換算',
      sleepSport: '部屋着・スポーツ着ローテ',
      midlayer: '防寒ミドルレイヤー調整',
      bottom: 'ボトムス複数日ローテ',
      top: '日常トップス着回し調整',
      proportional: '旅行日数に応じて比例調整',
    },
    syncDayWhy: {
      laundryCycle: (days, cycle) => `${days}日間の旅（${cycle}日ごとの洗濯サイクル）に合わせて調整`,
      capsuleCycle: (days) => `${days}日間のカプセルワードローブ構成`,
      rotationDays: (qty, days) => `${qty}着を着回して${days}日間に対応`,
    },
    carryOnShell: {
      backpack: (w) => `機内持ち込みリュック (+${w})`,
      spinner20: (w) => `20インチ機内ケース (+${w})`,
    },
    checkedShell: {
      case24: (w) => `24インチ預け荷物 (+${w})`,
      case28: (w) => `28インチ大型ケース (+${w})`,
    },
    bagFallback: {
      carryOn: '機内持ち込み',
      checked: '預け荷物',
      edc: 'デイパック',
    },
    rebalanceReasons: {
      safetyCarryOn: 'リチウム電池・貴重書類は預け入れ禁止。機内持ち込みへ移動してください',
      carryOnOver: '機内持ち込みが重量超過。電池以外の重い物を預け荷物へ',
      carryOnNear: '機内上限間近。預け荷物に移して搭乗を身軽に',
      checkedNone: '無料預け枠なし：機内持ち込みへ統合して追加料金を回避',
      checkedOver: '預け荷物が重量超過：軽い機内持ち込み枠へ分散しましょう',
    },
    weightForecastAdvice: {
      zeroChecked: (wStr) =>
        `預け荷物なしプラン（0kg）ですが、預け用6ポーチに ${wStr} 残っています。機内持ち込みへ移すか枠を追加してください。`,
      bothOver: (overStr) =>
        `機内・預け荷物ともに規定を合計 ${overStr} 超過しています。予備を減らし、重いアウターや靴は当日着用しましょう。`,
      carryOverWithSpace: (overStr, availStr) =>
        `機内持ち込みが ${overStr} 超過していますが、預け枠に ${availStr} の余裕があります。電池以外の重い物を移せます。`,
      carryOverNoSpace: (overStr) =>
        `機内持ち込みが ${overStr} 超過しています。厚手の上着を着用して搭乗するか、軽量リュックへ切り替えてください。`,
      checkedOverWithSpace: (overStr, availStr) =>
        `預け荷物が ${overStr} 超過していますが、機内枠に ${availStr} の余裕があります。液体以外の高密度な物を移動できます。`,
      checkedOverNoSpace: (overStr) =>
        `預け荷物が ${overStr} 超過しています。着替えを減らすか、重いジャケットと靴を搭乗当日に着用してください。`,
      safetyDetected:
        '総重量は規定内ですが、預け荷物にリチウム電池やパスポートが含まれています。検査回避のため機内持ち込みへ移してください。',
      nearLimit85: (bufStr) =>
        `航空会社の無料許容量の 85% に達しています。空港計量誤差や帰国時のお土産用に最低 ${bufStr} の余白を確保しましょう。`,
      healthy: (bufStr) =>
        `機内・預け荷物の配分が適正です。帰りのお土産用に計 ${bufStr} の余裕があります。`,
    },
    alwaysPack: {
      defaultWhy: '毎回の定番必需品',
      seedEssentialWhy: '旅行ごとの定番必携アイテム',
    },
    affiliate: {
      airaloLabel: '海外eSIMを購入 (Airalo)',
      airaloSublabel: 'QR即時開通・SIM差し替え不要',
      klookCompareLabel: 'Klook で比較',
      amazonLabel: 'Amazon で探す',
      amazonOverlaySub: '厳選トラベルギア',
      klookGearLabel: 'Klook 旅行グッズ',
      klookGearSub: '空港受取・セット割引',
      taobaoLabel: 'Taobao で比較',
      tipAdapter: (plug) => `渡航先プラグ (${plug}) に対応`,
      tipEsim: 'オンライン即時発行で待ち時間なし',
      tipRain: '軽量折りたたみで機内枠を圧迫しない',
      tipCube: '圧縮収納でスーツケース容量を約30%節約',
      tipPowerBank: '機内持ち込み安全基準 (<100Wh) 準拠',
      tipScale: '空港の超過料金対策に必須',
      tipDefault: '軽量コンパクトな旅行向け仕様',
      gapAdapterName: (plug) => `多機能 GaN 変換プラグ (${plug})`,
      gapAdapterWhy: (plug) => `現地のコンセント規格：${plug}`,
      gapUmbrellaName: '超軽量 晴雨兼用折りたたみ傘',
      gapUmbrellaWhy: (rain) => `天気メモ：${rain}`,
      gapCubesName: '超軽量 圧縮トラベルポーチセット',
      gapCubesWhy: '9ポーチ収納に最適化・容量約30%アップ',
      gapEsimName: (city) => `${city} 高速データ eSIM プラン`,
      gapEsimWhy: '重量 0g・出発前に開通可能',
      defaultPlugLabel: 'マルチ変換',
      defaultRainLabel: 'にわか雨の可能性',
      defaultCityLabel: '周遊',
    },
  },
};

export function getPackingUtilsCopy(lang: AppLanguage): PackingUtilsCopy {
  return pickLang(lang, PACKING_UTILS_COPY);
}

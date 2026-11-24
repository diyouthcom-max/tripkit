import type { AppLanguage, StopType } from '../../types';
import type { TransportMode } from '../../utils/geoRouteHelpers';
import { pickLang } from '../langHelper';

export interface ItineraryUtilsCopy {
  destinationFallback: string;
  driverFallback: {
    parisPronunciation: string;
    parisTip: string;
    parisLangLabel: (city: string) => string;
    amsterdamPronunciation: string;
    amsterdamTip: string;
    amsterdamLangLabel: (city: string) => string;
    japanPronunciation: string;
    japanTip: string;
    japanLangLabel: (city: string) => string;
    genericPronunciation: string;
    genericTip: string;
    genericLangLabel: (city: string) => string;
  };
  transportModes: Record<TransportMode, string>;
  autocomplete: {
    lookupError: string;
    clearInput: string;
    missingApiKeyBefore: string;
    missingApiKeyAfter: string;
    searchOnMaps: (query: string) => string;
    useTypedNameBtn: string;
    unverifiedPlaceNote: string;
  };
  nodeCard: {
    defaultDistrict: string;
    defaultTransitNote: string;
    editStopTitle: string;
    cancel: string;
    arrivalLabel: string;
    stayDurationLabel: string;
    closesAtLabel: string;
    stopTypeLabel: string;
    estSpendLabel: (currencyCode: string) => string;
    stopNamePlaceholder: string;
    districtPlaceholder: string;
    streetAddressPlaceholder: string;
    transitNotePlaceholder: string;
    meetupAnchorCheckbox: string;
    outdoorStopCheckbox: string;
    rainTitlePlaceholder: string;
    rainDistrictPlaceholder: string;
    rainAddressPlaceholder: string;
    deleteStop: string;
    saveChanges: string;
    swipeUndo: string;
    swipeDone: string;
    swipeEdit: string;
    swipeDelete: string;
    thumbTitle: string;
    visitedBadge: string;
    dragAria: (stopNumber: number) => string;
    dragTitle: string;
    visitedUndoTitle: string;
    markVisitedTitle: string;
    wasOrder: (prevOrder: number) => string;
    rainBackupBadge: string;
    moveUp: string;
    moveDown: string;
    editStop: string;
    deleteStopTip: string;
    details: string;
    meetupAnchorBadge: string;
    loggedAmount: (sym: string, amount: string) => string;
    freeEntry: string;
    estAmount: (sym: string, amount: string) => string;
    ticketsCount: (count: number) => string;
    closesPrefix: string;
    urgencyAdvice: (label: string) => string;
  };
}

export function getItineraryUtilsCopy(lang: AppLanguage | string): ItineraryUtilsCopy {
  return pickLang<ItineraryUtilsCopy>(lang, {
    'zh-CN': {
      destinationFallback: '目的地',
      driverFallback: {
        parisPronunciation:
          'Bonjour (蹦如喝) · S’il vous plaît (西尔屋普莱，意为“麻烦请带我去这个地址”)',
        parisTip:
          '上车先说一声 Bonjour 非常加分；巴黎正规出租车（Taxi Parisien）支持刷卡，核对门牌与邮编（如 75004）最稳妥。',
        parisLangLabel: (city) => `${city} · 法语打车卡`,
        amsterdamPronunciation:
          'Goedendag (胡登达赫，您好) · Alstublieft (阿尔斯图布利夫特，请)',
        amsterdamTip:
          '阿姆斯特丹运河街区多单行道，司机可能会在距离门口步行 1–2 分钟的桥头安全靠边，支持直接刷信用卡。',
        amsterdamLangLabel: (city) => `${city} · 荷兰语/英语打车卡`,
        japanPronunciation:
          'Sumimasen, kochira no jūsho made onegaishimasu（麻烦请送我到这个地址）',
        japanTip: '日本出租车后排车门为自动开关，上下车请勿手拉车门。',
        japanLangLabel: (city) => `${city} · 日语打车卡`,
        genericPronunciation: 'Could you please take me to this address?（请送我到这个地址）',
        genericTip: '请直接将屏幕上的详细街道地址出示给司机核对导航。',
        genericLangLabel: (city) => `${city} · 出行问路卡`,
      },
      transportModes: {
        walk: '步行漫游',
        metro: '地铁 / 电车',
        train: '高铁 / 快线',
        boat: '游船航线',
        car: '专车 / 巴士',
        plane: '航空飞行',
      },
      autocomplete: {
        lookupError:
          'Google 地点联想暂未连通（请检查网络或确认 Google Cloud 已开启 Places API (New)），可直接手动输入。',
        clearInput: '清空输入',
        missingApiKeyBefore: '当前未检测到环境变量',
        missingApiKeyAfter: '，实时地址联想未开启（仍可正常手动输入并跳转 Google 地图）。',
        searchOnMaps: (q) => `在 Google 地图中搜索「${q.slice(0, 14)}」定位`,
        useTypedNameBtn: '仍用此名称',
        unverifiedPlaceNote: '未验证地点 · 不含地图坐标',
      },
      nodeCard: {
        defaultDistrict: '市中心',
        defaultTransitNote: '步行或公共交通前往',
        editStopTitle: '编辑行程站点',
        cancel: '取消',
        arrivalLabel: '到达时间',
        stayDurationLabel: '预计停留',
        closesAtLabel: '打烊时间',
        stopTypeLabel: '节点类型',
        estSpendLabel: (c) => `预估消费 (${c})`,
        stopNamePlaceholder: '站点名称（如：奥赛博物馆、花神咖啡）',
        districtPlaceholder: '所属街区（如：Saint-Germain · 6e）',
        streetAddressPlaceholder: '详细街道地址（方便打车与复制）',
        transitNotePlaceholder: '交通衔接备注（如：地铁 1 号线直达 12 分钟）',
        meetupAnchorCheckbox: '设为晚间汇合锚点（同步更新「同行」页汇合点）',
        outdoorStopCheckbox: '露天/户外站点（可配置室内防雨备选）',
        rainTitlePlaceholder: '雨天室内备选名称',
        rainDistrictPlaceholder: '备选街区',
        rainAddressPlaceholder: '备选地址',
        deleteStop: '删除站点',
        saveChanges: '保存站点修改',
        swipeUndo: '取消打卡',
        swipeDone: '打卡',
        swipeEdit: '修改',
        swipeDelete: '删除',
        thumbTitle: '查看实景大图、7天营业时间与本站票夹',
        visitedBadge: '已到访 ✓',
        dragAria: (n) => `拖拽或按空格键调整第 ${n} 站顺序`,
        dragTitle: '按住上下拖拽调整站点顺序',
        visitedUndoTitle: '已到访（点击撤销）',
        markVisitedTitle: '标记为已到访',
        wasOrder: (n) => `· 原第 ${n} 站`,
        rainBackupBadge: '· 室内防雨替代',
        moveUp: '上移一站',
        moveDown: '下移一站',
        editStop: '编辑此站',
        deleteStopTip: '删除此站',
        details: '详情',
        meetupAnchorBadge: '· 晚间汇合点',
        loggedAmount: (s, a) => `已入账 ${s}${a}`,
        freeEntry: '免费入场',
        estAmount: (s, a) => `预估 ${s}${a}`,
        ticketsCount: (c) => `${c} 张凭证`,
        closesPrefix: '营业至 ',
        urgencyAdvice: (l) => `${l}，建议提前出发或调整顺序。`,
      },
    },
    'en-US': {
      destinationFallback: 'Destination',
      driverFallback: {
        parisPronunciation:
          'bon-ZHOOR · seel voo PLEH ("Hello, please take me to this address")',
        parisTip:
          'Greeting the driver with "Bonjour" is customary in France. Licensed Taxi Parisien cabs accept cards; confirm the street number and postcode (e.g. 75004).',
        parisLangLabel: (city) => `${city} · French Taxi Card`,
        amsterdamPronunciation: 'KHOO-den-dahkh (Hello) · ahl-stew-BLEEFT (Please)',
        amsterdamTip:
          'Amsterdam canals have many one-way streets, so drivers may stop safely at the nearest bridge (1–2 min walk). Card & contactless payments are widely accepted.',
        amsterdamLangLabel: (city) => `${city} · Dutch/EN Taxi Card`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no jū-sho ma-de o-ne-gai-shi-ma-su',
        japanTip:
          'Japanese taxi rear doors open and close automatically — do not pull or push the door handle manually.',
        japanLangLabel: (city) => `${city} · Japanese Taxi Card`,
        genericPronunciation:
          'Show this screen clearly to your driver so they can check the street address on their sat-nav.',
        genericTip:
          'Point directly to the street address above so the driver can verify the destination.',
        genericLangLabel: (city) => `${city} · Driver Direction Card`,
      },
      transportModes: {
        walk: 'Walk',
        metro: 'Metro / Tram',
        train: 'High-Speed Rail',
        boat: 'Canal Cruise',
        car: 'Taxi / Car',
        plane: 'Flight',
      },
      autocomplete: {
        lookupError:
          'Google Places autocomplete is unavailable (check network or Places API (New)). You can still type manually.',
        clearInput: 'Clear input',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'is not configured, so live place suggestions are off (manual input and Google Maps links still work).',
        searchOnMaps: (q) => `Search "${q.slice(0, 18)}" on Google Maps`,
        useTypedNameBtn: 'Use this name anyway',
        unverifiedPlaceNote: 'Unverified place · no map coordinates',
      },
      nodeCard: {
        defaultDistrict: 'City Center',
        defaultTransitNote: 'Walk or take public transit',
        editStopTitle: 'Edit Itinerary Stop',
        cancel: 'Cancel',
        arrivalLabel: 'Arrival',
        stayDurationLabel: 'Stay Duration',
        closesAtLabel: 'Closes At',
        stopTypeLabel: 'Stop Type',
        estSpendLabel: (c) => `Est. Spend (${c})`,
        stopNamePlaceholder: 'Stop name (e.g., Musée d’Orsay, Café de Flore)',
        districtPlaceholder: 'District / Neighborhood (e.g., Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Street address (for easy taxi & clipboard copy)',
        transitNotePlaceholder: 'Transit / description note (e.g., Metro Line 1 direct, 12 mins)',
        meetupAnchorCheckbox: 'Set as evening meetup anchor (syncs meetup point)',
        outdoorStopCheckbox: 'Outdoor stop (supports indoor rain backup)',
        rainTitlePlaceholder: 'Rainy-day indoor backup name',
        rainDistrictPlaceholder: 'Backup area',
        rainAddressPlaceholder: 'Backup address',
        deleteStop: 'Delete Stop',
        saveChanges: 'Save Changes',
        swipeUndo: 'Undo',
        swipeDone: 'Done',
        swipeEdit: 'Edit',
        swipeDelete: 'Delete',
        thumbTitle: 'Open live photos, opening hours & ticket wallet',
        visitedBadge: 'Visited ✓',
        dragAria: (n) => `Drag or press Space to reorder stop ${n}`,
        dragTitle: 'Hold & drag to reorder stop',
        visitedUndoTitle: 'Visited (tap to undo)',
        markVisitedTitle: 'Mark as visited',
        wasOrder: (n) => `· Was #${n}`,
        rainBackupBadge: '· Rain Backup',
        moveUp: 'Move up',
        moveDown: 'Move down',
        editStop: 'Edit stop',
        deleteStopTip: 'Delete stop',
        details: 'Details',
        meetupAnchorBadge: '· Meetup Anchor',
        loggedAmount: (s, a) => `Logged ${s}${a}`,
        freeEntry: 'Free entry',
        estAmount: (s, a) => `Est. ${s}${a}`,
        ticketsCount: (c) => `${c} Ticket${c > 1 ? 's' : ''}`,
        closesPrefix: 'Closes ',
        urgencyAdvice: (l) => `${l} — consider leaving earlier or reordering.`,
      },
    },
    'en-GB': {
      destinationFallback: 'Destination',
      driverFallback: {
        parisPronunciation:
          'bon-ZHOOR · seel voo PLEH ("Hello, please take me to this address")',
        parisTip:
          'Greeting the driver with "Bonjour" is customary in France. Licensed Taxi Parisien cabs accept cards; confirm the street number and postcode (e.g. 75004).',
        parisLangLabel: (city) => `${city} · French Taxi Card`,
        amsterdamPronunciation: 'KHOO-den-dahkh (Hello) · ahl-stew-BLEEFT (Please)',
        amsterdamTip:
          'Amsterdam canals have many one-way streets, so drivers may stop safely at the nearest bridge (1–2 min walk). Card & contactless payments are widely accepted.',
        amsterdamLangLabel: (city) => `${city} · Dutch/EN Taxi Card`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no jū-sho ma-de o-ne-gai-shi-ma-su',
        japanTip:
          'Japanese taxi rear doors open and close automatically — do not pull or push the door handle manually.',
        japanLangLabel: (city) => `${city} · Japanese Taxi Card`,
        genericPronunciation:
          'Show this screen clearly to your driver so they can check the street address on their sat-nav.',
        genericTip:
          'Point directly to the street address above so the driver can verify the destination.',
        genericLangLabel: (city) => `${city} · Driver Direction Card`,
      },
      transportModes: {
        walk: 'Walk',
        metro: 'Metro / Tram',
        train: 'High-Speed Rail',
        boat: 'Canal Cruise',
        car: 'Taxi / Car',
        plane: 'Flight',
      },
      autocomplete: {
        lookupError:
          'Google Places autocomplete is unavailable (check network or Places API (New)). You can still type manually.',
        clearInput: 'Clear input',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'is not configured, so live place suggestions are off (manual input and Google Maps links still work).',
        searchOnMaps: (q) => `Search "${q.slice(0, 18)}" on Google Maps`,
        useTypedNameBtn: 'Use this name anyway',
        unverifiedPlaceNote: 'Unverified place · no map coordinates',
      },
      nodeCard: {
        defaultDistrict: 'City Centre',
        defaultTransitNote: 'Walk or take public transport',
        editStopTitle: 'Edit Itinerary Stop',
        cancel: 'Cancel',
        arrivalLabel: 'Arrival',
        stayDurationLabel: 'Stay Duration',
        closesAtLabel: 'Closes At',
        stopTypeLabel: 'Stop Type',
        estSpendLabel: (c) => `Est. Spend (${c})`,
        stopNamePlaceholder: 'Stop name (e.g., Musée d’Orsay, Café de Flore)',
        districtPlaceholder: 'Area / Neighbourhood (e.g., Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Street address (for easy taxi & clipboard copy)',
        transitNotePlaceholder: 'Transit / description note (e.g., Metro Line 1 direct, 12 mins)',
        meetupAnchorCheckbox: 'Set as evening meetup anchor (syncs meetup point)',
        outdoorStopCheckbox: 'Outdoor stop (supports indoor rain backup)',
        rainTitlePlaceholder: 'Rainy-day indoor backup name',
        rainDistrictPlaceholder: 'Backup area',
        rainAddressPlaceholder: 'Backup address',
        deleteStop: 'Delete Stop',
        saveChanges: 'Save Changes',
        swipeUndo: 'Undo',
        swipeDone: 'Done',
        swipeEdit: 'Edit',
        swipeDelete: 'Delete',
        thumbTitle: 'Open live photos, opening hours & ticket wallet',
        visitedBadge: 'Visited ✓',
        dragAria: (n) => `Drag or press Space to reorder stop ${n}`,
        dragTitle: 'Hold & drag to reorder stop',
        visitedUndoTitle: 'Visited (tap to undo)',
        markVisitedTitle: 'Mark as visited',
        wasOrder: (n) => `· Was #${n}`,
        rainBackupBadge: '· Rain Backup',
        moveUp: 'Move up',
        moveDown: 'Move down',
        editStop: 'Edit stop',
        deleteStopTip: 'Delete stop',
        details: 'Details',
        meetupAnchorBadge: '· Meetup Anchor',
        loggedAmount: (s, a) => `Logged ${s}${a}`,
        freeEntry: 'Free entry',
        estAmount: (s, a) => `Est. ${s}${a}`,
        ticketsCount: (c) => `${c} Ticket${c > 1 ? 's' : ''}`,
        closesPrefix: 'Closes ',
        urgencyAdvice: (l) => `${l} — consider leaving earlier or reordering.`,
      },
    },
    'es-MX': {
      destinationFallback: 'Destino',
      driverFallback: {
        parisPronunciation:
          'bon-YUR · sil vu PLE ("Hola, por favor lléveme a esta dirección")',
        parisTip:
          'Saludar al chofer con "Bonjour" es costumbre en Francia. Los taxis oficiales aceptan tarjeta; confirma número y código postal (ej. 75004).',
        parisLangLabel: (city) => `${city} · Tarjeta de taxi (FR)`,
        amsterdamPronunciation: 'JU-den-daj (Hola) · al-stu-BLIFT (Por favor)',
        amsterdamTip:
          'Los canales de Ámsterdam tienen muchas calles de un solo sentido; el chofer puede dejarte en el puente más cercano (1-2 min a pie).',
        amsterdamLangLabel: (city) => `${city} · Tarjeta de taxi (NL/EN)`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no yu-sho ma-de o-ne-gai-shi-ma-su',
        japanTip:
          'Las puertas traseras de los taxis en Japón se abren y cierran solas; no las jales ni empujes manualmente.',
        japanLangLabel: (city) => `${city} · Tarjeta de taxi (JP)`,
        genericPronunciation:
          'Muestra esta pantalla claramente al conductor para que verifique la dirección en su GPS.',
        genericTip:
          'Señala directamente la dirección de arriba para que el chofer confirme el destino.',
        genericLangLabel: (city) => `${city} · Tarjeta para chofer`,
      },
      transportModes: {
        walk: 'A pie',
        metro: 'Metro / Tranvía',
        train: 'Tren rápido',
        boat: 'Crucero fluvial',
        car: 'Taxi / Auto',
        plane: 'Vuelo',
      },
      autocomplete: {
        lookupError:
          'El autocompletado de Google Places no está disponible (revisa tu red o Places API (New)). Puedes escribir manualmente.',
        clearInput: 'Limpiar campo',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'no está configurada; las sugerencias en vivo están desactivadas (puedes escribir y abrir Google Maps).',
        searchOnMaps: (q) => `Buscar "${q.slice(0, 18)}" en Google Maps`,
        useTypedNameBtn: 'Usar este nombre de todos modos',
        unverifiedPlaceNote: 'Lugar sin verificar · sin coordenadas',
      },
      nodeCard: {
        defaultDistrict: 'Centro',
        defaultTransitNote: 'Ir a pie o en transporte público',
        editStopTitle: 'Editar parada',
        cancel: 'Cancelar',
        arrivalLabel: 'Llegada',
        stayDurationLabel: 'Duración',
        closesAtLabel: 'Cierra a las',
        stopTypeLabel: 'Tipo',
        estSpendLabel: (c) => `Gasto est. (${c})`,
        stopNamePlaceholder: 'Nombre del lugar (ej. Museo de Orsay)',
        districtPlaceholder: 'Zona / Colonia (ej. Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Dirección exacta (para taxi y copiar)',
        transitNotePlaceholder: 'Nota de traslado (ej. Metro Línea 1, 12 min)',
        meetupAnchorCheckbox: 'Fijar como punto de encuentro nocturno',
        outdoorStopCheckbox: 'Parada al aire libre (admite plan B bajo techo)',
        rainTitlePlaceholder: 'Plan B bajo techo por lluvia',
        rainDistrictPlaceholder: 'Zona del plan B',
        rainAddressPlaceholder: 'Dirección del plan B',
        deleteStop: 'Eliminar parada',
        saveChanges: 'Guardar cambios',
        swipeUndo: 'Deshacer',
        swipeDone: 'Listo',
        swipeEdit: 'Editar',
        swipeDelete: 'Eliminar',
        thumbTitle: 'Ver fotos, horarios y boletos de esta parada',
        visitedBadge: 'Visitado ✓',
        dragAria: (n) => `Arrastra o pulsa Espacio para reordenar parada ${n}`,
        dragTitle: 'Mantén y arrastra para reordenar',
        visitedUndoTitle: 'Visitado (toca para deshacer)',
        markVisitedTitle: 'Marcar como visitado',
        wasOrder: (n) => `· Antes #${n}`,
        rainBackupBadge: '· Plan lluvia',
        moveUp: 'Subir',
        moveDown: 'Bajar',
        editStop: 'Editar parada',
        deleteStopTip: 'Eliminar parada',
        details: 'Detalles',
        meetupAnchorBadge: '· Punto de encuentro',
        loggedAmount: (s, a) => `Registrado ${s}${a}`,
        freeEntry: 'Entrada gratis',
        estAmount: (s, a) => `Est. ${s}${a}`,
        ticketsCount: (c) => `${c} Boleto${c > 1 ? 's' : ''}`,
        closesPrefix: 'Cierra ',
        urgencyAdvice: (l) => `${l} — considera salir antes o reordenar.`,
      },
    },
    'fr-FR': {
      destinationFallback: 'Destination',
      driverFallback: {
        parisPronunciation:
          'Bonjour · S’il vous plaît (« Bonjour, pouvez-vous m’emmener à cette adresse ? »)',
        parisTip:
          'Saluer le chauffeur d’un « Bonjour » est d’usage en France. Les taxis parisiens officiels acceptent la carte ; vérifiez le numéro et le code postal (ex. 75004).',
        parisLangLabel: (city) => `${city} · Carte taxi en français`,
        amsterdamPronunciation: 'KHOU-den-dahkh (Bonjour) · ahl-stew-BLIFT (S’il vous plaît)',
        amsterdamTip:
          'À Amsterdam, de nombreux quais sont à sens unique : le chauffeur peut s’arrêter au pont le plus proche (1–2 min à pied). Carte bancaire acceptée.',
        amsterdamLangLabel: (city) => `${city} · Carte taxi (NL/EN)`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no jū-sho ma-de o-ne-gai-shi-ma-su',
        japanTip:
          'Au Japon, les portes arrière des taxis s’ouvrent et se ferment automatiquement : ne les tirez pas à la main.',
        japanLangLabel: (city) => `${city} · Carte taxi en japonais`,
        genericPronunciation:
          'Montrez clairement cet écran au chauffeur afin qu’il vérifie l’adresse sur son GPS.',
        genericTip:
          'Désignez l’adresse ci-dessus pour que le chauffeur puisse confirmer la destination.',
        genericLangLabel: (city) => `${city} · Carte chauffeur`,
      },
      transportModes: {
        walk: 'À pied',
        metro: 'Métro / Tram',
        train: 'Train grande vitesse',
        boat: 'Croisière fluviale',
        car: 'Taxi / Voiture',
        plane: 'Vol',
      },
      autocomplete: {
        lookupError:
          'L’autocomplétion Google Places est indisponible (vérifiez le réseau ou Places API (New)). Saisie manuelle possible.',
        clearInput: 'Effacer',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'n’est pas configurée ; suggestions en direct désactivées (saisie manuelle et liens Google Maps actifs).',
        searchOnMaps: (q) => `Chercher « ${q.slice(0, 18)} » sur Google Maps`,
        useTypedNameBtn: 'Utiliser ce nom quand même',
        unverifiedPlaceNote: 'Lieu non vérifié · sans coordonnées',
      },
      nodeCard: {
        defaultDistrict: 'Centre-ville',
        defaultTransitNote: 'À pied ou en transports en commun',
        editStopTitle: 'Modifier l’étape',
        cancel: 'Annuler',
        arrivalLabel: 'Arrivée',
        stayDurationLabel: 'Durée',
        closesAtLabel: 'Fermeture',
        stopTypeLabel: 'Catégorie',
        estSpendLabel: (c) => `Budget est. (${c})`,
        stopNamePlaceholder: 'Nom du lieu (ex. Musée d’Orsay, Café de Flore)',
        districtPlaceholder: 'Quartier (ex. Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Adresse postale (pour taxi et copie)',
        transitNotePlaceholder: 'Note de trajet (ex. Métro ligne 1 direct, 12 min)',
        meetupAnchorCheckbox: 'Définir comme point de rendez-vous du soir',
        outdoorStopCheckbox: 'Lieu en plein air (avec plan B couvert)',
        rainTitlePlaceholder: 'Alternative abritée en cas de pluie',
        rainDistrictPlaceholder: 'Quartier de repli',
        rainAddressPlaceholder: 'Adresse de repli',
        deleteStop: 'Supprimer',
        saveChanges: 'Enregistrer',
        swipeUndo: 'Annuler',
        swipeDone: 'Fait',
        swipeEdit: 'Modifier',
        swipeDelete: 'Supprimer',
        thumbTitle: 'Voir photos, horaires et billets de cette étape',
        visitedBadge: 'Visité ✓',
        dragAria: (n) => `Glisser ou appuyer sur Espace pour déplacer l’étape ${n}`,
        dragTitle: 'Maintenir et glisser pour réordonner',
        visitedUndoTitle: 'Visité (appuyer pour annuler)',
        markVisitedTitle: 'Marquer comme visité',
        wasOrder: (n) => `· Était n°${n}`,
        rainBackupBadge: '· Plan pluie',
        moveUp: 'Monter',
        moveDown: 'Descendre',
        editStop: 'Modifier l’étape',
        deleteStopTip: 'Supprimer l’étape',
        details: 'Détails',
        meetupAnchorBadge: '· Point de RDV',
        loggedAmount: (s, a) => `Saisi ${s}${a}`,
        freeEntry: 'Gratuit',
        estAmount: (s, a) => `Est. ${s}${a}`,
        ticketsCount: (c) => `${c} Billet${c > 1 ? 's' : ''}`,
        closesPrefix: 'Ferme à ',
        urgencyAdvice: (l) => `${l} — partez plus tôt ou réorganisez l’ordre.`,
      },
    },
    'de-DE': {
      destinationFallback: 'Reiseziel',
      driverFallback: {
        parisPronunciation:
          'Bon-SCHUHR · sil wu PLÄ („Hallo, bitte bringen Sie mich zu dieser Adresse“)',
        parisTip:
          'Ein kurzes „Bonjour“ zur Begrüßung ist in Frankreich üblich. Offizielle Pariser Taxis akzeptieren Karten; Hausnummer und PLZ prüfen.',
        parisLangLabel: (city) => `${city} · Französische Taxikarte`,
        amsterdamPronunciation: 'CHU-den-dach (Hallo) · al-stü-BLIEFT (Bitte)',
        amsterdamTip:
          'Viele Amsterdamer Grachten sind Einbahnstraßen – oft hält das Taxi sicher an der nächsten Brücke (1–2 Min. zu Fuß).',
        amsterdamLangLabel: (city) => `${city} · NL/EN Taxikarte`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no dschu-scho ma-de o-ne-gai-schi-ma-su',
        japanTip:
          'Hintere Taxitüren in Japan öffnen und schließen automatisch – bitte nicht von Hand ziehen oder zudrücken.',
        japanLangLabel: (city) => `${city} · Japanische Taxikarte`,
        genericPronunciation:
          'Zeigen Sie diesen Bildschirm dem Fahrer, damit er die Adresse im Navi prüfen kann.',
        genericTip:
          'Zeigen Sie direkt auf die Straßenadresse oben zur Bestätigung des Ziels.',
        genericLangLabel: (city) => `${city} · Fahrerkarte`,
      },
      transportModes: {
        walk: 'Zu Fuß',
        metro: 'U-Bahn / Tram',
        train: 'Schnellzug',
        boat: 'Boot / Fähre',
        car: 'Taxi / Auto',
        plane: 'Flug',
      },
      autocomplete: {
        lookupError:
          'Google Places Autovervollständigung nicht verfügbar (Netzwerk oder Places API (New) prüfen). Manuelle Eingabe möglich.',
        clearInput: 'Eingabe löschen',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'ist nicht konfiguriert – Live-Ortsvorschläge sind aus (manuelle Eingabe & Google Maps Links funktionieren weiterhin).',
        searchOnMaps: (q) => `„${q.slice(0, 18)}“ auf Google Maps suchen`,
        useTypedNameBtn: 'Diesen Namen trotzdem verwenden',
        unverifiedPlaceNote: 'Ungeprüfter Ort · keine Kartencoordinaten',
      },
      nodeCard: {
        defaultDistrict: 'Stadtzentrum',
        defaultTransitNote: 'Zu Fuß oder mit dem ÖPNV',
        editStopTitle: 'Stopp bearbeiten',
        cancel: 'Abbrechen',
        arrivalLabel: 'Ankunft',
        stayDurationLabel: 'Dauer',
        closesAtLabel: 'Schließt um',
        stopTypeLabel: 'Kategorie',
        estSpendLabel: (c) => `Geschätzt (${c})`,
        stopNamePlaceholder: 'Ortsname (z. B. Musée d’Orsay, Café de Flore)',
        districtPlaceholder: 'Viertel (z. B. Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Straßenadresse (für Taxi & Kopieren)',
        transitNotePlaceholder: 'Anfahrtshinweis (z. B. Metro Linie 1, 12 Min.)',
        meetupAnchorCheckbox: 'Als Abend-Treffpunkt festlegen',
        outdoorStopCheckbox: 'Außenstopp (mit Regen-Alternative)',
        rainTitlePlaceholder: 'Indoor-Alternative bei Regen',
        rainDistrictPlaceholder: 'Viertel (Alternative)',
        rainAddressPlaceholder: 'Adresse (Alternative)',
        deleteStop: 'Löschen',
        saveChanges: 'Speichern',
        swipeUndo: 'Rückgängig',
        swipeDone: 'Erledigt',
        swipeEdit: 'Bearbeiten',
        swipeDelete: 'Löschen',
        thumbTitle: 'Fotos, Öffnungszeiten & Ticket-Wallet öffnen',
        visitedBadge: 'Besucht ✓',
        dragAria: (n) => `Ziehen oder Leertaste drücken, um Stopp ${n} zu sortieren`,
        dragTitle: 'Halten & ziehen zum Sortieren',
        visitedUndoTitle: 'Besucht (tippen zum Aufheben)',
        markVisitedTitle: 'Als besucht markieren',
        wasOrder: (n) => `· War #${n}`,
        rainBackupBadge: '· Regen-Plan',
        moveUp: 'Nach oben',
        moveDown: 'Nach unten',
        editStop: 'Stopp bearbeiten',
        deleteStopTip: 'Stopp löschen',
        details: 'Details',
        meetupAnchorBadge: '· Treffpunkt',
        loggedAmount: (s, a) => `Gebucht ${s}${a}`,
        freeEntry: 'Eintritt frei',
        estAmount: (s, a) => `Ca. ${s}${a}`,
        ticketsCount: (c) => `${c} Ticket${c > 1 ? 's' : ''}`,
        closesPrefix: 'Schließt ',
        urgencyAdvice: (l) => `${l} — früher aufbrechen oder umplanen.`,
      },
    },
    'pt-BR': {
      destinationFallback: 'Destino',
      driverFallback: {
        parisPronunciation:
          'Bon-JUR · sil vu PLÉ ("Olá, leve-me a este endereço, por favor")',
        parisTip:
          'Cumprimentar com "Bonjour" é costume na França. Táxis oficiais em Paris aceitam cartão; confirme número e CEP.',
        parisLangLabel: (city) => `${city} · Cartão de táxi (FR)`,
        amsterdamPronunciation: 'RÚ-den-darr (Olá) · al-stu-BLIFT (Por favor)',
        amsterdamTip:
          'Os canais de Amsterdã têm muitas ruas de mão única; o motorista pode parar na ponte mais próxima (1–2 min a pé).',
        amsterdamLangLabel: (city) => `${city} · Cartão de táxi (NL/EN)`,
        japanPronunciation:
          'Su-mi-ma-sen, ko-chi-ra no jū-sho ma-de o-ne-gai-shi-ma-su',
        japanTip:
          'As portas traseiras dos táxis japoneses abrem e fecham automaticamente — não puxe nem empurre manualmente.',
        japanLangLabel: (city) => `${city} · Cartão de táxi (JP)`,
        genericPronunciation:
          'Mostre esta tela ao motorista para que ele confira o endereço no GPS.',
        genericTip:
          'Aponte diretamente para o endereço acima para o motorista confirmar o destino.',
        genericLangLabel: (city) => `${city} · Cartão para motorista`,
      },
      transportModes: {
        walk: 'A pé',
        metro: 'Metrô / Bonde',
        train: 'Trem rápido',
        boat: 'Passeio de barco',
        car: 'Táxi / Carro',
        plane: 'Voo',
      },
      autocomplete: {
        lookupError:
          'Preenchimento automático do Google Places indisponível (verifique rede ou Places API (New)). Você pode digitar manualmente.',
        clearInput: 'Limpar campo',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'não está configurada; sugestões ao vivo desativadas (entrada manual e links do Google Maps funcionam).',
        searchOnMaps: (q) => `Buscar "${q.slice(0, 18)}" no Google Maps`,
        useTypedNameBtn: 'Usar este nome mesmo assim',
        unverifiedPlaceNote: 'Local não verificado · sem coordenadas',
      },
      nodeCard: {
        defaultDistrict: 'Centro',
        defaultTransitNote: 'Ir a pé ou de transporte público',
        editStopTitle: 'Editar parada',
        cancel: 'Cancelar',
        arrivalLabel: 'Chegada',
        stayDurationLabel: 'Duração',
        closesAtLabel: 'Fecha às',
        stopTypeLabel: 'Tipo',
        estSpendLabel: (c) => `Gasto est. (${c})`,
        stopNamePlaceholder: 'Nome do local (ex.: Museu d’Orsay, Café de Flore)',
        districtPlaceholder: 'Bairro / Região (ex.: Saint-Germain · 6e)',
        streetAddressPlaceholder: 'Endereço completo (para táxi e cópia)',
        transitNotePlaceholder: 'Nota de trajeto (ex.: Metrô Linha 1, 12 min)',
        meetupAnchorCheckbox: 'Definir como ponto de encontro noturno',
        outdoorStopCheckbox: 'Parada ao ar livre (aceita plano B coberto)',
        rainTitlePlaceholder: 'Plano B coberto em caso de chuva',
        rainDistrictPlaceholder: 'Bairro do plano B',
        rainAddressPlaceholder: 'Endereço do plano B',
        deleteStop: 'Excluir parada',
        saveChanges: 'Salvar alterações',
        swipeUndo: 'Desfazer',
        swipeDone: 'Feito',
        swipeEdit: 'Editar',
        swipeDelete: 'Excluir',
        thumbTitle: 'Abrir fotos, horários e ingressos desta parada',
        visitedBadge: 'Visitado ✓',
        dragAria: (n) => `Arraste ou pressione Espaço para reordenar parada ${n}`,
        dragTitle: 'Segure e arraste para reordenar',
        visitedUndoTitle: 'Visitado (toque para desfazer)',
        markVisitedTitle: 'Marcar como visitado',
        wasOrder: (n) => `· Era #${n}`,
        rainBackupBadge: '· Plano chuva',
        moveUp: 'Subir',
        moveDown: 'Descer',
        editStop: 'Editar parada',
        deleteStopTip: 'Excluir parada',
        details: 'Detalhes',
        meetupAnchorBadge: '· Ponto de encontro',
        loggedAmount: (s, a) => `Lançado ${s}${a}`,
        freeEntry: 'Entrada grátis',
        estAmount: (s, a) => `Est. ${s}${a}`,
        ticketsCount: (c) => `${c} Ingresso${c > 1 ? 's' : ''}`,
        closesPrefix: 'Fecha ',
        urgencyAdvice: (l) => `${l} — considere sair antes ou reordenar.`,
      },
    },
    'ja-JP': {
      destinationFallback: '目的地',
      driverFallback: {
        parisPronunciation:
          'ボンジュール · シル・ヴ・プレ（「こんにちは、この住所までお願いします」）',
        parisTip:
          '乗車時は「Bonjour」と挨拶するのがマナーです。パリの正規タクシーはカード対応で、番地と郵便番号を確認すると安心です。',
        parisLangLabel: (city) => `${city} · フランス語タクシーカード`,
        amsterdamPronunciation: 'フーデンダッハ（こんにちは）· アルストゥブリーフト（お願いします）',
        amsterdamTip:
          'アムステルダムの運河沿いは一方通行が多いため、徒歩1〜2分の近い橋のたもとで停車する場合があります。カード決済可。',
        amsterdamLangLabel: (city) => `${city} · オランダ語/英語タクシーカード`,
        japanPronunciation: 'すみません、こちらの住所までお願いします',
        japanTip:
          '日本のタクシーは後部座席のドアが自動で開閉します。ご自身で開け閉めしないでください。',
        japanLangLabel: (city) => `${city} · 日本語タクシーカード`,
        genericPronunciation:
          '運転手にこの画面を見せて、カーナビで住所を確認してもらってください。',
        genericTip: '上の住所を指さして目的地を確認してもらってください。',
        genericLangLabel: (city) => `${city} · 運転手提示カード`,
      },
      transportModes: {
        walk: '徒歩',
        metro: '地下鉄・トラム',
        train: '新幹線・特急',
        boat: 'クルーズ・船',
        car: 'タクシー・車',
        plane: 'フライト',
      },
      autocomplete: {
        lookupError:
          'Google Places の候補取得に接続できません（通信状況や Places API (New) をご確認ください）。手入力は可能です。',
        clearInput: '入力をクリア',
        missingApiKeyBefore: '',
        missingApiKeyAfter:
          'が未設定のためリアルタイム住所候補はオフです（手入力と Google マップリンクは利用できます）。',
        searchOnMaps: (q) => `Google マップで「${q.slice(0, 14)}」を検索`,
        useTypedNameBtn: 'この名称のまま使う',
        unverifiedPlaceNote: '未検証の地点 · 地図座標なし',
      },
      nodeCard: {
        defaultDistrict: '中心部',
        defaultTransitNote: '徒歩または公共交通機関で移動',
        editStopTitle: '立ち寄り先を編集',
        cancel: 'キャンセル',
        arrivalLabel: '到着時刻',
        stayDurationLabel: '滞在目安',
        closesAtLabel: '営業終了',
        stopTypeLabel: '種別',
        estSpendLabel: (c) => `目安予算 (${c})`,
        stopNamePlaceholder: 'スポット名（例：オルセー美術館、カフェ・ド・フロール）',
        districtPlaceholder: 'エリア（例：Saint-Germain · 6e）',
        streetAddressPlaceholder: '住所（タクシー提示・コピー用）',
        transitNotePlaceholder: '移動メモ（例：メトロ1号線直通 12分）',
        meetupAnchorCheckbox: '夜の集合場所アンカーに設定',
        outdoorStopCheckbox: '屋外スポット（雨天時の屋内代替を設定可）',
        rainTitlePlaceholder: '雨天時の屋内代替スポット名',
        rainDistrictPlaceholder: '代替エリア',
        rainAddressPlaceholder: '代替住所',
        deleteStop: '削除',
        saveChanges: '変更を保存',
        swipeUndo: '未訪問へ',
        swipeDone: '訪問済',
        swipeEdit: '編集',
        swipeDelete: '削除',
        thumbTitle: '写真・営業時間・チケットを開く',
        visitedBadge: '訪問済 ✓',
        dragAria: (n) => `ドラッグまたは Space キーで ${n} 番目の順番を変更`,
        dragTitle: '長押しドラッグで順番を変更',
        visitedUndoTitle: '訪問済（タップで取消）',
        markVisitedTitle: '訪問済にする',
        wasOrder: (n) => `· 元 #${n}`,
        rainBackupBadge: '· 雨天代替',
        moveUp: '上へ',
        moveDown: '下へ',
        editStop: '編集',
        deleteStopTip: '削除',
        details: '詳細',
        meetupAnchorBadge: '· 集合場所',
        loggedAmount: (s, a) => `記録済 ${s}${a}`,
        freeEntry: '入場無料',
        estAmount: (s, a) => `目安 ${s}${a}`,
        ticketsCount: (c) => `チケット ${c}枚`,
        closesPrefix: '終了 ',
        urgencyAdvice: (l) => `${l} — 早めの出発や順番変更をご検討ください。`,
      },
    },
  });
}

export function getStopTypeCopyLabel(stopType: StopType, lang: AppLanguage): string {
  const map: Record<StopType, string> = pickLang<Record<StopType, string>>(lang, {
    'zh-CN': {
      hotel: '酒店住宿',
      transit: '交通接驳',
      dining: '餐饮美食',
      shopping: '购物退税',
      attraction: '景点体验',
    },
    'en-US': {
      hotel: 'Hotel & Stay',
      transit: 'Transit',
      dining: 'Dining',
      shopping: 'Shopping & Tax-Free',
      attraction: 'Sightseeing',
    },
    'en-GB': {
      hotel: 'Accommodation',
      transit: 'Transit & Rail',
      dining: 'Food & Drink',
      shopping: 'Shopping & VAT',
      attraction: 'Attraction',
    },
    'es-MX': {
      hotel: 'Hospedaje',
      transit: 'Transporte',
      dining: 'Comida',
      shopping: 'Compras y Tax-Free',
      attraction: 'Atracción',
    },
    'fr-FR': {
      hotel: 'Hébergement',
      transit: 'Transport',
      dining: 'Restauration',
      shopping: 'Shopping & Détaxe',
      attraction: 'Visite',
    },
    'de-DE': {
      hotel: 'Unterkunft',
      transit: 'Transfer',
      dining: 'Gastronomie',
      shopping: 'Shopping & Tax-Free',
      attraction: 'Sehenswürdigkeit',
    },
    'pt-BR': {
      hotel: 'Hospedagem',
      transit: 'Transporte',
      dining: 'Alimentação',
      shopping: 'Compras e Tax-Free',
      attraction: 'Passeio',
    },
    'ja-JP': {
      hotel: '宿泊',
      transit: '交通・移動',
      dining: 'グルメ・食事',
      shopping: '買物・免税',
      attraction: '観光スポット',
    },
  });
  return map[stopType] || '';
}

import type { AppLanguage } from '../../types';
import type { MapsTravelMode } from '../../utils/googleMapsHelpers';
import { pickLang } from '../langHelper';

export interface ItineraryMapCopy {
  canvas2d: {
    viewStopDetails: string;
    hotelStay: string;
    centeredGps: string;
    outsideCityFitted: (city: string) => string;
    fittedAllStops: string;
    emptyPrompt: (scopeLabel: string) => string;
    holdOrRightClickHint: string;
    dismissTip: string;
    fitOrLocateTitle: string;
    fitOrLocateAria: string;
    switchToStreet: string;
    switchToSatellite: string;
    toggleSatelliteAria: string;
    exitMultiDay: string;
    showMultiDay: string;
    toggleMultiDayAria: string;
    spanAndTapHint: (km: string) => string;
  };
  panel: {
    formatHoursMins: (hours: number, mins: number) => string;
    formatMinsOnly: (mins: number) => string;
    formatHoursOnly: (hours: number) => string;
    travelModes: Record<MapsTravelMode, string>;
    skeletonAria: (city: string) => string;
    skeletonTitle: (city: string) => string;
    skeletonStops: (count: number) => string;
    scopeCity: (scope: string) => string;
    destinationCity: string;
    stopsAndMode: (count: number, mode: string) => string;
    noStopsToday: string;
    mapLoadError: string;
    mapRetry: string;
    sdkFailedDesc: string;
    unconfiguredDesc: string;
    multiDayRouteBtn: (count: number) => string;
    cityFullRouteBtn: (city: string, count: number) => string;
    directionsToBtn: (title: string) => string;
    copiedRoute: string;
    copyRoute: string;
    emptyOverviewTitle: (day: number, city: string) => string;
    emptyOverviewDesc: string;
    schematicAria: (city: string) => string;
    inspectStopAria: (order: number, title: string) => string;
    previousStopAria: string;
    nextStopAria: string;
    stopFraction: (order: number, total: number) => string;
    indoorRainBackup: string;
    fromStopDirections: (order: number) => string;
    directionsShort: string;
    findPin: string;
    copiedShort: string;
    copyAddress: string;
    viewStopDetails: string;
    placesErrorNotice: string;
    over27StopsNotice: string;
    noStreetRouteNotice: string;
    routesUnavailableNotice: string;
    loadingTilesStage: (city: string) => string;
    loadingStopsStage: (count: number, scope: string, city: string) => string;
    rightClickHint: string;
    dismissTip: string;
    fitAllTitle: string;
    fitAllAria: string;
    switchTo2dStreet: string;
    switchTo2dSatellite: string;
    streetMapAria: string;
    satelliteMapAria: string;
    exitMultiDayPreview: string;
    showMultiDayPreview: string;
    toggleMultiDayAria: string;
    sectionAria: (scope: string) => string;
    multiDayHeading: (daysStr: string) => string;
    stopsInline: (count: number) => string;
    cityMapInline: string;
    summaryDistDur: (km: string, dur: string) => string;
    rainPlanInline: string;
    exploreShort: (city: string) => string;
    collapsePanelAria: string;
    expandPanelAria: string;
    selectMultiDayAria: string;
    onlyCity: (city: string) => string;
    allDays: string;
    routeReorderedSaved: (km: string, pct: number) => string;
    orderUpdated: string;
    compareLine: string;
    undoReorder: string;
  };
}

export function getItineraryMapCopy(lang: AppLanguage | string): ItineraryMapCopy {
  return pickLang<ItineraryMapCopy>(lang, {
    'zh-CN': {
      canvas2d: {
        viewStopDetails: '查看站点详情',
        hotelStay: '下榻酒店',
        centeredGps: '已定位至当前实时位置',
        outsideCityFitted: (city) => `当前不在 ${city} 当地，已为你适配当日全部站点`,
        fittedAllStops: '已全览适配当日全部站点',
        emptyPrompt: (scope) => `${scope} · 添加站点后即刻在地图展示店名卡片与黄金路线`,
        holdOrRightClickHint: '长按或右键地图添加站点',
        dismissTip: '关闭提示',
        fitOrLocateTitle: '全览适配站点 / 定位我的位置',
        fitOrLocateAria: '全览适配站点或定位我的位置',
        switchToStreet: '切换为清爽路网地图',
        switchToSatellite: '切换为卫星实景图层',
        toggleSatelliteAria: '切换路网或卫星图层',
        exitMultiDay: '关闭多日连线预览',
        showMultiDay: '开启多日连线预览',
        toggleMultiDayAria: '切换多日连线预览',
        spanAndTapHint: (km) => `跨度约 ${km} km · 再次点击店名卡看详情`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h} 小时 ${m} 分钟`,
        formatMinsOnly: (m) => `${m} 分钟`,
        formatHoursOnly: (h) => `${h} 小时`,
        travelModes: {
          walking: '步行顺路',
          transit: '地铁公交',
          driving: '打车驾车',
        },
        skeletonAria: (c) => `正在加载 ${c} 地图与路线`,
        skeletonTitle: (c) => `正在加载 ${c} 地图与站点动线...`,
        skeletonStops: (n) => ` · 共 ${n} 个行程节点`,
        scopeCity: (s) => `${s} 当前城市`,
        destinationCity: '目的地城市',
        stopsAndMode: (n, mode) => `串联 ${n} 个站点 · ${mode}`,
        noStopsToday: '暂未添加当日站点',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          '在线地图底图暂未就绪，已自动切换为交互式静态路线卡；点击下方节点可查看门牌并一键唤起导航。',
        unconfiguredDesc:
          '未配置 Google Maps API 密钥 · 已启用交互式静态动线卡，点击节点可核对门牌并一键打开 Google 地图快捷导航。',
        multiDayRouteBtn: (n) => `多日串联导航 (${n} 站)`,
        cityFullRouteBtn: (c, n) => `${c} 全程快捷导航 (${n} 站)`,
        directionsToBtn: (t) => `导航前往首站 · ${t}`,
        copiedRoute: '已复制路线',
        copyRoute: '复制路线单',
        emptyOverviewTitle: (d, c) => `Day ${d} · ${c} 城市概览就绪`,
        emptyOverviewDesc:
          '添加行程站点或使用「AI 生成顺路行程」后，此处将自动绘制交互式城市站点动线，并生成一键串联导航。',
        schematicAria: (c) => `${c} 交互式静态站点路线示意图`,
        inspectStopAria: (o, t) => `查看第 ${o} 站：${t}`,
        previousStopAria: '切换到上一站',
        nextStopAria: '切换到下一站',
        stopFraction: (o, t) => `第 ${o}/${t} 站`,
        indoorRainBackup: '室内防雨备选',
        fromStopDirections: (o) => `从第 ${o} 站导航至此`,
        directionsShort: '单站快捷导航',
        findPin: '定位门牌',
        copiedShort: '已复制',
        copyAddress: '复制地址',
        viewStopDetails: '查看站点详情',
        placesErrorNotice:
          '站点定位暂未返回坐标，请检查 Places API (New) 权限或网络连接；下方路线图仍可直接点击对比与导航。',
        over27StopsNotice:
          '已选中超过 27 个跨日站点，已切换为完整多日顺序连线预览全城布局。',
        noStreetRouteNotice: '当前站点间暂无可用路网路径，已切换为站点顺序虚线连线。',
        routesUnavailableNotice:
          '路线折线服务暂未连通（请检查网络或确认 Google Cloud 已开启 Routes API），当前已切换为站点顺序连线与估算里程。',
        loadingTilesStage: (c) => `正在加载 ${c} 真实 2D 地图底图...`,
        loadingStopsStage: (n, s, c) => `正在定位 ${s}（${c}）的 ${n} 个站点坐标...`,
        rightClickHint: '右键点击地图任意位置添加站点',
        dismissTip: '关闭提示',
        fitAllTitle: '全览居中适配全部站点',
        fitAllAria: '全览适配站点',
        switchTo2dStreet: '切换为清爽街道图',
        switchTo2dSatellite: '切换为高清卫星图',
        streetMapAria: '街道地图',
        satelliteMapAria: '卫星地图',
        exitMultiDayPreview: '关闭多日连线预览',
        showMultiDayPreview: '开启多日连线预览',
        toggleMultiDayAria: '切换多日连线预览',
        sectionAria: (s) => `${s} Google 地图路线导航`,
        multiDayHeading: (d) => `多日连线 · ${d}`,
        stopsInline: (n) => `· 串联 ${n} 站`,
        cityMapInline: '· 城市地图',
        summaryDistDur: (km, dur) => ` · 约 ${km} km / ${dur}`,
        rainPlanInline: ' · 已同步防雨点',
        exploreShort: (c) => `查看 ${c}`,
        collapsePanelAria: '收起地图路线面板',
        expandPanelAria: '展开地图路线面板',
        selectMultiDayAria: '左右滑动筛选多日路线日期',
        onlyCity: (c) => `仅看 ${c}`,
        allDays: '全部日期',
        routeReorderedSaved: (km, pct) => `已顺路重排 · 减少折返约 ${km} km（-${pct}%）`,
        orderUpdated: '已调整站点顺序',
        compareLine: '原动线对比',
        undoReorder: '还原顺序',
      },
    },
    'en-US': {
      canvas2d: {
        viewStopDetails: 'View stop details',
        hotelStay: 'Hotel Stay',
        centeredGps: 'Centered on your live GPS location',
        outsideCityFitted: (city) => `You are outside ${city} · Fitted all day stops`,
        fittedAllStops: 'Fitted all stops in view',
        emptyPrompt: (scope) => `${scope} · Add stops to see store cards & route on the map`,
        holdOrRightClickHint: 'Hold or right-click map to add a stop',
        dismissTip: 'Dismiss tip',
        fitOrLocateTitle: 'Fit all stops / Locate me',
        fitOrLocateAria: 'Fit all stops or locate me',
        switchToStreet: 'Switch to street map',
        switchToSatellite: 'Switch to satellite map',
        toggleSatelliteAria: 'Toggle satellite map',
        exitMultiDay: 'Exit multi-day route view',
        showMultiDay: 'Show multi-day connected route',
        toggleMultiDayAria: 'Toggle multi-day route',
        spanAndTapHint: (km) => `~${km} km span · Tap card twice for details`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h}h ${m}m`,
        formatMinsOnly: (m) => `${m} min`,
        formatHoursOnly: (h) => `${h}h`,
        travelModes: {
          walking: 'Walking',
          transit: 'Transit',
          driving: 'Driving',
        },
        skeletonAria: (c) => `Loading ${c} map and route`,
        skeletonTitle: (c) => `Loading ${c} map & route...`,
        skeletonStops: (n) => ` · ${n} stop${n === 1 ? '' : 's'}`,
        scopeCity: (s) => `${s} City`,
        destinationCity: 'Destination City',
        stopsAndMode: (n, mode) => `${n} stop${n === 1 ? '' : 's'} · ${mode}`,
        noStopsToday: 'No stops added today',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'Live map tiles unavailable — switched to interactive route card. Tap any stop below to inspect its address or launch directions.',
        unconfiguredDesc:
          'Google Maps key not configured · Interactive route schematic ready — tap any stop to inspect addresses & launch Google Maps.',
        multiDayRouteBtn: (n) => `Multi-Day Route (${n} stops)`,
        cityFullRouteBtn: (c, n) => `${c} Full Route (${n} stops)`,
        directionsToBtn: (t) => `Directions to ${t}`,
        copiedRoute: 'Copied Route',
        copyRoute: 'Copy Route',
        emptyOverviewTitle: (d, c) => `Day ${d} · ${c} Overview Ready`,
        emptyOverviewDesc:
          'Add stops or use AI Generate Day Route to plot an interactive route map and 1-tap Google Maps directions.',
        schematicAria: (c) => `${c} interactive route schematic`,
        inspectStopAria: (o, t) => `Inspect stop ${o}: ${t}`,
        previousStopAria: 'Previous stop',
        nextStopAria: 'Next stop',
        stopFraction: (o, t) => `Stop ${o}/${t}`,
        indoorRainBackup: 'Indoor Rain Backup',
        fromStopDirections: (o) => `From Stop ${o}`,
        directionsShort: 'Directions',
        findPin: 'Find Pin',
        copiedShort: 'Copied',
        copyAddress: 'Copy Address',
        viewStopDetails: 'View stop details',
        placesErrorNotice:
          'Could not resolve stop coordinates right now (please check Places API permissions or network). You can still compare stops and launch Google Maps directions below.',
        over27StopsNotice:
          'Over 27 cross-day stops selected — switched to sequential multi-day overview line.',
        noStreetRouteNotice:
          'No street-network route found between current stops — switched to sequential dashed line.',
        routesUnavailableNotice:
          'Live route polyline service unavailable (check network or Routes API enablement) — showing sequential stop line & estimated distance.',
        loadingTilesStage: (c) => `Loading ${c} interactive 2D map tiles...`,
        loadingStopsStage: (n, s, c) =>
          `Locating ${n} stop${n === 1 ? '' : 's'} for ${s} (${c})...`,
        rightClickHint: 'Right-click map to add a place',
        dismissTip: 'Dismiss tip',
        fitAllTitle: 'Fit all stops in view',
        fitAllAria: 'Fit all stops',
        switchTo2dStreet: 'Switch to 2D Street Map',
        switchTo2dSatellite: 'Switch to 2D Satellite Imagery',
        streetMapAria: 'Street map',
        satelliteMapAria: 'Satellite map',
        exitMultiDayPreview: 'Exit multi-day route preview',
        showMultiDayPreview: 'Show multi-day connected route',
        toggleMultiDayAria: 'Toggle multi-day route',
        sectionAria: (s) => `${s} Google Maps route & navigation`,
        multiDayHeading: (d) => `Multi-Day · ${d}`,
        stopsInline: (n) => `· ${n} stop${n === 1 ? '' : 's'}`,
        cityMapInline: '· City Map',
        summaryDistDur: (km, dur) => ` · ~${km} km / ${dur}`,
        rainPlanInline: ' · Rain plan',
        exploreShort: (c) => `Explore ${c}`,
        collapsePanelAria: 'Collapse route map panel',
        expandPanelAria: 'Expand route map panel',
        selectMultiDayAria: 'Select multi-day route days',
        onlyCity: (c) => `Only ${c}`,
        allDays: 'All Days',
        routeReorderedSaved: (km, pct) => `Route reordered · Saved ~${km} km (-${pct}%)`,
        orderUpdated: 'Stop order updated',
        compareLine: 'Compare Line',
        undoReorder: 'Undo',
      },
    },
    'es-MX': {
      canvas2d: {
        viewStopDetails: 'Ver detalles',
        hotelStay: 'Hospedaje',
        centeredGps: 'Centrado en tu ubicación GPS actual',
        outsideCityFitted: (city) => `Estás fuera de ${city} · Vista ajustada a todas las paradas`,
        fittedAllStops: 'Todas las paradas visibles en el mapa',
        emptyPrompt: (scope) => `${scope} · Agrega paradas para ver tarjetas y ruta en el mapa`,
        holdOrRightClickHint: 'Mantén presionado o clic derecho para agregar parada',
        dismissTip: 'Cerrar aviso',
        fitOrLocateTitle: 'Ajustar paradas / Mi ubicación',
        fitOrLocateAria: 'Ajustar paradas o ubicarme',
        switchToStreet: 'Cambiar a mapa de calles',
        switchToSatellite: 'Cambiar a vista satelital',
        toggleSatelliteAria: 'Cambiar capa satelital',
        exitMultiDay: 'Salir de vista multidía',
        showMultiDay: 'Ver ruta conectada de varios días',
        toggleMultiDayAria: 'Alternar ruta multidía',
        spanAndTapHint: (km) => `Recorrido ~${km} km · Toca dos veces la tarjeta para detalles`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h} h ${m} min`,
        formatMinsOnly: (m) => `${m} min`,
        formatHoursOnly: (h) => `${h} h`,
        travelModes: {
          walking: 'A pie',
          transit: 'Transporte público',
          driving: 'Auto / Taxi',
        },
        skeletonAria: (c) => `Cargando mapa y ruta de ${c}`,
        skeletonTitle: (c) => `Cargando mapa y ruta de ${c}...`,
        skeletonStops: (n) => ` · ${n} parada${n === 1 ? '' : 's'}`,
        scopeCity: (s) => `${s} · Ciudad`,
        destinationCity: 'Ciudad destino',
        stopsAndMode: (n, mode) => `${n} parada${n === 1 ? '' : 's'} · ${mode}`,
        noStopsToday: 'Sin paradas hoy',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'Los mapas en vivo no están disponibles; se activó la tarjeta interactiva. Toca cualquier parada abajo para ver su dirección o abrir navegación.',
        unconfiguredDesc:
          'Clave de Google Maps sin configurar · Esquema interactivo listo — toca una parada para consultar su dirección y abrir Google Maps.',
        multiDayRouteBtn: (n) => `Ruta multidía (${n} paradas)`,
        cityFullRouteBtn: (c, n) => `Ruta en ${c} (${n} paradas)`,
        directionsToBtn: (t) => `Cómo llegar a ${t}`,
        copiedRoute: 'Ruta copiada',
        copyRoute: 'Copiar ruta',
        emptyOverviewTitle: (d, c) => `Día ${d} · Vista de ${c} lista`,
        emptyOverviewDesc:
          'Agrega paradas o usa la IA para trazar la ruta interactiva del día y abrir indicaciones en un toque.',
        schematicAria: (c) => `Esquema interactivo de ruta en ${c}`,
        inspectStopAria: (o, t) => `Ver parada ${o}: ${t}`,
        previousStopAria: 'Parada anterior',
        nextStopAria: 'Siguiente parada',
        stopFraction: (o, t) => `Parada ${o}/${t}`,
        indoorRainBackup: 'Plan bajo techo',
        fromStopDirections: (o) => `Desde parada ${o}`,
        directionsShort: 'Cómo llegar',
        findPin: 'Ver pin',
        copiedShort: 'Copiado',
        copyAddress: 'Copiar dirección',
        viewStopDetails: 'Ver detalles',
        placesErrorNotice:
          'No pudimos obtener las coordenadas ahora (revisa Places API o tu conexión). Aún puedes comparar paradas y abrir Google Maps abajo.',
        over27StopsNotice:
          'Más de 27 paradas seleccionadas — vista cambiada a línea secuencial multidía.',
        noStreetRouteNotice:
          'Sin ruta vial directa entre paradas — se muestra línea discontinua secuencial.',
        routesUnavailableNotice:
          'Servicio de trazado en vivo no disponible — mostrando línea secuencial y distancia estimada.',
        loadingTilesStage: (c) => `Cargando mapa 2D interactivo de ${c}...`,
        loadingStopsStage: (n, s, c) =>
          `Ubicando ${n} parada${n === 1 ? '' : 's'} para ${s} (${c})...`,
        rightClickHint: 'Clic derecho en el mapa para agregar un lugar',
        dismissTip: 'Cerrar aviso',
        fitAllTitle: 'Encuadrar todas las paradas',
        fitAllAria: 'Encuadrar paradas',
        switchTo2dStreet: 'Cambiar a mapa de calles',
        switchTo2dSatellite: 'Cambiar a vista satelital',
        streetMapAria: 'Mapa de calles',
        satelliteMapAria: 'Mapa satelital',
        exitMultiDayPreview: 'Salir de vista multidía',
        showMultiDayPreview: 'Ver ruta conectada multidía',
        toggleMultiDayAria: 'Alternar vista multidía',
        sectionAria: (s) => `${s} Ruta y navegación en Google Maps`,
        multiDayHeading: (d) => `Multidía · ${d}`,
        stopsInline: (n) => `· ${n} parada${n === 1 ? '' : 's'}`,
        cityMapInline: '· Mapa de ciudad',
        summaryDistDur: (km, dur) => ` · ~${km} km / ${dur}`,
        rainPlanInline: ' · Plan lluvia',
        exploreShort: (c) => `Explorar ${c}`,
        collapsePanelAria: 'Contraer panel del mapa',
        expandPanelAria: 'Expandir panel del mapa',
        selectMultiDayAria: 'Seleccionar días de ruta multidía',
        onlyCity: (c) => `Solo ${c}`,
        allDays: 'Todos los días',
        routeReorderedSaved: (km, pct) => `Ruta optimizada · Ahorro ~${km} km (-${pct}%)`,
        orderUpdated: 'Orden actualizado',
        compareLine: 'Comparar ruta',
        undoReorder: 'Deshacer',
      },
    },
    'fr-FR': {
      canvas2d: {
        viewStopDetails: 'Voir les détails',
        hotelStay: 'Hébergement',
        centeredGps: 'Centré sur votre position GPS actuelle',
        outsideCityFitted: (city) => `Hors de ${city} · Vue ajustée sur vos étapes`,
        fittedAllStops: 'Toutes les étapes affichées',
        emptyPrompt: (scope) => `${scope} · Ajoutez des étapes pour voir la carte et l’itinéraire`,
        holdOrRightClickHint: 'Appui long ou clic droit pour ajouter une étape',
        dismissTip: 'Fermer',
        fitOrLocateTitle: 'Tout afficher / Me localiser',
        fitOrLocateAria: 'Tout afficher ou me localiser',
        switchToStreet: 'Passer à la carte routière',
        switchToSatellite: 'Passer à la vue satellite',
        toggleSatelliteAria: 'Changer la couche carte',
        exitMultiDay: 'Quitter la vue multi-jours',
        showMultiDay: 'Afficher l’itinéraire multi-jours',
        toggleMultiDayAria: 'Basculer la vue multi-jours',
        spanAndTapHint: (km) => `Env. ${km} km · Touchez deux fois une carte pour les détails`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h} h ${m} min`,
        formatMinsOnly: (m) => `${m} min`,
        formatHoursOnly: (h) => `${h} h`,
        travelModes: {
          walking: 'À pied',
          transit: 'Transports',
          driving: 'Voiture / Taxi',
        },
        skeletonAria: (c) => `Chargement de la carte et de l’itinéraire pour ${c}`,
        skeletonTitle: (c) => `Chargement de la carte de ${c}...`,
        skeletonStops: (n) => ` · ${n} étape${n === 1 ? '' : 's'}`,
        scopeCity: (s) => `${s} · Ville`,
        destinationCity: 'Ville de destination',
        stopsAndMode: (n, mode) => `${n} étape${n === 1 ? '' : 's'} · ${mode}`,
        noStopsToday: 'Aucune étape aujourd’hui',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'Fond de carte en direct indisponible — bascule vers la fiche interactive. Touchez une étape ci-dessous pour voir l’adresse ou lancer le GPS.',
        unconfiguredDesc:
          'Clé Google Maps non configurée · Schéma interactif prêt — touchez une étape pour consulter l’adresse et ouvrir Google Maps.',
        multiDayRouteBtn: (n) => `Itinéraire multi-jours (${n})`,
        cityFullRouteBtn: (c, n) => `Parcours ${c} (${n} étapes)`,
        directionsToBtn: (t) => `Itinéraire vers ${t}`,
        copiedRoute: 'Parcours copié',
        copyRoute: 'Copier l’itinéraire',
        emptyOverviewTitle: (d, c) => `Jour ${d} · Aperçu de ${c} prêt`,
        emptyOverviewDesc:
          'Ajoutez des étapes ou lancez la génération IA pour afficher la carte interactive et l’itinéraire Google Maps.',
        schematicAria: (c) => `Schéma d’itinéraire interactif pour ${c}`,
        inspectStopAria: (o, t) => `Voir étape ${o} : ${t}`,
        previousStopAria: 'Étape précédente',
        nextStopAria: 'Étape suivante',
        stopFraction: (o, t) => `Étape ${o}/${t}`,
        indoorRainBackup: 'Option pluie abritée',
        fromStopDirections: (o) => `Depuis l’étape ${o}`,
        directionsShort: 'Itinéraire',
        findPin: 'Localiser',
        copiedShort: 'Copié',
        copyAddress: 'Copier l’adresse',
        viewStopDetails: 'Voir les détails',
        placesErrorNotice:
          'Impossible de géolocaliser les étapes pour l’instant (vérifiez Places API ou le réseau). Vous pouvez toujours comparer et ouvrir Google Maps.',
        over27StopsNotice:
          'Plus de 27 étapes sélectionnées — affichage en ligne séquentielle multi-jours.',
        noStreetRouteNotice:
          'Aucun tracé routier trouvé — passage en ligne pointillée séquentielle.',
        routesUnavailableNotice:
          'Service de tracé indisponible — affichage séquentiel avec distance estimée.',
        loadingTilesStage: (c) => `Chargement de la carte 2D de ${c}...`,
        loadingStopsStage: (n, s, c) =>
          `Localisation de ${n} étape${n === 1 ? '' : 's'} pour ${s} (${c})...`,
        rightClickHint: 'Clic droit sur la carte pour ajouter un lieu',
        dismissTip: 'Fermer',
        fitAllTitle: 'Ajuster toutes les étapes',
        fitAllAria: 'Ajuster la carte',
        switchTo2dStreet: 'Passer au plan de ville',
        switchTo2dSatellite: 'Passer à la vue satellite',
        streetMapAria: 'Plan de ville',
        satelliteMapAria: 'Vue satellite',
        exitMultiDayPreview: 'Quitter l’aperçu multi-jours',
        showMultiDayPreview: 'Aperçu multi-jours connecté',
        toggleMultiDayAria: 'Basculer l’aperçu multi-jours',
        sectionAria: (s) => `${s} Itinéraire Google Maps`,
        multiDayHeading: (d) => `Multi-jours · ${d}`,
        stopsInline: (n) => `· ${n} étape${n === 1 ? '' : 's'}`,
        cityMapInline: '· Carte ville',
        summaryDistDur: (km, dur) => ` · ~${km} km / ${dur}`,
        rainPlanInline: ' · Plan pluie',
        exploreShort: (c) => `Explorer ${c}`,
        collapsePanelAria: 'Réduire le panneau carte',
        expandPanelAria: 'Développer le panneau carte',
        selectMultiDayAria: 'Choisir les jours affichés',
        onlyCity: (c) => `${c} uniquement`,
        allDays: 'Tous les jours',
        routeReorderedSaved: (km, pct) => `Parcours optimisé · -${km} km (-${pct}%)`,
        orderUpdated: 'Ordre mis à jour',
        compareLine: 'Comparer',
        undoReorder: 'Annuler',
      },
    },
    'de-DE': {
      canvas2d: {
        viewStopDetails: 'Details ansehen',
        hotelStay: 'Unterkunft',
        centeredGps: 'Auf aktuellen GPS-Standort zentriert',
        outsideCityFitted: (city) => `Außerhalb von ${city} · Alle Tagesstopps im Blick`,
        fittedAllStops: 'Alle Stopps eingepasst',
        emptyPrompt: (scope) => `${scope} · Stopps hinzufügen für Kartenansicht & Route`,
        holdOrRightClickHint: 'Gedrückt halten oder Rechtsklick für neuen Stopp',
        dismissTip: 'Hinweis schließen',
        fitOrLocateTitle: 'Alle Stopps zeigen / Mein Standort',
        fitOrLocateAria: 'Alle Stopps oder Standort zeigen',
        switchToStreet: 'Zur Straßenkarte wechseln',
        switchToSatellite: 'Zur Satellitenansicht wechseln',
        toggleSatelliteAria: 'Satellitenkarte umschalten',
        exitMultiDay: 'Mehrtagesansicht verlassen',
        showMultiDay: 'Mehrtages-Route anzeigen',
        toggleMultiDayAria: 'Mehrtages-Route umschalten',
        spanAndTapHint: (km) => `~${km} km Spanne · Zweimal tippen für Details`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h} Std. ${m} Min.`,
        formatMinsOnly: (m) => `${m} Min.`,
        formatHoursOnly: (h) => `${h} Std.`,
        travelModes: {
          walking: 'Zu Fuß',
          transit: 'ÖPNV',
          driving: 'Auto / Taxi',
        },
        skeletonAria: (c) => `Lade Karte und Route für ${c}`,
        skeletonTitle: (c) => `Lade Karte & Route für ${c}...`,
        skeletonStops: (n) => ` · ${n} Stopp${n === 1 ? '' : 's'}`,
        scopeCity: (s) => `${s} · Stadt`,
        destinationCity: 'Zielstadt',
        stopsAndMode: (n, mode) => `${n} Stopp${n === 1 ? '' : 's'} · ${mode}`,
        noStopsToday: 'Heute noch keine Stopps',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'Live-Kartenkacheln nicht verfügbar — interaktive Routenkarte aktiv. Tippe unten auf einen Stopp für Adresse & Navigation.',
        unconfiguredDesc:
          'Google Maps Schlüssel fehlt · Interaktive Routenübersicht aktiv — Stopps antippen für Adressen & Google Maps.',
        multiDayRouteBtn: (n) => `Mehrtagesroute (${n} Stopps)`,
        cityFullRouteBtn: (c, n) => `${c} Gesamtroute (${n} Stopps)`,
        directionsToBtn: (t) => `Route zu ${t}`,
        copiedRoute: 'Route kopiert',
        copyRoute: 'Route kopieren',
        emptyOverviewTitle: (d, c) => `Tag ${d} · ${c} Übersicht bereit`,
        emptyOverviewDesc:
          'Füge Stopps hinzu oder nutze die KI-Tagesplanung für eine interaktive Karte samt Navigation.',
        schematicAria: (c) => `Interaktives Routenschema für ${c}`,
        inspectStopAria: (o, t) => `Stopp ${o} ansehen: ${t}`,
        previousStopAria: 'Vorheriger Stopp',
        nextStopAria: 'Nächster Stopp',
        stopFraction: (o, t) => `Stopp ${o}/${t}`,
        indoorRainBackup: 'Indoor-Regenplan',
        fromStopDirections: (o) => `Ab Stopp ${o}`,
        directionsShort: 'Navigation',
        findPin: 'Auf Karte',
        copiedShort: 'Kopiert',
        copyAddress: 'Adresse kopieren',
        viewStopDetails: 'Details ansehen',
        placesErrorNotice:
          'Koordinaten konnten nicht ermittelt werden (Places API oder Netzwerk prüfen). Routenvergleich und Maps-Links funktionieren weiterhin.',
        over27StopsNotice:
          'Über 27 Stopps gewählt — Anzeige als sequenzielle Mehrtageslinie.',
        noStreetRouteNotice:
          'Keine Straßenroute zwischen Stopps gefunden — gestrichelte Linie aktiv.',
        routesUnavailableNotice:
          'Live-Routendienst nicht erreichbar — zeige sequenzielle Linie & geschätzte Distanz.',
        loadingTilesStage: (c) => `Lade 2D-Karte für ${c}...`,
        loadingStopsStage: (n, s, c) =>
          `Verorte ${n} Stopp${n === 1 ? '' : 's'} für ${s} (${c})...`,
        rightClickHint: 'Rechtsklick auf Karte zum Hinzufügen',
        dismissTip: 'Schließen',
        fitAllTitle: 'Alle Stopps einpassen',
        fitAllAria: 'Alle Stopps zeigen',
        switchTo2dStreet: 'Zur 2D-Straßenkarte',
        switchTo2dSatellite: 'Zur 2D-Satellitenansicht',
        streetMapAria: 'Straßenkarte',
        satelliteMapAria: 'Satellitenkarte',
        exitMultiDayPreview: 'Mehrtagesvorschau beenden',
        showMultiDayPreview: 'Mehrtagesroute verbinden',
        toggleMultiDayAria: 'Mehrtagesroute umschalten',
        sectionAria: (s) => `${s} Google Maps Route & Navigation`,
        multiDayHeading: (d) => `Mehrtägig · ${d}`,
        stopsInline: (n) => `· ${n} Stopp${n === 1 ? '' : 's'}`,
        cityMapInline: '· Stadtkarte',
        summaryDistDur: (km, dur) => ` · ~${km} km / ${dur}`,
        rainPlanInline: ' · Regenplan',
        exploreShort: (c) => `${c} ansehen`,
        collapsePanelAria: 'Kartenfeld einklappen',
        expandPanelAria: 'Kartenfeld ausklappen',
        selectMultiDayAria: 'Tage für Mehrtagesroute wählen',
        onlyCity: (c) => `Nur ${c}`,
        allDays: 'Alle Tage',
        routeReorderedSaved: (km, pct) => `Optimiert · ~${km} km gespart (-${pct}%)`,
        orderUpdated: 'Reihenfolge aktualisiert',
        compareLine: 'Vergleichslinie',
        undoReorder: 'Rückgängig',
      },
    },
    'pt-BR': {
      canvas2d: {
        viewStopDetails: 'Ver detalhes',
        hotelStay: 'Hospedagem',
        centeredGps: 'Centralizado na sua localização GPS',
        outsideCityFitted: (city) => `Você está fora de ${city} · Paradas ajustadas no mapa`,
        fittedAllStops: 'Todas as paradas enquadradas',
        emptyPrompt: (scope) => `${scope} · Adicione paradas para ver cartões e rota no mapa`,
        holdOrRightClickHint: 'Segure ou clique com botão direito para adicionar parada',
        dismissTip: 'Fechar dica',
        fitOrLocateTitle: 'Enquadrar paradas / Minha localização',
        fitOrLocateAria: 'Enquadrar paradas ou localizar',
        switchToStreet: 'Mudar para mapa de ruas',
        switchToSatellite: 'Mudar para vista de satélite',
        toggleSatelliteAria: 'Alternar camada de satélite',
        exitMultiDay: 'Sair da visão de vários dias',
        showMultiDay: 'Ver rota conectada de vários dias',
        toggleMultiDayAria: 'Alternar rota de vários dias',
        spanAndTapHint: (km) => `Distância ~${km} km · Toque duas vezes para detalhes`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h}h ${m}min`,
        formatMinsOnly: (m) => `${m} min`,
        formatHoursOnly: (h) => `${h}h`,
        travelModes: {
          walking: 'A pé',
          transit: 'Transporte',
          driving: 'Carro / Táxi',
        },
        skeletonAria: (c) => `Carregando mapa e rota de ${c}`,
        skeletonTitle: (c) => `Carregando mapa e rota de ${c}...`,
        skeletonStops: (n) => ` · ${n} parada${n === 1 ? '' : 's'}`,
        scopeCity: (s) => `${s} · Cidade`,
        destinationCity: 'Cidade de destino',
        stopsAndMode: (n, mode) => `${n} parada${n === 1 ? '' : 's'} · ${mode}`,
        noStopsToday: 'Nenhuma parada hoje',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'Mapa ao vivo indisponível — alternado para o cartão interativo. Toque em uma parada abaixo para ver o endereço ou abrir rotas.',
        unconfiguredDesc:
          'Chave do Google Maps não configurada · Esquema interativo pronto — toque em uma parada para ver o endereço e abrir o Google Maps.',
        multiDayRouteBtn: (n) => `Rota vários dias (${n} paradas)`,
        cityFullRouteBtn: (c, n) => `Rota em ${c} (${n} paradas)`,
        directionsToBtn: (t) => `Rotas para ${t}`,
        copiedRoute: 'Rota copiada',
        copyRoute: 'Copiar rota',
        emptyOverviewTitle: (d, c) => `Dia ${d} · Visão de ${c} pronta`,
        emptyOverviewDesc:
          'Adicione paradas ou use a IA para gerar a rota interativa do dia e abrir direções em 1 toque.',
        schematicAria: (c) => `Esquema interativo da rota em ${c}`,
        inspectStopAria: (o, t) => `Ver parada ${o}: ${t}`,
        previousStopAria: 'Parada anterior',
        nextStopAria: 'Próxima parada',
        stopFraction: (o, t) => `Parada ${o}/${t}`,
        indoorRainBackup: 'Plano coberto de chuva',
        fromStopDirections: (o) => `Da parada ${o}`,
        directionsShort: 'Rotas',
        findPin: 'Ver pino',
        copiedShort: 'Copiado',
        copyAddress: 'Copiar endereço',
        viewStopDetails: 'Ver detalhes',
        placesErrorNotice:
          'Não foi possível obter as coordenadas agora (verifique Places API ou conexão). Você ainda pode comparar e abrir o Google Maps.',
        over27StopsNotice:
          'Mais de 27 paradas selecionadas — exibindo linha sequencial de vários dias.',
        noStreetRouteNotice:
          'Nenhuma rota viária encontrada — alternado para linha tracejada sequencial.',
        routesUnavailableNotice:
          'Serviço de rotas ao vivo indisponível — exibindo linha sequencial e distância estimada.',
        loadingTilesStage: (c) => `Carregando mapa 2D de ${c}...`,
        loadingStopsStage: (n, s, c) =>
          `Localizando ${n} parada${n === 1 ? '' : 's'} para ${s} (${c})...`,
        rightClickHint: 'Clique com botão direito no mapa para adicionar local',
        dismissTip: 'Fechar dica',
        fitAllTitle: 'Enquadrar todas as paradas',
        fitAllAria: 'Enquadrar paradas',
        switchTo2dStreet: 'Mudar para mapa de ruas 2D',
        switchTo2dSatellite: 'Mudar para satélite 2D',
        streetMapAria: 'Mapa de ruas',
        satelliteMapAria: 'Mapa satélite',
        exitMultiDayPreview: 'Sair da prévia de vários dias',
        showMultiDayPreview: 'Ver rota de vários dias conectada',
        toggleMultiDayAria: 'Alternar rota de vários dias',
        sectionAria: (s) => `${s} Rota e navegação no Google Maps`,
        multiDayHeading: (d) => `Vários dias · ${d}`,
        stopsInline: (n) => `· ${n} parada${n === 1 ? '' : 's'}`,
        cityMapInline: '· Mapa da cidade',
        summaryDistDur: (km, dur) => ` · ~${km} km / ${dur}`,
        rainPlanInline: ' · Plano chuva',
        exploreShort: (c) => `Explorar ${c}`,
        collapsePanelAria: 'Recolher painel do mapa',
        expandPanelAria: 'Expandir painel do mapa',
        selectMultiDayAria: 'Selecionar dias da rota',
        onlyCity: (c) => `Só ${c}`,
        allDays: 'Todos os dias',
        routeReorderedSaved: (km, pct) => `Rota otimizada · Economia ~${km} km (-${pct}%)`,
        orderUpdated: 'Ordem atualizada',
        compareLine: 'Comparar linha',
        undoReorder: 'Desfazer',
      },
    },
    'ja-JP': {
      canvas2d: {
        viewStopDetails: '詳細を見る',
        hotelStay: '宿泊ホテル',
        centeredGps: '現在地の GPS に移動しました',
        outsideCityFitted: (city) => `${city} 圏外のため当日の全スポットを表示しました`,
        fittedAllStops: '全スポットを画面内に収めました',
        emptyPrompt: (scope) => `${scope} · スポットを追加すると地図カードとルートが表示されます`,
        holdOrRightClickHint: '地図を長押しまたは右クリックでスポット追加',
        dismissTip: 'ヒントを閉じる',
        fitOrLocateTitle: '全体表示 / 現在地へ',
        fitOrLocateAria: '全体表示または現在地へ移動',
        switchToStreet: '通常地図に切替',
        switchToSatellite: '衛星写真に切替',
        toggleSatelliteAria: '衛星表示を切替',
        exitMultiDay: '複数日表示を終了',
        showMultiDay: '複数日ルートを連結表示',
        toggleMultiDayAria: '複数日ルート切替',
        spanAndTapHint: (km) => `移動距離 約 ${km} km · カードを2回タップで詳細`,
      },
      panel: {
        formatHoursMins: (h, m) => `${h}時間${m}分`,
        formatMinsOnly: (m) => `${m}分`,
        formatHoursOnly: (h) => `${h}時間`,
        travelModes: {
          walking: '徒歩ルート',
          transit: '電車・バス',
          driving: '車・タクシー',
        },
        skeletonAria: (c) => `${c} の地図とルートを読み込み中`,
        skeletonTitle: (c) => `${c} の地図とルートを読み込み中...`,
        skeletonStops: (n) => ` · 全 ${n} ヶ所`,
        scopeCity: (s) => `${s} · 都市`,
        destinationCity: '目的地',
        stopsAndMode: (n, mode) => `${n} ヶ所 · ${mode}`,
        noStopsToday: '本日のスポットは未登録',
        mapLoadError: 'The map could not load.',
        mapRetry: 'Retry',
        sdkFailedDesc:
          'オンライン地図を利用できないため、インタラクティブルートカードに切り替えました。下の各スポットをタップして住所確認やナビを起動できます。',
        unconfiguredDesc:
          'Google Maps キー未設定 · インタラクティブルート図が有効です。各スポットから住所確認や Google マップ起動が可能です。',
        multiDayRouteBtn: (n) => `複数日ルート (${n}ヶ所)`,
        cityFullRouteBtn: (c, n) => `${c} 全行程ナビ (${n}ヶ所)`,
        directionsToBtn: (t) => `${t} への経路`,
        copiedRoute: 'コピー済',
        copyRoute: 'ルートをコピー',
        emptyOverviewTitle: (d, c) => `Day ${d} · ${c} 概要マップ`,
        emptyOverviewDesc:
          'スポットを追加するか「AI 自動生成」を使うと、インタラクティブなルート図とワンタップナビが生成されます。',
        schematicAria: (c) => `${c} インタラクティブルート図`,
        inspectStopAria: (o, t) => `スポット ${o}: ${t} を確認`,
        previousStopAria: '前のスポット',
        nextStopAria: '次のスポット',
        stopFraction: (o, t) => `${o} / ${t} 番目`,
        indoorRainBackup: '雨天屋内代替',
        fromStopDirections: (o) => `${o}番目から移動`,
        directionsShort: '経路案内',
        findPin: '位置を見る',
        copiedShort: 'コピー済',
        copyAddress: '住所をコピー',
        viewStopDetails: '詳細を見る',
        placesErrorNotice:
          '現在スポットの座標を取得できません（Places API 権限や通信をご確認ください）。下のルート図から比較・マップ起動は利用できます。',
        over27StopsNotice:
          '27ヶ所を超える複数日スポットが選択されたため、順番の連結ラインで全体表示しています。',
        noStreetRouteNotice:
          'スポット間の道路ルートが見つからず、順番の点線ルートに切り替えました。',
        routesUnavailableNotice:
          'ルート API が利用できないため、順番ラインと推定距離を表示しています。',
        loadingTilesStage: (c) => `${c} の 2D 地図を読み込み中...`,
        loadingStopsStage: (n, s, c) => `${s}（${c}）の ${n} ヶ所を測位中...`,
        rightClickHint: '地図を右クリックしてスポットを追加',
        dismissTip: '閉じる',
        fitAllTitle: '全スポットを画面に収める',
        fitAllAria: '全体表示',
        switchTo2dStreet: '2D 地図に切替',
        switchTo2dSatellite: '2D 衛星写真に切替',
        streetMapAria: '通常地図',
        satelliteMapAria: '衛星写真',
        exitMultiDayPreview: '複数日プレビューを閉じる',
        showMultiDayPreview: '複数日連結ルートを表示',
        toggleMultiDayAria: '複数日プレビュー切替',
        sectionAria: (s) => `${s} Google マップルート・ナビ`,
        multiDayHeading: (d) => `複数日 · ${d}`,
        stopsInline: (n) => `· ${n} ヶ所`,
        cityMapInline: '· 都市マップ',
        summaryDistDur: (km, dur) => ` · 約 ${km} km / ${dur}`,
        rainPlanInline: ' · 雨天対策済',
        exploreShort: (c) => `${c} を見る`,
        collapsePanelAria: '地図パネルを閉じる',
        expandPanelAria: '地図パネルを開く',
        selectMultiDayAria: '表示する日程を選択',
        onlyCity: (c) => `${c} のみ`,
        allDays: 'すべての日',
        routeReorderedSaved: (km, pct) => `ルート最適化 · 約 ${km} km 短縮 (-${pct}%)`,
        orderUpdated: '順番を更新しました',
        compareLine: '元のルート比較',
        undoReorder: '元に戻す',
      },
    },
  });
}

import { pickLang, type LangMap8 } from '../langHelper';
import type { AppLanguage, CoverPresetId, CoverToneId, TripTaskCategory } from '../../types';

// 1. SettingsMapPreviewCard
export interface MapPreviewCopy {
  defaultCity: string;
  placesNoMatch: (query: string) => string;
  mapPlacesRoutesOk: (name: string) => string;
  mapPlacesRoutesFallback: (name: string) => string;
  mapPlacesOnlyOk: (name: string) => string;
  placesFailedMsg: string;
  standardModeNotice: string;
  cardTitle: string;
  connectedSub: string;
  standardSub: string;
  hidePreviewBtn: string;
  refreshPreviewBtn: string;
  previewMapBtn: string;
  openMapsBtn: string;
}

const MAP_PREVIEW_PACK: LangMap8<MapPreviewCopy> = {
  'zh-CN': {
    defaultCity: '巴黎',
    placesNoMatch: (q) => `Places API 已连接，但未匹配到「${q}」的坐标。`,
    mapPlacesRoutesOk: (n) => `缩略地图已加载（${n} · Maps JS / Places / Routes 均响应正常）。`,
    mapPlacesRoutesFallback: (n) =>
      `缩略地图与 Places 定位已加载（${n}）；Routes API 折线暂未连通，行程页会自动降级为虚线连线。`,
    mapPlacesOnlyOk: (n) => `缩略地图与 Places 定位已加载（${n}）。`,
    placesFailedMsg:
      '缩略地图底图已尝试加载，但 Places API (New) 查询未通过；请检查密钥权限、HTTP Referrer 限制或网络连通性。',
    standardModeNotice:
      '当前处于标准导航模式，内嵌缩略图暂未开启；所有站点的「Google 地图导航」按钮均可一键跳转使用。',
    cardTitle: '交互式路线地图',
    connectedSub: '已就绪 · 支持地点智能联想与实时交通测算',
    standardSub: '标准模式 · 支持一键唤起外部 Google 地图导航',
    hidePreviewBtn: '收起预览',
    refreshPreviewBtn: '刷新预览',
    previewMapBtn: '预览地图',
    openMapsBtn: '打开 Google 地图',
  },
  'en-US': {
    defaultCity: 'Paris',
    placesNoMatch: (q) => `Places API connected, but no coordinates were matched for "${q}".`,
    mapPlacesRoutesOk: (n) => `Thumbnail map loaded (${n} · Maps JS / Places / Routes OK).`,
    mapPlacesRoutesFallback: (n) =>
      `Map & Places loaded (${n}); Routes polyline unavailable, so the itinerary falls back to dashed lines.`,
    mapPlacesOnlyOk: (n) => `Map & Places location loaded (${n}).`,
    placesFailedMsg:
      'Map tiles attempted to load, but Places API (New) failed. Check API key permissions, HTTP referrer restrictions, or connectivity.',
    standardModeNotice:
      'Standard navigation mode is active. Embedded map tiles are off, while one-tap Google Maps navigation links work across all stops.',
    cardTitle: 'Interactive Route Maps',
    connectedSub: 'Connected · Place search & live transit ready',
    standardSub: 'Standard mode · One-tap Google Maps navigation links',
    hidePreviewBtn: 'Hide Preview',
    refreshPreviewBtn: 'Refresh Preview',
    previewMapBtn: 'Preview Map',
    openMapsBtn: 'Open in Google Maps',
  },
  'es-MX': {
    defaultCity: 'París',
    placesNoMatch: (q) => `Places API conectada, pero no se hallaron coordenadas para "${q}".`,
    mapPlacesRoutesOk: (n) => `Mapa cargado (${n} · Maps JS / Places / Routes OK).`,
    mapPlacesRoutesFallback: (n) =>
      `Mapa y Places cargados (${n}); la ruta detallada no respondió, se usarán líneas punteadas.`,
    mapPlacesOnlyOk: (n) => `Mapa y ubicación de Places cargados (${n}).`,
    placesFailedMsg:
      'Se intentó cargar el mapa, pero Places API (New) falló. Revisa permisos de clave, restricciones HTTP o conexión.',
    standardModeNotice:
      'Modo de navegación estándar activo. El mapa integrado está apagado, pero los enlaces a Google Maps funcionan en cada parada.',
    cardTitle: 'Mapas interactivos de ruta',
    connectedSub: 'Conectado · Búsqueda de lugares y tránsito en vivo listos',
    standardSub: 'Modo estándar · Enlaces directos a Google Maps',
    hidePreviewBtn: 'Ocultar vista',
    refreshPreviewBtn: 'Actualizar vista',
    previewMapBtn: 'Previsualizar mapa',
    openMapsBtn: 'Abrir en Google Maps',
  },
  'fr-FR': {
    defaultCity: 'Paris',
    placesNoMatch: (q) => `Places API connectée, mais aucune coordonnée trouvée pour « ${q} ».`,
    mapPlacesRoutesOk: (n) => `Carte chargée (${n} · Maps JS / Places / Routes OK).`,
    mapPlacesRoutesFallback: (n) =>
      `Carte et Places chargés (${n}) ; Routes indisponible, l’itinéraire utilisera des lignes pointillées.`,
    mapPlacesOnlyOk: (n) => `Carte et position Places chargées (${n}).`,
    placesFailedMsg:
      'Les tuiles ont tenté de charger, mais Places API (New) a échoué. Vérifiez la clé API, les restrictions HTTP ou la connexion.',
    standardModeNotice:
      'Mode navigation standard actif. La carte intégrée est désactivée, mais les liens Google Maps restent actifs partout.',
    cardTitle: 'Cartes d’itinéraire interactives',
    connectedSub: 'Connecté · Recherche de lieux et trajets prêts',
    standardSub: 'Mode standard · Liens directs vers Google Maps',
    hidePreviewBtn: 'Masquer l’aperçu',
    refreshPreviewBtn: 'Actualiser',
    previewMapBtn: 'Aperçu carte',
    openMapsBtn: 'Ouvrir dans Google Maps',
  },
  'de-DE': {
    defaultCity: 'Paris',
    placesNoMatch: (q) => `Places API verbunden, aber keine Koordinaten für „${q}“ gefunden.`,
    mapPlacesRoutesOk: (n) => `Vorschaukarte geladen (${n} · Maps JS / Places / Routes OK).`,
    mapPlacesRoutesFallback: (n) =>
      `Karte & Places geladen (${n}); Routes nicht verfügbar, der Reiseplan nutzt gestrichelte Linien.`,
    mapPlacesOnlyOk: (n) => `Karte & Places-Position geladen (${n}).`,
    placesFailedMsg:
      'Kartenkacheln wurden geladen, aber Places API (New) ist fehlgeschlagen. Prüfe API-Schlüsselrechte oder HTTP-Referrer.',
    standardModeNotice:
      'Standard-Navigationsmodus aktiv. Eingebettete Karten sind aus, Google-Maps-Links funktionieren bei allen Stopps.',
    cardTitle: 'Interaktive Routenkarten',
    connectedSub: 'Verbunden · Ortssuche & Live-ÖPNV bereit',
    standardSub: 'Standardmodus · Direkte Google-Maps-Links',
    hidePreviewBtn: 'Ausblenden',
    refreshPreviewBtn: 'Aktualisieren',
    previewMapBtn: 'Kartenvorschau',
    openMapsBtn: 'In Google Maps öffnen',
  },
  'pt-BR': {
    defaultCity: 'Paris',
    placesNoMatch: (q) => `Places API conectada, mas sem coordenadas encontradas para "${q}".`,
    mapPlacesRoutesOk: (n) => `Mapa carregado (${n} · Maps JS / Places / Routes OK).`,
    mapPlacesRoutesFallback: (n) =>
      `Mapa e Places carregados (${n}); Routes indisponível, o roteiro usará linhas tracejadas.`,
    mapPlacesOnlyOk: (n) => `Mapa e local do Places carregados (${n}).`,
    placesFailedMsg:
      'Os blocos do mapa tentaram carregar, mas a Places API (New) falhou. Verifique permissões da chave ou conexão.',
    standardModeNotice:
      'Modo de navegação padrão ativo. O mapa embutido está desativado, mas os links do Google Maps funcionam em todas as paradas.',
    cardTitle: 'Mapas interativos de rota',
    connectedSub: 'Conectado · Busca de locais e rotas ao vivo prontas',
    standardSub: 'Modo padrão · Links diretos para o Google Maps',
    hidePreviewBtn: 'Ocultar prévia',
    refreshPreviewBtn: 'Atualizar prévia',
    previewMapBtn: 'Visualizar mapa',
    openMapsBtn: 'Abrir no Google Maps',
  },
  'ja-JP': {
    defaultCity: 'パリ',
    placesNoMatch: (q) => `Places API に接続しましたが、「${q}」の座標が見つかりませんでした。`,
    mapPlacesRoutesOk: (n) => `プレビュー地図を読み込みました（${n} · Maps JS / Places / Routes 正常）。`,
    mapPlacesRoutesFallback: (n) =>
      `地図と Places 測位を読み込みました（${n}）。Routes API 未接続のため行程では破線表示になります。`,
    mapPlacesOnlyOk: (n) => `地図と Places 測位を読み込みました（${n}）。`,
    placesFailedMsg:
      '地図タイルの読み込みを試行しましたが Places API (New) が失敗しました。APIキー権限や接続を確認してください。',
    standardModeNotice:
      '現在は標準ナビモードです。埋め込み地図はオフですが、各スポットの Google マップリンクはそのまま使えます。',
    cardTitle: 'インタラクティブルート地図',
    connectedSub: '接続済み · スポット検索・経路計算に対応',
    standardSub: '標準モード · 外部 Google マップへワンタップ起動',
    hidePreviewBtn: 'プレビューを閉じる',
    refreshPreviewBtn: '再読み込み',
    previewMapBtn: '地図プレビュー',
    openMapsBtn: 'Google マップを開く',
  },
};

export function getMapPreviewCopy(lang: AppLanguage): MapPreviewCopy {
  return pickLang(lang, MAP_PREVIEW_PACK);
}

// 2. TripCoverModal & tripCoverHelpers
export interface TripCoverCopy {
  invalidImageToast: string;
  processFailedToast: string;
  coverUpdatedToast: string;
  saveFailedToast: string;
  dialogAria: string;
  modalTitle: string;
  modalSubtitle: string;
  closeAria: string;
  framingPct: (pct: number) => string;
  dragRepositionHint: string;
  centerBtn: string;
  optimizingPhoto: string;
  replaceCustomPhoto: string;
  choosePhotoBtn: string;
  useUploadedBtn: string;
  removeCustomTitle: string;
  landscapesHeading: string;
  autoMatchBtn: string;
  toneHeading: string;
  cancelBtn: string;
  applyCoverBtn: string;
  unnamedDestination: string;
  monthsShort: string[];
  presets: Record<CoverPresetId, { label: string; subtitle: string }>;
  tones: Record<CoverToneId, string>;
}

const TRIP_COVER_PACK: LangMap8<TripCoverCopy> = {
  'zh-CN': {
    invalidImageToast: '请选择有效的图片文件',
    processFailedToast: '图片读取失败，请换一张照片试试',
    coverUpdatedToast: '已更新行程风景封面',
    saveFailedToast: '保存封面失败，请重试',
    dialogAria: '更换行程风景封面',
    modalTitle: '更换行程封面',
    modalSubtitle: '选择精选目的地风景或从相册上传 · 上下拖动预览图可微调构图',
    closeAria: '关闭',
    framingPct: (pct) => `构图焦点 ${pct}%`,
    dragRepositionHint: '上下拖动调整构图',
    centerBtn: '居中',
    optimizingPhoto: '正在优化照片...',
    replaceCustomPhoto: '更换已上传的相册照片',
    choosePhotoBtn: '从手机相册 / 本地上传自定义照片',
    useUploadedBtn: '使用我的照片',
    removeCustomTitle: '移除自定义照片',
    landscapesHeading: '精选目的地风景库',
    autoMatchBtn: '按地点自动匹配',
    toneHeading: '封面光影色调',
    cancelBtn: '取消',
    applyCoverBtn: '保存封面',
    unnamedDestination: '未命名目的地',
    monthsShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    presets: {
      europe_classic: { label: '塞纳暮色', subtitle: '巴黎 · 欧洲古典天际线' },
      canal_autumn: { label: '运河金秋', subtitle: '阿姆斯特丹 · 欧陆水岸' },
      japan_fuji: { label: '富士晨樱', subtitle: '东京 · 京都 · 日韩山湖' },
      tropical_coast: { label: '蔚蓝海岸', subtitle: '海岛 · 地中海 · 阳光沙滩' },
      alpine_peaks: { label: '雪山冰湖', subtitle: '瑞士 · 户外徒步 · 自然秘境' },
      modern_metropolis: { label: '港湾蓝调', subtitle: '现代都市 · 商务与夜景' },
    },
    tones: {
      natural: '原片自然',
      golden: '暖金黄昏',
      forest: '胶片森系',
      azure: '清透蔚蓝',
      noir: '电影暗调',
    },
  },
  'en-US': {
    invalidImageToast: 'Please choose a valid image file',
    processFailedToast: 'Could not process this image. Try another photo.',
    coverUpdatedToast: 'Trip cover updated',
    saveFailedToast: 'Failed to save cover image',
    dialogAria: 'Customize Trip Cover',
    modalTitle: 'Customize Trip Cover',
    modalSubtitle: 'Pick a destination landscape or upload your own photo · Drag preview to frame',
    closeAria: 'Close',
    framingPct: (pct) => `Framing ${pct}%`,
    dragRepositionHint: 'Drag up/down to reposition',
    centerBtn: 'Center',
    optimizingPhoto: 'Optimizing photo...',
    replaceCustomPhoto: 'Replace Custom Photo',
    choosePhotoBtn: 'Choose Photo from Album / Device',
    useUploadedBtn: 'Use Uploaded',
    removeCustomTitle: 'Remove custom photo',
    landscapesHeading: 'Destination Landscapes',
    autoMatchBtn: 'Auto-match destination',
    toneHeading: 'Atmosphere & Contrast Tone',
    cancelBtn: 'Cancel',
    applyCoverBtn: 'Apply Cover',
    unnamedDestination: 'Destination',
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    presets: {
      europe_classic: { label: 'Seine Twilight', subtitle: 'Paris & European Rooftops' },
      canal_autumn: { label: 'Autumn Canal', subtitle: 'Amsterdam & Historic Canals' },
      japan_fuji: { label: 'Fuji Dawn', subtitle: 'Japan & East Asia Scenery' },
      tropical_coast: { label: 'Azure Coast', subtitle: 'Islands & Coastal Sunset' },
      alpine_peaks: { label: 'Alpine Lake', subtitle: 'Alps, Fjords & Nature' },
      modern_metropolis: { label: 'Harbor Dusk', subtitle: 'Cosmopolitan Skyline' },
    },
    tones: {
      natural: 'Natural',
      golden: 'Golden Hour',
      forest: 'Film Sage',
      azure: 'Crisp Azure',
      noir: 'Cinema Dark',
    },
  },
  'en-GB': {
    invalidImageToast: 'Please choose a valid image file',
    processFailedToast: 'Could not process this image. Try another photo.',
    coverUpdatedToast: 'Trip cover updated',
    saveFailedToast: 'Failed to save cover image',
    dialogAria: 'Customise Trip Cover',
    modalTitle: 'Customise Trip Cover',
    modalSubtitle: 'Pick a destination landscape or upload your own photo · Drag preview to frame',
    closeAria: 'Close',
    framingPct: (pct) => `Framing ${pct}%`,
    dragRepositionHint: 'Drag up/down to reposition',
    centerBtn: 'Centre',
    optimizingPhoto: 'Optimising photo...',
    replaceCustomPhoto: 'Replace Custom Photo',
    choosePhotoBtn: 'Choose Photo from Album / Device',
    useUploadedBtn: 'Use Uploaded',
    removeCustomTitle: 'Remove custom photo',
    landscapesHeading: 'Destination Landscapes',
    autoMatchBtn: 'Auto-match destination',
    toneHeading: 'Atmosphere & Contrast Tone',
    cancelBtn: 'Cancel',
    applyCoverBtn: 'Apply Cover',
    unnamedDestination: 'Destination',
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    presets: {
      europe_classic: { label: 'Seine Twilight', subtitle: 'Paris & European Rooftops' },
      canal_autumn: { label: 'Autumn Canal', subtitle: 'Amsterdam & Historic Canals' },
      japan_fuji: { label: 'Fuji Dawn', subtitle: 'Japan & East Asia Scenery' },
      tropical_coast: { label: 'Azure Coast', subtitle: 'Islands & Coastal Sunset' },
      alpine_peaks: { label: 'Alpine Lake', subtitle: 'Alps, Fjords & Nature' },
      modern_metropolis: { label: 'Harbor Dusk', subtitle: 'Cosmopolitan Skyline' },
    },
    tones: {
      natural: 'Natural',
      golden: 'Golden Hour',
      forest: 'Film Sage',
      azure: 'Crisp Azure',
      noir: 'Cinema Dark',
    },
  },
  'es-MX': {
    invalidImageToast: 'Elige un archivo de imagen válido',
    processFailedToast: 'No se pudo procesar la imagen. Prueba otra foto.',
    coverUpdatedToast: 'Portada del viaje actualizada',
    saveFailedToast: 'No se pudo guardar la imagen de portada',
    dialogAria: 'Personalizar portada del viaje',
    modalTitle: 'Personalizar portada',
    modalSubtitle: 'Elige un paisaje o sube tu foto · Arrastra para encuadrar',
    closeAria: 'Cerrar',
    framingPct: (pct) => `Encuadre ${pct}%`,
    dragRepositionHint: 'Arrastra arriba/abajo para ajustar',
    centerBtn: 'Centrar',
    optimizingPhoto: 'Optimizando foto...',
    replaceCustomPhoto: 'Cambiar foto personalizada',
    choosePhotoBtn: 'Elegir foto del álbum o dispositivo',
    useUploadedBtn: 'Usar subida',
    removeCustomTitle: 'Quitar foto personalizada',
    landscapesHeading: 'Paisajes de destino',
    autoMatchBtn: 'Ajustar al destino',
    toneHeading: 'Ambiente y contraste',
    cancelBtn: 'Cancelar',
    applyCoverBtn: 'Aplicar portada',
    unnamedDestination: 'Destino',
    monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    presets: {
      europe_classic: { label: 'Crepúsculo Sena', subtitle: 'París y tejados europeos' },
      canal_autumn: { label: 'Canal otoñal', subtitle: 'Ámsterdam y canales históricos' },
      japan_fuji: { label: 'Amanecer Fuji', subtitle: 'Japón y paisajes de Asia' },
      tropical_coast: { label: 'Costa azul', subtitle: 'Islas y atardecer costero' },
      alpine_peaks: { label: 'Lago alpino', subtitle: 'Alpes, fiordos y naturaleza' },
      modern_metropolis: { label: 'Puerto nocturno', subtitle: 'Horizonte cosmopolita' },
    },
    tones: {
      natural: 'Natural',
      golden: 'Hora dorada',
      forest: 'Verde cine',
      azure: 'Azul nítido',
      noir: 'Cine oscuro',
    },
  },
  'fr-FR': {
    invalidImageToast: 'Veuillez choisir un fichier image valide',
    processFailedToast: 'Impossible de traiter cette image. Essayez une autre photo.',
    coverUpdatedToast: 'Couverture du voyage mise à jour',
    saveFailedToast: 'Échec de l’enregistrement de la couverture',
    dialogAria: 'Personnaliser la couverture',
    modalTitle: 'Personnaliser la couverture',
    modalSubtitle: 'Choisissez un paysage ou importez votre photo · Glissez pour cadrer',
    closeAria: 'Fermer',
    framingPct: (pct) => `Cadrage ${pct}%`,
    dragRepositionHint: 'Glissez haut/bas pour recadrer',
    centerBtn: 'Centrer',
    optimizingPhoto: 'Optimisation...',
    replaceCustomPhoto: 'Remplacer la photo',
    choosePhotoBtn: 'Choisir une photo sur l’appareil',
    useUploadedBtn: 'Utiliser ma photo',
    removeCustomTitle: 'Supprimer la photo personnalisée',
    landscapesHeading: 'Paysages de destination',
    autoMatchBtn: 'Selon la destination',
    toneHeading: 'Ambiance et contraste',
    cancelBtn: 'Annuler',
    applyCoverBtn: 'Appliquer',
    unnamedDestination: 'Destination',
    monthsShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    presets: {
      europe_classic: { label: 'Crépuscule Seine', subtitle: 'Paris & toits européens' },
      canal_autumn: { label: 'Canal d’automne', subtitle: 'Amsterdam & canaux historiques' },
      japan_fuji: { label: 'Aube sur le Fuji', subtitle: 'Japon & paysages d’Asie' },
      tropical_coast: { label: 'Côte d’Azur', subtitle: 'Îles & couchers de soleil' },
      alpine_peaks: { label: 'Lac alpin', subtitle: 'Alpes, fjords & nature' },
      modern_metropolis: { label: 'Port crépusculaire', subtitle: 'Skyline cosmopolite' },
    },
    tones: {
      natural: 'Naturel',
      golden: 'Heure dorée',
      forest: 'Sauge film',
      azure: 'Azur pur',
      noir: 'Cinéma sombre',
    },
  },
  'de-DE': {
    invalidImageToast: 'Bitte wähle eine gültige Bilddatei',
    processFailedToast: 'Bild konnte nicht verarbeitet werden. Bitte anderes Foto wählen.',
    coverUpdatedToast: 'Reisecover aktualisiert',
    saveFailedToast: 'Cover konnte nicht gespeichert werden',
    dialogAria: 'Reisecover anpassen',
    modalTitle: 'Reisecover anpassen',
    modalSubtitle: 'Reiseziel-Landschaft wählen oder eigenes Foto hochladen · Ziehen zum Ausrichten',
    closeAria: 'Schließen',
    framingPct: (pct) => `Ausschnitt ${pct}%`,
    dragRepositionHint: 'Hoch/runter ziehen zum Positionieren',
    centerBtn: 'Zentrieren',
    optimizingPhoto: 'Optimiere Foto...',
    replaceCustomPhoto: 'Eigenes Foto ersetzen',
    choosePhotoBtn: 'Foto vom Gerät / Album wählen',
    useUploadedBtn: 'Eigenes nutzen',
    removeCustomTitle: 'Eigenes Foto entfernen',
    landscapesHeading: 'Reiseziel-Motive',
    autoMatchBtn: 'Passend zum Ziel',
    toneHeading: 'Stimmung & Farbton',
    cancelBtn: 'Abbrechen',
    applyCoverBtn: 'Übernehmen',
    unnamedDestination: 'Reiseziel',
    monthsShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    presets: {
      europe_classic: { label: 'Seine-Abendrot', subtitle: 'Paris & Europas Dächer' },
      canal_autumn: { label: 'Herbstkanal', subtitle: 'Amsterdam & Grachten' },
      japan_fuji: { label: 'Fuji-Morgen', subtitle: 'Japan & Ostasien' },
      tropical_coast: { label: 'Azurküste', subtitle: 'Inseln & Küsten-Sonnenuntergang' },
      alpine_peaks: { label: 'Alpensee', subtitle: 'Alpen, Fjorde & Natur' },
      modern_metropolis: { label: 'Hafen-Dämmerung', subtitle: 'Urbane Skyline' },
    },
    tones: {
      natural: 'Natürlich',
      golden: 'Goldene Stunde',
      forest: 'Film-Salbei',
      azure: 'Klares Azur',
      noir: 'Kino-Dunkel',
    },
  },
  'pt-BR': {
    invalidImageToast: 'Escolha um arquivo de imagem válido',
    processFailedToast: 'Não foi possível processar esta imagem. Tente outra foto.',
    coverUpdatedToast: 'Capa da viagem atualizada',
    saveFailedToast: 'Falha ao salvar a imagem de capa',
    dialogAria: 'Personalizar capa da viagem',
    modalTitle: 'Personalizar capa',
    modalSubtitle: 'Escolha uma paisagem ou envie sua foto · Arraste para enquadrar',
    closeAria: 'Fechar',
    framingPct: (pct) => `Enquadramento ${pct}%`,
    dragRepositionHint: 'Arraste para cima/baixo',
    centerBtn: 'Centralizar',
    optimizingPhoto: 'Otimizando foto...',
    replaceCustomPhoto: 'Trocar foto enviada',
    choosePhotoBtn: 'Escolher foto do álbum / aparelho',
    useUploadedBtn: 'Usar enviada',
    removeCustomTitle: 'Remover foto personalizada',
    landscapesHeading: 'Paisagens de destino',
    autoMatchBtn: 'Combinar com destino',
    toneHeading: 'Atmosfera e tom',
    cancelBtn: 'Cancelar',
    applyCoverBtn: 'Aplicar capa',
    unnamedDestination: 'Destino',
    monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    presets: {
      europe_classic: { label: 'Crepúsculo Sena', subtitle: 'Paris e telhados europeus' },
      canal_autumn: { label: 'Canal de outono', subtitle: 'Amsterdã e canais históricos' },
      japan_fuji: { label: 'Amanhecer Fuji', subtitle: 'Japão e paisagens da Ásia' },
      tropical_coast: { label: 'Costa azul', subtitle: 'Ilhas e pôr do sol costeiro' },
      alpine_peaks: { label: 'Lago alpino', subtitle: 'Alpes, fiordes e natureza' },
      modern_metropolis: { label: 'Porto ao anoitecer', subtitle: 'Horizonte cosmopolita' },
    },
    tones: {
      natural: 'Natural',
      golden: 'Hora dourada',
      forest: 'Sálvia filme',
      azure: 'Azul nítido',
      noir: 'Cinema escuro',
    },
  },
  'ja-JP': {
    invalidImageToast: '有効な画像ファイルを選択してください',
    processFailedToast: '画像を読み込めませんでした。別の写真をお試しください。',
    coverUpdatedToast: '旅行カバーを更新しました',
    saveFailedToast: 'カバー画像の保存に失敗しました',
    dialogAria: '旅行カバーを変更',
    modalTitle: '旅行カバーを変更',
    modalSubtitle: 'おすすめの風景を選ぶかアルバムから選択 · 上下ドラッグで位置調整',
    closeAria: '閉じる',
    framingPct: (pct) => `位置調整 ${pct}%`,
    dragRepositionHint: '上下にドラッグして調整',
    centerBtn: '中央に戻す',
    optimizingPhoto: '写真を最適化中...',
    replaceCustomPhoto: 'アップロード写真を変更',
    choosePhotoBtn: '写真アルバム / 端末から選択',
    useUploadedBtn: '自分の写真を使う',
    removeCustomTitle: 'カスタム写真を削除',
    landscapesHeading: '厳選風景ライブラリ',
    autoMatchBtn: '目的地に自動一致',
    toneHeading: '色調・ムード調整',
    cancelBtn: 'キャンセル',
    applyCoverBtn: 'カバーを保存',
    unnamedDestination: '未設定の目的地',
    monthsShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    presets: {
      europe_classic: { label: 'セーヌの黄昏', subtitle: 'パリ・欧州の街並み' },
      canal_autumn: { label: '運河の秋色', subtitle: 'アムステルダム・水辺風景' },
      japan_fuji: { label: '富士と朝桜', subtitle: '東京・京都・日本の山湖' },
      tropical_coast: { label: '紺碧の海岸', subtitle: 'リゾート・地中海・砂浜' },
      alpine_peaks: { label: '雪山と氷河湖', subtitle: 'スイス・トレッキング・秘境' },
      modern_metropolis: { label: '港湾ブルー', subtitle: '現代都市・夜景とビジネス' },
    },
    tones: {
      natural: 'ナチュラル',
      golden: 'ゴールデン',
      forest: 'フィルム深緑',
      azure: 'クリアブルー',
      noir: 'シネマ暗調',
    },
  },
};

export function getTripCoverCopy(lang: AppLanguage): TripCoverCopy {
  return pickLang(lang, TRIP_COVER_PACK);
}

// 3. TripTasksModal
export interface TaskQuickTemplate {
  label: string;
  title: string;
  category: TripTaskCategory;
  timing: string;
  note: string;
}

export interface TripTasksModalCopy {
  extraTemplates: TaskQuickTemplate[];
  addedCountToast: (n: number) => string;
  aiUnavailable: string;
  defaultTiming: string;
  addedSingleSuccess: (title: string) => string;
  modalTitle: string;
  doneProgress: (done: number, total: number) => string;
  tabList: (pending: number) => string;
  tabTemplates: string;
  tabAdd: string;
  filterAria: string;
  browseTemplatesBtn: string;
  tweakBtn: string;
  addedBtn: string;
  addBtn: string;
  voiceAddLabel: string;
  aiAddBtn: string;
  manualDetailsLabel: string;
  assignToLabel: string;
}

const TRIP_TASKS_MODAL_PACK: LangMap8<TripTasksModalCopy> = {
  'zh-CN': {
    extraTemplates: [
      {
        label: '网上值机选座',
        title: '办理航空公司网上值机并保存电子登机牌',
        category: '交通接送',
        timing: '起飞前 24h',
        note: '提前锁定靠窗/过道座位并将二维码存入行程离线票夹',
      },
      {
        label: '下载离线地图',
        title: '下载目的地城市离线地图包与翻译包',
        category: '通讯金融',
        timing: '出发前 1 天',
        note: '地铁地下及老城区弱网环境依然可顺畅导航',
      },
      {
        label: '信用卡境外开通',
        title: '确认信用卡境外交易限额与芯片密码',
        category: '通讯金融',
        timing: '出发前 3 天',
        note: '避免境外自助购票机刷卡风控拦截',
      },
    ],
    addedCountToast: (n) => `已智能解析并添加 ${n} 项待办`,
    aiUnavailable: 'AI 解析待办暂时不可用',
    defaultTiming: '出发前',
    addedSingleSuccess: (t) => `已添加待办：「${t}」`,
    modalTitle: '行前待办事项',
    doneProgress: (d, tot) => `· ${d}/${tot} 已完成`,
    tabList: (p) => `待办列表 (${p})`,
    tabTemplates: '常用模板',
    tabAdd: '新增待办',
    filterAria: '待办状态筛选',
    browseTemplatesBtn: '查看常用模板',
    tweakBtn: '微调',
    addedBtn: '已加入',
    addBtn: '加入',
    voiceAddLabel: '一句话 / 语音智能拆解待办',
    aiAddBtn: 'AI 解析',
    manualDetailsLabel: '手动填写待办明细',
    assignToLabel: '负责人：',
  },
  'en-US': {
    extraTemplates: [
      {
        label: 'Online Check-In',
        title: 'Complete airline online check-in & seat selection',
        category: '交通接送',
        timing: '24h before flight',
        note: 'Save mobile boarding pass to offline Passes wallet',
      },
      {
        label: 'Offline Maps',
        title: 'Download Google Maps offline city regions',
        category: '通讯金融',
        timing: 'Before departure',
        note: 'Navigate subway & alleys smoothly without cellular signal',
      },
      {
        label: 'Card Travel Notice',
        title: 'Enable overseas card transactions & check PIN',
        category: '通讯金融',
        timing: '3 days before',
        note: 'Avoid fraud blocks at train ticket machines & tolls',
      },
    ],
    addedCountToast: (n) => `Added ${n} to-do item(s)`,
    aiUnavailable: 'AI task parsing is temporarily unavailable',
    defaultTiming: 'Before departure',
    addedSingleSuccess: (t) => `Added "${t}"`,
    modalTitle: 'Pre-Trip To-Dos',
    doneProgress: (d, tot) => `· ${d}/${tot} done`,
    tabList: (p) => `To-Dos (${p})`,
    tabTemplates: 'Templates',
    tabAdd: 'New To-Do',
    filterAria: 'Filter to-dos',
    browseTemplatesBtn: 'Browse Templates',
    tweakBtn: 'Tweak',
    addedBtn: 'Added',
    addBtn: 'Add',
    voiceAddLabel: 'Smart Voice / One-Sentence Add',
    aiAddBtn: 'AI Add',
    manualDetailsLabel: 'Manual To-Do Details',
    assignToLabel: 'Assign to:',
  },
  'es-MX': {
    extraTemplates: [
      {
        label: 'Check-in en línea',
        title: 'Hacer check-in en línea y elegir asiento',
        category: '交通接送',
        timing: '24 h antes del vuelo',
        note: 'Guarda el pase de abordar en la cartera sin conexión',
      },
      {
        label: 'Mapas sin conexión',
        title: 'Descargar zonas de Google Maps sin conexión',
        category: '通讯金融',
        timing: 'Antes de salir',
        note: 'Navega en metro y callejones sin señal móvil',
      },
      {
        label: 'Aviso de viaje tarjeta',
        title: 'Activar uso internacional de tarjeta y revisar NIP',
        category: '通讯金融',
        timing: '3 días antes',
        note: 'Evita bloqueos en máquinas de boletos y peajes',
      },
    ],
    addedCountToast: (n) => `${n} pendiente(s) agregado(s)`,
    aiUnavailable: 'El análisis de tareas con IA no está disponible',
    defaultTiming: 'Antes de salir',
    addedSingleSuccess: (t) => `Agregado "${t}"`,
    modalTitle: 'Pendientes antes del viaje',
    doneProgress: (d, tot) => `· ${d}/${tot} listas`,
    tabList: (p) => `Pendientes (${p})`,
    tabTemplates: 'Plantillas',
    tabAdd: 'Nuevo pendiente',
    filterAria: 'Filtrar pendientes',
    browseTemplatesBtn: 'Ver plantillas',
    tweakBtn: 'Ajustar',
    addedBtn: 'Agregado',
    addBtn: 'Agregar',
    voiceAddLabel: 'Agregar por voz o en una frase',
    aiAddBtn: 'Agregar IA',
    manualDetailsLabel: 'Detalles manuales',
    assignToLabel: 'Asignar a:',
  },
  'fr-FR': {
    extraTemplates: [
      {
        label: 'Enregistrement en ligne',
        title: 'Effectuer l’enregistrement en ligne et choisir les sièges',
        category: '交通接送',
        timing: '24h avant le vol',
        note: 'Enregistrez la carte d’embarquement dans le porte-billets hors ligne',
      },
      {
        label: 'Cartes hors ligne',
        title: 'Télécharger les cartes Google Maps hors connexion',
        category: '通讯金融',
        timing: 'Avant le départ',
        note: 'Naviguez dans le métro et les ruelles sans réseau mobile',
      },
      {
        label: 'Plafond carte étranger',
        title: 'Activer les paiements à l’étranger et vérifier le code PIN',
        category: '通讯金融',
        timing: '3 jours avant',
        note: 'Évitez les blocages aux bornes de billets de train',
      },
    ],
    addedCountToast: (n) => `${n} tâche(s) ajoutée(s)`,
    aiUnavailable: 'L’analyse IA des tâches est indisponible',
    defaultTiming: 'Avant le départ',
    addedSingleSuccess: (t) => `Ajouté : « ${t} »`,
    modalTitle: 'Tâches avant le départ',
    doneProgress: (d, tot) => `· ${d}/${tot} faites`,
    tabList: (p) => `Tâches (${p})`,
    tabTemplates: 'Modèles',
    tabAdd: 'Nouvelle tâche',
    filterAria: 'Filtrer les tâches',
    browseTemplatesBtn: 'Voir les modèles',
    tweakBtn: 'Ajuster',
    addedBtn: 'Ajouté',
    addBtn: 'Ajouter',
    voiceAddLabel: 'Ajout vocal ou en une phrase',
    aiAddBtn: 'Ajout IA',
    manualDetailsLabel: 'Saisie manuelle',
    assignToLabel: 'Attribuer à :',
  },
  'de-DE': {
    extraTemplates: [
      {
        label: 'Online-Check-in',
        title: 'Online-Check-in & Sitzplatzwahl abschließen',
        category: '交通接送',
        timing: '24 Std. vor Abflug',
        note: 'Mobile Bordkarte in die Offline-Brieftasche speichern',
      },
      {
        label: 'Offline-Karten',
        title: 'Google-Maps-Offlinekarten für die Zielstadt laden',
        category: '通讯金融',
        timing: 'Vor Abreise',
        note: 'Navigation in U-Bahn und Altstadt auch ohne Netz',
      },
      {
        label: 'Karten-Reiseinfo',
        title: 'Auslandszahlung der Kreditkarte & PIN prüfen',
        category: '通讯金融',
        timing: '3 Tage vorher',
        note: 'Verhindert Sperrungen an Fahrkartenautomaten',
      },
    ],
    addedCountToast: (n) => `${n} Aufgabe(n) hinzugefügt`,
    aiUnavailable: 'KI-Aufgabenanalyse vorübergehend nicht verfügbar',
    defaultTiming: 'Vor Abreise',
    addedSingleSuccess: (t) => `Hinzugefügt: „${t}“`,
    modalTitle: 'Reise-To-dos vorab',
    doneProgress: (d, tot) => `· ${d}/${tot} erledigt`,
    tabList: (p) => `To-dos (${p})`,
    tabTemplates: 'Vorlagen',
    tabAdd: 'Neues To-do',
    filterAria: 'To-dos filtern',
    browseTemplatesBtn: 'Vorlagen ansehen',
    tweakBtn: 'Anpassen',
    addedBtn: 'Hinzugefügt',
    addBtn: 'Hinzufügen',
    voiceAddLabel: 'Per Sprache oder einem Satz hinzufügen',
    aiAddBtn: 'KI-Hinzufügen',
    manualDetailsLabel: 'Manuelle Eingabe',
    assignToLabel: 'Zuweisen an:',
  },
  'pt-BR': {
    extraTemplates: [
      {
        label: 'Check-in online',
        title: 'Fazer check-in online da companhia aérea e escolher assento',
        category: '交通接送',
        timing: '24h antes do voo',
        note: 'Salve o cartão de embarque na carteira offline de passes',
      },
      {
        label: 'Mapas offline',
        title: 'Baixar regiões offline no Google Maps',
        category: '通讯金融',
        timing: 'Antes da partida',
        note: 'Navegue no metrô e ruelas sem sinal de celular',
      },
      {
        label: 'Aviso de viagem cartão',
        title: 'Habilitar uso no exterior do cartão e conferir senha',
        category: '通讯金融',
        timing: '3 dias antes',
        note: 'Evite bloqueios em totens de trem e pedágios',
      },
    ],
    addedCountToast: (n) => `${n} tarefa(s) adicionada(s)`,
    aiUnavailable: 'Análise de tarefas por IA indisponível no momento',
    defaultTiming: 'Antes da partida',
    addedSingleSuccess: (t) => `Adicionado "${t}"`,
    modalTitle: 'Tarefas pré-viagem',
    doneProgress: (d, tot) => `· ${d}/${tot} concluídas`,
    tabList: (p) => `Tarefas (${p})`,
    tabTemplates: 'Modelos',
    tabAdd: 'Nova tarefa',
    filterAria: 'Filtrar tarefas',
    browseTemplatesBtn: 'Ver modelos',
    tweakBtn: 'Ajustar',
    addedBtn: 'Adicionado',
    addBtn: 'Adicionar',
    voiceAddLabel: 'Adicionar por voz ou em uma frase',
    aiAddBtn: 'IA Adicionar',
    manualDetailsLabel: 'Detalhes manuais',
    assignToLabel: 'Atribuir a:',
  },
  'ja-JP': {
    extraTemplates: [
      {
        label: 'オンラインチェックイン',
        title: '航空会社のオンラインチェックインと座席指定を完了',
        category: '交通接送',
        timing: '出発 24時間前',
        note: 'モバイル搭乗券をオフラインパスフォルダへ保存',
      },
      {
        label: 'オフライン地図',
        title: 'Google マップの現地オフラインエリアを事前保存',
        category: '通讯金融',
        timing: '出発前日まで',
        note: '地下鉄や路地裏の弱電波エリアでもスムーズに案内',
      },
      {
        label: 'カード海外利用設定',
        title: 'クレジットカードの海外利用枠と暗証番号を確認',
        category: '通讯金融',
        timing: '出発 3日前',
        note: '現地の券売機でのセキュリティロックを防止',
      },
    ],
    addedCountToast: (n) => `${n} 件のタスクを追加しました`,
    aiUnavailable: 'AI タスク解析は現在利用できません',
    defaultTiming: '出発前',
    addedSingleSuccess: (t) => `「${t}」を追加しました`,
    modalTitle: '出発前タスク',
    doneProgress: (d, tot) => `· ${d}/${tot} 完了`,
    tabList: (p) => `タスク (${p})`,
    tabTemplates: '定番テンプレ',
    tabAdd: '新規追加',
    filterAria: 'タスク状態で絞り込み',
    browseTemplatesBtn: 'テンプレートを見る',
    tweakBtn: '調整',
    addedBtn: '追加済み',
    addBtn: '追加',
    voiceAddLabel: '一言・音声でスマートタスク追加',
    aiAddBtn: 'AI 解析',
    manualDetailsLabel: '手動でタスク詳細を入力',
    assignToLabel: '担当者：',
  },
};

export function getTripTasksModalCopy(lang: AppLanguage): TripTasksModalCopy {
  return pickLang(lang, TRIP_TASKS_MODAL_PACK);
}

// 4. notificationScheduler
export interface NotificationSchedulerCopy {
  dueNow: (clock: string) => string;
  inMins: (m: number, clock: string) => string;
  inHoursMins: (h: number, m: number, clock: string) => string;
  inHours: (h: number, clock: string) => string;
  dayFirstDate: boolean;
  upcomingStopTitle: (lead: number, title: string) => string;
  upcomingStopBody: (day: number, clock: string, district: string, note: string) => string;
  eveningMeetupTitle: (lead: number, place: string) => string;
  eveningMeetupBody: (day: number, clock: string, addr: string) => string;
  listSep: string;
  moreItemsSuffix: (extra: number) => string;
  packingDeadlineTitle: (count: number) => string;
  packingDeadlineBody: (preview: string, extra: string) => string;
  packingMorningTitle: (count: number) => string;
  packingMorningBody: (preview: string) => string;
  customItineraryTitle: (title: string) => string;
  customPackingTitle: (title: string) => string;
  customItineraryBody: (routeTitle: string) => string;
  customPackingBody: (title: string) => string;
}

const NOTIFICATION_SCHEDULER_PACK: LangMap8<NotificationSchedulerCopy> = {
  'zh-CN': {
    dueNow: (c) => `已到点 · ${c}`,
    inMins: (m, c) => `${m}分钟后 · ${c}`,
    inHoursMins: (h, m, c) => `${h}小时${m}分后 · ${c}`,
    inHours: (h, c) => `${h}小时后 · ${c}`,
    dayFirstDate: false,
    upcomingStopTitle: (lead, t) => `行程站点提醒（提前 ${lead} 分钟）：${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Day ${day} · ${clock} · ${dist}。${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `晚间汇合提醒（${lead} 分钟后）：${place}`,
    eveningMeetupBody: (day, clock, addr) => `Day ${day} · ${clock} 集合 · ${addr}`,
    listSep: '、',
    moreItemsSuffix: (n) => ` 等 ${n} 件`,
    packingDeadlineTitle: (n) => `打包截止提醒：还有 ${n} 件物品待装箱`,
    packingDeadlineBody: (p, e) => `待装清单：${p}${e}`,
    packingMorningTitle: (n) => `出发早晨必带核对：还有 ${n} 件临行物品未装`,
    packingMorningBody: (p) => `拔插头装入随身包：${p}`,
    customItineraryTitle: (t) => `行程提醒：${t}`,
    customPackingTitle: (t) => `行前截止提醒：${t}`,
    customItineraryBody: (r) => `${r} · 已到预约提醒时间`,
    customPackingBody: (t) => `请按时完成「${t}」筹备事项`,
  },
  'en-US': {
    dueNow: (c) => `Due now · ${c}`,
    inMins: (m, c) => `in ${m}m · ${c}`,
    inHoursMins: (h, m, c) => `in ${h}h ${m}m · ${c}`,
    inHours: (h, c) => `in ${h}h · ${c}`,
    dayFirstDate: false,
    upcomingStopTitle: (lead, t) => `Upcoming Stop (${lead}m): ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Day ${day} · ${clock} at ${dist}. ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Evening Meetup in ${lead}m: ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Day ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} more)`,
    packingDeadlineTitle: (n) => `Packing Deadline: ${n} item(s) left to pack`,
    packingDeadlineBody: (p, e) => `Don't forget: ${p}${e}`,
    packingMorningTitle: (n) => `Departure-Morning Check: ${n} last-minute essential(s)`,
    packingMorningBody: (p) => `Unplug & pack into your carry-on: ${p}`,
    customItineraryTitle: (t) => `Itinerary Reminder: ${t}`,
    customPackingTitle: (t) => `Packing / Prep Deadline: ${t}`,
    customItineraryBody: (r) => `Scheduled alert for ${r}`,
    customPackingBody: (t) => `Time to complete "${t}" before departure`,
  },
  'en-GB': {
    dueNow: (c) => `Due now · ${c}`,
    inMins: (m, c) => `in ${m}m · ${c}`,
    inHoursMins: (h, m, c) => `in ${h}h ${m}m · ${c}`,
    inHours: (h, c) => `in ${h}h · ${c}`,
    dayFirstDate: true,
    upcomingStopTitle: (lead, t) => `Upcoming Stop (${lead}m): ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Day ${day} · ${clock} at ${dist}. ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Evening Meetup in ${lead}m: ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Day ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} more)`,
    packingDeadlineTitle: (n) => `Packing Deadline: ${n} item(s) left to pack`,
    packingDeadlineBody: (p, e) => `Don't forget: ${p}${e}`,
    packingMorningTitle: (n) => `Departure-Morning Check: ${n} last-minute essential(s)`,
    packingMorningBody: (p) => `Unplug & pack into your cabin bag: ${p}`,
    customItineraryTitle: (t) => `Itinerary Reminder: ${t}`,
    customPackingTitle: (t) => `Packing / Prep Deadline: ${t}`,
    customItineraryBody: (r) => `Scheduled alert for ${r}`,
    customPackingBody: (t) => `Time to complete "${t}" before departure`,
  },
  'es-MX': {
    dueNow: (c) => `Ahora · ${c}`,
    inMins: (m, c) => `en ${m}m · ${c}`,
    inHoursMins: (h, m, c) => `en ${h}h ${m}m · ${c}`,
    inHours: (h, c) => `en ${h}h · ${c}`,
    dayFirstDate: true,
    upcomingStopTitle: (lead, t) => `Próxima parada (${lead}m): ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Día ${day} · ${clock} en ${dist}. ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Encuentro nocturno en ${lead}m: ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Día ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} más)`,
    packingDeadlineTitle: (n) => `Plazo de equipaje: faltan ${n} artículo(s)`,
    packingDeadlineBody: (p, e) => `No olvides: ${p}${e}`,
    packingMorningTitle: (n) => `Revisión de salida: ${n} esencial(es) de último minuto`,
    packingMorningBody: (p) => `Desconecta y guarda en tu equipaje de mano: ${p}`,
    customItineraryTitle: (t) => `Recordatorio de ruta: ${t}`,
    customPackingTitle: (t) => `Plazo de equipaje / preparación: ${t}`,
    customItineraryBody: (r) => `Alerta programada para ${r}`,
    customPackingBody: (t) => `Hora de completar "${t}" antes de salir`,
  },
  'fr-FR': {
    dueNow: (c) => `Maintenant · ${c}`,
    inMins: (m, c) => `dans ${m} min · ${c}`,
    inHoursMins: (h, m, c) => `dans ${h}h${String(m).padStart(2, '0')} · ${c}`,
    inHours: (h, c) => `dans ${h}h · ${c}`,
    dayFirstDate: true,
    upcomingStopTitle: (lead, t) => `Prochaine étape (${lead} min) : ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Jour ${day} · ${clock} (${dist}). ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Rendez-vous du soir dans ${lead} min : ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Jour ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} autres)`,
    packingDeadlineTitle: (n) => `Échéance valise : encore ${n} article(s) à ranger`,
    packingDeadlineBody: (p, e) => `N’oubliez pas : ${p}${e}`,
    packingMorningTitle: (n) => `Matin du départ : ${n} essentiel(s) de dernière minute`,
    packingMorningBody: (p) => `Débranchez et mettez en bagage cabine : ${p}`,
    customItineraryTitle: (t) => `Rappel itinéraire : ${t}`,
    customPackingTitle: (t) => `Échéance préparation : ${t}`,
    customItineraryBody: (r) => `Alerte planifiée pour ${r}`,
    customPackingBody: (t) => `Pensez à finaliser « ${t} » avant le départ`,
  },
  'de-DE': {
    dueNow: (c) => `Jetzt fällig · ${c}`,
    inMins: (m, c) => `in ${m} Min. · ${c}`,
    inHoursMins: (h, m, c) => `in ${h} Std. ${m} Min. · ${c}`,
    inHours: (h, c) => `in ${h} Std. · ${c}`,
    dayFirstDate: true,
    upcomingStopTitle: (lead, t) => `Nächster Stopp (${lead} Min.): ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Tag ${day} · ${clock} in ${dist}. ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Abend-Treff in ${lead} Min.: ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Tag ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} weitere)`,
    packingDeadlineTitle: (n) => `Pack-Frist: Noch ${n} Artikel einzupacken`,
    packingDeadlineBody: (p, e) => `Nicht vergessen: ${p}${e}`,
    packingMorningTitle: (n) => `Abreisemorgen-Check: ${n} Last-Minute-Teil(e)`,
    packingMorningBody: (p) => `Ausstecken & ins Handgepäck: ${p}`,
    customItineraryTitle: (t) => `Reiseplan-Erinnerung: ${t}`,
    customPackingTitle: (t) => `Pack-/Vorbereitungs-Frist: ${t}`,
    customItineraryBody: (r) => `Geplante Erinnerung für ${r}`,
    customPackingBody: (t) => `Zeit für „${t}“ vor der Abreise`,
  },
  'pt-BR': {
    dueNow: (c) => `Agora · ${c}`,
    inMins: (m, c) => `em ${m}m · ${c}`,
    inHoursMins: (h, m, c) => `em ${h}h ${m}m · ${c}`,
    inHours: (h, c) => `em ${h}h · ${c}`,
    dayFirstDate: true,
    upcomingStopTitle: (lead, t) => `Próxima parada (${lead}m): ${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Dia ${day} · ${clock} em ${dist}. ${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `Encontro da noite em ${lead}m: ${place}`,
    eveningMeetupBody: (day, clock, addr) => `Dia ${day} · ${clock} · ${addr}`,
    listSep: ', ',
    moreItemsSuffix: (n) => ` (+${n} mais)`,
    packingDeadlineTitle: (n) => `Prazo da mala: falta(m) ${n} item(ns)`,
    packingDeadlineBody: (p, e) => `Não esqueça: ${p}${e}`,
    packingMorningTitle: (n) => `Manhã da viagem: ${n} item(ns) de última hora`,
    packingMorningBody: (p) => `Desconecte e leve na bagagem de mão: ${p}`,
    customItineraryTitle: (t) => `Lembrete de roteiro: ${t}`,
    customPackingTitle: (t) => `Prazo pré-viagem: ${t}`,
    customItineraryBody: (r) => `Alerta agendado para ${r}`,
    customPackingBody: (t) => `Hora de concluir "${t}" antes de partir`,
  },
  'ja-JP': {
    dueNow: (c) => `通知時刻 · ${c}`,
    inMins: (m, c) => `${m}分後 · ${c}`,
    inHoursMins: (h, m, c) => `${h}時間${m}分後 · ${c}`,
    inHours: (h, c) => `${h}時間後 · ${c}`,
    dayFirstDate: false,
    upcomingStopTitle: (lead, t) => `まもなく予定（${lead}分前）：${t}`,
    upcomingStopBody: (day, clock, dist, note) =>
      `Day ${day} · ${clock} · ${dist}。${note}`.trim(),
    eveningMeetupTitle: (lead, place) => `夜の集合リマインダー（${lead}分前）：${place}`,
    eveningMeetupBody: (day, clock, addr) => `Day ${day} · ${clock} 集合 · ${addr}`,
    listSep: '、',
    moreItemsSuffix: (n) => ` ほか ${n} 点`,
    packingDeadlineTitle: (n) => `荷造り締切：残り ${n} 点のアイテムがあります`,
    packingDeadlineBody: (p, e) => `未梱包リスト：${p}${e}`,
    packingMorningTitle: (n) => `出発当日の朝チェック：直前アイテム ${n} 点`,
    packingMorningBody: (p) => `コンセントから抜いて機内バッグへ：${p}`,
    customItineraryTitle: (t) => `行程リマインダー：${t}`,
    customPackingTitle: (t) => `出発前リマインダー：${t}`,
    customItineraryBody: (r) => `${r} · 予約したリマインド時刻になりました`,
    customPackingBody: (t) => `出発前に「${t}」を済ませましょう`,
  },
};

export function getNotificationSchedulerCopy(lang: AppLanguage): NotificationSchedulerCopy {
  return pickLang(lang, NOTIFICATION_SCHEDULER_PACK);
}

// 5. speechHelpers
export interface SpeechHelpersCopy {
  shoppingExpense: string;
  dailyExpense: string;
  highlightStop: (city: string) => string;
  districtCenter: (city: string) => string;
  defaultTransitNote: (time: string) => string;
}

const SPEECH_HELPERS_PACK: LangMap8<SpeechHelpersCopy> = {
  'zh-CN': {
    shoppingExpense: '购物消费',
    dailyExpense: '日常消费',
    highlightStop: (city) => `${city} 精选站点`,
    districtCenter: (city) => `${city} 核心区`,
    defaultTransitNote: (t) => `建议按 ${t} 前往，使用公共交通或步行衔接`,
  },
  'en-US': {
    shoppingExpense: 'Shopping Expense',
    dailyExpense: 'Daily Expense',
    highlightStop: (city) => `${city} Highlight Stop`,
    districtCenter: (city) => `${city} Center`,
    defaultTransitNote: (t) => `Plan to arrive around ${t} via public transit or on foot`,
  },
  'en-GB': {
    shoppingExpense: 'Shopping Expense',
    dailyExpense: 'Daily Expense',
    highlightStop: (city) => `${city} Highlight Stop`,
    districtCenter: (city) => `${city} City Centre`,
    defaultTransitNote: (t) => `Plan to arrive around ${t} via public transport or on foot`,
  },
  'es-MX': {
    shoppingExpense: 'Gasto de compras',
    dailyExpense: 'Gasto diario',
    highlightStop: (city) => `Parada destacada en ${city}`,
    districtCenter: (city) => `Centro de ${city}`,
    defaultTransitNote: (t) => `Llega alrededor de las ${t} en transporte público o a pie`,
  },
  'fr-FR': {
    shoppingExpense: 'Dépense shopping',
    dailyExpense: 'Dépense courante',
    highlightStop: (city) => `Étape clé à ${city}`,
    districtCenter: (city) => `Centre de ${city}`,
    defaultTransitNote: (t) => `Prévoir d’arriver vers ${t} en transports ou à pied`,
  },
  'de-DE': {
    shoppingExpense: 'Shopping-Ausgabe',
    dailyExpense: 'Tägliche Ausgabe',
    highlightStop: (city) => `Highlight-Stopp in ${city}`,
    districtCenter: (city) => `${city} Zentrum`,
    defaultTransitNote: (t) => `Ankunft gegen ${t} Uhr per ÖPNV oder zu Fuß einplanen`,
  },
  'pt-BR': {
    shoppingExpense: 'Despesa de compras',
    dailyExpense: 'Despesa diária',
    highlightStop: (city) => `Parada destaque em ${city}`,
    districtCenter: (city) => `Centro de ${city}`,
    defaultTransitNote: (t) => `Planeje chegar por volta das ${t} de transporte público ou a pé`,
  },
  'ja-JP': {
    shoppingExpense: 'ショッピング支出',
    dailyExpense: '日常支出',
    highlightStop: (city) => `${city} おすすめスポット`,
    districtCenter: (city) => `${city} 中心エリア`,
    defaultTransitNote: (t) => `${t} 頃に公共交通機関または徒歩で到着予定`,
  },
};

export function getSpeechHelpersCopy(lang: AppLanguage): SpeechHelpersCopy {
  return pickLang(lang, SPEECH_HELPERS_PACK);
}

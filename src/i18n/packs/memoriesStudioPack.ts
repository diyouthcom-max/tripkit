import { pickLang, type LangMap8 } from '../langHelper';
import type {
  AppLanguage,
  PhotobookBindingId,
  PhotobookFormatId,
  PhotobookOrderStatus,
  PhotobookTemplateId,
} from '../../types';

// 1. MemoriesView
export interface MemoriesViewCopy {
  multiTripTitleFallback: (firstCity: string) => string;
  singleTripTitleFallback: string;
  chapterFallbackTitle: (idx: number) => string;
  daysSuffix: string;
  defaultNarrativeIntro: string;
  stopsRecordedSuffix: (n: number) => string;
  stopsShortSuffix: (n: number) => string;
  defaultSubtitle: (tripCount: number) => string;
  defaultEpigraph: string;
  defaultColophon: string;
  indexedNativeToast: (count: number) => string;
  permissionDeniedToast: string;
  openingLocalToast: string;
  indexedLocalToast: (count: number) => string;
  loadedSamplesToast: (count: number) => string;
  removedToast: string;
  tripsMergedLabel: (count: number) => string;
  currentTripFallback: string;
  selectTripsHint: string;
  doneBtn: string;
  allFilter: (count: number) => string;
  inBookFilter: (count: number) => string;
  gridMode: string;
  mapMode: string;
  indexTripPhotosBtn: string;
  aiPhotobookBtn: string;
  printOrdersBtn: string;
  emptyHeadline: string;
  emptyDesc: string;
  indexAllBtn: string;
  trySamplesBtn: string;
  privacyFootnotes: string;
  mapHeading: string;
  mapSub: (photoCount: number, tripCount: number) => string;
  previewBookBtn: string;
  photosIndexedLabel: (n: number) => string;
  photosShortLabel: (n: number) => string;
  includedInBookTitle: string;
  addToBookTitle: string;
  readyToPrintTitle: (favCount: number, pageCount: number) => string;
  readyToPrintDesc: string;
  openStudioBtn: string;
  removePhotoBtn: string;
  tripChapterLabel: string;
  dayStopTitleLabel: string;
  memoryNoteLabel: string;
  memoryNotePlaceholder: string;
}

const MEMORIES_VIEW_PACK: LangMap8<MemoriesViewCopy> = {
  'zh-CN': {
    multiTripTitleFallback: (c) => `${c || '远方'}与多段旅途纪行`,
    singleTripTitleFallback: '旅途光影纪念册',
    chapterFallbackTitle: (i) => `第 ${i} 章`,
    daysSuffix: '天',
    defaultNarrativeIntro: '沿着提前规划好的街区与站点，把每一天的天气、风景与同行记忆装订成册。',
    stopsRecordedSuffix: (n) => `${n} 个行程站点记录`,
    stopsShortSuffix: (n) => `${n} 个行程站点`,
    defaultSubtitle: (n) => `收录 ${n} 段行程 · 300DPI 典藏印刷版`,
    defaultEpigraph: '那些走过的路与看过的光影，值得印在纸上被重新看见。',
    defaultColophon: '由 Trip Kit 本地隐私索引生成 · 采用无酸艺术纸 300DPI 高清印制。',
    indexedNativeToast: (n) => `已在本地按行程日期自动索引 ${n} 张照片`,
    permissionDeniedToast: '未开启系统相册读取权限，请在手机设置中授权',
    openingLocalToast: '正在打开本地相册选择...',
    indexedLocalToast: (n) => `已在设备本地完成 ${n} 张照片 EXIF 日期与站点匹配（零云端上传）`,
    loadedSamplesToast: (n) => `已按当前行程站点载入 ${n} 张高清示例照片，可直接体验 AI 排版与印刷！`,
    removedToast: '已从本地回忆索引中移除',
    tripsMergedLabel: (n) => `已合并 ${n} 段行程入册`,
    currentTripFallback: '当前行程',
    selectTripsHint: '可勾选多段行程合并排版成一本画册',
    doneBtn: '完成',
    allFilter: (n) => `全部 (${n})`,
    inBookFilter: (n) => `★ 入册 (${n})`,
    gridMode: '网格',
    mapMode: '地图',
    indexTripPhotosBtn: '+ 索引行程照片',
    aiPhotobookBtn: 'AI 排版纪念册',
    printOrdersBtn: '印制订单',
    emptyHeadline: '那些旅行，值得被重新看见',
    emptyDesc:
      '回忆会按你已记录的多段行程日期与站点坐标自动整理。Trip Kit 只会在本地索引回忆照片，索引过程不会将照片上传至云服务器。生成实体旅行故事书时，只有你同意 AI 分析后，精选缩略图才会发送给 AI 排版服务。',
    indexAllBtn: '索引全部行程照片',
    trySamplesBtn: '载入示例照片体验排版与印刷',
    privacyFootnotes: '本地 EXIF 时间与坐标自动归档 · 300DPI 印刷清晰度校验 · 支持精装画册付费印制',
    mapHeading: '旅行记忆坐标足迹图',
    mapSub: (p, t) => `共 ${p} 张带坐标照片已关联至 ${t} 段行程动线`,
    previewBookBtn: '预览实体纪念册',
    photosIndexedLabel: (n) => `${n} 张回忆照片`,
    photosShortLabel: (n) => `${n} 张`,
    includedInBookTitle: '已选入实体纪念册',
    addToBookTitle: '加入实体纪念册',
    readyToPrintTitle: (fav, pages) => `已精选 ${fav} 张入册 · 自动对齐 ${pages}P 实体精装规格`,
    readyToPrintDesc: '支持 AI 结合行程写故事排版、预览 3mm 印刷出血裁切线，并一键提交主理人印制发货。',
    openStudioBtn: '进入 AI 排版与印刷预览',
    removePhotoBtn: '移除',
    tripChapterLabel: '归属行程',
    dayStopTitleLabel: '对应站点名称',
    memoryNoteLabel: '照片当时的心情随笔（AI 写故事时会融入）',
    memoryNotePlaceholder: '例如：雨停后在塞纳河畔喝到的第一杯热拿铁...',
  },
  'en-US': {
    multiTripTitleFallback: (c) => `${c || 'Journey'} & Beyond`,
    singleTripTitleFallback: 'Travel Monograph',
    chapterFallbackTitle: (i) => `Chapter ${i}`,
    daysSuffix: 'D',
    defaultNarrativeIntro:
      'Footsteps across city streets and golden-hour stops, preserved on archival paper.',
    stopsRecordedSuffix: (n) => `${n} stops recorded`,
    stopsShortSuffix: (n) => `${n} stops`,
    defaultSubtitle: (n) => `${n} Trip(s) · 300 DPI Archival Edition`,
    defaultEpigraph: 'Some journeys deserve to be held in your hands and seen again.',
    defaultColophon:
      'Curated locally with Trip Kit Memories · Printed on acid-free archival art paper.',
    indexedNativeToast: (n) => `Indexed ${n} trip photos locally`,
    permissionDeniedToast: 'Photo library permission denied in system settings',
    openingLocalToast: 'Opening local photo selector...',
    indexedLocalToast: (n) => `Indexed ${n} photo(s) locally by EXIF date & GPS`,
    loadedSamplesToast: (n) => `Loaded ${n} sample travel photos mapped to your stops`,
    removedToast: 'Removed from local index',
    tripsMergedLabel: (n) => `${n} Trips Merged`,
    currentTripFallback: 'Current Trip',
    selectTripsHint: 'Select 1 or multiple trips for 1 book',
    doneBtn: 'Done',
    allFilter: (n) => `All (${n})`,
    inBookFilter: (n) => `In Book (${n})`,
    gridMode: 'Grid',
    mapMode: 'Map',
    indexTripPhotosBtn: '+ Index Trip Photos',
    aiPhotobookBtn: 'AI Photobook & Print',
    printOrdersBtn: 'Print Orders',
    emptyHeadline: 'Some journeys deserve to be seen again',
    emptyDesc:
      'Memories automatically organizes your photos by recorded trip dates and stop coordinates. Indexing happens 100% locally on your device—your photos are never uploaded to cloud servers. Only selected thumbnails are sent to AI when you choose to compose your printable travel book.',
    indexAllBtn: 'Index All Trip Photos',
    trySamplesBtn: 'Try with Sample Trip Photos',
    privacyFootnotes: 'EXIF Date & GPS Auto-Matching · 300 DPI Pre-Press Check · Hardcover POD Delivery',
    mapHeading: 'Geo-Tagged Memory Footprints',
    mapSub: (p, t) => `${p} geo-matched photos across ${t} trip(s)`,
    previewBookBtn: 'Preview Printable Book',
    photosIndexedLabel: (n) => `${n} photos indexed`,
    photosShortLabel: (n) => `${n} photos`,
    includedInBookTitle: 'Included in Photobook',
    addToBookTitle: 'Add to Photobook',
    readyToPrintTitle: (fav, pages) =>
      `Ready to print: ${fav} curated photos · ${pages}P Book`,
    readyToPrintDesc:
      'Let AI write chapter stories & captions, preview 3mm print bleed, and order hardcover delivery.',
    openStudioBtn: 'Open AI Book Studio',
    removePhotoBtn: 'Remove',
    tripChapterLabel: 'Trip Chapter',
    dayStopTitleLabel: 'Day & Stop Title',
    memoryNoteLabel: 'Memory Note (Used by AI Storyteller)',
    memoryNotePlaceholder: 'e.g., Best warm croissant right after the morning rain',
  },
  'en-GB': {
    multiTripTitleFallback: (c) => `${c || 'Journey'} & Beyond`,
    singleTripTitleFallback: 'Travel Monograph',
    chapterFallbackTitle: (i) => `Chapter ${i}`,
    daysSuffix: 'D',
    defaultNarrativeIntro:
      'Footsteps across city streets and golden-hour stops, preserved on archival paper.',
    stopsRecordedSuffix: (n) => `${n} stops recorded`,
    stopsShortSuffix: (n) => `${n} stops`,
    defaultSubtitle: (n) => `${n} Trip(s) · 300 DPI Archival Edition`,
    defaultEpigraph: 'Some journeys deserve to be held in your hands and seen again.',
    defaultColophon:
      'Curated locally with Trip Kit Memories · Printed on acid-free archival art paper.',
    indexedNativeToast: (n) => `Indexed ${n} trip photos locally`,
    permissionDeniedToast: 'Photo library permission denied in system settings',
    openingLocalToast: 'Opening local photo selector...',
    indexedLocalToast: (n) => `Indexed ${n} photo(s) locally by EXIF date & GPS`,
    loadedSamplesToast: (n) => `Loaded ${n} sample travel photos mapped to your stops`,
    removedToast: 'Removed from local index',
    tripsMergedLabel: (n) => `${n} Trips Merged`,
    currentTripFallback: 'Current Trip',
    selectTripsHint: 'Select 1 or multiple trips for 1 book',
    doneBtn: 'Done',
    allFilter: (n) => `All (${n})`,
    inBookFilter: (n) => `In Book (${n})`,
    gridMode: 'Grid',
    mapMode: 'Map',
    indexTripPhotosBtn: '+ Index Trip Photos',
    aiPhotobookBtn: 'AI Photobook & Print',
    printOrdersBtn: 'Print Orders',
    emptyHeadline: 'Some journeys deserve to be seen again',
    emptyDesc:
      'Memories automatically organises your photos by recorded trip dates and stop coordinates. Indexing happens 100% locally on your device—your photos are never uploaded to cloud servers. Only selected thumbnails are sent to AI when you choose to compose your printable travel book.',
    indexAllBtn: 'Index All Trip Photos',
    trySamplesBtn: 'Try with Sample Trip Photos',
    privacyFootnotes: 'EXIF Date & GPS Auto-Matching · 300 DPI Pre-Press Check · Hardcover POD Delivery',
    mapHeading: 'Geo-Tagged Memory Footprints',
    mapSub: (p, t) => `${p} geo-matched photos across ${t} trip(s)`,
    previewBookBtn: 'Preview Printable Book',
    photosIndexedLabel: (n) => `${n} photos indexed`,
    photosShortLabel: (n) => `${n} photos`,
    includedInBookTitle: 'Included in Photobook',
    addToBookTitle: 'Add to Photobook',
    readyToPrintTitle: (fav, pages) =>
      `Ready to print: ${fav} curated photos · ${pages}P Book`,
    readyToPrintDesc:
      'Let AI write chapter stories & captions, preview 3mm print bleed, and order hardcover delivery.',
    openStudioBtn: 'Open AI Book Studio',
    removePhotoBtn: 'Remove',
    tripChapterLabel: 'Trip Chapter',
    dayStopTitleLabel: 'Day & Stop Title',
    memoryNoteLabel: 'Memory Note (Used by AI Storyteller)',
    memoryNotePlaceholder: 'e.g., Best warm croissant right after the morning rain',
  },
  'es-MX': {
    multiTripTitleFallback: (c) => `${c || 'Viaje'} y más allá`,
    singleTripTitleFallback: 'Monografía de viaje',
    chapterFallbackTitle: (i) => `Capítulo ${i}`,
    daysSuffix: 'd',
    defaultNarrativeIntro:
      'Pasos por calles de ciudad y paradas al atardecer, conservados en papel de archivo.',
    stopsRecordedSuffix: (n) => `${n} paradas registradas`,
    stopsShortSuffix: (n) => `${n} paradas`,
    defaultSubtitle: (n) => `${n} viaje(s) · Edición 300 DPI`,
    defaultEpigraph: 'Algunos viajes merecen sostenerse en tus manos y volver a verse.',
    defaultColophon:
      'Curado localmente con Trip Kit Memories · Impreso en papel artístico libre de ácido.',
    indexedNativeToast: (n) => `${n} fotos indexadas localmente`,
    permissionDeniedToast: 'Permiso de biblioteca de fotos denegado en ajustes',
    openingLocalToast: 'Abriendo selector de fotos local...',
    indexedLocalToast: (n) => `${n} foto(s) indexadas localmente por fecha EXIF y GPS`,
    loadedSamplesToast: (n) => `Se cargaron ${n} fotos de muestra vinculadas a tus paradas`,
    removedToast: 'Eliminada del índice local',
    tripsMergedLabel: (n) => `${n} viajes unidos`,
    currentTripFallback: 'Viaje actual',
    selectTripsHint: 'Elige 1 o varios viajes para un mismo libro',
    doneBtn: 'Listo',
    allFilter: (n) => `Todas (${n})`,
    inBookFilter: (n) => `En libro (${n})`,
    gridMode: 'Cuadrícula',
    mapMode: 'Mapa',
    indexTripPhotosBtn: '+ Indexar fotos',
    aiPhotobookBtn: 'Fotolibro IA e impresión',
    printOrdersBtn: 'Pedidos',
    emptyHeadline: 'Algunos viajes merecen volver a verse',
    emptyDesc:
      'Recuerdos organiza tus fotos automáticamente según las fechas y coordenadas del viaje. La indexación es 100 % local en tu dispositivo y nunca sube tus fotos a la nube. Solo se envían miniaturas seleccionadas a la IA si decides diseñar tu fotolibro.',
    indexAllBtn: 'Indexar todas las fotos',
    trySamplesBtn: 'Probar con fotos de ejemplo',
    privacyFootnotes: 'EXIF y GPS automático · Control 300 DPI · Envío en tapa dura',
    mapHeading: 'Huellas de recuerdos geolocalizados',
    mapSub: (p, t) => `${p} fotos con ubicación en ${t} viaje(s)`,
    previewBookBtn: 'Vista previa del libro',
    photosIndexedLabel: (n) => `${n} fotos indexadas`,
    photosShortLabel: (n) => `${n} fotos`,
    includedInBookTitle: 'Incluida en el fotolibro',
    addToBookTitle: 'Añadir al fotolibro',
    readyToPrintTitle: (fav, pages) =>
      `Listo para imprimir: ${fav} fotos elegidas · ${pages} págs.`,
    readyToPrintDesc:
      'Deja que la IA escriba relatos y pies de foto, revisa el sangrado de 3 mm y pide tu libro.',
    openStudioBtn: 'Abrir estudio de fotolibro IA',
    removePhotoBtn: 'Quitar',
    tripChapterLabel: 'Capítulo del viaje',
    dayStopTitleLabel: 'Día y nombre de parada',
    memoryNoteLabel: 'Nota del momento (usada por la IA)',
    memoryNotePlaceholder: 'Ej. El mejor croissant tibio justo después de la lluvia',
  },
  'fr-FR': {
    multiTripTitleFallback: (c) => `${c || 'Voyage'} & ailleurs`,
    singleTripTitleFallback: 'Monographie de voyage',
    chapterFallbackTitle: (i) => `Chapitre ${i}`,
    daysSuffix: 'j',
    defaultNarrativeIntro:
      'Des pas dans les ruelles et des instants dorés, préservés sur papier d’art.',
    stopsRecordedSuffix: (n) => `${n} étapes enregistrées`,
    stopsShortSuffix: (n) => `${n} étapes`,
    defaultSubtitle: (n) => `${n} voyage(s) · Édition 300 DPI`,
    defaultEpigraph: 'Certains voyages méritent d’être tenus entre vos mains et revus.',
    defaultColophon:
      'Organisé localement avec Trip Kit Memories · Imprimé sur papier d’art sans acide.',
    indexedNativeToast: (n) => `${n} photos indexées localement`,
    permissionDeniedToast: 'Accès à la photothèque refusé dans les réglages',
    openingLocalToast: 'Ouverture du sélecteur de photos local...',
    indexedLocalToast: (n) => `${n} photo(s) indexée(s) localement par date EXIF et GPS`,
    loadedSamplesToast: (n) => `${n} photos d’exemple chargées et associées à vos étapes`,
    removedToast: 'Retirée de l’index local',
    tripsMergedLabel: (n) => `${n} voyages réunis`,
    currentTripFallback: 'Voyage actuel',
    selectTripsHint: 'Sélectionnez 1 ou plusieurs voyages pour un album',
    doneBtn: 'Terminer',
    allFilter: (n) => `Toutes (${n})`,
    inBookFilter: (n) => `Dans l’album (${n})`,
    gridMode: 'Grille',
    mapMode: 'Carte',
    indexTripPhotosBtn: '+ Indexer des photos',
    aiPhotobookBtn: 'Album IA & impression',
    printOrdersBtn: 'Commandes',
    emptyHeadline: 'Certains voyages méritent d’être revus',
    emptyDesc:
      'Souvenirs classe automatiquement vos photos selon les dates et coordonnées du voyage. L’indexation s’effectue 100 % en local sans jamais envoyer vos originaux sur le cloud. Seules les miniatures choisies sont analysées si vous lancez la mise en page IA.',
    indexAllBtn: 'Indexer toutes les photos',
    trySamplesBtn: 'Essayer avec des photos d’exemple',
    privacyFootnotes: 'Tri EXIF & GPS auto · Contrôle 300 DPI · Livraison reliée',
    mapHeading: 'Empreintes géolocalisées des souvenirs',
    mapSub: (p, t) => `${p} photos géolocalisées sur ${t} voyage(s)`,
    previewBookBtn: 'Aperçu du livre imprimable',
    photosIndexedLabel: (n) => `${n} photos indexées`,
    photosShortLabel: (n) => `${n} photos`,
    includedInBookTitle: 'Incluse dans l’album',
    addToBookTitle: 'Ajouter à l’album',
    readyToPrintTitle: (fav, pages) =>
      `Prêt à imprimer : ${fav} photos choisies · ${pages} pages`,
    readyToPrintDesc:
      'L’IA rédige les chapitres et légendes, vérifiez le fond perdu de 3 mm et commandez l’ouvrage.',
    openStudioBtn: 'Ouvrir l’atelier album IA',
    removePhotoBtn: 'Retirer',
    tripChapterLabel: 'Chapitre du voyage',
    dayStopTitleLabel: 'Jour et nom d’étape',
    memoryNoteLabel: 'Note souvenir (utilisée par l’IA)',
    memoryNotePlaceholder: 'Ex. Meilleur croissant chaud juste après la pluie matinale',
  },
  'de-DE': {
    multiTripTitleFallback: (c) => `${c || 'Reise'} & darüber hinaus`,
    singleTripTitleFallback: 'Reisemonografie',
    chapterFallbackTitle: (i) => `Kapitel ${i}`,
    daysSuffix: 'T',
    defaultNarrativeIntro:
      'Schritte durch Stadtgassen und Momente im Abendlicht, bewahrt auf Archivpapier.',
    stopsRecordedSuffix: (n) => `${n} Stopps erfasst`,
    stopsShortSuffix: (n) => `${n} Stopps`,
    defaultSubtitle: (n) => `${n} Reise(n) · 300-DPI-Archivedition`,
    defaultEpigraph: 'Manche Reisen verdienen es, in den Händen gehalten und neu entdeckt zu werden.',
    defaultColophon:
      'Lokal kuratiert mit Trip Kit Memories · Gedruckt auf säurefreiem Künstlerpapier.',
    indexedNativeToast: (n) => `${n} Reisefotos lokal indexiert`,
    permissionDeniedToast: 'Fotozugriff in den Systemeinstellungen verweigert',
    openingLocalToast: 'Lokale Fotoauswahl wird geöffnet...',
    indexedLocalToast: (n) => `${n} Foto(s) lokal nach EXIF-Datum & GPS indexiert`,
    loadedSamplesToast: (n) => `${n} Beispielfotos passend zu deinen Stopps geladen`,
    removedToast: 'Aus lokalem Index entfernt',
    tripsMergedLabel: (n) => `${n} Reisen vereint`,
    currentTripFallback: 'Aktuelle Reise',
    selectTripsHint: '1 oder mehrere Reisen für ein Buch wählen',
    doneBtn: 'Fertig',
    allFilter: (n) => `Alle (${n})`,
    inBookFilter: (n) => `Im Buch (${n})`,
    gridMode: 'Raster',
    mapMode: 'Karte',
    indexTripPhotosBtn: '+ Fotos indexieren',
    aiPhotobookBtn: 'KI-Fotobuch & Druck',
    printOrdersBtn: 'Druckaufträge',
    emptyHeadline: 'Manche Reisen verdienen es, wiedergesehen zu werden',
    emptyDesc:
      'Erinnerungen ordnet deine Fotos automatisch nach Reisedaten und Stopp-Koordinaten. Die Indexierung erfolgt zu 100 % lokal auf deinem Gerät – Fotos werden nie in die Cloud hochgeladen. Nur gewählte Vorschaubilder gehen auf Wunsch an die KI-Buchgestaltung.',
    indexAllBtn: 'Alle Reisefotos indexieren',
    trySamplesBtn: 'Mit Beispielfotos testen',
    privacyFootnotes: 'EXIF & GPS-Abgleich · 300-DPI-Vorprüfung · Hardcover-Versand',
    mapHeading: 'Geotagged-Erinnerungsspuren',
    mapSub: (p, t) => `${p} verortete Fotos aus ${t} Reise(n)`,
    previewBookBtn: 'Druckvorschau öffnen',
    photosIndexedLabel: (n) => `${n} Fotos indexiert`,
    photosShortLabel: (n) => `${n} Fotos`,
    includedInBookTitle: 'Im Fotobuch enthalten',
    addToBookTitle: 'Zum Fotobuch hinzufügen',
    readyToPrintTitle: (fav, pages) =>
      `Druckbereit: ${fav} ausgewählte Fotos · ${pages} Seiten`,
    readyToPrintDesc:
      'KI schreibt Kapitel & Bildtexte, 3-mm-Beschnitt prüfen und Hardcover bestellen.',
    openStudioBtn: 'KI-Fotobuchstudio öffnen',
    removePhotoBtn: 'Entfernen',
    tripChapterLabel: 'Reisekapitel',
    dayStopTitleLabel: 'Tag & Stopp-Titel',
    memoryNoteLabel: 'Erinnerungsnotiz (für KI-Storyteller)',
    memoryNotePlaceholder: 'z. B. Bester warmer Croissant direkt nach dem Morgenregen',
  },
  'pt-BR': {
    multiTripTitleFallback: (c) => `${c || 'Jornada'} e além`,
    singleTripTitleFallback: 'Monografia de viagem',
    chapterFallbackTitle: (i) => `Capítulo ${i}`,
    daysSuffix: 'd',
    defaultNarrativeIntro:
      'Passos pelas ruas da cidade e paradas na hora dourada, preservados em papel de arquivo.',
    stopsRecordedSuffix: (n) => `${n} paradas registradas`,
    stopsShortSuffix: (n) => `${n} paradas`,
    defaultSubtitle: (n) => `${n} viagem(ns) · Edição 300 DPI`,
    defaultEpigraph: 'Algumas jornadas merecem ser seguradas nas mãos e vistas de novo.',
    defaultColophon:
      'Organizado localmente com Trip Kit Memories · Impresso em papel artístico livre de ácido.',
    indexedNativeToast: (n) => `${n} fotos indexadas localmente`,
    permissionDeniedToast: 'Permissão da biblioteca de fotos negada nos ajustes',
    openingLocalToast: 'Abrindo seletor de fotos local...',
    indexedLocalToast: (n) => `${n} foto(s) indexadas localmente por data EXIF e GPS`,
    loadedSamplesToast: (n) => `${n} fotos de exemplo carregadas e ligadas às suas paradas`,
    removedToast: 'Removida do índice local',
    tripsMergedLabel: (n) => `${n} viagens unidas`,
    currentTripFallback: 'Viagem atual',
    selectTripsHint: 'Selecione 1 ou várias viagens para 1 livro',
    doneBtn: 'Concluir',
    allFilter: (n) => `Todas (${n})`,
    inBookFilter: (n) => `No livro (${n})`,
    gridMode: 'Grade',
    mapMode: 'Mapa',
    indexTripPhotosBtn: '+ Indexar fotos',
    aiPhotobookBtn: 'Álbum IA e impressão',
    printOrdersBtn: 'Pedidos',
    emptyHeadline: 'Algumas viagens merecem ser vistas de novo',
    emptyDesc:
      'Memórias organiza automaticamente suas fotos por datas e coordenadas das paradas. A indexação ocorre 100% localmente no seu aparelho — suas fotos nunca vão para a nuvem. Apenas miniaturas escolhidas são enviadas à IA quando você cria o fotolivro.',
    indexAllBtn: 'Indexar todas as fotos',
    trySamplesBtn: 'Testar com fotos de exemplo',
    privacyFootnotes: 'EXIF e GPS automáticos · Checagem 300 DPI · Capa dura sob demanda',
    mapHeading: 'Pegadas de memórias geolocalizadas',
    mapSub: (p, t) => `${p} fotos com localização em ${t} viagem(ns)`,
    previewBookBtn: 'Prévia do livro impresso',
    photosIndexedLabel: (n) => `${n} fotos indexadas`,
    photosShortLabel: (n) => `${n} fotos`,
    includedInBookTitle: 'Incluída no fotolivro',
    addToBookTitle: 'Adicionar ao fotolivro',
    readyToPrintTitle: (fav, pages) =>
      `Pronto para imprimir: ${fav} fotos escolhidas · ${pages} págs.`,
    readyToPrintDesc:
      'Deixe a IA escrever capítulos e legendas, veja a sangria de 3 mm e peça em capa dura.',
    openStudioBtn: 'Abrir estúdio de livro IA',
    removePhotoBtn: 'Remover',
    tripChapterLabel: 'Capítulo da viagem',
    dayStopTitleLabel: 'Dia e nome da parada',
    memoryNoteLabel: 'Nota da memória (usada pela IA)',
    memoryNotePlaceholder: 'Ex.: Melhor croissant quentinho logo após a chuva da manhã',
  },
  'ja-JP': {
    multiTripTitleFallback: (c) => `${c || '旅路'}と季節の紀行`,
    singleTripTitleFallback: '旅の光影フォトブック',
    chapterFallbackTitle: (i) => `第 ${i} 章`,
    daysSuffix: '日間',
    defaultNarrativeIntro: '街角の散歩や夕暮れの景色を、手触りの残る一冊の記憶へ丁寧に編み上げます。',
    stopsRecordedSuffix: (n) => `${n} 件の訪問スポット`,
    stopsShortSuffix: (n) => `${n} スポット`,
    defaultSubtitle: (n) => `${n} つの旅を収録 · 300DPI アーカイブ印刷版`,
    defaultEpigraph: '歩いた道と出会った光は、紙に印して手元に残す価値がある。',
    defaultColophon: 'Trip Kit Memories ローカル索引より作成 · 無酸アート紙 300DPI 高精細印刷。',
    indexedNativeToast: (n) => `端末内で ${n} 枚の旅行写真をローカル索引化しました`,
    permissionDeniedToast: '写真ライブラリの権限がオフです。端末の設定で許可してください',
    openingLocalToast: 'ローカルの写真選択を開いています...',
    indexedLocalToast: (n) => `端末内で ${n} 枚の写真の EXIF 日時と位置情報を照合しました`,
    loadedSamplesToast: (n) => `各スポットに紐づいた ${n} 枚のサンプル写真を読み込みました`,
    removedToast: 'ローカル索引から削除しました',
    tripsMergedLabel: (n) => `${n} 件の旅を合本収録`,
    currentTripFallback: '現在の旅行',
    selectTripsHint: '複数の旅行を1冊の本にまとめて編集できます',
    doneBtn: '完了',
    allFilter: (n) => `すべて (${n})`,
    inBookFilter: (n) => `★ 収録 (${n})`,
    gridMode: 'グリッド',
    mapMode: '地図',
    indexTripPhotosBtn: '+ 写真を索引追加',
    aiPhotobookBtn: 'AI 製本スタジオ',
    printOrdersBtn: '印刷注文',
    emptyHeadline: '旅の記憶を、何度でも開ける一冊に',
    emptyDesc:
      '記録された旅行日程とスポット座標に合わせて、思い出の写真を端末内で自動整理します。原本がクラウドへ送信されることはありません。印刷用フォトブックを作成する際、同意した選択写真のサムネイルのみをAIレイアウトへ送信します。',
    indexAllBtn: '旅行写真をすべて索引化',
    trySamplesBtn: 'サンプル写真でレイアウトを試す',
    privacyFootnotes: 'ローカル EXIF・GPS 自動照合 · 300DPI 解像度チェック · ハードカバー印刷対応',
    mapHeading: 'ジオタグ思い出マップ',
    mapSub: (p, t) => `${t} 件のルートに紐づいた位置情報付き写真 ${p} 枚`,
    previewBookBtn: '印刷プレビューを見る',
    photosIndexedLabel: (n) => `${n} 枚の思い出写真`,
    photosShortLabel: (n) => `${n} 枚`,
    includedInBookTitle: 'フォトブック収録済み',
    addToBookTitle: 'フォトブックに追加',
    readyToPrintTitle: (fav, pages) => `収録 ${fav} 枚確定 · ${pages}P 印刷仕様に自動調整済み`,
    readyToPrintDesc: 'AI による章ストーリー執筆、3mm 塗り足しプレビュー、ハードカバー製本注文が可能です。',
    openStudioBtn: 'AI 製本・印刷スタジオを開く',
    removePhotoBtn: '削除',
    tripChapterLabel: '所属する旅行章',
    dayStopTitleLabel: '対応スポット名',
    memoryNoteLabel: '当時のメモ（AI ストーリー執筆に反映）',
    memoryNotePlaceholder: '例：雨上がりの朝にセーヌ川沿いで飲んだカフェラテ...',
  },
};

export function getMemoriesViewCopy(lang: AppLanguage): MemoriesViewCopy {
  return pickLang(lang, MEMORIES_VIEW_PACK);
}

// 2. PhotobookStudioModal
export interface PhotobookStudioCopy {
  frontCoverLabel: string;
  epigraphLabel: string;
  chapterPrefix: (num: number) => string;
  colophonLabel: string;
  chapterFallbackTitle: string;
  chapterDaysSuffix: string;
  chapterNarrativeFallback: string;
  chapterStopsSuffix: (n: number) => string;
  selectPhotoFirstToast: string;
  aiReadyToast: string;
  downloadedPdfToast: (pages: number) => string;
  exportPdfFailedToast: string;
  studioTitle: string;
  signatureSub: (pages: number, photos: number, trips: number) => string;
  signatureKeyword: string;
  bleedPdfBtn: string;
  orderPrintBtn: string;
  closeAria: string;
  aiEditorialHeading: string;
  aiCuratedBadge: string;
  visionConsentText: (count: number) => string;
  composingBtn: string;
  generateAiBtn: string;
  step1Heading: string;
  templates: Record<PhotobookTemplateId, string>;
  step2Heading: string;
  formats: Record<PhotobookFormatId, string>;
  step3Heading: string;
  bindings: Record<PhotobookBindingId, string>;
  proofingHeading: string;
  bleedGuidesBtn: string;
  lowResWarning: (count: number) => string;
  allSharpOk: string;
  prevBtn: string;
  nextBtn: string;
  spreadUnit: string;
  spreadBlankLabel: string;
  gridLayoutLabel: string;
  rotateHint: string;
  trimLineTitle: string;
  safeAreaTitle: string;
  photoCaptionFallback: string;
  coverTitleLabel: string;
  coverSubtitleLabel: string;
  openingEpigraphLabel: string;
  chapterNarrativeLabel: string;
  photoHeadlineLabel: string;
  storyCaptionLabel: string;
  storyCaptionPlaceholder: string;
  backColophonLabel: string;
}

const PHOTOBOOK_STUDIO_PACK: LangMap8<PhotobookStudioCopy> = {
  'zh-CN': {
    frontCoverLabel: '封面',
    epigraphLabel: '扉页题记',
    chapterPrefix: (n) => `第${n}章`,
    colophonLabel: '封底版权页',
    chapterFallbackTitle: '旅途篇章',
    chapterDaysSuffix: '天',
    chapterNarrativeFallback: '沿着城市街巷与晨昏光影，把每一站停留凝结成纸面上的记忆。',
    chapterStopsSuffix: (n) => `${n} 个行程站点`,
    selectPhotoFirstToast: '请先勾选至少 1 张精选照片入册',
    aiReadyToast: 'AI 已完成多行程故事撰写与画册排版！',
    downloadedPdfToast: (p) => `已下载 ${p}P 印刷级含出血裁切线 PDF`,
    exportPdfFailedToast: '导出印刷 PDF 失败',
    studioTitle: 'AI 纪念册排版与 300DPI 印刷工坊',
    signatureSub: (pages, photos, trips) => `${pages}P (4P 印刷折手对齐) · ${photos} 张入册 · ${trips} 段行程`,
    signatureKeyword: '4P 印刷折手对齐',
    bleedPdfBtn: '导出印刷 PDF',
    orderPrintBtn: '付费印制下单',
    closeAria: '关闭',
    aiEditorialHeading: 'AI 旅途故事与版式编排',
    aiCuratedBadge: '已由 AI 撰稿',
    visionConsentText: (n) =>
      `同意发送已选 ${n} 张精选照片的压缩缩略图供 AI 识图写故事（高清原图仅保留在本地设备）。`,
    composingBtn: '正在结合行程站点撰写杂志图注...',
    generateAiBtn: 'AI 一键撰写多行程故事并排版',
    step1Heading: '1. 画册装帧美学风格',
    templates: {
      kinfolk: 'Kinfolk 留白',
      editorial: '人文城市志',
      scrapbook: '胶片手账本',
      collage: '多图拼贴',
    },
    step2Heading: '2. 实体开本尺寸',
    formats: {
      square_210: '210×210mm 方本',
      portrait_a5: '148×210mm A5竖本',
    },
    step3Heading: '3. 书壳装订与内页纸张',
    bindings: {
      hardcover_matte: '哑光硬壳蝴蝶对开',
      softcover_textured: '特种纸触感软精装',
    },
    proofingHeading: '印前 3mm 出血与清晰度预检',
    bleedGuidesBtn: '3mm 裁切安全线',
    lowResWarning: (n) => `检测到 ${n} 张照片满版不足 150 DPI，已自动建议留白画框排版确保印刷清晰。`,
    allSharpOk: '全部入册照片均通过印前像素清晰度校验。',
    prevBtn: '上一页',
    nextBtn: '下一页',
    spreadUnit: '跨页',
    gridLayoutLabel: '每页照片数',
    rotateHint: '横屏观看跨页效果更佳 · 请旋转手机',
    spreadBlankLabel: '空白页',
    trimLineTitle: '3mm 裁切出血线 (Trim Line)',
    safeAreaTitle: '文字安全边距 (Safe Area)',
    photoCaptionFallback: '定格在旅途街角的一帧光影记忆。',
    coverTitleLabel: '画册封面书名',
    coverSubtitleLabel: '封面副标题',
    openingEpigraphLabel: '扉页卷首语（支持随时微调）',
    chapterNarrativeLabel: '章节导语',
    photoHeadlineLabel: '图片小标题',
    storyCaptionLabel: '印刷图注旁白',
    storyCaptionPlaceholder: '输入印在照片下方的故事文字...',
    backColophonLabel: '封底结语',
  },
  'en-US': {
    frontCoverLabel: 'Front Cover',
    epigraphLabel: 'Title & Epigraph',
    chapterPrefix: (n) => `Ch.${n}`,
    colophonLabel: 'Back Colophon',
    chapterFallbackTitle: 'Travel Chapter',
    chapterDaysSuffix: 'D',
    chapterNarrativeFallback:
      'Along city avenues and golden-hour stops, every pause becomes a lasting memory on paper.',
    chapterStopsSuffix: (n) => `${n} stops`,
    selectPhotoFirstToast: 'Please select at least 1 photo first',
    aiReadyToast: 'AI photobook story & print layout ready!',
    downloadedPdfToast: (p) => `Downloaded ${p}P print-ready PDF with 3mm bleed`,
    exportPdfFailedToast: 'Failed to export PDF',
    studioTitle: 'AI Photobook & 300DPI Print Studio',
    signatureSub: (pages, photos, trips) => `${pages}P (4P Print Signature) · ${photos} photos · ${trips} trips`,
    signatureKeyword: '4P Print Signature',
    bleedPdfBtn: '300DPI Bleed PDF',
    orderPrintBtn: 'Order Print',
    closeAria: 'Close',
    aiEditorialHeading: 'AI Editorial Storyteller',
    aiCuratedBadge: 'AI Curated',
    visionConsentText: (n) =>
      `Allow AI to analyze ${n} selected photo thumbnails to write visual captions (originals remain strictly on-device).`,
    composingBtn: 'Composing Chapters & Captions...',
    generateAiBtn: 'Generate AI Story & Layout',
    step1Heading: '1. Magazine Aesthetic',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Editorial',
      scrapbook: 'Scrapbook',
      collage: 'Collage',
    },
    step2Heading: '2. Print Trim Size',
    formats: {
      square_210: '210×210 Square',
      portrait_a5: '148×210 A5',
    },
    step3Heading: '3. Cover & Paper Stock',
    bindings: {
      hardcover_matte: 'Matte Hardcover',
      softcover_textured: 'Munken Softcover',
    },
    proofingHeading: 'Pre-Press Proofing',
    bleedGuidesBtn: '3mm Bleed Guides',
    lowResWarning: (n) =>
      `${n} photo(s) are under 150 DPI for full-bleed; framed layout applied to keep print sharp.`,
    allSharpOk: 'All curated photos pass 300 DPI print sharpness check.',
    prevBtn: 'Prev',
    nextBtn: 'Next',
    spreadUnit: 'spread',
    gridLayoutLabel: 'Photos per page',
    rotateHint: 'Rotate your phone to landscape for the full spread',
    spreadBlankLabel: 'Blank page',
    trimLineTitle: '3mm Bleed Trim Line',
    safeAreaTitle: 'Safe Text Margin',
    photoCaptionFallback: 'A quiet moment captured along the journey.',
    coverTitleLabel: 'Cover Title',
    coverSubtitleLabel: 'Subtitle',
    openingEpigraphLabel: 'Opening Epigraph',
    chapterNarrativeLabel: 'Chapter Narrative',
    photoHeadlineLabel: 'Photo Headline',
    storyCaptionLabel: 'Story Caption',
    storyCaptionPlaceholder: 'Edit printed caption...',
    backColophonLabel: 'Back Cover Colophon',
  },
  'en-GB': {
    frontCoverLabel: 'Front Cover',
    epigraphLabel: 'Title & Epigraph',
    chapterPrefix: (n) => `Ch.${n}`,
    colophonLabel: 'Back Colophon',
    chapterFallbackTitle: 'Travel Chapter',
    chapterDaysSuffix: 'D',
    chapterNarrativeFallback:
      'Along city avenues and golden-hour stops, every pause becomes a lasting memory on paper.',
    chapterStopsSuffix: (n) => `${n} stops`,
    selectPhotoFirstToast: 'Please select at least 1 photo first',
    aiReadyToast: 'AI photobook story & print layout ready!',
    downloadedPdfToast: (p) => `Downloaded ${p}P print-ready PDF with 3mm bleed`,
    exportPdfFailedToast: 'Failed to export PDF',
    studioTitle: 'AI Photobook & 300DPI Print Studio',
    signatureSub: (pages, photos, trips) => `${pages}P (4P Print Signature) · ${photos} photos · ${trips} trips`,
    signatureKeyword: '4P Print Signature',
    bleedPdfBtn: '300DPI Bleed PDF',
    orderPrintBtn: 'Order Print',
    closeAria: 'Close',
    aiEditorialHeading: 'AI Editorial Storyteller',
    aiCuratedBadge: 'AI Curated',
    visionConsentText: (n) =>
      `Allow AI to analyse ${n} selected photo thumbnails to write visual captions (originals remain strictly on-device).`,
    composingBtn: 'Composing Chapters & Captions...',
    generateAiBtn: 'Generate AI Story & Layout',
    step1Heading: '1. Magazine Aesthetic',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Editorial',
      scrapbook: 'Scrapbook',
      collage: 'Collage',
    },
    step2Heading: '2. Print Trim Size',
    formats: {
      square_210: '210×210 Square',
      portrait_a5: '148×210 A5',
    },
    step3Heading: '3. Cover & Paper Stock',
    bindings: {
      hardcover_matte: 'Matte Hardcover',
      softcover_textured: 'Munken Softcover',
    },
    proofingHeading: 'Pre-Press Proofing',
    bleedGuidesBtn: '3mm Bleed Guides',
    lowResWarning: (n) =>
      `${n} photo(s) are under 150 DPI for full-bleed; framed layout applied to keep print sharp.`,
    allSharpOk: 'All curated photos pass 300 DPI print sharpness check.',
    prevBtn: 'Prev',
    nextBtn: 'Next',
    spreadUnit: 'spread',
    gridLayoutLabel: 'Photos per page',
    rotateHint: 'Rotate your phone to landscape for the full spread',
    spreadBlankLabel: 'Blank page',
    trimLineTitle: '3mm Bleed Trim Line',
    safeAreaTitle: 'Safe Text Margin',
    photoCaptionFallback: 'A quiet moment captured along the journey.',
    coverTitleLabel: 'Cover Title',
    coverSubtitleLabel: 'Subtitle',
    openingEpigraphLabel: 'Opening Epigraph',
    chapterNarrativeLabel: 'Chapter Narrative',
    photoHeadlineLabel: 'Photo Headline',
    storyCaptionLabel: 'Story Caption',
    storyCaptionPlaceholder: 'Edit printed caption...',
    backColophonLabel: 'Back Cover Colophon',
  },
  'es-MX': {
    frontCoverLabel: 'Portada',
    epigraphLabel: 'Portadilla y epígrafe',
    chapterPrefix: (n) => `Cap. ${n}`,
    colophonLabel: 'Contraportada',
    chapterFallbackTitle: 'Capítulo de viaje',
    chapterDaysSuffix: 'd',
    chapterNarrativeFallback:
      'Por avenidas y atardeceres, cada pausa del viaje queda plasmada en papel.',
    chapterStopsSuffix: (n) => `${n} paradas`,
    selectPhotoFirstToast: 'Elige al menos 1 foto primero',
    aiReadyToast: '¡Historia y maquetación IA listas!',
    downloadedPdfToast: (p) => `PDF listo para imprenta de ${p}P (sangrado 3 mm) descargado`,
    exportPdfFailedToast: 'Error al exportar el PDF',
    studioTitle: 'Estudio de fotolibro IA e impresión 300DPI',
    signatureSub: (pages, photos, trips) => `${pages}P (pliego de 4P) · ${photos} fotos · ${trips} viajes`,
    signatureKeyword: 'pliego de 4P',
    bleedPdfBtn: 'PDF 300DPI',
    orderPrintBtn: 'Pedir impreso',
    closeAria: 'Cerrar',
    aiEditorialHeading: 'Narrador editorial IA',
    aiCuratedBadge: 'Editado por IA',
    visionConsentText: (n) =>
      `Permitir que la IA analice ${n} miniaturas seleccionadas para redactar pies de foto (los originales siguen solo en tu equipo).`,
    composingBtn: 'Redactando capítulos y pies...',
    generateAiBtn: 'Crear relato y diseño con IA',
    step1Heading: '1. Estilo de revista',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Editorial',
      scrapbook: 'Álbum retro',
      collage: 'Collage',
    },
    step2Heading: '2. Tamaño de corte',
    formats: {
      square_210: 'Cuadrado 210×210',
      portrait_a5: 'A5 148×210',
    },
    step3Heading: '3. Tapa y papel',
    bindings: {
      hardcover_matte: 'Tapa dura mate',
      softcover_textured: 'Tapa blanda Munken',
    },
    proofingHeading: 'Control de preprensa',
    bleedGuidesBtn: 'Guías 3 mm',
    lowResWarning: (n) =>
      `${n} foto(s) tienen menos de 150 DPI para sangre completo; se aplicó marco para mantener nitidez.`,
    allSharpOk: 'Todas las fotos cumplen el estándar de nitidez de 300 DPI.',
    prevBtn: 'Ant.',
    nextBtn: 'Sig.',
    spreadUnit: 'doble página',
    gridLayoutLabel: 'Fotos por página',
    rotateHint: 'Gira el móvil a horizontal para ver la doble página completa',
    spreadBlankLabel: 'Página en blanco',
    trimLineTitle: 'Línea de corte (sangrado 3 mm)',
    safeAreaTitle: 'Margen seguro de texto',
    photoCaptionFallback: 'Un instante sereno capturado en el camino.',
    coverTitleLabel: 'Título de portada',
    coverSubtitleLabel: 'Subtítulo',
    openingEpigraphLabel: 'Epígrafe inicial',
    chapterNarrativeLabel: 'Relato del capítulo',
    photoHeadlineLabel: 'Título de foto',
    storyCaptionLabel: 'Pie de foto impreso',
    storyCaptionPlaceholder: 'Edita el texto impreso...',
    backColophonLabel: 'Colofón de contraportada',
  },
  'fr-FR': {
    frontCoverLabel: 'Couverture',
    epigraphLabel: 'Titre & épigraphe',
    chapterPrefix: (n) => `Ch. ${n}`,
    colophonLabel: 'Colophon final',
    chapterFallbackTitle: 'Chapitre du voyage',
    chapterDaysSuffix: 'j',
    chapterNarrativeFallback:
      'Au fil des rues et des lumières dorées, chaque halte devient un souvenir sur papier.',
    chapterStopsSuffix: (n) => `${n} étapes`,
    selectPhotoFirstToast: 'Sélectionnez d’abord au moins 1 photo',
    aiReadyToast: 'Récit IA et mise en page prêts !',
    downloadedPdfToast: (p) => `PDF d’impression ${p}P (fond perdu 3 mm) téléchargé`,
    exportPdfFailedToast: 'Échec de l’export PDF',
    studioTitle: 'Atelier Album IA & Impression 300DPI',
    signatureSub: (pages, photos, trips) => `${pages}P (cahier 4P) · ${photos} photos · ${trips} voyages`,
    signatureKeyword: 'cahier 4P',
    bleedPdfBtn: 'PDF 300DPI',
    orderPrintBtn: 'Commander',
    closeAria: 'Fermer',
    aiEditorialHeading: 'Rédacteur éditorial IA',
    aiCuratedBadge: 'Rédigé par l’IA',
    visionConsentText: (n) =>
      `Autoriser l’IA à analyser ${n} miniatures choisies pour rédiger les légendes (vos originaux restent en local).`,
    composingBtn: 'Rédaction des chapitres...',
    generateAiBtn: 'Générer récit & mise en page IA',
    step1Heading: '1. Style éditorial',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Éditorial',
      scrapbook: 'Carnet film',
      collage: 'Collage',
    },
    step2Heading: '2. Format d’impression',
    formats: {
      square_210: 'Carré 210×210',
      portrait_a5: 'A5 148×210',
    },
    step3Heading: '3. Couverture & papier',
    bindings: {
      hardcover_matte: 'Relié mat à plat',
      softcover_textured: 'Broché Munken',
    },
    proofingHeading: 'Contrôle prépresse',
    bleedGuidesBtn: 'Repères 3 mm',
    lowResWarning: (n) =>
      `${n} photo(s) sous 150 DPI pour le plein fond ; cadre blanc appliqué pour préserver la netteté.`,
    allSharpOk: 'Toutes les photos validées à 300 DPI.',
    prevBtn: 'Préc.',
    nextBtn: 'Suiv.',
    spreadUnit: 'double page',
    gridLayoutLabel: 'Photos par page',
    rotateHint: 'Tournez votre téléphone en paysage pour voir la double page',
    spreadBlankLabel: 'Page blanche',
    trimLineTitle: 'Trait de coupe (fond perdu 3 mm)',
    safeAreaTitle: 'Zone de sécurité texte',
    photoCaptionFallback: 'Un instant calme saisi au fil du voyage.',
    coverTitleLabel: 'Titre de couverture',
    coverSubtitleLabel: 'Sous-titre',
    openingEpigraphLabel: 'Épigraphe d’ouverture',
    chapterNarrativeLabel: 'Texte du chapitre',
    photoHeadlineLabel: 'Titre de la photo',
    storyCaptionLabel: 'Légende imprimée',
    storyCaptionPlaceholder: 'Modifier la légende imprimée...',
    backColophonLabel: 'Colophon de 4e de couverture',
  },
  'de-DE': {
    frontCoverLabel: 'Titelseite',
    epigraphLabel: 'Titel & Epigraph',
    chapterPrefix: (n) => `Kap. ${n}`,
    colophonLabel: 'Kolophon',
    chapterFallbackTitle: 'Reisekapitel',
    chapterDaysSuffix: 'T',
    chapterNarrativeFallback:
      'Durch Stadtgassen und goldenes Licht wird jede Station zu einer bleibenden Erinnerung auf Papier.',
    chapterStopsSuffix: (n) => `${n} Stopps`,
    selectPhotoFirstToast: 'Bitte wähle zuerst mindestens 1 Foto aus',
    aiReadyToast: 'KI-Fotobuchstory & Drucklayout bereit!',
    downloadedPdfToast: (p) => `${p}-Seiten-Druck-PDF mit 3 mm Beschnitt geladen`,
    exportPdfFailedToast: 'PDF-Export fehlgeschlagen',
    studioTitle: 'KI-Fotobuch & 300-DPI-Druckstudio',
    signatureSub: (pages, photos, trips) => `${pages}S (4S-Druckbogen) · ${photos} Fotos · ${trips} Reisen`,
    signatureKeyword: '4S-Druckbogen',
    bleedPdfBtn: '300-DPI-PDF',
    orderPrintBtn: 'Druck bestellen',
    closeAria: 'Schließen',
    aiEditorialHeading: 'KI-Redakteur & Layout',
    aiCuratedBadge: 'Von KI erstellt',
    visionConsentText: (n) =>
      `KI darf ${n} gewählte Miniaturbilder für Bildtexte analysieren (Originale bleiben lokal auf dem Gerät).`,
    composingBtn: 'Erstelle Kapitel & Bildtexte...',
    generateAiBtn: 'KI-Story & Layout erzeugen',
    step1Heading: '1. Magazin-Ästhetik',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Editorial',
      scrapbook: 'Scrapbook',
      collage: 'Collage',
    },
    step2Heading: '2. Druckformat',
    formats: {
      square_210: '210×210 Quadrat',
      portrait_a5: '148×210 A5',
    },
    step3Heading: '3. Einband & Papier',
    bindings: {
      hardcover_matte: 'Hardcover Matt',
      softcover_textured: 'Munken Softcover',
    },
    proofingHeading: 'Druckvorstufe',
    bleedGuidesBtn: '3-mm-Beschnitt',
    lowResWarning: (n) =>
      `${n} Foto(s) unter 150 DPI für randlosen Druck; gerahmtes Layout für volle Schärfe aktiv.`,
    allSharpOk: 'Alle Fotos bestehen die 300-DPI-Schärfeprüfung.',
    prevBtn: 'Zurück',
    nextBtn: 'Weiter',
    spreadUnit: 'Doppelseite',
    gridLayoutLabel: 'Fotos pro Seite',
    rotateHint: 'Drehen Sie Ihr Telefon quer, um die Doppelseite zu sehen',
    spreadBlankLabel: 'Leere Seite',
    trimLineTitle: '3-mm-Beschnittlinie',
    safeAreaTitle: 'Sicherer Textbereich',
    photoCaptionFallback: 'Ein ruhiger Moment unterwegs festgehalten.',
    coverTitleLabel: 'Buchtitel',
    coverSubtitleLabel: 'Untertitel',
    openingEpigraphLabel: 'Einleitungs-Epigraph',
    chapterNarrativeLabel: 'Kapiteltext',
    photoHeadlineLabel: 'Foto-Überschrift',
    storyCaptionLabel: 'Gedruckte Bildunterschrift',
    storyCaptionPlaceholder: 'Gedruckten Text bearbeiten...',
    backColophonLabel: 'Rückseiten-Kolophon',
  },
  'pt-BR': {
    frontCoverLabel: 'Capa',
    epigraphLabel: 'Folha de rosto',
    chapterPrefix: (n) => `Cap. ${n}`,
    colophonLabel: 'Colofão final',
    chapterFallbackTitle: 'Capítulo da viagem',
    chapterDaysSuffix: 'd',
    chapterNarrativeFallback:
      'Por ruas e paradas na hora dourada, cada pausa vira memória eterna no papel.',
    chapterStopsSuffix: (n) => `${n} paradas`,
    selectPhotoFirstToast: 'Selecione ao menos 1 foto primeiro',
    aiReadyToast: 'História e layout do fotolivro com IA prontos!',
    downloadedPdfToast: (p) => `PDF de impressão ${p}P (sangria 3 mm) baixado`,
    exportPdfFailedToast: 'Falha ao exportar PDF',
    studioTitle: 'Estúdio de Fotolivro IA e Impressão 300DPI',
    signatureSub: (pages, photos, trips) => `${pages}P (caderno 4P) · ${photos} fotos · ${trips} viagens`,
    signatureKeyword: 'caderno 4P',
    bleedPdfBtn: 'PDF 300DPI',
    orderPrintBtn: 'Pedir impresso',
    closeAria: 'Fechar',
    aiEditorialHeading: 'Narrador editorial IA',
    aiCuratedBadge: 'Criado por IA',
    visionConsentText: (n) =>
      `Permitir que a IA analise ${n} miniaturas selecionadas para criar legendas (os originais ficam no aparelho).`,
    composingBtn: 'Criando capítulos e legendas...',
    generateAiBtn: 'Gerar história e layout IA',
    step1Heading: '1. Estética da revista',
    templates: {
      kinfolk: 'Kinfolk',
      editorial: 'Editorial',
      scrapbook: 'Scrapbook',
      collage: 'Colagem',
    },
    step2Heading: '2. Formato de corte',
    formats: {
      square_210: 'Quadrado 210×210',
      portrait_a5: 'A5 148×210',
    },
    step3Heading: '3. Capa e papel',
    bindings: {
      hardcover_matte: 'Capa dura fosca',
      softcover_textured: 'Capa mole Munken',
    },
    proofingHeading: 'Pré-impressão',
    bleedGuidesBtn: 'Guias 3 mm',
    lowResWarning: (n) =>
      `${n} foto(s) abaixo de 150 DPI para página cheia; moldura aplicada para manter nitidez.`,
    allSharpOk: 'Todas as fotos passaram na checagem de nitidez 300 DPI.',
    prevBtn: 'Ant.',
    nextBtn: 'Próx.',
    spreadUnit: 'dupla página',
    gridLayoutLabel: 'Fotos por página',
    rotateHint: 'Gire o celular para a horizontal e veja a página dupla',
    spreadBlankLabel: 'Página em branco',
    trimLineTitle: 'Linha de corte (3 mm)',
    safeAreaTitle: 'Margem segura de texto',
    photoCaptionFallback: 'Um momento tranquilo registrado na viagem.',
    coverTitleLabel: 'Título da capa',
    coverSubtitleLabel: 'Subtítulo',
    openingEpigraphLabel: 'Epígrafe de abertura',
    chapterNarrativeLabel: 'Texto do capítulo',
    photoHeadlineLabel: 'Título da foto',
    storyCaptionLabel: 'Legenda impressa',
    storyCaptionPlaceholder: 'Editar legenda impressa...',
    backColophonLabel: 'Colofão da contracapa',
  },
  'ja-JP': {
    frontCoverLabel: '表紙',
    epigraphLabel: '扉・巻頭言',
    chapterPrefix: (n) => `第${n}章`,
    colophonLabel: '奥付・裏表紙',
    chapterFallbackTitle: '旅の章',
    chapterDaysSuffix: '日間',
    chapterNarrativeFallback: '街並みと朝夕の光を辿り、立ち止まった一瞬を一冊の紙面へ編み上げます。',
    chapterStopsSuffix: (n) => `${n} スポット`,
    selectPhotoFirstToast: '先に収録する写真を 1 枚以上選択してください',
    aiReadyToast: 'AI ストーリー執筆とフォトブック組版が完了しました！',
    downloadedPdfToast: (p) => `3mm 塗り足し付き ${p}P 印刷用 PDF をダウンロードしました`,
    exportPdfFailedToast: '印刷 PDF の書き出しに失敗しました',
    studioTitle: 'AI フォトブック組版・300DPI 印刷工房',
    signatureSub: (pages, photos, trips) => `${pages}P (4P 折丁合わせ) · ${photos} 枚収録 · ${trips} 件の旅`,
    signatureKeyword: '4P 折丁合わせ',
    bleedPdfBtn: '300DPI 印刷PDF',
    orderPrintBtn: '製本を注文する',
    closeAria: '閉じる',
    aiEditorialHeading: 'AI ストーリー編集＆組版',
    aiCuratedBadge: 'AI 執筆済み',
    visionConsentText: (n) =>
      `選択した ${n} 枚の圧縮サムネイルを AI 解析へ送信し、写真キャプションを自動生成することに同意します（高画質原本は端末内に保持）。`,
    composingBtn: '旅の行程からキャプションを執筆中...',
    generateAiBtn: 'AI でストーリー執筆・一括組版',
    step1Heading: '1. ブックデザイン様式',
    templates: {
      kinfolk: 'Kinfolk 余白',
      editorial: '人文紀行誌',
      scrapbook: 'フィルム手帳',
      collage: 'コラージュ',
    },
    step2Heading: '2. 製本判型サイズ',
    formats: {
      square_210: '210×210mm スクエア',
      portrait_a5: '148×210mm A5縦',
    },
    step3Heading: '3. 装丁・本文用紙',
    bindings: {
      hardcover_matte: 'マット上製本（見開き）',
      softcover_textured: '特種紙ソフトカバー',
    },
    proofingHeading: '印刷前 3mm 塗り足し・解像度チェック',
    bleedGuidesBtn: '3mm 裁ち落とし線',
    lowResWarning: (n) =>
      `${n} 枚の写真が全面印刷基準 150 DPI 未満のため、鮮明さを保つ余白レイアウトを適用しました。`,
    allSharpOk: 'すべての収録写真が 300 DPI 印刷品質チェックを通過しました。',
    prevBtn: '前へ',
    nextBtn: '次へ',
    spreadUnit: '見開き',
    gridLayoutLabel: '1ページの写真数',
    rotateHint: 'スマートフォンを横向きにすると見開き全体をご覧いただけます',
    spreadBlankLabel: '空白ページ',
    trimLineTitle: '3mm 裁ち落とし境界線 (Trim Line)',
    safeAreaTitle: '文字安全領域 (Safe Area)',
    photoCaptionFallback: '旅の途中で切り取った静かなひとコマ。',
    coverTitleLabel: '表紙タイトル',
    coverSubtitleLabel: '表紙サブタイトル',
    openingEpigraphLabel: '扉・巻頭エッセイ（編集可）',
    chapterNarrativeLabel: '章イントロ文',
    photoHeadlineLabel: '写真見出し',
    storyCaptionLabel: '印刷キャプション',
    storyCaptionPlaceholder: '写真の下に印刷する文章を入力...',
    backColophonLabel: '裏表紙奥付メッセージ',
  },
};

export function getPhotobookStudioCopy(lang: AppLanguage): PhotobookStudioCopy {
  return pickLang(lang, PHOTOBOOK_STUDIO_PACK);
}

// 3. PrintOrderCheckoutModal
export interface PrintOrderCheckoutCopy {
  statusLabels: Record<PhotobookOrderStatus, string>;
  curatedTripFallback: string;
  formatSquare: string;
  formatA5: string;
  bindingHardcover: string;
  bindingSoftcover: string;
  buildManifest: (p: {
    orderId: string;
    bookTitle: string;
    tripSummary: string;
    formatLabel: string;
    bindingLabel: string;
    pageCount: number;
    photoCount: number;
    copies: number;
    currencySymbol: string;
    totalPrice: number;
    currencyCode: string;
    recipientName: string;
    phone: string;
    shippingAddress: string;
    customerNote?: string;
  }) => string;
  errRecipient: string;
  errPhone: string;
  errAddress: string;
  orderSyncedToast: (orderId: string) => string;
  orderLocalToast: (orderId: string) => string;
  pdfExportedToast: (pages: number) => string;
  pdfFailedToast: string;
  copiedToast: string;
  copyFailedToast: string;
  noShippingToast: string;
  updatedOrderToast: (orderId: string) => string;
  cancelledOrderToast: string;
  modalTitle: string;
  closeAria: string;
  tabCheckout: string;
  tabAdminOrders: string;
  tabMyOrders: string;
  orderCreatedTitle: string;
  orderCreatedSteps: string;
  photosUnit: string;
  copiesUnit: string;
  downloadPrintPdfBtn: string;
  whatsappConfirmBtn: string;
  copyOrderBtn: string;
  viewOrderStatusBtn: string;
  printCopiesLabel: string;
  promoBulkLabel: string;
  unitLabel: string;
  freeShippingLabel: string;
  shippingFeeLabel: (sym: string, fee: number) => string;
  deliveryInfoHeading: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  addressLabel: string;
  addressPlaceholder: string;
  noteLabel: string;
  notePlaceholder: string;
  prepressGuarantee: string;
  submitOrderBtn: (sym: string, total: number) => string;
  loadingOrders: string;
  noOrdersTitle: string;
  noOrdersDesc: string;
  trackingPrefix: string;
  viewAddressBtn: string;
  contactDeskBtn: string;
  cancelBtn: string;
  trackingPlaceholder: string;
  markShippedBtn: string;
}

const PRINT_ORDER_CHECKOUT_PACK: LangMap8<PrintOrderCheckoutCopy> = {
  'zh-CN': {
    statusLabels: {
      pending_payment: '待确认付款',
      paid_queued: '已付款 · 待排产',
      printing: '印厂印刷装订中',
      shipped: '已顺丰寄出',
      cancelled: '已取消',
    },
    curatedTripFallback: '精选行程',
    formatSquare: '210×210mm 蝴蝶对开方本',
    formatA5: '148×210mm A5 随身竖本',
    bindingHardcover: '哑光硬壳精装 · 170g 进口哑粉纸',
    bindingSoftcover: '特种触感软精装 · 150g 蒙肯道林纸',
    buildManifest: (p) =>
      `【Trip Kit 纪念画册印制工单】\n工单号：${p.orderId}\n书名：《${p.bookTitle}》\n收录行程：${p.tripSummary}\n装帧规格：${p.formatLabel} · ${p.bindingLabel}\n页数照片：${p.pageCount}P（含 3mm 出血裁切位 · ${p.photoCount} 张精选照片）× ${p.copies} 本\n应付总额：${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\n收件人：${p.recipientName}（${p.phone}）\n收货地址：${p.shippingAddress}${
        p.customerNote ? `\n印制备注：${p.customerNote}` : ''
      }`,
    errRecipient: '请填写收件人姓名',
    errPhone: '请填写有效的联系电话（至少 5 位）',
    errAddress: '请填写详细的收货街道门牌地址',
    orderSyncedToast: (id) => `印制工单 ${id} 已生成并同步云端`,
    orderLocalToast: (id) => `印制工单 ${id} 已生成`,
    pdfExportedToast: (pages) => `已导出含 3mm 出血裁切线的印刷级 PDF（共 ${pages}P）`,
    pdfFailedToast: '导出印刷 PDF 失败，请重试',
    copiedToast: '已复制完整印制工单信息！',
    copyFailedToast: '复制失败，请手动长按复制',
    noShippingToast: '暂无云端收件详情',
    updatedOrderToast: (id) => `已更新工单 ${id} 状态`,
    cancelledOrderToast: '已取消该印制订单',
    modalTitle: '实体画册付费印制与工单',
    closeAria: '关闭',
    tabCheckout: '预约定制印刷',
    tabAdminOrders: '全部印制工单 (主理人)',
    tabMyOrders: '我的印制订单',
    orderCreatedTitle: '印制工单已生成',
    orderCreatedSteps:
      '第 1 步：点击下方按钮保存「含 3mm 出血裁切线的 300DPI 印刷级 PDF」；第 2 步：一键发送工单给主理人确认付款，即刻安排印厂装订顺丰直发。',
    photosUnit: '张精选入册',
    copiesUnit: '本',
    downloadPrintPdfBtn: '1. 下载 300DPI 含出血裁切线印刷文件 (PDF)',
    whatsappConfirmBtn: '2. 发送工单至主理人 WhatsApp 付款并安排印刷',
    copyOrderBtn: '复制工单口令',
    viewOrderStatusBtn: '查看订单进度',
    printCopiesLabel: '印制本数',
    promoBulkLabel: '满 2 本包邮享 9 折 · 赠同行伙伴',
    unitLabel: '单本',
    freeShippingLabel: '顺丰包邮',
    shippingFeeLabel: (sym, fee) => `顺丰运费 ${sym}${fee}`,
    deliveryInfoHeading: '收件人配送信息（隐私隔离加密存储）',
    recipientLabel: '收件人姓名',
    recipientPlaceholder: '例如：林小夏',
    phoneLabel: '联系电话 / 微信号',
    phonePlaceholder: '用于顺丰派送与核对样稿',
    addressLabel: '详细收货地址',
    addressPlaceholder: '省市区 + 街道门牌号',
    noteLabel: '印制或礼盒留言备注（选填）',
    notePlaceholder: '例如：送给纪念日礼物，请帮忙覆哑膜检查封面亮度',
    prepressGuarantee:
      '主理人人工印前审稿保障：提交后将为您人工复核 300DPI 分辨率与 3mm 书脊裁切位，确认无误后开机印制（约 3–5 个工作日顺丰发出）。',
    submitOrderBtn: (sym, total) => `提交印制工单 · ${sym}${total}`,
    loadingOrders: '正在读取印制工单...',
    noOrdersTitle: '暂无印制订单记录',
    noOrdersDesc: '排好纪念画册后，可随时提交付费定制印刷。',
    trackingPrefix: '快递运单号：',
    viewAddressBtn: '查看收货地址',
    contactDeskBtn: '联系主理人',
    cancelBtn: '取消工单',
    trackingPlaceholder: '输入顺丰/快递运单号...',
    markShippedBtn: '发货并保存单号',
  },
  'en-US': {
    statusLabels: {
      pending_payment: 'Pending Payment',
      paid_queued: 'Paid · Queued',
      printing: 'In Print Production',
      shipped: 'Shipped',
      cancelled: 'Cancelled',
    },
    curatedTripFallback: 'Curated Trip',
    formatSquare: '210×210mm Layflat Square',
    formatA5: '148×210mm A5 Portrait',
    bindingHardcover: 'Matte Hardcover · 170gsm Silk Art Paper',
    bindingSoftcover: 'Textured Softcover · 150gsm Munken Paper',
    buildManifest: (p) =>
      `[Trip Kit Photobook Print Order]\nOrder ID: ${p.orderId}\nTitle: ${p.bookTitle}\nTrips: ${p.tripSummary}\nSpec: ${p.formatLabel} · ${p.bindingLabel}\nPages: ${p.pageCount}P (${p.photoCount} photos) × ${p.copies} copy(s)\nTotal: ${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\nRecipient: ${p.recipientName} (${p.phone})\nAddress: ${p.shippingAddress}${
        p.customerNote ? `\nNote: ${p.customerNote}` : ''
      }`,
    errRecipient: 'Please enter recipient name.',
    errPhone: 'Please enter a valid contact phone number.',
    errAddress: 'Please enter full delivery address.',
    orderSyncedToast: (id) => `Order ${id} saved & synced to cloud`,
    orderLocalToast: (id) => `Order ${id} created locally`,
    pdfExportedToast: (pages) => `Exported 300DPI print PDF (${pages}P with 3mm bleed)`,
    pdfFailedToast: 'Failed to export print PDF',
    copiedToast: 'Order manifest copied!',
    copyFailedToast: 'Copy failed',
    noShippingToast: 'No shipping details found',
    updatedOrderToast: (id) => `Updated ${id}`,
    cancelledOrderToast: 'Order cancelled',
    modalTitle: 'Print-on-Demand Fulfillment',
    closeAria: 'Close',
    tabCheckout: 'Order Printed Book',
    tabAdminOrders: 'Print Queue (Admin)',
    tabMyOrders: 'My Print Orders',
    orderCreatedTitle: 'Print Order Created',
    orderCreatedSteps:
      'Step 1: Download the 300DPI print-ready PDF with 3mm bleed marks. Step 2: Send the order number & PDF to our print concierge on WhatsApp to confirm payment and start hardcover binding.',
    photosUnit: 'photos',
    copiesUnit: 'copies',
    downloadPrintPdfBtn: '1. Download 300DPI Bleed Print PDF',
    whatsappConfirmBtn: '2. Confirm Payment & Print via WhatsApp',
    copyOrderBtn: 'Copy Order Info',
    viewOrderStatusBtn: 'View Order Status',
    printCopiesLabel: 'Print Copies',
    promoBulkLabel: '2+ free shipping & 10% off',
    unitLabel: 'Unit',
    freeShippingLabel: 'Free Express Shipping',
    shippingFeeLabel: (sym, fee) => `Shipping ${sym}${fee}`,
    deliveryInfoHeading: 'Delivery Information',
    recipientLabel: 'Recipient Name',
    recipientPlaceholder: 'Full name',
    phoneLabel: 'Phone / WhatsApp',
    phonePlaceholder: '+1 / +86 ...',
    addressLabel: 'Full Street Address',
    addressPlaceholder: 'City, Street, Building, Apt, Postal Code',
    noteLabel: 'Print / Gift Note (Optional)',
    notePlaceholder: 'e.g., Gift box wrap, check cover brightness',
    prepressGuarantee:
      'Human pre-press review included: every order undergoes manual 300DPI & spine-bleed verification before printing (ships in 3–5 business days).',
    submitOrderBtn: (sym, total) => `Submit Print Order · ${sym}${total}`,
    loadingOrders: 'Loading print orders...',
    noOrdersTitle: 'No print orders yet',
    noOrdersDesc: 'Curate your travel photobook and submit a print order anytime.',
    trackingPrefix: 'Tracking:',
    viewAddressBtn: 'View Address',
    contactDeskBtn: 'Contact Print Desk',
    cancelBtn: 'Cancel',
    trackingPlaceholder: 'SF Express / DHL tracking #',
    markShippedBtn: 'Mark Shipped',
  },
  'es-MX': {
    statusLabels: {
      pending_payment: 'Pago pendiente',
      paid_queued: 'Pagado · En cola',
      printing: 'En impresión',
      shipped: 'Enviado',
      cancelled: 'Cancelado',
    },
    curatedTripFallback: 'Viaje seleccionado',
    formatSquare: '210×210mm Cuadrado Layflat',
    formatA5: '148×210mm A5 Vertical',
    bindingHardcover: 'Tapa dura mate · Papel arte seda 170g',
    bindingSoftcover: 'Tapa blanda texturizada · Papel Munken 150g',
    buildManifest: (p) =>
      `[Pedido de Fotolibro Trip Kit]\nPedido: ${p.orderId}\nTítulo: ${p.bookTitle}\nViajes: ${p.tripSummary}\nFormato: ${p.formatLabel} · ${p.bindingLabel}\nPáginas: ${p.pageCount}P (${p.photoCount} fotos) × ${p.copies}\nTotal: ${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\nDestinatario: ${p.recipientName} (${p.phone})\nDirección: ${p.shippingAddress}${
        p.customerNote ? `\nNota: ${p.customerNote}` : ''
      }`,
    errRecipient: 'Ingresa el nombre del destinatario.',
    errPhone: 'Ingresa un número de teléfono válido.',
    errAddress: 'Ingresa la dirección completa de entrega.',
    orderSyncedToast: (id) => `Pedido ${id} guardado y sincronizado`,
    orderLocalToast: (id) => `Pedido ${id} creado localmente`,
    pdfExportedToast: (pages) => `PDF de impresión 300DPI (${pages}P con sangrado 3 mm) exportado`,
    pdfFailedToast: 'Error al exportar PDF de impresión',
    copiedToast: '¡Resumen del pedido copiado!',
    copyFailedToast: 'Error al copiar',
    noShippingToast: 'No se encontraron datos de envío',
    updatedOrderToast: (id) => `Pedido ${id} actualizado`,
    cancelledOrderToast: 'Pedido cancelado',
    modalTitle: 'Impresión bajo demanda y pedidos',
    closeAria: 'Cerrar',
    tabCheckout: 'Pedir libro impreso',
    tabAdminOrders: 'Cola de impresión (Admin)',
    tabMyOrders: 'Mis pedidos',
    orderCreatedTitle: 'Pedido de impresión creado',
    orderCreatedSteps:
      'Paso 1: Descarga el PDF de 300DPI listo para imprenta con sangrado de 3 mm. Paso 2: Envía el número de pedido y PDF por WhatsApp para confirmar el pago e iniciar la encuadernación.',
    photosUnit: 'fotos',
    copiesUnit: 'ejemplar(es)',
    downloadPrintPdfBtn: '1. Descargar PDF 300DPI con sangrado',
    whatsappConfirmBtn: '2. Confirmar pago e impresión por WhatsApp',
    copyOrderBtn: 'Copiar datos del pedido',
    viewOrderStatusBtn: 'Ver estado del pedido',
    printCopiesLabel: 'Cantidad de ejemplares',
    promoBulkLabel: '2+ envío gratis y 10 % dto.',
    unitLabel: 'Unidad',
    freeShippingLabel: 'Envío exprés gratis',
    shippingFeeLabel: (sym, fee) => `Envío ${sym}${fee}`,
    deliveryInfoHeading: 'Información de entrega',
    recipientLabel: 'Nombre del destinatario',
    recipientPlaceholder: 'Nombre completo',
    phoneLabel: 'Teléfono / WhatsApp',
    phonePlaceholder: '+52 / +1 ...',
    addressLabel: 'Dirección completa',
    addressPlaceholder: 'Ciudad, calle, número, colonia, C.P.',
    noteLabel: 'Nota de impresión o regalo (opcional)',
    notePlaceholder: 'Ej. Envoltura de regalo, revisar brillo de portada',
    prepressGuarantee:
      'Revisión humana previa incluida: cada pedido pasa por verificación manual de 300DPI y sangrado de 3 mm antes de imprimir (envío en 3–5 días hábiles).',
    submitOrderBtn: (sym, total) => `Enviar pedido · ${sym}${total}`,
    loadingOrders: 'Cargando pedidos...',
    noOrdersTitle: 'Aún no hay pedidos impresos',
    noOrdersDesc: 'Diseña tu fotolibro de viaje y pide tu ejemplar cuando quieras.',
    trackingPrefix: 'Guía:',
    viewAddressBtn: 'Ver dirección',
    contactDeskBtn: 'Contactar taller',
    cancelBtn: 'Cancelar',
    trackingPlaceholder: 'N.º de guía DHL / paquetería',
    markShippedBtn: 'Marcar enviado',
  },
  'fr-FR': {
    statusLabels: {
      pending_payment: 'Paiement en attente',
      paid_queued: 'Payé · En attente',
      printing: 'En impression',
      shipped: 'Expédié',
      cancelled: 'Annulé',
    },
    curatedTripFallback: 'Voyage sélectionné',
    formatSquare: '210×210mm Carré ouverture à plat',
    formatA5: '148×210mm A5 Portrait',
    bindingHardcover: 'Reliure rigide mate · Papier d’art 170g',
    bindingSoftcover: 'Couverture souple texturée · Papier Munken 150g',
    buildManifest: (p) =>
      `[Commande Album Photo Trip Kit]\nCommande : ${p.orderId}\nTitre : ${p.bookTitle}\nVoyages : ${p.tripSummary}\nFormat : ${p.formatLabel} · ${p.bindingLabel}\nPages : ${p.pageCount}P (${p.photoCount} photos) × ${p.copies}\nTotal : ${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\nDestinataire : ${p.recipientName} (${p.phone})\nAdresse : ${p.shippingAddress}${
        p.customerNote ? `\nNote : ${p.customerNote}` : ''
      }`,
    errRecipient: 'Veuillez saisir le nom du destinataire.',
    errPhone: 'Veuillez saisir un numéro de téléphone valide.',
    errAddress: 'Veuillez saisir l’adresse complète de livraison.',
    orderSyncedToast: (id) => `Commande ${id} enregistrée et synchronisée`,
    orderLocalToast: (id) => `Commande ${id} créée localement`,
    pdfExportedToast: (pages) => `PDF d’impression 300DPI (${pages}P avec fond perdu 3 mm) exporté`,
    pdfFailedToast: 'Échec de l’export PDF d’impression',
    copiedToast: 'Récapitulatif de commande copié !',
    copyFailedToast: 'Échec de la copie',
    noShippingToast: 'Aucun détail de livraison trouvé',
    updatedOrderToast: (id) => `Commande ${id} mise à jour`,
    cancelledOrderToast: 'Commande annulée',
    modalTitle: 'Impression à la demande & suivi',
    closeAria: 'Fermer',
    tabCheckout: 'Commander le livre',
    tabAdminOrders: 'File d’impression (Admin)',
    tabMyOrders: 'Mes commandes',
    orderCreatedTitle: 'Commande d’impression créée',
    orderCreatedSteps:
      'Étape 1 : Téléchargez le PDF 300DPI prêt pour l’imprimeur avec repères de 3 mm. Étape 2 : Envoyez le numéro de commande et le PDF sur WhatsApp pour confirmer le paiement et lancer la reliure.',
    photosUnit: 'photos',
    copiesUnit: 'exemplaire(s)',
    downloadPrintPdfBtn: '1. Télécharger le PDF 300DPI (fond perdu 3 mm)',
    whatsappConfirmBtn: '2. Confirmer paiement & impression via WhatsApp',
    copyOrderBtn: 'Copier la commande',
    viewOrderStatusBtn: 'Suivre la commande',
    printCopiesLabel: 'Exemplaires',
    promoBulkLabel: 'Livraison offerte & -10 % dès 2 ex.',
    unitLabel: 'Unité',
    freeShippingLabel: 'Livraison express offerte',
    shippingFeeLabel: (sym, fee) => `Livraison ${sym}${fee}`,
    deliveryInfoHeading: 'Coordonnées de livraison',
    recipientLabel: 'Nom du destinataire',
    recipientPlaceholder: 'Nom complet',
    phoneLabel: 'Téléphone / WhatsApp',
    phonePlaceholder: '+33 / +1 ...',
    addressLabel: 'Adresse complète',
    addressPlaceholder: 'Ville, rue, numéro, code postal',
    noteLabel: 'Note d’impression ou cadeau (optionnel)',
    notePlaceholder: 'Ex. Emballage cadeau, vérifier la luminosité de couverture',
    prepressGuarantee:
      'Contrôle humain inclus : chaque commande fait l’objet d’une vérification 300DPI et dos/fond perdu avant impression (expédition sous 3–5 jours ouvrés).',
    submitOrderBtn: (sym, total) => `Valider la commande · ${sym}${total}`,
    loadingOrders: 'Chargement des commandes...',
    noOrdersTitle: 'Aucune commande pour le moment',
    noOrdersDesc: 'Mettez en page votre album photo et commandez votre exemplaire à tout moment.',
    trackingPrefix: 'Suivi :',
    viewAddressBtn: 'Voir l’adresse',
    contactDeskBtn: 'Contacter l’atelier',
    cancelBtn: 'Annuler',
    trackingPlaceholder: 'N° de suivi DHL / transporteur',
    markShippedBtn: 'Marquer expédié',
  },
  'de-DE': {
    statusLabels: {
      pending_payment: 'Zahlung ausstehend',
      paid_queued: 'Bezahlt · Warteschlange',
      printing: 'Im Druck',
      shipped: 'Versandt',
      cancelled: 'Storniert',
    },
    curatedTripFallback: 'Ausgewählte Reise',
    formatSquare: '210×210mm Layflat-Quadrat',
    formatA5: '148×210mm A5 Hochformat',
    bindingHardcover: 'Mattes Hardcover · 170g Bilderdruckpapier',
    bindingSoftcover: 'Strukturiertes Softcover · 150g Munken-Papier',
    buildManifest: (p) =>
      `[Trip Kit Fotobuch-Druckauftrag]\nAuftrag: ${p.orderId}\nTitel: ${p.bookTitle}\nReisen: ${p.tripSummary}\nFormat: ${p.formatLabel} · ${p.bindingLabel}\nSeiten: ${p.pageCount}S (${p.photoCount} Fotos) × ${p.copies}\nSumme: ${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\nEmpfänger: ${p.recipientName} (${p.phone})\nAdresse: ${p.shippingAddress}${
        p.customerNote ? `\nNotiz: ${p.customerNote}` : ''
      }`,
    errRecipient: 'Bitte Empfängernamen angeben.',
    errPhone: 'Bitte gültige Telefonnummer angeben.',
    errAddress: 'Bitte vollständige Lieferadresse angeben.',
    orderSyncedToast: (id) => `Auftrag ${id} gespeichert & synchronisiert`,
    orderLocalToast: (id) => `Auftrag ${id} lokal erstellt`,
    pdfExportedToast: (pages) => `300-DPI-Druck-PDF (${pages}S mit 3 mm Beschnitt) exportiert`,
    pdfFailedToast: 'Druck-PDF-Export fehlgeschlagen',
    copiedToast: 'Auftragsdaten kopiert!',
    copyFailedToast: 'Kopieren fehlgeschlagen',
    noShippingToast: 'Keine Versanddaten gefunden',
    updatedOrderToast: (id) => `Auftrag ${id} aktualisiert`,
    cancelledOrderToast: 'Auftrag storniert',
    modalTitle: 'Print-on-Demand & Aufträge',
    closeAria: 'Schließen',
    tabCheckout: 'Gedrucktes Buch bestellen',
    tabAdminOrders: 'Druckwarteschlange (Admin)',
    tabMyOrders: 'Meine Aufträge',
    orderCreatedTitle: 'Druckauftrag erstellt',
    orderCreatedSteps:
      'Schritt 1: Lade das druckfertige 300-DPI-PDF mit 3 mm Beschnitt herunter. Schritt 2: Sende Auftragsnummer & PDF per WhatsApp zur Zahlungsbestätigung und Hardcover-Produktion.',
    photosUnit: 'Fotos',
    copiesUnit: 'Exemplar(e)',
    downloadPrintPdfBtn: '1. 300-DPI-Druck-PDF herunterladen',
    whatsappConfirmBtn: '2. Zahlung & Druck per WhatsApp bestätigen',
    copyOrderBtn: 'Auftragsdaten kopieren',
    viewOrderStatusBtn: 'Auftragsstatus ansehen',
    printCopiesLabel: 'Auflage',
    promoBulkLabel: 'Ab 2 Stk. gratis Versand & 10 % Rabatt',
    unitLabel: 'Einzelpreis',
    freeShippingLabel: 'Kostenloser Expressversand',
    shippingFeeLabel: (sym, fee) => `Versand ${sym}${fee}`,
    deliveryInfoHeading: 'Lieferinformationen',
    recipientLabel: 'Name des Empfängers',
    recipientPlaceholder: 'Vollständiger Name',
    phoneLabel: 'Telefon / WhatsApp',
    phonePlaceholder: '+49 / +1 ...',
    addressLabel: 'Vollständige Adresse',
    addressPlaceholder: 'Stadt, Straße, Hausnr., PLZ',
    noteLabel: 'Druck- / Geschenknotiz (optional)',
    notePlaceholder: 'z. B. Geschenkverpackung, Cover-Helligkeit prüfen',
    prepressGuarantee:
      'Manuelle Vorstufenprüfung inklusive: Jeder Auftrag wird vor dem Druck auf 300 DPI und 3 mm Beschnitt geprüft (Versand in 3–5 Werktagen).',
    submitOrderBtn: (sym, total) => `Druckauftrag absenden · ${sym}${total}`,
    loadingOrders: 'Lade Druckaufträge...',
    noOrdersTitle: 'Noch keine Druckaufträge',
    noOrdersDesc: 'Gestalte dein Reisefotobuch und bestelle jederzeit ein gedrucktes Exemplar.',
    trackingPrefix: 'Sendungsnr.:',
    viewAddressBtn: 'Adresse ansehen',
    contactDeskBtn: 'Druckservice kontaktieren',
    cancelBtn: 'Stornieren',
    trackingPlaceholder: 'DHL / Sendungsnummer',
    markShippedBtn: 'Als versandt markieren',
  },
  'pt-BR': {
    statusLabels: {
      pending_payment: 'Aguardando pagamento',
      paid_queued: 'Pago · Na fila',
      printing: 'Em impressão',
      shipped: 'Enviado',
      cancelled: 'Cancelado',
    },
    curatedTripFallback: 'Viagem selecionada',
    formatSquare: '210×210mm Quadrado Layflat',
    formatA5: '148×210mm A5 Retrato',
    bindingHardcover: 'Capa dura fosca · Papel couchê fosco 170g',
    bindingSoftcover: 'Capa mole texturizada · Papel Munken 150g',
    buildManifest: (p) =>
      `[Pedido de Fotolivro Trip Kit]\nPedido: ${p.orderId}\nTítulo: ${p.bookTitle}\nViagens: ${p.tripSummary}\nFormato: ${p.formatLabel} · ${p.bindingLabel}\nPáginas: ${p.pageCount}P (${p.photoCount} fotos) × ${p.copies}\nTotal: ${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\nDestinatário: ${p.recipientName} (${p.phone})\nEndereço: ${p.shippingAddress}${
        p.customerNote ? `\nObs.: ${p.customerNote}` : ''
      }`,
    errRecipient: 'Informe o nome do destinatário.',
    errPhone: 'Informe um telefone de contato válido.',
    errAddress: 'Informe o endereço completo de entrega.',
    orderSyncedToast: (id) => `Pedido ${id} salvo e sincronizado`,
    orderLocalToast: (id) => `Pedido ${id} criado localmente`,
    pdfExportedToast: (pages) => `PDF de impressão 300DPI (${pages}P com sangria 3 mm) exportado`,
    pdfFailedToast: 'Falha ao exportar PDF de impressão',
    copiedToast: 'Resumo do pedido copiado!',
    copyFailedToast: 'Falha ao copiar',
    noShippingToast: 'Nenhum dado de entrega encontrado',
    updatedOrderToast: (id) => `Pedido ${id} atualizado`,
    cancelledOrderToast: 'Pedido cancelado',
    modalTitle: 'Impressão sob demanda e pedidos',
    closeAria: 'Fechar',
    tabCheckout: 'Pedir livro impresso',
    tabAdminOrders: 'Fila de impressão (Admin)',
    tabMyOrders: 'Meus pedidos',
    orderCreatedTitle: 'Pedido de impressão criado',
    orderCreatedSteps:
      'Passo 1: Baixe o PDF de 300DPI pronto para gráfica com sangria de 3 mm. Passo 2: Envie o número do pedido e o PDF pelo WhatsApp para confirmar o pagamento e iniciar a encadernação.',
    photosUnit: 'fotos',
    copiesUnit: 'cópia(s)',
    downloadPrintPdfBtn: '1. Baixar PDF 300DPI com sangria',
    whatsappConfirmBtn: '2. Confirmar pagamento e impressão via WhatsApp',
    copyOrderBtn: 'Copiar dados do pedido',
    viewOrderStatusBtn: 'Ver status do pedido',
    printCopiesLabel: 'Cópias impressas',
    promoBulkLabel: '2+ frete grátis e 10% off',
    unitLabel: 'Unidade',
    freeShippingLabel: 'Frete expresso grátis',
    shippingFeeLabel: (sym, fee) => `Frete ${sym}${fee}`,
    deliveryInfoHeading: 'Dados de entrega',
    recipientLabel: 'Nome do destinatário',
    recipientPlaceholder: 'Nome completo',
    phoneLabel: 'Telefone / WhatsApp',
    phonePlaceholder: '+55 / +1 ...',
    addressLabel: 'Endereço completo',
    addressPlaceholder: 'Cidade, rua, número, complemento, CEP',
    noteLabel: 'Nota de impressão ou presente (opcional)',
    notePlaceholder: 'Ex.: Embalagem para presente, conferir brilho da capa',
    prepressGuarantee:
      'Revisão humana incluída: cada pedido passa por checagem manual de 300DPI e sangria de 3 mm antes da impressão (envio em 3–5 dias úteis).',
    submitOrderBtn: (sym, total) => `Enviar pedido · ${sym}${total}`,
    loadingOrders: 'Carregando pedidos...',
    noOrdersTitle: 'Nenhum pedido impresso ainda',
    noOrdersDesc: 'Monte seu fotolivro de viagem e peça sua edição impressa quando quiser.',
    trackingPrefix: 'Rastreio:',
    viewAddressBtn: 'Ver endereço',
    contactDeskBtn: 'Falar com a gráfica',
    cancelBtn: 'Cancelar',
    trackingPlaceholder: 'Código de rastreio DHL / Correios',
    markShippedBtn: 'Marcar enviado',
  },
  'ja-JP': {
    statusLabels: {
      pending_payment: 'お支払い確認待ち',
      paid_queued: '入金済み・印刷待ち',
      printing: '印刷・製本工程中',
      shipped: '発送完了',
      cancelled: 'キャンセル済み',
    },
    curatedTripFallback: '厳選ルート',
    formatSquare: '210×210mm フラット開本スクエア',
    formatA5: '148×210mm A5 縦判',
    bindingHardcover: 'マットハードカバー · 170g アート紙',
    bindingSoftcover: '手触りソフトカバー · 150g モンケン紙',
    buildManifest: (p) =>
      `【Trip Kit フォトブック製本注文書】\n注文番号：${p.orderId}\nタイトル：『${p.bookTitle}』\n収録ルート：${p.tripSummary}\n製本仕様：${p.formatLabel} · ${p.bindingLabel}\nページ写真：${p.pageCount}P（3mm塗り足し付き · ${p.photoCount}枚収録）× ${p.copies} 冊\n合計金額：${p.currencySymbol}${p.totalPrice} ${p.currencyCode}\n受取人：${p.recipientName}（${p.phone}）\nお届け先：${p.shippingAddress}${
        p.customerNote ? `\n印刷メモ：${p.customerNote}` : ''
      }`,
    errRecipient: '受取人のお名前を入力してください',
    errPhone: '有効な電話番号（5桁以上）を入力してください',
    errAddress: 'お届け先の詳細住所を入力してください',
    orderSyncedToast: (id) => `製本注文 ${id} を作成しクラウド同期しました`,
    orderLocalToast: (id) => `製本注文 ${id} を作成しました`,
    pdfExportedToast: (pages) => `3mm 塗り足し付き 300DPI 印刷用 PDF（全 ${pages}P）を出力しました`,
    pdfFailedToast: '印刷 PDF の出力に失敗しました。もう一度お試しください',
    copiedToast: '注文内容をクリップボードにコピーしました！',
    copyFailedToast: 'コピーに失敗しました',
    noShippingToast: 'お届け先データが見つかりません',
    updatedOrderToast: (id) => `注文 ${id} のステータスを更新しました`,
    cancelledOrderToast: 'この印刷注文をキャンセルしました',
    modalTitle: 'フォトブック製本・印刷注文',
    closeAria: '閉じる',
    tabCheckout: '製本を注文する',
    tabAdminOrders: '全印刷注文 (管理者)',
    tabMyOrders: '注文履歴',
    orderCreatedTitle: '印刷注文が発行されました',
    orderCreatedSteps:
      'ステップ 1：下のボタンから「3mm 塗り足し付き 300DPI 印刷用 PDF」を保存。ステップ 2：WhatsApp で注文番号と PDF を送信してお支払い確認後、製本・発送工程へ進みます。',
    photosUnit: '枚収録',
    copiesUnit: '冊',
    downloadPrintPdfBtn: '1. 300DPI 塗り足し付き印刷 PDF を保存',
    whatsappConfirmBtn: '2. WhatsApp でお支払い・印刷を確定する',
    copyOrderBtn: '注文内容をコピー',
    viewOrderStatusBtn: '注文状況を見る',
    printCopiesLabel: '印刷部数',
    promoBulkLabel: '2冊以上で送料無料 & 10% OFF',
    unitLabel: '1冊単価',
    freeShippingLabel: '送料無料',
    shippingFeeLabel: (sym, fee) => `送料 ${sym}${fee}`,
    deliveryInfoHeading: 'お届け先配送情報（プライバシー保護保存）',
    recipientLabel: '受取人氏名',
    recipientPlaceholder: '例：山田 花子',
    phoneLabel: '電話番号 / WhatsApp',
    phonePlaceholder: '+81 / +1 ...',
    addressLabel: 'お届け先住所',
    addressPlaceholder: '都道府県・市区町村・番地・郵便番号',
    noteLabel: '印刷・ギフト用メモ（任意）',
    notePlaceholder: '例：ギフト包装希望、表紙の明るさ確認をお願いします',
    prepressGuarantee:
      '専任スタッフによる入稿前チェック付き：すべての注文は 300DPI 解像度と 3mm 背表紙断裁位置を目視確認してから印刷いたします（通常 3〜5 営業日で発送）。',
    submitOrderBtn: (sym, total) => `製本注文を確定 · ${sym}${total}`,
    loadingOrders: '注文履歴を読み込み中...',
    noOrdersTitle: '印刷注文はまだありません',
    noOrdersDesc: 'フォトブックのレイアウトを整えたら、いつでも製本を注文できます。',
    trackingPrefix: '追跡番号：',
    viewAddressBtn: '配送先を表示',
    contactDeskBtn: '担当窓口へ連絡',
    cancelBtn: '注文を取消',
    trackingPlaceholder: '配送伝票番号を入力...',
    markShippedBtn: '発送済みにする',
  },
};

export function getPrintOrderCheckoutCopy(lang: AppLanguage): PrintOrderCheckoutCopy {
  return pickLang(lang, PRINT_ORDER_CHECKOUT_PACK);
}

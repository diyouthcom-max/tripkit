import type { AppLanguage } from '../../types';
import { pickLang } from '../langHelper';

export interface CopilotUiCopy {
  headerTitle: string;
  daysCompact: (days: number) => string;
  ideasBtn: string;
  newChatTitle: string;
  welcomeTitle: string;
  welcomeDesc: string;
  tabFeatured: string;
  tabTips: string;
  tabInspiration: string;
  tabItinerary: string;
  tabExpense: string;
  tabPacking: string;
  errorUnavailable: string;
  errorReceiptScan: string;
  walletCash: string;
  walletTransit: string;
  walletCard: string;
  vatPoolSuffix: string;
  receiptPrompt: (fileName: string) => string;
  receiptReply: (title: string, wallet: string, vatSuffix: string) => string;
  proposalAppliedBanner: string;
  proposalSkippedBanner: string;
  proposalPendingBanner: string;
  addPackingHeading: (count: number) => string;
  addTasksHeading: (count: number) => string;
  taxFreeTag: string;
  rainEnable: (day: number) => string;
  rainDisable: (day: number) => string;
  skipBtn: string;
  applyBtn: string;
  savedToTrip: string;
  viewDayBtn: (day: number) => string;
  openPackingBtn: string;
  openFinanceBtn: string;
  noChangesApplied: string;
  loggedPrefix: string;
  viewBtn: string;
  phraseCardHeader: string;
  pronunciationPrefix: string;
  tipPrefix: string;
  thinkingText: string;
  inputPlaceholder: (city: string) => string;
  voiceLabel: string;
  dateChangeSummary: (departure: string, returnDate: string, days: number) => string;
  dateChangeRisk: string;
  destinationChangeSummary: (cities: string) => string;
  destinationChangeNote: string;
  rebuildPromptSummary: (prompt: string) => string;
  rebuildSaveAsNew: string;
  rebuildOverwriteWarning: string;
  packingTemplateSummary: (scene: string) => string;
  packingTemplateMerge: string;
  overwriteConfirmTitle: string;
  overwriteConfirmRisk: string;
  overwriteConfirmYes: string;
  overwriteCancel: string;
  overwriteSaveAsNew: string;
  overwriteNeedConfirm: string;
  resultDateApplied: string;
  resultDestinationApplied: string;
  resultRebuildApplied: string;
  resultPackingApplied: string;
}

const COPILOT_UI_MAP = {
  'zh-CN': {
    headerTitle: 'AI 旅行助手',
    daysCompact: (days: number) => `${days} 天`,
    ideasBtn: '灵感与提示',
    newChatTitle: '开启新对话',
    welcomeTitle: '关于这趟行程，随时问我。',
    welcomeDesc:
      '支持直接用自然语言改出发日期、增删城市、重排行程或联动 9 袋打包模板。在你点击「一键应用」前，原行程不会有任何改动。',
    tabFeatured: '精选',
    tabTips: '旅行提示',
    tabInspiration: '本地灵感',
    tabItinerary: '调行程',
    tabExpense: '记账',
    tabPacking: '打包',
    errorUnavailable: 'AI 助手暂时无法响应，请稍后重试',
    errorReceiptScan: '小票图片识别失败，请重试',
    walletCash: '现金钱包',
    walletTransit: '交通卡',
    walletCard: '信用卡额度',
    vatPoolSuffix: '，且该笔消费已计入离境退税池',
    receiptPrompt: (fileName: string) => `上传小票识别：${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `已识别小票并入账「${title}」，同步扣减${wallet}${vatSuffix}。`,
    proposalAppliedBanner: '✓ 已应用到行程',
    proposalSkippedBanner: '已暂缓应用',
    proposalPendingBanner: '待确认提案 · 点击下方应用才生效',
    addPackingHeading: (count: number) => `新增行李物品（${count} 项）`,
    addTasksHeading: (count: number) => `新增行前待办（${count} 项）`,
    taxFreeTag: ' · 计入退税池',
    rainEnable: (day: number) => `开启 Day ${day} 防雨预案（户外站点切为室内备选）`,
    rainDisable: (day: number) => `恢复 Day ${day} 晴天原定户外路线`,
    skipBtn: '暂不应用',
    applyBtn: '一键应用',
    savedToTrip: '已写入行程',
    viewDayBtn: (day: number) => `前往 D${day} 查看`,
    openPackingBtn: '前往行李清单',
    openFinanceBtn: '前往账本查看',
    noChangesApplied: '未修改原行程',
    loggedPrefix: '已识别入账：',
    viewBtn: '查看',
    phraseCardHeader: '当地沟通卡（可直接出示屏幕）',
    pronunciationPrefix: '发音提示：',
    tipPrefix: '礼仪贴士：',
    thinkingText: '正在结合你的行程整理建议...',
    inputPlaceholder: (city: string) =>
      `问任何关于${city}行程的问题，或让我直接修改日期/路线/9袋清单...`,
    voiceLabel: '语音',
    dateChangeSummary: (departure, returnDate, days) =>
      `改期：${departure} → ${returnDate}（${days} 天）`,
    dateChangeRisk: '改期后请复核：星期几开闭馆、天气、逐日预算是否仍匹配。',
    destinationChangeSummary: (cities) => `换城市：${cities}`,
    destinationChangeNote: '会同步逐日城市字段，但已有站点地址/坐标需复核。',
    rebuildPromptSummary: (prompt) => `重建行程：${prompt}`,
    rebuildSaveAsNew: '将另存一份新行程，当前行程不变。',
    rebuildOverwriteWarning: '覆盖将重置：打包勾选状态、记账流水、已到访标记。',
    packingTemplateSummary: (scene) => `打包模板：${scene}`,
    packingTemplateMerge: '智能合并，保留已勾选进度。',
    overwriteConfirmTitle: '确认覆盖当前行程？',
    overwriteConfirmRisk:
      '覆盖会重置打包勾选状态、记账流水与已到访标记，且不可撤销。',
    overwriteConfirmYes: '我确认覆盖',
    overwriteCancel: '取消',
    overwriteSaveAsNew: '改为另存新行程',
    overwriteNeedConfirm: '请先确认覆盖后再点「一键应用」',
    resultDateApplied: '出发日期已更新',
    resultDestinationApplied: '目的地城市已更新',
    resultRebuildApplied: '行程重建已应用',
    resultPackingApplied: '打包模板已更新',
  },
  'en-US': {
    headerTitle: 'Ask Trip Kit',
    daysCompact: (days: number) => `${days}d`,
    ideasBtn: 'Ideas',
    newChatTitle: 'Start new conversation',
    welcomeTitle: 'Ask about this trip.',
    welcomeDesc:
      'Change departure dates, add or remove cities, replan days, or sync 9-bag packing templates in plain language. Nothing changes until you tap Apply.',
    tabFeatured: 'Featured',
    tabTips: 'Travel Tips',
    tabInspiration: 'Inspiration',
    tabItinerary: 'Itinerary',
    tabExpense: 'Expenses',
    tabPacking: 'Packing',
    errorUnavailable: 'AI Copilot is temporarily unavailable. Please try again.',
    errorReceiptScan: 'Failed to scan receipt image. Please try again.',
    walletCash: 'cash wallet',
    walletTransit: 'transit card',
    walletCard: 'credit card balance',
    vatPoolSuffix: ' and added to your tax-free refund pool',
    receiptPrompt: (fileName: string) => `Receipt scan: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Scanned receipt and logged "${title}" (${wallet} updated${vatSuffix}).`,
    proposalAppliedBanner: '✓ Applied to Trip',
    proposalSkippedBanner: 'Skipped',
    proposalPendingBanner: 'Proposed Update · Nothing changed yet',
    addPackingHeading: (count: number) => `Add to Packing List (${count})`,
    addTasksHeading: (count: number) => `Add Pre-Trip Tasks (${count})`,
    taxFreeTag: ' · Tax-free',
    rainEnable: (day: number) => `Switch Day ${day} outdoor stops to indoor rain backups`,
    rainDisable: (day: number) => `Restore Day ${day} original outdoor route`,
    skipBtn: 'Skip',
    applyBtn: 'Apply',
    savedToTrip: 'Saved to trip',
    viewDayBtn: (day: number) => `View Day ${day}`,
    openPackingBtn: 'Open Packing',
    openFinanceBtn: 'Open Finance',
    noChangesApplied: 'No changes applied',
    loggedPrefix: 'Logged: ',
    viewBtn: 'View',
    phraseCardHeader: 'Local Phrase Card (Show Screen)',
    pronunciationPrefix: 'Pronunciation: ',
    tipPrefix: 'Tip: ',
    thinkingText: 'Thinking through your trip...',
    inputPlaceholder: (city: string) =>
      `Ask anything about your ${city} trip, or have me edit dates / route / 9-bag list...`,
    voiceLabel: 'Voice',
    dateChangeSummary: (departure, returnDate, days) =>
      `Reschedule: ${departure} → ${returnDate} (${days} days)`,
    dateChangeRisk:
      'After rescheduling, recheck weekday openings, weather, and daily budgets.',
    destinationChangeSummary: (cities) => `Cities: ${cities}`,
    destinationChangeNote:
      'Daily city fields will sync, but existing stop addresses/coords need a review.',
    rebuildPromptSummary: (prompt) => `Rebuild: ${prompt}`,
    rebuildSaveAsNew: 'Will save as a new trip; your current trip stays unchanged.',
    rebuildOverwriteWarning:
      'Overwrite resets packing checkmarks, expense history, and visited marks.',
    packingTemplateSummary: (scene) => `Packing template: ${scene}`,
    packingTemplateMerge: 'Smart merge keeps your checked progress.',
    overwriteConfirmTitle: 'Overwrite this trip?',
    overwriteConfirmRisk:
      'Overwrite resets packing checkmarks, expense history, and visited marks. This cannot be undone.',
    overwriteConfirmYes: 'I confirm overwrite',
    overwriteCancel: 'Cancel',
    overwriteSaveAsNew: 'Save as a new trip instead',
    overwriteNeedConfirm: 'Confirm overwrite before tapping Apply',
    resultDateApplied: 'Trip dates updated',
    resultDestinationApplied: 'Destination cities updated',
    resultRebuildApplied: 'Itinerary rebuild applied',
    resultPackingApplied: 'Packing template updated',
  },
  'en-GB': {
    headerTitle: 'Ask Trip Kit',
    daysCompact: (days: number) => `${days}d`,
    ideasBtn: 'Ideas',
    newChatTitle: 'Start new conversation',
    welcomeTitle: 'Ask about this journey.',
    welcomeDesc:
      'Change departure dates, add or remove cities, replan days, or sync 9-bag packing templates in plain language. Nothing changes until you tap Apply.',
    tabFeatured: 'Featured',
    tabTips: 'Travel Tips',
    tabInspiration: 'Inspiration',
    tabItinerary: 'Itinerary',
    tabExpense: 'Expenses',
    tabPacking: 'Packing',
    errorUnavailable: 'AI Assistant is temporarily unavailable. Please try again.',
    errorReceiptScan: 'Failed to scan receipt image. Please try again.',
    walletCash: 'cash wallet',
    walletTransit: 'travelcard',
    walletCard: 'bank card balance',
    vatPoolSuffix: ' and added to your VAT refund pool',
    receiptPrompt: (fileName: string) => `Receipt scan: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Scanned receipt and logged "${title}" (${wallet} updated${vatSuffix}).`,
    proposalAppliedBanner: '✓ Applied to Journey',
    proposalSkippedBanner: 'Skipped',
    proposalPendingBanner: 'Proposed Update · Nothing changed yet',
    addPackingHeading: (count: number) => `Add to Baggage List (${count})`,
    addTasksHeading: (count: number) => `Add Holiday Admin (${count})`,
    taxFreeTag: ' · VAT-free',
    rainEnable: (day: number) => `Switch Day ${day} outdoor stops to indoor wet-weather backups`,
    rainDisable: (day: number) => `Restore Day ${day} original outdoor route`,
    skipBtn: 'Skip',
    applyBtn: 'Apply',
    savedToTrip: 'Saved to journey',
    viewDayBtn: (day: number) => `View Day ${day}`,
    openPackingBtn: 'Open Packing',
    openFinanceBtn: 'Open Finance',
    noChangesApplied: 'No changes applied',
    loggedPrefix: 'Logged: ',
    viewBtn: 'View',
    phraseCardHeader: 'Local Phrase Card (Show Screen)',
    pronunciationPrefix: 'Pronunciation: ',
    tipPrefix: 'Tip: ',
    thinkingText: 'Thinking through your journey...',
    inputPlaceholder: (city: string) =>
      `Ask anything about your ${city} journey, or have me edit dates / route / 9-bag list...`,
    voiceLabel: 'Voice',
    dateChangeSummary: (departure, returnDate, days) =>
      `Reschedule: ${departure} → ${returnDate} (${days} days)`,
    dateChangeRisk:
      'After rescheduling, recheck weekday openings, weather, and daily budgets.',
    destinationChangeSummary: (cities) => `Cities: ${cities}`,
    destinationChangeNote:
      'Daily city fields will sync, but existing stop addresses/coords need a review.',
    rebuildPromptSummary: (prompt) => `Rebuild: ${prompt}`,
    rebuildSaveAsNew: 'Will save as a new journey; your current journey stays unchanged.',
    rebuildOverwriteWarning:
      'Overwrite resets packing checkmarks, expense history, and visited marks.',
    packingTemplateSummary: (scene) => `Packing template: ${scene}`,
    packingTemplateMerge: 'Smart merge keeps your checked progress.',
    overwriteConfirmTitle: 'Overwrite this journey?',
    overwriteConfirmRisk:
      'Overwrite resets packing checkmarks, expense history, and visited marks. This cannot be undone.',
    overwriteConfirmYes: 'I confirm overwrite',
    overwriteCancel: 'Cancel',
    overwriteSaveAsNew: 'Save as a new journey instead',
    overwriteNeedConfirm: 'Confirm overwrite before tapping Apply',
    resultDateApplied: 'Journey dates updated',
    resultDestinationApplied: 'Destination cities updated',
    resultRebuildApplied: 'Itinerary rebuild applied',
    resultPackingApplied: 'Packing template updated',
  },
  'es-MX': {
    headerTitle: 'Asistente IA',
    daysCompact: (days: number) => `${days} d`,
    ideasBtn: 'Ideas',
    newChatTitle: 'Nueva conversación',
    welcomeTitle: 'Pregunta lo que sea de este viaje.',
    welcomeDesc:
      'Cambia fechas de salida, agrega o quita ciudades, reordena el itinerario o sincroniza plantillas de 9 bolsas en lenguaje natural. Nada cambia hasta que toques Aplicar.',
    tabFeatured: 'Destacados',
    tabTips: 'Consejos',
    tabInspiration: 'Inspiración',
    tabItinerary: 'Itinerario',
    tabExpense: 'Gastos',
    tabPacking: 'Equipaje',
    errorUnavailable: 'El asistente no está disponible en este momento. Intenta de nuevo.',
    errorReceiptScan: 'No se pudo leer la imagen del recibo. Intenta otra vez.',
    walletCash: 'efectivo',
    walletTransit: 'tarjeta de transporte',
    walletCard: 'tarjeta de crédito',
    vatPoolSuffix: ' y se sumó al fondo Tax-Free',
    receiptPrompt: (fileName: string) => `Escaneo de recibo: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Recibo registrado: "${title}" (${wallet} actualizado${vatSuffix}).`,
    proposalAppliedBanner: '✓ Aplicado al viaje',
    proposalSkippedBanner: 'Omitido',
    proposalPendingBanner: 'Propuesta · Sin cambios aún',
    addPackingHeading: (count: number) => `Agregar al equipaje (${count})`,
    addTasksHeading: (count: number) => `Agregar pendientes (${count})`,
    taxFreeTag: ' · Tax-Free',
    rainEnable: (day: number) => `Cambiar Día ${day} a plan bajo techo por lluvia`,
    rainDisable: (day: number) => `Restaurar ruta al aire libre del Día ${day}`,
    skipBtn: 'Omitir',
    applyBtn: 'Aplicar',
    savedToTrip: 'Guardado en el viaje',
    viewDayBtn: (day: number) => `Ver Día ${day}`,
    openPackingBtn: 'Abrir equipaje',
    openFinanceBtn: 'Abrir finanzas',
    noChangesApplied: 'Sin cambios aplicados',
    loggedPrefix: 'Registrado: ',
    viewBtn: 'Ver',
    phraseCardHeader: 'Tarjeta de frases locales (muéstrala en pantalla)',
    pronunciationPrefix: 'Pronunciación: ',
    tipPrefix: 'Consejo: ',
    thinkingText: 'Analizando tu viaje...',
    inputPlaceholder: (city: string) =>
      `Pregunta sobre tu viaje a ${city}, o pídeme editar fechas / ruta / lista de 9 bolsas...`,
    voiceLabel: 'Voz',
    dateChangeSummary: (departure, returnDate, days) =>
      `Reprogramar: ${departure} → ${returnDate} (${days} días)`,
    dateChangeRisk:
      'Tras cambiar fechas, revisa aperturas por día, clima y presupuestos diarios.',
    destinationChangeSummary: (cities) => `Ciudades: ${cities}`,
    destinationChangeNote:
      'Se sincronizan las ciudades por día, pero las direcciones/coordenadas existentes requieren revisión.',
    rebuildPromptSummary: (prompt) => `Reconstruir: ${prompt}`,
    rebuildSaveAsNew: 'Se guardará como un viaje nuevo; el actual no cambia.',
    rebuildOverwriteWarning:
      'Sobrescribir reinicia marcas de equipaje, gastos y lugares visitados.',
    packingTemplateSummary: (scene) => `Plantilla de equipaje: ${scene}`,
    packingTemplateMerge: 'Fusión inteligente: conserva lo ya marcado.',
    overwriteConfirmTitle: '¿Sobrescribir este viaje?',
    overwriteConfirmRisk:
      'Sobrescribir reinicia marcas de equipaje, historial de gastos y lugares visitados. No se puede deshacer.',
    overwriteConfirmYes: 'Confirmo sobrescribir',
    overwriteCancel: 'Cancelar',
    overwriteSaveAsNew: 'Guardar como viaje nuevo',
    overwriteNeedConfirm: 'Confirma sobrescribir antes de tocar Aplicar',
    resultDateApplied: 'Fechas del viaje actualizadas',
    resultDestinationApplied: 'Ciudades destino actualizadas',
    resultRebuildApplied: 'Itinerario reconstruido',
    resultPackingApplied: 'Plantilla de equipaje actualizada',
  },
  'fr-FR': {
    headerTitle: 'Assistant IA',
    daysCompact: (days: number) => `${days} j`,
    ideasBtn: 'Idées',
    newChatTitle: 'Nouvelle conversation',
    welcomeTitle: 'Posez vos questions sur ce voyage.',
    welcomeDesc:
      'Modifiez les dates de départ, ajoutez ou retirez des villes, réorganisez le programme ou synchronisez les modèles de 9 sacs en langage naturel. Rien ne change avant d’appuyer sur Appliquer.',
    tabFeatured: 'Sélection',
    tabTips: 'Conseils',
    tabInspiration: 'Inspiration',
    tabItinerary: 'Itinéraire',
    tabExpense: 'Dépenses',
    tabPacking: 'Bagages',
    errorUnavailable: 'L’assistant IA est momentanément indisponible. Réessayez.',
    errorReceiptScan: 'Échec de l’analyse du reçu. Veuillez réessayer.',
    walletCash: 'espèces',
    walletTransit: 'carte transport',
    walletCard: 'carte bancaire',
    vatPoolSuffix: ' et ajouté au suivi détaxe',
    receiptPrompt: (fileName: string) => `Reçu scanné : ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Reçu enregistré : « ${title} » (${wallet} mis à jour${vatSuffix}).`,
    proposalAppliedBanner: '✓ Appliqué au voyage',
    proposalSkippedBanner: 'Ignoré',
    proposalPendingBanner: 'Proposition · Aucune modification appliquée',
    addPackingHeading: (count: number) => `Ajouter aux bagages (${count})`,
    addTasksHeading: (count: number) => `Ajouter aux tâches (${count})`,
    taxFreeTag: ' · Détaxe',
    rainEnable: (day: number) => `Passer le Jour ${day} en plan intérieur (pluie)`,
    rainDisable: (day: number) => `Rétablir le programme extérieur du Jour ${day}`,
    skipBtn: 'Ignorer',
    applyBtn: 'Appliquer',
    savedToTrip: 'Enregistré',
    viewDayBtn: (day: number) => `Voir Jour ${day}`,
    openPackingBtn: 'Voir bagages',
    openFinanceBtn: 'Voir budget',
    noChangesApplied: 'Aucune modification',
    loggedPrefix: 'Enregistré : ',
    viewBtn: 'Voir',
    phraseCardHeader: 'Carte de traduction locale (à montrer à l’écran)',
    pronunciationPrefix: 'Prononciation : ',
    tipPrefix: 'Astuce : ',
    thinkingText: 'Analyse de votre voyage en cours...',
    inputPlaceholder: (city: string) =>
      `Posez une question sur ${city}, ou demandez-moi de modifier dates / itinéraire / liste 9 sacs...`,
    voiceLabel: 'Voix',
    dateChangeSummary: (departure, returnDate, days) =>
      `Replanifier : ${departure} → ${returnDate} (${days} j)`,
    dateChangeRisk:
      'Après changement de dates, revérifiez ouvertures, météo et budgets journaliers.',
    destinationChangeSummary: (cities) => `Villes : ${cities}`,
    destinationChangeNote:
      'Les villes par jour seront synchronisées, mais adresses/coordonnées existantes à revoir.',
    rebuildPromptSummary: (prompt) => `Reconstruction : ${prompt}`,
    rebuildSaveAsNew: 'Sera enregistré comme un nouveau voyage ; l’actuel reste inchangé.',
    rebuildOverwriteWarning:
      'L’écrasement réinitialise cases bagages, dépenses et lieux visités.',
    packingTemplateSummary: (scene) => `Modèle bagages : ${scene}`,
    packingTemplateMerge: 'Fusion intelligente : conserve les cases cochées.',
    overwriteConfirmTitle: 'Écraser ce voyage ?',
    overwriteConfirmRisk:
      'L’écrasement réinitialise cases bagages, historique de dépenses et lieux visités. Irréversible.',
    overwriteConfirmYes: 'Je confirme l’écrasement',
    overwriteCancel: 'Annuler',
    overwriteSaveAsNew: 'Enregistrer comme nouveau voyage',
    overwriteNeedConfirm: 'Confirmez l’écrasement avant d’appuyer sur Appliquer',
    resultDateApplied: 'Dates du voyage mises à jour',
    resultDestinationApplied: 'Villes destination mises à jour',
    resultRebuildApplied: 'Itinéraire reconstruit',
    resultPackingApplied: 'Modèle bagages mis à jour',
  },
  'de-DE': {
    headerTitle: 'KI-Reiseassistent',
    daysCompact: (days: number) => `${days} T.`,
    ideasBtn: 'Ideen',
    newChatTitle: 'Neues Gespräch starten',
    welcomeTitle: 'Frag alles zu dieser Reise.',
    welcomeDesc:
      'Ändere Abflugdaten, füge Städte hinzu oder entferne sie, plane neu oder synchronisiere 9-Taschen-Vorlagen in natürlicher Sprache. Nichts ändert sich, bevor du auf Übernehmen tippst.',
    tabFeatured: 'Empfohlen',
    tabTips: 'Reisetipps',
    tabInspiration: 'Inspiration',
    tabItinerary: 'Route',
    tabExpense: 'Ausgaben',
    tabPacking: 'Packen',
    errorUnavailable: 'Der KI-Assistent ist vorübergehend nicht erreichbar.',
    errorReceiptScan: 'Beleg konnte nicht erkannt werden. Bitte erneut versuchen.',
    walletCash: 'Bargeld',
    walletTransit: 'ÖPNV-Karte',
    walletCard: 'Kreditkarte',
    vatPoolSuffix: ' und zur Tax-Free-Liste hinzugefügt',
    receiptPrompt: (fileName: string) => `Beleg-Scan: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Beleg erfasst: „${title}“ (${wallet} aktualisiert${vatSuffix}).`,
    proposalAppliedBanner: '✓ Übernommen',
    proposalSkippedBanner: 'Übersprungen',
    proposalPendingBanner: 'Vorschlag · Noch nichts geändert',
    addPackingHeading: (count: number) => `Zur Packliste hinzufügen (${count})`,
    addTasksHeading: (count: number) => `Aufgaben hinzufügen (${count})`,
    taxFreeTag: ' · Tax-Free',
    rainEnable: (day: number) => `Tag ${day} auf Indoor-Regenplan umstellen`,
    rainDisable: (day: number) => `Ursprüngliche Outdoor-Route für Tag ${day} wiederherstellen`,
    skipBtn: 'Überspringen',
    applyBtn: 'Übernehmen',
    savedToTrip: 'Gespeichert',
    viewDayBtn: (day: number) => `Tag ${day} ansehen`,
    openPackingBtn: 'Packliste öffnen',
    openFinanceBtn: 'Budget öffnen',
    noChangesApplied: 'Keine Änderungen',
    loggedPrefix: 'Erfasst: ',
    viewBtn: 'Ansehen',
    phraseCardHeader: 'Sprachkarte vor Ort (direkt vorzeigen)',
    pronunciationPrefix: 'Aussprache: ',
    tipPrefix: 'Tipp: ',
    thinkingText: 'Plane passende Vorschläge...',
    inputPlaceholder: (city: string) =>
      `Frag etwas zu deiner Reise nach ${city}, oder lass mich Daten / Route / 9-Taschen-Liste ändern...`,
    voiceLabel: 'Sprache',
    dateChangeSummary: (departure, returnDate, days) =>
      `Umplanen: ${departure} → ${returnDate} (${days} Tage)`,
    dateChangeRisk:
      'Nach Datumsänderung Öffnungstage, Wetter und Tagesbudgets prüfen.',
    destinationChangeSummary: (cities) => `Städte: ${cities}`,
    destinationChangeNote:
      'Tagesstädte werden synchronisiert, bestehende Adressen/Koordinaten bitte prüfen.',
    rebuildPromptSummary: (prompt) => `Neu planen: ${prompt}`,
    rebuildSaveAsNew: 'Wird als neue Reise gespeichert; die aktuelle bleibt unverändert.',
    rebuildOverwriteWarning:
      'Überschreiben setzt Pack-Häkchen, Ausgaben und Besuchsmarkierungen zurück.',
    packingTemplateSummary: (scene) => `Packvorlage: ${scene}`,
    packingTemplateMerge: 'Intelligentes Mergen behält abgehakte Fortschritte.',
    overwriteConfirmTitle: 'Diese Reise überschreiben?',
    overwriteConfirmRisk:
      'Überschreiben setzt Pack-Häkchen, Ausgabenhistorie und Besuchsmarkierungen zurück. Nicht rückgängig.',
    overwriteConfirmYes: 'Überschreiben bestätigen',
    overwriteCancel: 'Abbrechen',
    overwriteSaveAsNew: 'Stattdessen als neue Reise speichern',
    overwriteNeedConfirm: 'Bitte überschreiben bestätigen, bevor du auf Übernehmen tippst',
    resultDateApplied: 'Reisedaten aktualisiert',
    resultDestinationApplied: 'Zielstädte aktualisiert',
    resultRebuildApplied: 'Reiseplan neu erstellt',
    resultPackingApplied: 'Packvorlage aktualisiert',
  },
  'pt-BR': {
    headerTitle: 'Assistente IA',
    daysCompact: (days: number) => `${days} d`,
    ideasBtn: 'Ideias',
    newChatTitle: 'Nova conversa',
    welcomeTitle: 'Pergunte sobre esta viagem.',
    welcomeDesc:
      'Altere datas de partida, adicione ou remova cidades, reordene o roteiro ou sincronize modelos de 9 bolsas em linguagem natural. Nada muda até você tocar em Aplicar.',
    tabFeatured: 'Destaques',
    tabTips: 'Dicas',
    tabInspiration: 'Inspiração',
    tabItinerary: 'Roteiro',
    tabExpense: 'Gastos',
    tabPacking: 'Mala',
    errorUnavailable: 'O assistente de IA está indisponível no momento. Tente novamente.',
    errorReceiptScan: 'Falha ao ler o recibo. Tente novamente.',
    walletCash: 'dinheiro',
    walletTransit: 'cartão de transporte',
    walletCard: 'cartão de crédito',
    vatPoolSuffix: ' e adicionado ao fundo Tax-Free',
    receiptPrompt: (fileName: string) => `Recibo escaneado: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `Recibo lançado: "${title}" (${wallet} atualizado${vatSuffix}).`,
    proposalAppliedBanner: '✓ Aplicado à viagem',
    proposalSkippedBanner: 'Ignorado',
    proposalPendingBanner: 'Proposta · Nada alterado ainda',
    addPackingHeading: (count: number) => `Adicionar à mala (${count})`,
    addTasksHeading: (count: number) => `Adicionar tarefas (${count})`,
    taxFreeTag: ' · Tax-Free',
    rainEnable: (day: number) => `Mudar Dia ${day} para plano em local fechado (chuva)`,
    rainDisable: (day: number) => `Restaurar roteiro ao ar livre do Dia ${day}`,
    skipBtn: 'Pular',
    applyBtn: 'Aplicar',
    savedToTrip: 'Salvo na viagem',
    viewDayBtn: (day: number) => `Ver Dia ${day}`,
    openPackingBtn: 'Abrir mala',
    openFinanceBtn: 'Abrir finanças',
    noChangesApplied: 'Nenhuma alteração aplicada',
    loggedPrefix: 'Registrado: ',
    viewBtn: 'Ver',
    phraseCardHeader: 'Cartão de frases locais (mostre na tela)',
    pronunciationPrefix: 'Pronúncia: ',
    tipPrefix: 'Dica: ',
    thinkingText: 'Analisando seu roteiro...',
    inputPlaceholder: (city: string) =>
      `Pergunte algo sobre ${city}, ou peça para editar datas / rota / lista de 9 bolsas...`,
    voiceLabel: 'Voz',
    dateChangeSummary: (departure, returnDate, days) =>
      `Reagendar: ${departure} → ${returnDate} (${days} dias)`,
    dateChangeRisk:
      'Após mudar datas, revise aberturas por dia, clima e orçamentos diários.',
    destinationChangeSummary: (cities) => `Cidades: ${cities}`,
    destinationChangeNote:
      'Cidades por dia serão sincronizadas, mas endereços/coordenadas existentes precisam de revisão.',
    rebuildPromptSummary: (prompt) => `Reconstruir: ${prompt}`,
    rebuildSaveAsNew: 'Será salvo como uma nova viagem; a atual não muda.',
    rebuildOverwriteWarning:
      'Sobrescrever zera marcas da mala, gastos e locais visitados.',
    packingTemplateSummary: (scene) => `Modelo de mala: ${scene}`,
    packingTemplateMerge: 'Mesclagem inteligente: mantém o progresso marcado.',
    overwriteConfirmTitle: 'Sobrescrever esta viagem?',
    overwriteConfirmRisk:
      'Sobrescrever zera marcas da mala, histórico de gastos e locais visitados. Não pode ser desfeito.',
    overwriteConfirmYes: 'Confirmo sobrescrever',
    overwriteCancel: 'Cancelar',
    overwriteSaveAsNew: 'Salvar como nova viagem',
    overwriteNeedConfirm: 'Confirme sobrescrever antes de tocar em Aplicar',
    resultDateApplied: 'Datas da viagem atualizadas',
    resultDestinationApplied: 'Cidades de destino atualizadas',
    resultRebuildApplied: 'Roteiro reconstruído',
    resultPackingApplied: 'Modelo de mala atualizado',
  },
  'ja-JP': {
    headerTitle: 'AI トラベルアシスタント',
    daysCompact: (days: number) => `${days}日間`,
    ideasBtn: 'アイデア',
    newChatTitle: '新しい会話を始める',
    welcomeTitle: 'この旅のこと、なんでも相談。',
    welcomeDesc:
      '出発日の変更、都市の追加・削除、行程の再編成、9袋パッキングテンプレートの連動を自然言語で依頼できます。「適用する」を押すまで旅程は変更されません。',
    tabFeatured: 'おすすめ',
    tabTips: '旅のヒント',
    tabInspiration: '現地アイデア',
    tabItinerary: '行程調整',
    tabExpense: '家計',
    tabPacking: 'パッキング',
    errorUnavailable: '現在 AI アシスタントが応答できません。しばらくして再試行してください。',
    errorReceiptScan: 'レシート画像の読み取りに失敗しました。再試行してください。',
    walletCash: '現金ウォレット',
    walletTransit: '交通系 IC',
    walletCard: 'クレジットカード',
    vatPoolSuffix: '（免税対象プールに追加）',
    receiptPrompt: (fileName: string) => `レシート読取: ${fileName}`,
    receiptReply: (title: string, wallet: string, vatSuffix: string) =>
      `「${title}」を記録し、${wallet}を更新しました${vatSuffix}。`,
    proposalAppliedBanner: '✓ 旅程に適用済み',
    proposalSkippedBanner: 'スキップ済み',
    proposalPendingBanner: '提案プレビュー · まだ反映されていません',
    addPackingHeading: (count: number) => `持ち物に追加 (${count}件)`,
    addTasksHeading: (count: number) => `事前タスクに追加 (${count}件)`,
    taxFreeTag: ' · 免税対象',
    rainEnable: (day: number) => `Day ${day} の屋外スポットを雨天用屋内プランへ切替`,
    rainDisable: (day: number) => `Day ${day} を元の晴れルートに戻す`,
    skipBtn: 'スキップ',
    applyBtn: '適用する',
    savedToTrip: '保存しました',
    viewDayBtn: (day: number) => `Day ${day} を開く`,
    openPackingBtn: '持ち物を開く',
    openFinanceBtn: '家計簿を開く',
    noChangesApplied: '変更は適用されませんでした',
    loggedPrefix: '記録済み：',
    viewBtn: '表示',
    phraseCardHeader: '現地コミュニケーションカード（画面をそのまま提示）',
    pronunciationPrefix: '発音ヒント：',
    tipPrefix: 'マナーメモ：',
    thinkingText: '旅程に合わせて提案を作成中...',
    inputPlaceholder: (city: string) =>
      `${city}の旅について質問するか、日付・ルート・9袋リストの変更を依頼...`,
    voiceLabel: '音声',
    dateChangeSummary: (departure, returnDate, days) =>
      `日程変更：${departure} → ${returnDate}（${days}日間）`,
    dateChangeRisk:
      '日程変更後は、休館曜日・天候・日別予算を再確認してください。',
    destinationChangeSummary: (cities) => `都市変更：${cities}`,
    destinationChangeNote:
      '日別の都市フィールドは同期されますが、既存スポットの住所・座標は要確認です。',
    rebuildPromptSummary: (prompt) => `行程再構築：${prompt}`,
    rebuildSaveAsNew: '新しい旅程として保存し、現在の旅程は変更しません。',
    rebuildOverwriteWarning:
      '上書きすると、パッキングのチェック状態・支出履歴・訪問済みマークがリセットされます。',
    packingTemplateSummary: (scene) => `パッキングテンプレート：${scene}`,
    packingTemplateMerge: 'スマート結合でチェック済みの進捗を保持します。',
    overwriteConfirmTitle: '現在の旅程を上書きしますか？',
    overwriteConfirmRisk:
      '上書きすると、パッキングのチェック状態・支出履歴・訪問済みマークがリセットされ、元に戻せません。',
    overwriteConfirmYes: '上書きを確認する',
    overwriteCancel: 'キャンセル',
    overwriteSaveAsNew: '新しい旅程として保存する',
    overwriteNeedConfirm: '「適用する」の前に上書きを確認してください',
    resultDateApplied: '出発日を更新しました',
    resultDestinationApplied: '目的地の都市を更新しました',
    resultRebuildApplied: '行程の再構築を適用しました',
    resultPackingApplied: 'パッキングテンプレートを更新しました',
  },
} satisfies Record<AppLanguage, CopilotUiCopy>;

export function getCopilotUiCopy(lang: AppLanguage): CopilotUiCopy {
  return pickLang(lang, COPILOT_UI_MAP);
}

const COUNTRY_NAME_TABLE: Array<{
  test: RegExp;
  names: Record<Exclude<AppLanguage, 'en-GB'>, string>;
}> = [
  {
    test: /巴黎|尼斯|里昂|马赛|法国|Paris|Nice|Lyon|Marseille|France/i,
    names: {
      'zh-CN': '法国',
      'en-US': 'France',
      'es-MX': 'Francia',
      'fr-FR': 'France',
      'de-DE': 'Frankreich',
      'pt-BR': 'França',
      'ja-JP': 'フランス',
    },
  },
  {
    test: /阿姆斯特丹|鹿特丹|荷兰|Amsterdam|Rotterdam|Netherlands/i,
    names: {
      'zh-CN': '荷兰',
      'en-US': 'the Netherlands',
      'es-MX': 'Países Bajos',
      'fr-FR': 'Pays-Bas',
      'de-DE': 'Niederlande',
      'pt-BR': 'Países Baixos',
      'ja-JP': 'オランダ',
    },
  },
  {
    test: /东京|京都|大阪|北海道|冲绳|横滨|福冈|名古屋|日本|Tokyo|Kyoto|Osaka|Hokkaido|Okinawa|Japan/i,
    names: {
      'zh-CN': '日本',
      'en-US': 'Japan',
      'es-MX': 'Japón',
      'fr-FR': 'Japon',
      'de-DE': 'Japan',
      'pt-BR': 'Japão',
      'ja-JP': '日本',
    },
  },
  {
    test: /伦敦|爱丁堡|曼彻斯特|英国|London|Edinburgh|Manchester|UK/i,
    names: {
      'zh-CN': '英国',
      'en-US': 'the UK',
      'es-MX': 'Reino Unido',
      'fr-FR': 'Royaume-Uni',
      'de-DE': 'Großbritannien',
      'pt-BR': 'Reino Unido',
      'ja-JP': 'イギリス',
    },
  },
  {
    test: /罗马|米兰|佛罗伦萨|威尼斯|意大利|Rome|Milan|Florence|Venice|Italy/i,
    names: {
      'zh-CN': '意大利',
      'en-US': 'Italy',
      'es-MX': 'Italia',
      'fr-FR': 'Italie',
      'de-DE': 'Italien',
      'pt-BR': 'Itália',
      'ja-JP': 'イタリア',
    },
  },
  {
    test: /巴塞罗那|马德里|西班牙|Barcelona|Madrid|Spain/i,
    names: {
      'zh-CN': '西班牙',
      'en-US': 'Spain',
      'es-MX': 'España',
      'fr-FR': 'Espagne',
      'de-DE': 'Spanien',
      'pt-BR': 'Espanha',
      'ja-JP': 'スペイン',
    },
  },
  {
    test: /苏黎世|日内瓦|因特拉肯|卢塞恩|瑞士|Zurich|Geneva|Interlaken|Lucerne|Switzerland/i,
    names: {
      'zh-CN': '瑞士',
      'en-US': 'Switzerland',
      'es-MX': 'Suiza',
      'fr-FR': 'Suisse',
      'de-DE': 'Schweiz',
      'pt-BR': 'Suíça',
      'ja-JP': 'スイス',
    },
  },
  {
    test: /首尔|釜山|济州|韩国|Seoul|Busan|Jeju|Korea/i,
    names: {
      'zh-CN': '韩国',
      'en-US': 'South Korea',
      'es-MX': 'Corea del Sur',
      'fr-FR': 'Corée du Sud',
      'de-DE': 'Südkorea',
      'pt-BR': 'Coreia do Sul',
      'ja-JP': '韓国',
    },
  },
  {
    test: /曼谷|清迈|普吉|泰国|Bangkok|Chiang Mai|Phuket|Thailand/i,
    names: {
      'zh-CN': '泰国',
      'en-US': 'Thailand',
      'es-MX': 'Tailandia',
      'fr-FR': 'Thaïlande',
      'de-DE': 'Thailand',
      'pt-BR': 'Tailândia',
      'ja-JP': 'タイ',
    },
  },
  {
    test: /新加坡|Singapore/i,
    names: {
      'zh-CN': '新加坡',
      'en-US': 'Singapore',
      'es-MX': 'Singapur',
      'fr-FR': 'Singapour',
      'de-DE': 'Singapur',
      'pt-BR': 'Singapura',
      'ja-JP': 'シンガポール',
    },
  },
  {
    test: /纽约|洛杉矶|旧金山|西雅图|芝加哥|美国|New York|Los Angeles|San Francisco|Seattle|USA/i,
    names: {
      'zh-CN': '美国',
      'en-US': 'the US',
      'es-MX': 'Estados Unidos',
      'fr-FR': 'États-Unis',
      'de-DE': 'USA',
      'pt-BR': 'Estados Unidos',
      'ja-JP': 'アメリカ',
    },
  },
  {
    test: /墨西哥|Cancun|Cancún|Mexico|CDMX|Guadalajara|Oaxaca/i,
    names: {
      'zh-CN': '墨西哥',
      'en-US': 'Mexico',
      'es-MX': 'México',
      'fr-FR': 'Mexique',
      'de-DE': 'Mexiko',
      'pt-BR': 'México',
      'ja-JP': 'メキシコ',
    },
  },
  {
    test: /柏林|慕尼黑|法兰克福|德国|Berlin|Munich|Frankfurt|Germany/i,
    names: {
      'zh-CN': '德国',
      'en-US': 'Germany',
      'es-MX': 'Alemania',
      'fr-FR': 'Allemagne',
      'de-DE': 'Deutschland',
      'pt-BR': 'Alemanha',
      'ja-JP': 'ドイツ',
    },
  },
];

export function resolveCountryLabel8(
  rawCity: string,
  currencyCode: string,
  lang: AppLanguage
): { cityLabel: string; countryLabel: string } {
  const cleanCity = rawCity.trim().split(/[\s(（/]/)[0] || '';
  const target = cleanCity || (lang === 'zh-CN' ? '巴黎' : lang === 'ja-JP' ? 'パリ' : 'Paris');

  for (const r of COUNTRY_NAME_TABLE) {
    if (r.test.test(rawCity)) {
      return { cityLabel: target, countryLabel: pickLang(lang, r.names) };
    }
  }

  if (currencyCode === 'JPY') {
    return {
      cityLabel: target,
      countryLabel: pickLang(lang, {
        'zh-CN': '日本',
        'en-US': 'Japan',
        'es-MX': 'Japón',
        'fr-FR': 'Japon',
        'de-DE': 'Japan',
        'pt-BR': 'Japão',
        'ja-JP': '日本',
      }),
    };
  }
  if (currencyCode === 'GBP') {
    return {
      cityLabel: target,
      countryLabel: pickLang(lang, {
        'zh-CN': '英国',
        'en-US': 'the UK',
        'es-MX': 'Reino Unido',
        'fr-FR': 'Royaume-Uni',
        'de-DE': 'Großbritannien',
        'pt-BR': 'Reino Unido',
        'ja-JP': 'イギリス',
      }),
    };
  }
  if (currencyCode === 'EUR') {
    return {
      cityLabel: target,
      countryLabel: pickLang(lang, {
        'zh-CN': '欧洲申根区',
        'en-US': 'Europe (Schengen)',
        'es-MX': 'Europa (Schengen)',
        'fr-FR': 'Europe (Schengen)',
        'de-DE': 'Europa (Schengen)',
        'pt-BR': 'Europa (Schengen)',
        'ja-JP': 'ヨーロッパ（シェンゲン圏）',
      }),
    };
  }

  return { cityLabel: target, countryLabel: target };
}

export interface CopilotPromptCard {
  id: string;
  label: string;
  prompt: string;
  mode: 'instant' | 'fill';
}

export function buildLocalizedPromptCards(params: {
  category:
    | 'featured'
    | 'tips'
    | 'inspiration'
    | 'itinerary'
    | 'expense'
    | 'packing';
  cityLabel: string;
  countryLabel: string;
  totalDays: number;
  currentDay: number;
  carryOnLimitKg: number;
  checkedLimitKg: number;
  companionName: string;
  travelersCount: number;
  currencySymbol: string;
  lang: AppLanguage;
}): CopilotPromptCard[] {
  const {
    category,
    cityLabel,
    countryLabel,
    totalDays,
    currentDay,
    carryOnLimitKg,
    checkedLimitKg,
    companionName,
    travelersCount,
    currencySymbol,
    lang,
  } = params;

  const rDay = totalDays >= 2 ? 2 : 1;
  const dDay = Math.min(totalDays, Math.max(1, currentDay));
  const isSolo = travelersCount <= 1 || !companionName.trim();
  const buddy =
    companionName.trim() ||
    pickLang(lang, {
      'zh-CN': '同行伙伴',
      'en-US': 'Companion',
      'es-MX': 'Acompañante',
      'fr-FR': 'Compagnon',
      'de-DE': 'Mitreisende',
      'pt-BR': 'Acompanhante',
      'ja-JP': '同行者',
    });

  if (lang === 'zh-CN') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `把 Day ${rDay} 排得更轻松一点`,
          prompt: `帮我把 Day ${rDay} 排得更轻松一点，看看哪一站偏赶可以精简，或者换成慢节奏体验`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `给 Day ${dDay} 加一家本地口碑晚餐`,
          prompt: `给 Day ${dDay} 推荐并加一家顺路、本地人评价很高的特色晚餐餐厅`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `去${countryLabel}需要签证和哪些入境材料？`,
          prompt: `去${countryLabel}旅行需要办理什么签证？入境时海关常查哪些材料和注意事项？`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `从机场进${cityLabel}市区最省钱的方式是？`,
          prompt: `从机场进${cityLabel}市区最省钱和最省心的交通方式分别是什么？大概花多少钱、耗时多久？`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `${countryLabel}签证与入境通关清单`,
          prompt: `去${countryLabel}旅行的签证要求、入境必带材料、海关申报和手机卡/eSIM 实用提示`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `从机场进${cityLabel}市区交通比价`,
          prompt: `对比从机场进${cityLabel}市区的地铁/快线、大巴和打车价格、耗时与防坑提醒`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `${cityLabel}小费规则、刷卡与换汇建议`,
          prompt: `在${cityLabel}吃饭打车需要给小费吗？刷信用卡还是带现金方便？大概需要换多少零钱？`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `${countryLabel}购物退税技巧与安全避坑`,
          prompt: `在${countryLabel}购物退税门槛和最划算的退税方式是什么？顺便给我几条${cityLabel}本地防偷防坑提醒`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `给 Day ${dDay} 挑一家宝藏晚餐餐厅`,
          prompt: `结合我 Day ${dDay} 的动线，推荐并提议加入一家氛围好、当地人常去的晚餐馆子`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `${cityLabel}最佳日落机位与黄金时刻灵感`,
          prompt: `${cityLabel}最值得拍日落或城市夜景的 2-3 个宝藏机位在哪？挑一个最顺路的帮我加入日程`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `加一家适合放空的街角咖啡馆`,
          prompt: `在 Day ${rDay} 下午给我找一家有本地格调的街角咖啡馆或书店，提议加入行程`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `下雨天怎么把户外切换成室内备选？`,
          prompt: `如果 Day ${currentDay} 下午下雨，帮我把户外站点切换成室内防雨备选方案`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `给 Day ${rDay} 行程减负，留出喘息时间`,
          prompt: `帮我审视一下 Day ${rDay} 的动线，提议去掉偏赶的站点让节奏更从容`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: '改出发日期或行程天数',
          prompt: '帮我把这次行程的出发日期改成……，返程日期改成……，一共……天',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: '增删城市或换目的地',
          prompt: '帮我把行程城市调整为……（可增删或替换城市，并说明各城停留几天）',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: '按新想法重排整套行程',
          prompt: '按我的新偏好重新规划整套行程：……（说明节奏、必去点或想避开的内容）',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: '今天预算还剩多少？退税还差多少？',
          prompt: '帮我汇总一下今天日常预算余额、整体花销节奏，以及购物池离退税门槛还差多少？',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `生成${cityLabel}餐厅点单/退税外语沟通卡`
            : `记一笔和 ${buddy} AA 的咖啡账单`,
          prompt: isSolo
            ? `帮我生成一张在${cityLabel}餐厅点餐或商场办退税的外语沟通卡（含发音和礼仪提示）`
            : `刚才在${cityLabel}喝了两杯咖啡花了 ${currencySymbol}14，刷信用卡，和 ${buddy} 均摊`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: '记一笔今日消费',
          prompt: `刚才在${cityLabel}花了 ${currencySymbol}……，刷信用卡，记入今天账本`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: '退税差额还差多少？',
          prompt: '帮我查一下购物退税池离退税门槛还差多少，以及已累计多少可退税额',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `查登机 (${carryOnLimitKg}kg) 与托运重量余量`,
        prompt: `帮我检查目前随身登机和托运行李分别多重，离 ${carryOnLimitKg}kg / ${checkedLimitKg}kg 限额还有多少余量？`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: '换一套场景打包模板',
        prompt: '帮我切换到滑雪/亲子/商务等场景打包模板，并智能合并保留已勾选项',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: '按新行程重生成 9 袋清单',
        prompt: '根据当前最新行程与目的地，重新生成 9 袋打包清单，智能合并保留已勾选进度',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: '查 9 袋配重与分组余量',
        prompt: '帮我查看目前 9 袋各分组的重量分布，以及登机与托运分别还剩多少额度',
        mode: 'instant',
      },
    ];
  }

  if (lang === 'es-MX') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `Hacer el Día ${rDay} más relajado`,
          prompt: `Haz el Día ${rDay} más relajado quitando paradas apresuradas o cambiando a una actividad tranquila`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `Agregar un buen restaurante al Día ${dDay}`,
          prompt: `Recomienda y propón agregar un restaurante local muy bien valorado para cenar el Día ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `¿Necesito visa para viajar a ${countryLabel}?`,
          prompt: `¿Necesito visa o autorización de entrada para ${countryLabel} y qué documentos revisan en migración?`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `¿Forma más barata del aeropuerto al centro de ${cityLabel}?`,
          prompt: `¿Cuál es la forma más barata y confiable de ir del aeropuerto al centro de ${cityLabel} con precios y tiempos?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `Visa y requisitos de entrada para ${countryLabel}`,
          prompt: `Dame consejos concisos de visa, vigencia de pasaporte y migración para entrar a ${countryLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `Traslado aeropuerto → centro de ${cityLabel}`,
          prompt: `Compara tren/autobús vs. taxi desde el aeropuerto hacia ${cityLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `Propinas, tarjeta vs. efectivo en ${cityLabel}`,
          prompt: `¿Cuál es la costumbre de propinas en ${cityLabel} y cuánto efectivo conviene llevar frente a tarjeta?`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `Devolución Tax-Free y seguridad en ${countryLabel}`,
          prompt: `¿Cómo aprovechar el reembolso de impuestos en ${countryLabel} y qué precauciones tomar en ${cityLabel}?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `Cena local auténtica para el Día ${dDay}`,
          prompt: `Propón agregar un restaurante local auténtico para cenar el Día ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `Mejor mirador para atardecer en ${cityLabel}`,
          prompt: `¿Cuáles son los mejores miradores para ver el atardecer en ${cityLabel}? Propón agregar el mejor`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `Café tranquilo de barrio para el Día ${rDay}`,
          prompt: `Propón agregar una cafetería local tranquila para descansar la tarde del Día ${rDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `Plan B bajo techo si llueve el Día ${currentDay}`,
          prompt: `Si llueve la tarde del Día ${currentDay}, propón cambiar paradas al aire libre por opciones bajo techo`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `Aligerar el ritmo del Día ${rDay}`,
          prompt: `Revisa el Día ${rDay} y propón quitar 1 o 2 paradas apresuradas para ir con más calma`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: 'Cambiar fecha de salida o duración',
          prompt: 'Cambia la fecha de salida a …, la de regreso a …, con un total de … días',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: 'Agregar, quitar o cambiar ciudades',
          prompt: 'Ajusta las ciudades del viaje a … (puedes agregar, quitar o reemplazar, e indica días por ciudad)',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: 'Replanificar todo el itinerario',
          prompt: 'Replanifica todo el itinerario según mis nuevas preferencias: … (ritmo, imprescindibles o qué evitar)',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: 'Saldo de presupuesto de hoy y meta Tax-Free',
          prompt: '¿Cuánto presupuesto diario me queda hoy y cuánto falta para el mínimo de Tax-Free?',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `Crear tarjeta de frases locales para ${cityLabel}`
            : `Registrar café dividido 50/50 con ${buddy}`,
          prompt: isSolo
            ? `Crea una tarjeta de frases locales para pedir comida o formulario Tax-Free en ${cityLabel}`
            : `Dos cafés en ${cityLabel} ${currencySymbol}14 con tarjeta, dividido 50/50 con ${buddy}`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: 'Registrar un gasto de hoy',
          prompt: `Acabo de gastar ${currencySymbol}… en ${cityLabel} con tarjeta; regístralo en el gasto de hoy`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: '¿Cuánto falta para Tax-Free?',
          prompt: '¿Cuánto falta en el fondo Tax-Free para el umbral de reembolso y cuánto acumulé?',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `Revisar peso cabina (${carryOnLimitKg}kg) y documentado`,
        prompt: `¿Cuánto pesan mi equipaje de mano y mi maleta documentada respecto a los límites de ${carryOnLimitKg}kg / ${checkedLimitKg}kg?`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: 'Cambiar plantilla de escenario',
        prompt: 'Cambia a una plantilla de equipaje (esquí / familia / negocios, etc.) y fusiona conservando lo ya marcado',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: 'Regenerar lista de 9 bolsas',
        prompt: 'Según el itinerario y destino actuales, regenera la lista de 9 bolsas y conserva el progreso marcado',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: 'Ver peso por las 9 bolsas',
        prompt: 'Muéstrame el peso por cada una de las 9 bolsas y cuánto queda de cabina y documentado',
        mode: 'instant',
      },
    ];
  }

  if (lang === 'fr-FR') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `Alléger le programme du Jour ${rDay}`,
          prompt: `Rends le Jour ${rDay} plus détendu en retirant une étape trop chargée ou en la remplaçant par une pause tranquille`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `Ajouter un excellent dîner au Jour ${dDay}`,
          prompt: `Recommande et propose d’ajouter une très bonne table locale pour dîner le Jour ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `Faut-il un visa pour ${countryLabel} ?`,
          prompt: `Faut-il un visa ou des documents d’entrée spécifiques pour voyager vers ${countryLabel} ?`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `Trajet le moins cher de l’aéroport vers ${cityLabel} ?`,
          prompt: `Quel est le moyen le plus économique et fiable pour rejoindre le centre de ${cityLabel} depuis l’aéroport ?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `Visa et formalités d’entrée (${countryLabel})`,
          prompt: `Donne-moi les formalités de visa, validité de passeport et passage douane pour ${countryLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `Comparer transferts aéroport vers ${cityLabel}`,
          prompt: `Compare train/bus économique et taxi depuis l’aéroport jusqu’à ${cityLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `Pourboires, carte vs. espèces à ${cityLabel}`,
          prompt: `Quel est l’usage pour les pourboires à ${cityLabel} et faut-il privilégier la carte ou les espèces ?`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `Détaxe et vigilance locale en ${countryLabel}`,
          prompt: `Comment optimiser la détaxe en ${countryLabel} et quelles précautions prendre à ${cityLabel} ?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `Trouver un dîner authentique pour le Jour ${dDay}`,
          prompt: `Propose d’ajouter un restaurant local authentique pour le dîner du Jour ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `Meilleur spot coucher de soleil à ${cityLabel}`,
          prompt: `Où admirer le plus beau coucher de soleil à ${cityLabel} ? Propose d’ajouter le meilleur spot`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `Ajouter un café de quartier le Jour ${rDay}`,
          prompt: `Propose d’ajouter un café de quartier calme pour une pause l’après-midi du Jour ${rDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `Plan B en intérieur s’il pleut le Jour ${currentDay}`,
          prompt: `S’il pleut l’après-midi du Jour ${currentDay}, propose de remplacer les visites extérieures par des lieux abrités`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `Rendre le Jour ${rDay} plus fluide`,
          prompt: `Analyse le Jour ${rDay} et propose de retirer 1 ou 2 étapes pour un rythme plus serein`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: 'Modifier la date de départ ou la durée',
          prompt: 'Change la date de départ en …, le retour en …, pour un total de … jours',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: 'Ajouter, retirer ou changer de villes',
          prompt: 'Ajuste les villes du voyage à … (ajoute, retire ou remplace, et précise les jours par ville)',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: 'Replanifier tout le programme',
          prompt: 'Replanifie tout le programme selon mes nouvelles préférences : … (rythme, incontournables ou à éviter)',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: 'Budget restant du jour et seuil détaxe',
          prompt: 'Combien reste-t-il sur mon budget du jour et où en suis-je du seuil de détaxe ?',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `Créer une carte de phrases pour ${cityLabel}`
            : `Noter un café partagé 50/50 avec ${buddy}`,
          prompt: isSolo
            ? `Crée une carte de phrases utiles pour commander ou demander une détaxe à ${cityLabel}`
            : `Deux cafés à ${cityLabel} ${currencySymbol}14 par carte, partagé 50/50 avec ${buddy}`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: 'Noter une dépense du jour',
          prompt: `Je viens de dépenser ${currencySymbol}… à ${cityLabel} par carte ; note-la dans le budget du jour`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: 'Combien manque pour la détaxe ?',
          prompt: 'Combien manque au seuil de détaxe et quel montant ai-je déjà cumulé ?',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `Vérifier poids cabine (${carryOnLimitKg}kg) & soute`,
        prompt: `Quel est le poids actuel de mon bagage cabine et en soute par rapport aux limites ${carryOnLimitKg}kg / ${checkedLimitKg}kg ?`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: 'Changer de modèle de scénario',
        prompt: 'Passe à un modèle bagages (ski / famille / business, etc.) et fusionne en gardant les cases cochées',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: 'Régénérer la liste des 9 sacs',
        prompt: 'Selon le programme et la destination actuels, régénère la liste des 9 sacs en gardant la progression cochée',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: 'Voir le poids des 9 sacs',
        prompt: 'Montre-moi le poids par sac parmi les 9, et le reste disponible en cabine et en soute',
        mode: 'instant',
      },
    ];
  }

  if (lang === 'de-DE') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `Tag ${rDay} entspannter gestalten`,
          prompt: `Mach Tag ${rDay} entspannter, indem du gehetzte Stopps kürzt oder durch etwas Ruhigeres ersetzt`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `Tolles Abendessen für Tag ${dDay} ergänzen`,
          prompt: `Empfiehl und schlage ein authentisches lokales Restaurant für Tag ${dDay} abends vor`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `Brauche ich ein Visum für ${countryLabel}?`,
          prompt: `Brauche ich für ${countryLabel} ein Visum und welche Einreisedokumente sind erforderlich?`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `Günstigster Weg vom Flughafen nach ${cityLabel}?`,
          prompt: `Wie komme ich am günstigsten und zuverlässigsten vom Flughafen ins Zentrum von ${cityLabel}?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `Visum & Einreisehinweise für ${countryLabel}`,
          prompt: `Gib mir kompakte Infos zu Visum, Passgültigkeit und Einreise für ${countryLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `Flughafentransfer nach ${cityLabel} im Vergleich`,
          prompt: `Vergleiche günstige Bahn-/Bus-Optionen mit Taxi vom Flughafen nach ${cityLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `Trinkgeld, Karte vs. Bargeld in ${cityLabel}`,
          prompt: `Wie viel Trinkgeld gibt man in ${cityLabel} und wie viel Bargeld sollte man dabei haben?`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `Tax-Free & Sicherheitstipps in ${countryLabel}`,
          prompt: `Wie nutze ich Tax-Free in ${countryLabel} optimal und worauf sollte ich in ${cityLabel} achten?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `Authentisches Abendessen für Tag ${dDay}`,
          prompt: `Schlage ein authentisches lokales Abendrestaurant für Tag ${dDay} vor`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `Bester Sonnenuntergangs-Spot in ${cityLabel}`,
          prompt: `Wo gibt es die schönsten Sonnenuntergangs-Aussichten in ${cityLabel}? Schlage den besten Spot vor`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `Ruhiges Nachbarschafts-Café an Tag ${rDay}`,
          prompt: `Schlage ein gemütliches lokales Café für eine ruhige Pause am Nachmittag von Tag ${rDay} vor`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `Regen-Backup für Tag ${currentDay} planen`,
          prompt: `Wenn es am Nachmittag von Tag ${currentDay} regnet, schlage passende Indoor-Alternativen vor`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `Tag ${rDay} etwas ruhiger takten`,
          prompt: `Prüfe Tag ${rDay} und schlage vor, 1–2 gehetzte Stopps für ein ruhigeres Tempo zu kürzen`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: 'Abflugdatum oder Reisedauer ändern',
          prompt: 'Ändere das Abflugdatum auf …, die Rückreise auf …, insgesamt … Tage',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: 'Städte hinzufügen, entfernen oder tauschen',
          prompt: 'Passe die Städteliste an auf … (hinzufügen, entfernen oder ersetzen, mit Tagen pro Stadt)',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: 'Gesamten Reiseplan neu erstellen',
          prompt: 'Plane die gesamte Reise neu nach meinen Vorlieben: … (Tempo, Must-sees oder Vermeidungen)',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: 'Heutiges Budget & Tax-Free-Status prüfen',
          prompt: 'Wie viel Tagesbudget ist heute noch übrig und wie weit bin ich von der Tax-Free-Grenze entfernt?',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `Sprachkarte für ${cityLabel} erstellen`
            : `Kaffee 50/50 mit ${buddy} erfassen`,
          prompt: isSolo
            ? `Erstelle eine Sprachkarte für Restaurant-Bestellungen oder Tax-Free in ${cityLabel}`
            : `Zwei Kaffee in ${cityLabel} ${currencySymbol}14 per Karte, 50/50 mit ${buddy} geteilt`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: 'Eine Ausgabe von heute erfassen',
          prompt: `Ich habe gerade ${currencySymbol}… in ${cityLabel} per Karte ausgegeben; bitte im heutigen Budget erfassen`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: 'Wie viel fehlt bis Tax-Free?',
          prompt: 'Wie weit bin ich von der Tax-Free-Grenze entfernt und wie viel habe ich schon angesammelt?',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `Handgepäck (${carryOnLimitKg}kg) & Aufgabe prüfen`,
        prompt: `Wie schwer sind mein Handgepäck und Aufgabegepäck im Vergleich zu ${carryOnLimitKg}kg / ${checkedLimitKg}kg?`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: 'Packvorlage wechseln',
        prompt: 'Wechsle zu einer Szenario-Packvorlage (Ski / Familie / Business usw.) und merge mit behaltenen Häkchen',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: '9-Taschen-Liste neu erzeugen',
        prompt: 'Erzeuge anhand des aktuellen Plans und Zielorts die 9-Taschen-Liste neu und behalte abgehakte Fortschritte',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: 'Gewicht der 9 Taschen prüfen',
        prompt: 'Zeig mir die Gewichtsverteilung der 9 Taschen und wie viel Handgepäck-/Aufgabe-Kontingent übrig ist',
        mode: 'instant',
      },
    ];
  }

  if (lang === 'pt-BR') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `Deixar o Dia ${rDay} mais tranquilo`,
          prompt: `Deixe o Dia ${rDay} mais leve removendo paradas corridas ou trocando por um passeio calmo`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `Adicionar um ótimo jantar ao Dia ${dDay}`,
          prompt: `Recomende e proponha adicionar um restaurante local excelente para jantar no Dia ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `Preciso de visto para ${countryLabel}?`,
          prompt: `Preciso de visto para ${countryLabel} e quais documentos de entrada devo preparar?`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `Jeito mais barato do aeroporto ao centro de ${cityLabel}?`,
          prompt: `Qual a forma mais barata e confiável de ir do aeroporto ao centro de ${cityLabel}?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `Visto e regras de entrada em ${countryLabel}`,
          prompt: `Me dê dicas rápidas de visto, validade do passaporte e imigração em ${countryLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `Comparar transfer aeroporto → ${cityLabel}`,
          prompt: `Compare trem/ônibus econômico versus táxi do aeroporto até ${cityLabel}`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `Gorjetas, cartão vs. dinheiro em ${cityLabel}`,
          prompt: `Como funciona a gorjeta em ${cityLabel} e quanto dinheiro vivo vale levar vs. cartão?`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `Reembolso Tax-Free e segurança em ${countryLabel}`,
          prompt: `Como aproveitar o Tax-Free em ${countryLabel} e quais cuidados ter em ${cityLabel}?`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `Jantar local autêntico para o Dia ${dDay}`,
          prompt: `Proponha adicionar um restaurante local autêntico para o jantar do Dia ${dDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `Melhor lugar para o pôr do sol em ${cityLabel}`,
          prompt: `Quais são os melhores mirantes para o pôr do sol em ${cityLabel}? Proponha adicionar o melhor`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `Café charmoso de bairro no Dia ${rDay}`,
          prompt: `Proponha adicionar uma cafeteria local tranquila para a tarde do Dia ${rDay}`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `Plano B fechado se chover no Dia ${currentDay}`,
          prompt: `Se chover na tarde do Dia ${currentDay}, proponha trocar paradas ao ar livre por opções fechadas`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `Deixar o Dia ${rDay} menos corrido`,
          prompt: `Revise o Dia ${rDay} e proponha enxugar 1 ou 2 paradas corridas`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: 'Alterar data de partida ou duração',
          prompt: 'Altere a data de partida para …, a de retorno para …, total de … dias',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: 'Adicionar, remover ou trocar cidades',
          prompt: 'Ajuste as cidades da viagem para … (adicione, remova ou substitua, com dias por cidade)',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: 'Replanejar todo o roteiro',
          prompt: 'Replaneje todo o roteiro com minhas novas preferências: … (ritmo, obrigatórios ou o que evitar)',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: 'Ver saldo do orçamento hoje e Tax-Free',
          prompt: 'Quanto resta do orçamento diário hoje e quanto falta para o mínimo de Tax-Free?',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `Criar cartão de frases locais para ${cityLabel}`
            : `Lançar café dividido 50/50 com ${buddy}`,
          prompt: isSolo
            ? `Crie um cartão de frases locais para pedir comida ou Tax-Free em ${cityLabel}`
            : `Dois cafés em ${cityLabel} ${currencySymbol}14 no cartão, dividido 50/50 com ${buddy}`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: 'Lançar um gasto de hoje',
          prompt: `Acabei de gastar ${currencySymbol}… em ${cityLabel} no cartão; lance no orçamento de hoje`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: 'Quanto falta para o Tax-Free?',
          prompt: 'Quanto falta para o mínimo de Tax-Free e quanto já acumulei?',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `Auditar mala de bordo (${carryOnLimitKg}kg) e despachada`,
        prompt: `Quanto pesam minha mala de bordo e despachada diante dos limites de ${carryOnLimitKg}kg / ${checkedLimitKg}kg?`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: 'Trocar modelo de cenário',
        prompt: 'Troque para um modelo de mala (esqui / família / negócios etc.) e mescle mantendo o marcado',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: 'Regenerar lista de 9 bolsas',
        prompt: 'Com base no roteiro e destino atuais, regenere a lista de 9 bolsas mantendo o progresso marcado',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: 'Ver peso das 9 bolsas',
        prompt: 'Mostre o peso de cada uma das 9 bolsas e quanto resta de bordo e despachada',
        mode: 'instant',
      },
    ];
  }

  if (lang === 'ja-JP') {
    if (category === 'featured') {
      return [
        {
          id: 'feat_relax',
          label: `Day ${rDay} をもっとゆとりある日程にする`,
          prompt: `Day ${rDay} で詰め込み気味のスポットを減らすか、ゆったり過ごせる体験へ入れ替えてください`,
          mode: 'instant',
        },
        {
          id: 'feat_dinner',
          label: `Day ${dDay} に地元で人気の夕食を追加`,
          prompt: `Day ${dDay} の動線に合う、地元で評判の良いディナースポットを提案・追加してください`,
          mode: 'instant',
        },
        {
          id: 'feat_visa',
          label: `${countryLabel}への渡航にビザ・入国書類は必要？`,
          prompt: `${countryLabel}旅行に必要なビザや電子渡航認証、入国時に確認されやすい書類を教えてください`,
          mode: 'instant',
        },
        {
          id: 'feat_airport',
          label: `空港から${cityLabel}市内への一番お得な移動は？`,
          prompt: `空港から${cityLabel}中心部まで、最もお得で安心な移動手段と料金・所要時間を教えてください`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'tips') {
      return [
        {
          id: 'tip_visa',
          label: `${countryLabel}のビザ・入国チェックリスト`,
          prompt: `${countryLabel}のビザ要件、パスポート残存期間、入国審査と通信(eSIM)の要点を教えてください`,
          mode: 'instant',
        },
        {
          id: 'tip_airport',
          label: `空港から${cityLabel}市内のアクセス比較`,
          prompt: `空港から${cityLabel}市内への鉄道・バス・タクシーの料金と所要時間を比較してください`,
          mode: 'instant',
        },
        {
          id: 'tip_money',
          label: `${cityLabel}のチップ・カード決済・両替の目安`,
          prompt: `${cityLabel}でのチップ習慣や、クレジットカードと現金の使い分け・両替目安を教えてください`,
          mode: 'instant',
        },
        {
          id: 'tip_tax',
          label: `${countryLabel}の免税手続きと防犯ポイント`,
          prompt: `${countryLabel}での免税(Tax-Free)手順と、${cityLabel}で気をつけるべき防犯ポイントを教えてください`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'inspiration') {
      return [
        {
          id: 'insp_dinner',
          label: `Day ${dDay} におすすめのディナーを探す`,
          prompt: `Day ${dDay} にぴったりのローカル名店ディナーを追加提案してください`,
          mode: 'instant',
        },
        {
          id: 'insp_sunset',
          label: `${cityLabel}の絶景サンセットスポット`,
          prompt: `${cityLabel}で夕日や夜景が美しい絶景スポットを挙げて、一番行きやすい場所を日程に提案してください`,
          mode: 'instant',
        },
        {
          id: 'insp_cafe',
          label: `Day ${rDay} に落ち着いた街角カフェを追加`,
          prompt: `Day ${rDay} の午後にゆっくり休めるローカルカフェを追加提案してください`,
          mode: 'instant',
        },
        {
          id: 'insp_rain',
          label: `Day ${currentDay} が雨のときの屋内代替プラン`,
          prompt: `Day ${currentDay} の午後が雨の場合、屋外スポットを屋内プランへ切り替える提案をしてください`,
          mode: 'instant',
        },
      ];
    }
    if (category === 'itinerary') {
      return [
        {
          id: 'act_relax',
          label: `Day ${rDay} のスケジュールを少し軽くする`,
          prompt: `Day ${rDay} の流れを見直し、急ぎ足の予定を1〜2件減らして余裕を作る提案をしてください`,
          mode: 'instant',
        },
        {
          id: 'act_date',
          label: '出発日や旅行日数を変更',
          prompt: '出発日を……、帰国日を……に変更し、合計……日間にしてください',
          mode: 'fill',
        },
        {
          id: 'act_city',
          label: '都市の追加・削除・入れ替え',
          prompt: '旅程の都市を……に調整してください（追加・削除・入れ替え可、各都市の滞在日数も）',
          mode: 'fill',
        },
        {
          id: 'act_replan',
          label: '行程全体を再プランする',
          prompt: '新しい希望に合わせて行程全体を再計画してください：……（ペース、必訪スポット、避けたい内容）',
          mode: 'fill',
        },
      ];
    }
    if (category === 'expense') {
      return [
        {
          id: 'act_budget',
          label: '今日の残り予算と免税ラインまでの差額',
          prompt: '本日の日別予算の残りと、免税(Tax-Free)基準額までの進捗を教えてください',
          mode: 'instant',
        },
        {
          id: 'act_phrase',
          label: isSolo
            ? `${cityLabel}用の現地フレーズカードを作成`
            : `${buddy}と割り勘のコーヒー代を記録`,
          prompt: isSolo
            ? `${cityLabel}のレストラン注文や免税手続きでそのまま見せられる現地語フレーズカードを作ってください`
            : `${cityLabel}でコーヒー2杯 ${currencySymbol}14、クレジットカード払い、${buddy}と50/50で割り勘`,
          mode: isSolo ? 'instant' : 'fill',
        },
        {
          id: 'act_expense',
          label: '今日の支出を1件記録',
          prompt: `${cityLabel}で ${currencySymbol}……をクレジットカードで支払ったので、今日の家計に記録してください`,
          mode: 'fill',
        },
        {
          id: 'act_vat',
          label: '免税ラインまでいくら不足？',
          prompt: '免税(Tax-Free)基準額までの不足額と、これまでに累計した対象額を教えてください',
          mode: 'instant',
        },
      ];
    }
    return [
      {
        id: 'act_weight',
        label: `機内 (${carryOnLimitKg}kg)・預け手荷物の重量確認`,
        prompt: `現在の機内持込と預け荷物の重量が、上限 ${carryOnLimitKg}kg / ${checkedLimitKg}kg に対してどのくらい余裕があるか確認してください`,
        mode: 'instant',
      },
      {
        id: 'act_template',
        label: 'シーン別パッキングテンプレートに切替',
        prompt: 'スキー／家族／ビジネスなどのシーン別パッキングテンプレートに切り替え、チェック済み項目を残して結合してください',
        mode: 'fill',
      },
      {
        id: 'act_repack',
        label: '新しい行程で9袋リストを再生成',
        prompt: '現在の行程と目的地に合わせて9袋パッキングリストを再生成し、チェック済みの進捗を保持してください',
        mode: 'instant',
      },
      {
        id: 'act_bag',
        label: '9袋の配重を確認',
        prompt: '9袋それぞれの重量配分と、機内持込・預けの残り枠を教えてください',
        mode: 'instant',
      },
    ];
  }

  // English (en-US / en-GB)
  const isGB = lang === 'en-GB';
  const carryTerm = isGB ? 'cabin bag' : 'carry-on';
  const holdTerm = isGB ? 'hold luggage' : 'checked bag';
  const taxTerm = isGB ? 'VAT refund' : 'tax-free refund';

  if (category === 'featured') {
    return [
      {
        id: 'feat_relax',
        label: `Make day ${rDay} more relaxed`,
        prompt: `Make day ${rDay} more relaxed by trimming rushed stops or swapping in a slower-paced spot`,
        mode: 'instant',
      },
      {
        id: 'feat_dinner',
        label: `Add a great dinner spot to day ${dDay}`,
        prompt: `Add a great local dinner spot to day ${dDay} that fits nicely with our nearby stops`,
        mode: 'instant',
      },
      {
        id: 'feat_visa',
        label: `Do I need a visa for ${countryLabel}?`,
        prompt: `Do I need a visa for ${countryLabel}, and what entry documents or border rules should I prepare?`,
        mode: 'instant',
      },
      {
        id: 'feat_airport',
        label: `What is the cheapest way from the airport into ${cityLabel}?`,
        prompt: `What is the cheapest and most reliable way to get from the airport into ${cityLabel} city center, with fares and travel time?`,
        mode: 'instant',
      },
    ];
  }
  if (category === 'tips') {
    return [
      {
        id: 'tip_visa',
        label: `Visa & border entry tips for ${countryLabel}`,
        prompt: `Give me concise visa, passport validity, and arrival immigration tips for ${countryLabel}`,
        mode: 'instant',
      },
      {
        id: 'tip_airport',
        label: `Cheapest vs. fastest airport transfer into ${cityLabel}`,
        prompt: `Compare the cheapest train/bus vs. taxi options from the airport into ${cityLabel}`,
        mode: 'instant',
      },
      {
        id: 'tip_money',
        label: `Tipping, cards vs. cash in ${cityLabel}`,
        prompt: `What is the tipping etiquette in ${cityLabel}, and how much cash should I carry vs. paying by card?`,
        mode: 'instant',
      },
      {
        id: 'tip_tax',
        label: `${taxTerm} & local safety tips in ${countryLabel}`,
        prompt: `How do I maximize ${taxTerm} in ${countryLabel}, and what common tourist scams or safety tips should I know in ${cityLabel}?`,
        mode: 'instant',
      },
    ];
  }
  if (category === 'inspiration') {
    return [
      {
        id: 'insp_dinner',
        label: `Add a great local dinner spot to day ${dDay}`,
        prompt: `Recommend and propose adding an authentic local dinner restaurant to day ${dDay}`,
        mode: 'instant',
      },
      {
        id: 'insp_sunset',
        label: `Best golden-hour sunset spot in ${cityLabel}`,
        prompt: `Where are the best golden-hour sunset viewpoints in ${cityLabel}? Propose adding the best one to my trip`,
        mode: 'instant',
      },
      {
        id: 'insp_cafe',
        label: `Add a slow-paced neighborhood café to day ${rDay}`,
        prompt: `Propose adding a beloved local café for an unhurried afternoon break on day ${rDay}`,
        mode: 'instant',
      },
      {
        id: 'insp_rain',
        label: `Swap day ${currentDay} outdoor stops to rainy-day backups`,
        prompt: `If it rains on day ${currentDay} afternoon, propose switching outdoor stops to indoor rainy-day backup plans`,
        mode: 'instant',
      },
    ];
  }
  if (category === 'itinerary') {
    return [
      {
        id: 'act_relax',
        label: `Make day ${rDay} calmer and less rushed`,
        prompt: `Review day ${rDay} and propose trimming 1–2 rushed stops for a calmer pace`,
        mode: 'instant',
      },
      {
        id: 'act_date',
        label: 'Change departure date or trip length',
        prompt: 'Change my departure date to …, return date to …, for a total of … days',
        mode: 'fill',
      },
      {
        id: 'act_city',
        label: 'Add, remove, or swap cities',
        prompt: 'Adjust my trip cities to … (add, remove, or replace cities, and note days per city)',
        mode: 'fill',
      },
      {
        id: 'act_replan',
        label: 'Rebuild the full itinerary',
        prompt: 'Rebuild my full itinerary with these new preferences: … (pace, must-sees, or what to skip)',
        mode: 'fill',
      },
    ];
  }
  if (category === 'expense') {
    return [
      {
        id: 'act_budget',
        label: `Check today's budget & ${taxTerm} progress`,
        prompt: `How much daily budget do I have left today, and how far am I from the ${taxTerm} threshold?`,
        mode: 'instant',
      },
      {
        id: 'act_phrase',
        label: isSolo
          ? `Create a local phrase card for ${cityLabel}`
          : `Log coffee split 50/50 with ${buddy}`,
        prompt: isSolo
          ? `Create a local-language phrase card for ordering food or asking for a ${taxTerm} form in ${cityLabel}`
          : `Two coffees in ${cityLabel} ${currencySymbol}14 by credit card, split 50/50 with ${buddy}`,
        mode: isSolo ? 'instant' : 'fill',
      },
      {
        id: 'act_expense',
        label: 'Log an expense for today',
        prompt: `I just spent ${currencySymbol}… in ${cityLabel} by credit card; log it to today's budget`,
        mode: 'fill',
      },
      {
        id: 'act_vat',
        label: `How far to the ${taxTerm} threshold?`,
        prompt: `How far am I from the ${taxTerm} threshold, and how much have I accumulated so far?`,
        mode: 'instant',
      },
    ];
  }
  return [
    {
      id: 'act_weight',
      label: `Audit ${carryTerm} (${carryOnLimitKg}kg) & ${holdTerm} weight`,
      prompt: `How heavy are my ${carryTerm} and ${holdTerm} right now compared to my ${carryOnLimitKg}kg / ${checkedLimitKg}kg limits?`,
      mode: 'instant',
    },
    {
      id: 'act_template',
      label: 'Switch packing scenario template',
      prompt: 'Switch to a packing scenario template (ski / family / business, etc.) and smart-merge while keeping checked items',
      mode: 'fill',
    },
    {
      id: 'act_repack',
      label: 'Regenerate the 9-bag packing list',
      prompt: 'Based on my latest itinerary and destination, regenerate the 9-bag packing list and keep checked progress',
      mode: 'instant',
    },
    {
      id: 'act_bag',
      label: 'Check 9-bag weight distribution',
      prompt: `Show the weight distribution across my 9 bags, plus remaining ${carryTerm} and ${holdTerm} allowance`,
      mode: 'instant',
    },
  ];
}

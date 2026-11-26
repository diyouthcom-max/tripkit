import type { AppLanguage } from '../../types';
import { pickLang } from '../langHelper';

export interface AppPackACopy {
  proRestoredToast: string;
  crewMemberFallback: string;
  selfFallback: string;
  destinationFallback: string;
  packingReminderTitle: string;
  reminderHeadlineWithItems: (headline: string, preview: string, extraCount: number) => string;
  departureMorningAlertHeadline: (count: number) => string;
  departureMorningAllPackedHeadline: string;
  scheduledPackingAlertCustom: (count: number) => string;
  scheduledPackingAlertLead: (hours: number, count: number) => string;
  preTripPackingReminderPreviewHeadline: (count: number) => string;
  allNightBeforePackedHeadline: string;
  switchedTripToast: (title: string) => string;
  paywallDuplicateTrip: string;
  duplicatedTripToast: (title: string) => string;
  clearedPreviousTripToast: string;
  removedTripFromBookToast: string;
  revertedWardrobeScalingToast: string;
  autoScaledWardrobeToast: (days: number, count: number) => string;
  savedSetupWithScalingToast: (title: string, days: number) => string;
  savedSetupPreservedToast: (title: string) => string;
  addedTravelerSeatToast: (name: string) => string;
  removedTravelerSeatToast: string;
  updatedMeetupToast: string;
  loadedSampleTripToast: string;
  paywallMultiTrip: string;
  addedSampleTripToast: string;
  createdStarterTripToast: (title: string) => string;
  createdSavedTripToast: (title: string) => string;
  paywallExportPdf: string;
  exportedPdfToast: (filename: string) => string;
  pdfExportFailed: string;
  removedLearnedCatToast: (itemName: string) => string;
  clearedLearnedCatsToast: string;
  proPlanLifetime: string;
  proPlanOneYear: string;
  proRestoredPlanToast: (label: string) => string;
  proRedeemedPlanToast: (label: string) => string;
  deactivatedProToast: string;
  importedBackupToast: (count: number) => string;
  fallbackTaskTitle: string;
  fallbackTaskTiming: string;
  fallbackDayClustered: (day: number) => string;
  paywallAiPlanTrip: string;
  aiPlanTripFailed: string;
  aiGenerationTimeout: string;
  aiNetworkInterrupted: string;
  aiRetryingToast: string;
  generatedSavedTripToast: (title: string) => string;
  generationFailedKeyHint: string;
  paywallAiRegenTrip: string;
  regeneratedTripToast: (title: string) => string;
  generatedOfflinePackingToast: (groupsCount: number, totalItems: number, preservedDoneCount: number) => string;
  paywallAiPackingList: string;
  aiPackingListFailed: string;
  aiEmptyPackingListError: string;
  aiBuiltPackingToast: (groupsCount: number, totalItems: number, preservedDoneCount: number) => string;
  aiPackingFailedKeyHint: string;
  savedStayToast: (placeName: string) => string;
  addedPackItemToast: (labelWithQty: string, weightDisplay: string) => string;
  customPackingCubeFallback: string;
  createdCategoryToast: (title: string) => string;
  updatedCategoryToast: (title: string) => string;
  deletedCategoryToast: string;
  savedItemChangesToast: (name?: string) => string;
  removedItemToast: (name?: string) => string;
  switchedItemOwnerFallback: string;
  assignedItemOwnerToast: (itemName: string, ownerName: string) => string;
  markedMorningDepartureToast: string;
  unmarkedMorningDepartureToast: string;
  toBuyAlertTitle: (itemName: string) => string;
  toBuyAlertNote: string;
  addedToBuyToast: (itemName: string) => string;
  markedPurchasedToast: (itemName: string) => string;
  addedAlwaysPackToast: (itemName: string) => string;
  removedAlwaysPackToast: (itemName: string) => string;
  removedDontSuggestToast: (name?: string) => string;
  allAlwaysPackAlreadyToast: string;
  syncedAlwaysPackToast: (count: number) => string;
  noCoreEssentialsToast: string;
  extractedAlwaysPackToast: (count: number) => string;
  quickAddGearToast: (name: string) => string;
  movedItemRememberedToast: (groupTitle: string, itemName: string) => string;
  paywallAiClassify: string;
  aiClassifyFailed: string;
  aiWhyFallback: string;
  aiNewCubeLabelFallback: string;
  aiVoiceWhyFallback: string;
  aiSortedMultiToast: (count: number) => string;
  personalExtrasFallback: string;
  aiCreatedGroupAddedToast: (groupTitle: string, itemLabel: string) => string;
  aiAddedToGroupToast: (groupTitle: string, itemLabel: string) => string;
  dedupKeepingToast: (ownerName: string, itemName: string) => string;
  dedupGenericToast: string;
  previewedMorningReminderToast: string;
  reminderRulesUpdatedToast: string;
  reminderPausedToast: string;
  notifUnsupportedToast: string;
  notifGrantedToast: string;
  notifDeniedToast: string;
  notifRestrictedToast: string;
  itineraryLeadSetToast: (mins: number) => string;
  stopFallback: string;
  cancelledStopAlertToast: (label: string) => string;
  scheduledStopAlertToast: (leadMins: number, label: string) => string;
  clearedDayAlertsToast: (day: number) => string;
  scheduledDayAlertsToast: (leadMins: number, count: number, day: number) => string;
  cancelledMeetupAlertToast: (day: number) => string;
  scheduledMeetupAlertToast: (day: number, leadMins: number, meetupTime: string) => string;
  scheduledCustomItinAlertToast: (title: string, badge: string) => string;
  scheduledCustomPackAlertToast: (title: string, badge: string) => string;
  removedScheduledAlertToast: string;
  snoozedAlertToast: (mins: number) => string;
  sentPackingPreviewToast: string;
  snoozedReminderToast: (mins: number) => string;
  aiWriteAllBlocked: string;
  aiWriteNothingApplied: string;
  aiWriteSnapshotRestored: string;
}

export function getAppPackACopy(lang: AppLanguage): AppPackACopy {
  return pickLang<AppPackACopy>(lang, {
    'zh-CN': {
      proRestoredToast: '已自动恢复账号绑定的 Trip Kit Pro 权益',
      crewMemberFallback: '同行成员',
      selfFallback: '本人',
      destinationFallback: '目的地',
      packingReminderTitle: 'Trip Kit 打包提醒',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}：${p}${extra > 0 ? ` 等 ${extra} 件` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `出发当天早晨提醒：还有 ${count} 件临行物品没拔/没装，记得装进随身包`,
      departureMorningAllPackedHeadline: '⏰ 出发当天早晨物品已全部装入随身包',
      scheduledPackingAlertCustom: (count) =>
        `已到设定打包时间，还有 ${count} 件待装箱（已自动跳过「出发早晨装入」项）`,
      scheduledPackingAlertLead: (hours, count) =>
        `距离出发不足 ${hours} 小时，还有 ${count} 件待装箱（已跳过「出发早晨装入」项）`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `起飞前打包提醒：还有 ${count} 件待装箱（已跳过「出发早晨装入」项）`,
      allNightBeforePackedHeadline: '太棒了！起飞前需提前装箱的物品已全部装好',
      switchedTripToast: (title) => `已切换至「${title}」`,
      paywallDuplicateTrip:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 即可免费领取 1 年 Pro 授权码，继续使用行囊模板一键复用。',
      duplicatedTripToast: (title) => `已复制「${title}」清单结构并切换至新副本`,
      clearedPreviousTripToast: '已清空旧行程，请创建你的新旅行',
      removedTripFromBookToast: '已从行程簿移除该行程',
      revertedWardrobeScalingToast: '已撤销衣物归一化调整，恢复原清单数量',
      autoScaledWardrobeToast: (days, count) =>
        `已按 ${days} 天自动归一化更新 ${count} 项衣物数量与配重`,
      savedSetupWithScalingToast: (title, days) =>
        `已保存「${title}」路线参数，并按 ${days} 天完成衣物清单归一化`,
      savedSetupPreservedToast: (title) =>
        `已保存「${title}」路线与天数微调（原清单与账本完整保留）`,
      addedTravelerSeatToast: (name) => `已新增同行席位「${name}」`,
      removedTravelerSeatToast: '已移除该同行席位',
      updatedMeetupToast: '已更新晚间汇合安排',
      loadedSampleTripToast: '已载入「巴黎 → 阿姆斯特丹」示范行程',
      paywallMultiTrip:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 即可免费申领 1 年多行程 Pro 授权码。',
      addedSampleTripToast: '已在行程簿新增一套「巴黎 → 阿姆斯特丹」示范行程',
      createdStarterTripToast: (title) => `已创建「${title}」基础行程`,
      createdSavedTripToast: (title) => `已新建「${title}」并保存至行程簿`,
      paywallExportPdf:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续导出含临行必带单的高清 A4 离线 PDF 手册。',
      exportedPdfToast: (filename) =>
        `已导出 A4 打印手册（含封面与随身对折核对单）：${filename}`,
      pdfExportFailed: 'PDF 导出失败',
      removedLearnedCatToast: (itemName) => `已移除「${itemName}」的自动归类记忆`,
      clearedLearnedCatsToast: '已清空全部 AI 归类记忆词典',
      proPlanLifetime: '终身版',
      proPlanOneYear: '1 年完整版',
      proRestoredPlanToast: (label) => `已成功恢复 Trip Kit Pro（${label}）权益`,
      proRedeemedPlanToast: (label) => `兑换成功！已为你开通 Trip Kit Pro（${label}）`,
      deactivatedProToast: '本机已切回免费体验状态',
      importedBackupToast: (count) => `已成功恢复 ${count} 套行程与偏好设置`,
      fallbackTaskTitle: '待办旅行事务',
      fallbackTaskTiming: '出发前',
      fallbackDayClustered: (d) => `Day ${d} 已按顺路地理区块自动聚类编排。`,
      paywallAiPlanTrip:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续使用 AI 智能生成行程。',
      aiPlanTripFailed: 'AI 生成行程失败',
      aiGenerationTimeout:
        '生成耗时过长，已停止等待。请检查网络后重试，或点「离线秒建基础行程」立即建档。',
      aiNetworkInterrupted:
        '网络连接中断，已自动重试一次。请保持页面在前台、连接稳定 Wi-Fi 后再试，或点「离线秒建基础行程」。',
      aiRetryingToast: '网络不稳，正在自动重试…',
      generatedSavedTripToast: (title) => `已生成「${title}」专属方案并保存至行程簿`,
      generationFailedKeyHint: '生成失败，请检查服务端密钥',
      paywallAiRegenTrip:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续使用 AI 重新规划路线与清单。',
      regeneratedTripToast: (title) => `已重新生成并更新「${title}」`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `已按尺码与场景生成 ${groups} 大分类 · 共 ${total} 项专属清单${
          preserved > 0 ? `（保留 ${preserved} 项已打包进度）` : ''
        }`,
      paywallAiPackingList:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续使用 AI 深度定制打包清单。',
      aiPackingListFailed: 'AI 生成专属打包清单失败',
      aiEmptyPackingListError: 'AI 返回了空清单，请重试或使用下方秒速引擎生成。',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `AI 已深度生成 ${groups} 大分类 · 共 ${total} 项专属清单${
          preserved > 0 ? `（保留 ${preserved} 项已打包进度）` : ''
        }`,
      aiPackingFailedKeyHint: 'AI 生成失败，请检查服务端密钥或使用下方秒速引擎生成',
      savedStayToast: (name) => `已绑定入住酒店「${name}」`,
      addedPackItemToast: (label, weight) => `已加入打包清单：${label}（${weight}）`,
      customPackingCubeFallback: '自定义收纳袋分组',
      createdCategoryToast: (title) => `已新建分类：「${title}」`,
      updatedCategoryToast: (title) => `已更新分类「${title}」`,
      deletedCategoryToast: '已删除分类（原有物品已安全保留并移至首个分类）',
      savedItemChangesToast: (name) => `已保存「${name || '物品'}」修改`,
      removedItemToast: (name) => (name ? `已移除「${name}」` : '已移除该物品'),
      switchedItemOwnerFallback: '已切换物品归属成员',
      assignedItemOwnerToast: (item, owner) => `「${item}」已归属 ${owner}`,
      markedMorningDepartureToast: '已标为「出发早晨装入」，起飞前一晚不计入遗漏报警',
      unmarkedMorningDepartureToast: '已取消「出发早晨装入」标记',
      toBuyAlertTitle: (item) => `行前待购提醒：${item}`,
      toBuyAlertNote: '出发前 14 天待购装备自动提醒',
      addedToBuyToast: (item) => `已将「${item}」加入待购，并开启出发前 14 天采购提醒`,
      markedPurchasedToast: (item) => `已将「${item}」标为已买齐（采购提醒已移除）`,
      addedAlwaysPackToast: (item) => `已将「${item}」加入跨行程常备库`,
      removedAlwaysPackToast: (item) => `已将「${item}」移出常备库`,
      removedDontSuggestToast: (name) =>
        name
          ? `已移除「${name}」，今后新行程与 AI 诊断不再推荐`
          : '已移除该物品，今后不再推荐',
      allAlwaysPackAlreadyToast: '常备库中的全部物品均已在当前行程清单中',
      syncedAlwaysPackToast: (count) => `已从常备库同步补齐 ${count} 件常备物品`,
      noCoreEssentialsToast: '未匹配到核心常备项，可点击任意物品菜单设为常备',
      extractedAlwaysPackToast: (count) => `已提取 ${count} 项核心物品存入跨行程常备库`,
      quickAddGearToast: (name) => `已将「${name}」加入待购与打包清单`,
      movedItemRememberedToast: (grp, item) =>
        `已移至「${grp}」，AI 已记住你对「${item}」的分类偏好`,
      paywallAiClassify:
        '30 天免费体验期已满：手动添加与勾选物品永久免费；添加主理人 WhatsApp 或 Facebook 即可免费领 1 年 AI 自动归类权限。',
      aiClassifyFailed: 'AI 自动归类失败',
      aiWhyFallback: 'AI 智能补充随行物品',
      aiNewCubeLabelFallback: 'AI 自动新建分类收纳袋',
      aiVoiceWhyFallback: 'AI 语音补充随行物品',
      aiSortedMultiToast: (count) => `AI 已自动归类并添加 ${count} 件物品`,
      personalExtrasFallback: '个人补充装备',
      aiCreatedGroupAddedToast: (grp, lbl) => `AI 自动新建「${grp}」分类并加入：${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `AI 已自动归入「${grp}」：${lbl}`,
      dedupKeepingToast: (owner, item) => `已为你去重，保留 ${owner} 携带的「${item}」`,
      dedupGenericToast: '已为你去重，避免重复携带',
      previewedMorningReminderToast: '已预览出发当天早晨专属提醒',
      reminderRulesUpdatedToast: '打包提醒规则已更新',
      reminderPausedToast: '已暂停打包提醒',
      notifUnsupportedToast: '当前环境不支持系统桌面通知，将使用应用内实时横幅提醒',
      notifGrantedToast: '已开启浏览器本地推送（支持行程节点与打包截止提醒）',
      notifDeniedToast: '未开启系统通知，将保留应用内实时提醒横幅',
      notifRestrictedToast: '浏览器通知权限受限，将使用应用内实时提醒横幅',
      itineraryLeadSetToast: (mins) => `行程提醒时间已设为提前 ${mins} 分钟`,
      stopFallback: '该站点',
      cancelledStopAlertToast: (lbl) => `已取消「${lbl}」的到点提醒`,
      scheduledStopAlertToast: (mins, lbl) => `已预约「${lbl}」提前 ${mins} 分钟推送提醒`,
      clearedDayAlertsToast: (day) => `已取消 Day ${day} 全部站点提醒`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `已为 Day ${day} 共 ${count} 个未到访站点开启提前 ${mins} 分钟提醒`,
      cancelledMeetupAlertToast: (day) => `已取消 Day ${day} 晚间汇合提醒`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `已预约 Day ${day} 晚间汇合提醒（${time} 前 ${mins} 分钟）`,
      scheduledCustomItinAlertToast: (title, badge) => `已排期行程提醒「${title}」（${badge}）`,
      scheduledCustomPackAlertToast: (title, badge) => `已排期截止提醒「${title}」（${badge}）`,
      removedScheduledAlertToast: '已移除该排期提醒',
      snoozedAlertToast: (mins) => `已延后 ${mins} 分钟再推送`,
      sentPackingPreviewToast: '已发送起飞前打包提醒预览',
      snoozedReminderToast: (mins) => `已延后 ${mins} 分钟再提醒`,
      aiWriteAllBlocked: '当前提案涉及的写权限均已关闭，未写入任何改动',
      aiWriteNothingApplied: '没有可应用的改动（相关权限域已关闭）',
      aiWriteSnapshotRestored: '已从操作快照回滚业务数据',
    },
    'en-US': {
      proRestoredToast: 'Automatically restored your account-linked Trip Kit Pro membership',
      crewMemberFallback: 'Crew Member',
      selfFallback: 'Me',
      destinationFallback: 'Destination',
      packingReminderTitle: 'Trip Kit Packing Reminder',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}: ${p}${extra > 0 ? ` (+${extra} more)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Departure-morning alert: ${count} last-minute item(s) still unplugged/unpacked — pack into your carry-on`,
      departureMorningAllPackedHeadline:
        '⏰ All departure-morning items are packed in your carry-on',
      scheduledPackingAlertCustom: (count) =>
        `Scheduled packing reminder: ${count} item(s) left to pack (departure-morning items skipped)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Under ${hours}h until departure: ${count} item(s) left to pack (departure-morning items skipped)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Pre-trip packing reminder: ${count} item(s) left to pack (departure-morning items skipped)`,
      allNightBeforePackedHeadline:
        'Awesome! Every night-before packing item is already packed',
      switchedTripToast: (title) => `Switched to "${title}"`,
      paywallDuplicateTrip:
        'One-tap packing template duplication is a Trip Kit Pro perk after the 30-day trial. Message the creator on WhatsApp or Facebook to claim a free 1-year Pro code.',
      duplicatedTripToast: (title) =>
        `Duplicated "${title}" checklist and switched to the new copy`,
      clearedPreviousTripToast: 'Cleared previous trip — ready to set up your new journey',
      removedTripFromBookToast: 'Removed trip from your Trip Book',
      revertedWardrobeScalingToast:
        'Reverted wardrobe auto-scaling and restored original item counts',
      autoScaledWardrobeToast: (days, count) =>
        `Auto-scaled ${count} clothing item(s) and weights for ${days} days`,
      savedSetupWithScalingToast: (title, days) =>
        `Saved "${title}" setup and auto-scaled clothing for ${days} days`,
      savedSetupPreservedToast: (title) =>
        `Saved "${title}" route & dates (checklist and ledger preserved)`,
      addedTravelerSeatToast: (name) => `Added traveler seat "${name}"`,
      removedTravelerSeatToast: 'Removed traveler seat',
      updatedMeetupToast: 'Updated evening meetup plan',
      loadedSampleTripToast: 'Loaded "Paris → Amsterdam" sample trip',
      paywallMultiTrip:
        'Your 30-day free trial has ended (1 active trip remains free). Message the creator on WhatsApp or Facebook to claim a free 1-year multi-trip Pro code.',
      addedSampleTripToast: 'Added "Paris → Amsterdam" sample trip to your Trip Book',
      createdStarterTripToast: (title) => `Created starter trip "${title}"`,
      createdSavedTripToast: (title) => `Created "${title}" and saved to Trip Book`,
      paywallExportPdf:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to export printable A4 PDF trip handbooks.',
      exportedPdfToast: (filename) =>
        `Exported A4 Handbook (cover + foldable checklist): ${filename}`,
      pdfExportFailed: 'PDF export failed',
      removedLearnedCatToast: (itemName) =>
        `Removed learned category preference for "${itemName}"`,
      clearedLearnedCatsToast: 'Cleared all learned AI category preferences',
      proPlanLifetime: 'Lifetime',
      proPlanOneYear: '1-Year Full Access',
      proRestoredPlanToast: (label) => `Restored Trip Kit Pro (${label})`,
      proRedeemedPlanToast: (label) => `Redeemed! Trip Kit Pro (${label}) is now active`,
      deactivatedProToast: 'Switched this device back to Free Trial mode',
      importedBackupToast: (count) => `Restored ${count} trip(s) and preferences`,
      fallbackTaskTitle: 'Pre-trip to-do',
      fallbackTaskTiming: 'Before departure',
      fallbackDayClustered: (d) => `Day ${d} stops clustered by walkable district.`,
      paywallAiPlanTrip:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to keep generating AI trips.',
      aiPlanTripFailed: 'Failed to generate AI trip plan',
      aiGenerationTimeout:
        'Generation took too long and was stopped. Check your connection and retry, or tap Start Offline to create a starter trip now.',
      aiNetworkInterrupted:
        'Network interrupted; one automatic retry already ran. Keep this page in the foreground on stable Wi-Fi, then retry—or tap Start Offline.',
      aiRetryingToast: 'Unstable network — retrying automatically…',
      generatedSavedTripToast: (title) => `Generated "${title}" and saved to Trip Book`,
      generationFailedKeyHint: 'Generation failed — please check server API key',
      paywallAiRegenTrip:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to regenerate routes and checklists with AI.',
      regeneratedTripToast: (title) => `Regenerated and updated "${title}"`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `Generated ${groups} categories · ${total} tailored items${
          preserved > 0 ? ` (${preserved} packed kept)` : ''
        }`,
      paywallAiPackingList:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to generate AI custom packing lists.',
      aiPackingListFailed: 'Failed to generate custom AI packing list',
      aiEmptyPackingListError:
        'AI returned an empty packing list. Please retry or use instant offline generation.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `AI built ${groups} categories · ${total} items${
          preserved > 0 ? ` (${preserved} packed kept)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Generation failed — please check server API key or use instant mode below',
      savedStayToast: (name) => `Saved accommodation "${name}"`,
      addedPackItemToast: (label, weight) =>
        `Added to packing list: ${label} (${weight})`,
      customPackingCubeFallback: 'Custom Packing Cube',
      createdCategoryToast: (title) => `Created category: "${title}"`,
      updatedCategoryToast: (title) => `Updated category "${title}"`,
      deletedCategoryToast:
        'Category deleted (existing items safely moved to first category)',
      savedItemChangesToast: (name) => `Saved changes to "${name || 'item'}"`,
      removedItemToast: (name) => (name ? `Removed "${name}"` : 'Item removed'),
      switchedItemOwnerFallback: 'Switched item owner',
      assignedItemOwnerToast: (item, owner) => `"${item}" assigned to ${owner}`,
      markedMorningDepartureToast:
        'Marked as "Pack Morning of Departure" — skipped in eve-of-flight alerts',
      unmarkedMorningDepartureToast: 'Removed "Pack Morning of Departure" flag',
      toBuyAlertTitle: (item) => `Buy before trip: ${item}`,
      toBuyAlertNote: '14-day pre-trip gear purchase reminder',
      addedToBuyToast: (item) =>
        `Added "${item}" to To-Buy with 14-day pre-trip reminder`,
      markedPurchasedToast: (item) =>
        `Marked "${item}" as purchased (reminder cleared)`,
      addedAlwaysPackToast: (item) => `Saved "${item}" to your Always Pack library`,
      removedAlwaysPackToast: (item) => `Removed "${item}" from Always Pack library`,
      removedDontSuggestToast: (name) =>
        name
          ? `Removed "${name}" — won't suggest it in future trips`
          : "Item removed and won't be suggested again",
      allAlwaysPackAlreadyToast: 'All Always Pack items are already in this trip',
      syncedAlwaysPackToast: (count) =>
        `Synced ${count} new item(s) from Always Pack library`,
      noCoreEssentialsToast: 'No core essentials matched; star any item manually',
      extractedAlwaysPackToast: (count) =>
        `Extracted ${count} core essentials to Always Pack library`,
      quickAddGearToast: (name) => `Added "${name}" to your To-Buy list`,
      movedItemRememberedToast: (grp, item) =>
        `Moved to "${grp}" — AI remembered your category preference for "${item}"`,
      paywallAiClassify:
        'Your 30-day free trial has ended (manual adding & checking remain free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI auto-sorting Pro code.',
      aiClassifyFailed: 'Failed to classify packing item',
      aiWhyFallback: 'Smart AI packing addition',
      aiNewCubeLabelFallback: 'AI Auto-Sorted Packing Cube',
      aiVoiceWhyFallback: 'Added via AI voice packing',
      aiSortedMultiToast: (count) => `AI sorted and added ${count} items`,
      personalExtrasFallback: 'Personal Extras',
      aiCreatedGroupAddedToast: (grp, lbl) => `AI created "${grp}" and added: ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `AI added to "${grp}": ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Skipped duplicate — keeping ${owner}'s "${item}"`,
      dedupGenericToast: 'Skipped duplicate item',
      previewedMorningReminderToast: 'Previewed departure-morning reminder',
      reminderRulesUpdatedToast: 'Packing reminder rules updated',
      reminderPausedToast: 'Packing reminders paused',
      notifUnsupportedToast:
        'System browser notifications are not supported here — using live in-app banners instead',
      notifGrantedToast:
        'Browser push notifications enabled for itinerary & packing alerts',
      notifDeniedToast:
        'Browser notifications not enabled — keeping live in-app banners',
      notifRestrictedToast:
        'Browser notification permission restricted — using live in-app banners',
      itineraryLeadSetToast: (mins) =>
        `Itinerary alert lead time set to ${mins} min before`,
      stopFallback: 'Stop',
      cancelledStopAlertToast: (lbl) => `Cancelled alert for "${lbl}"`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Scheduled alert ${mins}m before "${lbl}"`,
      clearedDayAlertsToast: (day) => `Cleared Day ${day} stop alerts`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Scheduled alerts (${mins}m prior) for ${count} Day ${day} stop(s)`,
      cancelledMeetupAlertToast: (day) => `Cancelled Day ${day} evening meetup alert`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Scheduled Day ${day} evening meetup alert (${mins}m before ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `Scheduled "${title}" (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Scheduled deadline "${title}" (${badge})`,
      removedScheduledAlertToast: 'Scheduled alert removed',
      snoozedAlertToast: (mins) => `Snoozed alert for ${mins} min`,
      sentPackingPreviewToast: 'Sent pre-trip packing reminder preview',
      snoozedReminderToast: (mins) => `Snoozed reminder for ${mins} min`,
      aiWriteAllBlocked: 'All write domains for this proposal are off — nothing was applied',
      aiWriteNothingApplied: 'Nothing to apply (related write domains are disabled)',
      aiWriteSnapshotRestored: 'Restored business data from an action snapshot',
    },
    'en-GB': {
      proRestoredToast: 'Automatically restored your account-linked Trip Kit Pro membership',
      crewMemberFallback: 'Crew Member',
      selfFallback: 'Me',
      destinationFallback: 'Destination',
      packingReminderTitle: 'Trip Kit Packing Reminder',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}: ${p}${extra > 0 ? ` (+${extra} more)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Departure-morning alert: ${count} last-minute item(s) still unplugged/unpacked — pack into your cabin bag`,
      departureMorningAllPackedHeadline:
        '⏰ All departure-morning items are packed in your cabin bag',
      scheduledPackingAlertCustom: (count) =>
        `Scheduled packing reminder: ${count} item(s) left to pack (departure-morning items skipped)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Under ${hours}h until departure: ${count} item(s) left to pack (departure-morning items skipped)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Pre-trip packing reminder: ${count} item(s) left to pack (departure-morning items skipped)`,
      allNightBeforePackedHeadline:
        'Brilliant! Every night-before packing item is already packed',
      switchedTripToast: (title) => `Switched to "${title}"`,
      paywallDuplicateTrip:
        'One-tap packing template duplication is a Trip Kit Pro perk after the 30-day trial. Message the creator on WhatsApp or Facebook to claim a free 1-year Pro code.',
      duplicatedTripToast: (title) =>
        `Duplicated "${title}" checklist and switched to the new copy`,
      clearedPreviousTripToast: 'Cleared previous trip — ready to set up your new journey',
      removedTripFromBookToast: 'Removed trip from your Trip Book',
      revertedWardrobeScalingToast:
        'Reverted wardrobe auto-scaling and restored original item counts',
      autoScaledWardrobeToast: (days, count) =>
        `Auto-scaled ${count} clothing item(s) and weights for ${days} days`,
      savedSetupWithScalingToast: (title, days) =>
        `Saved "${title}" setup and auto-scaled clothing for ${days} days`,
      savedSetupPreservedToast: (title) =>
        `Saved "${title}" route & dates (checklist and ledger preserved)`,
      addedTravelerSeatToast: (name) => `Added traveller seat "${name}"`,
      removedTravelerSeatToast: 'Removed traveller seat',
      updatedMeetupToast: 'Updated evening meetup plan',
      loadedSampleTripToast: 'Loaded "Paris → Amsterdam" sample trip',
      paywallMultiTrip:
        'Your 30-day free trial has ended (1 active trip remains free). Message the creator on WhatsApp or Facebook to claim a free 1-year multi-trip Pro code.',
      addedSampleTripToast: 'Added "Paris → Amsterdam" sample trip to your Trip Book',
      createdStarterTripToast: (title) => `Created starter trip "${title}"`,
      createdSavedTripToast: (title) => `Created "${title}" and saved to Trip Book`,
      paywallExportPdf:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to export printable A4 PDF trip handbooks.',
      exportedPdfToast: (filename) =>
        `Exported A4 Handbook (cover + foldable checklist): ${filename}`,
      pdfExportFailed: 'PDF export failed',
      removedLearnedCatToast: (itemName) =>
        `Removed learned category preference for "${itemName}"`,
      clearedLearnedCatsToast: 'Cleared all learned AI category preferences',
      proPlanLifetime: 'Lifetime',
      proPlanOneYear: '1-Year Full Access',
      proRestoredPlanToast: (label) => `Restored Trip Kit Pro (${label})`,
      proRedeemedPlanToast: (label) => `Redeemed! Trip Kit Pro (${label}) is now active`,
      deactivatedProToast: 'Switched this device back to Free Trial mode',
      importedBackupToast: (count) => `Restored ${count} trip(s) and preferences`,
      fallbackTaskTitle: 'Pre-trip to-do',
      fallbackTaskTiming: 'Before departure',
      fallbackDayClustered: (d) => `Day ${d} stops clustered by walkable district.`,
      paywallAiPlanTrip:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to keep generating AI trips.',
      aiPlanTripFailed: 'Failed to generate AI trip plan',
      aiGenerationTimeout:
        'Generation took too long and was stopped. Check your connection and retry, or tap Start Offline to create a starter trip now.',
      aiNetworkInterrupted:
        'Network interrupted; one automatic retry already ran. Keep this page in the foreground on stable Wi-Fi, then retry—or tap Start Offline.',
      aiRetryingToast: 'Unstable network — retrying automatically…',
      generatedSavedTripToast: (title) => `Generated "${title}" and saved to Trip Book`,
      generationFailedKeyHint: 'Generation failed — please check server API key',
      paywallAiRegenTrip:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to regenerate routes and checklists with AI.',
      regeneratedTripToast: (title) => `Regenerated and updated "${title}"`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `Generated ${groups} categories · ${total} tailored items${
          preserved > 0 ? ` (${preserved} packed kept)` : ''
        }`,
      paywallAiPackingList:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to generate AI custom packing lists.',
      aiPackingListFailed: 'Failed to generate custom AI packing list',
      aiEmptyPackingListError:
        'AI returned an empty packing list. Please retry or use instant offline generation.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `AI built ${groups} categories · ${total} items${
          preserved > 0 ? ` (${preserved} packed kept)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Generation failed — please check server API key or use instant mode below',
      savedStayToast: (name) => `Saved accommodation "${name}"`,
      addedPackItemToast: (label, weight) =>
        `Added to packing list: ${label} (${weight})`,
      customPackingCubeFallback: 'Custom Packing Cube',
      createdCategoryToast: (title) => `Created category: "${title}"`,
      updatedCategoryToast: (title) => `Updated category "${title}"`,
      deletedCategoryToast:
        'Category deleted (existing items safely moved to first category)',
      savedItemChangesToast: (name) => `Saved changes to "${name || 'item'}"`,
      removedItemToast: (name) => (name ? `Removed "${name}"` : 'Item removed'),
      switchedItemOwnerFallback: 'Switched item owner',
      assignedItemOwnerToast: (item, owner) => `"${item}" assigned to ${owner}`,
      markedMorningDepartureToast:
        'Marked as "Pack Morning of Departure" — skipped in eve-of-flight alerts',
      unmarkedMorningDepartureToast: 'Removed "Pack Morning of Departure" flag',
      toBuyAlertTitle: (item) => `Buy before trip: ${item}`,
      toBuyAlertNote: '14-day pre-trip gear purchase reminder',
      addedToBuyToast: (item) =>
        `Added "${item}" to To-Buy with 14-day pre-trip reminder`,
      markedPurchasedToast: (item) =>
        `Marked "${item}" as purchased (reminder cleared)`,
      addedAlwaysPackToast: (item) => `Saved "${item}" to your Always Pack library`,
      removedAlwaysPackToast: (item) => `Removed "${item}" from Always Pack library`,
      removedDontSuggestToast: (name) =>
        name
          ? `Removed "${name}" — won't suggest it in future trips`
          : "Item removed and won't be suggested again",
      allAlwaysPackAlreadyToast: 'All Always Pack items are already in this trip',
      syncedAlwaysPackToast: (count) =>
        `Synced ${count} new item(s) from Always Pack library`,
      noCoreEssentialsToast: 'No core essentials matched; star any item manually',
      extractedAlwaysPackToast: (count) =>
        `Extracted ${count} core essentials to Always Pack library`,
      quickAddGearToast: (name) => `Added "${name}" to your To-Buy list`,
      movedItemRememberedToast: (grp, item) =>
        `Moved to "${grp}" — AI remembered your category preference for "${item}"`,
      paywallAiClassify:
        'Your 30-day free trial has ended (manual adding & checking remain free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI auto-sorting Pro code.',
      aiClassifyFailed: 'Failed to classify packing item',
      aiWhyFallback: 'Smart AI packing addition',
      aiNewCubeLabelFallback: 'AI Auto-Sorted Packing Cube',
      aiVoiceWhyFallback: 'Added via AI voice packing',
      aiSortedMultiToast: (count) => `AI sorted and added ${count} items`,
      personalExtrasFallback: 'Personal Extras',
      aiCreatedGroupAddedToast: (grp, lbl) => `AI created "${grp}" and added: ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `AI added to "${grp}": ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Skipped duplicate — keeping ${owner}'s "${item}"`,
      dedupGenericToast: 'Skipped duplicate item',
      previewedMorningReminderToast: 'Previewed departure-morning reminder',
      reminderRulesUpdatedToast: 'Packing reminder rules updated',
      reminderPausedToast: 'Packing reminders paused',
      notifUnsupportedToast:
        'System browser notifications are not supported here — using live in-app banners instead',
      notifGrantedToast:
        'Browser push notifications enabled for itinerary & packing alerts',
      notifDeniedToast:
        'Browser notifications not enabled — keeping live in-app banners',
      notifRestrictedToast:
        'Browser notification permission restricted — using live in-app banners',
      itineraryLeadSetToast: (mins) =>
        `Itinerary alert lead time set to ${mins} min before`,
      stopFallback: 'Stop',
      cancelledStopAlertToast: (lbl) => `Cancelled alert for "${lbl}"`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Scheduled alert ${mins}m before "${lbl}"`,
      clearedDayAlertsToast: (day) => `Cleared Day ${day} stop alerts`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Scheduled alerts (${mins}m prior) for ${count} Day ${day} stop(s)`,
      cancelledMeetupAlertToast: (day) => `Cancelled Day ${day} evening meetup alert`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Scheduled Day ${day} evening meetup alert (${mins}m before ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `Scheduled "${title}" (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Scheduled deadline "${title}" (${badge})`,
      removedScheduledAlertToast: 'Scheduled alert removed',
      snoozedAlertToast: (mins) => `Snoozed alert for ${mins} min`,
      sentPackingPreviewToast: 'Sent pre-trip packing reminder preview',
      snoozedReminderToast: (mins) => `Snoozed reminder for ${mins} min`,
      aiWriteAllBlocked: 'All write domains for this proposal are off — nothing was applied',
      aiWriteNothingApplied: 'Nothing to apply (related write domains are disabled)',
      aiWriteSnapshotRestored: 'Restored business data from an action snapshot',
    },
    'es-MX': {
      proRestoredToast: 'Se restauró automáticamente tu membresía Trip Kit Pro vinculada',
      crewMemberFallback: 'Integrante del grupo',
      selfFallback: 'Yo',
      destinationFallback: 'Destino',
      packingReminderTitle: 'Recordatorio de equipaje Trip Kit',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}: ${p}${extra > 0 ? ` (+${extra} más)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Alerta de salida matutina: quedan ${count} artículo(s) de último minuto sin guardar — ponlos en tu equipaje de mano`,
      departureMorningAllPackedHeadline:
        '⏰ Todos los artículos de la mañana de salida están en tu equipaje de mano',
      scheduledPackingAlertCustom: (count) =>
        `Recordatorio programado: faltan ${count} artículo(s) por empacar (se omiten los de última hora)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Menos de ${hours} h para salir: faltan ${count} artículo(s) por empacar (se omiten los de última hora)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Vista previa de equipaje: faltan ${count} artículo(s) por empacar (se omiten los de última hora)`,
      allNightBeforePackedHeadline:
        '¡Genial! Todo el equipaje de la víspera ya está empacado',
      switchedTripToast: (title) => `Cambiado a «${title}»`,
      paywallDuplicateTrip:
        'La duplicación en un toque es una ventaja Pro tras la prueba de 30 días. Escríbele al creador por WhatsApp o Facebook para recibir un código Pro de 1 año gratis.',
      duplicatedTripToast: (title) =>
        `Se duplicó la lista de «${title}» y se cambió a la nueva copia`,
      clearedPreviousTripToast: 'Viaje anterior borrado — listo para configurar el nuevo',
      removedTripFromBookToast: 'Viaje eliminado de tu cuaderno de viajes',
      revertedWardrobeScalingToast:
        'Se revirtió el ajuste de ropa y se restauraron las cantidades originales',
      autoScaledWardrobeToast: (days, count) =>
        `Se ajustaron ${count} prenda(s) y pesos automáticamente para ${days} días`,
      savedSetupWithScalingToast: (title, days) =>
        `Se guardó «${title}» y se ajustó la ropa para ${days} días`,
      savedSetupPreservedToast: (title) =>
        `Se guardaron ruta y fechas de «${title}» (lista y gastos intactos)`,
      addedTravelerSeatToast: (name) => `Se agregó el lugar de viajero «${name}»`,
      removedTravelerSeatToast: 'Se eliminó el lugar de viajero',
      updatedMeetupToast: 'Plan de encuentro nocturno actualizado',
      loadedSampleTripToast: 'Se cargó el viaje de muestra «París → Ámsterdam»',
      paywallMultiTrip:
        'Tu prueba gratuita de 30 días terminó (1 viaje activo sigue siendo gratis). Escríbele al creador por WhatsApp o Facebook para un código Pro de 1 año.',
      addedSampleTripToast: 'Se agregó «París → Ámsterdam» a tu cuaderno de viajes',
      createdStarterTripToast: (title) => `Se creó el viaje inicial «${title}»`,
      createdSavedTripToast: (title) => `Se creó «${title}» y se guardó en tu cuaderno`,
      paywallExportPdf:
        'Tu prueba gratuita de 30 días terminó. Pide al creador por WhatsApp o Facebook un código Pro de 1 año para exportar guías PDF A4 imprimibles.',
      exportedPdfToast: (filename) =>
        `Manual A4 exportado (portada + lista plegable): ${filename}`,
      pdfExportFailed: 'Error al exportar PDF',
      removedLearnedCatToast: (itemName) =>
        `Se eliminó la categoría recordada para «${itemName}»`,
      clearedLearnedCatsToast: 'Se borró toda la memoria de clasificación IA',
      proPlanLifetime: 'De por vida',
      proPlanOneYear: 'Acceso completo 1 año',
      proRestoredPlanToast: (label) => `Trip Kit Pro (${label}) restaurado`,
      proRedeemedPlanToast: (label) => `¡Canjeado! Trip Kit Pro (${label}) ya está activo`,
      deactivatedProToast: 'Este dispositivo volvió al modo de prueba gratuita',
      importedBackupToast: (count) => `Se restauraron ${count} viaje(s) y preferencias`,
      fallbackTaskTitle: 'Pendiente previo al viaje',
      fallbackTaskTiming: 'Antes de salir',
      fallbackDayClustered: (d) => `Día ${d}: paradas agrupadas por zona caminable.`,
      paywallAiPlanTrip:
        'Tu prueba de 30 días terminó. Pide al creador por WhatsApp o Facebook un código Pro de 1 año para seguir generando viajes con IA.',
      aiPlanTripFailed: 'Error al generar el plan con IA',
      aiGenerationTimeout:
        'La generación tardó demasiado y se detuvo. Revisa tu red e inténtalo de nuevo, o toca Iniciar sin conexión para crear un viaje básico ahora.',
      aiNetworkInterrupted:
        'La conexión se interrumpió; ya se reintentó una vez. Mantén la página en primer plano con Wi-Fi estable y vuelve a intentar, o toca Iniciar sin conexión.',
      aiRetryingToast: 'Red inestable — reintentando automáticamente…',
      generatedSavedTripToast: (title) => `Se generó «${title}» y se guardó en tu cuaderno`,
      generationFailedKeyHint: 'Error al generar — revisa la clave API del servidor',
      paywallAiRegenTrip:
        'Tu prueba de 30 días terminó. Pide al creador por WhatsApp o Facebook un código Pro de 1 año para replanificar rutas y listas con IA.',
      regeneratedTripToast: (title) => `Se regeneró y actualizó «${title}»`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `Se generaron ${groups} categorías · ${total} artículos${
          preserved > 0 ? ` (${preserved} ya empacados conservados)` : ''
        }`,
      paywallAiPackingList:
        'Tu prueba de 30 días terminó. Pide al creador por WhatsApp o Facebook un código Pro de 1 año para listas personalizadas con IA.',
      aiPackingListFailed: 'Error al generar la lista personalizada con IA',
      aiEmptyPackingListError:
        'La IA devolvió una lista vacía. Intenta de nuevo o usa el modo sin conexión.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `La IA creó ${groups} categorías · ${total} artículos${
          preserved > 0 ? ` (${preserved} empacados conservados)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Error al generar — revisa la clave API o usa el motor sin conexión abajo',
      savedStayToast: (name) => `Alojamiento «${name}» guardado`,
      addedPackItemToast: (label, weight) => `Agregado a la lista: ${label} (${weight})`,
      customPackingCubeFallback: 'Bolsa organizadora personalizada',
      createdCategoryToast: (title) => `Categoría creada: «${title}»`,
      updatedCategoryToast: (title) => `Categoría «${title}» actualizada`,
      deletedCategoryToast:
        'Categoría eliminada (artículos movidos a la primera categoría)',
      savedItemChangesToast: (name) => `Cambios guardados en «${name || 'artículo'}»`,
      removedItemToast: (name) => (name ? `Se eliminó «${name}»` : 'Artículo eliminado'),
      switchedItemOwnerFallback: 'Se cambió el responsable del artículo',
      assignedItemOwnerToast: (item, owner) => `«${item}» asignado a ${owner}`,
      markedMorningDepartureToast:
        'Marcado para la mañana de salida — se omite la noche anterior',
      unmarkedMorningDepartureToast: 'Se quitó la marca de mañana de salida',
      toBuyAlertTitle: (item) => `Comprar antes del viaje: ${item}`,
      toBuyAlertNote: 'Recordatorio de compra 14 días antes del viaje',
      addedToBuyToast: (item) =>
        `«${item}» añadido a Por comprar con aviso 14 días antes`,
      markedPurchasedToast: (item) =>
        `«${item}» marcado como comprado (aviso quitado)`,
      addedAlwaysPackToast: (item) => `«${item}» guardado en tu biblioteca Siempre llevar`,
      removedAlwaysPackToast: (item) => `«${item}» eliminado de Siempre llevar`,
      removedDontSuggestToast: (name) =>
        name
          ? `Se quitó «${name}» — no se sugerirá en próximos viajes`
          : 'Artículo quitado y no se volverá a sugerir',
      allAlwaysPackAlreadyToast:
        'Todos los artículos de Siempre llevar ya están en este viaje',
      syncedAlwaysPackToast: (count) =>
        `Se sincronizaron ${count} artículo(s) desde Siempre llevar`,
      noCoreEssentialsToast:
        'No hubo coincidencias; marca cualquier artículo con estrella',
      extractedAlwaysPackToast: (count) =>
        `Se guardaron ${count} esenciales en Siempre llevar`,
      quickAddGearToast: (name) => `«${name}» añadido a tu lista Por comprar`,
      movedItemRememberedToast: (grp, item) =>
        `Movido a «${grp}» — la IA recordó tu preferencia para «${item}»`,
      paywallAiClassify:
        'Tu prueba de 30 días terminó (agregar y marcar manualmente es gratis siempre). Pide al creador por WhatsApp o Facebook un código Pro de 1 año para ordenamiento con IA.',
      aiClassifyFailed: 'Error al clasificar el artículo',
      aiWhyFallback: 'Sugerido por clasificación inteligente IA',
      aiNewCubeLabelFallback: 'Bolsa creada por IA',
      aiVoiceWhyFallback: 'Agregado por voz con IA',
      aiSortedMultiToast: (count) => `La IA clasificó y agregó ${count} artículos`,
      personalExtrasFallback: 'Extras personales',
      aiCreatedGroupAddedToast: (grp, lbl) => `La IA creó «${grp}» y agregó: ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `La IA agregó a «${grp}»: ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Duplicado omitido — se conserva «${item}» de ${owner}`,
      dedupGenericToast: 'Artículo duplicado omitido',
      previewedMorningReminderToast: 'Vista previa de recordatorio matutino enviada',
      reminderRulesUpdatedToast: 'Reglas de recordatorio actualizadas',
      reminderPausedToast: 'Recordatorios de equipaje pausados',
      notifUnsupportedToast:
        'Notificaciones del navegador no compatibles — se usarán avisos en la app',
      notifGrantedToast:
        'Notificaciones activadas para alertas de itinerario y equipaje',
      notifDeniedToast:
        'Notificaciones no activadas — se mantienen avisos en la app',
      notifRestrictedToast:
        'Permiso de notificaciones restringido — se usarán avisos en la app',
      itineraryLeadSetToast: (mins) =>
        `Antelación de alertas fijada en ${mins} min antes`,
      stopFallback: 'Parada',
      cancelledStopAlertToast: (lbl) => `Alerta cancelada para «${lbl}»`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Alerta programada ${mins} min antes de «${lbl}»`,
      clearedDayAlertsToast: (day) => `Alertas del Día ${day} borradas`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Alertas programadas (${mins} min antes) para ${count} parada(s) del Día ${day}`,
      cancelledMeetupAlertToast: (day) =>
        `Alerta del encuentro nocturno del Día ${day} cancelada`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Alerta de encuentro Día ${day} programada (${mins} min antes de ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `Programado «${title}» (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Fecha límite «${title}» programada (${badge})`,
      removedScheduledAlertToast: 'Alerta programada eliminada',
      snoozedAlertToast: (mins) => `Alerta pospuesta ${mins} min`,
      sentPackingPreviewToast: 'Vista previa de recordatorio enviada',
      snoozedReminderToast: (mins) => `Recordatorio pospuesto ${mins} min`,
      aiWriteAllBlocked: 'Todos los permisos de esta propuesta están off — no se aplicó nada',
      aiWriteNothingApplied: 'Nada que aplicar (dominios de escritura desactivados)',
      aiWriteSnapshotRestored: 'Datos restaurados desde una instantánea de acciones',
    },
    'fr-FR': {
      proRestoredToast: 'Abonnement Trip Kit Pro lié au compte restauré automatiquement',
      crewMemberFallback: 'Compagnon',
      selfFallback: 'Moi',
      destinationFallback: 'Destination',
      packingReminderTitle: 'Rappel bagages Trip Kit',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h} : ${p}${extra > 0 ? ` (+${extra} autres)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Alerte matin du départ : ${count} article(s) de dernière minute non rangé(s) — mettez-les en bagage cabine`,
      departureMorningAllPackedHeadline:
        '⏰ Tous les articles du matin du départ sont en bagage cabine',
      scheduledPackingAlertCustom: (count) =>
        `Rappel programmé : ${count} article(s) à ranger (articles du matin ignorés)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Moins de ${hours} h avant le départ : ${count} article(s) à ranger (articles du matin ignorés)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Aperçu rappel bagages : ${count} article(s) à ranger (articles du matin ignorés)`,
      allNightBeforePackedHeadline:
        'Parfait ! Tous les bagages de la veille sont prêts',
      switchedTripToast: (title) => `Basculé vers « ${title} »`,
      paywallDuplicateTrip:
        'La duplication en un clic est réservée à Trip Kit Pro après l’essai de 30 jours. Écrivez au créateur sur WhatsApp ou Facebook pour un code Pro 1 an gratuit.',
      duplicatedTripToast: (title) =>
        `Liste « ${title} » dupliquée et ouverte sur la nouvelle copie`,
      clearedPreviousTripToast: 'Ancien voyage effacé — prêt pour votre nouvel itinéraire',
      removedTripFromBookToast: 'Voyage retiré de votre carnet',
      revertedWardrobeScalingToast:
        'Ajustement automatique annulé et quantités d’origine restaurées',
      autoScaledWardrobeToast: (days, count) =>
        `${count} vêtement(s) et poids ajustés pour ${days} jours`,
      savedSetupWithScalingToast: (title, days) =>
        `Paramètres « ${title} » enregistrés et vêtements ajustés pour ${days} jours`,
      savedSetupPreservedToast: (title) =>
        `Itinéraire et dates « ${title} » enregistrés (liste et budget conservés)`,
      addedTravelerSeatToast: (name) => `Place voyageur « ${name} » ajoutée`,
      removedTravelerSeatToast: 'Place voyageur retirée',
      updatedMeetupToast: 'Point de rendez-vous du soir mis à jour',
      loadedSampleTripToast: 'Voyage exemple « Paris → Amsterdam » chargé',
      paywallMultiTrip:
        'Essai gratuit de 30 jours terminé (1 voyage actif reste gratuit). Contactez le créateur sur WhatsApp ou Facebook pour un code Pro multi-voyages 1 an gratuit.',
      addedSampleTripToast: 'Voyage « Paris → Amsterdam » ajouté à votre carnet',
      createdStarterTripToast: (title) => `Voyage initial « ${title} » créé`,
      createdSavedTripToast: (title) => `« ${title} » créé et enregistré au carnet`,
      paywallExportPdf:
        'Essai gratuit de 30 jours terminé. Demandez un code Pro 1 an gratuit sur WhatsApp ou Facebook pour exporter vos carnets PDF A4.',
      exportedPdfToast: (filename) =>
        `Carnet A4 exporté (couverture + liste pliable) : ${filename}`,
      pdfExportFailed: 'Échec de l’export PDF',
      removedLearnedCatToast: (itemName) =>
        `Préférence de catégorie supprimée pour « ${itemName} »`,
      clearedLearnedCatsToast: 'Toutes les préférences IA effacées',
      proPlanLifetime: 'À vie',
      proPlanOneYear: 'Accès complet 1 an',
      proRestoredPlanToast: (label) => `Trip Kit Pro (${label}) restauré`,
      proRedeemedPlanToast: (label) => `Activé ! Trip Kit Pro (${label}) est actif`,
      deactivatedProToast: 'Appareil repassé en mode essai gratuit',
      importedBackupToast: (count) => `${count} voyage(s) et préférences restaurés`,
      fallbackTaskTitle: 'Tâche avant départ',
      fallbackTaskTiming: 'Avant le départ',
      fallbackDayClustered: (d) => `Jour ${d} : étapes regroupées par quartier.`,
      paywallAiPlanTrip:
        'Essai gratuit de 30 jours terminé. Contactez le créateur sur WhatsApp ou Facebook pour un code Pro 1 an gratuit.',
      aiPlanTripFailed: 'Échec de génération du voyage par l’IA',
      aiGenerationTimeout:
        'La génération a pris trop de temps et a été arrêtée. Vérifiez le réseau puis réessayez, ou appuyez sur Démarrer hors ligne pour créer un voyage de base.',
      aiNetworkInterrupted:
        'Connexion interrompue ; une nouvelle tentative a déjà eu lieu. Gardez la page au premier plan en Wi-Fi stable, puis réessayez—ou démarrez hors ligne.',
      aiRetryingToast: 'Réseau instable — nouvelle tentative…',
      generatedSavedTripToast: (title) => `« ${title} » généré et enregistré`,
      generationFailedKeyHint: 'Échec — vérifiez la clé API serveur',
      paywallAiRegenTrip:
        'Essai gratuit de 30 jours terminé. Demandez un code Pro 1 an sur WhatsApp ou Facebook pour replanifier avec l’IA.',
      regeneratedTripToast: (title) => `« ${title} » régénéré et mis à jour`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `${groups} catégories · ${total} articles générés${
          preserved > 0 ? ` (${preserved} cochés conservés)` : ''
        }`,
      paywallAiPackingList:
        'Essai gratuit de 30 jours terminé. Demandez un code Pro 1 an sur WhatsApp ou Facebook pour les listes IA sur mesure.',
      aiPackingListFailed: 'Échec de génération de la liste IA',
      aiEmptyPackingListError:
        'L’IA a renvoyé une liste vide. Réessayez ou utilisez le moteur hors ligne.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `IA : ${groups} catégories · ${total} articles${
          preserved > 0 ? ` (${preserved} cochés conservés)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Échec — vérifiez la clé API ou utilisez le mode hors ligne ci-dessous',
      savedStayToast: (name) => `Hébergement « ${name} » enregistré`,
      addedPackItemToast: (label, weight) => `Ajouté à la liste : ${label} (${weight})`,
      customPackingCubeFallback: 'Trousse personnalisée',
      createdCategoryToast: (title) => `Catégorie créée : « ${title} »`,
      updatedCategoryToast: (title) => `Catégorie « ${title} » mise à jour`,
      deletedCategoryToast:
        'Catégorie supprimée (articles déplacés vers la première catégorie)',
      savedItemChangesToast: (name) => `Modifications enregistrées pour « ${name || 'article'} »`,
      removedItemToast: (name) => (name ? `« ${name} » retiré` : 'Article retiré'),
      switchedItemOwnerFallback: 'Propriétaire de l’article modifié',
      assignedItemOwnerToast: (item, owner) => `« ${item} » assigné à ${owner}`,
      markedMorningDepartureToast:
        'Marqué « Matin du départ » — ignoré la veille du vol',
      unmarkedMorningDepartureToast: 'Indicateur « Matin du départ » retiré',
      toBuyAlertTitle: (item) => `À acheter avant le départ : ${item}`,
      toBuyAlertNote: 'Rappel d’achat 14 jours avant le départ',
      addedToBuyToast: (item) => `« ${item} » ajouté aux achats (rappel J-14)`,
      markedPurchasedToast: (item) => `« ${item} » marqué acheté (rappel retiré)`,
      addedAlwaysPackToast: (item) => `« ${item} » ajouté à Toujours emporter`,
      removedAlwaysPackToast: (item) => `« ${item} » retiré de Toujours emporter`,
      removedDontSuggestToast: (name) =>
        name
          ? `« ${name} » retiré — ne sera plus suggéré`
          : 'Article retiré et masqué des suggestions',
      allAlwaysPackAlreadyToast:
        'Tous les articles Toujours emporter sont déjà dans ce voyage',
      syncedAlwaysPackToast: (count) =>
        `${count} article(s) synchronisés depuis Toujours emporter`,
      noCoreEssentialsToast:
        'Aucun essentiel détecté ; mettez une étoile manuellement',
      extractedAlwaysPackToast: (count) =>
        `${count} essentiels enregistrés dans Toujours emporter`,
      quickAddGearToast: (name) => `« ${name} » ajouté à la liste d’achats`,
      movedItemRememberedToast: (grp, item) =>
        `Déplacé vers « ${grp} » — préférence mémorisée pour « ${item} »`,
      paywallAiClassify:
        'Essai de 30 jours terminé (ajout et coche manuels gratuits à vie). Demandez un code Pro 1 an sur WhatsApp ou Facebook pour le tri automatique IA.',
      aiClassifyFailed: 'Échec du classement automatique',
      aiWhyFallback: 'Ajout intelligent suggéré par l’IA',
      aiNewCubeLabelFallback: 'Trousse créée par l’IA',
      aiVoiceWhyFallback: 'Ajouté par dictée vocale IA',
      aiSortedMultiToast: (count) => `L’IA a classé et ajouté ${count} articles`,
      personalExtrasFallback: 'Extras personnels',
      aiCreatedGroupAddedToast: (grp, lbl) => `L’IA a créé « ${grp} » et ajouté : ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `L’IA a ajouté à « ${grp} » : ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Doublon ignoré — « ${item} » de ${owner} conservé`,
      dedupGenericToast: 'Doublon ignoré',
      previewedMorningReminderToast: 'Aperçu du rappel du matin envoyé',
      reminderRulesUpdatedToast: 'Règles de rappel mises à jour',
      reminderPausedToast: 'Rappels bagages en pause',
      notifUnsupportedToast:
        'Notifications système non prises en charge — bannières intégrées actives',
      notifGrantedToast:
        'Notifications activées pour les alertes d’itinéraire et bagages',
      notifDeniedToast:
        'Notifications non activées — bannières intégrées conservées',
      notifRestrictedToast:
        'Permission notifications restreinte — bannières intégrées actives',
      itineraryLeadSetToast: (mins) =>
        `Délai d’alerte itinéraire réglé à ${mins} min avant`,
      stopFallback: 'Étape',
      cancelledStopAlertToast: (lbl) => `Alerte annulée pour « ${lbl} »`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Alerte programmée ${mins} min avant « ${lbl} »`,
      clearedDayAlertsToast: (day) => `Alertes du Jour ${day} effacées`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Alertes programmées (${mins} min avant) pour ${count} étape(s) du Jour ${day}`,
      cancelledMeetupAlertToast: (day) => `Alerte rendez-vous Jour ${day} annulée`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Alerte rendez-vous Jour ${day} programmée (${mins} min avant ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `« ${title} » programmé (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Échéance « ${title} » programmée (${badge})`,
      removedScheduledAlertToast: 'Alerte programmée supprimée',
      snoozedAlertToast: (mins) => `Alerte reportée de ${mins} min`,
      sentPackingPreviewToast: 'Aperçu du rappel bagages envoyé',
      snoozedReminderToast: (mins) => `Rappel reporté de ${mins} min`,
      aiWriteAllBlocked: 'Tous les droits d’écriture de cette proposition sont off — rien n’a été appliqué',
      aiWriteNothingApplied: 'Rien à appliquer (domaines d’écriture désactivés)',
      aiWriteSnapshotRestored: 'Données restaurées depuis un instantané d’actions',
    },
    'de-DE': {
      proRestoredToast: 'Verknüpfte Trip Kit Pro-Mitgliedschaft automatisch wiederhergestellt',
      crewMemberFallback: 'Mitreisende:r',
      selfFallback: 'Ich',
      destinationFallback: 'Reiseziel',
      packingReminderTitle: 'Trip Kit Packerinnerung',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}: ${p}${extra > 0 ? ` (+${extra} weitere)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Abreisemorgen-Hinweis: ${count} Last-Minute-Teil(e) noch nicht eingepackt — ab ins Handgepäck`,
      departureMorningAllPackedHeadline:
        '⏰ Alle Abreisemorgen-Teile sind im Handgepäck',
      scheduledPackingAlertCustom: (count) =>
        `Geplante Erinnerung: noch ${count} Teil(e) einzupacken (Abreisemorgen-Teile übersprungen)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Unter ${hours} Std. bis Abreise: noch ${count} Teil(e) einzupacken (Abreisemorgen-Teile übersprungen)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Vorschau Packerinnerung: noch ${count} Teil(e) einzupacken`,
      allNightBeforePackedHeadline:
        'Super! Alle Vorabend-Sachen sind bereits gepackt',
      switchedTripToast: (title) => `Zu „${title}“ gewechselt`,
      paywallDuplicateTrip:
        'Duplizieren per Klick ist nach der 30-Tage-Testphase Teil von Trip Kit Pro. Schreib dem Entwickler auf WhatsApp oder Facebook für einen kostenlosen 1-Jahres-Code.',
      duplicatedTripToast: (title) =>
        `Checkliste „${title}“ dupliziert und zur Kopie gewechselt`,
      clearedPreviousTripToast: 'Alte Reise geleert — bereit für deine neue Reise',
      removedTripFromBookToast: 'Reise aus dem Reisebuch entfernt',
      revertedWardrobeScalingToast:
        'Automatische Kleidungsanpassung zurückgesetzt',
      autoScaledWardrobeToast: (days, count) =>
        `${count} Kleidungsstück(e) & Gewichte für ${days} Tage skaliert`,
      savedSetupWithScalingToast: (title, days) =>
        `„${title}“ gespeichert & Kleidung für ${days} Tage angepasst`,
      savedSetupPreservedToast: (title) =>
        `Route & Daten für „${title}“ gespeichert (Liste & Budget erhalten)`,
      addedTravelerSeatToast: (name) => `Reiseplatz „${name}“ hinzugefügt`,
      removedTravelerSeatToast: 'Reiseplatz entfernt',
      updatedMeetupToast: 'Abend-Treffpunkt aktualisiert',
      loadedSampleTripToast: 'Beispielreise „Paris → Amsterdam“ geladen',
      paywallMultiTrip:
        '30-Tage-Testphase beendet (1 aktive Reise bleibt kostenlos). Kontaktiere den Entwickler auf WhatsApp oder Facebook für einen kostenlosen 1-Jahres-Pro-Code.',
      addedSampleTripToast: 'Beispielreise „Paris → Amsterdam“ zum Reisebuch hinzugefügt',
      createdStarterTripToast: (title) => `Startreise „${title}“ erstellt`,
      createdSavedTripToast: (title) => `„${title}“ erstellt und im Reisebuch gespeichert`,
      paywallExportPdf:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp oder Facebook einen kostenlosen 1-Jahres-Pro-Code für druckbare A4-PDF-Handbücher.',
      exportedPdfToast: (filename) =>
        `A4-Handbuch exportiert (Cover + Falt-Checkliste): ${filename}`,
      pdfExportFailed: 'PDF-Export fehlgeschlagen',
      removedLearnedCatToast: (itemName) =>
        `Gelernte Kategorie für „${itemName}“ entfernt`,
      clearedLearnedCatsToast: 'Alle gelernten KI-Kategorien gelöscht',
      proPlanLifetime: 'Lebenslang',
      proPlanOneYear: '1 Jahr Vollzugriff',
      proRestoredPlanToast: (label) => `Trip Kit Pro (${label}) wiederhergestellt`,
      proRedeemedPlanToast: (label) => `Eingelöst! Trip Kit Pro (${label}) ist aktiv`,
      deactivatedProToast: 'Gerät zurück in den kostenlosen Testmodus gesetzt',
      importedBackupToast: (count) =>
        `${count} Reise(n) & Einstellungen wiederhergestellt`,
      fallbackTaskTitle: 'Reise-Aufgabe',
      fallbackTaskTiming: 'Vor Abreise',
      fallbackDayClustered: (d) => `Tag ${d}: Stopps nach Vierteln gruppiert.`,
      paywallAiPlanTrip:
        '30-Tage-Testphase beendet. Frag per WhatsApp oder Facebook nach einem kostenlosen 1-Jahres-Pro-Code für KI-Reiseplanung.',
      aiPlanTripFailed: 'KI-Reiseplanung fehlgeschlagen',
      aiGenerationTimeout:
        'Die Generierung dauerte zu lange und wurde gestoppt. Prüfe die Verbindung und versuche es erneut, oder tippe auf Offline starten für eine Basisreise.',
      aiNetworkInterrupted:
        'Netzwerk unterbrochen; ein automatischer Retry lief bereits. Seite im Vordergrund lassen, stabiles WLAN nutzen und erneut versuchen—oder Offline starten.',
      aiRetryingToast: 'Netz instabil — automatischer Retry…',
      generatedSavedTripToast: (title) => `„${title}“ generiert und gespeichert`,
      generationFailedKeyHint: 'Generierung fehlgeschlagen — Server-API-Key prüfen',
      paywallAiRegenTrip:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp oder Facebook einen kostenlosen 1-Jahres-Pro-Code für KI-Neuplanung.',
      regeneratedTripToast: (title) => `„${title}“ neu generiert und aktualisiert`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `${groups} Kategorien · ${total} Artikel erstellt${
          preserved > 0 ? ` (${preserved} gepackte behalten)` : ''
        }`,
      paywallAiPackingList:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp oder Facebook einen 1-Jahres-Pro-Code für individuelle KI-Packlisten.',
      aiPackingListFailed: 'KI-Packliste fehlgeschlagen',
      aiEmptyPackingListError:
        'KI lieferte eine leere Liste. Bitte erneut versuchen oder Offline-Engine nutzen.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `KI: ${groups} Kategorien · ${total} Artikel${
          preserved > 0 ? ` (${preserved} gepackte behalten)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Fehler — API-Key prüfen oder unten den Offline-Modus nutzen',
      savedStayToast: (name) => `Unterkunft „${name}“ gespeichert`,
      addedPackItemToast: (label, weight) => `Zur Packliste hinzugefügt: ${label} (${weight})`,
      customPackingCubeFallback: 'Eigener Packwürfel',
      createdCategoryToast: (title) => `Kategorie erstellt: „${title}“`,
      updatedCategoryToast: (title) => `Kategorie „${title}“ aktualisiert`,
      deletedCategoryToast:
        'Kategorie gelöscht (Artikel sicher in erste Kategorie verschoben)',
      savedItemChangesToast: (name) => `Änderungen an „${name || 'Artikel'}“ gespeichert`,
      removedItemToast: (name) => (name ? `„${name}“ entfernt` : 'Artikel entfernt'),
      switchedItemOwnerFallback: 'Besitzer gewechselt',
      assignedItemOwnerToast: (item, owner) => `„${item}“ zugewiesen an ${owner}`,
      markedMorningDepartureToast:
        'Als „Abreisemorgen“ markiert — wird am Vorabend übersprungen',
      unmarkedMorningDepartureToast: '„Abreisemorgen“-Markierung entfernt',
      toBuyAlertTitle: (item) => `Vor Reise kaufen: ${item}`,
      toBuyAlertNote: 'Automatische Kauferinnerung 14 Tage vor Abreise',
      addedToBuyToast: (item) =>
        `„${item}“ zur Einkaufsliste hinzugefügt (14-Tage-Erinnerung)`,
      markedPurchasedToast: (item) =>
        `„${item}“ als gekauft markiert (Erinnerung entfernt)`,
      addedAlwaysPackToast: (item) => `„${item}“ in Immer-dabei-Bibliothek gespeichert`,
      removedAlwaysPackToast: (item) => `„${item}“ aus Immer-dabei entfernt`,
      removedDontSuggestToast: (name) =>
        name
          ? `„${name}“ entfernt — wird künftig nicht mehr vorgeschlagen`
          : 'Artikel entfernt & künftig ausgeblendet',
      allAlwaysPackAlreadyToast:
        'Alle Immer-dabei-Artikel sind bereits in dieser Reise',
      syncedAlwaysPackToast: (count) =>
        `${count} Artikel aus Immer-dabei synchronisiert`,
      noCoreEssentialsToast:
        'Keine Basis-Artikel erkannt; markiere Artikel manuell mit Stern',
      extractedAlwaysPackToast: (count) =>
        `${count} Basis-Artikel in Immer-dabei gespeichert`,
      quickAddGearToast: (name) => `„${name}“ zur Einkaufsliste hinzugefügt`,
      movedItemRememberedToast: (grp, item) =>
        `In „${grp}“ verschoben — KI merkt sich Kategorie für „${item}“`,
      paywallAiClassify:
        '30-Tage-Testphase beendet (manuelles Hinzufügen bleibt kostenlos). Hol dir per WhatsApp/Facebook einen 1-Jahres-Pro-Code für KI-Sortierung.',
      aiClassifyFailed: 'KI-Sortierung fehlgeschlagen',
      aiWhyFallback: 'Von KI intelligent ergänzt',
      aiNewCubeLabelFallback: 'KI-Packwürfel',
      aiVoiceWhyFallback: 'Per KI-Spracheingabe ergänzt',
      aiSortedMultiToast: (count) => `KI hat ${count} Artikel sortiert & ergänzt`,
      personalExtrasFallback: 'Persönliche Extras',
      aiCreatedGroupAddedToast: (grp, lbl) => `KI erstellte „${grp}“ & fügte hinzu: ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `KI fügte zu „${grp}“ hinzu: ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Duplikat übersprungen — „${item}“ von ${owner} behalten`,
      dedupGenericToast: 'Duplikat übersprungen',
      previewedMorningReminderToast: 'Abreisemorgen-Vorschau gesendet',
      reminderRulesUpdatedToast: 'Erinnerungsregeln aktualisiert',
      reminderPausedToast: 'Packerinnerungen pausiert',
      notifUnsupportedToast:
        'Browser-Benachrichtigungen nicht unterstützt — In-App-Banner aktiv',
      notifGrantedToast:
        'Browser-Benachrichtigungen für Route & Packliste aktiviert',
      notifDeniedToast:
        'Browser-Benachrichtigungen deaktiviert — In-App-Banner bleiben aktiv',
      notifRestrictedToast:
        'Benachrichtigungsrecht eingeschränkt — In-App-Banner aktiv',
      itineraryLeadSetToast: (mins) =>
        `Vorlaufzeit für Routen-Alerts auf ${mins} Min. gesetzt`,
      stopFallback: 'Stopp',
      cancelledStopAlertToast: (lbl) => `Alert für „${lbl}“ abgebrochen`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Alert ${mins} Min. vor „${lbl}“ geplant`,
      clearedDayAlertsToast: (day) => `Alle Tag-${day}-Stopp-Alerts gelöscht`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Alerts (${mins} Min. vorher) für ${count} Tag-${day}-Stopp(s) geplant`,
      cancelledMeetupAlertToast: (day) => `Tag-${day}-Treffpunkt-Alert abgebrochen`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Tag-${day}-Treffpunkt-Alert geplant (${mins} Min. vor ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `„${title}“ geplant (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Frist „${title}“ geplant (${badge})`,
      removedScheduledAlertToast: 'Geplanter Alert entfernt',
      snoozedAlertToast: (mins) => `Alert um ${mins} Min. verschoben`,
      sentPackingPreviewToast: 'Packerinnerung-Vorschau gesendet',
      snoozedReminderToast: (mins) => `Erinnerung um ${mins} Min. verschoben`,
      aiWriteAllBlocked: 'Alle Schreibrechte für diesen Vorschlag sind aus — nichts übernommen',
      aiWriteNothingApplied: 'Nichts anzuwenden (Schreibdomänen deaktiviert)',
      aiWriteSnapshotRestored: 'Geschäftsdaten aus Aktions-Snapshot wiederhergestellt',
    },
    'pt-BR': {
      proRestoredToast: 'Assinatura Trip Kit Pro vinculada restaurada automaticamente',
      crewMemberFallback: 'Integrante',
      selfFallback: 'Eu',
      destinationFallback: 'Destino',
      packingReminderTitle: 'Lembrete de bagagem Trip Kit',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}: ${p}${extra > 0 ? ` (+${extra} itens)` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ Alerta da manhã de saída: ${count} item(ns) de última hora pendentes — coloque na bagagem de mão`,
      departureMorningAllPackedHeadline:
        '⏰ Todos os itens da manhã de saída estão na bagagem de mão',
      scheduledPackingAlertCustom: (count) =>
        `Lembrete programado: faltam ${count} item(ns) (itens da manhã ignorados)`,
      scheduledPackingAlertLead: (hours, count) =>
        `Menos de ${hours}h para partir: faltam ${count} item(ns) (itens da manhã ignorados)`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `Prévia de lembrete: faltam ${count} item(ns) para arrumar`,
      allNightBeforePackedHeadline:
        'Ótimo! Todos os itens da véspera já estão prontos',
      switchedTripToast: (title) => `Alterado para “${title}”`,
      paywallDuplicateTrip:
        'A duplicação em 1 toque faz parte do Trip Kit Pro após os 30 dias grátis. Fale com o criador no WhatsApp ou Facebook para ganhar 1 ano Pro grátis.',
      duplicatedTripToast: (title) =>
        `Lista de “${title}” duplicada e aberta na nova cópia`,
      clearedPreviousTripToast: 'Viagem anterior limpa — pronto para configurar a nova',
      removedTripFromBookToast: 'Viagem removida do seu caderno',
      revertedWardrobeScalingToast:
        'Ajuste de roupas revertido para as quantidades originais',
      autoScaledWardrobeToast: (days, count) =>
        `${count} peça(s) e pesos ajustados para ${days} dias`,
      savedSetupWithScalingToast: (title, days) =>
        `“${title}” salvo e roupas ajustadas para ${days} dias`,
      savedSetupPreservedToast: (title) =>
        `Rota e datas de “${title}” salvas (lista e gastos preservados)`,
      addedTravelerSeatToast: (name) => `Assento de viajante “${name}” adicionado`,
      removedTravelerSeatToast: 'Assento de viajante removido',
      updatedMeetupToast: 'Ponto de encontro noturno atualizado',
      loadedSampleTripToast: 'Viagem exemplo “Paris → Amsterdã” carregada',
      paywallMultiTrip:
        'Seu teste de 30 dias terminou (1 viagem ativa segue grátis). Fale com o criador no WhatsApp ou Facebook para 1 ano Pro multi-viagem grátis.',
      addedSampleTripToast: '“Paris → Amsterdã” adicionado ao caderno de viagens',
      createdStarterTripToast: (title) => `Viagem inicial “${title}” criada`,
      createdSavedTripToast: (title) => `“${title}” criada e salva no caderno`,
      paywallExportPdf:
        'Seu teste de 30 dias terminou. Peça ao criador no WhatsApp ou Facebook um código Pro de 1 ano para exportar manuais PDF A4.',
      exportedPdfToast: (filename) =>
        `Manual A4 exportado (capa + checklist dobrável): ${filename}`,
      pdfExportFailed: 'Falha ao exportar PDF',
      removedLearnedCatToast: (itemName) =>
        `Categoria aprendida removida para “${itemName}”`,
      clearedLearnedCatsToast: 'Toda memória de categorias da IA foi limpa',
      proPlanLifetime: 'Vitalício',
      proPlanOneYear: '1 Ano Completo',
      proRestoredPlanToast: (label) => `Trip Kit Pro (${label}) restaurado`,
      proRedeemedPlanToast: (label) => `Resgatado! Trip Kit Pro (${label}) ativo`,
      deactivatedProToast: 'Dispositivo voltou ao modo de teste grátis',
      importedBackupToast: (count) => `${count} viagem(ns) e preferências restauradas`,
      fallbackTaskTitle: 'Tarefa pré-viagem',
      fallbackTaskTiming: 'Antes de partir',
      fallbackDayClustered: (d) => `Dia ${d}: paradas agrupadas por região.`,
      paywallAiPlanTrip:
        'Seu teste de 30 dias terminou. Peça ao criador no WhatsApp ou Facebook um código Pro de 1 ano para continuar gerando viagens com IA.',
      aiPlanTripFailed: 'Falha ao gerar plano com IA',
      aiGenerationTimeout:
        'A geração demorou demais e foi interrompida. Verifique a rede e tente de novo, ou toque em Iniciar offline para criar uma viagem básica agora.',
      aiNetworkInterrupted:
        'A conexão caiu; já houve uma nova tentativa automática. Mantenha a página em primeiro plano no Wi-Fi estável e tente novamente—ou inicie offline.',
      aiRetryingToast: 'Rede instável — tentando novamente…',
      generatedSavedTripToast: (title) => `“${title}” gerado e salvo no caderno`,
      generationFailedKeyHint: 'Falha ao gerar — verifique a chave API do servidor',
      paywallAiRegenTrip:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro grátis no WhatsApp ou Facebook para replanejar rotas com IA.',
      regeneratedTripToast: (title) => `“${title}” regerado e atualizado`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `${groups} categorias · ${total} itens gerados${
          preserved > 0 ? ` (${preserved} prontos mantidos)` : ''
        }`,
      paywallAiPackingList:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro grátis no WhatsApp ou Facebook para listas personalizadas com IA.',
      aiPackingListFailed: 'Falha ao gerar lista personalizada com IA',
      aiEmptyPackingListError:
        'A IA retornou uma lista vazia. Tente novamente ou use o modo offline.',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `IA gerou ${groups} categorias · ${total} itens${
          preserved > 0 ? ` (${preserved} prontos mantidos)` : ''
        }`,
      aiPackingFailedKeyHint:
        'Falha — verifique a chave API ou use o modo instantâneo abaixo',
      savedStayToast: (name) => `Hospedagem “${name}” salva`,
      addedPackItemToast: (label, weight) => `Adicionado à mala: ${label} (${weight})`,
      customPackingCubeFallback: 'Organizador personalizado',
      createdCategoryToast: (title) => `Categoria criada: “${title}”`,
      updatedCategoryToast: (title) => `Categoria “${title}” atualizada`,
      deletedCategoryToast:
        'Categoria excluída (itens movidos para a primeira categoria)',
      savedItemChangesToast: (name) => `Alterações em “${name || 'item'}” salvas`,
      removedItemToast: (name) => (name ? `“${name}” removido` : 'Item removido'),
      switchedItemOwnerFallback: 'Responsável pelo item alterado',
      assignedItemOwnerToast: (item, owner) => `“${item}” atribuído a ${owner}`,
      markedMorningDepartureToast:
        'Marcado para manhã da saída — ignorado na véspera',
      unmarkedMorningDepartureToast: 'Marca de manhã da saída removida',
      toBuyAlertTitle: (item) => `Comprar antes da viagem: ${item}`,
      toBuyAlertNote: 'Lembrete de compra 14 dias antes da viagem',
      addedToBuyToast: (item) => `“${item}” adicionado a Comprar (aviso D-14)`,
      markedPurchasedToast: (item) =>
        `“${item}” marcado como comprado (lembrete removido)`,
      addedAlwaysPackToast: (item) => `“${item}” salvo em Sempre levar`,
      removedAlwaysPackToast: (item) => `“${item}” removido de Sempre levar`,
      removedDontSuggestToast: (name) =>
        name
          ? `“${name}” removido — não será sugerido novamente`
          : 'Item removido e não será mais sugerido',
      allAlwaysPackAlreadyToast: 'Todos os itens de Sempre levar já estão nesta viagem',
      syncedAlwaysPackToast: (count) =>
        `${count} item(ns) sincronizado(s) de Sempre levar`,
      noCoreEssentialsToast:
        'Nenhum essencial detectado; marque com estrela manualmente',
      extractedAlwaysPackToast: (count) =>
        `${count} itens essenciais salvos em Sempre levar`,
      quickAddGearToast: (name) => `“${name}” adicionado à lista de compras`,
      movedItemRememberedToast: (grp, item) =>
        `Movido para “${grp}” — IA lembrou sua preferência para “${item}”`,
      paywallAiClassify:
        'Seu teste de 30 dias terminou (adicionar manualmente segue grátis). Peça 1 ano Pro grátis no WhatsApp ou Facebook para classificação automática com IA.',
      aiClassifyFailed: 'Falha ao classificar item',
      aiWhyFallback: 'Adição inteligente sugerida pela IA',
      aiNewCubeLabelFallback: 'Organizador criado pela IA',
      aiVoiceWhyFallback: 'Adicionado por voz com IA',
      aiSortedMultiToast: (count) => `IA classificou e adicionou ${count} itens`,
      personalExtrasFallback: 'Extras pessoais',
      aiCreatedGroupAddedToast: (grp, lbl) => `IA criou “${grp}” e adicionou: ${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `IA adicionou em “${grp}”: ${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `Duplicata ignorada — mantendo “${item}” de ${owner}`,
      dedupGenericToast: 'Item duplicado ignorado',
      previewedMorningReminderToast: 'Prévia do alerta matutino enviada',
      reminderRulesUpdatedToast: 'Regras de lembrete atualizadas',
      reminderPausedToast: 'Lembretes de bagagem pausados',
      notifUnsupportedToast:
        'Notificações do navegador indisponíveis — usando avisos no app',
      notifGrantedToast:
        'Notificações push ativadas para alertas de roteiro e mala',
      notifDeniedToast:
        'Notificações não ativadas — mantendo avisos no app',
      notifRestrictedToast:
        'Permissão de notificação restrita — usando avisos no app',
      itineraryLeadSetToast: (mins) =>
        `Antecedência dos alertas definida para ${mins} min`,
      stopFallback: 'Parada',
      cancelledStopAlertToast: (lbl) => `Alerta cancelado para “${lbl}”`,
      scheduledStopAlertToast: (mins, lbl) =>
        `Alerta agendado ${mins} min antes de “${lbl}”`,
      clearedDayAlertsToast: (day) => `Alertas do Dia ${day} removidos`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Alertas agendados (${mins} min antes) para ${count} parada(s) do Dia ${day}`,
      cancelledMeetupAlertToast: (day) =>
        `Alerta de encontro do Dia ${day} cancelado`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Alerta de encontro Dia ${day} agendado (${mins} min antes de ${time})`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `Agendado “${title}” (${badge})`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `Prazo “${title}” agendado (${badge})`,
      removedScheduledAlertToast: 'Alerta agendado removido',
      snoozedAlertToast: (mins) => `Alerta adiado por ${mins} min`,
      sentPackingPreviewToast: 'Prévia do lembrete de bagagem enviada',
      snoozedReminderToast: (mins) => `Lembrete adiado por ${mins} min`,
      aiWriteAllBlocked: 'Todos os domínios desta proposta estão off — nada foi aplicado',
      aiWriteNothingApplied: 'Nada a aplicar (domínios de escrita desativados)',
      aiWriteSnapshotRestored: 'Dados restaurados a partir de um snapshot de ações',
    },
    'ja-JP': {
      proRestoredToast: 'アカウント連携済みの Trip Kit Pro 権利を自動復元しました',
      crewMemberFallback: '同行メンバー',
      selfFallback: '自分',
      destinationFallback: '目的地',
      packingReminderTitle: 'Trip Kit 持ち物リマインダー',
      reminderHeadlineWithItems: (h, p, extra) =>
        `${h}：${p}${extra > 0 ? ` ほか ${extra} 点` : ''}`,
      departureMorningAlertHeadline: (count) =>
        `⏰ 出発当日の朝リマインダー：あと ${count} 点の直前アイテムが未収納です（機内持ち込みへ）`,
      departureMorningAllPackedHeadline:
        '⏰ 出発当日の朝アイテムはすべて機内持ち込みバッグに収納済みです',
      scheduledPackingAlertCustom: (count) =>
        `設定時刻のお知らせ：残り ${count} 点が未収納です（出発当日アイテムを除く）`,
      scheduledPackingAlertLead: (hours, count) =>
        `出発まで残り ${hours} 時間未満：あと ${count} 点が未収納です（出発当日アイテムを除く）`,
      preTripPackingReminderPreviewHeadline: (count) =>
        `出発前パッキング確認：あと ${count} 点が未収納です（出発当日アイテムを除く）`,
      allNightBeforePackedHeadline:
        '完璧です！前日までに詰めるアイテムはすべて完了しています',
      switchedTripToast: (title) => `「${title}」に切り替えました`,
      paywallDuplicateTrip:
        '30 日間の無料トライアル終了後は Pro 特典となります。WhatsApp または Facebook で開発者に連絡すると 1 年無料 Pro コードを取得できます。',
      duplicatedTripToast: (title) =>
        `「${title}」の構成を複製し、新しい旅行に切り替えました`,
      clearedPreviousTripToast: '以前の旅行をリセットしました。新しい旅を作成してください',
      removedTripFromBookToast: '旅行ブックから削除しました',
      revertedWardrobeScalingToast: '衣類枚数の自動調整を元に戻しました',
      autoScaledWardrobeToast: (days, count) =>
        `${days} 日間に合わせて ${count} 点の衣類枚数と重量を自動調整しました`,
      savedSetupWithScalingToast: (title, days) =>
        `「${title}」を保存し、${days} 日間分の衣類数量を調整しました`,
      savedSetupPreservedToast: (title) =>
        `「${title}」の日程とルートを保存しました（リスト・家計簿は保持）`,
      addedTravelerSeatToast: (name) => `同行者枠「${name}」を追加しました`,
      removedTravelerSeatToast: '同行者枠を削除しました',
      updatedMeetupToast: '夜の集合予定を更新しました',
      loadedSampleTripToast: 'サンプル旅行「パリ → アムステルダム」を読み込みました',
      paywallMultiTrip:
        '30 日間の無料トライアルが終了しました（1 件の旅行は無料のままです）。WhatsApp または Facebook で 1 年無料 Pro コードを取得できます。',
      addedSampleTripToast: '「パリ → アムステルダム」を旅行ブックに追加しました',
      createdStarterTripToast: (title) => `スターター旅行「${title}」を作成しました`,
      createdSavedTripToast: (title) => `「${title}」を作成して旅行ブックに保存しました`,
      paywallExportPdf:
        '30 日間の無料トライアルが終了しました。WhatsApp または Facebook で 1 年無料 Pro コードを取得すると A4 PDF ハンドブックを出力できます。',
      exportedPdfToast: (filename) =>
        `A4 ハンドブック（表紙＋折りたたみチェックリスト）を出力：${filename}`,
      pdfExportFailed: 'PDF 出力に失敗しました',
      removedLearnedCatToast: (itemName) =>
        `「${itemName}」の自動分類メモリを削除しました`,
      clearedLearnedCatsToast: 'AI の分類学習履歴をすべてリセットしました',
      proPlanLifetime: '永久ライセンス',
      proPlanOneYear: '1 年間フルアクセス',
      proRestoredPlanToast: (label) => `Trip Kit Pro（${label}）を復元しました`,
      proRedeemedPlanToast: (label) => `有効化完了！Trip Kit Pro（${label}）が利用可能です`,
      deactivatedProToast: 'この端末を無料トライアル状態に戻しました',
      importedBackupToast: (count) => `${count} 件の旅行と設定を復元しました`,
      fallbackTaskTitle: '出発前タスク',
      fallbackTaskTiming: '出発前',
      fallbackDayClustered: (d) => `Day ${d}：徒歩圏のエリアごとに最適化しました。`,
      paywallAiPlanTrip:
        '30 日間の無料トライアルが終了しました。WhatsApp または Facebook で 1 年無料 Pro コードを取得すると AI 旅行生成を続けられます。',
      aiPlanTripFailed: 'AI 旅行プランの生成に失敗しました',
      aiGenerationTimeout:
        '生成に時間がかかりすぎたため待機を停止しました。通信を確認して再試行するか、「オフラインで即時作成」で基礎プランを作成してください。',
      aiNetworkInterrupted:
        '通信が途切れました（自動再試行は1回済み）。ページを前面に保ち、安定した Wi-Fi で再試行するか、「オフラインで即時作成」をご利用ください。',
      aiRetryingToast: '通信が不安定です。自動で再試行中…',
      generatedSavedTripToast: (title) =>
        `「${title}」を生成して旅行ブックに保存しました`,
      generationFailedKeyHint: '生成に失敗しました — サーバー API キーを確認してください',
      paywallAiRegenTrip:
        '30 日間の無料トライアルが終了しました。WhatsApp または Facebook で 1 年無料 Pro コードを取得すると AI 再計画が使えます。',
      regeneratedTripToast: (title) => `「${title}」を再生成して更新しました`,
      generatedOfflinePackingToast: (groups, total, preserved) =>
        `${groups} カテゴリ・計 ${total} 点の持ち物を生成しました${
          preserved > 0 ? `（完了済み ${preserved} 点を保持）` : ''
        }`,
      paywallAiPackingList:
        '30 日間の無料トライアルが終了しました。WhatsApp または Facebook で 1 年無料 Pro コードを取得すると AI カスタム生成が使えます。',
      aiPackingListFailed: 'AI パッキングリストの生成に失敗しました',
      aiEmptyPackingListError:
        'AI が空のリストを返しました。再試行するか下のオフライン生成をお使いください。',
      aiBuiltPackingToast: (groups, total, preserved) =>
        `AI が ${groups} カテゴリ・計 ${total} 点を作成${
          preserved > 0 ? `（完了済み ${preserved} 点を保持）` : ''
        }`,
      aiPackingFailedKeyHint:
        '生成に失敗しました — API キーを確認するか下の即時エンジンをご利用ください',
      savedStayToast: (name) => `宿泊先「${name}」を登録しました`,
      addedPackItemToast: (label, weight) => `リストに追加：${label}（${weight}）`,
      customPackingCubeFallback: 'カスタム収納ポーチ',
      createdCategoryToast: (title) => `カテゴリを作成：「${title}」`,
      updatedCategoryToast: (title) => `カテゴリ「${title}」を更新しました`,
      deletedCategoryToast: 'カテゴリを削除しました（持ち物は最初のカテゴリへ移動）',
      savedItemChangesToast: (name) => `「${name || 'アイテム'}」の変更を保存しました`,
      removedItemToast: (name) =>
        name ? `「${name}」を削除しました` : 'アイテムを削除しました',
      switchedItemOwnerFallback: '担当者を切り替えました',
      assignedItemOwnerToast: (item, owner) => `「${item}」を ${owner} に割り当てました`,
      markedMorningDepartureToast:
        '「出発当日の朝」に設定しました（前夜のアラート対象外）',
      unmarkedMorningDepartureToast: '「出発当日の朝」の指定を解除しました',
      toBuyAlertTitle: (item) => `出発前の購入予定：${item}`,
      toBuyAlertNote: '出発 14 日前の購入リマインダー',
      addedToBuyToast: (item) =>
        `「${item}」を購入予定に追加（出発 14 日前に通知）`,
      markedPurchasedToast: (item) =>
        `「${item}」を購入済みにしました（通知を解除）`,
      addedAlwaysPackToast: (item) => `「${item}」を定番アイテム庫に保存しました`,
      removedAlwaysPackToast: (item) => `「${item}」を定番アイテム庫から外しました`,
      removedDontSuggestToast: (name) =>
        name
          ? `「${name}」を削除しました — 今後の旅行では提案されません`
          : '削除しました — 今後は提案されません',
      allAlwaysPackAlreadyToast: '定番アイテムはすべて現在の旅行に含まれています',
      syncedAlwaysPackToast: (count) =>
        `定番アイテム庫から ${count} 件を同期追加しました`,
      noCoreEssentialsToast:
        '必須の定番項目が見つかりませんでした。個別に星印を付けてください',
      extractedAlwaysPackToast: (count) =>
        `${count} 件の基本アイテムを定番庫に抽出保存しました`,
      quickAddGearToast: (name) => `「${name}」を購入予定に追加しました`,
      movedItemRememberedToast: (grp, item) =>
        `「${grp}」に移動 — 「${item}」の分類好みを記憶しました`,
      paywallAiClassify:
        '30 日間の無料トライアルが終了しました（手動追加は永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI 自動仕分けが使えます。',
      aiClassifyFailed: 'AI 自動仕分けに失敗しました',
      aiWhyFallback: 'AI による持ち物提案',
      aiNewCubeLabelFallback: 'AI 自動作成ポーチ',
      aiVoiceWhyFallback: 'AI 音声入力で追加',
      aiSortedMultiToast: (count) => `AI が ${count} 件の持ち物を分類・追加しました`,
      personalExtrasFallback: '個人追加アイテム',
      aiCreatedGroupAddedToast: (grp, lbl) => `AI が「${grp}」を作成して追加：${lbl}`,
      aiAddedToGroupToast: (grp, lbl) => `AI が「${grp}」に追加：${lbl}`,
      dedupKeepingToast: (owner, item) =>
        `重複をスキップ — ${owner} の「${item}」を保持しました`,
      dedupGenericToast: '重複アイテムをスキップしました',
      previewedMorningReminderToast: '出発当日の朝リマインダーをプレビューしました',
      reminderRulesUpdatedToast: 'パッキング通知ルールを更新しました',
      reminderPausedToast: 'パッキング通知を一時停止しました',
      notifUnsupportedToast:
        'この環境ではシステム通知非対応のため、アプリ内バナーで通知します',
      notifGrantedToast: 'ブラウザ通知を有効にしました（旅程・パッキング対応）',
      notifDeniedToast: '通知はオフのまま、アプリ内バナーでお知らせします',
      notifRestrictedToast: '通知権限が制限されているため、アプリ内バナーを使用します',
      itineraryLeadSetToast: (mins) => `行程アラートの事前通知を ${mins} 分前に設定`,
      stopFallback: 'スポット',
      cancelledStopAlertToast: (lbl) => `「${lbl}」のアラートを解除しました`,
      scheduledStopAlertToast: (mins, lbl) =>
        `「${lbl}」の ${mins} 分前アラートを予約しました`,
      clearedDayAlertsToast: (day) => `Day ${day} の全スポット通知を解除しました`,
      scheduledDayAlertsToast: (mins, count, day) =>
        `Day ${day} の未訪問 ${count} スポットに ${mins} 分前通知を設定しました`,
      cancelledMeetupAlertToast: (day) => `Day ${day} の集合アラートを解除しました`,
      scheduledMeetupAlertToast: (day, mins, time) =>
        `Day ${day} の集合アラートを予約（${time} の ${mins} 分前）`,
      scheduledCustomItinAlertToast: (title, badge) =>
        `行程アラート「${title}」を予約（${badge}）`,
      scheduledCustomPackAlertToast: (title, badge) =>
        `締切アラート「${title}」を予約（${badge}）`,
      removedScheduledAlertToast: '予約アラートを削除しました',
      snoozedAlertToast: (mins) => `アラートを ${mins} 分延期しました`,
      sentPackingPreviewToast: '出発前通知のプレビューを送信しました',
      snoozedReminderToast: (mins) => `リマインダーを ${mins} 分延期しました`,
      aiWriteAllBlocked: 'この提案の書き込み権限はすべてオフのため、何も適用しませんでした',
      aiWriteNothingApplied: '適用できる変更がありません（関連権限がオフ）',
      aiWriteSnapshotRestored: '操作スナップショットから業務データを復元しました',
    },
  });
}

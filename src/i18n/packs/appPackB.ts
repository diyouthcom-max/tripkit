import type { AppLanguage } from '../../types';
import { pickLang } from '../langHelper';

export interface AppPackBCopy {
  taskDuringTripFallback: string;
  addedTaskToast: (title: string) => string;
  updatedTaskToast: (title?: string) => string;
  removedTaskToast: (title?: string) => string;
  switchedTaskAssigneeFallback: string;
  assignedTaskToast: (taskTitle: string, memberName: string) => string;
  paywallAiParseTasks: string;
  aiParseTasksFailed: string;
  aiNoTasksDetected: string;
  aiAddedOneTaskToast: (title: string) => string;
  aiAddedMultiTasksToast: (count: number) => string;
  savedSmartBagPlanToast: string;
  resetItemSmartBagToast: (itemName?: string) => string;
  pinnedItemSmartBagToast: (itemName: string | undefined, bagLabel: string) => string;
  restoredSmartBagRulesToast: string;
  paywallAiGapCheck: string;
  paywallAiGapCheckQuota: (limit: number) => string;
  aiGapCheckFailed: string;
  aiGapWhyFallback: string;
  aiGapGroupFallback: string;
  aiGapSummaryFallback: string;
  batchAddedMissingToast: (count: number) => string;
  companionFallback: string;
  bucketShopping: string;
  bucketPrepaid: string;
  bucketDaily: string;
  loggedExpenseToast: (bucketLabel: string, title: string, amountText: string) => string;
  paywallAiParseExpense: string;
  aiParseExpenseFailed: string;
  expenseTitleFallback: string;
  paywallAiCopilot: string;
  failedReadReceiptError: string;
  aiCopilotFailed: string;
  extrasGroupFallback: string;
  aiCopilotWhyFallback: string;
  walkOrTransitFallback: string;
  localLanguageFallback: string;
  aiCopilotReplyFallback: string;
  appliedPartExpenses: (count: number) => string;
  appliedPartPacking: (count: number) => string;
  appliedPartTasks: (count: number) => string;
  appliedPartTrimmedAndAdded: (trimmed: number, added: number) => string;
  appliedPartTrimmed: (trimmed: number) => string;
  appliedPartAddedStops: (added: number) => string;
  appliedPartRainPlan: (day: number) => string;
  appliedPartSunnyRoute: (day: number) => string;
  appliedProposalToast: (summary: string) => string;
  checkedInStopToast: (title: string) => string;
  unmarkedStopToast: (title: string) => string;
  stopLogNote: (district: string, day: number) => string;
  addedAnchorStopToast: (title: string) => string;
  addedDayStopToast: (title: string, day: number) => string;
  updatedAnchorStopToast: (title: string) => string;
  updatedStopToast: (title: string) => string;
  deletedStopToast: (title: string) => string;
  movedStopOrderToast: (title: string, indexNum: number, timeSuffix: string) => string;
  restoredDayOrderToast: (day: number) => string;
  movedToWishlistToast: (title: string) => string;
  addedToWishlistToast: (item: string) => string;
  paywallAiOptimize: string;
  optimizeFailed: string;
  optimizedReclusterToast: (day: number) => string;
  optimizedGenerateDayToast: (day: number, city: string) => string;
  optimizedDelayToast: (day: number, mins: number) => string;
  optimizedInsertWishlistToast: (item: string, day: number) => string;
  adjustItineraryFailed: string;
  paywallAiFullItinerary: string;
  fullItineraryFailed: string;
  aiNoStopsReturned: string;
  fullItineraryDaySummary: (day: number) => string;
  plannedFullItineraryToast: (totalDays: number) => string;
  paywallAiSmartReorder: string;
  needTwoUnvisitedStopsToast: string;
  smartReorderFailed: string;
  smartReorderOverallSummary: (count: number, totalDays: number) => string;
  smartReorderedToast: (count: number, totalDays: number) => string;
  undidSmartReorderToast: string;
  paywallLocalCard: string;
  localCardFailed: string;
  updatedExpenseReopenedToast: (title: string) => string;
  updatedExpenseRecalcToast: (title: string) => string;
  deletedExpenseUnlinkedToast: (title: string) => string;
  deletedExpenseRolledBackToast: (title: string) => string;
  vatStatusUpdatedToast: (label: string) => string;
  budgetLimitsSavedToast: string;
  walletCash: string;
  walletCard: string;
  walletToppedUpToast: (acctName: string, amountStr: string) => string;
  walletCalibratedToast: (acctName: string) => string;
  convertedGroupSplitToast: (count: number) => string;
  converted5050SplitToast: string;
  convertedRatioSplitToast: (mePct: number, partnerPct: number) => string;
  settledUpToast: string;
  bannerViewStop: string;
  bannerOpenPacking: string;
  bannerSnooze15m: string;
  displayCurrencySetToast: (label: string) => string;
  paywallCreateCloudRoom: string;
}

export function getAppPackBCopy(lang: AppLanguage): AppPackBCopy {
  return pickLang<AppPackBCopy>(lang, {
    'zh-CN': {
      taskDuringTripFallback: '旅行期间',
      addedTaskToast: (title) => `已添加旅行事务：${title}`,
      updatedTaskToast: (title) => `已更新事务「${title || '待办事项'}」`,
      removedTaskToast: (title) =>
        title ? `已移除事务「${title}」` : '已移除该旅行事务',
      switchedTaskAssigneeFallback: '已切换事务负责人',
      assignedTaskToast: (t, m) => `「${t}」已交由 ${m} 跟进`,
      paywallAiParseTasks:
        '30 天免费体验期已满：手动添加待办永久免费；添加主理人 WhatsApp 或 Facebook 即可免费领 1 年 AI 智能拆解事务权限。',
      aiParseTasksFailed: 'AI 解析旅行事务失败',
      aiNoTasksDetected: '未识别出具体旅行事务，请换个说法试试',
      aiAddedOneTaskToast: (t) => `AI 已添加旅行事务：${t}`,
      aiAddedMultiTasksToast: (n) => `AI 已智能拆分并添加 ${n} 项旅行事务`,
      savedSmartBagPlanToast: 'AI 9 袋分包方案与装箱建议已自动保存',
      resetItemSmartBagToast: (n) => `已将「${n || '物品'}」恢复为按品类自动归袋`,
      pinnedItemSmartBagToast: (n, bag) =>
        `已将「${n || '物品'}」固定至「${bag}」（刷新保持不变）`,
      restoredSmartBagRulesToast: '已恢复默认智能 9 袋分包规则',
      paywallAiGapCheck:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续使用 AI 查漏补缺诊断。',
      paywallAiGapCheckQuota: (limit) =>
        `免费赠送的 ${limit} 次「AI 查漏补缺」体验已用完；联系主理人 WhatsApp 或 Facebook 即可免费申领 1 年无限次 Pro 授权码。`,
      aiGapCheckFailed: 'AI 查漏补缺诊断失败',
      aiGapWhyFallback: '结合当前行程与天气建议补充',
      aiGapGroupFallback: '其他补充',
      aiGapSummaryFallback: '已交叉比对当前行程动线、降雨预报与离境退税规则',
      batchAddedMissingToast: (n) => `已一键补入 ${n} 件查漏补缺物品`,
      companionFallback: '同行伙伴',
      bucketShopping: '大额购物',
      bucketPrepaid: '交通住宿',
      bucketDaily: '日常食行',
      loggedExpenseToast: (bucket, title, amt) =>
        `已记入「${bucket}」：${title} (${amt})`,
      paywallAiParseExpense:
        '30 天免费体验期已满：手动记账与 AA 结清永久免费；添加主理人 WhatsApp 或 Facebook 即可免费申领 1 年 AI 小票/语音记账权限。',
      aiParseExpenseFailed: '账单识别失败',
      expenseTitleFallback: '消费记录',
      paywallAiCopilot:
        '30 天免费体验期已满：你的既有清单与账单数据永久保留；添加主理人 WhatsApp 或 Facebook 即可免费续期 1 年 AI 随行助手与全套 Pro 功能。',
      failedReadReceiptError: '读取小票图片失败',
      aiCopilotFailed: 'AI 随行助手处理失败',
      extrasGroupFallback: '其他补充',
      aiCopilotWhyFallback: 'AI 随行助手建议补充',
      walkOrTransitFallback: '顺路步行或公共交通前往',
      localLanguageFallback: '当地语言',
      aiCopilotReplyFallback: '已为你整理好建议。',
      appliedPartExpenses: (n) => `${n} 笔账单`,
      appliedPartPacking: (n) => `${n} 项行李`,
      appliedPartTasks: (n) => `${n} 项待办`,
      appliedPartTrimmedAndAdded: (rm, add) => `精简 ${rm} 站并新增 ${add} 站`,
      appliedPartTrimmed: (rm) => `已为行程精简 ${rm} 站`,
      appliedPartAddedStops: (add) => `新增 ${add} 个行程站点`,
      appliedPartRainPlan: (d) => `Day ${d} 防雨室内预案`,
      appliedPartSunnyRoute: (d) => `恢复 Day ${d} 户外动线`,
      appliedProposalToast: (s) => `已应用到行程：${s}`,
      checkedInStopToast: (t) => `已打卡「${t}」`,
      unmarkedStopToast: (t) => `已取消「${t}」打卡状态`,
      stopLogNote: (dist, day) => `${dist} · Day ${day} 行程站点入账`,
      addedAnchorStopToast: (t) => `已新增晚间汇合锚点「${t}」并同步至同行页`,
      addedDayStopToast: (t, d) => `已将「${t}」加入 Day ${d} 行程`,
      updatedAnchorStopToast: (t) => `已更新「${t}」并同步同行晚间汇合锚点`,
      updatedStopToast: (t) => `已保存「${t}」站点修改`,
      deletedStopToast: (t) => `已从行程移除「${t}」`,
      movedStopOrderToast: (t, idx, slot) => `已将「${t}」移至第 ${idx} 站${slot}`,
      restoredDayOrderToast: (d) => `已将 Day ${d} 还原为顺路优化前的站点顺序`,
      movedToWishlistToast: (t) => `已将「${t}」暂存回机动愿望清单`,
      addedToWishlistToast: (it) => `已加入愿望清单：${it}`,
      paywallAiOptimize:
        '30 天免费体验期已满：手动编辑站点永久免费；添加主理人 WhatsApp 或 Facebook 即可免费申领 1 年 AI 动线聚类与顺路重排权限。',
      optimizeFailed: '行程优化失败',
      optimizedReclusterToast: (d) => `已完成 Day ${d} 空间动线重排`,
      optimizedGenerateDayToast: (d, city) => `已生成 Day ${d} (${city}) 顺路行程`,
      optimizedDelayToast: (d, m) => `Day ${d} 已整体顺延 +${m} 分钟并同步晚间锚点`,
      optimizedInsertWishlistToast: (it, d) => `已将「${it}」顺路排入 Day ${d}`,
      adjustItineraryFailed: '行程调整失败',
      paywallAiFullItinerary:
        '30 天免费体验期已满：手动编辑站点永久免费；添加主理人 WhatsApp 或 Facebook 即可免费申领 1 年 AI 全行程智能规划权限。',
      fullItineraryFailed: 'AI 全行程规划失败',
      aiNoStopsReturned: 'AI 未返回有效日程节点，请重试',
      fullItineraryDaySummary: (d) => `Day ${d} 已按预算档位与街区顺路原则编排完毕。`,
      plannedFullItineraryToast: (days) =>
        `已按预算智能规划 D1–D${days} 全部行程（含景点、酒店与交通）`,
      paywallAiSmartReorder:
        '30 天免费体验期已满：手动拖拽排序永久免费；添加主理人 WhatsApp 或 Facebook 即可免费申领 1 年 AI 智能路线重排权限。',
      needTwoUnvisitedStopsToast: '至少需要 2 个未到访站点才能执行智能重排',
      smartReorderFailed: 'AI 智能重排顺序失败',
      smartReorderOverallSummary: (cnt, days) =>
        `已结合地理距离与营业时间对 Day 1–Day ${days} 共 ${cnt} 个未到访站点完成顺路重排。`,
      smartReorderedToast: (cnt, days) =>
        `已完成 D1–D${days} 共 ${cnt} 个未到访站点的最优路线重排`,
      undidSmartReorderToast: '已恢复至智能重排前的全部站点顺序与时间轴',
      paywallLocalCard:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可继续生成当地语言问路与沟通卡。',
      localCardFailed: '生成沟通卡失败',
      updatedExpenseReopenedToast: (t) =>
        `已更新「${t}」，因金额或分摊比例变动已重新纳入待结清净额`,
      updatedExpenseRecalcToast: (t) => `已更新「${t}」，钱包余额与分账已同步重算`,
      deletedExpenseUnlinkedToast: (t) =>
        `已删除「${t}」，钱包回滚且行程站点恢复待入账`,
      deletedExpenseRolledBackToast: (t) =>
        `已删除「${t}」，对应钱包与分账差额已自动回滚`,
      vatStatusUpdatedToast: (lbl) => `退税单进度已更新为「${lbl}」`,
      budgetLimitsSavedToast: '整趟预算分配与汇率设置已更新，结转已实时重算',
      walletCash: '现金钱包',
      walletCard: '信用卡额度',
      walletToppedUpToast: (acct, amt) => `${acct}已补充 +${amt}`,
      walletCalibratedToast: (acct) => `${acct}已校准更新`,
      convertedGroupSplitToast: (n) => `已转为 ${n} 人均摊并更新净额`,
      converted5050SplitToast: '已转为双方 50:50 均摊并更新净额',
      convertedRatioSplitToast: (me, partner) =>
        `已转为按比例分摊（我 ${me}% : 同行 ${partner}%）并更新净额`,
      settledUpToast: '双方同行账目已结清归零，并已生成历史结清记录',
      bannerViewStop: '查看行程',
      bannerOpenPacking: '查看清单',
      bannerSnooze15m: '延后 15 分钟',
      displayCurrencySetToast: (lbl) => `汇总参考币种已切换为 ${lbl}`,
      paywallCreateCloudRoom:
        '30 天免费体验期已满：添加主理人 WhatsApp 或 Facebook 免费申领 1 年授权码，即可开启新的云端多人实时协作房间。',
    },
    'en-US': {
      taskDuringTripFallback: 'During trip',
      addedTaskToast: (title) => `Added pre-trip to-do: ${title}`,
      updatedTaskToast: (title) => `Updated to-do "${title || 'task'}"`,
      removedTaskToast: (title) =>
        title ? `Removed to-do "${title}"` : 'Removed travel to-do',
      switchedTaskAssigneeFallback: 'Switched task assignee',
      assignedTaskToast: (t, m) => `Assigned "${t}" to ${m}`,
      paywallAiParseTasks:
        'Your 30-day free trial has ended (manual to-dos remain free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI task-parsing Pro code.',
      aiParseTasksFailed: 'Failed to parse travel to-dos',
      aiNoTasksDetected:
        'Could not detect a specific travel to-do — please rephrase and try again',
      aiAddedOneTaskToast: (t) => `AI added travel to-do: ${t}`,
      aiAddedMultiTasksToast: (n) => `AI parsed and added ${n} travel to-dos`,
      savedSmartBagPlanToast: 'Saved AI 9-bag allocation plan and suitcase packing tip',
      resetItemSmartBagToast: (n) =>
        `Reset "${n || 'item'}" to automatic bag assignment`,
      pinnedItemSmartBagToast: (n, bag) =>
        `Pinned "${n || 'item'}" to "${bag}"`,
      restoredSmartBagRulesToast: 'Restored default smart 9-bag rules',
      paywallAiGapCheck:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to continue using AI Gap Check.',
      paywallAiGapCheckQuota: (limit) =>
        `You've used all ${limit} complimentary AI Gap Checks. Message the creator on WhatsApp or Facebook to claim a free 1-year unlimited Pro code.`,
      aiGapCheckFailed: 'AI Gap Check failed',
      aiGapWhyFallback: 'Recommended based on your planned stops and forecast',
      aiGapGroupFallback: 'Daypack & Extras',
      aiGapSummaryFallback:
        'Cross-checked your itinerary stops, rain forecast, and departure tax-refund rules.',
      batchAddedMissingToast: (n) => `Added ${n} suggested item(s) to your checklist`,
      companionFallback: 'Companion',
      bucketShopping: 'Shopping',
      bucketPrepaid: 'Prepaid',
      bucketDaily: 'Daily Spend',
      loggedExpenseToast: (bucket, title, amt) =>
        `Logged under "${bucket}": ${title} (${amt})`,
      paywallAiParseExpense:
        'Your 30-day free trial has ended (manual expense logging & splitting stay free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI receipt/voice Pro code.',
      aiParseExpenseFailed: 'Failed to parse expense',
      expenseTitleFallback: 'Expense',
      paywallAiCopilot:
        'Your 30-day free trial has ended (your checklists and ledger stay saved forever). Message the creator on WhatsApp or Facebook for a free 1-year AI Copilot & Pro code.',
      failedReadReceiptError: 'Failed to read receipt image',
      aiCopilotFailed: 'AI Copilot failed to process request',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Suggested by AI Copilot',
      walkOrTransitFallback: 'Walk or local transit',
      localLanguageFallback: 'Local Language',
      aiCopilotReplyFallback: 'All set!',
      appliedPartExpenses: (n) => `${n} expense(s)`,
      appliedPartPacking: (n) => `${n} packing item(s)`,
      appliedPartTasks: (n) => `${n} to-do(s)`,
      appliedPartTrimmedAndAdded: (rm, add) => `trimmed ${rm} & added ${add} stop(s)`,
      appliedPartTrimmed: (rm) => `trimmed ${rm} stop(s)`,
      appliedPartAddedStops: (add) => `added ${add} itinerary stop(s)`,
      appliedPartRainPlan: (d) => `Day ${d} indoor rain plan`,
      appliedPartSunnyRoute: (d) => `Day ${d} sunny outdoor route`,
      appliedProposalToast: (s) => `Applied: ${s}`,
      checkedInStopToast: (t) => `Checked in at "${t}"`,
      unmarkedStopToast: (t) => `Unmarked "${t}" check-in`,
      stopLogNote: (dist, day) => `${dist} · Day ${day} stop log`,
      addedAnchorStopToast: (t) => `Added evening meetup anchor "${t}"`,
      addedDayStopToast: (t, d) => `Added "${t}" to Day ${d}`,
      updatedAnchorStopToast: (t) =>
        `Updated "${t}" and synced evening meetup anchor`,
      updatedStopToast: (t) => `Saved changes to "${t}"`,
      deletedStopToast: (t) => `Removed "${t}" from itinerary`,
      movedStopOrderToast: (t, idx, slot) => `Moved "${t}" to Stop #${idx}${slot}`,
      restoredDayOrderToast: (d) =>
        `Restored Day ${d} to its pre-optimization stop order`,
      movedToWishlistToast: (t) => `Moved "${t}" back to your flexible wishlist`,
      addedToWishlistToast: (it) => `Added to wishlist: ${it}`,
      paywallAiOptimize:
        'Your 30-day free trial has ended (manual stop editing stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI route clustering Pro code.',
      optimizeFailed: 'Failed to optimize itinerary',
      optimizedReclusterToast: (d) => `Optimized Day ${d} spatial route`,
      optimizedGenerateDayToast: (d, city) =>
        `Generated Day ${d} (${city}) walkable itinerary`,
      optimizedDelayToast: (d, m) =>
        `Shifted Day ${d} by +${m} min and synced evening anchor`,
      optimizedInsertWishlistToast: (it, d) => `Inserted "${it}" into Day ${d}`,
      adjustItineraryFailed: 'Failed to adjust itinerary',
      paywallAiFullItinerary:
        'Your 30-day free trial has ended (manual stop editing stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI full-itinerary Pro code.',
      fullItineraryFailed: 'Failed to generate full itinerary',
      aiNoStopsReturned: 'AI did not return valid itinerary stops — please try again',
      fullItineraryDaySummary: (d) =>
        `Day ${d} arranged by budget tier and walkable districts.`,
      plannedFullItineraryToast: (days) =>
        `Planned full D1–D${days} itinerary (sights, stays & transit)`,
      paywallAiSmartReorder:
        'Your 30-day free trial has ended (manual drag reordering stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI smart route reorder Pro code.',
      needTwoUnvisitedStopsToast: 'Need at least 2 unvisited stops to smart-reorder',
      smartReorderFailed: 'Failed to smart-reorder itinerary',
      smartReorderOverallSummary: (cnt, days) =>
        `Sequenced ${cnt} unvisited stops across Day 1–Day ${days} by proximity and opening hours.`,
      smartReorderedToast: (cnt, days) =>
        `Smart-reordered ${cnt} unvisited stops across D1–D${days}`,
      undidSmartReorderToast:
        'Restored D1–DX itinerary to its order before Smart Reorder',
      paywallLocalCard:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to generate local phrase & taxi cards.',
      localCardFailed: 'Failed to generate phrase card',
      updatedExpenseReopenedToast: (t) =>
        `Updated "${t}" — reopened settled bill so changed split balance is tracked`,
      updatedExpenseRecalcToast: (t) =>
        `Updated "${t}" — wallet balances and split recalculated`,
      deletedExpenseUnlinkedToast: (t) =>
        `Deleted "${t}" — wallet rolled back and stop restored to unlogged`,
      deletedExpenseRolledBackToast: (t) =>
        `Deleted "${t}" — wallet and split balance rolled back`,
      vatStatusUpdatedToast: (lbl) => `Tax-free status updated to "${lbl}"`,
      budgetLimitsSavedToast: 'Overall trip budget & FX settings saved',
      walletCash: 'Cash Wallet',
      walletCard: 'Credit Card',
      walletToppedUpToast: (acct, amt) => `${acct} topped up +${amt}`,
      walletCalibratedToast: (acct) => `${acct} balance calibrated`,
      convertedGroupSplitToast: (n) =>
        `Converted to ${n}-way equal split and updated net balance`,
      converted5050SplitToast: 'Converted to 50:50 split and updated net balance',
      convertedRatioSplitToast: (me, partner) =>
        `Converted to custom split (Me ${me}% : Companion ${partner}%)`,
      settledUpToast:
        'Shared balance settled to zero and logged in settlement history',
      bannerViewStop: 'View Stop',
      bannerOpenPacking: 'Open Packing',
      bannerSnooze15m: 'Snooze 15m',
      displayCurrencySetToast: (lbl) => `Display currency set to ${lbl}`,
      paywallCreateCloudRoom:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to create new live cloud sync rooms.',
    },
    'en-GB': {
      taskDuringTripFallback: 'During trip',
      addedTaskToast: (title) => `Added pre-trip to-do: ${title}`,
      updatedTaskToast: (title) => `Updated to-do "${title || 'task'}"`,
      removedTaskToast: (title) =>
        title ? `Removed to-do "${title}"` : 'Removed travel to-do',
      switchedTaskAssigneeFallback: 'Switched task assignee',
      assignedTaskToast: (t, m) => `Assigned "${t}" to ${m}`,
      paywallAiParseTasks:
        'Your 30-day free trial has ended (manual to-dos remain free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI task-parsing Pro code.',
      aiParseTasksFailed: 'Failed to parse travel to-dos',
      aiNoTasksDetected:
        'Could not detect a specific travel to-do — please rephrase and try again',
      aiAddedOneTaskToast: (t) => `AI added travel to-do: ${t}`,
      aiAddedMultiTasksToast: (n) => `AI parsed and added ${n} travel to-dos`,
      savedSmartBagPlanToast: 'Saved AI 9-bag allocation plan and suitcase packing tip',
      resetItemSmartBagToast: (n) =>
        `Reset "${n || 'item'}" to automatic bag assignment`,
      pinnedItemSmartBagToast: (n, bag) =>
        `Pinned "${n || 'item'}" to "${bag}"`,
      restoredSmartBagRulesToast: 'Restored default smart 9-bag rules',
      paywallAiGapCheck:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to continue using AI Gap Check.',
      paywallAiGapCheckQuota: (limit) =>
        `You've used all ${limit} complimentary AI Gap Checks. Message the creator on WhatsApp or Facebook to claim a free 1-year unlimited Pro code.`,
      aiGapCheckFailed: 'AI Gap Check failed',
      aiGapWhyFallback: 'Recommended based on your planned stops and forecast',
      aiGapGroupFallback: 'Daypack & Extras',
      aiGapSummaryFallback:
        'Cross-checked your itinerary stops, rain forecast, and departure VAT refund rules.',
      batchAddedMissingToast: (n) => `Added ${n} suggested item(s) to your checklist`,
      companionFallback: 'Companion',
      bucketShopping: 'Shopping',
      bucketPrepaid: 'Prepaid',
      bucketDaily: 'Daily Spend',
      loggedExpenseToast: (bucket, title, amt) =>
        `Logged under "${bucket}": ${title} (${amt})`,
      paywallAiParseExpense:
        'Your 30-day free trial has ended (manual expense logging & splitting stay free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI receipt/voice Pro code.',
      aiParseExpenseFailed: 'Failed to parse expense',
      expenseTitleFallback: 'Expense',
      paywallAiCopilot:
        'Your 30-day free trial has ended (your checklists and ledger stay saved forever). Message the creator on WhatsApp or Facebook for a free 1-year AI Copilot & Pro code.',
      failedReadReceiptError: 'Failed to read receipt image',
      aiCopilotFailed: 'AI Copilot failed to process request',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Suggested by AI Copilot',
      walkOrTransitFallback: 'Walk or local transit',
      localLanguageFallback: 'Local Language',
      aiCopilotReplyFallback: 'All set!',
      appliedPartExpenses: (n) => `${n} expense(s)`,
      appliedPartPacking: (n) => `${n} packing item(s)`,
      appliedPartTasks: (n) => `${n} to-do(s)`,
      appliedPartTrimmedAndAdded: (rm, add) => `trimmed ${rm} & added ${add} stop(s)`,
      appliedPartTrimmed: (rm) => `trimmed ${rm} stop(s)`,
      appliedPartAddedStops: (add) => `added ${add} itinerary stop(s)`,
      appliedPartRainPlan: (d) => `Day ${d} indoor rain plan`,
      appliedPartSunnyRoute: (d) => `Day ${d} sunny outdoor route`,
      appliedProposalToast: (s) => `Applied: ${s}`,
      checkedInStopToast: (t) => `Checked in at "${t}"`,
      unmarkedStopToast: (t) => `Unmarked "${t}" check-in`,
      stopLogNote: (dist, day) => `${dist} · Day ${day} stop log`,
      addedAnchorStopToast: (t) => `Added evening meetup anchor "${t}"`,
      addedDayStopToast: (t, d) => `Added "${t}" to Day ${d}`,
      updatedAnchorStopToast: (t) =>
        `Updated "${t}" and synced evening meetup anchor`,
      updatedStopToast: (t) => `Saved changes to "${t}"`,
      deletedStopToast: (t) => `Removed "${t}" from itinerary`,
      movedStopOrderToast: (t, idx, slot) => `Moved "${t}" to Stop #${idx}${slot}`,
      restoredDayOrderToast: (d) =>
        `Restored Day ${d} to its pre-optimisation stop order`,
      movedToWishlistToast: (t) => `Moved "${t}" back to your flexible wishlist`,
      addedToWishlistToast: (it) => `Added to wishlist: ${it}`,
      paywallAiOptimize:
        'Your 30-day free trial has ended (manual stop editing stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI route clustering Pro code.',
      optimizeFailed: 'Failed to optimise itinerary',
      optimizedReclusterToast: (d) => `Optimised Day ${d} spatial route`,
      optimizedGenerateDayToast: (d, city) =>
        `Generated Day ${d} (${city}) walkable itinerary`,
      optimizedDelayToast: (d, m) =>
        `Shifted Day ${d} by +${m} min and synced evening anchor`,
      optimizedInsertWishlistToast: (it, d) => `Inserted "${it}" into Day ${d}`,
      adjustItineraryFailed: 'Failed to adjust itinerary',
      paywallAiFullItinerary:
        'Your 30-day free trial has ended (manual stop editing stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI full-itinerary Pro code.',
      fullItineraryFailed: 'Failed to generate full itinerary',
      aiNoStopsReturned: 'AI did not return valid itinerary stops — please try again',
      fullItineraryDaySummary: (d) =>
        `Day ${d} arranged by budget tier and walkable districts.`,
      plannedFullItineraryToast: (days) =>
        `Planned full D1–D${days} itinerary (sights, stays & transit)`,
      paywallAiSmartReorder:
        'Your 30-day free trial has ended (manual drag reordering stays free forever). Message the creator on WhatsApp or Facebook for a free 1-year AI smart route reorder Pro code.',
      needTwoUnvisitedStopsToast: 'Need at least 2 unvisited stops to smart-reorder',
      smartReorderFailed: 'Failed to smart-reorder itinerary',
      smartReorderOverallSummary: (cnt, days) =>
        `Sequenced ${cnt} unvisited stops across Day 1–Day ${days} by proximity and opening hours.`,
      smartReorderedToast: (cnt, days) =>
        `Smart-reordered ${cnt} unvisited stops across D1–D${days}`,
      undidSmartReorderToast:
        'Restored D1–DX itinerary to its order before Smart Reorder',
      paywallLocalCard:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to generate local phrase & taxi cards.',
      localCardFailed: 'Failed to generate phrase card',
      updatedExpenseReopenedToast: (t) =>
        `Updated "${t}" — reopened settled bill so changed split balance is tracked`,
      updatedExpenseRecalcToast: (t) =>
        `Updated "${t}" — wallet balances and split recalculated`,
      deletedExpenseUnlinkedToast: (t) =>
        `Deleted "${t}" — wallet rolled back and stop restored to unlogged`,
      deletedExpenseRolledBackToast: (t) =>
        `Deleted "${t}" — wallet and split balance rolled back`,
      vatStatusUpdatedToast: (lbl) => `VAT refund status updated to "${lbl}"`,
      budgetLimitsSavedToast: 'Overall trip budget & FX settings saved',
      walletCash: 'Cash Wallet',
      walletCard: 'Credit Card',
      walletToppedUpToast: (acct, amt) => `${acct} topped up +${amt}`,
      walletCalibratedToast: (acct) => `${acct} balance calibrated`,
      convertedGroupSplitToast: (n) =>
        `Converted to ${n}-way equal split and updated net balance`,
      converted5050SplitToast: 'Converted to 50:50 split and updated net balance',
      convertedRatioSplitToast: (me, partner) =>
        `Converted to custom split (Me ${me}% : Companion ${partner}%)`,
      settledUpToast:
        'Shared balance settled to zero and logged in settlement history',
      bannerViewStop: 'View Stop',
      bannerOpenPacking: 'Open Packing',
      bannerSnooze15m: 'Snooze 15m',
      displayCurrencySetToast: (lbl) => `Display currency set to ${lbl}`,
      paywallCreateCloudRoom:
        'Your 30-day free trial has ended. Message the creator on WhatsApp or Facebook for a free 1-year Pro code to create new live cloud sync rooms.',
    },
    'es-MX': {
      taskDuringTripFallback: 'Durante el viaje',
      addedTaskToast: (title) => `Pendiente agregado: ${title}`,
      updatedTaskToast: (title) => `Pendiente «${title || 'tarea'}» actualizado`,
      removedTaskToast: (title) =>
        title ? `Se quitó el pendiente «${title}»` : 'Pendiente eliminado',
      switchedTaskAssigneeFallback: 'Responsable cambiado',
      assignedTaskToast: (t, m) => `«${t}» asignado a ${m}`,
      paywallAiParseTasks:
        'Tu prueba de 30 días terminó (los pendientes manuales son gratis siempre). Pide 1 año Pro gratis por WhatsApp o Facebook para análisis de tareas con IA.',
      aiParseTasksFailed: 'Error al analizar tareas de viaje',
      aiNoTasksDetected: 'No se detectó una tarea clara — intenta redactarlo diferente',
      aiAddedOneTaskToast: (t) => `La IA agregó la tarea: ${t}`,
      aiAddedMultiTasksToast: (n) => `La IA agregó ${n} tareas de viaje`,
      savedSmartBagPlanToast: 'Plan IA de 9 bolsas y consejo de empaque guardados',
      resetItemSmartBagToast: (n) =>
        `«${n || 'Artículo'}» restaurado a asignación automática`,
      pinnedItemSmartBagToast: (n, bag) => `«${n || 'Artículo'}» fijado en «${bag}»`,
      restoredSmartBagRulesToast: 'Reglas de 9 bolsas restauradas',
      paywallAiGapCheck:
        'Tu prueba de 30 días terminó. Pide un código Pro de 1 año por WhatsApp o Facebook para seguir usando la revisión IA.',
      paywallAiGapCheckQuota: (limit) =>
        `Ya usaste tus ${limit} revisiones IA gratuitas. Escribe al creador por WhatsApp o Facebook para recibir 1 año Pro ilimitado.`,
      aiGapCheckFailed: 'Error en la revisión IA de faltantes',
      aiGapWhyFallback: 'Recomendado según tus paradas y clima',
      aiGapGroupFallback: 'Mochila y Extras',
      aiGapSummaryFallback:
        'Se revisaron paradas, pronóstico de lluvia y reglas de tax-free.',
      batchAddedMissingToast: (n) => `Se agregaron ${n} artículo(s) a tu lista`,
      companionFallback: 'Acompañante',
      bucketShopping: 'Compras',
      bucketPrepaid: 'Prepagado',
      bucketDaily: 'Gasto diario',
      loggedExpenseToast: (bucket, title, amt) =>
        `Registrado en «${bucket}»: ${title} (${amt})`,
      paywallAiParseExpense:
        'Tu prueba de 30 días terminó (el registro manual es gratis siempre). Pide 1 año Pro por WhatsApp o Facebook para escanear recibos con IA.',
      aiParseExpenseFailed: 'Error al analizar el gasto',
      expenseTitleFallback: 'Gasto',
      paywallAiCopilot:
        'Tu prueba de 30 días terminó (tus listas y gastos siguen guardados). Pide 1 año Pro por WhatsApp o Facebook para el Copiloto IA.',
      failedReadReceiptError: 'Error al leer la imagen del recibo',
      aiCopilotFailed: 'El Copiloto IA no pudo procesar la solicitud',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Sugerido por Copiloto IA',
      walkOrTransitFallback: 'A pie o transporte público',
      localLanguageFallback: 'Idioma local',
      aiCopilotReplyFallback: '¡Listo!',
      appliedPartExpenses: (n) => `${n} gasto(s)`,
      appliedPartPacking: (n) => `${n} artículo(s)`,
      appliedPartTasks: (n) => `${n} pendiente(s)`,
      appliedPartTrimmedAndAdded: (rm, add) => `se quitaron ${rm} y agregaron ${add} parada(s)`,
      appliedPartTrimmed: (rm) => `se quitaron ${rm} parada(s)`,
      appliedPartAddedStops: (add) => `se agregaron ${add} parada(s)`,
      appliedPartRainPlan: (d) => `Plan bajo techo Día ${d}`,
      appliedPartSunnyRoute: (d) => `Ruta al aire libre Día ${d}`,
      appliedProposalToast: (s) => `Aplicado: ${s}`,
      checkedInStopToast: (t) => `Check-in en «${t}»`,
      unmarkedStopToast: (t) => `Check-in quitado de «${t}»`,
      stopLogNote: (dist, day) => `${dist} · Parada Día ${day}`,
      addedAnchorStopToast: (t) => `Punto de encuentro agregado: «${t}»`,
      addedDayStopToast: (t, d) => `«${t}» agregado al Día ${d}`,
      updatedAnchorStopToast: (t) =>
        `«${t}» actualizado y sincronizado con el punto de encuentro`,
      updatedStopToast: (t) => `Cambios guardados en «${t}»`,
      deletedStopToast: (t) => `Se quitó «${t}» del itinerario`,
      movedStopOrderToast: (t, idx, slot) => `Movido «${t}» a parada #${idx}${slot}`,
      restoredDayOrderToast: (d) => `Orden del Día ${d} restaurado`,
      movedToWishlistToast: (t) => `«${t}» movido a tu lista de deseos`,
      addedToWishlistToast: (it) => `Agregado a lista de deseos: ${it}`,
      paywallAiOptimize:
        'Tu prueba de 30 días terminó (editar manualmente es gratis siempre). Pide 1 año Pro por WhatsApp o Facebook para optimización IA.',
      optimizeFailed: 'Error al optimizar el itinerario',
      optimizedReclusterToast: (d) => `Ruta del Día ${d} agrupada por zona`,
      optimizedGenerateDayToast: (d, city) => `Itinerario del Día ${d} (${city}) generado`,
      optimizedDelayToast: (d, m) => `Día ${d} recorrido +${m} min`,
      optimizedInsertWishlistToast: (it, d) => `«${it}» insertado en el Día ${d}`,
      adjustItineraryFailed: 'Error al ajustar el itinerario',
      paywallAiFullItinerary:
        'Tu prueba de 30 días terminó. Pide 1 año Pro por WhatsApp o Facebook para planificar todo el itinerario con IA.',
      fullItineraryFailed: 'Error al planificar el itinerario completo',
      aiNoStopsReturned: 'La IA no devolvió paradas válidas — intenta de nuevo',
      fullItineraryDaySummary: (d) => `Día ${d} organizado por presupuesto y zona.`,
      plannedFullItineraryToast: (days) =>
        `Itinerario D1–D${days} planificado (lugares, estancia y traslados)`,
      paywallAiSmartReorder:
        'Tu prueba de 30 días terminó (arrastrar manualmente es gratis siempre). Pide 1 año Pro por WhatsApp o Facebook para reordenamiento inteligente IA.',
      needTwoUnvisitedStopsToast:
        'Se necesitan al menos 2 paradas sin visitar para reordenar',
      smartReorderFailed: 'Error en el reordenamiento inteligente',
      smartReorderOverallSummary: (cnt, days) =>
        `Se ordenaron ${cnt} paradas pendientes en D1–D${days} por cercanía y horarios.`,
      smartReorderedToast: (cnt, days) =>
        `${cnt} paradas reordenadas en D1–D${days}`,
      undidSmartReorderToast: 'Itinerario D1–DX restaurado al orden anterior',
      paywallLocalCard:
        'Tu prueba de 30 días terminó. Pide 1 año Pro por WhatsApp o Facebook para crear tarjetas de frases locales y taxi.',
      localCardFailed: 'Error al generar tarjeta de frases',
      updatedExpenseReopenedToast: (t) =>
        `«${t}» actualizado — se reabrió para recalcular saldo dividido`,
      updatedExpenseRecalcToast: (t) =>
        `«${t}» actualizado — saldos y división recalculados`,
      deletedExpenseUnlinkedToast: (t) =>
        `«${t}» eliminado — saldo revertido y parada sin registrar`,
      deletedExpenseRolledBackToast: (t) =>
        `«${t}» eliminado — saldos revertidos`,
      vatStatusUpdatedToast: (lbl) => `Estado de tax-free actualizado a «${lbl}»`,
      budgetLimitsSavedToast: 'Presupuesto general y tipo de cambio guardados',
      walletCash: 'Efectivo',
      walletCard: 'Tarjeta',
      walletToppedUpToast: (acct, amt) => `${acct} recargado +${amt}`,
      walletCalibratedToast: (acct) => `Saldo de ${acct} ajustado`,
      convertedGroupSplitToast: (n) => `Dividido entre ${n} en partes iguales`,
      converted5050SplitToast: 'Dividido 50:50 y saldo actualizado',
      convertedRatioSplitToast: (me, partner) =>
        `División personalizada (Yo ${me}% : Acompañante ${partner}%)`,
      settledUpToast: 'Saldo liquidado en cero y registrado en historial',
      bannerViewStop: 'Ver parada',
      bannerOpenPacking: 'Abrir lista',
      bannerSnooze15m: 'Posponer 15 min',
      displayCurrencySetToast: (lbl) => `Moneda de visualización: ${lbl}`,
      paywallCreateCloudRoom:
        'Tu prueba de 30 días terminó. Pide 1 año Pro por WhatsApp o Facebook para crear nuevas salas de sincronización en la nube.',
    },
    'fr-FR': {
      taskDuringTripFallback: 'Pendant le voyage',
      addedTaskToast: (title) => `Tâche ajoutée : ${title}`,
      updatedTaskToast: (title) => `Tâche « ${title || 'à faire'} » mise à jour`,
      removedTaskToast: (title) =>
        title ? `Tâche « ${title} » supprimée` : 'Tâche supprimée',
      switchedTaskAssigneeFallback: 'Responsable modifié',
      assignedTaskToast: (t, m) => `« ${t} » confiée à ${m}`,
      paywallAiParseTasks:
        'Essai de 30 jours terminé (les tâches manuelles restent gratuites). Demandez un code Pro 1 an sur WhatsApp ou Facebook pour l’analyse IA.',
      aiParseTasksFailed: 'Échec de l’analyse des tâches',
      aiNoTasksDetected: 'Aucune tâche détectée — reformulez et réessayez',
      aiAddedOneTaskToast: (t) => `L’IA a ajouté la tâche : ${t}`,
      aiAddedMultiTasksToast: (n) => `L’IA a ajouté ${n} tâches de voyage`,
      savedSmartBagPlanToast: 'Plan 9 sacs IA et conseil valise enregistrés',
      resetItemSmartBagToast: (n) =>
        `« ${n || 'Article'} » réinitialisé en tri automatique`,
      pinnedItemSmartBagToast: (n, bag) => `« ${n || 'Article'} » fixé dans « ${bag} »`,
      restoredSmartBagRulesToast: 'Règles par défaut des 9 sacs restaurées',
      paywallAiGapCheck:
        'Essai de 30 jours terminé. Demandez un code Pro 1 an sur WhatsApp ou Facebook pour l’audit IA.',
      paywallAiGapCheckQuota: (limit) =>
        `Vos ${limit} audits IA gratuits sont épuisés. Demandez un code Pro illimité 1 an sur WhatsApp ou Facebook.`,
      aiGapCheckFailed: 'Échec de l’audit IA',
      aiGapWhyFallback: 'Recommandé selon vos étapes et la météo',
      aiGapGroupFallback: 'Sac jour & Extras',
      aiGapSummaryFallback:
        'Étapes, météo et règles de détaxe vérifiées.',
      batchAddedMissingToast: (n) => `${n} article(s) ajouté(s) à la liste`,
      companionFallback: 'Compagnon',
      bucketShopping: 'Achats',
      bucketPrepaid: 'Prépaiements',
      bucketDaily: 'Dépenses jour',
      loggedExpenseToast: (bucket, title, amt) =>
        `Enregistré (${bucket}) : ${title} (${amt})`,
      paywallAiParseExpense:
        'Essai de 30 jours terminé (la saisie manuelle est gratuite à vie). Demandez un code Pro 1 an sur WhatsApp ou Facebook pour le scan IA.',
      aiParseExpenseFailed: 'Échec de lecture de la dépense',
      expenseTitleFallback: 'Dépense',
      paywallAiCopilot:
        'Essai de 30 jours terminé (vos listes et comptes restent accessibles). Demandez un code Pro 1 an sur WhatsApp ou Facebook pour l’Assistant IA.',
      failedReadReceiptError: 'Impossible de lire l’image du reçu',
      aiCopilotFailed: 'Échec de l’Assistant IA',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Suggéré par l’Assistant IA',
      walkOrTransitFallback: 'À pied ou transports en commun',
      localLanguageFallback: 'Langue locale',
      aiCopilotReplyFallback: 'C’est prêt !',
      appliedPartExpenses: (n) => `${n} dépense(s)`,
      appliedPartPacking: (n) => `${n} article(s)`,
      appliedPartTasks: (n) => `${n} tâche(s)`,
      appliedPartTrimmedAndAdded: (rm, add) => `${rm} retirée(s), ${add} ajoutée(s)`,
      appliedPartTrimmed: (rm) => `${rm} étape(s) retirée(s)`,
      appliedPartAddedStops: (add) => `${add} étape(s) ajoutée(s)`,
      appliedPartRainPlan: (d) => `Plan pluie Jour ${d}`,
      appliedPartSunnyRoute: (d) => `Parcours soleil Jour ${d}`,
      appliedProposalToast: (s) => `Appliqué : ${s}`,
      checkedInStopToast: (t) => `Validé : « ${t} »`,
      unmarkedStopToast: (t) => `Validation annulée : « ${t} »`,
      stopLogNote: (dist, day) => `${dist} · Étape Jour ${day}`,
      addedAnchorStopToast: (t) => `Point de RDV du soir ajouté : « ${t} »`,
      addedDayStopToast: (t, d) => `« ${t} » ajouté au Jour ${d}`,
      updatedAnchorStopToast: (t) => `« ${t} » et RDV du soir mis à jour`,
      updatedStopToast: (t) => `Modifications enregistrées pour « ${t} »`,
      deletedStopToast: (t) => `« ${t} » retiré de l’itinéraire`,
      movedStopOrderToast: (t, idx, slot) => `« ${t} » déplacé en étape #${idx}${slot}`,
      restoredDayOrderToast: (d) => `Ordre du Jour ${d} restauré`,
      movedToWishlistToast: (t) => `« ${t} » déplacé dans la liste d’envies`,
      addedToWishlistToast: (it) => `Ajouté aux envies : ${it}`,
      paywallAiOptimize:
        'Essai de 30 jours terminé (l’édition manuelle reste gratuite). Demandez 1 an Pro sur WhatsApp ou Facebook pour l’optimisation IA.',
      optimizeFailed: 'Échec de l’optimisation',
      optimizedReclusterToast: (d) => `Itinéraire du Jour ${d} optimisé par zone`,
      optimizedGenerateDayToast: (d, city) => `Itinéraire Jour ${d} (${city}) généré`,
      optimizedDelayToast: (d, m) => `Jour ${d} décalé de +${m} min`,
      optimizedInsertWishlistToast: (it, d) => `« ${it} » inséré au Jour ${d}`,
      adjustItineraryFailed: 'Échec de l’ajustement',
      paywallAiFullItinerary:
        'Essai de 30 jours terminé. Demandez 1 an Pro sur WhatsApp ou Facebook pour la planification complète par IA.',
      fullItineraryFailed: 'Échec de planification complète',
      aiNoStopsReturned: 'Aucune étape valide renvoyée — réessayez',
      fullItineraryDaySummary: (d) => `Jour ${d} organisé selon budget et proximité.`,
      plannedFullItineraryToast: (days) =>
        `Itinéraire J1–J${days} planifié (visites, hôtel & trajets)`,
      paywallAiSmartReorder:
        'Essai de 30 jours terminé (le glisser-déposer manuel est gratuit). Demandez 1 an Pro sur WhatsApp ou Facebook pour le réagencement IA.',
      needTwoUnvisitedStopsToast:
        'Il faut au moins 2 étapes non visitées pour réorganiser',
      smartReorderFailed: 'Échec du réagencement IA',
      smartReorderOverallSummary: (cnt, days) =>
        `${cnt} étapes non visitées réorganisées sur J1–J${days} selon proximité et horaires.`,
      smartReorderedToast: (cnt, days) => `${cnt} étapes réorganisées sur J1–J${days}`,
      undidSmartReorderToast: 'Ordre J1–JX restauré avant réorganisation',
      paywallLocalCard:
        'Essai de 30 jours terminé. Demandez 1 an Pro sur WhatsApp ou Facebook pour créer des cartes de langue locale.',
      localCardFailed: 'Échec de création de la carte',
      updatedExpenseReopenedToast: (t) =>
        `« ${t} » mis à jour — facture rouverte pour recalcul du partage`,
      updatedExpenseRecalcToast: (t) =>
        `« ${t} » mis à jour — soldes recalculés`,
      deletedExpenseUnlinkedToast: (t) =>
        `« ${t} » supprimé — solde rétabli et étape déliée`,
      deletedExpenseRolledBackToast: (t) =>
        `« ${t} » supprimé — soldes rétablis`,
      vatStatusUpdatedToast: (lbl) => `Statut détaxe mis à jour : « ${lbl} »`,
      budgetLimitsSavedToast: 'Budget global et taux de change enregistrés',
      walletCash: 'Espèces',
      walletCard: 'Carte bancaire',
      walletToppedUpToast: (acct, amt) => `${acct} rechargé +${amt}`,
      walletCalibratedToast: (acct) => `Solde ${acct} ajusté`,
      convertedGroupSplitToast: (n) => `Partagé à parts égales entre ${n}`,
      converted5050SplitToast: 'Partagé à 50:50 et solde mis à jour',
      convertedRatioSplitToast: (me, partner) =>
        `Partage personnalisé (Moi ${me}% : Compagnon ${partner}%)`,
      settledUpToast: 'Solde réglé à zéro et ajouté à l’historique',
      bannerViewStop: 'Voir l’étape',
      bannerOpenPacking: 'Ouvrir bagages',
      bannerSnooze15m: 'Reporter 15 min',
      displayCurrencySetToast: (lbl) => `Devise d’affichage : ${lbl}`,
      paywallCreateCloudRoom:
        'Essai de 30 jours terminé. Demandez 1 an Pro sur WhatsApp ou Facebook pour créer de nouveaux salons cloud.',
    },
    'de-DE': {
      taskDuringTripFallback: 'Während der Reise',
      addedTaskToast: (title) => `Aufgabe hinzugefügt: ${title}`,
      updatedTaskToast: (title) => `Aufgabe „${title || 'To-do'}“ aktualisiert`,
      removedTaskToast: (title) =>
        title ? `Aufgabe „${title}“ entfernt` : 'Reise-Aufgabe entfernt',
      switchedTaskAssigneeFallback: 'Zuständigkeit gewechselt',
      assignedTaskToast: (t, m) => `„${t}“ zugewiesen an ${m}`,
      paywallAiParseTasks:
        '30-Tage-Testphase beendet (manuelle Aufgaben bleiben kostenlos). Frag per WhatsApp/Facebook nach einem 1-Jahres-Pro-Code für KI-Analyse.',
      aiParseTasksFailed: 'Aufgabenanalyse fehlgeschlagen',
      aiNoTasksDetected: 'Keine konkrete Aufgabe erkannt — bitte umformulieren',
      aiAddedOneTaskToast: (t) => `KI hat Aufgabe hinzugefügt: ${t}`,
      aiAddedMultiTasksToast: (n) => `KI hat ${n} Reise-Aufgaben hinzugefügt`,
      savedSmartBagPlanToast: 'KI 9-Taschen-Plan & Packtipp gespeichert',
      resetItemSmartBagToast: (n) =>
        `„${n || 'Artikel'}“ auf automatische Tasche zurückgesetzt`,
      pinnedItemSmartBagToast: (n, bag) =>
        `„${n || 'Artikel'}“ an „${bag}“ angeheftet`,
      restoredSmartBagRulesToast: 'Standard-9-Taschen-Regeln wiederhergestellt',
      paywallAiGapCheck:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp oder Facebook einen kostenlosen 1-Jahres-Pro-Code für den KI-Check.',
      paywallAiGapCheckQuota: (limit) =>
        `Alle ${limit} kostenlosen KI-Checks aufgebraucht. Schreib auf WhatsApp oder Facebook für unbegrenztes 1-Jahr-Pro.`,
      aiGapCheckFailed: 'KI-Check fehlgeschlagen',
      aiGapWhyFallback: 'Empfohlen basierend auf Route & Wetter',
      aiGapGroupFallback: 'Tagesrucksack & Extras',
      aiGapSummaryFallback:
        'Stopps, Regenprognose & Tax-Free-Regeln abgeglichen.',
      batchAddedMissingToast: (n) => `${n} empfohlene(n) Artikel hinzugefügt`,
      companionFallback: 'Begleitung',
      bucketShopping: 'Einkäufe',
      bucketPrepaid: 'Vorab bezahlt',
      bucketDaily: 'Tagesausgaben',
      loggedExpenseToast: (bucket, title, amt) =>
        `Erfasst unter „${bucket}“: ${title} (${amt})`,
      paywallAiParseExpense:
        '30-Tage-Testphase beendet (manuelles Erfassen bleibt kostenlos). Frag per WhatsApp/Facebook nach einem 1-Jahres-Pro-Code für KI-Belegscan.',
      aiParseExpenseFailed: 'Ausgabe konnte nicht erkannt werden',
      expenseTitleFallback: 'Ausgabe',
      paywallAiCopilot:
        '30-Tage-Testphase beendet (deine Listen & Ausgaben bleiben gespeichert). Frag per WhatsApp/Facebook nach 1 Jahr Pro für den KI-Copiloten.',
      failedReadReceiptError: 'Belegbild konnte nicht gelesen werden',
      aiCopilotFailed: 'KI-Copilot konnte Anfrage nicht verarbeiten',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Vom KI-Copiloten empfohlen',
      walkOrTransitFallback: 'Zu Fuß oder ÖPNV',
      localLanguageFallback: 'Landessprache',
      aiCopilotReplyFallback: 'Alles bereit!',
      appliedPartExpenses: (n) => `${n} Ausgabe(n)`,
      appliedPartPacking: (n) => `${n} Pack-Artikel`,
      appliedPartTasks: (n) => `${n} Aufgabe(n)`,
      appliedPartTrimmedAndAdded: (rm, add) => `${rm} entfernt & ${add} ergänzt`,
      appliedPartTrimmed: (rm) => `${rm} Stopp(s) gekürzt`,
      appliedPartAddedStops: (add) => `${add} Stopp(s) ergänzt`,
      appliedPartRainPlan: (d) => `Tag ${d} Regen-Indoorplan`,
      appliedPartSunnyRoute: (d) => `Tag ${d} Outdoor-Route`,
      appliedProposalToast: (s) => `Übernommen: ${s}`,
      checkedInStopToast: (t) => `Eingecheckt bei „${t}“`,
      unmarkedStopToast: (t) => `Check-in für „${t}“ entfernt`,
      stopLogNote: (dist, day) => `${dist} · Tag ${day} Stopp-Buchung`,
      addedAnchorStopToast: (t) => `Abend-Treffpunkt „${t}“ hinzugefügt`,
      addedDayStopToast: (t, d) => `„${t}“ zu Tag ${d} hinzugefügt`,
      updatedAnchorStopToast: (t) =>
        `„${t}“ aktualisiert & Abend-Treffpunkt synchronisiert`,
      updatedStopToast: (t) => `Änderungen an „${t}“ gespeichert`,
      deletedStopToast: (t) => `„${t}“ aus der Route entfernt`,
      movedStopOrderToast: (t, idx, slot) => `„${t}“ auf Stopp #${idx}${slot} verschoben`,
      restoredDayOrderToast: (d) => `Reihenfolge für Tag ${d} wiederhergestellt`,
      movedToWishlistToast: (t) => `„${t}“ zurück in Wunschliste verschoben`,
      addedToWishlistToast: (it) => `Zur Wunschliste hinzugefügt: ${it}`,
      paywallAiOptimize:
        '30-Tage-Testphase beendet (manuelles Bearbeiten bleibt kostenlos). Hol dir per WhatsApp/Facebook 1 Jahr Pro für KI-Optimierung.',
      optimizeFailed: 'Routenoptimierung fehlgeschlagen',
      optimizedReclusterToast: (d) => `Tag ${d} räumlich optimiert`,
      optimizedGenerateDayToast: (d, city) => `Tag ${d} (${city}) Route erstellt`,
      optimizedDelayToast: (d, m) => `Tag ${d} um +${m} Min. verschoben`,
      optimizedInsertWishlistToast: (it, d) => `„${it}“ in Tag ${d} eingefügt`,
      adjustItineraryFailed: 'Anpassung fehlgeschlagen',
      paywallAiFullItinerary:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp/Facebook 1 Jahr Pro für komplette KI-Routenplanung.',
      fullItineraryFailed: 'Komplettplanung fehlgeschlagen',
      aiNoStopsReturned: 'Keine gültigen Stopps erhalten — bitte erneut versuchen',
      fullItineraryDaySummary: (d) => `Tag ${d} nach Budget & Vierteln geplant.`,
      plannedFullItineraryToast: (days) =>
        `Komplette D1–D${days}-Route geplant (Orte, Hotel & Transit)`,
      paywallAiSmartReorder:
        '30-Tage-Testphase beendet (Drag & Drop bleibt kostenlos). Hol dir per WhatsApp/Facebook 1 Jahr Pro für KI-Sortierung.',
      needTwoUnvisitedStopsToast:
        'Mindestens 2 unbesuchte Stopps zum Sortieren nötig',
      smartReorderFailed: 'KI-Sortierung fehlgeschlagen',
      smartReorderOverallSummary: (cnt, days) =>
        `${cnt} offene Stopps über D1–D${days} nach Distanz & Öffnungszeiten geordnet.`,
      smartReorderedToast: (cnt, days) =>
        `${cnt} Stopps über D1–D${days} neu geordnet`,
      undidSmartReorderToast: 'D1–DX-Route auf Stand vor Sortierung zurückgesetzt',
      paywallLocalCard:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp/Facebook 1 Jahr Pro für lokale Sprachkarten.',
      localCardFailed: 'Sprachkarte konnte nicht erstellt werden',
      updatedExpenseReopenedToast: (t) =>
        `„${t}“ aktualisiert — geteilter Betrag wieder offen`,
      updatedExpenseRecalcToast: (t) =>
        `„${t}“ aktualisiert — Salden neu berechnet`,
      deletedExpenseUnlinkedToast: (t) =>
        `„${t}“ gelöscht — Wallet & Stopp zurückgesetzt`,
      deletedExpenseRolledBackToast: (t) =>
        `„${t}“ gelöscht — Salden zurückgesetzt`,
      vatStatusUpdatedToast: (lbl) => `Tax-Free-Status: „${lbl}“`,
      budgetLimitsSavedToast: 'Reisebudget & Wechselkurs gespeichert',
      walletCash: 'Bargeld',
      walletCard: 'Kreditkarte',
      walletToppedUpToast: (acct, amt) => `${acct} aufgeladen +${amt}`,
      walletCalibratedToast: (acct) => `${acct}-Stand angepasst`,
      convertedGroupSplitToast: (n) => `Gleichmäßig durch ${n} geteilt`,
      converted5050SplitToast: '50:50 geteilt & Saldo aktualisiert',
      convertedRatioSplitToast: (me, partner) =>
        `Individuell geteilt (Ich ${me}% : Begleitung ${partner}%)`,
      settledUpToast: 'Geteilter Saldo beglichen & archiviert',
      bannerViewStop: 'Stopp ansehen',
      bannerOpenPacking: 'Packliste öffnen',
      bannerSnooze15m: '15 Min. schlummern',
      displayCurrencySetToast: (lbl) => `Anzeigewährung: ${lbl}`,
      paywallCreateCloudRoom:
        '30-Tage-Testphase beendet. Hol dir per WhatsApp/Facebook 1 Jahr Pro für neue Cloud-Räume.',
    },
    'pt-BR': {
      taskDuringTripFallback: 'Durante a viagem',
      addedTaskToast: (title) => `Tarefa adicionada: ${title}`,
      updatedTaskToast: (title) => `Tarefa “${title || 'item'}” atualizada`,
      removedTaskToast: (title) =>
        title ? `Tarefa “${title}” removida` : 'Tarefa removida',
      switchedTaskAssigneeFallback: 'Responsável alterado',
      assignedTaskToast: (t, m) => `“${t}” atribuída a ${m}`,
      paywallAiParseTasks:
        'Seu teste de 30 dias terminou (tarefas manuais são grátis sempre). Peça 1 ano Pro no WhatsApp ou Facebook para criar tarefas com IA.',
      aiParseTasksFailed: 'Falha ao analisar tarefas',
      aiNoTasksDetected: 'Nenhuma tarefa identificada — tente reformular',
      aiAddedOneTaskToast: (t) => `IA adicionou tarefa: ${t}`,
      aiAddedMultiTasksToast: (n) => `IA adicionou ${n} tarefas de viagem`,
      savedSmartBagPlanToast: 'Plano de 9 bolsas e dica de mala salvos',
      resetItemSmartBagToast: (n) =>
        `“${n || 'Item'}” restaurado para divisão automática`,
      pinnedItemSmartBagToast: (n, bag) => `“${n || 'Item'}” fixado em “${bag}”`,
      restoredSmartBagRulesToast: 'Regras padrão de 9 bolsas restauradas',
      paywallAiGapCheck:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro no WhatsApp ou Facebook para usar a Revisão IA.',
      paywallAiGapCheckQuota: (limit) =>
        `Você usou todas as ${limit} revisões IA gratuitas. Fale com o criador no WhatsApp ou Facebook para liberar 1 ano Pro ilimitado.`,
      aiGapCheckFailed: 'Falha na revisão IA',
      aiGapWhyFallback: 'Recomendado pelo roteiro e previsão do tempo',
      aiGapGroupFallback: 'Mochila & Extras',
      aiGapSummaryFallback:
        'Roteiro, previsão de chuva e regras de tax-free verificados.',
      batchAddedMissingToast: (n) => `${n} item(ns) adicionado(s) à lista`,
      companionFallback: 'Acompanhante',
      bucketShopping: 'Compras',
      bucketPrepaid: 'Pré-pago',
      bucketDaily: 'Gasto diário',
      loggedExpenseToast: (bucket, title, amt) =>
        `Registrado em “${bucket}”: ${title} (${amt})`,
      paywallAiParseExpense:
        'Seu teste de 30 dias terminou (lançamentos manuais são grátis sempre). Peça 1 ano Pro no WhatsApp ou Facebook para ler recibos com IA.',
      aiParseExpenseFailed: 'Falha ao analisar gasto',
      expenseTitleFallback: 'Despesa',
      paywallAiCopilot:
        'Seu teste de 30 dias terminou (suas listas e gastos continuam salvos). Peça 1 ano Pro no WhatsApp ou Facebook para o Copiloto IA.',
      failedReadReceiptError: 'Falha ao ler imagem do recibo',
      aiCopilotFailed: 'Copiloto IA não conseguiu processar',
      extrasGroupFallback: 'Extras',
      aiCopilotWhyFallback: 'Sugerido pelo Copiloto IA',
      walkOrTransitFallback: 'A pé ou transporte público',
      localLanguageFallback: 'Idioma local',
      aiCopilotReplyFallback: 'Tudo pronto!',
      appliedPartExpenses: (n) => `${n} gasto(s)`,
      appliedPartPacking: (n) => `${n} item(ns) de mala`,
      appliedPartTasks: (n) => `${n} tarefa(s)`,
      appliedPartTrimmedAndAdded: (rm, add) => `${rm} removida(s) e ${add} adicionada(s)`,
      appliedPartTrimmed: (rm) => `${rm} parada(s) removida(s)`,
      appliedPartAddedStops: (add) => `${add} parada(s) adicionada(s)`,
      appliedPartRainPlan: (d) => `Plano chuva Dia ${d}`,
      appliedPartSunnyRoute: (d) => `Rota sol Dia ${d}`,
      appliedProposalToast: (s) => `Aplicado: ${s}`,
      checkedInStopToast: (t) => `Check-in em “${t}”`,
      unmarkedStopToast: (t) => `Check-in removido de “${t}”`,
      stopLogNote: (dist, day) => `${dist} · Parada Dia ${day}`,
      addedAnchorStopToast: (t) => `Ponto de encontro noturno “${t}” adicionado`,
      addedDayStopToast: (t, d) => `“${t}” adicionado ao Dia ${d}`,
      updatedAnchorStopToast: (t) => `“${t}” e ponto de encontro atualizados`,
      updatedStopToast: (t) => `Alterações salvas em “${t}”`,
      deletedStopToast: (t) => `“${t}” removido do roteiro`,
      movedStopOrderToast: (t, idx, slot) => `“${t}” movido para parada #${idx}${slot}`,
      restoredDayOrderToast: (d) => `Ordem do Dia ${d} restaurada`,
      movedToWishlistToast: (t) => `“${t}” movido para lista de desejos`,
      addedToWishlistToast: (it) => `Adicionado aos desejos: ${it}`,
      paywallAiOptimize:
        'Seu teste de 30 dias terminou (edição manual é grátis sempre). Peça 1 ano Pro no WhatsApp ou Facebook para otimização IA.',
      optimizeFailed: 'Falha ao otimizar roteiro',
      optimizedReclusterToast: (d) => `Rota do Dia ${d} agrupada por região`,
      optimizedGenerateDayToast: (d, city) => `Roteiro Dia ${d} (${city}) gerado`,
      optimizedDelayToast: (d, m) => `Dia ${d} adiado em +${m} min`,
      optimizedInsertWishlistToast: (it, d) => `“${it}” inserido no Dia ${d}`,
      adjustItineraryFailed: 'Falha ao ajustar roteiro',
      paywallAiFullItinerary:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro no WhatsApp ou Facebook para planejamento completo com IA.',
      fullItineraryFailed: 'Falha ao gerar roteiro completo',
      aiNoStopsReturned: 'Nenhuma parada válida retornada — tente novamente',
      fullItineraryDaySummary: (d) => `Dia ${d} organizado por orçamento e bairro.`,
      plannedFullItineraryToast: (days) =>
        `Roteiro D1–D${days} planejado (atrações, estadia e transporte)`,
      paywallAiSmartReorder:
        'Seu teste de 30 dias terminou (arrastar manualmente é grátis sempre). Peça 1 ano Pro no WhatsApp ou Facebook para reordenação inteligente IA.',
      needTwoUnvisitedStopsToast:
        'Precisa de pelo menos 2 paradas não visitadas para reordenar',
      smartReorderFailed: 'Falha na reordenação inteligente',
      smartReorderOverallSummary: (cnt, days) =>
        `${cnt} paradas pendentes ordenadas de D1 a D${days} por distância e horários.`,
      smartReorderedToast: (cnt, days) => `${cnt} paradas reordenadas em D1–D${days}`,
      undidSmartReorderToast: 'Roteiro D1–DX restaurado à ordem anterior',
      paywallLocalCard:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro no WhatsApp ou Facebook para gerar cartões de frases locais.',
      localCardFailed: 'Falha ao gerar cartão de frases',
      updatedExpenseReopenedToast: (t) =>
        `“${t}” atualizado — reaberto para recalcular divisão`,
      updatedExpenseRecalcToast: (t) => `“${t}” atualizado — saldos recalculados`,
      deletedExpenseUnlinkedToast: (t) =>
        `“${t}” excluído — saldo revertido e parada desvinculada`,
      deletedExpenseRolledBackToast: (t) =>
        `“${t}” excluído — saldos revertidos`,
      vatStatusUpdatedToast: (lbl) => `Status tax-free atualizado para “${lbl}”`,
      budgetLimitsSavedToast: 'Orçamento geral e câmbio salvos',
      walletCash: 'Dinheiro',
      walletCard: 'Cartão',
      walletToppedUpToast: (acct, amt) => `${acct} reforçado +${amt}`,
      walletCalibratedToast: (acct) => `Saldo de ${acct} ajustado`,
      convertedGroupSplitToast: (n) => `Dividido igualmente por ${n}`,
      converted5050SplitToast: 'Dividido 50:50 e saldo atualizado',
      convertedRatioSplitToast: (me, partner) =>
        `Divisão personalizada (Eu ${me}% : Companheiro ${partner}%)`,
      settledUpToast: 'Saldo acertado e registrado no histórico',
      bannerViewStop: 'Ver parada',
      bannerOpenPacking: 'Abrir mala',
      bannerSnooze15m: 'Adiar 15 min',
      displayCurrencySetToast: (lbl) => `Moeda de exibição: ${lbl}`,
      paywallCreateCloudRoom:
        'Seu teste de 30 dias terminou. Peça 1 ano Pro no WhatsApp ou Facebook para criar novas salas na nuvem.',
    },
    'ja-JP': {
      taskDuringTripFallback: '旅行中',
      addedTaskToast: (title) => `タスクを追加：${title}`,
      updatedTaskToast: (title) => `タスク「${title || '予定'}」を更新しました`,
      removedTaskToast: (title) =>
        title ? `タスク「${title}」を削除しました` : 'タスクを削除しました',
      switchedTaskAssigneeFallback: '担当者を変更しました',
      assignedTaskToast: (t, m) => `「${t}」の担当を ${m} に設定しました`,
      paywallAiParseTasks:
        '30 日間の無料トライアルが終了しました（手動追加は永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI タスク分解が使えます。',
      aiParseTasksFailed: 'タスクの解析に失敗しました',
      aiNoTasksDetected: '具体的なタスクを認識できませんでした。言い換えてお試しください',
      aiAddedOneTaskToast: (t) => `AI がタスクを追加：${t}`,
      aiAddedMultiTasksToast: (n) => `AI が ${n} 件のタスクを分解して追加しました`,
      savedSmartBagPlanToast: 'AI 9 バッグ配置プランとパッキング助言を保存しました',
      resetItemSmartBagToast: (n) =>
        `「${n || 'アイテム'}」を自動バッグ仕分けに戻しました`,
      pinnedItemSmartBagToast: (n, bag) =>
        `「${n || 'アイテム'}」を「${bag}」に固定しました`,
      restoredSmartBagRulesToast: 'デフォルトの 9 バッグ仕分けルールに戻しました',
      paywallAiGapCheck:
        '30 日間の無料トライアルが終了しました。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI 漏れチェックを続けられます。',
      paywallAiGapCheckQuota: (limit) =>
        `無料の「AI 漏れチェック」（${limit} 回）を使い切りました。WhatsApp / Facebook で無制限 Pro コードを無料請求できます。`,
      aiGapCheckFailed: 'AI 漏れチェックに失敗しました',
      aiGapWhyFallback: '旅程と天気予報に基づくおすすめ追加',
      aiGapGroupFallback: 'デイパック・その他',
      aiGapSummaryFallback: '旅程・降水確率・免税ルールを照合しました',
      batchAddedMissingToast: (n) => `不足アイテム ${n} 点を一括追加しました`,
      companionFallback: '同行者',
      bucketShopping: 'ショッピング',
      bucketPrepaid: '交通・宿泊',
      bucketDaily: '日々の出費',
      loggedExpenseToast: (bucket, title, amt) =>
        `「${bucket}」に記録：${title} (${amt})`,
      paywallAiParseExpense:
        '30 日間の無料トライアルが終了しました（手動記録と精算は永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI レシート解析が使えます。',
      aiParseExpenseFailed: '支出の解析に失敗しました',
      expenseTitleFallback: '支出記録',
      paywallAiCopilot:
        '30 日間の無料トライアルが終了しました（既存データは永久保持）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI アシスタントが利用できます。',
      failedReadReceiptError: 'レシート画像の読み込みに失敗しました',
      aiCopilotFailed: 'AI アシスタントの処理に失敗しました',
      extrasGroupFallback: 'その他追加',
      aiCopilotWhyFallback: 'AI アシスタントによる提案',
      walkOrTransitFallback: '徒歩または公共交通機関',
      localLanguageFallback: '現地語',
      aiCopilotReplyFallback: '提案をまとめました。',
      appliedPartExpenses: (n) => `支出 ${n} 件`,
      appliedPartPacking: (n) => `持ち物 ${n} 点`,
      appliedPartTasks: (n) => `タスク ${n} 件`,
      appliedPartTrimmedAndAdded: (rm, add) => `${rm} 件削減・${add} 件追加`,
      appliedPartTrimmed: (rm) => `${rm} 件のスポットを整理`,
      appliedPartAddedStops: (add) => `スポット ${add} 件追加`,
      appliedPartRainPlan: (d) => `Day ${d} 雨天屋内プラン`,
      appliedPartSunnyRoute: (d) => `Day ${d} 屋外ルート復帰`,
      appliedProposalToast: (s) => `適用しました：${s}`,
      checkedInStopToast: (t) => `「${t}」にチェックインしました`,
      unmarkedStopToast: (t) => `「${t}」のチェックインを解除しました`,
      stopLogNote: (dist, day) => `${dist} · Day ${day} スポット記録`,
      addedAnchorStopToast: (t) => `夜の集合スポット「${t}」を追加しました`,
      addedDayStopToast: (t, d) => `「${t}」を Day ${d} に追加しました`,
      updatedAnchorStopToast: (t) =>
        `「${t}」を更新し、集合スポットに同期しました`,
      updatedStopToast: (t) => `「${t}」の変更を保存しました`,
      deletedStopToast: (t) => `「${t}」を行程から削除しました`,
      movedStopOrderToast: (t, idx, slot) => `「${t}」を ${idx} 番目に移動${slot}`,
      restoredDayOrderToast: (d) => `Day ${d} を最適化前の順序に戻しました`,
      movedToWishlistToast: (t) => `「${t}」を行きたいリストへ移動しました`,
      addedToWishlistToast: (it) => `行きたいリストに追加：${it}`,
      paywallAiOptimize:
        '30 日間の無料トライアルが終了しました（手動編集は永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI ルート最適化が使えます。',
      optimizeFailed: 'ルート最適化に失敗しました',
      optimizedReclusterToast: (d) => `Day ${d} のルートをエリア別に再配置しました`,
      optimizedGenerateDayToast: (d, city) => `Day ${d} (${city}) の行程を生成しました`,
      optimizedDelayToast: (d, m) => `Day ${d} の予定を +${m} 分繰り下げました`,
      optimizedInsertWishlistToast: (it, d) => `「${it}」を Day ${d} に組み込みました`,
      adjustItineraryFailed: '行程の調整に失敗しました',
      paywallAiFullItinerary:
        '30 日間の無料トライアルが終了しました（手動編集は永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI 全日程プランニングが使えます。',
      fullItineraryFailed: '全日程の生成に失敗しました',
      aiNoStopsReturned: '有効なスポットが返されませんでした。再試行してください',
      fullItineraryDaySummary: (d) => `Day ${d} を予算と徒歩圏ルートで編成しました。`,
      plannedFullItineraryToast: (days) =>
        `D1–D${days} の全日程を予算に合わせて自動作成しました`,
      paywallAiSmartReorder:
        '30 日間の無料トライアルが終了しました（ドラッグ並べ替えは永久無料）。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると AI スマート並び替えが使えます。',
      needTwoUnvisitedStopsToast:
        'スマート並び替えには未訪問スポットが 2 件以上必要です',
      smartReorderFailed: 'AI スマート並び替えに失敗しました',
      smartReorderOverallSummary: (cnt, days) =>
        `Day 1–Day ${days} の未訪問 ${cnt} スポットを距離と営業時間で最適化しました。`,
      smartReorderedToast: (cnt, days) =>
        `D1–D${days} の未訪問 ${cnt} スポットを最適順に並べ替えました`,
      undidSmartReorderToast: '並び替え前の全日程順序に復元しました',
      paywallLocalCard:
        '30 日間の無料トライアルが終了しました。WhatsApp / Facebook で 1 年無料 Pro コードを取得すると現地語フレーズカードを作成できます。',
      localCardFailed: 'フレーズカードの生成に失敗しました',
      updatedExpenseReopenedToast: (t) =>
        `「${t}」を更新（金額・割合変更のため未精算に戻しました）`,
      updatedExpenseRecalcToast: (t) =>
        `「${t}」を更新し、残高と割り勘を再計算しました`,
      deletedExpenseUnlinkedToast: (t) =>
        `「${t}」を削除（ウォレット復元・スポット未記帳へ）`,
      deletedExpenseRolledBackToast: (t) =>
        `「${t}」を削除し、残高を元に戻しました`,
      vatStatusUpdatedToast: (lbl) => `免税ステータスを「${lbl}」に更新`,
      budgetLimitsSavedToast: '全体予算と為替レート設定を保存しました',
      walletCash: '現金ウォレット',
      walletCard: 'クレジットカード',
      walletToppedUpToast: (acct, amt) => `${acct}に +${amt} 補充しました`,
      walletCalibratedToast: (acct) => `${acct}残高を更新しました`,
      convertedGroupSplitToast: (n) => `${n} 人の均等割りに変更しました`,
      converted5050SplitToast: '50:50 の割り勘に変更し残高を更新しました',
      convertedRatioSplitToast: (me, partner) =>
        `割合指定に変更（自分 ${me}% : 同行 ${partner}%）`,
      settledUpToast: '精算残高をゼロにし、履歴に保存しました',
      bannerViewStop: '行程を見る',
      bannerOpenPacking: 'リストを見る',
      bannerSnooze15m: '15 分延期',
      displayCurrencySetToast: (lbl) => `表示通貨を ${lbl} に変更しました`,
      paywallCreateCloudRoom:
        '30 日間の無料トライアルが終了しました。WhatsApp / Facebook で 1 年無料 Pro コードを取得するとクラウド共有ルームを作成できます。',
    },
  });
}

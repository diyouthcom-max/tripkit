import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2 } from 'lucide-react';
import type { AppLanguage } from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';

interface ExpertAuditModalProps {
  open: boolean;
  onClose: () => void;
}

const AUDIT_ITEMS: Partial<
  Record<AppLanguage, Array<{ title: string; before: string; after: string }>>
> = {
  'zh-CN': [
    {
      title: '01. 打通「行程配置 → 清单/预算/时间线」孤岛',
      before: '原版引导页选东京或 15 天，第 3–5 步仍硬编码输出巴黎 5 天数据，主应用与引导页割裂。',
      after: '接入 Gemini 结构化行程引擎，按城市动线、洗衣周期封顶胶囊衣橱件数，并实时替换天气、插头、币种与首日时间线。',
    },
    {
      title: '02. 修复「欧盟最后一站离境退税」逻辑自相矛盾',
      before: '标题写巴黎 & 阿姆斯特丹，说明写 Schiphol 退税，但财务页卡片却写戴高乐机场 CDG PABLO 机器。',
      after: '根据多城路径末尾城市自动判定退税盖章机场（巴黎购物 → 阿姆斯特丹 AMS 离境盖章），避免市区现金退税汇率折损。',
    },
    {
      title: '03. 预算三口径分离（避免购物冲爆今日餐费环）',
      before: '老佛爷 €128 围巾直接算入今日 €120 日常预算，导致当天剩余瞬间归零，且语音/OCR 入账未扣减账户与 AA。',
      after: '严格区分「已付机酒」「日常食行」「大额购物与退税」三口径，且每笔 AI/拍照/手动记账原子同步现金、信用卡与 AA 余额。',
    },
    {
      title: '04. 修正伪空间聚簇与错位防雨替换',
      before: '3e→9e→7e→11e 跨四区折返却提示「步行 8 分钟已聚簇」；15:00 下雨提醒却去替换 12:30 午餐市集；顺延按钮无事件绑定。',
      after: '诚实评估跨区折返耗时，AI 一键重排减少折返；防雨预案精准替换 15:00 后户外节点；顺延触发打烊时间碰撞告警。',
    },
    {
      title: '05. 真正的多模态 AI 落地而非静态弹窗',
      before: '语音、OCR 永远固定入账 Paul Bert €38.40，给司机看仅有固定法语模板。',
      after: '接入服务端 Gemini 多模态引擎：支持真实小票图片拍照 OCR、任意自然语言记账拆账，以及按城市生成的本地沟通卡。',
    },
  ],
  'en-US': [
    {
      title: '01. Unified "Trip Setup → Packing / Budget / Timeline" Engine',
      before: 'Legacy setup steps ignored destination & duration picks and fell back to static 5-day Paris data.',
      after: 'Structured Gemini planner scales capsule wardrobe quantities by laundry cycle and updates weather, plug types, currencies, and day-by-day stops automatically.',
    },
    {
      title: '02. Accurate Final-EU-Exit Tax-Free Airport Detection',
      before: 'Multi-city Paris & Amsterdam routes showed Schiphol in headers while budget cards still pointed to CDG PABLO kiosks.',
      after: 'Exit customs station is automatically inferred from the final EU departure city (e.g., AMS Schiphol for Paris → Amsterdam) to protect tax-free refund rates.',
    },
    {
      title: '03. Three-Bucket Budget Isolation (Prepaid / Daily / Shopping)',
      before: 'A €128 scarf purchase wiped out the €120 daily meal budget ring, and quick entries skipped wallet & split balances.',
      after: 'Separates Prepaid Stays/Flights, Daily Dining & Transit, and Shopping/Tax-Free pools while atomically updating cash, card, transit, and split balances.',
    },
    {
      title: '04. Honest Route Clustering & Targeted Rain Backups',
      before: 'Zigzagging across four districts falsely claimed "8 min walk" and swapped a 12:30 lunch spot for 15:00 rain.',
      after: 'Evaluates cross-district backtracking honestly, optimizes stop order with AI, swaps only afternoon outdoor stops on rain, and flags closing-time conflicts.',
    },
    {
      title: '05. Live Multimodal AI Execution Instead of Static Mocks',
      before: 'Receipt scans and voice actions always returned a static mock meal and a single fixed driver card.',
      after: 'Real server-side Gemini processing supports live receipt OCR, natural-language expense splitting, and destination-aware local driver phrase cards.',
    },
  ],
  'en-GB': [
    {
      title: '01. Unified "Journey Setup → Kit / Finance / Programme" Engine',
      before: 'Legacy setup steps ignored destination & duration selections and fell back to static 5-day Paris data.',
      after: 'Structured Gemini planner scales capsule wardrobe quantities by laundry cycle and refreshes weather, sockets, currencies, and daily stops automatically.',
    },
    {
      title: '02. Accurate Final-EU-Exit VAT Customs Detection',
      before: 'Multi-city Paris & Amsterdam routes showed Schiphol in headers while finance cards still pointed to CDG PABLO kiosks.',
      after: 'Exit customs desk is inferred from the final EU departure city (e.g., AMS Schiphol for Paris → Amsterdam) so VAT refund forms are stamped correctly.',
    },
    {
      title: '03. Three-Bucket Budget Isolation (Prepaid / Daily / Shopping)',
      before: 'A €128 department-store scarf wiped out the €120 daily meal ring, and quick logs skipped wallet & split balances.',
      after: 'Separates Prepaid Travel, Daily Dining & Transit, and Shopping/VAT pools while atomically updating cash, card, transit, and split balances.',
    },
    {
      title: '04. Honest Route Clustering & Targeted Wet-Weather Backups',
      before: 'Zigzagging across four districts falsely claimed "8 min walk" and swapped a 12:30 lunch stop for 15:00 rain.',
      after: 'Assesses cross-district backtracking honestly, optimises stop order with AI, swaps afternoon outdoor stops in rain, and alerts on closing-time clashes.',
    },
    {
      title: '05. Live Multimodal AI Execution Instead of Static Mocks',
      before: 'Receipt scans and voice actions always returned a static mock meal and a single fixed driver card.',
      after: 'Real server-side Gemini processing supports live receipt OCR, natural-language expense splitting, and destination-aware local phrase cards.',
    },
  ],
};

export const ExpertAuditModal: React.FC<ExpertAuditModalProps> = ({ open, onClose }) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');

  if (!open) return null;

  const items = AUDIT_ITEMS[activeLang] || AUDIT_ITEMS['en-US']!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center tk-bg-ink-soft p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border tk-bc-hair shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b tk-bc-hair">
          <div>
            <h2 className="text-base font-bold tk-text-ink">
              {activeLang === 'zh-CN'
                ? '长期旅行专家 × AI 产品优化对照'
                : activeLang === 'en-GB'
                ? 'Long-Haul Travel Specialist × AI Architecture Notes'
                : 'Long-Term Travel Specialist × AI Architecture Notes'}
            </h2>
            <p className="text-xs tk-text-ink2 mt-0.5">
              {activeLang === 'zh-CN'
                ? '针对原 HTML 原型中 5 处真实业务漏洞与 AI 交互的落地升级'
                : '5 core workflow fixes & live multimodal upgrades across packing, routing, and expense splitting'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={activeLang === 'zh-CN' ? '关闭' : 'Close'}
            className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-paper cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto divide-y tk-divide-hair space-y-4">
          {items.map((item) => (
            <div key={item.title} className="pt-4 first:pt-0 space-y-1.5">
              <h3 className="text-sm font-bold tk-text-forest">{item.title}</h3>
              <p className="text-xs tk-text-ink2">
                <strong className="tk-text-danger">
                  {activeLang === 'zh-CN' ? '原版问题：' : 'Previous issue: '}
                </strong>
                {item.before}
              </p>
              <p className="text-xs tk-text-ink flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 tk-text-forest shrink-0 mt-0.5" />
                <span>
                  <strong>{activeLang === 'zh-CN' ? '已优化：' : 'Upgraded: '}</strong>
                  {item.after}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


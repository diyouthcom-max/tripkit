import type { AppLanguage, VatDocStatus } from '../../types';
import { pickLang } from '../langHelper';

export interface TravelerWalletCopy {
  boardTitleSuffix: string;
  boardFallbackTitle: (days: number) => string;
  fixedPrepaidLabel: string;
  fixedPrepaidSub: string;
  todayLiquidTitle: (day: number) => string;
  plannedLabel: (amountWithCode: string) => string;
  usedPctLabel: (pct: number) => string;
  overBudgetPctLabel: string;
  rolloverBonusHint: (amount: string) => string;
  rolloverDeficitHint: (amount: string) => string;
  assetsDistributionTitle: string;
  cashOnHandLabel: string;
  cardChargedLabel: string;
  transitPassLabel: string;
  cardBillRefTag: string;
  vatRefundablePct: (pct: number) => string;
  vatEnvelopeLabel: (
    program: string,
    status: VatDocStatus,
    refundPct: number
  ) => string;
  vatPoolCardTitle: string;
  analyticsSectionTitle: string;
  toggleAnalyticsExpand: string;
  toggleAnalyticsCollapse: string;
}

export interface DestinationVatMeta {
  supportsVat: boolean;
  programName: string;
  refundPct: number;
}

/**
 * Dynamically identifies the destination's VAT/Tax-Free system instead of hardcoding PABLO.
 * Returns supportsVat: false for destinations without nationwide departure VAT refunds (e.g., US).
 */
export function resolveDestinationVatMeta(params: {
  currencyCode: string;
  vatThresholdLocal: number;
  vatRefundRate: number;
  vatExitAirport?: string;
  cities?: string[];
  lang: AppLanguage;
}): DestinationVatMeta {
  const code = (params.currencyCode || '').trim().toUpperCase();
  const refundPct = Math.round((params.vatRefundRate || 0) * 100);
  const combined = `${(params.cities || []).join(' ')} ${params.vatExitAirport || ''}`.toLowerCase();

  // US trips (USD) generally have no nationwide departure VAT refund
  const isUsTrip =
    code === 'USD' &&
    !/paris|tokyo|seoul|singapore|london|rome|milan|madrid|barcelona|amsterdam|berlin|munich|zurich|bangkok/i.test(
      combined
    );

  if (isUsTrip || params.vatThresholdLocal <= 0 || refundPct <= 0) {
    return {
      supportsVat: false,
      programName: 'Tax-Free',
      refundPct: Math.max(0, refundPct),
    };
  }

  // France -> PABLO
  if (
    /paris|巴黎|nice|尼斯|lyon|里昂|marseille|马赛|bordeaux|波尔多|cdg|ory|nce|pablo/i.test(
      combined
    )
  ) {
    return { supportsVat: true, programName: 'PABLO', refundPct };
  }

  // Japan -> Tax-Free
  if (
    code === 'JPY' ||
    /tokyo|东京|kyoto|京都|osaka|大阪|sapporo|札幌|hokkaido|北海道|okinawa|冲绳|fukuoka|福冈|nrt|hnd|kix/i.test(
      combined
    )
  ) {
    return { supportsVat: true, programName: 'Tax-Free', refundPct };
  }

  // Singapore -> eTRS
  if (code === 'SGD' || /singapore|新加坡|changi|sin\b/i.test(combined)) {
    return { supportsVat: true, programName: 'eTRS', refundPct };
  }

  // Spain -> DIVA
  if (/madrid|马德里|barcelona|巴塞罗那|seville|塞维利亚|mad|bcn|diva/i.test(combined)) {
    return { supportsVat: true, programName: 'DIVA', refundPct };
  }

  // Italy -> OTELLO
  if (/rome|罗马|milan|米兰|florence|佛罗伦萨|venice|威尼斯|fco|mxp|otello/i.test(combined)) {
    return { supportsVat: true, programName: 'OTELLO', refundPct };
  }

  // Default international VAT program
  const genericProgram = pickLang(params.lang, {
    'zh-CN': '退税单',
    'en-US': 'Tax-Free',
    'es-MX': 'Tax-Free',
    'fr-FR': 'Détaxe',
    'de-DE': 'Tax-Free',
    'pt-BR': 'Tax-Free',
    'ja-JP': '免税',
  });
  return { supportsVat: true, programName: genericProgram, refundPct };
}

export function getTravelerWalletCopy(lang: AppLanguage | string | undefined): TravelerWalletCopy {
  return pickLang<TravelerWalletCopy>(lang, {
    'zh-CN': {
      boardTitleSuffix: '财务看板',
      boardFallbackTitle: (days) => `${days} 日旅人钱包`,
      fixedPrepaidLabel: '固定行前预付',
      fixedPrepaidSub: '机票+酒店，不占今日额度',
      todayLiquidTitle: (day) => `今日可用流动金 (Day ${day})`,
      plannedLabel: (amountWithCode) => `计划 ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% 已用`,
      overBudgetPctLabel: '已超额',
      rolloverBonusHint: (amount) => `含前日结余 +${amount}`,
      rolloverDeficitHint: (amount) => `扣减前日超支 -${amount}`,
      assetsDistributionTitle: '资产分布',
      cashOnHandLabel: '实体当地现钞',
      cardChargedLabel: '信用卡已刷',
      transitPassLabel: '交通卡余额',
      cardBillRefTag: '卡账参考',
      vatRefundablePct: (pct) => `可退 ${pct}%`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? '海关已盖章'
            : status === 'form_ready'
            ? '退税单已归档'
            : '待开退税单';
        const prefix = program && program !== '退税单' ? `${program} / ` : '';
        return `${prefix}${st}${pct > 0 ? ` (可退 ${pct}%)` : ''}`;
      },
      vatPoolCardTitle: '免税购物与退税追踪',
      analyticsSectionTitle: '消费趋势与退税汇总',
      toggleAnalyticsExpand: '展开趋势图',
      toggleAnalyticsCollapse: '收起趋势图',
    },
    'en-US': {
      boardTitleSuffix: 'Wallet',
      boardFallbackTitle: (days) => `${days}-Day Travel Wallet`,
      fixedPrepaidLabel: 'Fixed Prepaid',
      fixedPrepaidSub: 'Flights & stays · excl. from daily cap',
      todayLiquidTitle: (day) => `Today’s Liquid Cash (Day ${day})`,
      plannedLabel: (amountWithCode) => `Plan ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% used`,
      overBudgetPctLabel: 'Over cap',
      rolloverBonusHint: (amount) => `Incl. rollover +${amount}`,
      rolloverDeficitHint: (amount) => `After prior overage -${amount}`,
      assetsDistributionTitle: 'Assets',
      cashOnHandLabel: 'Cash on hand',
      cardChargedLabel: 'Card charged',
      transitPassLabel: 'Transit pass',
      cardBillRefTag: 'Card est.',
      vatRefundablePct: (pct) => `${pct}% back`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Customs Stamped'
            : status === 'form_ready'
            ? 'Tax Form Filed'
            : 'Tax Form Pending';
        return `${program} · ${st}${pct > 0 ? ` (${pct}% back)` : ''}`;
      },
      vatPoolCardTitle: 'Shopping & Tax-Free Pool',
      analyticsSectionTitle: 'Daily Spend Trend & Tax-Free',
      toggleAnalyticsExpand: 'Show chart',
      toggleAnalyticsCollapse: 'Hide chart',
    },
    'en-GB': {
      boardTitleSuffix: 'Wallet',
      boardFallbackTitle: (days) => `${days}-Day Travel Wallet`,
      fixedPrepaidLabel: 'Fixed Prepaid',
      fixedPrepaidSub: 'Flights & stays · excl. from daily cap',
      todayLiquidTitle: (day) => `Today’s Spending Cash (Day ${day})`,
      plannedLabel: (amountWithCode) => `Plan ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% spent`,
      overBudgetPctLabel: 'Over cap',
      rolloverBonusHint: (amount) => `Incl. rollover +${amount}`,
      rolloverDeficitHint: (amount) => `After prior overspend -${amount}`,
      assetsDistributionTitle: 'Balances',
      cashOnHandLabel: 'Cash on hand',
      cardChargedLabel: 'Card spent',
      transitPassLabel: 'Travel card',
      cardBillRefTag: 'Card est.',
      vatRefundablePct: (pct) => `${pct}% back`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Customs Stamped'
            : status === 'form_ready'
            ? 'Tax Form Filed'
            : 'Tax Form Pending';
        return `${program} · ${st}${pct > 0 ? ` (${pct}% back)` : ''}`;
      },
      vatPoolCardTitle: 'Shopping & VAT Refund',
      analyticsSectionTitle: 'Daily Spend Trend & VAT',
      toggleAnalyticsExpand: 'Show chart',
      toggleAnalyticsCollapse: 'Hide chart',
    },
    'es-MX': {
      boardTitleSuffix: 'Cartera',
      boardFallbackTitle: (days) => `Cartera de ${days} días`,
      fixedPrepaidLabel: 'Prepagado fijo',
      fixedPrepaidSub: 'Vuelos y hotel · no resta al día',
      todayLiquidTitle: (day) => `Disponible hoy (Día ${day})`,
      plannedLabel: (amountWithCode) => `Plan ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% usado`,
      overBudgetPctLabel: 'Excedido',
      rolloverBonusHint: (amount) => `Incl. saldo previo +${amount}`,
      rolloverDeficitHint: (amount) => `Menos exceso previo -${amount}`,
      assetsDistributionTitle: 'Fondos',
      cashOnHandLabel: 'Efectivo local',
      cardChargedLabel: 'Tarjeta cargada',
      transitPassLabel: 'Tarjeta metro',
      cardBillRefTag: 'Ref. tarjeta',
      vatRefundablePct: (pct) => `${pct}% devol.`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Sellado en aduana'
            : status === 'form_ready'
            ? 'Formulario guardado'
            : 'Falta formulario';
        return `${program} · ${st}${pct > 0 ? ` (${pct}%)` : ''}`;
      },
      vatPoolCardTitle: 'Compras y Tax-Free',
      analyticsSectionTitle: 'Tendencia diaria y Tax-Free',
      toggleAnalyticsExpand: 'Ver gráfico',
      toggleAnalyticsCollapse: 'Ocultar gráfico',
    },
    'fr-FR': {
      boardTitleSuffix: 'Portefeuille',
      boardFallbackTitle: (days) => `Portefeuille · ${days} j`,
      fixedPrepaidLabel: 'Prépayé fixe',
      fixedPrepaidSub: 'Vols & hôtels · hors budget du jour',
      todayLiquidTitle: (day) => `Disponible aujourd’hui (Jour ${day})`,
      plannedLabel: (amountWithCode) => `Prévu ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% utilisé`,
      overBudgetPctLabel: 'Dépassé',
      rolloverBonusHint: (amount) => `Report inclus +${amount}`,
      rolloverDeficitHint: (amount) => `Dépassement veille -${amount}`,
      assetsDistributionTitle: 'Répartition',
      cashOnHandLabel: 'Espèces locales',
      cardChargedLabel: 'Carte débitée',
      transitPassLabel: 'Pass transport',
      cardBillRefTag: 'Réf. carte',
      vatRefundablePct: (pct) => `-${pct}% TVA`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Validé douane'
            : status === 'form_ready'
            ? 'Bordereau archivé'
            : 'Bordereau à demander';
        return `${program} · ${st}${pct > 0 ? ` (${pct}%)` : ''}`;
      },
      vatPoolCardTitle: 'Achats & Détaxe',
      analyticsSectionTitle: 'Tendance & Détaxe',
      toggleAnalyticsExpand: 'Afficher courbe',
      toggleAnalyticsCollapse: 'Masquer courbe',
    },
    'de-DE': {
      boardTitleSuffix: 'Reisekasse',
      boardFallbackTitle: (days) => `${days}-Tage-Reisekasse`,
      fixedPrepaidLabel: 'Vorab bezahlt',
      fixedPrepaidSub: 'Flug & Hotel · nicht im Tageslimit',
      todayLiquidTitle: (day) => `Heute verfügbar (Tag ${day})`,
      plannedLabel: (amountWithCode) => `Plan ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% genutzt`,
      overBudgetPctLabel: 'Über Limit',
      rolloverBonusHint: (amount) => `Inkl. Übertrag +${amount}`,
      rolloverDeficitHint: (amount) => `Abzgl. Vortag -${amount}`,
      assetsDistributionTitle: 'Bestand',
      cashOnHandLabel: 'Bargeld lokal',
      cardChargedLabel: 'Karte belastet',
      transitPassLabel: 'ÖPNV-Karte',
      cardBillRefTag: 'Karten-Ref.',
      vatRefundablePct: (pct) => `${pct}% zurück`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Zoll gestempelt'
            : status === 'form_ready'
            ? 'Beleg archiviert'
            : 'Beleg ausstehend';
        return `${program} · ${st}${pct > 0 ? ` (${pct}%)` : ''}`;
      },
      vatPoolCardTitle: 'Shopping & Tax-Free',
      analyticsSectionTitle: 'Ausgabentrend & Tax-Free',
      toggleAnalyticsExpand: 'Diagramm zeigen',
      toggleAnalyticsCollapse: 'Diagramm ausblenden',
    },
    'pt-BR': {
      boardTitleSuffix: 'Carteira',
      boardFallbackTitle: (days) => `Carteira de ${days} dias`,
      fixedPrepaidLabel: 'Pré-pago fixo',
      fixedPrepaidSub: 'Voos e hotel · fora do limite diário',
      todayLiquidTitle: (day) => `Disponível hoje (Dia ${day})`,
      plannedLabel: (amountWithCode) => `Plano ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% usado`,
      overBudgetPctLabel: 'Acima',
      rolloverBonusHint: (amount) => `Incl. saldo anterior +${amount}`,
      rolloverDeficitHint: (amount) => `Após excesso anterior -${amount}`,
      assetsDistributionTitle: 'Saldo',
      cashOnHandLabel: 'Dinheiro local',
      cardChargedLabel: 'Cartão gasto',
      transitPassLabel: 'Passe transporte',
      cardBillRefTag: 'Ref. cartão',
      vatRefundablePct: (pct) => `${pct}% de volta`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? 'Carimbado'
            : status === 'form_ready'
            ? 'Formulário salvo'
            : 'Pedir formulário';
        return `${program} · ${st}${pct > 0 ? ` (${pct}%)` : ''}`;
      },
      vatPoolCardTitle: 'Compras e Tax-Free',
      analyticsSectionTitle: 'Tendência diária e Tax-Free',
      toggleAnalyticsExpand: 'Ver gráfico',
      toggleAnalyticsCollapse: 'Ocultar gráfico',
    },
    'ja-JP': {
      boardTitleSuffix: 'トラベル財布',
      boardFallbackTitle: (days) => `${days}日間トラベル財布`,
      fixedPrepaidLabel: '事前支払い済み',
      fixedPrepaidSub: '航空券・ホテル（本日の枠外）',
      todayLiquidTitle: (day) => `本日の利用可能額 (Day ${day})`,
      plannedLabel: (amountWithCode) => `予定 ${amountWithCode}`,
      usedPctLabel: (pct) => `${pct}% 使用`,
      overBudgetPctLabel: '超過',
      rolloverBonusHint: (amount) => `前日繰越 +${amount} 含む`,
      rolloverDeficitHint: (amount) => `前日超過 -${amount} 反映`,
      assetsDistributionTitle: '資産内訳',
      cashOnHandLabel: '現地現金残高',
      cardChargedLabel: 'カード利用額',
      transitPassLabel: '交通系IC残高',
      cardBillRefTag: 'カード目安',
      vatRefundablePct: (pct) => `還付 ${pct}%`,
      vatEnvelopeLabel: (program, status, pct) => {
        const st =
          status === 'stamped'
            ? '税関確認済'
            : status === 'form_ready'
            ? '免税控え保存済'
            : '免税手続き待ち';
        return `${program} · ${st}${pct > 0 ? ` (${pct}%)` : ''}`;
      },
      vatPoolCardTitle: 'ショッピング・免税管理',
      analyticsSectionTitle: '日別推移と免税まとめ',
      toggleAnalyticsExpand: 'グラフを表示',
      toggleAnalyticsCollapse: 'グラフを隠す',
    },
  });
}

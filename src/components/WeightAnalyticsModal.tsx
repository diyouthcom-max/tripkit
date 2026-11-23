import React, { useEffect, useState } from 'react';
import {
  X,
  PieChart as PieChartIcon,
  AlertTriangle,
  Luggage,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  formatTotalWeightByPref,
  formatWeightAgainstLimit,
  getBaggagePresetLabels,
  normalizeAppLanguage,
} from '../utils/preferencesHelpers';
import { AccentIconBadge } from '../utils/accentTheme';
import { translateGroupTitleLabel } from '../i18n';
import {
  getCategoryPieTooltipCopy,
  getWeightAnalyticsCopy,
} from '../i18n/packs/packingModalsPack';
import type {
  AppLanguage,
  BaggagePresetId,
  PackingGroup,
  PackingItem,
  SmartBagId,
  UnitSystem,
} from '../types';
import { isItemCarryOnWeight } from '../utils/packingHelpers';
import { tkColor } from '../utils/tkColor';

type ChartMetric = 'weight' | 'workload' | 'packed';

const GROUP_COLOR_TOKEN: Record<PackingGroup['colorKey'], string> = {
  teal: '--tk-swatch-1',
  lavender: '--tk-swatch-2',
  lemon: '--tk-swatch-3',
  peach: '--tk-swatch-4',
  rose: '--tk-swatch-3',
  mint: '--tk-swatch-2',
};

interface CategoryChartDatum {
  id: string;
  name: string;
  value: number;
  pct: number;
  doneCount: number;
  pendingCount: number;
  totalCount: number;
  weightGrams: number;
  color: string;
}

const CategoryPieTooltip: React.FC<{
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CategoryChartDatum }>;
  metric: ChartMetric;
  unitSystem: UnitSystem;
  lang: AppLanguage;
}> = ({ active, payload, metric, unitSystem, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const tipCopy = getCategoryPieTooltipCopy(lang);

  return (
    <div className="rounded-xl border tk-bc-hair bg-white px-3.5 py-2.5 shadow-lg text-xs space-y-1">
      <div className="font-bold tk-text-ink">{d.name}</div>
      <div className="flex items-center justify-between gap-4 tk-text-ink2">
        <span>
          {metric === 'packed'
            ? tipCopy.packedItems
            : metric === 'workload'
            ? tipCopy.totalItems
            : tipCopy.categoryWeight}
        </span>
        <span className="font-num font-bold tk-text-ink tabular-nums">
          {metric === 'weight'
            ? formatTotalWeightByPref(d.weightGrams, unitSystem)
            : tipCopy.countText(d.value)}{' '}
          ({d.pct}%)
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 tk-text-ink2 border-t tk-bc-hair pt-1">
        <span>{tipCopy.progressLabel}</span>
        <span className="font-num tabular-nums">
          {tipCopy.progressStats(d.doneCount, d.totalCount, d.pendingCount)}
        </span>
      </div>
    </div>
  );
};

interface WeightAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  groups: PackingGroup[];
  activeMemberId: string;
  smartBagOverrides: Record<string, SmartBagId>;
  carryOnLimitKg: number;
  checkedLimitKg: number;
  unitSystem: UnitSystem;
  baggagePreset?: BaggagePresetId;
  onSelectBaggagePreset?: (preset: Exclude<BaggagePresetId, 'custom'>) => void;
  onFocusCategory?: (groupId: string) => void;
}

export const WeightAnalyticsModal: React.FC<WeightAnalyticsModalProps> = ({
  open,
  onClose,
  groups,
  activeMemberId,
  smartBagOverrides,
  carryOnLimitKg,
  checkedLimitKg,
  unitSystem,
  baggagePreset,
  onSelectBaggagePreset,
  onFocusCategory,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getWeightAnalyticsCopy(activeLang);

  const [chartMetric, setChartMetric] = useState<ChartMetric>('weight');

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const matchesPerspective = (item: PackingItem) => {
    if (activeMemberId === 'all') return true;
    if (item.ownership === 'shared') return true;
    return (item.ownerId || 'm1') === activeMemberId;
  };

  let carryOnGrams = 0;
  let checkedGrams = 0;
  let preNightCount = 0;
  let morningCount = 0;

  groups.forEach((grp) => {
    grp.items.filter(matchesPerspective).forEach((item) => {
      if (isItemCarryOnWeight(item, grp, smartBagOverrides)) {
        carryOnGrams += item.weightGrams;
      } else {
        checkedGrams += item.weightGrams;
      }
      if (!item.done) {
        if (item.morningOfDeparture) {
          morningCount += 1;
        } else {
          preNightCount += 1;
        }
      }
    });
  });

  const carryOnKg = carryOnGrams / 1000;
  const checkedKg = checkedGrams / 1000;
  const isCarryOnOverweight = carryOnKg > carryOnLimitKg;
  const isCheckedOverweight = checkedKg > checkedLimitKg;
  const carryOnPct =
    carryOnLimitKg > 0 ? Math.min(100, Math.round((carryOnKg / carryOnLimitKg) * 100)) : 100;
  const checkedPct =
    checkedLimitKg > 0
      ? Math.min(100, Math.round((checkedKg / checkedLimitKg) * 100))
      : checkedGrams > 0
      ? 100
      : 0;
  const totalWeightFormatted = formatTotalWeightByPref(
    carryOnGrams + checkedGrams,
    unitSystem
  );

  const rawCategoryRows = groups.map((g) => {
    const scopedGrpItems = g.items.filter(matchesPerspective);
    const gDone = scopedGrpItems.filter((i) => i.done).length;
    const gTotal = scopedGrpItems.length;
    const gPending = gTotal - gDone;
    const gWeightGrams = scopedGrpItems.reduce((s, i) => s + i.weightGrams, 0);
    const rawVal =
      chartMetric === 'packed'
        ? gDone
        : chartMetric === 'workload'
        ? gTotal
        : unitSystem === 'imperial'
        ? Number((gWeightGrams * 0.00220462262).toFixed(2))
        : Number((gWeightGrams / 1000).toFixed(2));
    return {
      id: g.id,
      name: translateGroupTitleLabel(g.id, g.title, activeLang),
      value: rawVal,
      doneCount: gDone,
      pendingCount: gPending,
      totalCount: gTotal,
      weightGrams: gWeightGrams,
      color: tkColor(GROUP_COLOR_TOKEN[g.colorKey] || '--tk-swatch-1'),
    };
  });

  const metricTotal = rawCategoryRows.reduce((s, r) => s + r.value, 0);
  const categoryData: CategoryChartDatum[] = rawCategoryRows.map((r) => ({
    ...r,
    pct: metricTotal > 0 ? Math.round((r.value / metricTotal) * 100) : 0,
  }));

  const heaviestPendingGroup = [...categoryData].sort(
    (a, b) => b.weightGrams - a.weightGrams || b.pendingCount - a.pendingCount
  )[0];
  const pieSegments = categoryData.filter((d) => d.value > 0);

  return (
    <div
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogAria}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <div className="pt-2.5 pb-0.5 flex justify-center sm:hidden shrink-0">
          <span className="h-1 w-10 rounded-full tk-bg-forest-plate" />
        </div>

        {/* 1. Clean Packy-Style Header */}
        <div className="px-5 pt-3.5 pb-3 flex items-center justify-between gap-3 bg-white border-b tk-bc-hair shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <AccentIconBadge accent="teal" icon={PieChartIcon} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight tk-text-ink truncate">
                  {copy.headerTitle}
                </h2>
                <span className="inline-flex items-center rounded-full tk-bg-forest-tint px-2.5 py-0.5 font-num text-xs font-bold tk-text-forest tabular-nums shrink-0">
                  {totalWeightFormatted}
                </span>
              </div>
              <p className="text-[11px] tk-text-ink2 tabular-nums truncate">
                {t('packingExtra.preNightAndMorning', {
                  pre: preNightCount,
                  morning: morningCount,
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Scrollable Analytics Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Airline Allowance Preset Selector + Dual Quota Cards */}
          <div className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold tk-text-ink">
                {copy.quotaComparisonTitle}
              </span>
              {onSelectBaggagePreset && (
                <div className="inline-flex items-center gap-1 rounded-xl tk-bg-forest-tint p-0.5">
                  {(['lcc', 'standard', 'business'] as const).map((presetKey) => {
                    const labels = getBaggagePresetLabels(presetKey, activeLang, unitSystem);
                    const isActive = baggagePreset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => onSelectBaggagePreset(presetKey)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 isActive
 ? 'bg-white tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                      >
                        {labels.tierTitle}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Carry-On Card */}
              <div
                className={`rounded-xl border bg-white p-3 space-y-2 ${
 isCarryOnOverweight ? 'tk-bc-danger-hair' : 'tk-bc-hair'
 }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tk-text-ink">
                    <Briefcase className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                    {t('packing.carryOnLabel')}
                  </span>
                  <span
                    className={`font-num text-xs font-extrabold tabular-nums ${
 isCarryOnOverweight ? 'tk-text-danger' : 'tk-text-forest'
 }`}
                  >
                    {formatWeightAgainstLimit(carryOnGrams, carryOnLimitKg, unitSystem, 1)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full tk-bg-forest-plate">
                  <div
                    style={{ width: `${carryOnPct}%` }}
                    className={`h-full rounded-full transition-all ${
 isCarryOnOverweight ? 'tk-bg-danger' : 'tk-bg-forest'
 }`}
                  />
                </div>
                {isCarryOnOverweight && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-danger">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{copy.carryOnOverWarning}</span>
                  </div>
                )}
              </div>

              {/* Checked Bag Card */}
              <div
                className={`rounded-xl border bg-white p-3 space-y-2 ${
 isCheckedOverweight ? 'tk-bc-danger-hair' : 'tk-bc-hair'
 }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tk-text-ink">
                    <Luggage className="h-3.5 w-3.5 tk-text-ink2 shrink-0" />
                    {t('packing.checkedLabel')}
                  </span>
                  <span
                    className={`font-num text-xs font-extrabold tabular-nums ${
 isCheckedOverweight ? 'tk-text-danger' : 'tk-text-ink2'
 }`}
                  >
                    {formatWeightAgainstLimit(checkedGrams, checkedLimitKg, unitSystem, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full tk-bg-forest-plate">
                  <div
                    style={{ width: `${checkedPct}%` }}
                    className={`h-full rounded-full transition-all ${
 isCheckedOverweight ? 'tk-bg-danger' : 'tk-bg-forest'
 }`}
                  />
                </div>
                {isCheckedOverweight && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-danger">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>
                      {checkedLimitKg <= 0
                        ? copy.checkedNoAllowanceWarning
                        : copy.checkedOverWarning}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Weight Donut & Interactive Breakdown */}
          <div className="rounded-2xl border tk-bc-hair bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold tk-text-ink">
                  {t('packingExtra.chartTitle')}
                </h3>
                <p className="mt-0.5 text-xs tk-text-ink2 tabular-nums">
                  {heaviestPendingGroup && heaviestPendingGroup.weightGrams > 0
                    ? copy.heaviestCategory(
                        heaviestPendingGroup.name,
                        formatTotalWeightByPref(heaviestPendingGroup.weightGrams, unitSystem)
                      )
                    : t('packingExtra.chartAllClear')}
                </p>
              </div>

              <div className="inline-flex items-center gap-1 rounded-xl tk-bg-forest-plate p-1 shrink-0">
                {(
                  [
                    { id: 'weight' as const, label: t('packingExtra.metricWeight') },
                    { id: 'workload' as const, label: t('packingExtra.metricWorkload') },
                    { id: 'packed' as const, label: t('packingExtra.metricPacked') },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMetric(m.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 chartMetric === m.id
 ? 'bg-white tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 h-44 relative flex items-center justify-center">
                {pieSegments.length === 0 ? (
                  <div className="text-center px-4 text-xs tk-text-ink2">
                    {t('packingExtra.chartEmpty')}
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieSegments}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={68}
                          paddingAngle={2.5}
                          stroke="none"
                        >
                          {pieSegments.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={
                            <CategoryPieTooltip
                              metric={chartMetric}
                              unitSystem={unitSystem}
                              lang={activeLang}
                            />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-num text-sm font-extrabold tk-text-ink tabular-nums">
                        {chartMetric === 'weight'
                          ? `${metricTotal.toFixed(1)} ${unitSystem === 'imperial' ? 'lb' : 'kg'}`
                          : `${metricTotal}${copy.metricCountSuffix}`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="sm:col-span-7 divide-y tk-divide-hair">
                {categoryData.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      onFocusCategory?.(row.id);
                      onClose();
                    }}
                    className="w-full py-2 flex items-center justify-between gap-3 text-left hover:tk-bg-paper rounded-lg px-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="text-xs font-bold tk-text-ink truncate">
                        {row.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-num text-xs tk-text-ink2 tabular-nums">
                      <span className="font-semibold tk-text-ink">
                        {formatTotalWeightByPref(row.weightGrams, unitSystem)}
                      </span>
                      <span className="tk-text-ink2">·</span>
                      <span>
                        {row.doneCount}/{row.totalCount}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 tk-text-ink2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

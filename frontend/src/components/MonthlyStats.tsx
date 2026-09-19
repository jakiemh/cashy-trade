"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { MonthlyDashboardPoint } from "@/lib/api";
import PeriodPerformanceTable, { formatMonthLabel } from "@/components/PeriodPerformanceTable";

type MonthlyStatsProps = {
  points: MonthlyDashboardPoint[];
};

export default function MonthlyStats({ points }: MonthlyStatsProps) {
  const { t } = useLocale();

  return (
    <PeriodPerformanceTable
      points={points.map((p) => ({ ...p, period: p.month }))}
      periodColumnLabel={t("dashboard.monthColumn")}
      title={t("dashboard.monthlyTitle")}
      subtitle={t("dashboard.monthlySubtitle")}
      emptyMessage={t("dashboard.monthlyEmpty")}
      formatPeriodLabel={formatMonthLabel}
    />
  );
}

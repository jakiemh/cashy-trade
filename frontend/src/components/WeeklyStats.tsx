"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { WeeklyDashboardPoint } from "@/lib/api";
import PeriodPerformanceTable, { formatWeekLabel } from "@/components/PeriodPerformanceTable";

type WeeklyStatsProps = {
  points: WeeklyDashboardPoint[];
};

export default function WeeklyStats({ points }: WeeklyStatsProps) {
  const { t } = useLocale();

  return (
    <PeriodPerformanceTable
      points={points.map((p) => ({ ...p, period: p.week }))}
      periodColumnLabel={t("dashboard.weekColumn")}
      title={t("dashboard.weeklyTitle")}
      subtitle={t("dashboard.weeklySubtitle")}
      emptyMessage={t("dashboard.weeklyEmpty")}
      formatPeriodLabel={formatWeekLabel}
    />
  );
}

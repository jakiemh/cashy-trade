export function StatCard({
  label,
  value,
  hint,
  valueTone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  valueTone?: "brand" | "positive" | "negative" | "neutral";
}) {
  const valueClass =
    valueTone === "positive"
      ? "text-3xl font-semibold text-emerald-600"
      : valueTone === "negative"
        ? "text-3xl font-semibold text-rose-600"
        : valueTone === "neutral"
          ? "text-3xl font-semibold text-slate-800"
          : "bg-brand-gradient bg-clip-text text-3xl font-semibold text-transparent";

  return (
    <div className="glass-card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "bad" | "warn" | "neutral";
}) {
  const tones = {
    good: "bg-emerald-100 text-emerald-700",
    bad: "bg-rose-100 text-rose-700",
    warn: "bg-amber-100 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function formatMoney(value?: number | null) {
  if (value == null) return "-";
  return `$${value.toFixed(2)}`;
}

export function formatPct(value?: number | null) {
  if (value == null) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

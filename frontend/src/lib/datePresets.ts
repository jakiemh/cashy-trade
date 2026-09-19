export type DatePresetId = "thisWeek" | "thisMonth" | "last30Days";

export function formatDateInputLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfIsoWeek(date: Date): Date {
  const copy = startOfDay(date);
  const weekday = copy.getDay() || 7;
  copy.setDate(copy.getDate() - weekday + 1);
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getDatePresetRange(id: DatePresetId, now = new Date()): { from: string; to: string } {
  const today = startOfDay(now);
  const to = formatDateInputLocal(today);

  switch (id) {
    case "thisWeek":
      return { from: formatDateInputLocal(startOfIsoWeek(today)), to };
    case "thisMonth":
      return { from: formatDateInputLocal(startOfMonth(today)), to };
    case "last30Days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { from: formatDateInputLocal(start), to };
    }
  }
}

const PRESET_IDS: DatePresetId[] = ["thisWeek", "thisMonth", "last30Days"];

export function detectActiveDatePreset(
  from: string,
  to: string,
  now = new Date()
): DatePresetId | null {
  if (!from || !to) return null;
  for (const id of PRESET_IDS) {
    const range = getDatePresetRange(id, now);
    if (range.from === from && range.to === to) return id;
  }
  return null;
}

export const DATE_PRESET_IDS = PRESET_IDS;

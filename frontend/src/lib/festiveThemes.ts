export type FestiveThemeId =
  | "halloween"
  | "christmas"
  | "newyear"
  | "valentine"
  | "independence";

export type FestiveMode = "auto" | "off" | FestiveThemeId;

export type FestiveTheme = {
  id: FestiveThemeId;
  /** Inclusive month-day ranges in MM-DD (supports year wrap). */
  windows: Array<{ start: string; end: string }>;
  labelKey: string;
  emoji: string;
  particles: string[];
  particleCount: number;
  cssVars: Record<string, string>;
  appGradient: string;
  brandGradient: string;
  headerGradient: string;
  themeColor: string;
};

export const FESTIVE_STORAGE_KEY = "cashy_festive_mode";

export const FESTIVE_THEMES: FestiveTheme[] = [
  {
    id: "halloween",
    windows: [{ start: "10-20", end: "11-02" }],
    labelKey: "festive.halloween",
    emoji: "🎃",
    particles: ["🎃", "🦇", "👻", "🍁", "🕷️"],
    particleCount: 18,
    cssVars: {
      "--festive-accent": "#f97316",
      "--festive-accent-soft": "#ffedd5",
      "--festive-glow": "rgba(249, 115, 22, 0.25)",
      "--festive-ink": "#7c2d12",
    },
    appGradient: "linear-gradient(135deg, #fff7ed 0%, #fdf4ff 42%, #f3e8ff 100%)",
    brandGradient: "linear-gradient(135deg, #f97316 0%, #ea580c 45%, #7c3aed 100%)",
    headerGradient: "linear-gradient(90deg, rgba(255,247,237,0.94) 0%, rgba(243,232,255,0.9) 100%)",
    themeColor: "#fff7ed",
  },
  {
    id: "christmas",
    windows: [{ start: "12-01", end: "12-26" }],
    labelKey: "festive.christmas",
    emoji: "🎄",
    particles: ["❄️", "🎄", "⭐", "🎁", "✨"],
    particleCount: 22,
    cssVars: {
      "--festive-accent": "#dc2626",
      "--festive-accent-soft": "#fee2e2",
      "--festive-glow": "rgba(22, 163, 74, 0.22)",
      "--festive-ink": "#14532d",
    },
    appGradient: "linear-gradient(135deg, #ecfdf5 0%, #fef2f2 48%, #eff6ff 100%)",
    brandGradient: "linear-gradient(135deg, #16a34a 0%, #15803d 40%, #dc2626 100%)",
    headerGradient: "linear-gradient(90deg, rgba(236,253,245,0.94) 0%, rgba(254,242,242,0.9) 100%)",
    themeColor: "#ecfdf5",
  },
  {
    id: "newyear",
    windows: [
      { start: "12-27", end: "12-31" },
      { start: "01-01", end: "01-03" },
    ],
    labelKey: "festive.newyear",
    emoji: "🎆",
    particles: ["✨", "🎉", "🥂", "⭐", "💫"],
    particleCount: 24,
    cssVars: {
      "--festive-accent": "#eab308",
      "--festive-accent-soft": "#fef9c3",
      "--festive-glow": "rgba(234, 179, 8, 0.28)",
      "--festive-ink": "#713f12",
    },
    appGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
    brandGradient: "linear-gradient(135deg, #eab308 0%, #f59e0b 45%, #a855f7 100%)",
    headerGradient: "linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(49,46,129,0.9) 100%)",
    themeColor: "#0f172a",
  },
  {
    id: "valentine",
    windows: [{ start: "02-08", end: "02-15" }],
    labelKey: "festive.valentine",
    emoji: "💖",
    particles: ["💖", "💘", "✨", "🌹", "💕"],
    particleCount: 16,
    cssVars: {
      "--festive-accent": "#e11d48",
      "--festive-accent-soft": "#ffe4e6",
      "--festive-glow": "rgba(225, 29, 72, 0.22)",
      "--festive-ink": "#9f1239",
    },
    appGradient: "linear-gradient(135deg, #fff1f2 0%, #fdf2f8 45%, #faf5ff 100%)",
    brandGradient: "linear-gradient(135deg, #e11d48 0%, #db2777 50%, #c026d3 100%)",
    headerGradient: "linear-gradient(90deg, rgba(255,241,242,0.94) 0%, rgba(253,242,248,0.9) 100%)",
    themeColor: "#fff1f2",
  },
  {
    id: "independence",
    windows: [{ start: "09-12", end: "09-16" }],
    labelKey: "festive.independence",
    emoji: "🇨🇷",
    particles: ["🇨🇷", "⭐", "💙", "❤️", "✨"],
    particleCount: 14,
    cssVars: {
      "--festive-accent": "#1d4ed8",
      "--festive-accent-soft": "#dbeafe",
      "--festive-glow": "rgba(29, 78, 216, 0.2)",
      "--festive-ink": "#1e3a8a",
    },
    appGradient: "linear-gradient(135deg, #eff6ff 0%, #fff1f2 50%, #eff6ff 100%)",
    brandGradient: "linear-gradient(135deg, #1d4ed8 0%, #ffffff 50%, #dc2626 100%)",
    headerGradient: "linear-gradient(90deg, rgba(239,246,255,0.94) 0%, rgba(255,241,242,0.9) 100%)",
    themeColor: "#eff6ff",
  },
];

function parseMd(md: string): { month: number; day: number } {
  const [m, d] = md.split("-").map(Number);
  return { month: m, day: d };
}

function toOrdinal(month: number, day: number): number {
  return month * 100 + day;
}

export function isDateInWindow(date: Date, start: string, end: string): boolean {
  const ordinal = toOrdinal(date.getMonth() + 1, date.getDate());
  const a = toOrdinal(parseMd(start).month, parseMd(start).day);
  const b = toOrdinal(parseMd(end).month, parseMd(end).day);
  if (a <= b) return ordinal >= a && ordinal <= b;
  // wraps year (e.g. Dec 27 – Jan 3)
  return ordinal >= a || ordinal <= b;
}

export function getThemeById(id: FestiveThemeId | null | undefined): FestiveTheme | null {
  if (!id) return null;
  return FESTIVE_THEMES.find((theme) => theme.id === id) ?? null;
}

export function detectFestiveTheme(date: Date = new Date()): FestiveTheme | null {
  for (const theme of FESTIVE_THEMES) {
    if (theme.windows.some((w) => isDateInWindow(date, w.start, w.end))) {
      return theme;
    }
  }
  return null;
}

export function resolveFestiveTheme(mode: FestiveMode, date: Date = new Date()): FestiveTheme | null {
  if (mode === "off") return null;
  if (mode === "auto") return detectFestiveTheme(date);
  return getThemeById(mode);
}

export function readFestiveMode(): FestiveMode {
  if (typeof window === "undefined") return "auto";
  const raw = localStorage.getItem(FESTIVE_STORAGE_KEY);
  if (!raw || raw === "auto") return "auto";
  if (raw === "off") return "off";
  if (FESTIVE_THEMES.some((theme) => theme.id === raw)) return raw as FestiveThemeId;
  return "auto";
}

export function writeFestiveMode(mode: FestiveMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FESTIVE_STORAGE_KEY, mode);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FESTIVE_THEMES,
  FestiveMode,
  FestiveTheme,
  readFestiveMode,
  resolveFestiveTheme,
  writeFestiveMode,
} from "@/lib/festiveThemes";

type FestiveThemeContextValue = {
  mode: FestiveMode;
  setMode: (mode: FestiveMode) => void;
  theme: FestiveTheme | null;
  autoTheme: FestiveTheme | null;
  themes: FestiveTheme[];
  reducedMotion: boolean;
};

const FestiveThemeContext = createContext<FestiveThemeContextValue | null>(null);

export function FestiveThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FestiveMode>("auto");
  const [now, setNow] = useState(() => new Date());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setModeState(readFestiveMode());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);

    // Refresh at local midnight so themes flip without reload.
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    return () => {
      media.removeEventListener("change", syncMotion);
      window.clearInterval(id);
    };
  }, []);

  const setMode = useCallback((next: FestiveMode) => {
    setModeState(next);
    writeFestiveMode(next);
  }, []);

  const autoTheme = useMemo(() => resolveFestiveTheme("auto", now), [now]);
  const theme = useMemo(() => resolveFestiveTheme(mode, now), [mode, now]);

  useEffect(() => {
    const root = document.documentElement;
    if (!theme) {
      root.removeAttribute("data-festive");
      root.classList.remove("festive-dark");
      Object.keys(FESTIVE_THEMES[0].cssVars).forEach((key) => root.style.removeProperty(key));
      root.style.removeProperty("--festive-app-gradient");
      root.style.removeProperty("--festive-brand-gradient");
      root.style.removeProperty("--festive-header-gradient");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#ecfdf5");
      return;
    }

    root.setAttribute("data-festive", theme.id);
    root.classList.toggle("festive-dark", theme.id === "newyear");
    Object.entries(theme.cssVars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.style.setProperty("--festive-app-gradient", theme.appGradient);
    root.style.setProperty("--festive-brand-gradient", theme.brandGradient);
    root.style.setProperty("--festive-header-gradient", theme.headerGradient);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.themeColor);
  }, [theme]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      theme,
      autoTheme,
      themes: FESTIVE_THEMES,
      reducedMotion,
    }),
    [mode, setMode, theme, autoTheme, reducedMotion]
  );

  return <FestiveThemeContext.Provider value={value}>{children}</FestiveThemeContext.Provider>;
}

export function useFestiveTheme() {
  const ctx = useContext(FestiveThemeContext);
  if (!ctx) throw new Error("useFestiveTheme must be used within FestiveThemeProvider");
  return ctx;
}

export function useOptionalFestiveTheme() {
  return useContext(FestiveThemeContext);
}

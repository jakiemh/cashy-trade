"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { detectBrowserLocale, normalizeLocale, translate, type Locale } from "@/lib/i18n";
import { api, getToken } from "@/lib/api";

const STORAGE_KEY = "cashy_locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isAdmin: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function withVars(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text
  );
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [isAdmin, setIsAdmin] = useState(false);

  const messages = locale === "en" ? en : es;

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const initial = normalizeLocale(stored || detectBrowserLocale());
    setLocale(initial);

    if (!getToken()) return;

    Promise.all([api.getSettings(), api.me()])
      .then(([settings, user]) => {
        setLocale(normalizeLocale(settings.locale));
        setIsAdmin(Boolean(user.is_admin));
      })
      .catch(() => {
        // keep local locale
      });

    function onSettingsUpdated() {
      api.getSettings().then((settings) => setLocale(normalizeLocale(settings.locale)));
    }

    window.addEventListener("cashy-settings-updated", onSettingsUpdated);
    return () => window.removeEventListener("cashy-settings-updated", onSettingsUpdated);
  }, [setLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      withVars(translate(messages, key), vars),
    [messages]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, isAdmin }),
    [locale, setLocale, t, isAdmin]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function useOptionalLocale() {
  return useContext(LocaleContext);
}

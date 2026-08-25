export type Locale = "es" | "en";

export type Messages = typeof import("./es").es;

export function translate(messages: Messages, key: string): string {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().startsWith("en") ? "en" : "es";
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "es";
  return normalizeLocale(navigator.language);
}

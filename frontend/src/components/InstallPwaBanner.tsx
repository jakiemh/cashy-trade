"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cashy-pwa-install-dismissed";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPwaBanner() {
  const { t } = useLocale();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installApp() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setPromptEvent(null);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible || !promptEvent) return null;

  return (
    <div className="mx-auto mb-4 max-w-6xl px-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{t("pwa.installTitle")}</p>
          <p className="text-xs text-muted">{t("pwa.installSubtitle")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={dismiss}>
            {t("pwa.later")}
          </button>
          <button type="button" className="btn-primary px-3 py-2 text-sm" onClick={() => void installApp()}>
            {t("pwa.install")}
          </button>
        </div>
      </div>
    </div>
  );
}

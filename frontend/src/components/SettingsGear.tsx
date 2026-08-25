"use client";

import { useEffect, useState } from "react";
import SettingsPanel from "@/components/SettingsPanel";
import { useClientAuth } from "@/hooks/useClientAuth";
import { useLocale } from "@/contexts/LocaleContext";

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 13.5a7.8 7.8 0 0 0 .1-3l2-1.1-2-3.5-2.3 1a8 8 0 0 0-2.6-1.5l-.4-2.5H9.8l-.4 2.5a8 8 0 0 0-2.6 1.5l-2.3-1-2 3.5 2 1.1a7.8 7.8 0 0 0 .1 3l-2 1.1 2 3.5 2.3-1a8 8 0 0 0 2.6 1.5l.4 2.5h4.4l.4-2.5a8 8 0 0 0 2.6-1.5l2.3 1 2-3.5-2-1.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SettingsGear() {
  const [open, setOpen] = useState(false);
  const { ready, authed } = useClientAuth();
  const { t } = useLocale();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!ready || !authed) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Configuración"
        className="floating-action floating-action-left flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white/95 text-slate-600 shadow-xl shadow-emerald-200/50 transition hover:border-brand-400 hover:text-brand-600 active:scale-95"
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Cerrar configuración"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-emerald-100 bg-white/95 shadow-2xl shadow-emerald-200/40 backdrop-blur-xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-white to-emerald-50 px-4 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{t("settings.title")}</h2>
                <p className="text-xs text-muted">{t("settings.subtitle")}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 hover:bg-emerald-50 hover:text-slate-700"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SettingsPanel compact onSaved={() => setTimeout(() => setOpen(false), 600)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

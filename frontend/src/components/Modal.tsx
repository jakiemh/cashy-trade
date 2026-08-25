"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ open, title, subtitle, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-emerald-100 bg-white/95 shadow-2xl shadow-emerald-200/40 backdrop-blur-xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-white to-emerald-50 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            className="rounded-full p-2 text-slate-400 hover:bg-emerald-50 hover:text-slate-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

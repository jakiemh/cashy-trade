"use client";

import { useEffect, useRef } from "react";
import { Signal, api } from "@/lib/api";

export const POLL_MS = 30_000;

export function notifyNewSignals(signals: Signal[]) {
  if (typeof window === "undefined" || !signals.length) return;
  const title = signals.length === 1 ? "Nueva señal del bot" : `${signals.length} señales nuevas`;
  const body = signals
    .slice(0, 3)
    .map((signal) => {
      const prefix = signal.bot_executed === false ? "Ref · " : "";
      return `${prefix}${signal.type} ${signal.symbol}`;
    })
    .join(" · ");

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/cashy/cashy-hoodie.jpg" });
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body, icon: "/cashy/cashy-hoodie.jpg" });
      }
    });
  }
}

/** @deprecated Prefer useSignalPollingContext().subscribe in AppShell-backed pages. */
export function useSignalPolling(onNewSignals: (signals: Signal[]) => void, enabled = true) {
  const sinceRef = useRef<string | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function poll(isInitial: boolean) {
      try {
        const params = sinceRef.current ? { since: sinceRef.current } : undefined;
        const incoming = await api.signals(params);
        if (cancelled) return;

        if (isInitial) {
          incoming.forEach((signal) => knownIdsRef.current.add(signal.id));
          if (incoming[0]) {
            sinceRef.current = incoming[0].timestamp;
          }
          return;
        }

        const fresh = incoming.filter((signal) => !knownIdsRef.current.has(signal.id));
        if (fresh.length) {
          fresh.forEach((signal) => knownIdsRef.current.add(signal.id));
          sinceRef.current = fresh[0].timestamp;
          notifyNewSignals(fresh);
          onNewSignals(fresh);
        }
      } catch {
        // ignore polling errors
      }
    }

    poll(true);
    const timer = window.setInterval(() => poll(false), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, onNewSignals]);
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Signal, api, getToken } from "@/lib/api";
import { notifyNewSignals, requestNotificationPermission } from "@/hooks/useSignalPolling";

const POLL_VISIBLE_MS = 15_000;
const POLL_HIDDEN_MS = 45_000;

type SignalPollingContextValue = {
  pendingCount: number;
  clearPending: () => void;
  notifyEnabled: boolean;
  enableNotifications: () => Promise<boolean>;
  subscribe: (listener: (signals: Signal[]) => void) => () => void;
};

const SignalPollingContext = createContext<SignalPollingContextValue | null>(null);

export function SignalPollingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const sinceRef = useRef<string | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const listenersRef = useRef(new Set<(signals: Signal[]) => void>());

  const subscribe = useCallback((listener: (signals: Signal[]) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const clearPending = useCallback(() => setPendingCount(0), []);

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setNotifyEnabled(granted);
    return granted;
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/signals")) {
      clearPending();
    }
  }, [pathname, clearPending]);

  useEffect(() => {
    if (!getToken()) {
      sinceRef.current = null;
      knownIdsRef.current = new Set();
      setPendingCount(0);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function poll(isInitial: boolean) {
      if (!getToken()) return;
      try {
        const params = sinceRef.current ? { since: sinceRef.current } : undefined;
        const incoming = await api.signals(params);
        if (cancelled) return;

        if (isInitial) {
          incoming.forEach((signal) => knownIdsRef.current.add(signal.id));
          if (incoming[0]) sinceRef.current = incoming[0].timestamp;
          return;
        }

        const fresh = incoming.filter((signal) => !knownIdsRef.current.has(signal.id));
        if (!fresh.length) return;

        fresh.forEach((signal) => knownIdsRef.current.add(signal.id));
        sinceRef.current = fresh[0].timestamp;
        setPendingCount((count) => count + fresh.length);
        if (notifyEnabled) notifyNewSignals(fresh);
        listenersRef.current.forEach((listener) => listener(fresh));
      } catch {
        // ignore transient polling errors
      }
    }

    function scheduleNext(delay: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await poll(false);
        if (!cancelled) {
          scheduleNext(document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
        }
      }, delay);
    }

    poll(true).then(() => {
      if (!cancelled) scheduleNext(POLL_VISIBLE_MS);
    });

    function onVisibilityChange() {
      if (cancelled) return;
      scheduleNext(document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [notifyEnabled, pathname]);

  const value = useMemo(
    () => ({ pendingCount, clearPending, notifyEnabled, enableNotifications, subscribe }),
    [pendingCount, clearPending, notifyEnabled, enableNotifications, subscribe]
  );

  return <SignalPollingContext.Provider value={value}>{children}</SignalPollingContext.Provider>;
}

export function useSignalPollingContext() {
  const ctx = useContext(SignalPollingContext);
  if (!ctx) throw new Error("useSignalPollingContext must be used within SignalPollingProvider");
  return ctx;
}

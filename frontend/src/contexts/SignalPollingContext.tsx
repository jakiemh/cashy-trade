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
import { buildSignalsWebSocketUrl, registerServiceWorker, subscribeToPush } from "@/lib/push";

const POLL_MS = 5_000;

type SignalPollingContextValue = {
  pendingCount: number;
  clearPending: () => void;
  notifyEnabled: boolean;
  wsConnected: boolean;
  enableNotifications: () => Promise<boolean>;
  subscribe: (listener: (signals: Signal[]) => void) => () => void;
};

const SignalPollingContext = createContext<SignalPollingContextValue | null>(null);

export function SignalPollingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const sinceRef = useRef<string | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const listenersRef = useRef(new Set<(signals: Signal[]) => void>());
  const wsRef = useRef<WebSocket | null>(null);

  const subscribe = useCallback((listener: (signals: Signal[]) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const clearPending = useCallback(() => setPendingCount(0), []);

  const dispatchFresh = useCallback(
    (fresh: Signal[], fromPush = false) => {
      if (!fresh.length) return;
      fresh.forEach((signal) => knownIdsRef.current.add(signal.id));
      sinceRef.current = fresh[0].timestamp;
      setPendingCount((count) => count + fresh.length);
      if (notifyEnabled && !fromPush) notifyNewSignals(fresh);
      listenersRef.current.forEach((listener) => listener(fresh));
    },
    [notifyEnabled]
  );

  const seedKnown = useCallback(async () => {
    if (!getToken()) return;
    try {
      const incoming = await api.signals();
      incoming.forEach((signal) => knownIdsRef.current.add(signal.id));
      if (incoming[0]) sinceRef.current = incoming[0].timestamp;
    } catch {
      // ignore seed errors
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!getToken() || wsConnected) return;
    try {
      const params = sinceRef.current ? { since: sinceRef.current } : undefined;
      const incoming = await api.signals(params);
      const fresh = incoming.filter((signal) => !knownIdsRef.current.has(signal.id));
      dispatchFresh(fresh);
    } catch {
      // ignore polling errors
    }
  }, [dispatchFresh, wsConnected]);

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    let pushOk = false;
    try {
      pushOk = await subscribeToPush();
    } catch {
      pushOk = false;
    }
    const enabled = granted || pushOk;
    setNotifyEnabled(enabled);
    return enabled;
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/signals")) clearPending();
  }, [pathname, clearPending]);

  useEffect(() => {
    if (!getToken()) {
      sinceRef.current = null;
      knownIdsRef.current = new Set();
      setPendingCount(0);
      setWsConnected(false);
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;

    seedKnown().then(() => {
      if (cancelled) return;
      void registerServiceWorker();

      const wsUrl = buildSignalsWebSocketUrl();
      if (wsUrl) {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data)) as Signal;
            if (!payload?.id || knownIdsRef.current.has(payload.id)) return;
            dispatchFresh([payload], true);
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          wsRef.current = null;
        };

        ws.onerror = () => {
          ws.close();
        };
      }

      pollTimer = window.setInterval(() => {
        void pollOnce();
      }, POLL_MS);
    });

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [seedKnown, pollOnce, dispatchFresh, pathname]);

  const value = useMemo(
    () => ({ pendingCount, clearPending, notifyEnabled, wsConnected, enableNotifications, subscribe }),
    [pendingCount, clearPending, notifyEnabled, wsConnected, enableNotifications, subscribe]
  );

  return <SignalPollingContext.Provider value={value}>{children}</SignalPollingContext.Provider>;
}

export function useSignalPollingContext() {
  const ctx = useContext(SignalPollingContext);
  if (!ctx) throw new Error("useSignalPollingContext must be used within SignalPollingProvider");
  return ctx;
}

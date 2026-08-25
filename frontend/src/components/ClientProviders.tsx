"use client";

import { LocaleProvider } from "@/contexts/LocaleContext";
import { SignalPollingProvider } from "@/contexts/SignalPollingContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SignalPollingProvider>{children}</SignalPollingProvider>
    </LocaleProvider>
  );
}

"use client";

import FestiveOverlay from "@/components/FestiveOverlay";
import { FestiveThemeProvider } from "@/contexts/FestiveThemeContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { SignalPollingProvider } from "@/contexts/SignalPollingContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <FestiveThemeProvider>
        <SignalPollingProvider>
          <FestiveOverlay />
          {children}
        </SignalPollingProvider>
      </FestiveThemeProvider>
    </LocaleProvider>
  );
}

"use client";

import { LocaleProvider } from "@/contexts/LocaleContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

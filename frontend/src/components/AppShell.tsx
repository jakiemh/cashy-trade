"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CashyBubble from "@/components/CashyBubble";
import CashyAvatar from "@/components/CashyAvatar";
import SettingsGear from "@/components/SettingsGear";
import { useLocale } from "@/contexts/LocaleContext";
import { setToken } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isAdmin } = useLocale();

  const links = [
    { href: "/dashboard", label: t("nav.dashboard"), short: t("nav.home") },
    { href: "/tickers", label: t("nav.tickers"), short: t("nav.tickers") },
    { href: "/signals", label: t("nav.signals"), short: t("nav.signals") },
    { href: "/journal", label: t("nav.journal"), short: t("nav.trades") },
  ];

  return (
    <div className="app-shell">
      <header className="glass-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <CashyAvatar src={DEFAULT_CASHY_AVATAR} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-xs">
                {t("app.title")}
              </p>
              <h1 className="truncate text-base font-semibold text-slate-800 sm:text-lg">
                {t("app.subtitle")}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <Link href="/admin" className={pathname.startsWith("/admin") ? "nav-pill-active" : "nav-pill"}>
                {t("nav.admin")}
              </Link>
            ) : null}
            <button
              className="btn-secondary px-3 py-2"
              onClick={() => {
                setToken(null);
                router.push("/login");
              }}
            >
              {t("nav.logout")}
            </button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-6xl gap-2 px-4 pb-3 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname.startsWith(link.href) ? "nav-pill-active" : "nav-pill"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="page-main mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center px-2 py-3 text-xs ${
                pathname.startsWith(link.href) ? "font-semibold text-brand-600" : "text-slate-500"
              }`}
            >
              <span>{link.short}</span>
            </Link>
          ))}
        </div>
      </nav>

      <SettingsGear />
      <CashyBubble />
    </div>
  );
}

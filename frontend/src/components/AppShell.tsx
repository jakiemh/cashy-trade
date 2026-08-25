"use client";

import InstallPwaBanner from "@/components/InstallPwaBanner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import CashyBubble, { type CashyBubbleHandle } from "@/components/CashyBubble";
import CashyAvatar from "@/components/CashyAvatar";
import MobileBottomNav, { mobileNavIcons } from "@/components/MobileBottomNav";
import SettingsGear, { type SettingsGearHandle } from "@/components/SettingsGear";
import { useLocale } from "@/contexts/LocaleContext";
import { useSignalPollingContext } from "@/contexts/SignalPollingContext";
import { setToken } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

function MobileSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Configuración"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-slate-600 shadow-sm active:scale-95 md:hidden"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M19.4 13.5a7.8 7.8 0 0 0 .1-3l2-1.1-2-3.5-2.3 1a8 8 0 0 0-2.6-1.5l-.4-2.5H9.8l-.4 2.5a8 8 0 0 0-2.6 1.5l-2.3-1-2 3.5 2 1.1a7.8 7.8 0 0 0 .1 3l-2 1.1 2 3.5 2.3-1a8 8 0 0 0 2.6 1.5l.4 2.5h4.4l.4-2.5a8 8 0 0 0 2.6-1.5l2.3 1 2-3.5-2-1.1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isAdmin } = useLocale();
  const { pendingCount } = useSignalPollingContext();
  const settingsRef = useRef<SettingsGearHandle>(null);
  const cashyRef = useRef<CashyBubbleHandle>(null);

  const links = [
    {
      href: "/dashboard",
      label: t("nav.dashboard"),
      short: t("nav.home"),
      icon: mobileNavIcons.home,
    },
    {
      href: "/tickers",
      label: t("nav.tickers"),
      short: t("nav.tickers"),
      icon: mobileNavIcons.tickers,
    },
    {
      href: "/signals",
      label: t("nav.signals"),
      short: t("nav.signals"),
      icon: mobileNavIcons.signals,
    },
    {
      href: "/journal",
      label: t("nav.journal"),
      short: t("nav.trades"),
      icon: mobileNavIcons.journal,
    },
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
            <MobileSettingsButton onClick={() => settingsRef.current?.open()} />
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
              className={`relative ${pathname.startsWith(link.href) ? "nav-pill-active" : "nav-pill"}`}
            >
              {link.label}
              {link.href === "/signals" && pendingCount > 0 ? (
                <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>

      <main className="page-main mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <InstallPwaBanner />
        {children}
      </main>

      <MobileBottomNav
        links={links}
        pendingCount={pendingCount}
        onOpenCashy={() => cashyRef.current?.open()}
      />

      <SettingsGear ref={settingsRef} />
      <CashyBubble ref={cashyRef} />
    </div>
  );
}

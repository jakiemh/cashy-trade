"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CashyAvatar from "@/components/CashyAvatar";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: ComponentType<{ active: boolean }>;
};

function NavIconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9V20.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
    </svg>
  );
}

function NavIconTickers({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M5 18V8m4 10V5m4 13v-7m4 7V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="5" cy="8" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="5" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="11" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="11" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function NavIconSignals({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 3v3m0 12v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M3 12h3m12 0h3M4.2 19.8l2.1-2.1m11.4-11.4 2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        strokeWidth="1.8"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function NavIconJournal({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v14.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

type MobileBottomNavProps = {
  links: NavItem[];
  pendingCount: number;
  avatarUrl?: string;
  onOpenCashy: () => void;
};

export default function MobileBottomNav({
  links,
  pendingCount,
  avatarUrl = DEFAULT_CASHY_AVATAR,
  onOpenCashy,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const leftLinks = links.slice(0, 2);
  const rightLinks = links.slice(2);

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Navegación principal">
      <div className="relative mx-auto max-w-lg px-2">
        <div className="grid grid-cols-5 items-end">
          {leftLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}>
                <span className={`bottom-nav-icon ${active ? "bottom-nav-icon-active" : ""}`}>
                  <link.icon active={active} />
                </span>
                <span>{link.short}</span>
              </Link>
            );
          })}

          <div className="flex items-end justify-center pb-0.5">
            <button
              type="button"
              aria-label="Abrir Cashy"
              className="bottom-nav-fab"
              onClick={onOpenCashy}
            >
              <CashyAvatar src={avatarUrl} size={48} className="border-brand-400" />
            </button>
          </div>

          {rightLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            const showBadge = link.href === "/signals" && pendingCount > 0;
            return (
              <Link key={link.href} href={link.href} className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}>
                <span className={`relative bottom-nav-icon ${active ? "bottom-nav-icon-active" : ""}`}>
                  <link.icon active={active} />
                  {showBadge ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  ) : null}
                </span>
                <span>{link.short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export const mobileNavIcons = {
  home: NavIconHome,
  tickers: NavIconTickers,
  signals: NavIconSignals,
  journal: NavIconJournal,
};

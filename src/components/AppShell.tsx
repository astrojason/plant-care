"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  Sun,
  Plant,
  FirstAidKit,
  User,
  Plus,
} from "@phosphor-icons/react";
import pkg from "../../package.json";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Sun, match: (p: string) => p === "/dashboard" },
  { href: "/plants", label: "Plants", icon: Plant, match: (p: string) => p.startsWith("/plants") },
  { href: "/diagnose", label: "Diagnose", icon: FirstAidKit, match: (p: string) => p === "/diagnose" },
  { href: "/you", label: "You", icon: User, match: (p: string) => p.startsWith("/you") || p.startsWith("/admin") },
];

export function AppShell({
  children,
  showTabBar = true,
}: {
  children: React.ReactNode;
  showTabBar?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Leaf size={18} weight="regular" style={{ color: "var(--color-accent)" }} />
          Plant Care
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="sidebar-nav-row"
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/plants/new" className="btn btn-primary btn-block">
          <Plus size={16} weight="bold" />
          Add plant
        </Link>
        <Link href="/changelog" className="sidebar-version">
          v{pkg.version}
        </Link>
      </aside>

      <div className="app-main">{children}</div>

      {showTabBar && (
        <nav className="tab-bar">
          {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link key={href} href={href} className={`tab-bar-item${active ? " active" : ""}`}>
                <Icon size={21} weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

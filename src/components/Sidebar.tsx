"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type NavLink = { href: string; label: string; icon: string };

export function Sidebar({
  siteName,
  links,
  userName,
  roleLabel,
  logout,
}: {
  siteName: string;
  links: NavLink[];
  userName: string;
  roleLabel: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 text-slate-900 no-underline hover:text-slate-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
        <Icon name="school" className="h-5 w-5" />
      </span>
      <span className="truncate text-lg font-bold tracking-tight">{siteName}</span>
    </Link>
  );

  return (
    <>
      {/* Мобильная шапка */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} className="btn-ghost -mr-2 p-2" aria-label="Открыть меню">
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          {brand}
          <button onClick={() => setOpen(false)} className="btn-ghost -mr-2 p-2 lg:hidden" aria-label="Закрыть меню">
            <Icon name="x" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon name={l.icon} className={`h-5 w-5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{userName}</div>
              <div className="text-xs text-slate-500">{roleLabel}</div>
            </div>
            <form action={logout}>
              <button className="btn-ghost p-2" title="Выйти" aria-label="Выйти">
                <Icon name="logout" className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  const links: { href: string; label: string }[] = [
    { href: "/", label: "Главная" },
    { href: "/classes", label: "Мои классы" },
  ];
  if (profile.role === "student") links.push({ href: "/grades", label: "Мои оценки" });
  if (profile.role === "admin") {
    links.push({ href: "/admin/users", label: "Пользователи" });
    links.push({ href: "/admin/classes", label: "Управление классами" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-indigo-700 hover:no-underline">
            {process.env.NEXT_PUBLIC_SITE_NAME || "Онлайн-школа"}
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="font-medium text-slate-700 hover:text-indigo-600">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {profile.full_name || profile.email}{" "}
              <span className="text-slate-400">· {ROLE_LABELS[profile.role]}</span>
            </span>
            <form action={logout}>
              <button className="btn-secondary px-3 py-1.5">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

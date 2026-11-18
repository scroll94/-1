import { getSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Sidebar } from "@/components/Sidebar";
import { ROLE_LABELS, SITE_NAME } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  const links = [
    { href: "/", label: "Главная", icon: "home" },
    { href: "/classes", label: profile.role === "admin" ? "Все классы" : "Мои классы", icon: "layers" },
  ];
  if (profile.role === "student") links.push({ href: "/grades", label: "Мои оценки", icon: "award" });
  if (profile.role === "admin") {
    links.push({ href: "/admin/users", label: "Пользователи", icon: "users" });
    links.push({ href: "/admin/classes", label: "Управление классами", icon: "shield" });
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        siteName={SITE_NAME}
        links={links}
        userName={profile.full_name || profile.email || ""}
        roleLabel={ROLE_LABELS[profile.role]}
        logout={logout}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

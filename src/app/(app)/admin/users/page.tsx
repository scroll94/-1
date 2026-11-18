import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, PageHeader, RoleBadge } from "@/components/ui";
import { ROLE_LABELS, emailToLogin, formatDate, type Row } from "@/lib/utils";
import { createUser, deleteUser, resetPassword, updateUser } from "./actions";

const TABS = [
  { role: "", label: "Все" },
  { role: "student", label: "Ученики" },
  { role: "teacher", label: "Учителя" },
  { role: "admin", label: "Админы" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; role?: string; q?: string; new?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile: me } = await requireRole("admin");
  const { data } = await supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false });
  const all = (data ?? []) as Row[];
  const q = (sp.q ?? "").trim().toLowerCase();
  const users = all.filter(
    (u) =>
      (!sp.role || u.role === sp.role) &&
      (!q || String(u.full_name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q)),
  );
  const count = (role: string) => (role ? all.filter((u) => u.role === role).length : all.length);
  const qs = (role: string) => {
    const p = new URLSearchParams();
    if (role) p.set("role", role);
    if (sp.q) p.set("q", sp.q);
    const s = p.toString();
    return `/admin/users${s ? "?" + s : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Пользователи"
        subtitle="Ученики могут регистрироваться сами. Здесь вы назначаете роли и сбрасываете пароли."
        actions={
          <a href="#new-user" className="btn">
            <Icon name="userPlus" className="h-4 w-4" /> Добавить
          </a>
        }
      />
      <Flash error={sp.error} ok={sp.ok} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <Link key={t.role} href={qs(t.role)} className={`tab ${(sp.role ?? "") === t.role ? "tab-active" : ""}`}>
              {t.label}
              <span className="rounded-md bg-slate-200/70 px-1.5 text-xs text-slate-600">{count(t.role)}</span>
            </Link>
          ))}
        </div>
        <form className="relative w-full sm:w-72">
          {sp.role && <input type="hidden" name="role" value={sp.role} />}
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={sp.q} placeholder="Поиск по имени или логину" className="input pl-9" />
        </form>
      </div>

      <section className="card-flat overflow-hidden">
        {users.length === 0 ? (
          <EmptyState icon="users" title="Никого не найдено" text="Измените фильтр или добавьте пользователя." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={u.full_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{u.full_name || "Без имени"}</span>
                      <RoleBadge role={u.role} />
                      {u.id === me.id && <span className="badge bg-indigo-50 text-indigo-600">это вы</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      <span className="font-mono">{emailToLogin(u.email)}</span> · с {formatDate(u.created_at).split(",")[0]}
                    </div>
                  </div>

                  <form action={updateUser} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="full_name" value={u.full_name} />
                    <select name="role" defaultValue={u.role} className="input w-[11.5rem] py-2" aria-label="Роль">
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="btn-secondary btn-sm py-2" title="Сохранить роль">
                      <Icon name="check" className="h-4 w-4" />
                    </button>
                  </form>

                  <details className="group relative">
                    <summary className="btn-ghost btn-sm cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                      <Icon name="edit" className="h-4 w-4" /> Ещё
                    </summary>
                    <div className="absolute right-0 z-20 mt-2 w-72 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <form action={resetPassword} className="space-y-2">
                        <input type="hidden" name="id" value={u.id} />
                        <label className="label flex items-center gap-1.5"><Icon name="key" className="h-4 w-4" /> Новый пароль</label>
                        <div className="flex gap-2">
                          <input name="password" minLength={6} required placeholder="мин. 6 символов" className="input py-2" />
                          <button className="btn btn-sm">Задать</button>
                        </div>
                      </form>
                      <form action={updateUser} className="space-y-2">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="role" value={u.role} />
                        <label className="label">Имя и фамилия</label>
                        <div className="flex gap-2">
                          <input name="full_name" defaultValue={u.full_name} className="input py-2" />
                          <button className="btn-secondary btn-sm">OK</button>
                        </div>
                      </form>
                      {u.id !== me.id && (
                        <form action={deleteUser} className="border-t border-slate-100 pt-3">
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmButton message={`Удалить пользователя «${u.full_name}»? Все его работы тоже удалятся.`}>
                            <Icon name="trash" className="h-4 w-4" /> Удалить пользователя
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="new-user" className="card mt-6 scroll-mt-6">
        <h2 className="mb-1">Добавить пользователя</h2>
        <p className="muted mb-4">Например, учителя. Сообщите ему логин и пароль — он сможет сменить их только через вас.</p>
        <form action={createUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <label className="label">Имя и фамилия</label>
            <input name="full_name" className="input" required />
          </div>
          <div>
            <label className="label">Логин</label>
            <input name="login" className="input" required autoCapitalize="none" placeholder="ivanov.a" />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input name="password" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label">Роль</label>
            <select name="role" className="input" defaultValue={sp.role || "teacher"}>
              <option value="teacher">Учитель</option>
              <option value="student">Ученик</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button className="btn"><Icon name="userPlus" className="h-4 w-4" /> Создать</button>
          </div>
        </form>
      </section>
    </div>
  );
}

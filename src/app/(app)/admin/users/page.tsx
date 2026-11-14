import { requireRole } from "@/lib/auth";
import { Flash, type SP } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ROLE_LABELS, emailToLogin, type Row } from "@/lib/utils";
import { createUser, deleteUser, resetPassword, updateUser } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile: me } = await requireRole("admin");
  let query = supabase.from("profiles").select("id, full_name, email, role, created_at").order("full_name");
  if (sp.role) query = query.eq("role", sp.role);
  if (sp.q) query = query.or(`full_name.ilike.%${sp.q.replace(/[%,()]/g, "")}%,email.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const users = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <h1>Пользователи</h1>
      <Flash error={sp.error} ok={sp.ok} />

      <section className="card">
        <h2 className="mb-3">Добавить пользователя</h2>
        <form action={createUser} className="grid gap-3 sm:grid-cols-5 sm:items-end">
          <div className="sm:col-span-2">
            <label className="label">ФИО</label>
            <input name="full_name" className="input" required />
          </div>
          <div>
            <label className="label">Логин или email</label>
            <input name="login" className="input" required placeholder="ivanov.a" />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input name="password" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label">Роль</label>
            <select name="role" className="input" defaultValue="student">
              <option value="student">Ученик</option>
              <option value="teacher">Учитель</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div className="sm:col-span-5">
            <button className="btn">Создать</button>
            <span className="ml-3 text-xs text-slate-500">
              Сообщите пользователю логин и пароль. Пароли хранятся в зашифрованном виде — посмотреть их нельзя, только задать новый.
            </span>
          </div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Поиск по имени или логину" className="input max-w-xs" />
          <select name="role" defaultValue={sp.role ?? ""} className="input max-w-[180px]">
            <option value="">Все роли</option>
            <option value="student">Ученики</option>
            <option value="teacher">Учителя</option>
            <option value="admin">Администраторы</option>
          </select>
          <button className="btn-secondary">Найти</button>
        </form>
        <table className="table">
          <thead>
            <tr><th>ФИО и роль</th><th>Логин</th><th>Новый пароль</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <form action={updateUser} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="full_name" defaultValue={u.full_name} className="input w-48" />
                    <select name="role" defaultValue={u.role} className="input w-40">
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="btn-secondary px-3 py-1.5">Сохранить</button>
                  </form>
                </td>
                <td className="whitespace-nowrap pt-4">{emailToLogin(u.email)}</td>
                <td>
                  <form action={resetPassword} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="password" placeholder="новый пароль" minLength={6} required className="input w-36" />
                    <button className="btn-secondary px-3 py-1.5">Сменить</button>
                  </form>
                </td>
                <td>
                  {u.id !== me.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmButton message={`Удалить пользователя «${u.full_name}»? Все его сдачи тоже удалятся.`}>
                        Удалить
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="py-4 text-sm text-slate-500">Никого не найдено.</p>}
      </section>
    </div>
  );
}

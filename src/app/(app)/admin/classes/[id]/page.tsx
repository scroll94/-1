import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { emailToLogin, type Row } from "@/lib/utils";
import { addStudents, deleteClass, removeStudent, updateClass } from "../actions";

export default async function AdminClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const { data: cls } = await supabase.from("classes").select("id, name, teacher_id").eq("id", id).single();
  if (!cls) notFound();

  const [{ data: teachersData }, { data: membersData }, { data: studentsData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("role", ["teacher", "admin"]).order("full_name"),
    supabase.from("class_students").select("student_id, profiles(full_name, email)").eq("class_id", id),
    supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name"),
  ]);
  const teachers = (teachersData ?? []) as Row[];
  const members = ((membersData ?? []) as Row[]).sort((a, b) =>
    String(a.profiles?.full_name).localeCompare(String(b.profiles?.full_name), "ru"),
  );
  const memberIds = new Set(members.map((m) => m.student_id));
  const available = ((studentsData ?? []) as Row[]).filter((s) => !memberIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>{cls.name}</h1>
        <Link href={`/classes/${id}`} className="btn-secondary">Открыть класс (уроки и ДЗ) →</Link>
      </div>
      <Flash error={sp.error} ok={sp.ok} />

      <section className="card">
        <h2 className="mb-3">Настройки</h2>
        <form action={updateClass} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="label">Название</label>
            <input name="name" defaultValue={cls.name} className="input w-56" required />
          </div>
          <div>
            <label className="label">Учитель</label>
            <select name="teacher_id" defaultValue={cls.teacher_id ?? ""} className="input w-56">
              <option value="">— не назначен —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn">Сохранить</button>
        </form>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3">Ученики класса ({members.length})</h2>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.student_id} className="flex items-center justify-between py-2">
                <span>
                  {m.profiles?.full_name}{" "}
                  <span className="text-xs text-slate-400">{emailToLogin(m.profiles?.email)}</span>
                </span>
                <form action={removeStudent}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="student_id" value={m.student_id} />
                  <button className="btn-danger">Убрать</button>
                </form>
              </li>
            ))}
          </ul>
          {members.length === 0 && <p className="text-sm text-slate-500">В классе пока нет учеников.</p>}
        </section>

        <section className="card">
          <h2 className="mb-3">Добавить учеников</h2>
          {available.length === 0 ? (
            <p className="text-sm text-slate-500">
              Свободных учеников нет. Создайте их в разделе <Link href="/admin/users">Пользователи</Link>.
            </p>
          ) : (
            <form action={addStudents} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {available.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="student_id" value={s.id} />
                    {s.full_name} <span className="text-xs text-slate-400">{emailToLogin(s.email)}</span>
                  </label>
                ))}
              </div>
              <button className="btn">Добавить выбранных</button>
            </form>
          )}
        </section>
      </div>

      <section className="card border-red-200">
        <h2 className="mb-2 text-red-700">Удаление класса</h2>
        <p className="mb-3 text-sm text-slate-600">Удалятся все курсы, уроки, задания и оценки этого класса.</p>
        <form action={deleteClass}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton message={`Точно удалить класс «${cls.name}» со всеми данными?`}>Удалить класс</ConfirmButton>
        </form>
      </section>
    </div>
  );
}

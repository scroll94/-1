import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { JoinCode } from "@/components/JoinCode";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
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
  const { data: cls } = await supabase.from("classes").select("id, name, teacher_id, join_code").eq("id", id).single();
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
      <PageHeader
        title={cls.name}
        back={{ href: "/admin/classes", label: "Все классы" }}
        actions={
          <Link href={`/classes/${id}`} className="btn-secondary">
            <Icon name="book" className="h-4 w-4" /> Уроки и задания
          </Link>
        }
      />
      <Flash error={sp.error} ok={sp.ok} />

      <JoinCode classId={id} code={cls.join_code} back={`/admin/classes/${id}`} />

      <section className="card">
        <h2 className="mb-4">Настройки</h2>
        <form action={updateClass} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="label">Название</label>
            <input name="name" defaultValue={cls.name} className="input" required />
          </div>
          <div>
            <label className="label">Учитель</label>
            <select name="teacher_id" defaultValue={cls.teacher_id ?? ""} className="input">
              <option value="">— не назначен —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn">Сохранить</button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-flat overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2>Ученики класса</h2>
            <span className="badge bg-slate-100 text-slate-600">{members.length}</span>
          </div>
          {members.length === 0 ? (
            <EmptyState icon="users" title="В классе пока нет учеников" text="Добавьте их справа или раздайте код класса." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.student_id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={m.profiles?.full_name ?? ""} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.profiles?.full_name}</div>
                    <div className="font-mono text-xs text-slate-400">{emailToLogin(m.profiles?.email)}</div>
                  </div>
                  <form action={removeStudent}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="student_id" value={m.student_id} />
                    <button className="btn-danger btn-sm">Убрать</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4">Добавить учеников</h2>
          {available.length === 0 ? (
            <EmptyState icon="userPlus" title="Свободных учеников нет" text="Ученики могут зарегистрироваться сами по коду класса." />
          ) : (
            <form action={addStudents} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="max-h-80 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
                {available.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="student_id" value={s.id} className="h-4 w-4 accent-indigo-600" />
                    <span className="flex-1">{s.full_name}</span>
                    <span className="font-mono text-xs text-slate-400">{emailToLogin(s.email)}</span>
                  </label>
                ))}
              </div>
              <button className="btn"><Icon name="plus" className="h-4 w-4" /> Добавить выбранных</button>
            </form>
          )}
        </section>
      </div>

      <section className="card border-red-100">
        <h2 className="mb-1 text-red-700">Удаление класса</h2>
        <p className="muted mb-3">Удалятся все курсы, уроки, задания и оценки этого класса.</p>
        <form action={deleteClass}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton message={`Точно удалить класс «${cls.name}» со всеми данными?`}>
            <Icon name="trash" className="h-4 w-4" /> Удалить класс
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}

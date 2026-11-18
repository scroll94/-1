import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Flash, type SP } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHeader, classGradient } from "@/components/ui";
import type { Row } from "@/lib/utils";
import { createClass } from "./actions";

export default async function AdminClassesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const [{ data: classesData }, { data: teachersData }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, join_code, teacher:profiles!classes_teacher_id_fkey(full_name), class_students(count)")
      .order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["teacher", "admin"]).order("full_name"),
  ]);
  const classes = (classesData ?? []) as Row[];
  const teachers = (teachersData ?? []) as Row[];

  return (
    <div className="space-y-6">
      <PageHeader title="Управление классами" subtitle="Создавайте классы, назначайте учителей и добавляйте учеников." />
      <Flash error={sp.error} ok={sp.ok} />

      <section className="card">
        <h2 className="mb-4">Новый класс</h2>
        <form action={createClass} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label">Название</label>
            <input name="name" className="input" placeholder="7 «А» — математика" required />
          </div>
          <div>
            <label className="label">Учитель</label>
            <select name="teacher_id" className="input">
              <option value="">— не назначен —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn"><Icon name="plus" className="h-4 w-4" /> Создать</button>
        </form>
        {teachers.length <= 1 && (
          <p className="hint mt-3">
            Нет учителей? Назначьте роль «Учитель» в разделе <Link href="/admin/users">Пользователи</Link>.
          </p>
        )}
      </section>

      {classes.length === 0 ? (
        <div className="card-flat"><EmptyState icon="layers" title="Классов пока нет" text="Создайте первый класс формой выше." /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/admin/classes/${c.id}`} className="card-link overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${classGradient(c.id)}`} />
              <div className="p-5">
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Icon name="school" className="h-4 w-4" /> {c.teacher?.full_name ?? "Учитель не назначен"}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Icon name="users" className="h-4 w-4" /> {c.class_students?.[0]?.count ?? 0} учеников
                  </span>
                  <span className="chip text-xs">{c.join_code}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

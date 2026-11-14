import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Flash, type SP } from "@/components/Flash";
import type { Row } from "@/lib/utils";
import { createClass } from "./actions";

export default async function AdminClassesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const [{ data: classesData }, { data: teachersData }] = await Promise.all([
    supabase.from("classes").select("id, name, teacher:profiles!classes_teacher_id_fkey(full_name), class_students(count)").order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["teacher", "admin"]).order("full_name"),
  ]);
  const classes = (classesData ?? []) as Row[];
  const teachers = (teachersData ?? []) as Row[];

  return (
    <div className="space-y-6">
      <h1>Управление классами</h1>
      <Flash error={sp.error} ok={sp.ok} />
      <section className="card">
        <h2 className="mb-3">Новый класс</h2>
        <form action={createClass} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Название</label>
            <input name="name" className="input w-56" placeholder="7 «А» — математика" required />
          </div>
          <div>
            <label className="label">Учитель</label>
            <select name="teacher_id" className="input w-56">
              <option value="">— не назначен —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn">Создать</button>
        </form>
      </section>
      <section className="card">
        <table className="table">
          <thead><tr><th>Класс</th><th>Учитель</th><th>Учеников</th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/classes/${c.id}`}>{c.name}</Link></td>
                <td>{c.teacher?.full_name ?? "—"}</td>
                <td>{c.class_students?.[0]?.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {classes.length === 0 && <p className="py-4 text-sm text-slate-500">Классов пока нет.</p>}
      </section>
    </div>
  );
}

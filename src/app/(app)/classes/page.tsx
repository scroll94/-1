import Link from "next/link";
import { getSession } from "@/lib/auth";
import type { Row } from "@/lib/utils";

export default async function ClassesPage() {
  const { supabase, profile } = await getSession();
  const { data } = await supabase
    .from("classes")
    .select("id, name, teacher:profiles!classes_teacher_id_fkey(full_name), courses(count), assignments(count)")
    .order("name");
  const classes = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <h1>{profile.role === "admin" ? "Все классы" : "Мои классы"}</h1>
      {classes.length === 0 ? (
        <div className="card text-sm text-slate-500">
          {profile.role === "admin" ? (
            <>Классов пока нет. Создайте их в разделе <Link href="/admin/classes">Управление классами</Link>.</>
          ) : (
            "Вас пока не добавили ни в один класс. Обратитесь к администратору."
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="card block text-slate-900 hover:border-indigo-300 hover:no-underline">
              <div className="text-lg font-semibold">{c.name}</div>
              <div className="mt-1 text-sm text-slate-500">Учитель: {c.teacher?.full_name ?? "—"}</div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Курсов: {c.courses?.[0]?.count ?? 0}</span>
                <span>Заданий: {c.assignments?.[0]?.count ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

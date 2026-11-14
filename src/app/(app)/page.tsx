import Link from "next/link";
import { getSession } from "@/lib/auth";
import { formatDate, type Row } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default async function Dashboard() {
  const { supabase, profile } = await getSession();

  if (profile.role === "student") {
    const [{ data: assignmentsData }, { data: subsData }] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, due_at, max_score, classes(name)")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("submissions")
        .select("assignment_id, status, score, feedback, graded_at, assignments(title, max_score)")
        .eq("student_id", profile.id),
    ]);
    const assignments = (assignmentsData ?? []) as Row[];
    const subs = (subsData ?? []) as Row[];
    const byAssignment = new Map(subs.map((s) => [s.assignment_id, s]));
    const todo = assignments.filter((a: Row) => {
      const s = byAssignment.get(a.id);
      return !s || s.status === "returned";
    });
    const graded = subs
      .filter((s: Row) => s.status === "graded")
      .sort((a: Row, b: Row) => String(b.graded_at).localeCompare(String(a.graded_at)))
      .slice(0, 5);

    return (
      <div className="space-y-6">
        <h1>Здравствуйте, {profile.full_name || "ученик"}!</h1>
        <section className="card">
          <h2 className="mb-3">Нужно сделать</h2>
          {todo.length === 0 ? (
            <p className="text-sm text-slate-500">Все задания сданы 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todo.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <Link href={`/assignments/${a.id}`} className="font-medium">
                      {a.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {a.classes?.name} · срок: {formatDate(a.due_at)}
                    </div>
                  </div>
                  <StatusBadge status={byAssignment.get(a.id)?.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3">Последние оценки</h2>
          {graded.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет оценок.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {graded.map((s) => (
                <li key={s.assignment_id} className="flex items-center justify-between py-2">
                  <Link href={`/assignments/${s.assignment_id}`}>
                    {s.assignments?.title}
                  </Link>
                  <span className="font-semibold">
                    {s.score} / {s.assignments?.max_score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // Учитель и админ: работы, ожидающие проверки
  const { data: pendingData } = await supabase
    .from("submissions")
    .select("id, assignment_id, submitted_at, student:profiles!submissions_student_id_fkey(full_name), assignments(title, classes(name))")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(50);
  const pending = (pendingData ?? []) as Row[];

  return (
    <div className="space-y-6">
      <h1>Здравствуйте, {profile.full_name}!</h1>
      <div className="flex flex-wrap gap-3">
        <Link href="/classes" className="btn">Мои классы</Link>
        {profile.role === "admin" && (
          <>
            <Link href="/admin/users" className="btn-secondary">Пользователи</Link>
            <Link href="/admin/classes" className="btn-secondary">Управление классами</Link>
          </>
        )}
      </div>
      <section className="card">
        <h2 className="mb-3">Ждут проверки ({pending.length})</h2>
        {!pending.length ? (
          <p className="text-sm text-slate-500">Новых работ нет.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Ученик</th><th>Задание</th><th>Класс</th><th>Сдано</th></tr>
            </thead>
            <tbody>
              {pending.map((s) => (
                <tr key={s.id}>
                  <td>{s.student?.full_name}</td>
                  <td><Link href={`/assignments/${s.assignment_id}`}>{s.assignments?.title}</Link></td>
                  <td>{s.assignments?.classes?.name}</td>
                  <td>{formatDate(s.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

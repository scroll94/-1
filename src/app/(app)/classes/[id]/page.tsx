import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, type Row } from "@/lib/utils";
import { createCourse } from "../../actions";

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher:profiles!classes_teacher_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!cls) notFound();
  const editor = await canEditClass(id);

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, title, description, lessons(count)").eq("class_id", id).order("created_at"),
    supabase
      .from("assignments")
      .select("id, title, due_at, max_score")
      .eq("class_id", id)
      .order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  const courses = (coursesData ?? []) as Row[];
  const assignments = (assignmentsData ?? []) as Row[];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: subsData } = assignmentIds.length
    ? await supabase
        .from("submissions")
        .select("assignment_id, student_id, status, score")
        .in("assignment_id", assignmentIds)
    : { data: [] };
  const subs = (subsData ?? []) as Row[];

  let students: Row[] = [];
  if (editor) {
    const { data } = await supabase.from("class_students").select("student_id, profiles(full_name)").eq("class_id", id);
    students = ((data ?? []) as Row[]).sort((a, b) =>
      String(a.profiles?.full_name).localeCompare(String(b.profiles?.full_name), "ru"),
    );
  }
  const subKey = (a: string, s: string) => `${a}:${s}`;
  const subMap = new Map(subs.map((s) => [subKey(s.assignment_id, s.student_id), s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>{cls.name}</h1>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <p className="text-sm text-slate-500">Учитель: {(cls as any).teacher?.full_name ?? "—"}</p>
        </div>
        {profile.role === "admin" && (
          <Link href={`/admin/classes/${id}`} className="btn-secondary">Ученики и настройки класса</Link>
        )}
      </div>
      <Flash error={sp.error} ok={sp.ok} />

      <section className="card">
        <h2 className="mb-3">Курсы и уроки</h2>
        {courses.length === 0 && <p className="mb-3 text-sm text-slate-500">Курсов пока нет.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="block rounded-lg border border-slate-200 p-4 text-slate-900 hover:border-indigo-300 hover:no-underline">
              <div className="font-semibold">{c.title}</div>
              {c.description && <div className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</div>}
              <div className="mt-2 text-xs text-slate-400">Уроков: {c.lessons?.[0]?.count ?? 0}</div>
            </Link>
          ))}
        </div>
        {editor && (
          <form action={createCourse} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="class_id" value={id} />
            <div>
              <label className="label">Новый курс</label>
              <input name="title" className="input w-64" placeholder="Например: Алгебра, 1 четверть" required />
            </div>
            <div className="min-w-64 flex-1">
              <label className="label">Описание</label>
              <input name="description" className="input" />
            </div>
            <button className="btn">Добавить курс</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2>Домашние задания</h2>
          {editor && <Link href={`/classes/${id}/new-assignment`} className="btn">+ Новое задание</Link>}
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">Заданий пока нет.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Задание</th>
                <th>Срок</th>
                <th>{editor ? "Сдали / ждут проверки" : "Статус"}</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const aSubs = subs.filter((s) => s.assignment_id === a.id);
                const mine = subMap.get(subKey(a.id, profile.id));
                return (
                  <tr key={a.id}>
                    <td><Link href={`/assignments/${a.id}`}>{a.title}</Link></td>
                    <td className="whitespace-nowrap">{formatDate(a.due_at)}</td>
                    <td>
                      {editor ? (
                        <>
                          {aSubs.length} / {students.length}
                          {aSubs.some((s) => s.status === "submitted") && (
                            <span className="badge ml-2 bg-amber-100 text-amber-800">
                              {aSubs.filter((s) => s.status === "submitted").length} ждут
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="flex items-center gap-2">
                          <StatusBadge status={mine?.status} />
                          {mine?.status === "graded" && <b>{mine.score} / {a.max_score}</b>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {editor && (
        <section className="card overflow-x-auto">
          <h2 className="mb-3">Журнал оценок</h2>
          {students.length === 0 || assignments.length === 0 ? (
            <p className="text-sm text-slate-500">Журнал появится, когда в классе будут ученики и задания.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="min-w-24 text-center">
                      <Link href={`/assignments/${a.id}`} className="text-xs" title={a.title}>
                        {a.title.length > 18 ? a.title.slice(0, 18) + "…" : a.title}
                      </Link>
                    </th>
                  ))}
                  <th className="text-center">Средний %</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => {
                  const pct: number[] = [];
                  return (
                    <tr key={st.student_id}>
                      <td className="whitespace-nowrap">{st.profiles?.full_name}</td>
                      {assignments.map((a) => {
                        const s = subMap.get(subKey(a.id, st.student_id));
                        if (s?.status === "graded") pct.push((s.score / a.max_score) * 100);
                        return (
                          <td key={a.id} className="text-center">
                            {s?.status === "graded" ? (
                              <b>{s.score}</b>
                            ) : s?.status === "submitted" ? (
                              <span className="text-amber-600" title="ждёт проверки">●</span>
                            ) : s?.status === "returned" ? (
                              <span className="text-red-600" title="на доработке">↺</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center font-semibold">
                        {pct.length ? Math.round(pct.reduce((x, y) => x + y, 0) / pct.length) + "%" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-slate-400">● ждёт проверки · ↺ на доработке · — не сдано</p>
        </section>
      )}
    </div>
  );
}

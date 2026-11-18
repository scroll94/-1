import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { JoinCode } from "@/components/JoinCode";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, classGradient } from "@/components/ui";
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
  const { data: clsData } = await supabase
    .from("classes")
    .select("id, name, join_code, teacher:profiles!classes_teacher_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!clsData) notFound();
  const cls = clsData as Row;
  const editor = await canEditClass(id);

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, title, description, lessons(count)").eq("class_id", id).order("created_at"),
    supabase.from("assignments").select("id, title, due_at, max_score").eq("class_id", id).order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  const courses = (coursesData ?? []) as Row[];
  const assignments = (assignmentsData ?? []) as Row[];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: subsData } = assignmentIds.length
    ? await supabase.from("submissions").select("assignment_id, student_id, status, score").in("assignment_id", assignmentIds)
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
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${classGradient(id)} p-6 text-white sm:p-8`}>
        <Icon name="school" className="absolute -right-4 -bottom-6 h-40 w-40 text-white/10" />
        <Link href="/classes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white">
          <Icon name="back" className="h-4 w-4" /> Классы
        </Link>
        <h1 className="text-white">{cls.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/85">
          <span className="flex items-center gap-1.5"><Icon name="school" className="h-4 w-4" />{cls.teacher?.full_name ?? "Учитель не назначен"}</span>
          <span className="flex items-center gap-1.5"><Icon name="book" className="h-4 w-4" />{courses.length} курсов</span>
          <span className="flex items-center gap-1.5"><Icon name="clipboard" className="h-4 w-4" />{assignments.length} заданий</span>
          {editor && <span className="flex items-center gap-1.5"><Icon name="users" className="h-4 w-4" />{students.length} учеников</span>}
        </div>
        {profile.role === "admin" && (
          <Link href={`/admin/classes/${id}`} className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 hover:text-white">
            <Icon name="users" className="h-4 w-4" /> Ученики и настройки
          </Link>
        )}
      </div>
      <Flash error={sp.error} ok={sp.ok} />

      {editor && <JoinCode classId={id} code={cls.join_code} back={`/classes/${id}`} />}

      <section>
        <div className="section-title">
          <h2 className="text-lg">Курсы и уроки</h2>
        </div>
        {courses.length === 0 && !editor ? (
          <div className="card-flat"><EmptyState icon="book" title="Курсов пока нет" text="Учитель скоро добавит материалы." /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className="card-link p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name="book" />
                </div>
                <div className="font-semibold">{c.title}</div>
                {c.description && <div className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</div>}
                <div className="mt-3 text-xs font-medium text-slate-400">{c.lessons?.[0]?.count ?? 0} уроков</div>
              </Link>
            ))}
            {editor && (
              <form action={createCourse} className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5">
                <input type="hidden" name="class_id" value={id} />
                <div className="flex items-center gap-2 font-semibold text-slate-700"><Icon name="plus" className="h-4 w-4" /> Новый курс</div>
                <input name="title" className="input" placeholder="Название: Алгебра, 1 четверть" required />
                <input name="description" className="input" placeholder="Описание (необязательно)" />
                <button className="btn">Создать курс</button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="card-flat overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg">Домашние задания</h2>
          {editor && (
            <Link href={`/classes/${id}/new-assignment`} className="btn btn-sm py-2"><Icon name="plus" className="h-4 w-4" /> Задание</Link>
          )}
        </div>
        {assignments.length === 0 ? (
          <EmptyState icon="clipboard" title="Заданий пока нет" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {assignments.map((a) => {
              const aSubs = subs.filter((s) => s.assignment_id === a.id);
              const waiting = aSubs.filter((s) => s.status === "submitted").length;
              const mine = subMap.get(subKey(a.id, profile.id));
              const overdue = a.due_at && new Date(a.due_at) < new Date();
              return (
                <li key={a.id}>
                  <Link href={`/assignments/${a.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-slate-900 no-underline transition hover:bg-slate-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon name="clipboard" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{a.title}</div>
                      <div className={`text-xs ${overdue ? "text-red-600" : "text-slate-500"}`}>
                        {a.due_at ? `Срок: ${formatDate(a.due_at)}` : "Без срока"} · макс. {a.max_score}
                      </div>
                    </div>
                    {editor ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">{aSubs.length}/{students.length} сдали</span>
                        {waiting > 0 && <span className="badge bg-amber-100 text-amber-800">{waiting} ждут</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {mine?.status === "graded" && <b className="text-sm">{mine.score}/{a.max_score}</b>}
                        <StatusBadge status={mine?.status} />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editor && (
        <section className="card-flat overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg">Журнал оценок</h2>
          </div>
          {students.length === 0 || assignments.length === 0 ? (
            <EmptyState icon="award" title="Журнал пока пуст" text="Он появится, когда в классе будут ученики и задания." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white">Ученик</th>
                    {assignments.map((a) => (
                      <th key={a.id} className="min-w-24 text-center normal-case tracking-normal">
                        <Link href={`/assignments/${a.id}`} title={a.title} className="text-xs font-semibold text-slate-600">
                          {a.title.length > 16 ? a.title.slice(0, 16) + "…" : a.title}
                        </Link>
                      </th>
                    ))}
                    <th className="text-center">Средний</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => {
                    const pct: number[] = [];
                    return (
                      <tr key={st.student_id}>
                        <td className="sticky left-0 bg-white font-medium whitespace-nowrap">{st.profiles?.full_name}</td>
                        {assignments.map((a) => {
                          const s = subMap.get(subKey(a.id, st.student_id));
                          if (s?.status === "graded") pct.push((s.score / a.max_score) * 100);
                          return (
                            <td key={a.id} className="text-center">
                              {s?.status === "graded" ? (
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-emerald-50 px-2 font-semibold text-emerald-700">{s.score}</span>
                              ) : s?.status === "submitted" ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600" title="Ждёт проверки"><Icon name="clock" className="h-4 w-4" /></span>
                              ) : s?.status === "returned" ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600" title="На доработке"><Icon name="refresh" className="h-4 w-4" /></span>
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
            </div>
          )}
        </section>
      )}
    </div>
  );
}

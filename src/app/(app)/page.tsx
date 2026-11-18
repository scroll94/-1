import Link from "next/link";
import { getSession } from "@/lib/auth";
import { formatDate, type Row } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, RoleBadge, StatCard } from "@/components/ui";
import { JoinClassForm } from "@/components/JoinCode";

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty", hour: "numeric", hour12: false }));
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function firstName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[1] : parts[0] || "";
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const hello = `${greeting()}, ${firstName(profile.full_name) || "друг"}!`;

  // ---------------- Ученик ----------------
  if (profile.role === "student") {
    const [{ data: classesData }, { data: assignmentsData }, { data: subsData }] = await Promise.all([
      supabase.from("classes").select("id, name"),
      supabase.from("assignments").select("id, title, due_at, max_score, classes(name)").order("due_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("submissions")
        .select("assignment_id, status, score, graded_at, assignments(title, max_score)")
        .eq("student_id", profile.id),
    ]);
    const classes = (classesData ?? []) as Row[];
    const assignments = (assignmentsData ?? []) as Row[];
    const subs = (subsData ?? []) as Row[];
    const byAssignment = new Map(subs.map((s) => [s.assignment_id, s]));
    const todo = assignments.filter((a) => {
      const s = byAssignment.get(a.id);
      return !s || s.status === "returned";
    });
    const graded = subs.filter((s) => s.status === "graded");
    const avg = graded.length
      ? Math.round(graded.reduce((sum, s) => sum + (s.score / (s.assignments?.max_score || 1)) * 100, 0) / graded.length)
      : null;
    const recent = [...graded].sort((a, b) => String(b.graded_at).localeCompare(String(a.graded_at))).slice(0, 5);

    return (
      <div className="space-y-6">
        <div>
          <h1>{hello}</h1>
          <p className="mt-1 text-slate-500">Вот что происходит с вашей учёбой.</p>
        </div>
        <Flash error={sp.error} ok={sp.ok} />

        {classes.length === 0 && (
          <div className="card border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Icon name="sparkles" />
              </div>
              <div>
                <h2>Вступите в свой класс</h2>
                <p className="muted mt-0.5">Введите код, который дал учитель, — и вам откроются уроки и задания.</p>
              </div>
            </div>
            <JoinClassForm back="/" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon="layers" label="Мои классы" value={classes.length} href="/classes" />
          <StatCard icon="clipboard" label="Нужно сдать" value={todo.length} tone="amber" />
          <StatCard icon="award" label="Средний результат" value={avg === null ? "—" : `${avg}%`} tone="emerald" href="/grades" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="card-flat">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2>Нужно сделать</h2>
              {todo.length > 0 && <span className="badge bg-amber-100 text-amber-800">{todo.length}</span>}
            </div>
            {todo.length === 0 ? (
              <EmptyState icon="check" title="Все задания сданы" text="Отличная работа! Новые задания появятся здесь." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {todo.slice(0, 8).map((a) => {
                  const overdue = a.due_at && new Date(a.due_at) < new Date();
                  return (
                    <li key={a.id}>
                      <Link href={`/assignments/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 text-slate-900 no-underline transition hover:bg-slate-50">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${overdue ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"}`}>
                          <Icon name="clipboard" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{a.title}</div>
                          <div className={`text-xs ${overdue ? "text-red-600" : "text-slate-500"}`}>
                            {a.classes?.name} · {a.due_at ? `до ${formatDate(a.due_at)}` : "без срока"}
                          </div>
                        </div>
                        <StatusBadge status={byAssignment.get(a.id)?.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card-flat">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2>Последние оценки</h2>
              <Link href="/grades" className="text-sm font-medium">Все</Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState icon="award" title="Пока нет оценок" text="Когда учитель проверит работу, оценка появится здесь." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((s) => {
                  const pct = Math.round((s.score / (s.assignments?.max_score || 1)) * 100);
                  const tone = pct >= 85 ? "bg-emerald-100 text-emerald-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                  return (
                    <li key={s.assignment_id}>
                      <Link href={`/assignments/${s.assignment_id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 text-slate-900 no-underline transition hover:bg-slate-50">
                        <span className="truncate">{s.assignments?.title}</span>
                        <span className={`badge text-sm ${tone}`}>{s.score} / {s.assignments?.max_score}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ---------------- Учитель / админ ----------------
  const isAdmin = profile.role === "admin";
  const [{ data: classesData }, { data: pendingData }, newUsersRes, countsRes] = await Promise.all([
    supabase.from("classes").select("id, name, class_students(count)"),
    supabase
      .from("submissions")
      .select("id, assignment_id, submitted_at, student:profiles!submissions_student_id_fkey(full_name), assignments(title, classes(name))")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true })
      .limit(50),
    isAdmin
      ? supabase.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from("profiles").select("role")
      : Promise.resolve({ data: [] }),
  ]);
  const classes = (classesData ?? []) as Row[];
  const pending = (pendingData ?? []) as Row[];
  const newUsers = (newUsersRes.data ?? []) as Row[];
  const roles = (countsRes.data ?? []) as Row[];
  const studentsInClasses = classes.reduce((n, c) => n + (c.class_students?.[0]?.count ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageTop hello={hello} isAdmin={isAdmin} />
      <Flash error={sp.error} ok={sp.ok} />

      <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <StatCard icon="layers" label={isAdmin ? "Классов" : "Мои классы"} value={classes.length} href="/classes" />
        <StatCard icon="users" label="Учеников в классах" value={studentsInClasses} tone="sky" />
        <StatCard icon="inbox" label="Ждут проверки" value={pending.length} tone="amber" />
        {isAdmin && (
          <StatCard icon="userPlus" label="Учителей" value={roles.filter((r) => r.role === "teacher").length} tone="emerald" href="/admin/users?role=teacher" />
        )}
      </div>

      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-[1.5fr_1fr]" : ""}`}>
        <section className="card-flat overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2>Работы на проверку</h2>
            {pending.length > 0 && <span className="badge bg-amber-100 text-amber-800">{pending.length}</span>}
          </div>
          {pending.length === 0 ? (
            <EmptyState icon="check" title="Новых работ нет" text="Когда ученики сдадут задания, они появятся здесь." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.map((s) => (
                <li key={s.id}>
                  <Link href={`/assignments/${s.assignment_id}`} className="flex items-center gap-3 px-5 py-3.5 text-slate-900 no-underline transition hover:bg-slate-50">
                    <Avatar name={s.student?.full_name ?? ""} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.student?.full_name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {s.assignments?.title} · {s.assignments?.classes?.name}
                      </div>
                    </div>
                    <span className="hidden text-xs text-slate-400 sm:block">{formatDate(s.submitted_at)}</span>
                    <Icon name="chevron" className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && (
          <section className="card-flat overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2>Новые пользователи</h2>
              <Link href="/admin/users" className="text-sm font-medium">Все</Link>
            </div>
            {newUsers.length === 0 ? (
              <EmptyState icon="users" title="Пока никого" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {newUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={u.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{u.full_name || "Без имени"}</div>
                      <div className="text-xs text-slate-400">{formatDate(u.created_at)}</div>
                    </div>
                    <RoleBadge role={u.role} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PageTop({ hello, isAdmin }: { hello: string; isAdmin: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1>{hello}</h1>
        <p className="mt-1 text-slate-500">{isAdmin ? "Панель администратора" : "Ваши классы и работы учеников"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/classes" className="btn-secondary"><Icon name="layers" className="h-4 w-4" />Классы</Link>
        {isAdmin && <Link href="/admin/users" className="btn"><Icon name="userPlus" className="h-4 w-4" />Пользователи</Link>}
      </div>
    </div>
  );
}

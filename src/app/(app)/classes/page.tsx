import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { JoinClassForm } from "@/components/JoinCode";
import { EmptyState, PageHeader, classGradient } from "@/components/ui";
import type { Row } from "@/lib/utils";

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const { data } = await supabase
    .from("classes")
    .select("id, name, teacher:profiles!classes_teacher_id_fkey(full_name), courses(count), assignments(count), class_students(count)")
    .order("name");
  const classes = (data ?? []) as Row[];
  const isStudent = profile.role === "student";

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.role === "admin" ? "Все классы" : "Мои классы"}
        subtitle={isStudent ? "Уроки, видео и задания ваших классов" : "Классы, которые вы ведёте"}
        actions={
          profile.role === "admin" && (
            <Link href="/admin/classes" className="btn"><Icon name="plus" className="h-4 w-4" /> Новый класс</Link>
          )
        }
      />
      <Flash error={sp.error} ok={sp.ok} />

      {isStudent && (
        <section className="card">
          <h2 className="mb-1">Вступить в класс</h2>
          <p className="muted mb-4">Введите 6-значный код, который дал учитель.</p>
          <JoinClassForm back="/classes" />
        </section>
      )}

      {classes.length === 0 ? (
        <div className="card-flat">
          <EmptyState
            icon="layers"
            title="Классов пока нет"
            text={
              isStudent
                ? "Введите код класса выше, чтобы получить доступ к урокам."
                : profile.role === "admin"
                  ? "Создайте первый класс в разделе «Управление классами»."
                  : "Администратор ещё не назначил вам классы."
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="card-link overflow-hidden">
              <div className={`relative h-24 bg-gradient-to-br ${classGradient(c.id)} p-5`}>
                <Icon name="book" className="absolute right-4 bottom-3 h-12 w-12 text-white/25" />
                <div className="text-lg font-bold text-white drop-shadow-sm">{c.name}</div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Icon name="school" className="h-4 w-4" /> {c.teacher?.full_name ?? "Учитель не назначен"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="badge bg-slate-100 text-slate-600">{c.courses?.[0]?.count ?? 0} курсов</span>
                  <span className="badge bg-slate-100 text-slate-600">{c.assignments?.[0]?.count ?? 0} заданий</span>
                  {!isStudent && <span className="badge bg-slate-100 text-slate-600">{c.class_students?.[0]?.count ?? 0} учеников</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

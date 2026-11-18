import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, PageHeader, classGradient } from "@/components/ui";
import { formatDate, type Row } from "@/lib/utils";

export default async function GradesPage() {
  const { supabase, profile } = await getSession();
  if (profile.role !== "student") redirect("/classes");

  const [{ data: aData }, { data: sData }] = await Promise.all([
    supabase.from("assignments").select("id, title, due_at, max_score, class_id, classes(name)").order("due_at"),
    supabase.from("submissions").select("assignment_id, status, score, feedback, graded_at").eq("student_id", profile.id),
  ]);
  const assignments = (aData ?? []) as Row[];
  const subs = new Map(((sData ?? []) as Row[]).map((s) => [s.assignment_id, s]));

  const byClass = new Map<string, { name: string; items: Row[] }>();
  for (const a of assignments) {
    if (!byClass.has(a.class_id)) byClass.set(a.class_id, { name: a.classes?.name, items: [] });
    byClass.get(a.class_id)!.items.push(a);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Мои оценки" subtitle="Все задания и результаты по классам" />
      {byClass.size === 0 && <div className="card-flat"><EmptyState icon="award" title="Заданий пока нет" /></div>}
      {[...byClass.entries()].map(([classId, { name, items }]) => {
        const graded = items.filter((a) => subs.get(a.id)?.status === "graded");
        const avg = graded.length
          ? Math.round(graded.reduce((sum, a) => sum + (subs.get(a.id).score / a.max_score) * 100, 0) / graded.length)
          : null;
        return (
          <section key={classId} className="card-flat overflow-hidden">
            <div className={`flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r ${classGradient(classId)} px-5 py-4 text-white`}>
              <Link href={`/classes/${classId}`} className="text-lg font-semibold text-white hover:text-white">{name}</Link>
              {avg !== null && <span className="badge bg-white/20 py-1 text-sm text-white">Средний результат: {avg}%</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Задание</th><th>Срок</th><th>Статус</th><th>Оценка</th><th>Комментарий</th></tr></thead>
                <tbody>
                  {items.map((a) => {
                    const s = subs.get(a.id);
                    return (
                      <tr key={a.id}>
                        <td className="font-medium"><Link href={`/assignments/${a.id}`}>{a.title}</Link></td>
                        <td className="whitespace-nowrap text-slate-500">{formatDate(a.due_at)}</td>
                        <td><StatusBadge status={s?.status} /></td>
                        <td className="font-semibold whitespace-nowrap">{s?.status === "graded" ? `${s.score} / ${a.max_score}` : "—"}</td>
                        <td className="max-w-xs text-slate-600">{s?.feedback ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

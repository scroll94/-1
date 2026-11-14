import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionForm } from "@/components/SubmissionForm";
import { AssignmentForm } from "@/components/AssignmentForm";
import { formatDate, type Row } from "@/lib/utils";
import { deleteAssignment, gradeSubmission } from "../../actions";

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const { data } = await supabase
    .from("assignments")
    .select("*, classes(id, name), lessons(id, title)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const a = data as Row;
  const editor = await canEditClass(a.class_id);
  const attachmentUrl = (await signedUrls(supabase, "materials", [a.attachment_path])).get(a.attachment_path);
  const overdue = a.due_at && new Date(a.due_at) < new Date();

  const header = (
    <>
      <Link href={`/classes/${a.class_id}`} className="text-sm">← {a.classes?.name}</Link>
      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1>{a.title}</h1>
          <div className="text-right text-sm">
            <div className={overdue ? "font-semibold text-red-600" : "text-slate-600"}>Срок: {formatDate(a.due_at)}</div>
            <div className="text-slate-500">Макс. балл: {a.max_score}</div>
          </div>
        </div>
        {a.lessons && (
          <div className="text-sm">К уроку: <Link href={`/lessons/${a.lessons.id}`}>{a.lessons.title}</Link></div>
        )}
        {a.description && <div className="whitespace-pre-wrap leading-relaxed">{a.description}</div>}
        {attachmentUrl && (
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            📎 {a.attachment_name ?? "Файл задания"}
          </a>
        )}
      </div>
      <Flash error={sp.error} ok={sp.ok} />
    </>
  );

  // ---------- Ученик ----------
  if (!editor) {
    const { data: subData } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", id)
      .eq("student_id", profile.id)
      .maybeSingle();
    const sub = subData as Row;
    const fileUrl = (await signedUrls(supabase, "submissions", [sub?.file_path])).get(sub?.file_path);

    return (
      <div className="space-y-6">
        {header}
        {sub && (
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2>Моя работа</h2>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-xs text-slate-500">Сдано: {formatDate(sub.submitted_at)}</p>
            {sub.answer_text && <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{sub.answer_text}</div>}
            {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer">📎 {sub.file_name ?? "Файл"}</a>}
            {sub.status === "graded" && (
              <div className="rounded-lg bg-emerald-50 p-4">
                <div className="text-2xl font-bold text-emerald-800">{sub.score} / {a.max_score}</div>
                {sub.feedback && <div className="mt-2 whitespace-pre-wrap text-emerald-900">Комментарий учителя: {sub.feedback}</div>}
              </div>
            )}
            {sub.status === "returned" && (
              <div className="rounded-lg bg-red-50 p-4 text-red-900">
                <b>Нужно исправить:</b>
                <div className="mt-1 whitespace-pre-wrap">{sub.feedback}</div>
              </div>
            )}
          </section>
        )}
        {sub?.status !== "graded" && (
          <section className="card">
            <h2 className="mb-3">{sub ? "Изменить и отправить заново" : "Сдать работу"}</h2>
            <SubmissionForm assignmentId={id} initialText={sub?.answer_text ?? ""} resubmit={!!sub} />
          </section>
        )}
      </div>
    );
  }

  // ---------- Учитель / админ ----------
  const [{ data: studentsData }, { data: subsData }, { data: lessonsData }] = await Promise.all([
    supabase.from("class_students").select("student_id, profiles(full_name)").eq("class_id", a.class_id),
    supabase.from("submissions").select("*").eq("assignment_id", id),
    supabase.from("lessons").select("id, title, courses!inner(class_id, title)").eq("courses.class_id", a.class_id).order("position"),
  ]);
  const students = ((studentsData ?? []) as Row[]).sort((x, y) =>
    String(x.profiles?.full_name).localeCompare(String(y.profiles?.full_name), "ru"),
  );
  const subs = (subsData ?? []) as Row[];
  const subBy = new Map(subs.map((s) => [s.student_id, s]));
  const fileUrls = await signedUrls(supabase, "submissions", subs.map((s) => s.file_path));
  const order: Record<string, number> = { submitted: 0, returned: 1, graded: 2 };
  students.sort((x, y) => (order[subBy.get(x.student_id)?.status] ?? 3) - (order[subBy.get(y.student_id)?.status] ?? 3));
  const lessons = ((lessonsData ?? []) as Row[]).map((l) => ({ id: l.id, title: `${l.courses?.title} — ${l.title}` }));
  const pendingCount = subs.filter((s) => s.status === "submitted").length;

  return (
    <div className="space-y-6">
      {header}

      <section className="card">
        <h2 className="mb-1">Работы учеников</h2>
        <p className="mb-4 text-sm text-slate-500">
          Сдали {subs.length} из {students.length} · ждут проверки: {pendingCount}
        </p>
        <div className="space-y-4">
          {students.map((st) => {
            const s = subBy.get(st.student_id);
            return (
              <div key={st.student_id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <b>{st.profiles?.full_name}</b>
                  <div className="flex items-center gap-2">
                    {s && <span className="text-xs text-slate-500">{formatDate(s.submitted_at)}</span>}
                    <StatusBadge status={s?.status} />
                  </div>
                </div>
                {!s ? (
                  <p className="text-sm text-slate-400">Ещё не сдал(а)</p>
                ) : (
                  <>
                    {s.answer_text && <div className="mb-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{s.answer_text}</div>}
                    {s.file_path && fileUrls.get(s.file_path) && (
                      <a href={fileUrls.get(s.file_path)} target="_blank" rel="noopener noreferrer" className="text-sm">
                        📎 {s.file_name ?? "Файл"}
                      </a>
                    )}
                    <form action={gradeSubmission} className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_auto] sm:items-start">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="assignment_id" value={id} />
                      <input
                        name="score"
                        type="number"
                        min={0}
                        max={a.max_score}
                        defaultValue={s.score ?? ""}
                        placeholder={`0–${a.max_score}`}
                        className="input"
                      />
                      <textarea
                        name="feedback"
                        defaultValue={s.feedback ?? ""}
                        rows={2}
                        placeholder="Комментарий: что неправильно, что исправить"
                        className="input"
                      />
                      <div className="flex gap-2 sm:flex-col">
                        <button name="action" value="grade" className="btn">Оценить</button>
                        <button name="action" value="return" className="btn-secondary">На доработку</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            );
          })}
          {students.length === 0 && <p className="text-sm text-slate-500">В классе нет учеников.</p>}
        </div>
      </section>

      <section className="card">
        <details open={sp.edit === "1"}>
          <summary className="cursor-pointer font-semibold">Редактировать задание</summary>
          <div className="mt-4">
            <AssignmentForm classId={a.class_id} lessons={lessons} initial={a} />
          </div>
          <form action={deleteAssignment} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="class_id" value={a.class_id} />
            <ConfirmButton message="Удалить задание вместе со всеми сданными работами и оценками?">Удалить задание</ConfirmButton>
          </form>
        </details>
      </section>
    </div>
  );
}

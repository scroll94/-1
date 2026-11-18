import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionForm } from "@/components/SubmissionForm";
import { AssignmentForm } from "@/components/AssignmentForm";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, type Row } from "@/lib/utils";
import { deleteAssignment, gradeSubmission } from "../../actions";

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; edit?: string; filter?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const { data } = await supabase.from("assignments").select("*, classes(id, name), lessons(id, title)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const a = data as Row;
  const editor = await canEditClass(a.class_id);
  const attachmentUrl = (await signedUrls(supabase, "materials", [a.attachment_path])).get(a.attachment_path);
  const overdue = a.due_at && new Date(a.due_at) < new Date();

  const header = (
    <>
      <PageHeader title={a.title} back={{ href: `/classes/${a.class_id}`, label: a.classes?.name ?? "Класс" }} />
      <section className="card mb-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`badge py-1 ${overdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
            <Icon name="clock" className="h-3.5 w-3.5" /> {a.due_at ? `Срок: ${formatDate(a.due_at)}` : "Без срока"}
          </span>
          <span className="badge bg-indigo-50 py-1 text-indigo-700"><Icon name="award" className="h-3.5 w-3.5" /> Макс. балл: {a.max_score}</span>
          {a.lessons && (
            <Link href={`/lessons/${a.lessons.id}`} className="badge bg-slate-100 py-1 text-slate-700 hover:bg-slate-200">
              <Icon name="book" className="h-3.5 w-3.5" /> {a.lessons.title}
            </Link>
          )}
        </div>
        {a.description ? (
          <div className="leading-relaxed whitespace-pre-wrap text-slate-700">{a.description}</div>
        ) : (
          <p className="muted">Описание не указано.</p>
        )}
        {attachmentUrl && (
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4">
            <Icon name="file" className="h-4 w-4" /> {a.attachment_name ?? "Файл задания"}
          </a>
        )}
      </section>
      <Flash error={sp.error} ok={sp.ok} />
    </>
  );

  // ---------- Ученик ----------
  if (!editor) {
    const { data: subData } = await supabase.from("submissions").select("*").eq("assignment_id", id).eq("student_id", profile.id).maybeSingle();
    const sub = subData as Row;
    const fileUrl = (await signedUrls(supabase, "submissions", [sub?.file_path])).get(sub?.file_path);

    return (
      <div>
        {header}
        <div className="grid gap-6 lg:grid-cols-2">
          {sub && (
            <section className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2>Моя работа</h2>
                <StatusBadge status={sub.status} />
              </div>
              <p className="text-xs text-slate-500">Отправлено: {formatDate(sub.submitted_at)}</p>
              {sub.answer_text && <div className="rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-wrap">{sub.answer_text}</div>}
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <Icon name="file" className="h-4 w-4" /> {sub.file_name ?? "Файл"}
                </a>
              )}
              {sub.status === "graded" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="text-sm font-medium text-emerald-700">Оценка</div>
                  <div className="text-4xl font-bold text-emerald-800">{sub.score}<span className="text-xl text-emerald-600"> / {a.max_score}</span></div>
                  {sub.feedback && (
                    <div className="mt-3 flex gap-2 text-sm text-emerald-900">
                      <Icon name="message" className="mt-0.5 h-4 w-4" />
                      <span className="whitespace-pre-wrap">{sub.feedback}</span>
                    </div>
                  )}
                </div>
              )}
              {sub.status === "returned" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
                  <div className="mb-1 flex items-center gap-2 font-semibold"><Icon name="refresh" className="h-4 w-4" /> Нужно исправить</div>
                  <div className="text-sm whitespace-pre-wrap">{sub.feedback}</div>
                </div>
              )}
            </section>
          )}
          {sub?.status !== "graded" && (
            <section className="card">
              <h2 className="mb-4">{sub ? "Исправить и отправить заново" : "Сдать работу"}</h2>
              <SubmissionForm assignmentId={id} initialText={sub?.answer_text ?? ""} resubmit={!!sub} />
            </section>
          )}
        </div>
      </div>
    );
  }

  // ---------- Учитель / админ ----------
  const [{ data: studentsData }, { data: subsData }, { data: lessonsData }] = await Promise.all([
    supabase.from("class_students").select("student_id, profiles(full_name)").eq("class_id", a.class_id),
    supabase.from("submissions").select("*").eq("assignment_id", id),
    supabase.from("lessons").select("id, title, courses!inner(class_id, title)").eq("courses.class_id", a.class_id).order("position"),
  ]);
  const subs = (subsData ?? []) as Row[];
  const subBy = new Map(subs.map((s) => [s.student_id, s]));
  const order: Record<string, number> = { submitted: 0, returned: 1, graded: 2 };
  const allStudents = ((studentsData ?? []) as Row[])
    .sort((x, y) => String(x.profiles?.full_name).localeCompare(String(y.profiles?.full_name), "ru"))
    .sort((x, y) => (order[subBy.get(x.student_id)?.status] ?? 3) - (order[subBy.get(y.student_id)?.status] ?? 3));
  const filter = sp.filter ?? "all";
  const students = allStudents.filter((st) => {
    const s = subBy.get(st.student_id)?.status;
    if (filter === "pending") return s === "submitted";
    if (filter === "missing") return !s;
    return true;
  });
  const fileUrls = await signedUrls(supabase, "submissions", subs.map((s) => s.file_path));
  const lessons = ((lessonsData ?? []) as Row[]).map((l) => ({ id: l.id, title: `${l.courses?.title} — ${l.title}` }));
  const pendingCount = subs.filter((s) => s.status === "submitted").length;
  const missingCount = allStudents.filter((st) => !subBy.get(st.student_id)).length;
  const FILTERS = [
    { key: "all", label: "Все", n: allStudents.length },
    { key: "pending", label: "Ждут проверки", n: pendingCount },
    { key: "missing", label: "Не сдали", n: missingCount },
  ];

  return (
    <div>
      {header}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Работы учеников</h2>
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/assignments/${id}${f.key === "all" ? "" : `?filter=${f.key}`}`} className={`tab py-1.5 ${filter === f.key ? "tab-active" : ""}`}>
              {f.label} <span className="rounded-md bg-slate-200/70 px-1.5 text-xs">{f.n}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {students.length === 0 && (
          <div className="card-flat"><EmptyState icon="users" title={allStudents.length ? "Здесь пусто" : "В классе нет учеников"} /></div>
        )}
        {students.map((st) => {
          const s = subBy.get(st.student_id);
          return (
            <div key={st.student_id} className="card">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={st.profiles?.full_name ?? ""} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{st.profiles?.full_name}</div>
                  {s && <div className="text-xs text-slate-500">Сдано {formatDate(s.submitted_at)}</div>}
                </div>
                {s?.status === "graded" && <span className="text-lg font-bold">{s.score}<span className="text-sm text-slate-400">/{a.max_score}</span></span>}
                <StatusBadge status={s?.status} />
              </div>
              {s && (
                <div className="mt-4 space-y-3">
                  {s.answer_text && <div className="rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-wrap">{s.answer_text}</div>}
                  {s.file_path && fileUrls.get(s.file_path) && (
                    <a href={fileUrls.get(s.file_path)} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                      <Icon name="file" className="h-4 w-4" /> {s.file_name ?? "Файл"}
                    </a>
                  )}
                  <form action={gradeSubmission} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[110px_1fr_auto] sm:items-start">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="assignment_id" value={id} />
                    <div>
                      <label className="label text-xs">Оценка</label>
                      <input name="score" type="number" min={0} max={a.max_score} defaultValue={s.score ?? ""} placeholder={`0–${a.max_score}`} className="input text-center text-lg font-semibold" />
                    </div>
                    <div>
                      <label className="label text-xs">Комментарий</label>
                      <textarea name="feedback" defaultValue={s.feedback ?? ""} rows={2} placeholder="Что сделано хорошо, что исправить" className="input" />
                    </div>
                    <div className="flex gap-2 sm:flex-col sm:pt-6">
                      <button name="action" value="grade" className="btn"><Icon name="check" className="h-4 w-4" /> Оценить</button>
                      <button name="action" value="return" className="btn-secondary"><Icon name="refresh" className="h-4 w-4" /> На доработку</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="card mt-6">
        <details open={sp.edit === "1"}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <Icon name="edit" className="h-4 w-4" /> Редактировать задание
          </summary>
          <div className="mt-4">
            <AssignmentForm classId={a.class_id} lessons={lessons} initial={a} />
          </div>
          <form action={deleteAssignment} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="class_id" value={a.class_id} />
            <ConfirmButton message="Удалить задание вместе со всеми сданными работами и оценками?"><Icon name="trash" className="h-4 w-4" /> Удалить задание</ConfirmButton>
          </form>
        </details>
      </section>
    </div>
  );
}

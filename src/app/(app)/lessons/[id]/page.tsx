import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MaterialUpload } from "@/components/MaterialUpload";
import { formatDate, youtubeEmbed, type Row } from "@/lib/utils";
import { addLink, deleteLesson, deleteMaterial, updateLesson } from "../../actions";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getSession();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, content, position, course_id, courses(id, title, class_id)")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();
  const l = lesson as Row;
  const classId: string = l.courses?.class_id;
  const editor = await canEditClass(classId);

  const [{ data: matsData }, { data: asgData }] = await Promise.all([
    supabase.from("materials").select("*").eq("lesson_id", id).order("created_at"),
    supabase.from("assignments").select("id, title, due_at").eq("lesson_id", id).order("due_at"),
  ]);
  const materials = (matsData ?? []) as Row[];
  const assignments = (asgData ?? []) as Row[];
  const urls = await signedUrls(supabase, "materials", materials.map((m) => m.storage_path));
  const videos = materials.filter((m) => m.kind === "video");
  const others = materials.filter((m) => m.kind !== "video");

  const DeleteMat = ({ m }: { m: Row }) =>
    editor ? (
      <form action={deleteMaterial}>
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="lesson_id" value={id} />
        <ConfirmButton message={`Удалить «${m.name}»?`}>Удалить</ConfirmButton>
      </form>
    ) : null;

  return (
    <div className="space-y-6">
      <Link href={`/courses/${l.course_id}`} className="text-sm">← {l.courses?.title}</Link>
      <h1>{l.title}</h1>
      <Flash error={sp.error} ok={sp.ok} />

      {videos.map((m) => (
        <section key={m.id} className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2>🎬 {m.name}</h2>
            <DeleteMat m={m} />
          </div>
          {urls.get(m.storage_path) ? (
            <video controls preload="metadata" className="w-full rounded-lg bg-black" src={urls.get(m.storage_path)} />
          ) : (
            <p className="text-sm text-red-700">Видео недоступно</p>
          )}
        </section>
      ))}

      {others
        .filter((m) => m.kind === "link" && youtubeEmbed(m.url))
        .map((m) => (
          <section key={m.id} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2>▶️ {m.name}</h2>
              <DeleteMat m={m} />
            </div>
            <div className="aspect-video">
              <iframe
                src={youtubeEmbed(m.url)!}
                className="h-full w-full rounded-lg"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ))}

      {l.content && (
        <section className="card">
          <h2 className="mb-2">Конспект</h2>
          <div className="whitespace-pre-wrap leading-relaxed">{l.content}</div>
        </section>
      )}

      {others.some((m) => !(m.kind === "link" && youtubeEmbed(m.url))) && (
        <section className="card">
          <h2 className="mb-3">Материалы</h2>
          <ul className="divide-y divide-slate-100">
            {others
              .filter((m) => !(m.kind === "link" && youtubeEmbed(m.url)))
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  {m.kind === "link" ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer">🔗 {m.name}</a>
                  ) : (
                    <a href={urls.get(m.storage_path)} target="_blank" rel="noopener noreferrer">📎 {m.name}</a>
                  )}
                  <DeleteMat m={m} />
                </li>
              ))}
          </ul>
        </section>
      )}

      {(assignments.length > 0 || editor) && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2>Домашнее задание к уроку</h2>
            {editor && (
              <Link href={`/classes/${classId}/new-assignment?lesson=${id}`} className="btn-secondary">+ Задание</Link>
            )}
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">Заданий нет.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <li key={a.id} className="flex justify-between py-2">
                  <Link href={`/assignments/${a.id}`}>{a.title}</Link>
                  <span className="text-sm text-slate-500">срок: {formatDate(a.due_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editor && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card">
            <h2 className="mb-3">Загрузить видео / файл</h2>
            <MaterialUpload lessonId={id} />
          </section>
          <section className="card">
            <h2 className="mb-3">Добавить ссылку (YouTube и др.)</h2>
            <form action={addLink} className="space-y-3">
              <input type="hidden" name="lesson_id" value={id} />
              <input name="url" className="input" placeholder="https://youtube.com/watch?v=…" required />
              <input name="name" className="input" placeholder="Название" />
              <button className="btn">Добавить</button>
            </form>
          </section>
          <section className="card md:col-span-2">
            <h2 className="mb-3">Редактировать урок</h2>
            <form action={updateLesson} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <input name="title" defaultValue={l.title} className="input" required />
                <input name="position" type="number" defaultValue={l.position} className="input" title="Порядковый номер" />
              </div>
              <textarea name="content" defaultValue={l.content} rows={8} className="input" placeholder="Конспект урока" />
              <button className="btn">Сохранить</button>
            </form>
            <form action={deleteLesson} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="course_id" value={l.course_id} />
              <ConfirmButton message="Удалить урок со всеми материалами?">Удалить урок</ConfirmButton>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

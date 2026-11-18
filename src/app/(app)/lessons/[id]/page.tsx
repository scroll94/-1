import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { MaterialUpload } from "@/components/MaterialUpload";
import { EmptyState, PageHeader } from "@/components/ui";
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
  const isYoutube = (m: Row) => m.kind === "link" && !!youtubeEmbed(m.url);
  const players = materials.filter((m) => m.kind === "video" || isYoutube(m));
  const files = materials.filter((m) => !(m.kind === "video" || isYoutube(m)));

  const DeleteMat = ({ m }: { m: Row }) =>
    editor ? (
      <form action={deleteMaterial}>
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="lesson_id" value={id} />
        <ConfirmButton message={`Удалить «${m.name}»?`} className="btn-danger btn-sm">
          <Icon name="trash" className="h-4 w-4" />
        </ConfirmButton>
      </form>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={l.title} back={{ href: `/courses/${l.course_id}`, label: l.courses?.title ?? "Курс" }} />
      <Flash error={sp.error} ok={sp.ok} />

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 space-y-6">
          {players.length === 0 && !l.content && files.length === 0 && (
            <div className="card-flat"><EmptyState icon="video" title="Материалов пока нет" text={editor ? "Загрузите видео или файл справа." : "Учитель скоро добавит материалы."} /></div>
          )}

          {players.map((m) => (
            <section key={m.id} className="card-flat overflow-hidden">
              <div className="aspect-video bg-slate-900">
                {m.kind === "video" ? (
                  urls.get(m.storage_path) ? (
                    <video controls preload="metadata" className="h-full w-full" src={urls.get(m.storage_path)} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">Видео недоступно</div>
                  )
                ) : (
                  <iframe src={youtubeEmbed(m.url)!} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <Icon name="play" className="h-4 w-4 text-indigo-600" /> {m.name}
                </div>
                <DeleteMat m={m} />
              </div>
            </section>
          ))}

          {l.content && (
            <section className="card">
              <h2 className="mb-3 flex items-center gap-2"><Icon name="book" className="h-5 w-5 text-indigo-600" /> Конспект</h2>
              <div className="leading-relaxed whitespace-pre-wrap text-slate-700">{l.content}</div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {files.length > 0 && (
            <section className="card-flat overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4"><h2>Материалы</h2></div>
              <ul className="divide-y divide-slate-100">
                {files.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={m.kind === "link" ? "link" : "file"} className="h-4 w-4" />
                    </div>
                    <a href={m.kind === "link" ? m.url : urls.get(m.storage_path)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium">
                      {m.name}
                    </a>
                    <DeleteMat m={m} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(assignments.length > 0 || editor) && (
            <section className="card-flat overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2>Домашнее задание</h2>
                {editor && (
                  <Link href={`/classes/${classId}/new-assignment?lesson=${id}`} className="btn-ghost btn-sm"><Icon name="plus" className="h-4 w-4" /> Добавить</Link>
                )}
              </div>
              {assignments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">Заданий к уроку нет.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/assignments/${a.id}`} className="flex items-center gap-3 px-5 py-3 text-slate-900 no-underline hover:bg-slate-50">
                        <Icon name="clipboard" className="h-5 w-5 text-indigo-600" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-slate-500">{a.due_at ? `до ${formatDate(a.due_at)}` : "без срока"}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {editor && (
            <>
              <section className="card">
                <h2 className="mb-4 flex items-center gap-2"><Icon name="upload" className="h-5 w-5 text-indigo-600" /> Загрузить видео или файл</h2>
                <MaterialUpload lessonId={id} />
              </section>
              <section className="card">
                <h2 className="mb-4 flex items-center gap-2"><Icon name="link" className="h-5 w-5 text-indigo-600" /> Ссылка или YouTube</h2>
                <form action={addLink} className="space-y-3">
                  <input type="hidden" name="lesson_id" value={id} />
                  <input name="url" className="input" placeholder="https://youtube.com/watch?v=…" required />
                  <input name="name" className="input" placeholder="Название" />
                  <button className="btn w-full">Добавить</button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>

      {editor && (
        <section className="card">
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
              <Icon name="edit" className="h-4 w-4" /> Редактировать урок
            </summary>
            <form action={updateLesson} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <input name="title" defaultValue={l.title} className="input" required />
                <input name="position" type="number" defaultValue={l.position} className="input" title="Порядковый номер" />
              </div>
              <textarea name="content" defaultValue={l.content} rows={8} className="input" placeholder="Конспект урока" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button className="btn">Сохранить</button>
              </div>
            </form>
            <form action={deleteLesson} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="course_id" value={l.course_id} />
              <ConfirmButton message="Удалить урок со всеми материалами?"><Icon name="trash" className="h-4 w-4" /> Удалить урок</ConfirmButton>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}

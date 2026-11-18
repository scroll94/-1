import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Row } from "@/lib/utils";
import { createLesson, deleteCourse, updateCourse } from "../../actions";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getSession();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, class_id, classes(name)")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();
  const c = course as Row;
  const editor = await canEditClass(c.class_id);
  const { data } = await supabase
    .from("lessons")
    .select("id, title, position, materials(kind)")
    .eq("course_id", id)
    .order("position")
    .order("created_at");
  const lessons = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <PageHeader title={c.title} subtitle={c.description || undefined} back={{ href: `/classes/${c.class_id}`, label: c.classes?.name ?? "Класс" }} />
      <Flash error={sp.error} ok={sp.ok} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card-flat overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg">Уроки</h2>
            <span className="badge bg-slate-100 text-slate-600">{lessons.length}</span>
          </div>
          {lessons.length === 0 ? (
            <EmptyState icon="video" title="Уроков пока нет" text={editor ? "Создайте первый урок справа." : "Учитель скоро добавит уроки."} />
          ) : (
            <ol className="divide-y divide-slate-100">
              {lessons.map((l, i) => {
                const videos = (l.materials ?? []).filter((m: Row) => m.kind === "video").length;
                const files = (l.materials ?? []).length - videos;
                return (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`} className="flex items-center gap-4 px-5 py-4 text-slate-900 no-underline transition hover:bg-slate-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{l.title}</div>
                        <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                          {videos > 0 && <span className="flex items-center gap-1"><Icon name="video" className="h-3.5 w-3.5" />{videos} видео</span>}
                          {files > 0 && <span className="flex items-center gap-1"><Icon name="file" className="h-3.5 w-3.5" />{files} материалов</span>}
                          {videos + files === 0 && <span>Без материалов</span>}
                        </div>
                      </div>
                      <Icon name="chevron" className="h-4 w-4 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {editor && (
          <div className="space-y-6">
            <section className="card">
              <h2 className="mb-4 flex items-center gap-2"><Icon name="plus" className="h-4 w-4" /> Новый урок</h2>
              <form action={createLesson} className="space-y-3">
                <input type="hidden" name="course_id" value={id} />
                <input name="title" className="input" placeholder="Название урока" required />
                <textarea name="content" rows={3} className="input" placeholder="Конспект (необязательно)" />
                <button className="btn w-full">Создать урок</button>
              </form>
            </section>
            <section className="card">
              <h2 className="mb-4">Настройки курса</h2>
              <form action={updateCourse} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <input name="title" defaultValue={c.title} className="input" required />
                <textarea name="description" defaultValue={c.description} rows={2} className="input" placeholder="Описание" />
                <button className="btn-secondary w-full">Сохранить</button>
              </form>
              <form action={deleteCourse} className="mt-4 border-t border-slate-100 pt-4">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="class_id" value={c.class_id} />
                <ConfirmButton message="Удалить курс со всеми уроками и материалами?"><Icon name="trash" className="h-4 w-4" /> Удалить курс</ConfirmButton>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

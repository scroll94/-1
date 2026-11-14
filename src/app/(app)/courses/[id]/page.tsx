import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
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
      <Link href={`/classes/${c.class_id}`} className="text-sm">← {c.classes?.name}</Link>
      <div>
        <h1>{c.title}</h1>
        {c.description && <p className="mt-1 text-slate-600">{c.description}</p>}
      </div>
      <Flash error={sp.error} ok={sp.ok} />

      <section className="card">
        <h2 className="mb-3">Уроки</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-slate-500">Уроков пока нет.</p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {lessons.map((l, i) => {
              const videos = (l.materials ?? []).filter((m: Row) => m.kind === "video").length;
              const files = (l.materials ?? []).length - videos;
              return (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <Link href={`/lessons/${l.id}`} className="font-medium">
                    {i + 1}. {l.title}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {videos > 0 && `🎬 ${videos} `}
                    {files > 0 && `📎 ${files}`}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {editor && (
          <form action={createLesson} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="course_id" value={id} />
            <h3 className="font-semibold">Новый урок</h3>
            <input name="title" className="input" placeholder="Название урока" required />
            <textarea name="content" rows={3} className="input" placeholder="Текст урока / конспект (необязательно)" />
            <button className="btn">Создать урок</button>
          </form>
        )}
      </section>

      {editor && (
        <section className="card">
          <h2 className="mb-3">Настройки курса</h2>
          <form action={updateCourse} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input name="title" defaultValue={c.title} className="input" required />
            <textarea name="description" defaultValue={c.description} rows={2} className="input" />
            <button className="btn-secondary">Сохранить</button>
          </form>
          <form action={deleteCourse} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="class_id" value={c.class_id} />
            <ConfirmButton message="Удалить курс со всеми уроками и материалами?">Удалить курс</ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}

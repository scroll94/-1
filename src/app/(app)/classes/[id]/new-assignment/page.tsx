import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { AssignmentForm } from "@/components/AssignmentForm";
import type { Row } from "@/lib/utils";

export default async function NewAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getSession();
  const { data: cls } = await supabase.from("classes").select("id, name").eq("id", id).maybeSingle();
  if (!cls) notFound();
  if (!(await canEditClass(id))) redirect(`/classes/${id}`);
  const { data } = await supabase
    .from("lessons")
    .select("id, title, courses!inner(class_id, title)")
    .eq("courses.class_id", id)
    .order("position");
  const lessons = ((data ?? []) as Row[]).map((l) => ({ id: l.id, title: `${l.courses?.title} — ${l.title}` }));

  return (
    <div className="space-y-4">
      <Link href={`/classes/${id}`} className="text-sm">← {cls.name}</Link>
      <h1>Новое задание</h1>
      <div className="card">
        <AssignmentForm classId={id} lessons={lessons} defaultLessonId={sp.lesson} />
      </div>
    </div>
  );
}

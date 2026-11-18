import { notFound, redirect } from "next/navigation";
import { canEditClass, getSession } from "@/lib/auth";
import { AssignmentForm } from "@/components/AssignmentForm";
import type { Row } from "@/lib/utils";
import { PageHeader } from "@/components/ui";

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
    <div>
      <PageHeader title="Новое задание" back={{ href: `/classes/${id}`, label: cls.name }} />
      <div className="card max-w-3xl">
        <AssignmentForm classId={id} lessons={lessons} defaultLessonId={sp.lesson} />
      </div>
    </div>
  );
}

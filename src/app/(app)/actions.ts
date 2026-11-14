"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { withMsg } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
type Result = { error?: string; id?: string };

// ---------- Курсы ----------
export async function createCourse(fd: FormData) {
  const { supabase } = await getSession();
  const classId = str(fd, "class_id");
  const title = str(fd, "title");
  if (!title) redirect(withMsg(`/classes/${classId}`, "error", "Введите название курса"));
  const { data, error } = await supabase
    .from("courses")
    .insert({ class_id: classId, title, description: str(fd, "description") })
    .select("id")
    .single();
  if (error) redirect(withMsg(`/classes/${classId}`, "error", "Нет доступа или ошибка: " + error.message));
  redirect(`/courses/${data.id}`);
}

export async function updateCourse(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const { error } = await supabase
    .from("courses")
    .update({ title: str(fd, "title"), description: str(fd, "description") })
    .eq("id", id);
  if (error) redirect(withMsg(`/courses/${id}`, "error", error.message));
  revalidatePath(`/courses/${id}`);
  redirect(withMsg(`/courses/${id}`, "ok", "Сохранено"));
}

export async function deleteCourse(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const classId = str(fd, "class_id");
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) redirect(withMsg(`/courses/${id}`, "error", error.message));
  redirect(withMsg(`/classes/${classId}`, "ok", "Курс удалён"));
}

// ---------- Уроки ----------
export async function createLesson(fd: FormData) {
  const { supabase } = await getSession();
  const courseId = str(fd, "course_id");
  const title = str(fd, "title");
  if (!title) redirect(withMsg(`/courses/${courseId}`, "error", "Введите название урока"));
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { data, error } = await supabase
    .from("lessons")
    .insert({ course_id: courseId, title, content: str(fd, "content"), position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) redirect(withMsg(`/courses/${courseId}`, "error", error.message));
  redirect(withMsg(`/lessons/${data.id}`, "ok", "Урок создан. Загрузите видео и материалы."));
}

export async function updateLesson(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const position = Number(fd.get("position")) || 0;
  const { error } = await supabase
    .from("lessons")
    .update({ title: str(fd, "title"), content: String(fd.get("content") ?? ""), position })
    .eq("id", id);
  if (error) redirect(withMsg(`/lessons/${id}`, "error", error.message));
  revalidatePath(`/lessons/${id}`);
  redirect(withMsg(`/lessons/${id}`, "ok", "Урок сохранён"));
}

export async function deleteLesson(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const courseId = str(fd, "course_id");
  const { data: mats } = await supabase.from("materials").select("storage_path").eq("lesson_id", id);
  const paths = (mats ?? []).map((m) => m.storage_path).filter(Boolean) as string[];
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) redirect(withMsg(`/lessons/${id}`, "error", error.message));
  if (paths.length) await supabase.storage.from("materials").remove(paths);
  redirect(withMsg(`/courses/${courseId}`, "ok", "Урок удалён"));
}

// ---------- Материалы ----------
export async function addMaterial(input: {
  lessonId: string;
  kind: "video" | "file" | "link";
  name: string;
  storagePath?: string;
  url?: string;
}): Promise<Result> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("materials").insert({
    lesson_id: input.lessonId,
    kind: input.kind,
    name: input.name.trim() || "Материал",
    storage_path: input.storagePath ?? null,
    url: input.url ?? null,
  });
  if (error) {
    if (input.storagePath) await supabase.storage.from("materials").remove([input.storagePath]);
    return { error: error.message };
  }
  revalidatePath(`/lessons/${input.lessonId}`);
  return {};
}

export async function addLink(fd: FormData) {
  const lessonId = str(fd, "lesson_id");
  const url = str(fd, "url");
  if (!/^https?:\/\//.test(url)) redirect(withMsg(`/lessons/${lessonId}`, "error", "Ссылка должна начинаться с http:// или https://"));
  const res = await addMaterial({ lessonId, kind: "link", name: str(fd, "name") || url, url });
  if (res.error) redirect(withMsg(`/lessons/${lessonId}`, "error", res.error));
  redirect(withMsg(`/lessons/${lessonId}`, "ok", "Ссылка добавлена"));
}

export async function deleteMaterial(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const lessonId = str(fd, "lesson_id");
  const { data: mat } = await supabase.from("materials").select("storage_path").eq("id", id).single();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) redirect(withMsg(`/lessons/${lessonId}`, "error", error.message));
  if (mat?.storage_path) await supabase.storage.from("materials").remove([mat.storage_path]);
  redirect(withMsg(`/lessons/${lessonId}`, "ok", "Материал удалён"));
}

// ---------- Задания ----------
export type AssignmentInput = {
  id?: string;
  classId: string;
  lessonId: string | null;
  title: string;
  description: string;
  dueAt: string | null;
  maxScore: number;
  attachmentPath?: string | null;
  attachmentName?: string | null;
};

export async function saveAssignment(input: AssignmentInput): Promise<Result> {
  const { supabase, profile } = await getSession();
  if (!input.title.trim()) return { error: "Введите название задания" };
  const row: Record<string, unknown> = {
    class_id: input.classId,
    lesson_id: input.lessonId || null,
    title: input.title.trim(),
    description: input.description,
    due_at: input.dueAt,
    max_score: Math.max(1, Math.round(input.maxScore) || 5),
  };
  if (input.attachmentPath !== undefined) {
    row.attachment_path = input.attachmentPath;
    row.attachment_name = input.attachmentName ?? null;
  }
  if (input.id) {
    const { error } = await supabase.from("assignments").update(row).eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath(`/assignments/${input.id}`);
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from("assignments")
    .insert({ ...row, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/classes/${input.classId}`);
  return { id: data.id };
}

export async function deleteAssignment(fd: FormData) {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const classId = str(fd, "class_id");
  const { data: a } = await supabase.from("assignments").select("attachment_path").eq("id", id).single();
  const { data: subs } = await supabase.from("submissions").select("file_path").eq("assignment_id", id);
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) redirect(withMsg(`/assignments/${id}`, "error", error.message));
  if (a?.attachment_path) await supabase.storage.from("materials").remove([a.attachment_path]);
  const subPaths = (subs ?? []).map((s) => s.file_path).filter(Boolean) as string[];
  if (subPaths.length) await supabase.storage.from("submissions").remove(subPaths);
  redirect(withMsg(`/classes/${classId}`, "ok", "Задание удалено"));
}

// ---------- Сдача и проверка ----------
export async function submitWork(input: {
  assignmentId: string;
  answerText: string;
  filePath?: string | null;
  fileName?: string | null;
}): Promise<Result> {
  const { supabase, profile } = await getSession();
  if (!input.answerText.trim() && !input.filePath) return { error: "Напишите ответ или прикрепите файл" };

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status, file_path")
    .eq("assignment_id", input.assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing?.status === "graded") return { error: "Работа уже оценена" };

  const row: Record<string, unknown> = { answer_text: input.answerText };
  if (input.filePath) {
    row.file_path = input.filePath;
    row.file_name = input.fileName ?? null;
  }

  const { error } = existing
    ? await supabase.from("submissions").update(row).eq("id", existing.id)
    : await supabase.from("submissions").insert({ ...row, assignment_id: input.assignmentId, student_id: profile.id });
  if (error) return { error: error.message };
  if (existing?.file_path && input.filePath && existing.file_path !== input.filePath) {
    await supabase.storage.from("submissions").remove([existing.file_path]);
  }
  revalidatePath(`/assignments/${input.assignmentId}`);
  return {};
}

export async function gradeSubmission(fd: FormData) {
  const { supabase, profile } = await getSession();
  const id = str(fd, "id");
  const assignmentId = str(fd, "assignment_id");
  const action = str(fd, "action");
  const path = `/assignments/${assignmentId}`;
  const feedback = str(fd, "feedback");
  const scoreRaw = str(fd, "score");

  if (action === "return") {
    if (!feedback) redirect(withMsg(path, "error", "Напишите, что нужно исправить"));
    const { error } = await supabase
      .from("submissions")
      .update({ status: "returned", feedback, score: null, graded_by: profile.id, graded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) redirect(withMsg(path, "error", error.message));
    revalidatePath(path);
    redirect(withMsg(path, "ok", "Отправлено на доработку"));
  }

  const { data: a } = await supabase.from("assignments").select("max_score").eq("id", assignmentId).single();
  const score = Number(scoreRaw);
  if (scoreRaw === "" || !Number.isInteger(score) || score < 0 || score > (a?.max_score ?? 100)) {
    redirect(withMsg(path, "error", `Оценка должна быть целым числом от 0 до ${a?.max_score ?? 100}`));
  }
  const { error } = await supabase
    .from("submissions")
    .update({ status: "graded", score, feedback: feedback || null, graded_by: profile.id, graded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(withMsg(path, "error", error.message));
  revalidatePath(path);
  redirect(withMsg(path, "ok", "Оценка поставлена"));
}

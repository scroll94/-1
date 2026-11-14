"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { withMsg } from "@/lib/utils";

export async function createClass(formData: FormData) {
  const { supabase } = await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "") || null;
  if (!name) redirect(withMsg("/admin/classes", "error", "Введите название класса"));
  const { data, error } = await supabase.from("classes").insert({ name, teacher_id: teacherId }).select("id").single();
  if (error) redirect(withMsg("/admin/classes", "error", error.message));
  redirect(withMsg(`/admin/classes/${data.id}`, "ok", "Класс создан. Добавьте учеников."));
}

export async function updateClass(formData: FormData) {
  const { supabase } = await requireRole("admin");
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "") || null;
  const path = `/admin/classes/${id}`;
  const { error } = await supabase.from("classes").update({ name, teacher_id: teacherId }).eq("id", id);
  if (error) redirect(withMsg(path, "error", error.message));
  revalidatePath(path);
  redirect(withMsg(path, "ok", "Сохранено"));
}

export async function deleteClass(formData: FormData) {
  const { supabase } = await requireRole("admin");
  const id = String(formData.get("id"));
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) redirect(withMsg(`/admin/classes/${id}`, "error", error.message));
  redirect(withMsg("/admin/classes", "ok", "Класс удалён"));
}

export async function addStudents(formData: FormData) {
  const { supabase } = await requireRole("admin");
  const id = String(formData.get("id"));
  const ids = formData.getAll("student_id").map(String).filter(Boolean);
  const path = `/admin/classes/${id}`;
  if (!ids.length) redirect(withMsg(path, "error", "Выберите учеников"));
  const { error } = await supabase
    .from("class_students")
    .upsert(ids.map((student_id) => ({ class_id: id, student_id })), { ignoreDuplicates: true });
  if (error) redirect(withMsg(path, "error", error.message));
  revalidatePath(path);
  redirect(withMsg(path, "ok", `Добавлено учеников: ${ids.length}`));
}

export async function removeStudent(formData: FormData) {
  const { supabase } = await requireRole("admin");
  const id = String(formData.get("id"));
  const studentId = String(formData.get("student_id"));
  const path = `/admin/classes/${id}`;
  const { error } = await supabase.from("class_students").delete().eq("class_id", id).eq("student_id", studentId);
  if (error) redirect(withMsg(path, "error", error.message));
  revalidatePath(path);
  redirect(withMsg(path, "ok", "Ученик убран из класса"));
}

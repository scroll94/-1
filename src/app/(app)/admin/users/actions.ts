"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, type Role } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidLogin, loginToEmail, withMsg } from "@/lib/utils";

const PATH = "/admin/users";
const ROLES: Role[] = ["admin", "teacher", "student"];

function parseRole(v: FormDataEntryValue | null): Role {
  const r = String(v) as Role;
  return ROLES.includes(r) ? r : "student";
}

export async function createUser(formData: FormData) {
  await requireRole("admin");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  if (!fullName || !login) redirect(withMsg(PATH, "error", "Укажите имя и логин"));
  if (!isValidLogin(login)) redirect(withMsg(PATH, "error", "Логин: латинские буквы, цифры, точка или дефис (3–32 символа) или email"));
  if (password.length < 6) redirect(withMsg(PATH, "error", "Пароль должен быть не короче 6 символов"));

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: loginToEmail(login),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (error) redirect(withMsg(PATH, "error", /already|exists|registered/i.test(error.message) ? "Этот логин уже занят" : "Не удалось создать: " + error.message));
  revalidatePath(PATH);
  redirect(withMsg(PATH, "ok", `Пользователь «${fullName}» создан`));
}

export async function updateUser(formData: FormData) {
  const { profile } = await requireRole("admin");
  const id = String(formData.get("id"));
  const role = parseRole(formData.get("role"));
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (id === profile.id && role !== "admin") {
    redirect(withMsg(PATH, "error", "Нельзя снять роль администратора с самого себя"));
  }
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role, full_name: fullName }).eq("id", id);
  if (error) redirect(withMsg(PATH, "error", error.message));
  await admin.auth.admin.updateUserById(id, { app_metadata: { role }, user_metadata: { full_name: fullName } });
  revalidatePath(PATH);
  redirect(withMsg(PATH, "ok", "Сохранено"));
}

export async function resetPassword(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) redirect(withMsg(PATH, "error", "Пароль должен быть не короче 6 символов"));
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) redirect(withMsg(PATH, "error", error.message));
  redirect(withMsg(PATH, "ok", "Пароль изменён"));
}

export async function deleteUser(formData: FormData) {
  const { profile } = await requireRole("admin");
  const id = String(formData.get("id"));
  if (id === profile.id) redirect(withMsg(PATH, "error", "Нельзя удалить самого себя"));
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) redirect(withMsg(PATH, "error", error.message));
  revalidatePath(PATH);
  redirect(withMsg(PATH, "ok", "Пользователь удалён"));
}

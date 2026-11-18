"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidLogin, loginToEmail } from "@/lib/utils";

export async function register(_prev: string | null, fd: FormData): Promise<string | null> {
  const fullName = String(fd.get("full_name") ?? "").trim();
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const password2 = String(fd.get("password2") ?? "");
  const code = String(fd.get("code") ?? "").trim().toUpperCase();

  if (fullName.length < 2) return "Укажите имя и фамилию";
  if (!isValidLogin(login)) return "Логин: от 3 до 32 символов — латинские буквы, цифры, точка, дефис (или email)";
  if (password.length < 6) return "Пароль должен быть не короче 6 символов";
  if (password !== password2) return "Пароли не совпадают";

  const admin = createAdminClient();

  let classId: string | null = null;
  if (code) {
    const { data: cls } = await admin.from("classes").select("id").eq("join_code", code).maybeSingle();
    if (!cls) return "Класс с таким кодом не найден. Проверьте код или оставьте поле пустым.";
    classId = cls.id;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: loginToEmail(login),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "student" },
  });
  if (error || !created.user) {
    if (/already|exists|registered/i.test(error?.message ?? "")) return "Этот логин уже занят — выберите другой";
    return "Не удалось зарегистрироваться: " + (error?.message ?? "неизвестная ошибка");
  }

  await admin.from("profiles").update({ role: "student", full_name: fullName }).eq("id", created.user.id);
  if (classId) {
    await admin.from("class_students").insert({ class_id: classId, student_id: created.user.id });
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: loginToEmail(login), password });
  redirect("/");
}

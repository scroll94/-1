"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginToEmail } from "@/lib/utils";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return "Введите логин и пароль";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password });
  if (error) return "Неверный логин или пароль";
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

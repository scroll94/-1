import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "teacher" | "student";
export type Profile = { id: string; full_name: string; email: string | null; role: Role };

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?error=" + encodeURIComponent("Профиль не найден. Обратитесь к администратору."));
  return { supabase, user, profile: profile as Profile };
});

export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!roles.includes(session.profile.role)) redirect("/");
  return session;
}

/** Может ли текущий пользователь редактировать класс (админ или учитель класса). */
export async function canEditClass(classId: string) {
  const { supabase } = await getSession();
  const { data } = await supabase.rpc("can_edit_class", { cid: classId });
  return data === true;
}

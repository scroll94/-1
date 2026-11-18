import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Flash, type SP } from "@/components/Flash";
import { AuthShell } from "@/components/AuthShell";
import { isValidLogin, loginToEmail, withMsg } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function adminExists() {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error("База данных не настроена: выполните supabase/schema.sql. " + error.message);
  return (count ?? 0) > 0;
}

async function createFirstAdmin(formData: FormData) {
  "use server";
  if (await adminExists()) redirect("/login");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !isValidLogin(login) || password.length < 8) {
    redirect(withMsg("/setup", "error", "Заполните все поля. Логин — латиницей, пароль — минимум 8 символов."));
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: loginToEmail(login),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "admin" },
  });
  if (error) redirect(withMsg("/setup", "error", error.message));
  redirect(withMsg("/login", "ok", "Администратор создан. Войдите."));
}

export default async function SetupPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  let exists: boolean;
  try {
    exists = await adminExists();
  } catch (e) {
    return (
      <AuthShell title="Настройка">
        <Flash error={(e as Error).message} />
      </AuthShell>
    );
  }
  if (exists) redirect("/login");

  return (
    <AuthShell title="Первичная настройка" subtitle="Создайте главного администратора. Эта страница работает только один раз.">
      <Flash error={sp.error} />
      <form action={createFirstAdmin} className="space-y-4">
        <div>
          <label className="label">Имя и фамилия</label>
          <input name="full_name" className="input" required />
        </div>
        <div>
          <label className="label">Логин</label>
          <input name="login" className="input" autoCapitalize="none" placeholder="admin" required />
        </div>
        <div>
          <label className="label">Пароль (минимум 8 символов)</label>
          <input name="password" type="password" minLength={8} className="input" required />
        </div>
        <button className="btn w-full py-3">Создать администратора</button>
      </form>
    </AuthShell>
  );
}

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Flash, type SP } from "@/components/Flash";
import { loginToEmail, withMsg } from "@/lib/utils";

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
  if (!fullName || !login || password.length < 8) {
    redirect(withMsg("/setup", "error", "Заполните все поля. Пароль — минимум 8 символов."));
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
      <main className="mx-auto max-w-lg p-6">
        <div className="card">
          <h1 className="mb-2">Настройка</h1>
          <p className="text-sm text-red-700">{(e as Error).message}</p>
        </div>
      </main>
    );
  }
  if (exists) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1">Первичная настройка</h1>
        <p className="mb-6 text-sm text-slate-500">
          Создайте главного администратора. Эта страница работает только один раз.
        </p>
        <Flash error={sp.error} />
        <form action={createFirstAdmin} className="space-y-4">
          <div>
            <label className="label">ФИО</label>
            <input name="full_name" className="input" required />
          </div>
          <div>
            <label className="label">Логин или email</label>
            <input name="login" className="input" required />
          </div>
          <div>
            <label className="label">Пароль (минимум 8 символов)</label>
            <input name="password" type="password" minLength={8} className="input" required />
          </div>
          <button className="btn w-full">Создать администратора</button>
        </form>
      </div>
    </main>
  );
}

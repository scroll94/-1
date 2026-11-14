import { Flash, type SP } from "@/components/Flash";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-center">{process.env.NEXT_PUBLIC_SITE_NAME || "Онлайн-школа"}</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Вход в личный кабинет</p>
        <Flash error={sp.error} ok={sp.ok} />
        {configured ? (
          <LoginForm />
        ) : (
          <p className="text-sm text-red-700">
            Сайт не настроен: не заданы переменные NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">
          Нет аккаунта или забыли пароль? Обратитесь к администратору школы.
        </p>
      </div>
    </main>
  );
}

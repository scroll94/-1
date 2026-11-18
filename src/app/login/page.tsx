import Link from "next/link";
import { Flash, type SP } from "@/components/Flash";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <AuthShell title="С возвращением!" subtitle="Войдите в личный кабинет">
      <Flash error={sp.error} ok={sp.ok} />
      {configured ? (
        <LoginForm />
      ) : (
        <p className="text-sm text-red-700">Сайт не настроен: не заданы ключи Supabase.</p>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта? <Link href="/register" className="font-semibold">Зарегистрироваться</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">Забыли пароль? Обратитесь к администратору — он задаст новый.</p>
    </AuthShell>
  );
}

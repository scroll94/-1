import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Создать аккаунт" subtitle="Регистрация для учеников — займёт минуту">
      <RegisterForm defaultCode={sp.code?.toUpperCase().slice(0, 6)} />
      <p className="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт? <Link href="/login" className="font-semibold">Войти</Link>
      </p>
    </AuthShell>
  );
}

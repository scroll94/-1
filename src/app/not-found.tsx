import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      <h1>Страница не найдена</h1>
      <p className="text-slate-500">Возможно, её удалили или у вас нет доступа.</p>
      <Link href="/" className="btn">На главную</Link>
    </main>
  );
}

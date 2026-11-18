import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="search" className="h-7 w-7" /></div>
      <h1>Страница не найдена</h1>
      <p className="text-slate-500">Возможно, её удалили или у вас нет доступа.</p>
      <Link href="/" className="btn mt-2">На главную</Link>
    </main>
  );
}

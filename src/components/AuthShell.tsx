import { Icon } from "./Icon";
import { SITE_NAME } from "@/lib/utils";

const FEATURES = [
  { icon: "video", text: "Видеоуроки и материалы в одном месте" },
  { icon: "clipboard", text: "Домашние задания со сдачей онлайн" },
  { icon: "award", text: "Оценки и комментарии учителя" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon name="school" className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold">{SITE_NAME}</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-bold text-white">Учитесь в удобном темпе</h2>
          <p className="mt-4 text-lg text-indigo-100">Уроки, видео и домашние задания — всё в одном личном кабинете.</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm text-indigo-200">© {new Date().getFullYear()} {SITE_NAME}</div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Icon name="school" className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold">{SITE_NAME}</span>
          </div>
          <h1>{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <Icon name="x" className="mt-0.5 h-4 w-4" />
      {message}
    </div>
  );
}

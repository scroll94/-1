import { Icon } from "./Icon";

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon name={error ? "x" : "check"} className="mt-0.5 h-4 w-4" />
      <span>{error ?? ok}</span>
    </div>
  );
}

export type SP = Promise<{ error?: string; ok?: string }>;

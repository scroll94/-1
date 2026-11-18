import { STATUS_LABELS } from "@/lib/utils";

const COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  graded: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  none: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "none";
  return <span className={`badge ${COLORS[s]}`}>{STATUS_LABELS[s] ?? "Не сдано"}</span>;
}

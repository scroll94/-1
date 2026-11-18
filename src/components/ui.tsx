import Link from "next/link";
import { Icon } from "./Icon";
import { ROLE_LABELS } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <Icon name="back" className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words">{title}</h1>
          {subtitle && <div className="mt-1 text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div className="font-semibold text-slate-800">{title}</div>
      {text && <div className="mt-1 max-w-sm text-sm text-slate-500">{text}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone = "indigo",
  href,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  tone?: "indigo" | "amber" | "emerald" | "sky" | "rose";
  href?: string;
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
  };
  const inner = (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${tones[tone]}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="card-link">{inner}</Link> : <div className="card-flat">{inner}</div>;
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials =
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const hash = [...(name || "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}>
      {initials}
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700",
  teacher: "bg-sky-100 text-sky-700",
  student: "bg-slate-100 text-slate-700",
};

export function RoleBadge({ role }: { role: string }) {
  return <span className={`badge ${ROLE_COLORS[role] ?? ROLE_COLORS.student}`}>{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span>;
}

const CLASS_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-fuchsia-500",
];

export function classGradient(id: string) {
  const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return CLASS_GRADIENTS[hash % CLASS_GRADIENTS.length];
}

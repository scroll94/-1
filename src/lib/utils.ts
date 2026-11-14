export const ROLE_LABELS = { admin: "Администратор", teacher: "Учитель", student: "Ученик" } as const;

export const STATUS_LABELS: Record<string, string> = {
  submitted: "На проверке",
  graded: "Оценено",
  returned: "На доработку",
};

/** Логин без «@» превращаем во внутренний email, чтобы ученикам не нужна была почта. */
export function loginToEmail(login: string) {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@school.local`;
}

export function emailToLogin(email: string | null) {
  if (!email) return "";
  return email.endsWith("@school.local") ? email.replace("@school.local", "") : email;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function fileExt(name: string) {
  const m = name.match(/\.([a-zA-Z0-9]{1,8})$/);
  return m ? m[1].toLowerCase() : "bin";
}

export function withMsg(path: string, kind: "error" | "ok", text: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(text)}`;
}

/** Строка из Supabase без сгенерированных типов. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;

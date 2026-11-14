"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";
import { saveAssignment } from "@/app/(app)/actions";

type Initial = {
  id: string;
  title: string;
  description: string;
  due_at: string | null;
  max_score: number;
  lesson_id: string | null;
  attachment_name: string | null;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssignmentForm({
  classId,
  lessons,
  initial,
  defaultLessonId,
}: {
  classId: string;
  lessons: { id: string; title: string }[];
  initial?: Initial;
  defaultLessonId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const due = String(fd.get("due_at") ?? "");
    setBusy(true);
    setError(null);
    try {
      let attachmentPath: string | null | undefined;
      let attachmentName: string | null | undefined;
      if (file && file.size > 0) {
        attachmentPath = await uploadFile("materials", `assignments/${classId}`, file);
        attachmentName = file.name;
      } else if (fd.get("remove_file") === "on") {
        attachmentPath = null;
        attachmentName = null;
      }
      const res = await saveAssignment({
        id: initial?.id,
        classId,
        lessonId: String(fd.get("lesson_id") ?? "") || null,
        title: String(fd.get("title") ?? ""),
        description: String(fd.get("description") ?? ""),
        dueAt: due ? new Date(due).toISOString() : null,
        maxScore: Number(fd.get("max_score")),
        attachmentPath,
        attachmentName,
      });
      if (res.error) throw new Error(res.error);
      router.push(`/assignments/${res.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Название задания</label>
        <input name="title" defaultValue={initial?.title} className="input" required />
      </div>
      <div>
        <label className="label">Описание / условие</label>
        <textarea name="description" defaultValue={initial?.description} rows={5} className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Срок сдачи</label>
          <input name="due_at" type="datetime-local" defaultValue={toLocalInput(initial?.due_at ?? null)} className="input" />
        </div>
        <div>
          <label className="label">Максимальный балл</label>
          <input name="max_score" type="number" min={1} defaultValue={initial?.max_score ?? 5} className="input" />
        </div>
        <div>
          <label className="label">Урок (необязательно)</label>
          <select name="lesson_id" defaultValue={initial?.lesson_id ?? defaultLessonId ?? ""} className="input">
            <option value="">— без урока —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Файл к заданию (необязательно)</label>
        <input name="file" type="file" className="input" />
        {initial?.attachment_name && (
          <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="remove_file" /> удалить текущий файл «{initial.attachment_name}»
          </label>
        )}
      </div>
      <button className="btn" disabled={busy}>{busy ? "Сохранение…" : initial ? "Сохранить" : "Создать задание"}</button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { currentUserId, uploadFile } from "@/lib/upload";
import { submitWork } from "@/app/(app)/actions";

export function SubmissionForm({
  assignmentId,
  initialText,
  resubmit,
}: {
  assignmentId: string;
  initialText: string;
  resubmit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File | null;
    setBusy(true);
    setMsg({});
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      if (file && file.size > 0) {
        const uid = await currentUserId();
        if (!uid) throw new Error("Сессия истекла, войдите заново");
        filePath = await uploadFile("submissions", `${uid}/${assignmentId}`, file);
        fileName = file.name;
      }
      const res = await submitWork({ assignmentId, answerText: String(fd.get("answer") ?? ""), filePath, fileName });
      if (res.error) throw new Error(res.error);
      setMsg({ ok: "Работа отправлена на проверку" });
      form.reset();
      router.refresh();
    } catch (err) {
      setMsg({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Ваш ответ</label>
        <textarea name="answer" rows={6} defaultValue={initialText} className="input" />
      </div>
      <div>
        <label className="label">Файл или фото решения (необязательно)</label>
        <input name="file" type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="input" />
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Отправка…" : resubmit ? "Отправить заново" : "Сдать работу"}
      </button>
      {msg.error && <p className="text-sm text-red-700">{msg.error}</p>}
      {msg.ok && <p className="text-sm text-emerald-700">{msg.ok}</p>}
    </form>
  );
}

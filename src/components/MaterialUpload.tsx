"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";
import { addMaterial } from "@/app/(app)/actions";

export function MaterialUpload({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setMsg({ error: "Выберите файл" });
    setBusy(true);
    setMsg({});
    try {
      const path = await uploadFile("materials", `lessons/${lessonId}`, file);
      const kind = file.type.startsWith("video/") ? "video" : "file";
      const res = await addMaterial({ lessonId, kind, name: name || file.name, storagePath: path });
      if (res.error) throw new Error(res.error);
      setFile(null);
      setName("");
      (e.target as HTMLFormElement).reset();
      setMsg({ ok: "Загружено" });
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
        <label className="label">Видео или файл (mp4, pdf, docx, картинки…)</label>
        <input
          type="file"
          className="input"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
          }}
        />
        {file && <p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} МБ</p>}
      </div>
      <div>
        <label className="label">Название</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Видеоурок 1" />
      </div>
      <button className="btn" disabled={busy}>{busy ? "Загрузка… не закрывайте страницу" : "Загрузить"}</button>
      {msg.error && <p className="text-sm text-red-700">{msg.error}</p>}
      {msg.ok && <p className="text-sm text-emerald-700">{msg.ok}</p>}
    </form>
  );
}

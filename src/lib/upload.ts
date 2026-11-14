"use client";
import { createClient } from "@/lib/supabase/client";
import { fileExt } from "@/lib/utils";

/** Загружает файл прямо из браузера в Supabase Storage и возвращает путь. */
export async function uploadFile(bucket: "materials" | "submissions", folder: string, file: File) {
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${fileExt(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    const tooBig = /size|large|exceed/i.test(error.message);
    throw new Error(tooBig ? "Файл слишком большой для текущего тарифа хранилища" : error.message);
  }
  return path;
}

export async function currentUserId() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

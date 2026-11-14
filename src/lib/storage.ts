import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Временные (1 час) ссылки на приватные файлы. */
export async function signedUrls(supabase: SupabaseClient, bucket: string, paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter(Boolean) as string[])];
  const map = new Map<string, string>();
  if (!list.length) return map;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(list, 3600);
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

import type { ServerSupabase } from '@/lib/supabase/server'

export const FILES_BUCKET = 'clinic-files'

/** URLs firmadas (válidas 1 hora) para descargar archivos del bucket privado. */
export async function signFiles(supabase: ServerSupabase, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>()
  const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrls(paths, 60 * 60)
  return new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl]))
}

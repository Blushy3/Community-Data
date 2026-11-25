import { supabase } from '@/lib/supabase/client'

export type Bucket = 'avatars' | 'banners'

export const IMAGE_LIMITS = {
  avatars: { maxDimension: 512, maxBytes: 400 * 1024 },
  banners: { maxDimension: 1600, maxBytes: 1200 * 1024 },
} as const

export function publicImageUrl(bucket: Bucket, path: string | null | undefined): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl ?? null
}

/** Uploads to `{userId}/{random}.webp` so Storage policies can verify ownership. */
export async function uploadProfileImage(
  bucket: Bucket,
  userId: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.webp`

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new Error(error.message)
  return path
}

/** Called only after the database path was updated successfully. */
export async function deleteProfileImage(bucket: Bucket, path: string | null): Promise<void> {
  if (!path) return
  await supabase.storage.from(bucket).remove([path])
}

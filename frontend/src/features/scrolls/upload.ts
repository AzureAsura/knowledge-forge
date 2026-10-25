import { z } from 'zod'
import { api } from '@/lib/api/client'

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export async function uploadEditorImage(file: File) {
  const body = new FormData()
  body.set('image', file)
  body.set('folder', 'scroll-images')
  const { data } = await api.post('/uploads', z.object({ url: z.string() }), body)
  return data.url
}

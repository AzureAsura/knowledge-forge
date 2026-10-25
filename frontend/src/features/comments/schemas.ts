import { z } from 'zod'
import { authorSchema } from '@/features/scrolls/schemas'

export const commentSchema = z.object({
  id: z.number(),
  scrollId: z.number(),
  authorId: z.number(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: authorSchema,
})
export type Comment = z.infer<typeof commentSchema>

export const commentFormSchema = z.object({
  content: z.string().trim().min(1, 'Write something first').max(2000, 'Keep it under 2000 characters'),
})
export type CommentForm = z.infer<typeof commentFormSchema>

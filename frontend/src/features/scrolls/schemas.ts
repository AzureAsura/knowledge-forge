import { z } from 'zod'
import { roleSchema } from '@/features/auth/schemas'

export const scrollStatusSchema = z.enum(['draft', 'pending', 'published', 'archived'])
export type ScrollStatus = z.infer<typeof scrollStatusSchema>

export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])
export type Difficulty = z.infer<typeof difficultySchema>

export const authorSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
  role: roleSchema,
  level: z.number(),
  title: z.string(),
})

const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parentId: z.number().nullable(),
})

export const scrollItemSchema = z.object({
  id: z.number(),
  authorId: z.number(),
  categoryId: z.number(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  coverImageUrl: z.string(),
  status: scrollStatusSchema,
  difficulty: difficultySchema,
  viewCount: z.number(),
  likesCount: z.number(),
  bookmarksCount: z.number(),
  commentsCount: z.number(),
  isFeatured: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: authorSchema,
  category: categorySchema,
})
export type ScrollItem = z.infer<typeof scrollItemSchema>

export const scrollDetailSchema = scrollItemSchema.extend({
  isLiked: z.boolean(),
  isBookmarked: z.boolean(),
})
export type ScrollDetail = z.infer<typeof scrollDetailSchema>

export const scrollFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Keep the title under 120 characters'),
  categoryId: z.number('Pick a category').int().positive('Pick a category'),
  difficulty: difficultySchema,
  content: z.string().trim().min(1, 'Write something first'),
  excerpt: z.string().trim().max(200, 'Keep the excerpt under 200 characters'),
})
export type ScrollForm = z.infer<typeof scrollFormSchema>

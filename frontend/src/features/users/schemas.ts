import { z } from 'zod'
import { roleSchema } from '@/features/auth/schemas'

export const streakSchema = z.object({
  type: z.enum(['daily_login', 'weekly_scroll', 'daily_read']),
  count: z.number(),
  atRisk: z.boolean(),
})
export type Streak = z.infer<typeof streakSchema>

export const publicUserSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
  bio: z.string(),
  role: roleSchema,
  level: z.number(),
  title: z.string(),
  totalXp: z.number(),
  mentor: z.string().nullable(),
  createdAt: z.string(),
  stats: z.object({ publishedScrolls: z.number(), badgesCount: z.number(), currentStreak: z.number(), streaks: z.array(streakSchema) }),
})
export type PublicUser = z.infer<typeof publicUserSchema>

export const userBadgeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  unlockedAt: z.string(),
})

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  username: z.string().trim().min(1, 'Username is required'),
  bio: z.string().max(300, 'Keep the bio under 300 characters'),
})
export type ProfileForm = z.infer<typeof profileFormSchema>

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export type PasswordForm = z.infer<typeof passwordFormSchema>

export const createUserFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  username: z.string().trim().min(1, 'Username is required'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  role: roleSchema,
})
export type CreateUserForm = z.infer<typeof createUserFormSchema>

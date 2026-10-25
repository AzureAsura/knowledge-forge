import { z } from 'zod'

export const roleSchema = z.enum(['scholar', 'senior', 'admin'])
export type Role = z.infer<typeof roleSchema>

export const userSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  username: z.string(),
  email: z.string(),
  role: roleSchema,
  bio: z.string(),
  avatarUrl: z.string(),
  isActive: z.boolean(),
  mentorId: z.number().nullable(),
  totalXp: z.number(),
  currentLevel: z.number(),
  title: z.string(),
  xpForNextLevel: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof userSchema>

export const tokensSchema = z.object({ accessToken: z.string(), refreshToken: z.string() })

export const loginFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginForm = z.infer<typeof loginFormSchema>

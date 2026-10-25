import { z } from 'zod'

const submissionStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>

export const challengeSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  categoryId: z.number().nullable(),
  xpReward: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  isPublished: z.boolean(),
  status: z.enum(['upcoming', 'active', 'completed']),
  mySubmissionStatus: submissionStatusSchema.nullish(),
})
export type Challenge = z.infer<typeof challengeSchema>

export const submissionSchema = z.object({
  id: z.number(),
  challengeId: z.number(),
  proofUrl: z.string(),
  notes: z.string(),
  status: submissionStatusSchema,
  createdAt: z.string(),
  challengeTitle: z.string(),
  username: z.string(),
})

export const reviewResultSchema = z.object({ xpGained: z.number(), levelUp: z.boolean(), newLevel: z.number() })

export const submitFormSchema = z.object({
  proofUrl: z.url('Enter a valid URL').refine((v) => v.startsWith('https://'), 'The URL must start with https://'),
  notes: z.string(),
})
export type SubmitForm = z.infer<typeof submitFormSchema>

export const challengeFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string(),
    categoryId: z.number().optional(),
    xpReward: z.number('Enter the XP reward').int().positive('XP must be greater than 0'),
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string().min(1, 'Pick an end date'),
    isPublished: z.boolean(),
  })
  .refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) > new Date(v.startDate), {
    path: ['endDate'],
    message: 'The end date must be after the start date',
  })
export type ChallengeForm = z.infer<typeof challengeFormSchema>

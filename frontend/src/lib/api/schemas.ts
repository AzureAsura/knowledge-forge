import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})
export type Pagination = z.infer<typeof paginationSchema>

const unlockedBadgeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  xpReward: z.number(),
  levelUp: z.boolean(),
  newLevel: z.number(),
})

// Summary the backend attaches when an action awards XP (returned on scroll approval).
export const gamificationSchema = z.object({
  xpGained: z.number(),
  levelUp: z.boolean(),
  newLevel: z.number(),
  newBadges: z.array(unlockedBadgeSchema),
  topicLevelUp: z
    .object({
      levelUp: z.boolean(),
      from: z.number(),
      to: z.number(),
      bonusXp: z.number(),
      categorySlug: z.string(),
      userLevelUp: z.boolean(),
      userNewLevel: z.number(),
    })
    .nullish(),
})
export type Gamification = z.infer<typeof gamificationSchema>

export const envelopeSchema = z.object({
  message: z.string().optional(),
  data: z.unknown().optional(),
  pagination: paginationSchema.optional(),
  gamification: gamificationSchema.optional(),
})

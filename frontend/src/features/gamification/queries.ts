import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'

const xpStatsSchema = z.object({
  totalXp: z.number(),
  currentLevel: z.number(),
  title: z.string(),
  xpForNextLevel: z.number(),
  xpNeeded: z.number(),
  progressPercentage: z.number(),
})

export const xpStatsQuery = queryOptions({
  queryKey: ['xp', 'stats'],
  queryFn: ({ signal }) => api.get('/xp/stats', xpStatsSchema, { signal }).then((r) => r.data),
  staleTime: 30_000,
})

const badgeDefSchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  xpReward: z.number(),
  triggerType: z.string(),
})

export const badgeDefsQuery = queryOptions({
  queryKey: ['badges', 'defs'],
  queryFn: ({ signal }) => api.get('/badges', z.array(badgeDefSchema), { signal }).then((r) => r.data),
  staleTime: Infinity,
})

const leaderboardItemSchema = z.object({
  rank: z.number(),
  user: z.object({
    id: z.number(),
    fullName: z.string(),
    username: z.string(),
    avatarUrl: z.string(),
    level: z.number(),
  }),
  metric: z.number(),
  trend: z.enum(['up', 'down', 'same', 'new']),
})

export type LeaderboardType = 'xp' | 'scribes' | 'mentors'
export type LeaderboardPeriod = '7d' | '30d' | 'all'

export const leaderboardQuery = (type: LeaderboardType, period: LeaderboardPeriod) =>
  queryOptions({
    queryKey: ['leaderboard', type, period],
    queryFn: ({ signal }) =>
      api.get('/leaderboard', z.array(leaderboardItemSchema), { signal, query: { type, period } }).then((r) => r.data),
    staleTime: 30_000,
  })

const treeSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      level: z.number(),
      xpInTopic: z.number(),
      xpForNextLevel: z.number(),
      scrollsContributed: z.number(),
      scrollsRead: z.number(),
      // What the next level needs (all three at once); null at the maximum level.
      nextLevel: z
        .object({ level: z.number(), xp: z.number(), contributed: z.number(), read: z.number(), bonusXp: z.number() })
        .nullable(),
      publishedScrolls: z.number(),
      readableScrolls: z.number(),
    }),
  ),
  center: z.object({ name: z.string(), totalLevel: z.number(), totalXp: z.number() }),
})
export type TopicNode = z.infer<typeof treeSchema>['nodes'][number]
export type TreeData = z.infer<typeof treeSchema>

export const treeQuery = (userId: number) =>
  queryOptions({
    queryKey: ['tree', userId],
    queryFn: ({ signal }) => api.get(`/tree/${userId}`, treeSchema, { signal }).then((r) => r.data),
    staleTime: 60_000,
  })

const xpLogSchema = z.object({
  id: z.number(),
  amount: z.number(),
  reason: z.string(),
  sourceType: z.string(),
  createdAt: z.string(),
})

export const xpHistoryQuery = (page: number) =>
  queryOptions({
    queryKey: ['xp', 'history', page],
    queryFn: async ({ signal }) => {
      const { data, pagination } = await api.get('/xp/history', z.array(xpLogSchema), { signal, query: { page, limit: 10 } })
      return { items: data, pagination: pagination! }
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

const myBadgeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  xpReward: z.number(),
  unlocked: z.boolean(),
  unlockedAt: z.string().nullable(),
  percentDone: z.number().nullable(),
})
export type MyBadge = z.infer<typeof myBadgeSchema>

export const myBadgesQuery = queryOptions({
  queryKey: ['badges', 'my'],
  queryFn: ({ signal }) => api.get('/badges/my', z.array(myBadgeSchema), { signal }).then((r) => r.data),
  staleTime: 60_000,
})

const leaderboardParamsSchema = z.object({
  type: z.enum(['xp', 'scribes', 'mentors']).catch('xp'),
  period: z.enum(['7d', '30d', 'all']).catch('all'),
})
export const parseLeaderboardParams = (params: URLSearchParams) => leaderboardParamsSchema.parse(Object.fromEntries(params))

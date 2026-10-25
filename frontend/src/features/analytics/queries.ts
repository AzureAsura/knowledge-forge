import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'

export const RANGES = ['week', 'month', 'year'] as const
export type Range = (typeof RANGES)[number]
export const parseRange = (value: string | null): Range => RANGES.find((r) => r === value) ?? 'month'

const kpiSchema = z.object({ total: z.number(), previous: z.number() })
export type Kpi = z.infer<typeof kpiSchema>

const namedSchema = z.object({ name: z.string(), value: z.number() })
const datePointSchema = z.object({ date: z.string(), value: z.number() })
const granularitySchema = z.enum(['day', 'month'])
export type Granularity = z.infer<typeof granularitySchema>

const meSchema = z.object({
  granularity: granularitySchema,
  kpis: z.object({
    views: kpiSchema,
    likes: kpiSchema,
    bookmarks: kpiSchema,
    comments: kpiSchema,
    visitors: kpiSchema,
    xp: kpiSchema,
    reads: kpiSchema,
  }),
  series: z.array(
    z.object({
      date: z.string(),
      views: z.number(),
      likes: z.number(),
      bookmarks: z.number(),
      comments: z.number(),
      visitors: z.number(),
      xp: z.number(),
      reads: z.number(),
    }),
  ),
  xpBySource: z.array(namedSchema),
  publishedScrolls: z.number(),
  currentStreak: z.number(),
})

const mentorSchema = z.object({
  granularity: granularitySchema,
  apprenticeCount: z.number(),
  newApprentices: kpiSchema,
  growth: z.array(datePointSchema),
  roster: z.array(
    z.object({
      id: z.number(),
      fullName: z.string(),
      username: z.string(),
      level: z.number(),
      publishedScrolls: z.number(),
      xpInRange: z.number(),
    }),
  ),
  review: z.object({ pending: z.number(), oldestHours: z.number(), avgHours: z.number() }),
  approved: kpiSchema,
  approvedSeries: z.array(datePointSchema),
})

const platformSchema = z.object({
  granularity: granularitySchema,
  totalUsers: z.number(),
  pendingScrolls: z.number(),
  kpis: z.object({
    activeUsers: kpiSchema,
    newUsers: kpiSchema,
    published: kpiSchema,
    views: kpiSchema,
    likes: kpiSchema,
    comments: kpiSchema,
    xp: kpiSchema,
  }),
  series: z.array(
    z.object({
      date: z.string(),
      activeUsers: z.number(),
      views: z.number(),
      likes: z.number(),
      bookmarks: z.number(),
      comments: z.number(),
      published: z.number(),
      newUsers: z.number(),
      xp: z.number(),
    }),
  ),
  usersByRole: z.array(namedSchema),
  scrollsByStatus: z.array(namedSchema),
  byCategory: z.array(namedSchema),
  topAuthors: z.array(
    z.object({ id: z.number(), fullName: z.string(), username: z.string(), published: z.number(), likes: z.number() }),
  ),
  challenges: z.object({ active: z.number(), submissions: z.array(namedSchema) }),
})

export type MeAnalytics = z.infer<typeof meSchema>
export type MentorAnalytics = z.infer<typeof mentorSchema>
export type PlatformAnalytics = z.infer<typeof platformSchema>

const make = <S extends z.ZodType>(path: string, schema: S) => (range: Range) =>
  queryOptions<z.infer<S>>({
    queryKey: ['analytics', path, range],
    queryFn: ({ signal }) => api.get(`/analytics/${path}`, schema, { signal, query: { range } }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

export const analyticsQueries = {
  me: make('me', meSchema),
  mentor: make('mentor', mentorSchema),
  platform: make('platform', platformSchema),
}

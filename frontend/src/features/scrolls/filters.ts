import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import type { ScrollFilters } from './queries'
import { difficultySchema, scrollStatusSchema } from './schemas'

export const PAGE_SIZE = 12

export const SORT_OPTIONS = [
  { value: '-likes_count', label: 'Most Liked' },
  { value: '-created_at', label: 'Newest' },
  { value: 'created_at', label: 'Oldest' },
  { value: '-bookmarks_count', label: 'Most Bookmarked' },
  { value: 'title', label: 'Title A–Z' },
] as const

const DEFAULT_SORT = '-created_at'

const searchSchema = z.object({
  view: z.enum(['all', 'mine']).catch('all'),
  status: scrollStatusSchema.optional().catch(undefined),
  category: z.coerce.number().int().positive().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  tier: difficultySchema.optional().catch(undefined),
  sort: z.enum(SORT_OPTIONS.map((o) => o.value) as [string, ...string[]]).catch(DEFAULT_SORT),
  page: z.coerce.number().int().positive().catch(1),
})

export const parseScrollFilters = (params: URLSearchParams): ScrollFilters =>
  searchSchema.parse(Object.fromEntries(params))

// The URL is the single source of truth for filters; only non-default values are written back.
export function useScrollFilters() {
  const [params, setParams] = useSearchParams()
  const filters = parseScrollFilters(params)

  const setFilters = (patch: Partial<ScrollFilters>) => {
    const next = { ...filters, page: 1, ...patch }
    const out = new URLSearchParams()
    if (next.view && next.view !== 'all') out.set('view', next.view)
    if (next.view === 'mine' && next.status) out.set('status', next.status)
    if (next.category) out.set('category', String(next.category))
    if (next.q) out.set('q', next.q)
    if (next.tier) out.set('tier', next.tier)
    if (next.sort && next.sort !== DEFAULT_SORT) out.set('sort', next.sort)
    if (next.page && next.page > 1) out.set('page', String(next.page))
    setParams(out, { replace: 'q' in patch })
  }

  return { filters, setFilters }
}

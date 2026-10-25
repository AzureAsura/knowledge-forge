import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { scrollDetailSchema, scrollItemSchema, type Difficulty } from './schemas'

export interface ScrollFilters {
  view?: 'all' | 'mine' | 'saved' | 'liked'
  status?: string
  category?: number
  author?: string
  q?: string
  tier?: Difficulty
  sort?: string
  page?: number
  limit?: number
}

export const scrollQueries = {
  list: (f: ScrollFilters) =>
    queryOptions({
      queryKey: ['scrolls', 'list', f],
      queryFn: async ({ signal }) => {
        const { data, pagination } = await api.get('/scrolls', z.array(scrollItemSchema), {
          signal,
          query: {
            mine: f.view === 'mine' || undefined,
            bookmarked: f.view === 'saved' || undefined,
            liked: f.view === 'liked' || undefined,
            status: f.status,
            category_id: f.category,
            author: f.author,
            search: f.q,
            difficulty: f.tier,
            sort: f.sort,
            page: f.page,
            limit: f.limit,
          },
        })
        return { items: data, pagination: pagination! }
      },
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    }),
  // GET detail records a "read" on the server (view count, XP, streak): never prefetch on hover.
  detail: (idOrSlug: string) =>
    queryOptions({
      queryKey: ['scrolls', 'detail', idOrSlug],
      queryFn: ({ signal }) =>
        api.get(`/scrolls/${encodeURIComponent(idOrSlug)}`, scrollDetailSchema, { signal }).then((r) => r.data),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }),
}

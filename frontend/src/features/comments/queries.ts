import { infiniteQueryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { commentSchema } from './schemas'

export const COMMENTS_PAGE_SIZE = 20

export const commentQueries = {
  list: (scrollId: number) =>
    infiniteQueryOptions({
      queryKey: ['scrolls', 'comments', scrollId],
      queryFn: async ({ pageParam, signal }) => {
        const { data, pagination } = await api.get(`/scrolls/${scrollId}/comments`, z.array(commentSchema), {
          signal,
          query: { page: pageParam, limit: COMMENTS_PAGE_SIZE },
        })
        return { items: data, pagination: pagination! }
      },
      initialPageParam: 1,
      getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
      staleTime: 30_000,
    }),
}

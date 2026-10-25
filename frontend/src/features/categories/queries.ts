import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'

const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  parentId: z.number().nullable(),
  isActive: z.boolean(),
})
export type Category = z.infer<typeof categorySchema>

export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: ({ signal }) => api.get('/categories', z.array(categorySchema), { signal }).then((r) => r.data),
  staleTime: Infinity,
})

// The backend nests categories (Web > Web Frontend); scrolls and the topic tree live on the leaves.
export const leafCategories = (categories: Category[]) =>
  categories.filter((c) => !categories.some((other) => other.parentId === c.id))

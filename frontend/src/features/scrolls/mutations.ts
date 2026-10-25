import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { queryClient } from '@/lib/query/queryClient'
import { scrollQueries } from './queries'
import { markdownToPlain } from './markdown'
import type { ScrollDetail, ScrollForm } from './schemas'

const REACTIONS = {
  like: {
    schema: z.object({ liked: z.boolean(), likesCount: z.number() }),
    guess: (s: ScrollDetail, on: boolean): ScrollDetail => ({ ...s, isLiked: on, likesCount: s.likesCount + (on ? 1 : -1) }),
    confirm: (s: ScrollDetail, r: { liked: boolean; likesCount: number }): ScrollDetail => ({ ...s, isLiked: r.liked, likesCount: r.likesCount }),
  },
  bookmark: {
    schema: z.object({ bookmarked: z.boolean(), bookmarksCount: z.number() }),
    guess: (s: ScrollDetail, on: boolean): ScrollDetail => ({ ...s, isBookmarked: on, bookmarksCount: s.bookmarksCount + (on ? 1 : -1) }),
    confirm: (s: ScrollDetail, r: { bookmarked: boolean; bookmarksCount: number }): ScrollDetail => ({ ...s, isBookmarked: r.bookmarked, bookmarksCount: r.bookmarksCount }),
  },
}

// Optimistic toggle: the UI flips immediately, rolls back on error, then adopts the server's count.
export const reactionMutation = (kind: 'like' | 'bookmark', idOrSlug: string, scrollId: number) => {
  const { queryKey } = scrollQueries.detail(idOrSlug)
  const reaction = REACTIONS[kind]
  return mutationOptions({
    mutationFn: async (on: boolean) => {
      const path = `/scrolls/${scrollId}/${kind}`
      const { data } = await (on ? api.post(path, reaction.schema) : api.delete(path, reaction.schema))
      return data
    },
    onMutate: async (on) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ScrollDetail>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, reaction.guess(previous, on))
      return { previous }
    },
    onError: (_error, _on, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSuccess: (data) =>
      queryClient.setQueryData<ScrollDetail>(queryKey, (s) => s && (reaction.confirm as (s: ScrollDetail, r: unknown) => ScrollDetail)(s, data)),
    meta: { invalidates: [['scrolls', 'list'], ['dashboard']] },
  })
}

const savedScrollSchema = z.object({ id: z.number(), slug: z.string(), status: z.string() })

export interface SaveScrollInput {
  id?: number
  values: ScrollForm
  cover: File | null
  removeCover: boolean
}

// Create when there is no id yet, otherwise patch. Multipart because the cover image rides along.
export const saveScrollMutation = mutationOptions({
  mutationFn: async ({ id, values, cover, removeCover }: SaveScrollInput) => {
    const body = new FormData()
    body.set('title', values.title)
    body.set('category_id', String(values.categoryId))
    body.set('difficulty', values.difficulty)
    body.set('content', values.content)
    body.set('excerpt', values.excerpt || markdownToPlain(values.content).slice(0, 200))
    if (cover) body.set('cover_image', cover)
    else if (id && removeCover) body.set('remove_cover_image', 'true')

    const { data } = await (id ? api.patch(`/scrolls/${id}`, savedScrollSchema, body) : api.post('/scrolls', savedScrollSchema, body))
    return data
  },
  meta: { invalidates: [['scrolls'], ['dashboard']] },
})

export type ScrollAction = 'submit' | 'approve' | 'reject' | 'archive' | 'feature' | 'unfeature' | 'delete'

export const scrollActionMutation = mutationOptions({
  mutationFn: ({ id, action }: { id: number; action: ScrollAction }) =>
    action === 'delete' ? api.delete(`/scrolls/${id}`, z.unknown()) : api.post(`/scrolls/${id}/${action}`, z.unknown()),
  meta: { invalidates: [['scrolls'], ['dashboard'], ['xp'], ['leaderboard'], ['badges', 'my']] },
})

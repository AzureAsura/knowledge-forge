import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MyBadge } from '@/features/gamification/queries'
import { showBadgeToast } from '@/components/gamification/BadgeToast'
import { celebrate } from '@/lib/celebrations'
import { ApiError, errorMessage } from '@/lib/api/errors'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silent?: boolean; invalidates?: QueryKey[] }
  }
}

// Level-ups and new badges are detected by diffing consecutive fetches of the user's own stats and badges.
// The first fetch only sets the baseline, so opening the app never toasts. Reset on login (another account).
let lastLevel: number | undefined
let lastXp = 0
let lastBadges: Set<string> | undefined
export function resetGamificationBaseline() {
  lastLevel = undefined
  lastXp = 0
  lastBadges = undefined
}

function announceGamification(queryKey: readonly unknown[], data: unknown) {
  if (queryKey[0] === 'xp' && queryKey[1] === 'stats') {
    const { currentLevel, title, totalXp, progressPercentage } = data as { currentLevel: number; title: string; totalXp: number; progressPercentage: number }
    if (lastLevel !== undefined && currentLevel > lastLevel) {
      celebrate.levelUp({ level: currentLevel, title, xpGained: totalXp - lastXp, percent: progressPercentage })
    }
    lastLevel = currentLevel
    lastXp = totalXp
  } else if (queryKey[0] === 'badges' && queryKey[1] === 'my') {
    const unlocked = (data as MyBadge[]).filter((b) => b.unlocked)
    for (const badge of unlocked) {
      if (lastBadges && !lastBadges.has(badge.slug)) {
        celebrate.badge(badge)
        showBadgeToast(badge)
      }
    }
    lastBadges = new Set(unlocked.map((b) => b.slug))
  }
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status < 500),
    },
    mutations: { retry: false },
  },
  // Initial-load errors are handled by the route errorElement; only toast failed background refetches.
  queryCache: new QueryCache({
    onSuccess: (data, query) => announceGamification(query.queryKey, data),
    onError: (error, query) => {
      if (query.state.data !== undefined) toast.error(errorMessage(error))
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _result, mutation) => {
      if (!mutation.meta?.silent) toast.error(errorMessage(error))
    },
    onSuccess: (_data, _variables, _result, mutation) => {
      mutation.meta?.invalidates?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
    },
  }),
})

import { useSyncExternalStore } from 'react'
import type { MyBadge } from '@/features/gamification/queries'

export interface LevelUp {
  level: number
  title: string
  xpGained: number
  percent: number
}

// Tiny external store: queryClient pushes events, the lazy modals subscribe. Badges wait until the level-up modal is closed.
let levelUp: LevelUp | null = null
let badges: MyBadge[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l))

export const celebrate = {
  levelUp(next: LevelUp) {
    levelUp = next
    emit()
  },
  badge(badge: MyBadge) {
    badges = [...badges, badge]
    emit()
  },
  closeLevelUp() {
    levelUp = null
    emit()
  },
  nextBadge() {
    badges = badges.slice(1)
    emit()
  },
}

const getLevelUp = () => levelUp
const getBadge = () => (levelUp ? undefined : badges[0])
export const useLevelUp = () => useSyncExternalStore(subscribe, getLevelUp)
export const useBadgeCard = () => useSyncExternalStore(subscribe, getBadge)

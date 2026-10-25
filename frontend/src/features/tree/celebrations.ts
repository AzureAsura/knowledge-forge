import type { TopicNode } from '@/features/gamification/queries'
import type { Celebration } from './layout'

const storageKey = (userId: number) => `knofo.tree.levels:${userId}`

// Compares the levels last seen on this tree with today's: a topic that went 0 → 1 is "unlocked", any other rise is a "level up".
// First visit (nothing stored) celebrates nothing.
export function readCelebrations(userId: number, nodes: TopicNode[]) {
  const out = new Map<string, Celebration>()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return out
    const seen = JSON.parse(raw) as Record<string, number>
    for (const { slug, level } of nodes) {
      const before = seen[slug]
      if (before === undefined || level <= before) continue
      out.set(slug, before === 0 ? 'unlock' : 'levelup')
    }
  } catch {
    // storage blocked or corrupt: skip the celebration
  }
  return out
}

export function saveLevels(userId: number, nodes: TopicNode[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(Object.fromEntries(nodes.map((n) => [n.slug, n.level]))))
  } catch {
    // storage blocked: nothing to remember
  }
}

import type { TopicNode } from '@/features/gamification/queries'

const ratio = (current: number, needed: number) => (needed <= 0 ? 1 : Math.min(1, current / needed))

// Reaching the next level needs XP, written scrolls and read scrolls all at once, so overall progress is the weakest of the three.
export function topicProgress(node: TopicNode) {
  const next = node.nextLevel
  if (!next) return { xp: 1, written: 1, read: 1, overall: 100 }
  const xp = ratio(node.xpInTopic, next.xp)
  const written = ratio(node.scrollsContributed, next.contributed)
  const read = ratio(node.scrollsRead, next.read)
  return { xp, written, read, overall: Math.round(Math.min(xp, written, read) * 100) }
}

// "120 more XP, write 2 more scrolls, read 5 more" — only the parts that are still missing.
export function missingForNext(node: TopicNode) {
  const next = node.nextLevel
  if (!next) return []
  const parts: string[] = []
  const xp = next.xp - node.xpInTopic
  const written = next.contributed - node.scrollsContributed
  const read = next.read - node.scrollsRead
  if (xp > 0) parts.push(`${xp} more topic XP`)
  if (written > 0) parts.push(`write ${written} more ${written === 1 ? 'scroll' : 'scrolls'}`)
  if (read > 0) parts.push(`read ${read} more ${read === 1 ? 'scroll' : 'scrolls'}`)
  return parts
}

// Short line for a locked topic: only what is still missing for level 1.
export function unlockHint(node: TopicNode) {
  const next = node.nextLevel
  if (!next) return ''
  const parts: string[] = []
  if (next.xp > node.xpInTopic) parts.push(`${next.xp - node.xpInTopic} XP`)
  if (next.contributed > node.scrollsContributed) parts.push(`write ${next.contributed - node.scrollsContributed}`)
  if (next.read > node.scrollsRead) parts.push(`read ${next.read - node.scrollsRead}`)
  return parts.length > 0 ? `Needs ${parts.join(' · ')}` : 'Ready — unlocks on your next action'
}

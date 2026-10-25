import type { Edge, Node } from '@xyflow/react'
import type { Category } from '@/features/categories/queries'
import type { TopicNode, TreeData } from '@/features/gamification/queries'
import { categoryColor, topicStatus } from '@/lib/constants'
import { topicProgress } from './progress'

export type Status = ReturnType<typeof topicStatus>
export type Filter = 'all' | Status
export type Celebration = 'unlock' | 'levelup'

// Flags the canvas adds on top of the fixed layout.
interface View {
  dimmed: boolean
  selected: boolean
}
export interface HubData extends Record<string, unknown> {
  order: number
  center: TreeData['center']
}
export interface GroupData extends Record<string, unknown>, View {
  color: string
  order: number
  name: string
  slug: string
  status: Status
  percent: number
  topicCount: number
  childIds: string[]
  onFocus: (childIds: string[]) => void
}
export interface TopicData extends Record<string, unknown>, View {
  description: string
  color: string
  order: number
  celebrate?: Celebration
  topic: TopicNode
  status: Status
  percent: number
  onSelect: (slug: string) => void
}
export type HubFlowNode = Node<HubData, 'hub'>
export type GroupFlowNode = Node<GroupData, 'group'>
export type TopicFlowNode = Node<TopicData, 'topic'>
export type TreeFlowNode = HubFlowNode | GroupFlowNode | TopicFlowNode

const GROUP_RADIUS = 380
const TOPIC_RADIUS = 780
const DIRECT_RADIUS = 540 // topics with no parent category sit between the groups and the outer ring
const SPREAD_DEG = 26 // angle between siblings, wide enough that neighbouring cards do not overlap
const STRETCH_X = 1.3 // the canvas is wider than tall

export const groupStatus = (levels: number[]): Status =>
  levels.every((l) => l === 0) ? 'locked' : levels.every((l) => l >= 5) ? 'mastered' : 'unlocked'

const polar = (deg: number, radius: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: Math.cos(rad) * radius * STRETCH_X, y: Math.sin(rad) * radius }
}

export const topicNodeId = (slug: string) => `topic:${slug}`

// Radial tree: the hub in the middle, one branch per top-level category (a group with its topics, or a lone topic).
// Positions are fixed; selection and filtering are layered on later without moving anything.
export function buildTreeLayout(data: TreeData, categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  type Branch = { parent: Category | null; topics: TopicNode[] }
  const branches = new Map<string, Branch>()

  for (const topic of data.nodes) {
    const parent = byId.get(topic.id)?.parentId ? (byId.get(byId.get(topic.id)!.parentId!) ?? null) : null
    const key = parent ? `g${parent.id}` : `t${topic.id}`
    const branch = branches.get(key) ?? { parent, topics: [] }
    branch.topics.push(topic)
    branches.set(key, branch)
  }

  const list = [...branches.values()]
  const nodes: TreeFlowNode[] = [{ id: 'hub', type: 'hub', position: { x: 0, y: 0 }, data: { center: data.center, order: 0 }, draggable: false, selectable: false }]
  const edges: Edge[] = []
  const placeholder = { dimmed: false, selected: false, onSelect: () => {}, onFocus: () => {} }
  let order = 0 // creation order drives the staggered fade-in

  const addTopic = (topic: TopicNode, position: { x: number; y: number }, from: string) => {
    const status = topicStatus(topic.level)
    const id = topicNodeId(topic.slug)
    nodes.push({
      id,
      type: 'topic',
      position,
      draggable: false,
      data: {
        topic,
        status,
        description: byId.get(topic.id)?.description ?? '',
        color: categoryColor(topic.slug),
        order: ++order,
        percent: topicProgress(topic).overall,
        dimmed: placeholder.dimmed,
        selected: placeholder.selected,
        onSelect: placeholder.onSelect,
      },
    })
    edges.push({ id: `${from}->${id}`, source: from, target: id, type: 'straight', data: { status, color: categoryColor(topic.slug) } })
  }

  list.forEach((branch, i) => {
    const angle = -90 + (i * 360) / list.length

    if (!branch.parent) {
      addTopic(branch.topics[0], polar(angle, DIRECT_RADIUS), 'hub')
      return
    }

    const groupId = `group:${branch.parent.slug}`
    const status = groupStatus(branch.topics.map((t) => t.level))
    const percent = Math.round((branch.topics.reduce((sum, t) => sum + t.level, 0) / (branch.topics.length * 5)) * 100)
    nodes.push({
      id: groupId,
      type: 'group',
      position: polar(angle, GROUP_RADIUS),
      draggable: false,
      selectable: false,
      data: {
        color: categoryColor(branch.parent.slug),
        order: ++order,
        name: branch.parent.name,
        slug: branch.parent.slug,
        status,
        percent,
        topicCount: branch.topics.length,
        childIds: branch.topics.map((t) => topicNodeId(t.slug)),
        dimmed: false,
        selected: false,
        onFocus: placeholder.onFocus,
      },
    })
    edges.push({ id: `hub->${groupId}`, source: 'hub', target: groupId, type: 'straight', data: { status, color: categoryColor(branch.parent.slug) } })

    branch.topics.forEach((topic, j) => {
      const offset = (j - (branch.topics.length - 1) / 2) * SPREAD_DEG
      addTopic(topic, polar(angle + offset, TOPIC_RADIUS), groupId)
    })
  })

  return { nodes, edges }
}

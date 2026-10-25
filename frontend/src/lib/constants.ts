import {
  Award,
  Bookmark,
  BookOpen,
  Box,
  Briefcase,
  Bug,
  CalendarCheck,
  FileEdit,
  Flame,
  Globe,
  Heart,
  Library,
  MessageCircle,
  MessageSquare,
  Network,
  PenLine,
  ScrollText,
  Server,
  Shield,
  Trophy,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

export const DIFFICULTY = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export const STATUS_LABEL = {
  draft: 'Draft',
  pending: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
} as const

// Presentation only: the backend sends no icon for categories. Unknown slugs fall back to BookOpen.
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  web: Globe,
  unity: Box,
  'web-frontend': Globe,
  'web-backend': Server,
  'unity-2d': Box,
  'unity-vr': Box,
  'design-ui': PenLine,
  'project-management': Briefcase,
}

// Presentation only: badge colors from the backend are ignored so the UI keeps its blue. Unknown icons fall back to Award.
export const BADGE_ICON: Record<string, LucideIcon> = {
  'scroll-text': ScrollText,
  library: Library,
  globe: Globe,
  heart: Heart,
  bug: Bug,
  shield: Shield,
  'calendar-check': CalendarCheck,
  'message-circle': MessageCircle,
}

const XP_REASON_LABEL: Record<string, string> = {
  scroll_published: 'Scroll published',
  scroll_liked: 'Your scroll was liked',
  scroll_bookmarked: 'Your scroll was bookmarked',
  comment_created: 'Commented on a scroll',
  scroll_read: 'Read a scroll',
  mentor_pasif: 'Apprentice published their first scroll',
  challenge_approved: 'Challenge completed',
  login_streak: 'Daily login streak',
  badge_unlocked: 'Badge unlocked',
}

export const xpReasonLabel = (reason: string) => {
  const level = /^topic_level_(\d+)$/.exec(reason)?.[1]
  return level ? `Topic reached level ${level}` : (XP_REASON_LABEL[reason] ?? reason)
}

export const XP_SOURCE_ICON: Record<string, LucideIcon> = {
  scroll: FileEdit,
  like: Heart,
  bookmark: Bookmark,
  comment: MessageSquare,
  reading: BookOpen,
  mentor: UserCheck,
  challenge: Trophy,
  streak: Flame,
  badge: Award,
  topic_mastery: Network,
}

// Dot colour and label for a challenge submission's status.
export const SUBMISSION_STATE = {
  pending: { text: "Pending review", dot: "bg-[#F59E0B]" },
  approved: { text: "Approved", dot: "bg-[#10B981]" },
  rejected: { text: "Rejected", dot: "bg-[#EF4444]" },
} as const;

// Topic mastery levels 0–5 (PRD §11.4). The backend only sends the number.
export const LEVEL_TITLE = ['Locked', 'Initiate', 'Learner', 'Practitioner', 'Expert', 'Master'] as const

// Level 0 = not started ("locked": the backend has no prerequisites between topics), 5 = mastered.
export const topicStatus = (level: number) => (level >= 5 ? 'mastered' : level >= 1 ? 'unlocked' : 'locked') as 'mastered' | 'unlocked' | 'locked'

// One colour per topic status, shared by the graph, the list and the legend.
export const STATUS_STYLE = {
  mastered: { label: 'Mastered', color: '#10B981' },
  unlocked: { label: 'Unlocked', color: '#3B82F6' },
  locked: { label: 'Locked', color: '#9CA3AF' },
} as const

// Presentation only: the backend sends no colour for categories. Unknown slugs use the app blue.
const CATEGORY_COLOR: Record<string, string> = {
  web: '#6366F1',
  'web-frontend': '#3B82F6',
  'web-backend': '#10B981',
  unity: '#F97316',
  'unity-2d': '#F59E0B',
  'unity-vr': '#8B5CF6',
  'design-ui': '#EC4899',
  'project-management': '#64748B',
}
export const categoryColor = (slug: string) => CATEGORY_COLOR[slug] ?? '#3B82F6'

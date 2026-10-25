import type { Granularity, Kpi, Range } from './queries'

const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const month = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' })

// Bucket dates are 'YYYY-MM-DD' calendar dates; parsing at noon keeps them on the same day in any timezone.
export const bucketLabel = (date: string, granularity: Granularity) =>
  (granularity === 'month' ? month : day).format(new Date(`${date}T12:00:00`))

export const RANGE_LABEL: Record<Range, string> = { week: 'Week', month: 'Month', year: 'Year' }
export const PREVIOUS_LABEL: Record<Range, string> = { week: 'previous 7 days', month: 'previous 30 days', year: 'previous 12 months' }

// null = nothing to compare against (no data in the previous period).
export function percentChange({ total, previous }: Kpi) {
  if (previous === 0) return total === 0 ? 0 : null
  return Math.round(((total - previous) / previous) * 100)
}

// One colour per metric, so it means the same thing on every chart.
export const COLORS = { views: '#3B82F6', likes: '#EF4444', bookmarks: '#F59E0B', comments: '#10B981', visitors: '#8B5CF6', xp: '#06B6D4' }

// "up 12% vs previous 30 days" — used in chart subtitles and screen-reader text.
export function describeChange(kpi: Kpi, range: Range) {
  const change = percentChange(kpi)
  if (change === null) return `new activity vs ${PREVIOUS_LABEL[range]}`
  if (change === 0) return `no change vs ${PREVIOUS_LABEL[range]}`
  return `${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% vs ${PREVIOUS_LABEL[range]}`
}

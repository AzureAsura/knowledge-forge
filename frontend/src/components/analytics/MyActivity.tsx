import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Bookmark, Eye, Heart, MessageSquare, Users, Zap } from 'lucide-react'
import { useMe } from '@/features/auth/queries'
import { treeQuery } from '@/features/gamification/queries'
import { formatNumber } from '@/lib/format'
import ChartCard from '@/components/analytics/ChartCard'
import KpiCard from '@/components/analytics/KpiCard'
import { DonutChart, TopicRadar, TrendChart } from '@/components/analytics/lazyCharts'
import TopScrollsTable from '@/components/analytics/TopScrollsTable'
import { COLORS, describeChange } from '@/features/analytics/format'
import { analyticsQueries, type Range } from '@/features/analytics/queries'

const SOURCE_LABEL: Record<string, string> = {
  scroll: 'Scrolls published',
  like: 'Likes received',
  bookmark: 'Bookmarks received',
  comment: 'Comments',
  reading: 'Reading',
  mentor: 'Mentoring',
  challenge: 'Challenges',
  login_streak: 'Login streak',
  streak: 'Login streak',
  badge: 'Badges',
  topic_level: 'Topic levels',
  topic_mastery: 'Topic levels',
}

// The six cards double as the filter for the chart below them.
const METRICS = [
  { key: 'views', label: 'Views', unit: 'views', icon: Eye, color: COLORS.views },
  { key: 'likes', label: 'Likes', unit: 'likes', icon: Heart, color: COLORS.likes },
  { key: 'bookmarks', label: 'Bookmarks', unit: 'bookmarks', icon: Bookmark, color: COLORS.bookmarks },
  { key: 'comments', label: 'Comments', unit: 'comments', icon: MessageSquare, color: COLORS.comments },
  { key: 'visitors', label: 'Profile Visitors', unit: 'unique visitors', icon: Users, color: COLORS.visitors },
  { key: 'xp', label: 'XP Earned', unit: 'XP', icon: Zap, color: COLORS.xp },
] as const

export default function MyActivity({ range }: { range: Range }) {
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const { data, isPending } = useQuery(analyticsQueries.me(range))
  const { data: nodes } = useQuery({ ...treeQuery(me.id), select: (t) => t.nodes })

  const metric = METRICS.find((m) => m.key === params.get('metric')) ?? METRICS[0]
  const select = (key: string) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (key === METRICS[0].key) out.delete('metric')
        else out.set('metric', key)
        return out
      },
      { replace: true },
    )

  const quiet = (key: keyof NonNullable<typeof data>['series'][number]) => !data || data.series.every((p) => !p[key])

  return (
    <div className="space-y-6">
      <section aria-label="Key numbers" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {METRICS.map((m) => (
          <KpiCard
            key={m.key}
            label={m.label}
            icon={m.icon}
            kpi={data?.kpis[m.key]}
            range={range}
            loading={isPending}
            selected={m.key === metric.key}
            onSelect={() => select(m.key)}
          />
        ))}
      </section>

      <ChartCard
        title={`${metric.label} over time`}
        subtitle={data ? `${formatNumber(data.kpis[metric.key].total)} ${metric.unit} · ${describeChange(data.kpis[metric.key], range)}` : undefined}
        loading={isPending}
        empty={quiet(metric.key)}
      >
        {data && (
          <TrendChart
            key={metric.key}
            title={`${metric.label} over time`}
            data={data.series}
            series={[{ key: metric.key, label: metric.label, color: metric.color }]}
            granularity={data.granularity}
          />
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Where your XP comes from" subtitle={data ? `${formatNumber(data.kpis.xp.total)} XP in this range` : undefined} loading={isPending} empty={!data?.xpBySource.length}>
          {data && <DonutChart title="XP by source" data={data.xpBySource.map((s) => ({ name: SOURCE_LABEL[s.name] ?? s.name, value: s.value }))} />}
        </ChartCard>

        <ChartCard title="Topic mastery" subtitle="Level 0–5 per topic" action={<Link to="/dashboard/tree" className="text-[11px] font-bold text-[#3B82F6] hover:underline">Open tree</Link>} loading={!nodes} empty={nodes?.every((n) => n.level === 0)}>
          {nodes && <TopicRadar data={nodes.map((n) => ({ name: n.name, level: n.level }))} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Reading activity" subtitle={data ? `${formatNumber(data.kpis.reads.total)} scrolls read from other authors` : undefined} loading={isPending} empty={quiet('reads')}>
          {data && <TrendChart title="Scrolls read" data={data.series} series={[{ key: 'reads', label: 'Scrolls read', color: COLORS.comments }]} granularity={data.granularity} height={220} />}
        </ChartCard>

        <ChartCard
          title="Profile traffic"
          subtitle={data ? `${formatNumber(data.kpis.visitors.total)} unique visitors · one per person per day` : undefined}
          loading={isPending}
          empty={quiet('visitors')}
        >
          {data && <TrendChart title="Profile visitors" data={data.series} series={[{ key: 'visitors', label: 'Unique visitors', color: COLORS.visitors }]} granularity={data.granularity} height={220} />}
        </ChartCard>
      </div>

      <ChartCard title="Your top scrolls" subtitle="Click a column to sort">
        <TopScrollsTable />
      </ChartCard>
    </div>
  )
}

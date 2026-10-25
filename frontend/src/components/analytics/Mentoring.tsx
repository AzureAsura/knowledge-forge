import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCheck, Clock, Inbox, UserPlus, Users } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import ChartCard from '@/components/analytics/ChartCard'
import KpiCard from '@/components/analytics/KpiCard'
import { TrendChart } from '@/components/analytics/lazyCharts'
import SortableTable, { type Column } from '@/components/analytics/SortableTable'
import { COLORS } from '@/features/analytics/format'
import { analyticsQueries, type MentorAnalytics, type Range } from '@/features/analytics/queries'

const waiting = (hours: number) => (hours < 1 ? '<1h' : hours < 48 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`)

const COLUMNS: Column<MentorAnalytics['roster'][number]>[] = [
  {
    key: 'name',
    label: 'Apprentice',
    sortValue: (r) => r.fullName,
    render: (r) => (
      <Link to={`/dashboard/profile/${r.username}`} className="font-bold text-[#1F2937] hover:text-[#3B82F6]">
        {r.fullName} <span className="text-[11px] font-normal text-[#6B7280]">@{r.username}</span>
      </Link>
    ),
  },
  { key: 'level', label: 'Level', align: 'right', sortValue: (r) => r.level, render: (r) => `Lv. ${r.level}` },
  { key: 'published', label: 'Published', align: 'right', sortValue: (r) => r.publishedScrolls, render: (r) => formatNumber(r.publishedScrolls) },
  { key: 'xp', label: 'XP in range', align: 'right', sortValue: (r) => r.xpInRange, render: (r) => formatNumber(r.xpInRange) },
]

export default function Mentoring({ range }: { range: Range }) {
  const { data, isPending } = useQuery(analyticsQueries.mentor(range))
  const quiet = (points?: { value: number }[]) => !points?.some((p) => p.value)

  return (
    <div className="space-y-6">
      <section aria-label="Key numbers" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Apprentices" icon={Users} value={data?.apprenticeCount} loading={isPending} />
        <KpiCard label="New Apprentices" icon={UserPlus} kpi={data?.newApprentices} range={range} loading={isPending} />
        <KpiCard
          label="Waiting for Review"
          icon={Inbox}
          value={data?.review.pending}
          note={data?.review.pending ? `Oldest ${waiting(data.review.oldestHours)} · avg ${waiting(data.review.avgHours)}` : 'Nothing waiting'}
          loading={isPending}
        />
        <KpiCard label="Approved by You" icon={CheckCheck} kpi={data?.approved} range={range} loading={isPending} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Apprentice growth" subtitle="New people who chose you as mentor" loading={isPending} empty={quiet(data?.growth)}>
          {data && <TrendChart title="New apprentices" data={data.growth} series={[{ key: 'value', label: 'New apprentices', color: COLORS.visitors }]} granularity={data.granularity} height={220} />}
        </ChartCard>

        <ChartCard title="Scrolls you approved" subtitle="Reviews completed over time" loading={isPending} empty={quiet(data?.approvedSeries)}>
          {data && <TrendChart title="Approved scrolls" data={data.approvedSeries} series={[{ key: 'value', label: 'Approved', color: COLORS.comments }]} granularity={data.granularity} height={220} />}
        </ChartCard>
      </div>

      <ChartCard title="Your apprentices" subtitle="Click a column to sort" loading={isPending} empty={!data?.roster.length}>
        {data && <SortableTable rows={data.roster} columns={COLUMNS} rowKey={(r) => r.id} defaultSort="xp" />}
      </ChartCard>

      {!isPending && data && data.review.pending > 0 && (
        <Link to="/dashboard/review" className="inline-flex items-center gap-2 bg-base neu-raised-sm neu-hover px-4 py-2.5 rounded-[14px] text-[13px] font-bold text-[#1F2937] transition-all">
          <Clock size={15} className="text-[#F59E0B]" />
          Open the review queue
        </Link>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, FileText, Inbox, UserPlus, UserRoundCheck, Users } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import ChartCard from '@/components/analytics/ChartCard'
import KpiCard from '@/components/analytics/KpiCard'
import { BarListChart, DonutChart, TrendChart } from '@/components/analytics/lazyCharts'
import SortableTable, { type Column } from '@/components/analytics/SortableTable'
import { COLORS } from '@/features/analytics/format'
import { analyticsQueries, type PlatformAnalytics, type Range } from '@/features/analytics/queries'

const ENGAGEMENT = [
  { key: 'views', label: 'Views', color: COLORS.views },
  { key: 'likes', label: 'Likes', color: COLORS.likes },
  { key: 'bookmarks', label: 'Bookmarks', color: COLORS.bookmarks },
  { key: 'comments', label: 'Comments', color: COLORS.comments },
]

const AUTHOR_COLUMNS: Column<PlatformAnalytics['topAuthors'][number]>[] = [
  {
    key: 'name',
    label: 'Author',
    sortValue: (r) => r.fullName,
    render: (r) => (
      <Link to={`/dashboard/profile/${r.username}`} className="font-bold text-[#1F2937] hover:text-[#3B82F6]">
        {r.fullName} <span className="text-[11px] font-normal text-[#6B7280]">@{r.username}</span>
      </Link>
    ),
  },
  { key: 'published', label: 'Published', align: 'right', sortValue: (r) => r.published, render: (r) => formatNumber(r.published) },
  { key: 'likes', label: 'Likes', align: 'right', sortValue: (r) => r.likes, render: (r) => formatNumber(r.likes) },
]

export default function Platform({ range }: { range: Range }) {
  const { data, isPending } = useQuery(analyticsQueries.platform(range))
  const quiet = (keys: string[]) => !data || data.series.every((p) => keys.every((k) => !(p as Record<string, unknown>)[k]))

  return (
    <div className="space-y-6">
      <section aria-label="Key numbers" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Users" icon={Users} value={data?.totalUsers} loading={isPending} />
        <KpiCard label="Active Users" icon={UserRoundCheck} kpi={data?.kpis.activeUsers} range={range} loading={isPending} />
        <KpiCard label="New Users" icon={UserPlus} kpi={data?.kpis.newUsers} range={range} loading={isPending} />
        <KpiCard label="Scrolls Published" icon={FileText} kpi={data?.kpis.published} range={range} loading={isPending} />
        <KpiCard label="Views" icon={Eye} kpi={data?.kpis.views} range={range} loading={isPending} />
        <KpiCard label="Pending Scrolls" icon={Inbox} value={data?.pendingScrolls} note={data?.pendingScrolls ? 'Waiting for a reviewer' : 'Nothing waiting'} loading={isPending} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Active users" subtitle="People who signed in, per day (per month for a year)" loading={isPending} empty={quiet(['activeUsers'])}>
          {data && <TrendChart title="Active users" data={data.series} series={[{ key: 'activeUsers', label: 'Active users', color: COLORS.views }, { key: 'newUsers', label: 'New users', color: COLORS.visitors }]} granularity={data.granularity} initial={['activeUsers']} height={240} />}
        </ChartCard>

        <ChartCard title="Engagement across KnoFo" subtitle="Everything readers did on every scroll" loading={isPending} empty={quiet(['views', 'likes', 'bookmarks', 'comments'])}>
          {data && <TrendChart title="Platform engagement" data={data.series} series={ENGAGEMENT} granularity={data.granularity} initial={['views', 'likes']} height={240} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Users by role" subtitle="Active accounts" loading={isPending} empty={!data?.usersByRole.length}>
          {data && <DonutChart title="Users by role" data={data.usersByRole} />}
        </ChartCard>
        <ChartCard title="Scrolls by status" subtitle="All time" loading={isPending} empty={!data?.scrollsByStatus.length}>
          {data && <DonutChart title="Scrolls by status" data={data.scrollsByStatus} />}
        </ChartCard>
        <ChartCard title="Challenge submissions" subtitle={data ? `${data.challenges.active} active challenge${data.challenges.active === 1 ? '' : 's'}` : undefined} loading={isPending} empty={!data?.challenges.submissions.length}>
          {data && <DonutChart title="Challenge submissions" data={data.challenges.submissions} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Published scrolls by category" subtitle="All time" loading={isPending} empty={!data?.byCategory.some((c) => c.value)}>
          {data && <BarListChart title="Published scrolls by category" data={data.byCategory} />}
        </ChartCard>

        <ChartCard title="Top authors" subtitle="Published and likes received in this range · click a column to sort" loading={isPending} empty={!data?.topAuthors.length}>
          {data && <SortableTable rows={data.topAuthors} columns={AUTHOR_COLUMNS} rowKey={(r) => r.id} defaultSort="published" />}
        </ChartCard>
      </div>
    </div>
  )
}

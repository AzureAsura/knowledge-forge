import { Suspense, type ReactNode } from 'react'
import Skeleton from '@/components/ui/Skeleton'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  loading?: boolean
  empty?: boolean
  className?: string
  children: ReactNode
}

// Frame for every chart: title row, skeleton while loading, "No data yet" when there is nothing to draw.
// The chart components are lazy chunks, hence the Suspense.
export default function ChartCard({ title, subtitle, action, loading, empty, className = '', children }: ChartCardProps) {
  return (
    <section className={`bg-base neu-raised rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] sm:text-[16px] leading-snug font-extrabold text-[#1F2937]">{title}</h2>
          {subtitle && <p className="text-[11px] sm:text-[12px] text-[#6B7280] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>

      {loading ? (
        <Skeleton className="h-60 rounded-[18px]" />
      ) : empty ? (
        <div className="h-60 rounded-[18px] bg-base neu-pressed flex items-center justify-center text-[13px] font-semibold text-[#9CA3AF]">
          No data yet
        </div>
      ) : (
        <Suspense fallback={<Skeleton className="h-60 rounded-[18px]" />}>{children}</Suspense>
      )}
    </section>
  )
}

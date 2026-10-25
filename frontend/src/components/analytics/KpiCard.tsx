import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { formatNumber } from '@/lib/format'
import { describeChange, percentChange } from '@/features/analytics/format'
import type { Kpi, Range } from '@/features/analytics/queries'

interface KpiCardProps {
  label: string
  icon: LucideIcon
  value?: number | string
  kpi?: Kpi
  range?: Range
  note?: string
  loading?: boolean
  selected?: boolean
  // When given, the card is a button that picks the metric shown in the chart below.
  onSelect?: () => void
}

// Three centred lines: the number, the title, then the change against the previous period.
export default function KpiCard({ label, icon: Icon, value, kpi, range, note, loading, selected, onSelect }: KpiCardProps) {
  const shown = value ?? kpi?.total ?? 0
  const change = kpi ? percentChange(kpi) : 0
  const tone = change === null ? 'text-[#3B82F6]' : change > 0 ? 'text-[#10B981]' : change < 0 ? 'text-[#EF4444]' : 'text-[#6B7280]'

  const body = (
    <>
      {loading ? (
        <Skeleton className="h-9 w-20 rounded-[10px]" />
      ) : (
        <span className={`text-[26px] sm:text-[28px] leading-none font-extrabold ${selected ? 'text-[#3B82F6]' : 'text-[#1F2937]'}`}>
          {typeof shown === 'number' ? formatNumber(shown) : shown}
        </span>
      )}

      <span className="flex items-center justify-center gap-1.5 max-w-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
        <Icon size={13} className="shrink-0 text-[#3B82F6]" aria-hidden />
        <span className="truncate">{label}</span>
      </span>

      <span className={`flex items-center justify-center gap-1 min-h-4 text-[11px] font-semibold ${note ? 'text-[#6B7280]' : tone}`}>
        {note}
        {kpi && range && !loading && (
          <>
            {change === null ? null : change > 0 ? <ArrowUp size={12} aria-hidden /> : change < 0 ? <ArrowDown size={12} aria-hidden /> : <Minus size={12} aria-hidden />}
            <span aria-hidden>{change === null ? 'New' : `${change > 0 ? '+' : ''}${change}%`}</span>
            <span className="sr-only">{describeChange(kpi, range)}</span>
          </>
        )}
      </span>
    </>
  )

  const frame = `rounded-[20px] p-4 flex flex-col items-center justify-center text-center gap-2 bg-base transition-all ${selected ? 'neu-pressed' : 'neu-raised'}`

  return onSelect ? (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`${frame} w-full cursor-pointer ${selected ? '' : 'neu-hover'}`}>
      {body}
    </button>
  ) : (
    <div className={frame}>{body}</div>
  )
}

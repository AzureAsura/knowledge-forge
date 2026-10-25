import { useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '@/lib/format'
import { bucketLabel } from '@/features/analytics/format'
import type { Granularity } from '@/features/analytics/queries'

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#9CA3AF']
const AXIS = { fontSize: 11, fill: '#6B7280' }

export interface TrendSeries {
  key: string
  label: string
  color: string
}

interface TooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  format?: (label: string) => string
}

function ChartTooltip({ active, payload, label, format }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base neu-raised rounded-[12px] px-3 py-2 text-[12px] text-[#1F2937] space-y-1">
      {label !== undefined && <p className="font-bold">{format ? format(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6B7280]">{p.name}</span>
          <span className="font-bold ml-auto pl-3">{formatNumber(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

// Charts are drawn graphics; this sr-only table gives screen readers the same numbers.
function DataSummary({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface TrendChartProps {
  data: ({ date: string } & Record<string, number | string>)[]
  series: TrendSeries[]
  granularity: Granularity
  // Series shown first; the user can toggle the rest (few lines stay readable).
  initial?: string[]
  title: string
  height?: number
}

export function TrendChart({ data, series, granularity, initial, title, height = 260 }: TrendChartProps) {
  const [active, setActive] = useState<string[]>(initial ?? series.slice(0, 2).map((s) => s.key))
  const shown = series.filter((s) => active.includes(s.key))
  const toggle = (key: string) =>
    setActive((prev) => (prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]))

  return (
    <div className="space-y-3">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Series">
          {series.map((s) => {
            const on = active.includes(s.key)
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  on ? 'bg-base neu-pressed text-[#1F2937]' : 'bg-base neu-raised-sm text-[#9CA3AF]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: on ? s.color : '#D1D5DB' }} />
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      <div role="img" aria-label={`${title}: ${shown.map((s) => s.label).join(', ')} over time`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              {shown.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => bucketLabel(d, granularity)} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<ChartTooltip format={(d) => bucketLabel(d, granularity)} />} />
            {shown.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} dot={false} activeDot={{ r: 4 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DataSummary
        caption={title}
        columns={['Date', ...series.map((s) => s.label)]}
        rows={data.map((d) => [bucketLabel(d.date, granularity), ...series.map((s) => Number(d[s.key]) || 0)])}
      />
    </div>
  )
}

export function DonutChart({ data, title, empty }: { data: { name: string; value: number }[]; title: string; empty?: ReactNode }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <>{empty ?? <p className="text-[13px] text-[#9CA3AF] text-center py-10">No data yet</p>}</>

  return (
    <div className="space-y-4">
      <div role="img" aria-label={`${title}: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`} className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-1.5 text-[12px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-[#4B5563] capitalize truncate">{d.name.replace(/_/g, ' ')}</span>
            <span className="ml-auto font-bold text-[#1F2937]">{formatNumber(d.value)}</span>
            <span className="text-[#9CA3AF] w-9 text-right">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarListChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  return (
    <div>
      <div role="img" aria-label={`${title}: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`} style={{ height: Math.max(180, data.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={120} />
            <Tooltip cursor={{ fill: 'rgba(59,130,246,0.08)' }} content={<ChartTooltip />} />
            <Bar dataKey="value" name="Scrolls" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataSummary caption={title} columns={['Name', 'Value']} rows={data.map((d) => [d.name, d.value])} />
    </div>
  )
}

export function TopicRadar({ data }: { data: { name: string; level: number }[] }) {
  return (
    <div>
      <div role="img" aria-label={`Topic mastery levels: ${data.map((d) => `${d.name} level ${d.level}`).join(', ')}`} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis dataKey="name" tick={AXIS} />
            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
            <Radar name="Level" dataKey="level" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <DataSummary caption="Topic mastery" columns={['Topic', 'Level']} rows={data.map((d) => [d.name, d.level])} />
    </div>
  )
}

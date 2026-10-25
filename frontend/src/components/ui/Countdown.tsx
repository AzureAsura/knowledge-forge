import { useSyncExternalStore } from 'react'

const TICK_MS = 15_000
const subscribe = (onTick: () => void) => {
  const id = setInterval(onTick, TICK_MS)
  return () => clearInterval(id)
}
const snapshot = () => Math.floor(Date.now() / TICK_MS) // stable between ticks, so it doubles as "now"

const pad = (n: number) => String(n).padStart(2, '0')

// Re-renders every 15s via an external-store tick, so no effect is needed.
export default function Countdown({ to }: { to: string }) {
  const now = useSyncExternalStore(subscribe, snapshot) * TICK_MS
  const ms = Math.max(0, new Date(to).getTime() - now)
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return <span>{`${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m`}</span>
}

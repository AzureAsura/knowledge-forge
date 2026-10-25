import { lazy } from 'react'

// recharts is heavy: every chart lives in one lazy chunk that only the dashboard loads.
export const TrendChart = lazy(() => import('@/components/analytics/Charts').then((m) => ({ default: m.TrendChart })))
export const DonutChart = lazy(() => import('@/components/analytics/Charts').then((m) => ({ default: m.DonutChart })))
export const BarListChart = lazy(() => import('@/components/analytics/Charts').then((m) => ({ default: m.BarListChart })))
export const TopicRadar = lazy(() => import('@/components/analytics/Charts').then((m) => ({ default: m.TopicRadar })))

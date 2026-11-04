import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_TILE, type Tone } from './tone'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLElement>): React.ReactElement {
  return (
    <section
      className={cn('c-card', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h2 className={cn('c-section-title', className)} {...props} />
}

export function StatCard(props: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone: Tone
}): React.ReactElement {
  const Icon = props.icon
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">{props.label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{props.value}</p>
        {props.hint && <p className="mt-1 text-xs text-slate-400">{props.hint}</p>}
      </div>
      <span className={cn('rounded-lg p-2', TONE_TILE[props.tone])}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }): React.ReactElement {
  return <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', TONE_TILE[tone])}>{children}</span>
}

/** Page title row: icon + h1, optional actions on the right. */
export function PageHeader(props: {
  icon: LucideIcon
  title: string
  description?: string
  actions?: React.ReactNode
}): React.ReactElement {
  const Icon = props.icon
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Icon className="h-6 w-6 text-primary-600" /> {props.title}
        </h1>
        {props.description && <p className="mt-1 text-sm text-slate-500">{props.description}</p>}
      </div>
      {props.actions}
    </div>
  )
}

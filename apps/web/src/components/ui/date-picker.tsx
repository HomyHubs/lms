import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * In-house calendar date picker (slice-17): a popover + month grid built only
 * from React + Tailwind (no external calendar library, per design-system rule).
 * Value and onChange use `YYYY-MM-DD`; an empty string means "no date selected".
 */

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABEL = (y: number, m: number): string => `Tháng ${m + 1}/${y}`

/** Parse `YYYY-MM-DD` into {y,m,d} (m is 0-based) or null when empty/invalid. */
function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = Number(match[3])
  if (m < 0 || m > 11 || d < 1 || d > 31) return null
  return { y, m, d }
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Monday-first weekday index (0 = Monday … 6 = Sunday) of the 1st of a month. */
function firstWeekdayMondayBased(y: number, m: number): number {
  return (new Date(y, m, 1).getDay() + 6) % 7
}

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  /** Accessible label for the trigger button. */
  ariaLabel: string
  /** Text shown on the trigger when no date is selected. */
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Chọn ngày',
  className,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = parseIso(value)
  const now = new Date()
  const [view, setView] = useState<{ y: number; m: number }>(
    selected ? { y: selected.y, m: selected.m } : { y: now.getFullYear(), m: now.getMonth() },
  )

  // Keep the visible month in sync when the selected value changes from outside.
  useEffect(() => {
    if (selected) setView({ y: selected.y, m: selected.m })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const leading = firstWeekdayMondayBased(view.y, view.m)
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1)
      return { y: next.getFullYear(), m: next.getMonth() }
    })
  }

  function pick(day: number) {
    onChange(toIso(view.y, view.m, day))
    setOpen(false)
  }

  const triggerLabel = selected ? value : placeholder

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="c-input flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <CalendarCheck className="h-4 w-4 text-slate-400" aria-hidden />
        <span className={cn(!selected && 'text-slate-400')}>{triggerLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Lịch chọn ngày"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => shiftMonth(-1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">{MONTH_LABEL(view.y, view.m)}</span>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => shiftMonth(1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`empty-${i}`} aria-hidden />
              const iso = toIso(view.y, view.m, day)
              const isSelected = iso === value
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={iso}
                  aria-pressed={isSelected}
                  onClick={() => pick(day)}
                  className={cn(
                    'rounded-md py-1 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary-600 font-semibold text-white'
                      : 'text-slate-700 hover:bg-primary-50',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {value !== '' && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                Xoá ngày
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

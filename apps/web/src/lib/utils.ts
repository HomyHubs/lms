import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Helper chuan cua shadcn/ui de gop className co dieu kien (Profile B). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Local calendar month as `YYYY-MM` (month pickers, timesheet queries). */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

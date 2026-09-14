import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Helper chuan cua shadcn/ui de gop className co dieu kien (Profile B). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

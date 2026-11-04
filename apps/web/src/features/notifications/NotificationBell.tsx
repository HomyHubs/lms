import { useState } from 'react'
import { Bell, CalendarClock, RotateCcw, Send } from 'lucide-react'
import type { AppNotification } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TONE_TILE } from '@/components/ui/tone'
import { cn } from '@/lib/utils'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useRunReminders } from './useNotifications'

const KIND_ICON = { retake_reminder: RotateCcw, session_reminder: CalendarClock } as const

function NotificationItem({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }): React.ReactElement {
  const Icon = KIND_ICON[item.kind]
  const unread = item.readAt === null
  return (
    <li>
      <button
        type="button"
        onClick={() => unread && onRead(item.id)}
        className={cn('flex w-full gap-3 rounded-lg p-2 text-left hover:bg-slate-50', unread && 'bg-primary-50/60')}
      >
        <span className={cn('h-fit rounded-lg p-1.5', TONE_TILE[item.kind === 'retake_reminder' ? 'warning' : 'primary'])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm text-slate-800', unread && 'font-semibold')}>{item.title}</span>
          <span className="block text-xs text-slate-500">{item.body}</span>
          <span className="block text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
        </span>
      </button>
    </li>
  )
}

/** Header bell: unread badge + latest reminders; admins can also run the reminder scan now. */
export function NotificationBell({ canRunReminders }: { canRunReminders: boolean }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const notifications = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const run = useRunReminders()
  const unread = notifications.data?.unreadCount ?? 0
  const items = notifications.data?.notifications ?? []

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-label={unread > 0 ? `Thông báo (${unread} chưa đọc)` : 'Thông báo'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-[1.1rem] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {open && (
        <Card role="dialog" aria-label="Thông báo" className="absolute right-0 top-full z-30 mt-2 w-80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Thông báo</p>
            <Button variant="ghost" size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate(undefined)}>
              Đánh dấu đã đọc
            </Button>
          </div>
          {notifications.isError && <p className="text-sm text-rose-600">Không tải được thông báo.</p>}
          {items.length === 0 && !notifications.isError && <p className="py-4 text-center text-sm text-slate-500">Chưa có thông báo.</p>}
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={(id) => markRead.mutate(id)} />
            ))}
          </ul>
          {canRunReminders && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Button variant="outline" size="sm" className="w-full" disabled={run.isPending} onClick={() => run.mutate(undefined)}>
                <Send className="mr-1 h-4 w-4" /> Gửi nhắc nhở ngay
              </Button>
              {run.data && (
                <p className="mt-1 text-xs text-slate-500">
                  Tạo mới {run.data.created} · đã gửi {run.data.sent} · lỗi {run.data.failed}
                </p>
              )}
              {run.isError && <p className="mt-1 text-xs text-rose-600">{run.error.message}</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

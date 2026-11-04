import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markAllNotificationsRead, markNotificationRead, runReminders } from '@/lib/api'

/** slice-9b bell hooks. The backend scopes every call to the signed-in user (run: admin only). */

const KEY = ['notifications']

export function useNotifications() {
  return useQuery({ queryKey: KEY, queryFn: getNotifications, refetchInterval: 60_000 })
}

function useInvalidating<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) })
}

export function useMarkNotificationRead() {
  return useInvalidating((id: string) => markNotificationRead(id))
}

export function useMarkAllNotificationsRead() {
  return useInvalidating(() => markAllNotificationsRead())
}

export function useRunReminders() {
  return useInvalidating(() => runReminders())
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserBranches, setUserBranches } from '@/lib/api'

const key = (userId: string) => ['user-branches', userId] as const

/** Branch dang gan cho mot User (GET /users/:id/branches). Chi chay khi da chon User. */
export function useUserBranches(userId: string | null) {
  return useQuery({
    queryKey: key(userId ?? ''),
    queryFn: () => getUserBranches(userId as string),
    enabled: userId !== null,
  })
}

/** Dat lai tap Branch cua User (PUT /users/:id/branches). */
export function useSetUserBranches() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { userId: string; branchIds: string[] }) =>
      setUserBranches(vars.userId, vars.branchIds),
    onSuccess: (_data, vars) => void qc.invalidateQueries({ queryKey: key(vars.userId) }),
  })
}

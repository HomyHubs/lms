import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginRequest, PublicUser } from '@lms/shared'
import { fetchMe, login as loginRequest, logout as logoutRequest } from '@/lib/api'

const ME_KEY = ['auth', 'me'] as const

/** Phien hien tai (GET /auth/me). `data === null` nghia la chua dang nhap. */
export function useSession(): {
  user: PublicUser | null | undefined
  isLoading: boolean
} {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  })
  return { user: query.data, isLoading: query.isLoading }
}

/** Mutation dang nhap; cap nhat cache phien khi thanh cong. */
export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginRequest) => loginRequest(input),
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user)
    },
  })
}

/** Mutation dang xuat; xoa cache phien khi xong. */
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null)
    },
  })
}

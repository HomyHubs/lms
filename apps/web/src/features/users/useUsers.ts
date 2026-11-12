import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateUserRequest, UpdateUserRequest } from '@lms/shared'
import { createUser, deleteUser, listUsers, updateUser } from '@/lib/api'

const USERS_KEY = ['users'] as const

/** Danh sach nguoi dung (GET /users) — chi Admin goi duoc (BE thuc thi RBAC). */
export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: listUsers })
}

/** Tao user moi; lam moi cache danh sach khi thanh cong. */
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserRequest) => createUser(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

/** Cap nhat user (role/email/password). */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateUserRequest }) =>
      updateUser(vars.id, vars.input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

/** Xoa user. */
export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

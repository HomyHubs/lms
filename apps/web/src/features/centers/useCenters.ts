import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateBranchRequest, CreateCenterRequest } from '@lms/shared'
import {
  createBranch,
  createCenter,
  deleteBranch,
  deleteCenter,
  listBranches,
  listCenters,
} from '@/lib/api'

const CENTERS_KEY = ['centers'] as const
const BRANCHES_KEY = ['branches'] as const

/** Danh sach trung tam (GET /centers) — chi Admin goi duoc (BE thuc thi RBAC). */
export function useCenters() {
  return useQuery({ queryKey: CENTERS_KEY, queryFn: listCenters })
}

export function useCreateCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCenterRequest) => createCenter(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CENTERS_KEY }),
  })
}

export function useDeleteCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCenter(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CENTERS_KEY })
      // Xoa Center keo theo Branch (cascade) — lam moi ca danh sach co so.
      void qc.invalidateQueries({ queryKey: BRANCHES_KEY })
    },
  })
}

/** Danh sach co so (GET /branches). */
export function useBranches() {
  return useQuery({ queryKey: BRANCHES_KEY, queryFn: listBranches })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBranchRequest) => createBranch(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QuestionEditPermissions } from '@lms/shared'
import { getQuestionEditPermissions, setQuestionEditPermissions } from '@/lib/api'

const QUESTION_EDIT_PERMISSIONS_KEY = ['settings', 'question-edit-permissions'] as const

/**
 * slice-19 (ADR 0015): cau hinh quyen sua cau hoi theo role (toan he thong).
 * Server la nguon su that + enforce that; hook nay chi de UI doc/sua cau hinh.
 */
export function useQuestionEditPermissions() {
  return useQuery({
    queryKey: QUESTION_EDIT_PERMISSIONS_KEY,
    queryFn: getQuestionEditPermissions,
    staleTime: 30_000,
  })
}

/** Luu cau hinh moi (PUT); lam moi cache khi thanh cong. */
export function useUpdateQuestionEditPermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissions: QuestionEditPermissions) => setQuestionEditPermissions(permissions),
    onSuccess: (saved) => {
      qc.setQueryData(QUESTION_EDIT_PERMISSIONS_KEY, saved)
    },
  })
}

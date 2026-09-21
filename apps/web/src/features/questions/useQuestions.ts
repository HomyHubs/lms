import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateQuestionRequest, UpdateQuestionRequest } from '@lms/shared'
import {
  createQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  updateQuestion,
} from '@/lib/api'

const QUESTIONS_KEY = ['questions'] as const

/** Danh sach cau hoi (GET /questions) — chi Admin/Teacher goi duoc (BE thuc thi RBAC). */
export function useQuestions() {
  return useQuery({ queryKey: QUESTIONS_KEY, queryFn: listQuestions })
}

export function useCreateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuestionRequest) => createQuestion(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

export function useUpdateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateQuestionRequest }) =>
      updateQuestion(vars.id, vars.input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

export function useDeleteQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

/** Import hang loat tu CSV (mang dong da parse). Lam moi danh sach khi thanh cong. */
export function useImportQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: Record<string, string>[]) => importQuestions(rows),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

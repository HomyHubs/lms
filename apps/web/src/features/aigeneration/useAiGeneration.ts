import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AiRequestDetail,
  CreateAiRequestRequest,
  SaveAiRequestResult,
  UpdateAiItemRequest,
} from '@lms/shared'
import {
  createAiRequest,
  getAiRequest,
  listAiRequests,
  saveAiRequest,
  submitAiResults,
  updateAiItem,
} from '@/lib/api'

/** slice-4.5 hooks. Every mutation returns the full request detail, cached under one key. */
const LIST_KEY = ['ai-requests'] as const
const detailKey = (id: string | null) => ['ai-requests', id] as const

export function useAiRequests() {
  return useQuery({ queryKey: LIST_KEY, queryFn: listAiRequests })
}

export function useAiRequest(id: string | null) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => getAiRequest(id as string),
    enabled: id !== null,
  })
}

function useDetailMutation<TVars, TResult extends AiRequestDetail>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  changesBank = false,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      qc.setQueryData(detailKey(detail.request.id), detail)
      void qc.invalidateQueries({ queryKey: LIST_KEY, exact: true })
      if (changesBank) void qc.invalidateQueries({ queryKey: ['questions'] })
    },
  })
}

export function useCreateAiRequest() {
  return useDetailMutation((input: CreateAiRequestRequest) => createAiRequest(input))
}

export function useSubmitAiResults(id: string | null) {
  return useDetailMutation((rows: Record<string, unknown>[]) => submitAiResults(id as string, rows))
}

export function useUpdateAiItem(id: string | null) {
  return useDetailMutation(({ itemId, input }: { itemId: string; input: UpdateAiItemRequest }) =>
    updateAiItem(id as string, itemId, input),
  )
}

export function useSaveAiRequest(id: string | null) {
  return useDetailMutation<void, SaveAiRequestResult>(() => saveAiRequest(id as string), true)
}

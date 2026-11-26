import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EnrollmentMovements } from './EnrollmentMovements'

const BRANCH = '10000000-0000-4000-8000-000000000001'

afterEach(() => vi.unstubAllGlobals())

it('filters enrollment movements by month and displays branch totals and event details', async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ({ ok: true, json: async () => ({
    branches: [{ id: BRANCH, name: 'Cơ sở 1' }],
    events: [
      { id: '1', branchId: BRANCH, branchName: 'Cơ sở 1', className: 'Lớp A', studentPhone: '0900000001', type: 'enrolled', occurredAt: '2026-02-01T00:00:00Z' },
      { id: '2', branchId: BRANCH, branchName: 'Cơ sở 1', className: 'Lớp A', studentPhone: '0900000002', type: 'withdrawn', occurredAt: '2026-02-02T00:00:00Z' },
    ],
  }) }))
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><EnrollmentMovements /></QueryClientProvider>)
  expect(await screen.findByText('0900000001')).toBeInTheDocument()
  const row = screen.getByRole('row', { name: /Cơ sở 1 1 1/ })
  expect(within(row).getAllByText('1')).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('Tháng ghi danh'), { target: { value: '2026-02' } })
  fireEvent.change(screen.getByLabelText('Cơ sở ghi danh'), { target: { value: BRANCH } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem' }))
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('from=2026-02-01') && String(url).includes('to=2026-02-28') && String(url).includes(`branchId=${BRANCH}`))).toBe(true))
  fireEvent.change(screen.getByLabelText('Từ ngày ghi danh'), { target: { value: '2026-03-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Khoảng ngày không hợp lệ')
})

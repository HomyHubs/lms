import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App health-check UI', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          status: 'ok',
          db: { status: 'up', latencyMs: 2 },
          timestamp: '2026-09-14T00:00:00.000Z',
        }),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the DB connected status from the backend', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByText(/Đã kết nối/)).toBeInTheDocument())
  })
})

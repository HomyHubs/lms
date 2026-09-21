import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionsPage } from './QuestionsPage'

/** Fetch gia lap tra ve mot cau hoi cho GET /questions. */
function stubQuestionsFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/questions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            questions: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                levelId: '22222222-2222-2222-2222-222222222222',
                levelCode: 'starter',
                skill: 'reading',
                questionType: 'multiple_choice',
                difficulty: 'easy',
                questionText: 'What color is the sky?',
                options: ['blue', 'green'],
                correctAnswer: 'blue',
                points: 1,
                explanation: null,
                sourceReference: null,
                createdAt: '2026-09-21T00:00:00.000Z',
              },
            ],
          }),
        }
      }
      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <QuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuestionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and lists questions', async () => {
    stubQuestionsFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Ngân hàng câu hỏi/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('What color is the sky?')).toBeInTheDocument(),
    )
  })
})

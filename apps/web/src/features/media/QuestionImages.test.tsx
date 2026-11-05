import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuestionMediaItem } from '@lms/shared'
import { QuestionImages } from './QuestionImages'

const QID = '30000000-0000-4000-8000-000000000001'
const MEDIA_ID = '60000000-0000-4000-8000-000000000001'
const json = (body: unknown, status = 200) => Response.json(body, { status })

function fakeBackend() {
  let saved: QuestionMediaItem[] = []
  const uploads: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/media' && init?.method === 'POST') {
      uploads.push(String((init.headers as Record<string, string>)['content-type']))
      return json({ media: { id: MEDIA_ID, mime: 'image/png', bytes: 8, width: 1, height: 1, url: `/api/media/${MEDIA_ID}` } }, 201)
    }
    if (url === `/api/questions/${QID}/media`) {
      if (init?.method === 'PUT') saved = (JSON.parse(String(init.body)) as { media: QuestionMediaItem[] }).media
      return json({ media: saved.map((m) => ({ ...m, url: `/api/media/${m.mediaId}` })) })
    }
    return json({ error: `unexpected ${url}` }, 500)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { uploads, saved: () => saved }
}

function renderImages() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <QuestionImages questionId={QID} label="Hình câu 1" options={['cat', 'dog']} editable />
    </QueryClientProvider>,
  )
}

describe('QuestionImages', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uploads an image onto the chosen option and shows it', async () => {
    const backend = fakeBackend()
    renderImages()
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: '1' } })
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'dog.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Chọn ảnh cho Hình câu 1'), { target: { files: [file] } })

    expect(await screen.findByAltText('Hình câu 1 — lựa chọn b')).toBeTruthy()
    expect(backend.saved()).toEqual([{ mediaId: MEDIA_ID, slot: 'option', optionIndex: 1 }])
  })

  it('rejects a non-image file before uploading', async () => {
    const backend = fakeBackend()
    renderImages()
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(await screen.findByLabelText('Chọn ảnh cho Hình câu 1'), { target: { files: [file] } })

    expect((await screen.findByRole('alert')).textContent).toContain('PNG, JPEG, WebP')
    expect(backend.uploads).toHaveLength(0)
  })
})

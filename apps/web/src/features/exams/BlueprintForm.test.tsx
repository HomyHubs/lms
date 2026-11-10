import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlueprintForm } from './BlueprintForm'

// slice-14: BlueprintForm dung react-query (useLevels/useCourses/useClasses) -> can QueryClientProvider.
function renderForm(onCreated: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BlueprintForm onCreated={onCreated} />
    </QueryClientProvider>,
  )
}

// Catalog seed cung cap do 'starter' de hien lop trong form.
const LEVEL_STARTER = '22222222-2222-4222-8222-222222222222'
const COURSE_STARTER = '55555555-5555-4555-8555-555555555555'
const CLASS_STARTER = '66666666-6666-4666-8666-666666666666'

/** Tra JSON cho cac GET danh muc (levels/courses/classes); null neu khong phai catalog. */
function catalogResponse(url: string): Response | null {
  if (url.startsWith('/api/levels')) return Response.json({ levels: [{ id: LEVEL_STARTER, code: 'starter', name: 'Starter' }] })
  if (url.startsWith('/api/courses'))
    return Response.json({ courses: [{ id: COURSE_STARTER, levelId: LEVEL_STARTER, name: 'Khoa Starter', createdAt: '2026-11-01T00:00:00Z' }] })
  if (url.startsWith('/api/classes'))
    return Response.json({ classes: [{ id: CLASS_STARTER, courseId: COURSE_STARTER, branchId: '77777777-7777-4777-8777-777777777777', name: 'Lop Starter 1', createdAt: '2026-11-01T00:00:00Z' }] })
  return null
}

describe('BlueprintForm', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('validates schedule, posts typed blueprint and reports creation', async () => {
    let body: Record<string, unknown> | undefined
    const fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
      const catalog = catalogResponse(String(url))
      if (catalog) return catalog
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ exam: { ...body, id: '11111111-1111-4111-8111-111111111111',
        levelId: '22222222-2222-4222-8222-222222222222', levelCode: 'starter',
        passPercent: 60, maxAttempts: 3, retakeCooldownMinutes: 0,
        createdBy: '33333333-3333-4333-8333-333333333333', createdAt: '2026-11-03T00:00:00Z' } }),
      { status: 201, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetch)
    const created = vi.fn()
    renderForm(created)
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'Reading blueprint' } })
    fireEvent.change(screen.getByLabelText('Mở lúc (giờ địa phương)'), { target: { value: '2026-11-04T10:00' } })
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T09:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Thoi diem dong phai sau thoi diem mo')
    // Validate that bad input does not POST to /exams (catalog GETs on mount are allowed).
    expect(fetch.mock.calls.some(([u, init]) => String(u).endsWith('/api/exams') && init?.method === 'POST')).toBe(false)
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T11:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Đã tạo đề thi')
    expect(body).toMatchObject({ title: 'Reading blueprint', level: 'starter', skill: 'reading',
      questionCount: 10, durationMinutes: 30 })
    expect(body?.opensAt).toBe(new Date('2026-11-04T10:00').toISOString())
    expect(created).toHaveBeenCalledOnce()
  })

  it('fixed-set mode lists published sets and posts ids, shuffle flags and retake strategy', async () => {
    const setId = '44444444-4444-4444-8444-444444444444'
    let body: Record<string, unknown> | undefined
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
      urls.push(String(url))
      const catalog = catalogResponse(String(url))
      if (catalog) return catalog
      if (String(url).startsWith('/api/exam-sets')) {
        return Response.json({ examSets: [{ id: setId, title: 'Bo A', levelId: '22222222-2222-4222-8222-222222222222',
          levelCode: 'starter', skill: 'reading', description: null, status: 'published', itemCount: 5,
          createdBy: '33333333-3333-4333-8333-333333333333', createdAt: '2026-11-12T00:00:00Z',
          updatedAt: '2026-11-12T00:00:00Z', publishedAt: '2026-11-12T00:00:00Z' }] })
      }
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Response.json({ exam: { ...body, id: '11111111-1111-4111-8111-111111111111', questionCount: 5,
        levelId: '22222222-2222-4222-8222-222222222222', levelCode: 'starter', passPercent: 60, maxAttempts: 3,
        retakeCooldownMinutes: 0, createdBy: '33333333-3333-4333-8333-333333333333', createdAt: '2026-11-03T00:00:00Z' } },
      { status: 201 })
    }))
    renderForm(vi.fn())
    fireEvent.change(screen.getByLabelText('Cách ra đề'), { target: { value: 'fixed_set' } })
    fireEvent.click(await screen.findByLabelText(/Bo A/))
    fireEvent.click(screen.getByLabelText('Trộn đáp án trắc nghiệm'))
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'Fixed' } })
    fireEvent.change(screen.getByLabelText('Mở lúc (giờ địa phương)'), { target: { value: '2026-11-04T10:00' } })
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T11:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Đã tạo đề thi')
    expect(urls).toContain('/api/exam-sets?status=published')
    expect(body).toMatchObject({ mode: 'fixed_set', examSetIds: [setId], shuffleQuestions: false, shuffleOptions: true,
      retakeStrategy: 'same_set_shuffled' })
    expect(body).not.toHaveProperty('questionCount')
  })

  it('slice-14: hien lop cung cap do va gui classIds da chon', async () => {
    let body: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
      const catalog = catalogResponse(String(url))
      if (catalog) return catalog
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Response.json({ exam: { ...body, id: '11111111-1111-4111-8111-111111111111',
        levelId: LEVEL_STARTER, levelCode: 'starter', passPercent: 60, maxAttempts: 3, retakeCooldownMinutes: 0,
        createdBy: '33333333-3333-4333-8333-333333333333', createdAt: '2026-11-03T00:00:00Z' } }, { status: 201 })
    }))
    renderForm(vi.fn())
    // Lop cung cap do 'starter' (mac dinh) phai hien va chon duoc.
    const classCheckbox = await screen.findByLabelText('Lop Starter 1')
    fireEvent.click(classCheckbox)
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'Reading theo lop' } })
    fireEvent.change(screen.getByLabelText('Mở lúc (giờ địa phương)'), { target: { value: '2026-11-04T10:00' } })
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T11:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Đã tạo đề thi')
    expect(body?.classIds).toEqual([CLASS_STARTER])
  })
})

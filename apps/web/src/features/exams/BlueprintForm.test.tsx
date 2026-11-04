import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlueprintForm } from './BlueprintForm'

describe('BlueprintForm', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('validates schedule, posts typed blueprint and reports creation', async () => {
    let body: Record<string, unknown> | undefined
    const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ exam: { ...body, id: '11111111-1111-4111-8111-111111111111',
        levelId: '22222222-2222-4222-8222-222222222222', levelCode: 'starter',
        passPercent: 60, maxAttempts: 3, retakeCooldownMinutes: 0,
        createdBy: '33333333-3333-4333-8333-333333333333', createdAt: '2026-11-03T00:00:00Z' } }),
      { status: 201, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetch)
    const created = vi.fn()
    render(<BlueprintForm onCreated={created} />)
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'Reading blueprint' } })
    fireEvent.change(screen.getByLabelText('Mở lúc (giờ địa phương)'), { target: { value: '2026-11-04T10:00' } })
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T09:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Thoi diem dong phai sau thoi diem mo')
    expect(fetch).not.toHaveBeenCalled()
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
    render(<BlueprintForm onCreated={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Cách ra đề'), { target: { value: 'fixed_set' } })
    fireEvent.click(await screen.findByLabelText(/Bo A/))
    fireEvent.click(screen.getByLabelText('Trộn đáp án trắc nghiệm'))
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'Fixed' } })
    fireEvent.change(screen.getByLabelText('Mở lúc (giờ địa phương)'), { target: { value: '2026-11-04T10:00' } })
    fireEvent.change(screen.getByLabelText('Đóng lúc (giờ địa phương)'), { target: { value: '2026-11-04T11:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo đề thi' }))
    await screen.findByText('Đã tạo đề thi')
    expect(urls[0]).toBe('/api/exam-sets?status=published')
    expect(body).toMatchObject({ mode: 'fixed_set', examSetIds: [setId], shuffleQuestions: false, shuffleOptions: true,
      retakeStrategy: 'same_set_shuffled' })
    expect(body).not.toHaveProperty('questionCount')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Class, Course, Level } from '@lms/shared'
import { LevelRoadmap } from './LevelRoadmap'

const LEVELS: Level[] = [
  // API sap xep theo name -> Flyer, Mover, Starter. So do phai tu sap lai theo lo trinh.
  { id: 'lvl-flyer', code: 'flyer', name: 'Flyer' },
  { id: 'lvl-mover', code: 'mover', name: 'Mover' },
  { id: 'lvl-starter', code: 'starter', name: 'Starter' },
]

const COURSES: Course[] = [
  { id: 'c1', levelId: 'lvl-starter', name: 'Starter 1', createdAt: '2026-09-16T00:00:00.000Z' },
  { id: 'c2', levelId: 'lvl-starter', name: 'Starter 2', createdAt: '2026-09-16T00:00:00.000Z' },
  { id: 'c3', levelId: 'lvl-flyer', name: 'Flyer 1', createdAt: '2026-09-16T00:00:00.000Z' },
]

const CLASSES: Class[] = [
  { id: 'k1', courseId: 'c1', branchId: 'b1', name: 'L1', createdAt: '2026-09-16T00:00:00.000Z' },
  { id: 'k2', courseId: 'c1', branchId: 'b1', name: 'L2', createdAt: '2026-09-16T00:00:00.000Z' },
  { id: 'k3', courseId: 'c3', branchId: 'b1', name: 'L3', createdAt: '2026-09-16T00:00:00.000Z' },
]

describe('LevelRoadmap', () => {
  it('orders levels Starter -> Mover -> Flyer regardless of API order', () => {
    render(<LevelRoadmap levels={LEVELS} courses={COURSES} classes={CLASSES} />)
    const steps = screen.getAllByText(/^Cấp \d$/)
    expect(steps.map((s) => s.textContent)).toEqual(['Cấp 1', 'Cấp 2', 'Cấp 3'])

    const headings = ['Starter', 'Mover', 'Flyer'].map((name) => screen.getByText(name))
    expect(headings.map((h) => h.textContent)).toEqual(['Starter', 'Mover', 'Flyer'])
  })

  it('shows real course and class counts per level', () => {
    render(<LevelRoadmap levels={LEVELS} courses={COURSES} classes={CLASSES} />)
    // Starter: 2 khoa hoc, 2 lop (c1 co 2 lop).
    expect(screen.getByText('2 khoá học · 2 lớp')).toBeInTheDocument()
    // Mover: chua co khoa hoc nao.
    expect(screen.getByText('0 khoá học · 0 lớp')).toBeInTheDocument()
    expect(screen.getByText('Chưa có khoá học')).toBeInTheDocument()
    // Flyer: 1 khoa hoc, 1 lop.
    expect(screen.getByText('1 khoá học · 1 lớp')).toBeInTheDocument()
    expect(screen.getByText('Flyer 1')).toBeInTheDocument()
  })

  it('renders an empty state when there are no levels', () => {
    render(<LevelRoadmap levels={[]} courses={[]} classes={[]} />)
    expect(screen.getByText('Chưa có cấp độ nào.')).toBeInTheDocument()
  })
})

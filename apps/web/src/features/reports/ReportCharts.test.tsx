import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ReportCharts } from './ReportCharts'

it('renders proportional charts and labels from the supplied values', () => {
  const { container } = render(<ReportCharts title="Kết quả" items={[{ label: 'Đạt', value: 3 }, { label: 'Trượt', value: 1 }]} />)
  expect(within(screen.getByLabelText('Chú giải biểu đồ tròn')).getByText('Đạt: 3 lượt (75.0%)')).toBeInTheDocument()
  expect(within(screen.getByLabelText('Chú giải biểu đồ tròn')).getByText('Trượt: 1 lượt (25.0%)')).toBeInTheDocument()
  const circles = container.querySelectorAll('circle')
  expect(circles[0]).toHaveAttribute('stroke-dasharray', '75 25')
  expect(circles[1]).toHaveAttribute('stroke-dashoffset', '-75')
})

it('shows an empty state instead of a pie when all values are zero', () => {
  const { container } = render(<ReportCharts title="Kết quả" items={[{ label: 'Đạt', value: 0 }]} />)
  expect(screen.getByText('Chưa có dữ liệu để vẽ biểu đồ.')).toBeInTheDocument()
  expect(container.querySelector('svg')).toBeNull()
})

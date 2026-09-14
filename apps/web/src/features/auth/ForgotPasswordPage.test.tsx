import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ForgotPasswordPage flow (Task 3)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('moves from the email step to the OTP step after requesting a code', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))

    await waitFor(() => expect(screen.getByLabelText('Mã OTP')).toBeInTheDocument())
    expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument()
  })

  it('shows success after resetting with an OTP and new password', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))
    await waitFor(() => expect(screen.getByLabelText('Mã OTP')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
      target: { value: 'brandnew8' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/ }))

    await waitFor(() =>
      expect(screen.getByText(/Đặt lại mật khẩu thành công/)).toBeInTheDocument(),
    )
  })
})

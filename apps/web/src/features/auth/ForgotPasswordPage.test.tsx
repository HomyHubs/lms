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

describe('ForgotPasswordPage flow (Task 3 + Slice-2)', () => {
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

  it('offers Email only and sends the email channel with no provider selector', async () => {
    renderPage()
    // Email-only (slice-2 revised): khong con bo chon kenh / so WhatsApp / Chat ID.
    expect(screen.queryByLabelText(/Kênh nhận OTP/)).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Số WhatsApp/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Chat ID/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))
    await screen.findByLabelText('Mã OTP')
    const call = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).includes('/forgot-password'))
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      email: 'admin@example.com',
      channel: 'email',
    })
  })

  it('blocks the request and shows an error when the email is empty', async () => {
    renderPage()
    // Email rong -> validate phia client chan lai, van o buoc yeu cau, khong goi API.
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument()
    const call = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).includes('/forgot-password'))
    expect(call).toBeUndefined()
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

    await waitFor(() => expect(screen.getByText(/Đặt lại mật khẩu thành công/)).toBeInTheDocument())
  })
})

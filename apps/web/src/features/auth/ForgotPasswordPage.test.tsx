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

  it('shows a recipient field and sends the chosen channel when WhatsApp is selected', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Kênh nhận OTP'), {
      target: { value: 'whatsapp' },
    })
    const recipient = await screen.findByLabelText(/Số WhatsApp/)
    fireEvent.change(recipient, { target: { value: '84901234567' } })
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))

    // Chuyen sang buoc nhap OTP nghia la request da hop le va gui thanh cong.
    await waitFor(() => expect(screen.getByLabelText('Mã OTP')).toBeInTheDocument())

    // Body gui len backend co channel + recipient da chon.
    const fetchMock = vi.mocked(fetch)
    const forgotCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/forgot-password'))
    expect(forgotCall).toBeDefined()
    const body = JSON.parse(String((forgotCall![1] as RequestInit).body)) as {
      channel?: string
      recipient?: string
    }
    expect(body.channel).toBe('whatsapp')
    expect(body.recipient).toBe('84901234567')
  })

  it('blocks the WhatsApp request when the recipient is empty', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Kênh nhận OTP'), {
      target: { value: 'whatsapp' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/ }))

    // Van o buoc yeu cau (chua chuyen sang nhap OTP) va hien loi.
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument()
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

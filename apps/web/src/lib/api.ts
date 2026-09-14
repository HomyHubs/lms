import {
  HealthResponse,
  LoginResponse,
  MeResponse,
  type LoginRequest,
  type PublicUser,
} from '@lms/shared'

/** Goi endpoint health-check that qua proxy `/api` (vite.config.ts). */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  const json: unknown = await res.json()
  return HealthResponse.parse(json)
}

/** Loi API kem status code de UI phan biet 401 vs loi khac. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Dang nhap bang SDT + mat khau. Cookie phien do backend set (HttpOnly). */
export async function login(input: LoginRequest): Promise<PublicUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'So dien thoai hoac mat khau khong dung'
        : 'Dang nhap that bai, thu lai sau'
    throw new ApiError(res.status, message)
  }
  const json: unknown = await res.json()
  return LoginResponse.parse(json).user
}

/** Lay phien hien tai; tra `null` khi chua dang nhap (401). */
export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc phien')
  const json: unknown = await res.json()
  return MeResponse.parse(json).user
}

/** Dang xuat: xoa phien o backend. */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}

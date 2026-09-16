export { authRoutes, SESSION_COOKIE } from './routes.js'
export { makeAuthStore, makePasswordResetStore } from './store.js'
export {
  hashPassword,
  verifyPassword,
  login,
  logout,
  resolveSession,
  generateSessionToken,
  hashSessionToken,
  type AuthStore,
  type UserRecord,
  type LoginResult,
} from './service.js'
export {
  requestPasswordReset,
  resetPassword,
  generateOtp,
  hashOtp,
  MAX_OTP_ATTEMPTS,
  type PasswordResetStore,
  type OtpEmailSender,
  type OtpRecord,
  type ResetPasswordOutcome,
} from './password-reset.js'
export { makeConsoleEmailSender } from './email.js'

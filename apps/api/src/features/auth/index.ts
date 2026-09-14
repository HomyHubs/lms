export { authRoutes, SESSION_COOKIE } from './routes.js'
export { makeAuthStore } from './store.js'
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

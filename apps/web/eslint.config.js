import config from '@lms/config-eslint/react'

// The Playwright E2E suite (e2e/) is outside the app tsconfig and is linted/typed
// by Playwright at runtime, not by the app's typed ESLint project — ignore it here.
export default [
  ...(Array.isArray(config) ? config : [config]),
  // e2e/ is Playwright's suite (outside the app tsconfig); .vite/ is Vite's
  // transient dependency pre-bundle cache (generated vendor code). Neither is
  // app source, so keep both out of the lint set.
  { ignores: ['e2e/**', '.vite/**'] },
]

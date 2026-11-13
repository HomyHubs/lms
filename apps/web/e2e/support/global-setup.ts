import { writeXlsxFixtures } from './make-fixtures'

/**
 * Generates binary import fixtures before any spec. The disposable PostgreSQL 18
 * + built API are booted by the API webServer launcher (e2e/support/run-api.mjs),
 * so there is no DB work here.
 */
export default async function globalSetup(): Promise<void> {
  writeXlsxFixtures()
}

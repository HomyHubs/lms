import { stopStack } from './stack'

/** Best-effort teardown: stop the API process and remove the disposable DB container. */
export default async function globalTeardown(): Promise<void> {
  await stopStack()
}

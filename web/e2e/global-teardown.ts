import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default async function globalTeardown() {
  const e2eDir = path.dirname(fileURLToPath(import.meta.url))
  const teardownScript = path.join(e2eDir, 'docker-teardown.sh')
  try {
    execSync(`bash "${teardownScript}"`, {
      stdio: 'inherit',
      cwd: path.join(e2eDir, '../../..'),
    })
  } catch {
    console.warn('[e2e] Teardown: some containers may have already been stopped')
  }
}

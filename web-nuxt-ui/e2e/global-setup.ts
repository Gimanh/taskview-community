import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function loadEnv(dir: string) {
  const envPath = path.join(dir, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

export default async function globalSetup() {
  const e2eDir = path.dirname(fileURLToPath(import.meta.url))
  const projectDir = path.join(e2eDir, '..')
  loadEnv(projectDir)
  const setupScript = path.join(e2eDir, 'docker-setup.sh')
  execSync(`bash "${setupScript}"`, {
    stdio: 'inherit',
    cwd: path.join(e2eDir, '../../..'),
    env: process.env,
  })
}

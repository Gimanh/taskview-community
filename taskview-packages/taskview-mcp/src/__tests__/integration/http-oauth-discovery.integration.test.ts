import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The HTTP transport is the entry point of OAuth discovery: a client knows only
 * the /mcp URL, gets a 401, and follows WWW-Authenticate to the resource
 * metadata. These run against the built dist/http.js as a real process, because
 * that is what ships and what a client actually talks to.
 */
const PORT = 3199
const PUBLIC_URL = `http://127.0.0.1:${PORT}`
const TASKVIEW_URL = process.env.TASKVIEW_URL || 'http://127.0.0.1:11401'

let server: ChildProcess

async function waitForServer(attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`${PUBLIC_URL}/health`)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('MCP HTTP server did not start')
}

describe('MCP HTTP transport — OAuth discovery', () => {
  beforeAll(async () => {
    server = spawn('node', [join(__dirname, '../../../dist/http.js')], {
      env: {
        ...process.env,
        TASKVIEW_URL,
        MCP_PUBLIC_URL: PUBLIC_URL,
        MCP_HTTP_PORT: String(PORT),
      },
      stdio: 'ignore',
    })
    await waitForServer()
  })

  afterAll(() => {
    server?.kill()
  })

  it('answers an unauthenticated call with 401 and points at the resource metadata', async () => {
    const response = await fetch(`${PUBLIC_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`,
    )
  })

  it('publishes protected resource metadata naming the TaskView API as the authorization server', async () => {
    const response = await fetch(`${PUBLIC_URL}/.well-known/oauth-protected-resource`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.resource).toBe(PUBLIC_URL)
    expect(body.authorization_servers).toEqual([TASKVIEW_URL])
    expect(body.bearer_methods_supported).toEqual(['header'])
  })

  it('uses MCP_PUBLIC_URL rather than the Host header, so a proxy cannot leak an internal address', async () => {
    const response = await fetch(`${PUBLIC_URL}/.well-known/oauth-protected-resource`, {
      headers: { Host: 'internal-name:9999' },
    })
    const body = await response.json()

    expect(body.resource).toBe(PUBLIC_URL)
  })

  it('keeps /health open', async () => {
    const response = await fetch(`${PUBLIC_URL}/health`)

    expect(response.status).toBe(200)
    expect((await response.json()).status).toBe('ok')
  })

  it('does not allow an unlisted browser origin', async () => {
    const response = await fetch(`${PUBLIC_URL}/mcp`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com' },
    })

    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('allows an origin listed in MCP_ALLOWED_ORIGINS', async () => {
    const allowed = spawn('node', [join(__dirname, '../../../dist/http.js')], {
      env: {
        ...process.env,
        TASKVIEW_URL,
        MCP_PUBLIC_URL: `http://127.0.0.1:${PORT + 1}`,
        MCP_HTTP_PORT: String(PORT + 1),
        MCP_ALLOWED_ORIGINS: 'https://good.example.com',
      },
      stdio: 'ignore',
    })

    try {
      for (let i = 0; i < 40; i++) {
        try {
          if ((await fetch(`http://127.0.0.1:${PORT + 1}/health`)).ok) break
        } catch {
          // not listening yet
        }
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      const response = await fetch(`http://127.0.0.1:${PORT + 1}/mcp`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://good.example.com' },
      })

      expect(response.headers.get('access-control-allow-origin')).toBe('https://good.example.com')
    } finally {
      allowed.kill()
    }
  })
})

import { createServer, type IncomingMessage, type Server } from 'node:http'
import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto'

export type MockIdpUser = {
  sub: string
  email: string
  name?: string
  preferredUsername?: string
}

export type MockOidcIdp = {
  issuer: string
  clientId: string
  clientSecret: string
  setUser: (user: MockIdpUser) => void
  close: () => Promise<void>
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
  })
}

/**
 * Minimal in-process OIDC identity provider for e2e tests: serves discovery,
 * authorize (immediate redirect back with a code), token (RS256-signed id_token
 * with the claims of the current test user) and JWKS endpoints.
 */
export async function startMockOidcIdp(port: number): Promise<MockOidcIdp> {
  const issuer = `http://127.0.0.1:${port}`
  const clientId = 'taskview-e2e-client'
  const clientSecret = 'taskview-e2e-secret'
  const kid = 'e2e-key'

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }

  let currentUser: MockIdpUser = { sub: 'e2e-sub', email: 'e2e@example.test' }
  const nonceByCode = new Map<string, string>()

  function signIdToken(nonce: string | undefined): string {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }))
    const payload = base64url(
      JSON.stringify({
        iss: issuer,
        aud: clientId,
        sub: currentUser.sub,
        iat: now,
        exp: now + 3600,
        email: currentUser.email,
        ...(currentUser.name ? { name: currentUser.name } : {}),
        ...(currentUser.preferredUsername ? { preferred_username: currentUser.preferredUsername } : {}),
        ...(nonce ? { nonce } : {}),
      }),
    )
    const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(privateKey)
    return `${header}.${payload}.${base64url(signature)}`
  }

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', issuer)

    if (url.pathname === '/.well-known/openid-configuration') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
          code_challenge_methods_supported: ['S256'],
          scopes_supported: ['openid', 'email', 'profile'],
        }),
      )
      return
    }

    if (url.pathname === '/authorize') {
      const redirectUri = url.searchParams.get('redirect_uri')
      const state = url.searchParams.get('state')
      const nonce = url.searchParams.get('nonce')
      if (!redirectUri) {
        res.writeHead(400).end('missing redirect_uri')
        return
      }
      const code = randomUUID()
      if (nonce) nonceByCode.set(code, nonce)
      const target = new URL(redirectUri)
      target.searchParams.set('code', code)
      if (state) target.searchParams.set('state', state)
      res.writeHead(302, { location: target.href }).end()
      return
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      const body = new URLSearchParams(await readBody(req))
      const code = body.get('code') ?? ''
      const nonce = nonceByCode.get(code)
      nonceByCode.delete(code)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          access_token: randomUUID(),
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid email profile',
          id_token: signIdToken(nonce),
        }),
      )
      return
    }

    if (url.pathname === '/jwks') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ keys: [publicJwk] }))
      return
    }

    res.writeHead(404).end()
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    issuer,
    clientId,
    clientSecret,
    setUser: (user) => (currentUser = user),
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  }
}

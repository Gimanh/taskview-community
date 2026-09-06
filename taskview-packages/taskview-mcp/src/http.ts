#!/usr/bin/env node
import { createServer, type IncomingMessage } from 'node:http'
import axios from 'axios'
import { TvApi } from 'taskview-api'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from './server.js'
import type { CorsHeadersArgs, HandleMcpRequestArgs, UnauthorizedArgs } from './http.types.js'

const TASKVIEW_URL = process.env.TASKVIEW_URL
const PORT = Number(process.env.MCP_HTTP_PORT || 3100)
// Public URL of THIS server, as clients reach it — the OAuth resource
// identifier. It may carry a path when the server is mounted under one
// (https://api.example.com/mcp), which changes where the metadata lives.
const MCP_PUBLIC_URL = process.env.MCP_PUBLIC_URL?.replace(/\/+$/, '')
const METADATA_PREFIX = '/.well-known/oauth-protected-resource'
// Browser origins allowed to call /mcp. Unset means no browser origin is
// allowed — non-browser clients (ChatGPT, Claude, CLIs) send no Origin and are
// unaffected. Guards against DNS rebinding, which the MCP spec calls out.
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (!TASKVIEW_URL) {
  console.error('Required environment variable: TASKVIEW_URL')
  console.error('Example: TASKVIEW_URL=https://api.taskview.tech MCP_HTTP_PORT=3100 taskview-mcp-http')
  process.exit(1)
}

function corsHeaders({ origin }: CorsHeadersArgs): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    Vary: 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function resourceUrl(req: IncomingMessage): string {
  if (MCP_PUBLIC_URL) return MCP_PUBLIC_URL
  const host = req.headers.host ?? `localhost:${PORT}`
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
  return `${proto || 'http'}://${host}/mcp`
}

/**
 * RFC 9728 §3.1: for a resource identified by a URL with a path, the metadata
 * lives at the well-known prefix followed by that path — not at the origin root.
 * A client that computes the address from the spec instead of trusting the
 * WWW-Authenticate header looks exactly there, so this is what makes a server
 * mounted under /mcp discoverable.
 */
function metadataPathsFor(resource: string): string[] {
  let path = ''
  try {
    path = new URL(resource).pathname.replace(/\/+$/, '')
  } catch {
    path = ''
  }
  // The root form stays served for clients that only follow the 401 header.
  return path ? [`${METADATA_PREFIX}${path}`, METADATA_PREFIX] : [METADATA_PREFIX]
}

function metadataUrlFor(resource: string): string {
  const [preferred] = metadataPathsFor(resource)
  try {
    return `${new URL(resource).origin}${preferred}`
  } catch {
    return `${resource}${METADATA_PREFIX}`
  }
}

function protectedResourceMetadata(req: IncomingMessage) {
  return {
    resource: resourceUrl(req),
    authorization_servers: [TASKVIEW_URL],
    bearer_methods_supported: ['header'],
  }
}

function sendUnauthorized({ req, res, message }: UnauthorizedArgs) {
  const metadataUrl = metadataUrlFor(resourceUrl(req))
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}"`,
  }).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    }),
  )
}

function extractBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

// Stateless mode: every request gets its own server + transport pair wired to
// an axios instance carrying ONLY this caller's token, so tokens can never
// leak between users through shared state.
async function handleMcpRequest({ req, res, token }: HandleMcpRequestArgs) {
  const $axios = axios.create({
    baseURL: TASKVIEW_URL,
    timeout: 30000,
    headers: { Authorization: `Bearer ${token}` },
  })
  const api = new TvApi($axios)
  const server = createMcpServer(api)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  res.on('close', () => {
    transport.close()
    server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res)
}

const httpServer = createServer(async (req, res) => {
  for (const [name, value] of Object.entries(corsHeaders({ origin: req.headers.origin }))) {
    res.setHeader(name, value)
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  const path = new URL(req.url ?? '/', 'http://localhost').pathname

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (metadataPathsFor(resourceUrl(req)).includes(path)) {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify(protectedResourceMetadata(req)),
    )
    return
  }

  if (path !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Not found. MCP endpoint is /mcp' }))
    return
  }

  const token = extractBearerToken(req)
  if (!token) {
    sendUnauthorized({
      req,
      res,
      message: 'Unauthorized: authorize with OAuth, or send a TaskView API token as "Authorization: Bearer tvk_..."',
    })
    return
  }

  try {
    await handleMcpRequest({ req, res, token })
  } catch (error) {
    console.error('[mcp-http] request failed:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }),
      )
    }
  }
})

httpServer.listen(PORT, () => {
  console.log(`TaskView MCP HTTP server listening on :${PORT} (endpoint /mcp), proxying to ${TASKVIEW_URL}`)
})

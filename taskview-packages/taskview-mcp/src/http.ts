#!/usr/bin/env node
import { createServer, type IncomingMessage } from 'node:http'
import axios from 'axios'
import { TvApi } from 'taskview-api'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from './server.js'
import type { HandleMcpRequestArgs } from './http.types.js'

const TASKVIEW_URL = process.env.TASKVIEW_URL
const PORT = Number(process.env.MCP_HTTP_PORT || 3100)

if (!TASKVIEW_URL) {
  console.error('Required environment variable: TASKVIEW_URL')
  console.error('Example: TASKVIEW_URL=https://api.taskview.tech MCP_HTTP_PORT=3100 taskview-mcp-http')
  process.exit(1)
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
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
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value)

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  const path = new URL(req.url ?? '/', 'http://localhost').pathname

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (path !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Not found. MCP endpoint is /mcp' }))
    return
  }

  const token = extractBearerToken(req)
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' }).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized: provide your TaskView API token as "Authorization: Bearer tvk_..."' },
        id: null,
      }),
    )
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

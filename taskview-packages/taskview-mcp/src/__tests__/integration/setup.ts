import axios from 'axios'
import { TvApi } from 'taskview-api'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const ts = () => Date.now()

const TASKVIEW_URL = process.env.TASKVIEW_URL
const TASKVIEW_TOKEN = process.env.TASKVIEW_TOKEN

if (!TASKVIEW_URL || !TASKVIEW_TOKEN) {
  throw new Error(
    'Integration tests require TASKVIEW_URL and TASKVIEW_TOKEN env vars.\n'
    + 'Example: TASKVIEW_URL=https://api.taskview.tech TASKVIEW_TOKEN=tvk_... pnpm test:integration',
  )
}

const $axios = axios.create({ baseURL: TASKVIEW_URL, timeout: 30000 })
$axios.defaults.headers.common['Authorization'] = `Bearer ${TASKVIEW_TOKEN}`

export const api = new TvApi($axios)

type ToolEntry = {
  name: string
  cb: (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>
}

export function captureServer() {
  const tools: ToolEntry[] = []
  const server = {
    registerTool(name: string, _config: unknown, cb: ToolEntry['cb']) {
      tools.push({ name, cb })
    },
  } as unknown as McpServer
  return { server, tools }
}

export function call(tools: ToolEntry[], name: string, args: Record<string, unknown> = {}) {
  const tool = tools.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool "${name}" not found`)
  return tool.cb(args)
}

export function parse(result: { content: { text: string }[]; isError?: boolean }) {
  const text = result.content[0].text
  if (result.isError) throw new Error(text)
  return JSON.parse(text)
}

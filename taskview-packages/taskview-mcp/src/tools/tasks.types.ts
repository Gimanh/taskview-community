import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import type { TaskUrlBuilder } from './task-url.js'

export type RegisterTasksToolsArgs = {
  server: McpServer
  api: TvApi
  taskUrls?: TaskUrlBuilder
}

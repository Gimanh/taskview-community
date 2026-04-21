import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { registerGoalsTools } from './tools/goals.js'
import { registerListsTools } from './tools/lists.js'
import { registerTasksTools } from './tools/tasks.js'
import { registerTagsTools } from './tools/tags.js'
import { registerKanbanTools } from './tools/kanban.js'
import { registerCollaborationTools } from './tools/collaboration.js'
import { registerGraphTools } from './tools/graph.js'
import { registerNotificationsTools } from './tools/notifications.js'
import { registerOrganizationsTools } from './tools/organizations.js'

export function createMcpServer(api: TvApi) {
  const server = new McpServer({
    name: 'taskview',
    version: '1.0.0',
  })

  registerGoalsTools(server, api)
  registerListsTools(server, api)
  registerTasksTools(server, api)
  registerTagsTools(server, api)
  registerKanbanTools(server, api)
  registerCollaborationTools(server, api)
  registerGraphTools(server, api)
  registerNotificationsTools(server, api)
  registerOrganizationsTools(server, api)

  return server
}

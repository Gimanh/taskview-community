import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerGraphTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_task_dependencies',
    {
      description: 'List all task dependency edges in a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const edges = await api.graph.fetchAllEdges(goalId)
        return ok(edges)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'add_task_dependency',
    {
      description: 'Create a dependency between two tasks',
      inputSchema: {
        source: z.coerce.number().describe('Source task ID'),
        target: z.coerce.number().describe('Target task ID (blocked by source)'),
      },
    },
    async (params) => {
      try {
        const edge = await api.graph.addEdge(params)
        return ok(edge)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_task_dependency',
    {
      description: 'Delete a task dependency edge',
      inputSchema: {
        id: z.coerce.number().describe('Dependency edge ID'),
      },
    },
    async ({ id }) => {
      try {
        const result = await api.graph.deleteEdge(id)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )
}

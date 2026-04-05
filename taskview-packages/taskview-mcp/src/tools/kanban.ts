import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerKanbanTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_kanban_columns',
    {
      description: 'Get all kanban columns for a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const columns = await api.kanban.fetchAllColumns(goalId)
        return ok(columns)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_kanban_column',
    {
      description: 'Create a new kanban column in a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        name: z.string().describe('Column name'),
      },
    },
    async (params) => {
      try {
        const column = await api.kanban.addColumn(params)
        return ok(column)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_kanban_column',
    {
      description: 'Update a kanban column',
      inputSchema: {
        id: z.coerce.number().describe('Column ID'),
        name: z.string().describe('New column name'),
        viewOrder: z.coerce.number().optional().describe('Display order'),
      },
    },
    async (params) => {
      try {
        const result = await api.kanban.updateColumn(params)
        return ok({ updated: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_kanban_column',
    {
      description: 'Delete a kanban column',
      inputSchema: {
        id: z.coerce.number().describe('Column ID to delete'),
      },
    },
    async (params) => {
      try {
        const result = await api.kanban.deleteColumn(params)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )
}

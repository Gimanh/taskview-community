import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerListsTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_lists',
    {
      description: 'Get all task lists within a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const lists = await api.goalLists.fetchLists({ goalId })
        return ok(lists)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_list',
    {
      description: 'Create a new task list within a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        name: z.string().describe('List name'),
        description: z.string().optional().describe('List description'),
      },
    },
    async (params) => {
      try {
        const list = await api.goalLists.createList(params)
        return ok(list)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_list',
    {
      description: 'Update a task list',
      inputSchema: {
        id: z.coerce.number().describe('List ID'),
        name: z.string().optional().describe('New name'),
        description: z.string().optional().describe('New description'),
        archive: z.union([z.literal(0), z.literal(1)]).optional().describe('Archive status'),
      },
    },
    async (params) => {
      try {
        const list = await api.goalLists.updateList(params)
        return ok(list)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_list',
    {
      description: 'Delete a task list',
      inputSchema: {
        id: z.coerce.number().describe('List ID to delete'),
      },
    },
    async ({ id }) => {
      try {
        const result = await api.goalLists.deleteList(id)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )
}

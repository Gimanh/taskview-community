import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerTagsTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_tags',
    {
      description: 'List all tags accessible to the current user',
    },
    async () => {
      try {
        const tags = await api.tags.fetchAllTagsForUser()
        return ok(tags)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_tag',
    {
      description: 'Create a new tag',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        name: z.string().describe('Tag name'),
        color: z.string().describe('Tag color (hex)'),
      },
    },
    async (params) => {
      try {
        const tag = await api.tags.createTag(params)
        return ok(tag)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_tag',
    {
      description: 'Update a tag',
      inputSchema: {
        id: z.coerce.number().describe('Tag ID'),
        name: z.string().describe('New tag name'),
        color: z.string().describe('New tag color (hex)'),
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async (params) => {
      try {
        const tag = await api.tags.updateTag(params)
        return ok(tag)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_tag',
    {
      description: 'Delete a tag',
      inputSchema: {
        tagId: z.coerce.number().describe('Tag ID to delete'),
      },
    },
    async (params) => {
      try {
        const result = await api.tags.deleteTag(params)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'toggle_task_tag',
    {
      description: 'Add or remove a tag from a task',
      inputSchema: {
        tagId: z.coerce.number().describe('Tag ID'),
        taskId: z.coerce.number().describe('Task ID'),
      },
    },
    async (params) => {
      try {
        const result = await api.tags.toggleTag(params)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )
}

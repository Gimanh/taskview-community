import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerGoalsTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_goals',
    {
      description: 'List all projects (goals) accessible to the current user. Optionally filter by organization.',
      inputSchema: {
        organizationId: z.coerce.number().optional().describe('Filter by organization ID'),
      },
    },
    async ({ organizationId }) => {
      try {
        const goals = await api.goals.fetchGoals(organizationId)
        return ok(goals)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_goal',
    {
      description: 'Create a new project (goal). If organizationId is provided, creates within that organization.',
      inputSchema: {
        name: z.string().describe('Project name'),
        description: z.string().optional().describe('Project description'),
        color: z.string().optional().describe('Project color (hex)'),
        organizationId: z.coerce.number().optional().describe('Organization ID to create the project in'),
      },
    },
    async (params) => {
      try {
        const goal = await api.goals.createGoal(params)
        if (!goal) return err('Failed to create goal')
        return ok(goal)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_goal',
    {
      description: 'Update a project (goal) — name, description, color',
      inputSchema: {
        id: z.coerce.number().describe('Goal ID'),
        name: z.string().optional().describe('New name'),
        description: z.string().optional().describe('New description'),
        color: z.string().optional().describe('New color (hex)'),
        archive: z.union([z.literal(0), z.literal(1)]).optional().describe('Archive status: 0=active, 1=archived'),
      },
    },
    async (params) => {
      try {
        const goal = await api.goals.updateGoal(params)
        if (!goal) return err('Goal not found or update failed')
        return ok(goal)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_goal',
    {
      description: 'Delete a project (goal)',
      inputSchema: {
        goalId: z.coerce.number().describe('Goal ID to delete'),
      },
    },
    async ({ goalId }) => {
      try {
        const result = await api.goals.deleteGoal(goalId)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )
}

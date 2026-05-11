import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerTimeTrackingTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'start_timer',
    {
      description: 'Start a timer for the given task. Returns {entry, autoStoppedEntry} — autoStoppedEntry is the previous active timer that was stopped (null if there was no active timer).',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID to track time for'),
        description: z.string().optional().describe('Optional description of the work'),
      },
    },
    async (params) => {
      try {
        const result = await api.timeTracking.start({
          taskId: params.taskId,
          description: params.description,
        })
        return ok(result)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'stop_timer',
    {
      description: 'Stop the active timer (or specific entry by id) and return the closed entry.',
      inputSchema: {
        entryId: z.coerce.number().optional().describe('Specific entry ID; if omitted, stops the user\'s active timer'),
      },
    },
    async (params) => {
      try {
        const entry = await api.timeTracking.stop(params.entryId ? { entryId: params.entryId } : {})
        return ok(entry)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_active_timer',
    {
      description: 'Get the user\'s currently running timer (if any).',
    },
    async () => {
      try {
        const entry = await api.timeTracking.getActive()
        return ok(entry)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'log_time',
    {
      description: 'Log a manual time entry retroactively (no time-period restrictions).',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
        startedAt: z.string().describe('ISO 8601 start timestamp'),
        endedAt: z.string().describe('ISO 8601 end timestamp (must be after startedAt)'),
        description: z.string().optional().describe('Optional description'),
        billable: z.boolean().optional().describe('Whether the time is billable (default true)'),
      },
    },
    async (params) => {
      try {
        const entry = await api.timeTracking.createManual({
          taskId: params.taskId,
          startedAt: params.startedAt,
          endedAt: params.endedAt,
          description: params.description,
          billable: params.billable,
        })
        return ok(entry)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_time_entries',
    {
      description: 'List time entries with optional filters (goalId, taskId, userId, date range).',
      inputSchema: {
        goalId: z.coerce.number().optional().describe('Filter by project'),
        taskId: z.coerce.number().optional().describe('Filter by task'),
        userId: z.coerce.number().optional().describe('Filter by user (requires manage_all permission)'),
        from: z.string().optional().describe('ISO 8601 start of range'),
        to: z.string().optional().describe('ISO 8601 end of range'),
        limit: z.coerce.number().optional().describe('Max entries (default 50, max 500)'),
        offset: z.coerce.number().optional().describe('Pagination offset'),
      },
    },
    async (params) => {
      try {
        const entries = await api.timeTracking.fetchEntries(params)
        return ok(entries)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_time_summary',
    {
      description: 'Get aggregated time summary for a task or a project (goal).',
      inputSchema: {
        scope: z.enum(['task', 'goal']).describe('Aggregation scope'),
        id: z.coerce.number().describe('Task ID (if scope=task) or goal ID (if scope=goal)'),
      },
    },
    async (params) => {
      try {
        const summary =
          params.scope === 'task'
            ? await api.timeTracking.summaryByTask(params.id)
            : await api.timeTracking.summaryByGoal(params.id)
        return ok(summary)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_time_entry',
    {
      description: 'Update fields of an existing time entry (cannot edit started/ended of a running timer).',
      inputSchema: {
        id: z.coerce.number().describe('Time entry ID'),
        startedAt: z.string().optional().describe('New start time (ISO 8601)'),
        endedAt: z.string().optional().describe('New end time (ISO 8601)'),
        description: z.string().optional().describe('New description'),
        billable: z.boolean().optional().describe('New billable flag'),
      },
    },
    async (params) => {
      try {
        const entry = await api.timeTracking.update(params)
        return ok(entry)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_time_entry',
    {
      description: 'Delete a time entry (writes a record to history.time_entries before deletion).',
      inputSchema: {
        id: z.coerce.number().describe('Time entry ID'),
      },
    },
    async (params) => {
      try {
        const result = await api.timeTracking.delete(params.id)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )
}

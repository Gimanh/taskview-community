import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type TvApi, ALL_TASKS_LIST_ID } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerTasksTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_tasks',
    {
      description: 'List tasks for a specific project (goal). Returns paginated results.',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        componentId: z.coerce.number().optional().describe('List (component) ID to filter by'),
        page: z.coerce.number().optional().default(0).describe('Page number (0-based, default: 0)'),
        showCompleted: z.boolean().optional().default(false).describe('Include completed tasks'),
        searchText: z.string().optional().describe('Search text to filter tasks'),
      },
    },
    async ({ goalId, componentId, page, showCompleted, searchText }) => {
      try {
        const tasks = await api.tasks.fetch({
          goalId,
          componentId: componentId ?? ALL_TASKS_LIST_ID,
          page: page ?? 0,
          showCompleted: showCompleted ? 1 : 0,
          firstNew: 0,
          searchText,
        })
        return ok(tasks)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_task',
    {
      description: 'Get a single task by its ID with full details',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
      },
    },
    async ({ taskId }) => {
      try {
        const task = await api.tasks.fetchTaskById(taskId)
        if (!task) return err('Task not found')
        return ok(task)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task in a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        description: z.string().describe('Task title/description'),
        goalListId: z.coerce.number().optional().nullable().describe('List ID within the project'),
        note: z.string().optional().nullable().describe('Additional notes'),
        priorityId: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
          .describe('Priority: 1=low, 2=medium, 3=high'),
        startDate: z.string().optional().nullable().describe('Start date (ISO format)'),
        endDate: z.string().optional().nullable().describe('End/due date (ISO format)'),
        parentId: z.coerce.number().optional().nullable().describe('Parent task ID (for subtasks)'),
        statusId: z.coerce.number().optional().nullable().describe('Kanban column status ID'),
      },
    },
    async (params) => {
      try {
        const task = await api.tasks.createTask(params)
        return ok(task)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_task',
    {
      description: 'Update an existing task (description, status, priority, dates, etc.)',
      inputSchema: {
        id: z.coerce.number().describe('Task ID to update'),
        description: z.string().optional().describe('New task description'),
        complete: z.boolean().optional().describe('Mark task as complete/incomplete'),
        note: z.string().optional().describe('Task notes'),
        priorityId: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
          .describe('Priority: 1=low, 2=medium, 3=high'),
        goalListId: z.coerce.number().optional().nullable().describe('Move to a different list'),
        startDate: z.string().optional().nullable().describe('Start date (ISO format)'),
        endDate: z.string().optional().nullable().describe('End/due date (ISO format)'),
        statusId: z.coerce.number().optional().nullable().describe('Kanban column status ID'),
      },
    },
    async (params) => {
      try {
        const result = await api.tasks.updateTask(params)
        if (!result) return err('Task not found or update failed')
        return ok(result)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_task',
    {
      description: 'Delete a task',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID to delete'),
      },
    },
    async ({ taskId }) => {
      try {
        const result = await api.tasks.deleteTask(taskId)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'toggle_task_assignees',
    {
      description: 'Assign or unassign users to/from a task',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
        userIds: z.array(z.coerce.number()).describe('User IDs to toggle'),
      },
    },
    async (params) => {
      try {
        const result = await api.tasks.toggleTasksAssignee(params)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_task_history',
    {
      description: 'Get the change history of a task',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
      },
    },
    async ({ taskId }) => {
      try {
        const history = await api.tasks.fetchTaskHistory(taskId)
        return ok(history)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'restore_task_from_history',
    {
      description: 'Restore a task to a previous state from its history',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
        historyId: z.coerce.number().describe('History entry ID to restore from'),
      },
    },
    async ({ taskId, historyId }) => {
      try {
        const result = await api.tasks.recoveryTaskHistory(historyId, taskId)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )
}

import type { TvApi } from 'taskview-api'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const ts = () => Date.now()

function wrap<T>(value: T) {
  return Promise.resolve({ response: value, rid: `rid-${ts()}` })
}

const noop = () => Promise.resolve(null)

export function mockApi(overrides: Record<string, Record<string, unknown>> = {}): TvApi {
  const defaults: Record<string, Record<string, unknown>> = {
    goals: { fetchGoals: noop, createGoal: noop, updateGoal: noop, deleteGoal: noop },
    tasks: {
      fetch: noop, fetchTaskById: noop, createTask: noop, updateTask: noop,
      deleteTask: noop, toggleTasksAssignee: noop, fetchTaskHistory: noop, recoveryTaskHistory: noop,
    },
    goalLists: { fetchLists: noop, createList: noop, updateList: noop, deleteList: noop },
    tags: { fetchAllTagsForUser: noop, createTag: noop, updateTag: noop, deleteTag: noop, toggleTag: noop },
    kanban: { fetchAllColumns: noop, addColumn: noop, updateColumn: noop, deleteColumn: noop },
    collaboration: {
      fetchAllUsers: noop, fetchUsersForGoal: noop, inviteUserToGoal: noop, deleteUserFromGoal: noop,
      toggleUserRoles: noop, fetchRolesForGoal: noop, createRoleForGoal: noop, deleteRoleFromGoal: noop,
      fetchRoleToPermissionsForGoal: noop, fetchAllPermissions: noop, toggleRolePermission: noop,
    },
    graph: { fetchAllEdges: noop, addEdge: noop, deleteEdge: noop },
    notifications: { fetch: noop, markRead: noop, markAllRead: noop },
  }

  for (const [ns, methods] of Object.entries(overrides)) {
    if (!defaults[ns]) defaults[ns] = {}
    Object.assign(defaults[ns], methods)
  }

  return defaults as unknown as TvApi
}

export function apiReturn(value: unknown) {
  return () => Promise.resolve(value)
}

export function apiThrow(message: string) {
  return () => Promise.reject(new Error(message))
}

type ToolEntry = {
  name: string
  config: { description?: string; inputSchema?: Record<string, unknown> }
  cb: (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>
}

export function mockServer() {
  const tools: ToolEntry[] = []

  const server = {
    registerTool(
      name: string,
      config: ToolEntry['config'],
      cb: ToolEntry['cb'],
    ) {
      tools.push({ name, config, cb })
    },
  } as unknown as McpServer

  return { server, tools }
}

export function findTool(tools: ToolEntry[], name: string) {
  const tool = tools.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool "${name}" not found`)
  return tool
}

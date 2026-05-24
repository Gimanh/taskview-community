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
import { registerTimeTrackingTools } from './tools/time-tracking.js'

const INSTRUCTIONS = `TaskView is a project and task management platform.

TERMINOLOGY — IMPORTANT: a "goal" is a PROJECT. The two words are interchangeable. Every tool, parameter, and ID that mentions a "goal" (e.g. goalId, list_goals, create_goal) refers to a project — "goal" is TaskView's internal name for a project. When the user talks about "projects", use the *_goal tools.

DATA MODEL (top to bottom):
- Organization — a workspace that groups projects and members.
- Project (goal) — a project, identified by goalId. Managed with list_goals / create_goal / update_goal / delete_goal.
- List (component) — a section/list inside a project, identified by componentId. Pass it to list_tasks to scope tasks to one list; omit it to see all tasks in the project.
- Task — a unit of work inside a project (and optionally inside a list). Supports subtasks, assignees, tags, priority (1=low, 2=medium, 3=high), deadlines, and dependencies.

WORKFLOW: all IDs are numeric and must be resolved first — never guess them. Map a name to its id with the matching list_* tool (project → list_goals, list → list_lists, members → list_collaborators_for_goal, kanban columns → list_kanban_columns, tags → list_tags), then pass that id to the create/update/delete tools.

list_tasks is paginated: page is 0-based, ~30 tasks per page — request the next page until one returns fewer than 30. Completed tasks are hidden unless showCompleted is set. Use sortBy ("date" or "priority") with descending to control ordering.`

export function createMcpServer(api: TvApi) {
  const server = new McpServer(
    {
      name: 'taskview',
      version: '1.0.0',
    },
    { instructions: INSTRUCTIONS },
  )

  registerGoalsTools(server, api)
  registerListsTools(server, api)
  registerTasksTools(server, api)
  registerTagsTools(server, api)
  registerKanbanTools(server, api)
  registerCollaborationTools(server, api)
  registerGraphTools(server, api)
  registerNotificationsTools(server, api)
  registerOrganizationsTools(server, api)
  registerTimeTrackingTools(server, api)

  return server
}

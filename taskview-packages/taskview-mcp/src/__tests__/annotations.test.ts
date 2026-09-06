import { describe, it, expect } from 'vitest'
import { registerGoalsTools } from '../tools/goals.js'
import { registerTasksTools } from '../tools/tasks.js'
import { registerListsTools } from '../tools/lists.js'
import { registerTagsTools } from '../tools/tags.js'
import { registerKanbanTools } from '../tools/kanban.js'
import { registerCollaborationTools } from '../tools/collaboration.js'
import { registerGraphTools } from '../tools/graph.js'
import { registerNotificationsTools } from '../tools/notifications.js'
import { registerStartTools } from '../tools/start.js'
import { registerOrganizationsTools } from '../tools/organizations.js'
import { registerTimeTrackingTools } from '../tools/time-tracking.js'
import { mockServer, mockApi, findTool } from './setup.js'

const REQUIRED_HINTS = ['readOnlyHint', 'destructiveHint', 'openWorldHint'] as const

function registerEverything() {
  const { server, tools } = mockServer()
  const api = mockApi()
  registerGoalsTools(server, api)
  registerTasksTools(server, api)
  registerListsTools(server, api)
  registerTagsTools(server, api)
  registerKanbanTools(server, api)
  registerCollaborationTools(server, api)
  registerGraphTools(server, api)
  registerNotificationsTools(server, api)
  registerStartTools(server, api)
  registerOrganizationsTools(server, api)
  registerTimeTrackingTools(server, api)
  return tools
}

describe('tool annotations', () => {
  const tools = registerEverything()

  it('gives every tool a human-readable title', () => {
    // The Claude Connectors Directory flags any tool without a title and
    // will not accept the submission until every one has it.
    for (const tool of tools) {
      expect(typeof tool.config.title, tool.name).toBe('string')
      expect(tool.config.title?.trim().length, tool.name).toBeGreaterThan(0)
    }
  })

  it('keeps every tool name within the 64-character directory limit', () => {
    for (const tool of tools) {
      expect(tool.name.length, tool.name).toBeLessThanOrEqual(64)
    }
  })

  it('sets every safety hint explicitly on every tool', () => {
    // ChatGPT refuses to list an app whose tools leave any hint unset, and the
    // protocol defaults differ between clients — so nothing may rely on them.
    for (const tool of tools) {
      for (const hint of REQUIRED_HINTS) {
        expect(typeof tool.config.annotations?.[hint], `${tool.name}.${hint}`).toBe('boolean')
      }
    }
  })

  it('marks every list and get tool as read-only', () => {
    const readers = tools.filter((t) => /^(list|get)_/.test(t.name))
    expect(readers.length).toBeGreaterThan(0)
    for (const tool of readers) {
      expect(tool.config.annotations?.readOnlyHint, tool.name).toBe(true)
      expect(tool.config.annotations?.destructiveHint, tool.name).toBe(false)
    }
  })

  it('never marks a writing tool as read-only', () => {
    const writers = tools.filter((t) => !/^(list|get)_/.test(t.name))
    for (const tool of writers) {
      expect(tool.config.annotations?.readOnlyHint, tool.name).toBe(false)
    }
  })

  it('marks deletion and removal as destructive', () => {
    const removers = tools.filter((t) => /^(delete|remove)_/.test(t.name))
    expect(removers.length).toBeGreaterThan(0)
    for (const tool of removers) {
      expect(tool.config.annotations?.destructiveHint, tool.name).toBe(true)
    }
  })

  it('marks restoring a task from history as destructive, since it overwrites the current state', () => {
    expect(findTool(tools, 'restore_task_from_history').config.annotations?.destructiveHint).toBe(true)
  })

  it('keeps every tool inside the user\'s own instance except the invitation email', () => {
    for (const tool of tools) {
      const expected = tool.name === 'invite_collaborator'
      expect(tool.config.annotations?.openWorldHint, tool.name).toBe(expected)
    }
  })
})

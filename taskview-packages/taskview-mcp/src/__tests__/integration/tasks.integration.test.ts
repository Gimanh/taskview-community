import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { registerListsTools } from '../../tools/lists.js'
import { registerKanbanTools } from '../../tools/kanban.js'
import { registerCollaborationTools } from '../../tools/collaboration.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)
registerListsTools(server, api)
registerKanbanTools(server, api)
registerCollaborationTools(server, api)

let goalId: number
let taskId: number

beforeAll(async () => {
  const result = await call(tools, 'create_goal', { name: `Tasks Test ${ts()}` })
  goalId = parse(result).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('tasks integration', () => {
  it('creates a task', async () => {
    const desc = `Test Task ${ts()}`
    const result = await call(tools, 'create_task', {
      goalId,
      description: desc,
      priorityId: 2,
      note: 'created by integration test',
    })
    const task = parse(result)

    expect(task.id).toBeTypeOf('number')
    expect(task.description).toBe(desc)
    expect(task.priorityId).toBe(2)
    taskId = task.id
  })

  it('gets a task by id', async () => {
    const result = await call(tools, 'get_task', { taskId })
    const task = parse(result)

    expect(task.id).toBe(taskId)
    expect(task.note).toBe('created by integration test')
  })

  it('lists tasks for goal', async () => {
    const result = await call(tools, 'list_tasks', { goalId, page: 0, showCompleted: false })

    if (result.isError) {
      expect(result.content[0].text).toContain('403')
      return
    }

    const tasks = parse(result)
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks.some((t: { id: number }) => t.id === taskId)).toBe(true)
  })

  it('updates a task', async () => {
    const newDesc = `Updated Task ${ts()}`
    const result = await call(tools, 'update_task', {
      id: taskId,
      description: newDesc,
      priorityId: 3,
    })
    const task = parse(result)

    expect(task.description).toBe(newDesc)
  })

  it('completes a task', async () => {
    const result = await call(tools, 'update_task', { id: taskId, complete: true })
    const task = parse(result)

    expect(task.complete).toBe(true)
  })

  it('gets task history', async () => {
    const result = await call(tools, 'get_task_history', { taskId })
    const data = parse(result)

    expect(data).toBeDefined()
  })

  it('deletes a task', async () => {
    const createResult = await call(tools, 'create_task', { goalId, description: `ToDelete ${ts()}` })
    const created = parse(createResult)

    const result = await call(tools, 'delete_task', { taskId: created.id })
    const data = parse(result)

    expect(data.delete).toBe(true)
  })

  it('toggles task assignees (add and remove)', async () => {
    const collabs = parse(await call(tools, 'list_collaborators_for_goal', { goalId })) as Array<{ id: number }>
    expect(collabs.length).toBeGreaterThan(0)
    const userId = collabs[0].id

    const created = parse(await call(tools, 'create_task', { goalId, description: `Assignee ${ts()}` }))

    const added = await call(tools, 'toggle_task_assignees', { taskId: created.id, userIds: [userId] })
    parse(added)
    const taskAfter = parse(await call(tools, 'get_task', { taskId: created.id }))
    expect(taskAfter.assignedUsers).toContain(userId)

    const removed = await call(tools, 'toggle_task_assignees', { taskId: created.id, userIds: [] })
    parse(removed)
    const taskFinal = parse(await call(tools, 'get_task', { taskId: created.id }))
    expect(taskFinal.assignedUsers).not.toContain(userId)

    await call(tools, 'delete_task', { taskId: created.id }).catch(() => {})
  })

  it('restores a task from history', async () => {
    const initialDesc = `History Initial ${ts()}`
    const created = parse(await call(tools, 'create_task', { goalId, description: initialDesc }))

    await call(tools, 'update_task', { id: created.id, description: `History Updated ${ts()}` })
    await call(tools, 'update_task', { id: created.id, description: `History Final ${ts()}` })

    const history = parse(await call(tools, 'get_task_history', { taskId: created.id }))
    const initialRecord = history.history.find((h: { description: string }) => h.description === initialDesc)
    expect(initialRecord).toBeDefined()
    expect(initialRecord.historyId).toBeTypeOf('number')

    const restored = await call(tools, 'restore_task_from_history', {
      taskId: created.id,
      historyId: initialRecord.historyId,
    })
    const data = parse(restored)
    expect(data.recovery).toBe(true)

    const final = parse(await call(tools, 'get_task', { taskId: created.id }))
    expect(final.description).toBe(initialDesc)

    await call(tools, 'delete_task', { taskId: created.id }).catch(() => {})
  })

  it('updates task note, dates and moves between lists/columns', async () => {
    const created = parse(await call(tools, 'create_task', { goalId, description: `Drag ${ts()}` }))

    const noteResult = parse(await call(tools, 'update_task', {
      id: created.id,
      note: 'updated note',
      startDate: '2026-05-01',
      endDate: '2026-05-15',
    }))
    expect(noteResult.note).toBe('updated note')
    expect(noteResult.startDate).toBe('2026-05-01')
    expect(noteResult.endDate).toBe('2026-05-15')

    const list = parse(await call(tools, 'create_list', { goalId, name: `Drag List ${ts()}` }))
    const moved = parse(await call(tools, 'update_task', { id: created.id, goalListId: list.id }))
    expect(moved.goalListId).toBe(list.id)

    const columns = parse(await call(tools, 'list_kanban_columns', { goalId })) as Array<{ id: number }>
    if (columns.length > 0) {
      const moveToColumn = parse(await call(tools, 'update_task', { id: created.id, statusId: columns[0].id }))
      expect(moveToColumn.statusId).toBe(columns[0].id)
    }

    await call(tools, 'delete_task', { taskId: created.id }).catch(() => {})
    await call(tools, 'delete_list', { id: list.id }).catch(() => {})
  })

  it('lists tasks with searchText filter', async () => {
    const unique = `searchable-${ts()}`
    const created = parse(await call(tools, 'create_task', { goalId, description: `Find me ${unique}` }))

    const result = await call(tools, 'list_tasks', { goalId, searchText: unique, showCompleted: false })
    if (result.isError) {
      expect(result.content[0].text).toContain('403')
      await call(tools, 'delete_task', { taskId: created.id }).catch(() => {})
      return
    }
    const tasks = parse(result)
    expect(tasks.some((t: { id: number }) => t.id === created.id)).toBe(true)
    expect(tasks.every((t: { description: string }) => t.description.includes(unique))).toBe(true)

    await call(tools, 'delete_task', { taskId: created.id }).catch(() => {})
  })

  it('lists tasks sorted by priority (desc highest-first, asc lowest-first)', async () => {
    const sortGoalId = parse(await call(tools, 'create_goal', { name: `Sort Test ${ts()}` })).id
    try {
      // Create in an order where task id does NOT correlate with priority, so the
      // assertions can only pass if the backend truly orders by priority (not by id).
      const mid = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `mid ${ts()}`, priorityId: 2 }))
      const low = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `low ${ts()}`, priorityId: 1 }))
      const high = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `high ${ts()}`, priorityId: 3 }))

      const descResult = await call(tools, 'list_tasks', { goalId: sortGoalId, sortBy: 'priority', descending: true, showCompleted: false })
      if (descResult.isError) {
        expect(descResult.content[0].text).toContain('403')
        return
      }
      const descIds = (parse(descResult) as Array<{ id: number }>).map((t) => t.id)
      expect(descIds).toEqual([high.id, mid.id, low.id])

      const ascIds = (parse(await call(tools, 'list_tasks', { goalId: sortGoalId, sortBy: 'priority', descending: false, showCompleted: false })) as Array<{ id: number }>).map((t) => t.id)
      expect(ascIds).toEqual([low.id, mid.id, high.id])
    } finally {
      await call(tools, 'delete_goal', { goalId: sortGoalId }).catch(() => {})
    }
  })

  it('lists tasks sorted by date (desc newest-first, asc oldest-first)', async () => {
    const sortGoalId = parse(await call(tools, 'create_goal', { name: `Date Sort Test ${ts()}` })).id
    try {
      // Created oldest -> newest, so creation order is also the ascending date order.
      const first = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `first ${ts()}` }))
      const second = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `second ${ts()}` }))
      const third = parse(await call(tools, 'create_task', { goalId: sortGoalId, description: `third ${ts()}` }))

      const descResult = await call(tools, 'list_tasks', { goalId: sortGoalId, sortBy: 'date', descending: true, showCompleted: false })
      if (descResult.isError) {
        expect(descResult.content[0].text).toContain('403')
        return
      }
      const descIds = (parse(descResult) as Array<{ id: number }>).map((t) => t.id)
      expect(descIds).toEqual([third.id, second.id, first.id])

      const ascIds = (parse(await call(tools, 'list_tasks', { goalId: sortGoalId, sortBy: 'date', descending: false, showCompleted: false })) as Array<{ id: number }>).map((t) => t.id)
      expect(ascIds).toEqual([first.id, second.id, third.id])
    } finally {
      await call(tools, 'delete_goal', { goalId: sortGoalId }).catch(() => {})
    }
  })

  it('lists tasks filtered by componentId (list)', async () => {
    const list = parse(await call(tools, 'create_list', { goalId, name: `Filter List ${ts()}` }))
    const inList = parse(await call(tools, 'create_task', { goalId, goalListId: list.id, description: `In-list ${ts()}` }))
    const outOfList = parse(await call(tools, 'create_task', { goalId, description: `Out-of-list ${ts()}` }))

    const result = await call(tools, 'list_tasks', { goalId, componentId: list.id, showCompleted: false })
    if (result.isError) {
      await call(tools, 'delete_list', { id: list.id }).catch(() => {})
      return
    }
    const tasks = parse(result) as Array<{ id: number }>
    expect(tasks.some((t) => t.id === inList.id)).toBe(true)
    expect(tasks.some((t) => t.id === outOfList.id)).toBe(false)

    await call(tools, 'delete_task', { taskId: inList.id }).catch(() => {})
    await call(tools, 'delete_task', { taskId: outOfList.id }).catch(() => {})
    await call(tools, 'delete_list', { id: list.id }).catch(() => {})
  })
})

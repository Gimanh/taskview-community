import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)

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
    const result = await call(tools, 'list_tasks', { goalId, page: 1, showCompleted: true })

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
})

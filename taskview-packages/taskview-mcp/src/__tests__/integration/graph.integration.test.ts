import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { registerGraphTools } from '../../tools/graph.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)
registerGraphTools(server, api)

let goalId: number
let taskA: number
let taskB: number
let edgeId: number

beforeAll(async () => {
  const goalResult = await call(tools, 'create_goal', { name: `Graph Test ${ts()}` })
  goalId = parse(goalResult).id

  const a = await call(tools, 'create_task', { goalId, description: `Task A ${ts()}` })
  taskA = parse(a).id

  const b = await call(tools, 'create_task', { goalId, description: `Task B ${ts()}` })
  taskB = parse(b).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('graph integration', () => {
  it('adds a dependency', async () => {
    const result = await call(tools, 'add_task_dependency', { source: taskA, target: taskB })
    const edge = parse(result)

    expect(edge.id).toBeTypeOf('number')
    expect(edge.fromTaskId).toBe(taskA)
    expect(edge.toTaskId).toBe(taskB)
    edgeId = edge.id
  })

  it('lists dependencies', async () => {
    const result = await call(tools, 'list_task_dependencies', { goalId })
    const edges = parse(result)

    expect(Array.isArray(edges)).toBe(true)
    expect(edges.some((e: { id: number }) => e.id === edgeId)).toBe(true)
  })

  it('deletes a dependency', async () => {
    const result = await call(tools, 'delete_task_dependency', { id: edgeId })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})

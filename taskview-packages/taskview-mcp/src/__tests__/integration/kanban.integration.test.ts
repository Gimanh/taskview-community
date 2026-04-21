import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerKanbanTools } from '../../tools/kanban.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerKanbanTools(server, api)

let goalId: number
let columnId: number

beforeAll(async () => {
  const result = await call(tools, 'create_goal', { name: `Kanban Test ${ts()}` })
  goalId = parse(result).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('kanban integration', () => {
  it('lists default columns', async () => {
    const result = await call(tools, 'list_kanban_columns', { goalId })
    const columns = parse(result)

    expect(Array.isArray(columns)).toBe(true)
    expect(columns.length).toBeGreaterThan(0)
  })

  it('creates a column', async () => {
    const name = `Custom Column ${ts()}`
    const result = await call(tools, 'create_kanban_column', { goalId, name })
    const column = parse(result)

    expect(column.id).toBeTypeOf('number')
    expect(column.name).toBe(name)
    columnId = column.id
  })

  it('updates a column', async () => {
    const newName = `Renamed ${ts()}`
    const result = await call(tools, 'update_kanban_column', { id: columnId, name: newName })
    const data = parse(result)

    expect(data.updated).toBe(true)
  })

  it('deletes a column', async () => {
    const result = await call(tools, 'delete_kanban_column', { id: columnId })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})

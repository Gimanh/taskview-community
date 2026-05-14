import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerListsTools } from '../../tools/lists.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerListsTools(server, api)

let goalId: number
let listId: number

beforeAll(async () => {
  const result = await call(tools, 'create_goal', { name: `Lists Test ${ts()}` })
  goalId = parse(result).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('lists integration', () => {
  it('creates a list', async () => {
    const name = `Test List ${ts()}`
    const result = await call(tools, 'create_list', { goalId, name, description: 'integration test' })
    const list = parse(result)

    expect(list.id).toBeTypeOf('number')
    expect(list.name).toBe(name)
    listId = list.id
  })

  it('lists all lists for goal', async () => {
    const result = await call(tools, 'list_lists', { goalId })
    const lists = parse(result)

    expect(Array.isArray(lists)).toBe(true)
    expect(lists.some((l: { id: number }) => l.id === listId)).toBe(true)
  })

  it('updates a list', async () => {
    const newName = `Updated List ${ts()}`
    const result = await call(tools, 'update_list', { id: listId, name: newName })
    const list = parse(result)

    expect(list.name).toBe(newName)
  })

  it('updates list description', async () => {
    const newDesc = `New description ${ts()}`
    const result = await call(tools, 'update_list', { id: listId, description: newDesc })
    const list = parse(result)
    expect(list.description).toBe(newDesc)
  })

  it('archives and unarchives a list', async () => {
    const created = parse(await call(tools, 'create_list', { goalId, name: `Archive List ${ts()}` }))

    const archived = parse(await call(tools, 'update_list', { id: created.id, archive: 1 }))
    expect(archived.archive).toBe(1)

    const unarchived = parse(await call(tools, 'update_list', { id: created.id, archive: 0 }))
    expect(unarchived.archive).toBe(0)

    await call(tools, 'delete_list', { id: created.id }).catch(() => {})
  })

  it('deletes a list', async () => {
    const createResult = await call(tools, 'create_list', { goalId, name: `ToDelete ${ts()}` })
    const created = parse(createResult)

    const result = await call(tools, 'delete_list', { id: created.id })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})

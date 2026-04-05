import { describe, it, expect } from 'vitest'
import { registerKanbanTools } from '../tools/kanban.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('kanban tools', () => {
  it('registers all kanban tools', () => {
    const { server, tools } = mockServer()
    registerKanbanTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual([
      'list_kanban_columns', 'create_kanban_column', 'update_kanban_column', 'delete_kanban_column',
    ])
  })

  it('list_kanban_columns returns columns', async () => {
    const { server, tools } = mockServer()
    const columns = [{ id: 1, name: `TODO ${ts()}`, viewOrder: 1 }]
    registerKanbanTools(server, mockApi({ kanban: { fetchAllColumns: apiReturn(columns) } }))

    const result = await findTool(tools, 'list_kanban_columns').cb({ goalId: 1 })
    expect(result.content[0].text).toContain(columns[0].name)
  })

  it('create_kanban_column returns new column', async () => {
    const { server, tools } = mockServer()
    const name = `Column ${ts()}`
    registerKanbanTools(server, mockApi({ kanban: { addColumn: apiReturn({ id: 5, name }) } }))

    const result = await findTool(tools, 'create_kanban_column').cb({ goalId: 1, name })
    expect(result.content[0].text).toContain(name)
  })

  it('update_kanban_column returns result', async () => {
    const { server, tools } = mockServer()
    registerKanbanTools(server, mockApi({ kanban: { updateColumn: apiReturn(true) } }))

    const result = await findTool(tools, 'update_kanban_column').cb({ id: 1, name: `Upd ${ts()}` })
    expect(result.content[0].text).toContain('true')
  })

  it('delete_kanban_column returns result', async () => {
    const { server, tools } = mockServer()
    registerKanbanTools(server, mockApi({ kanban: { deleteColumn: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_kanban_column').cb({ id: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerKanbanTools(server, mockApi({ kanban: { fetchAllColumns: apiThrow(`Forbidden ${ts()}`) } }))

    const result = await findTool(tools, 'list_kanban_columns').cb({ goalId: 1 })
    expect(result.isError).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { registerListsTools } from '../tools/lists.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('lists tools', () => {
  it('registers all list tools', () => {
    const { server, tools } = mockServer()
    registerListsTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['list_lists', 'create_list', 'update_list', 'delete_list'])
  })

  it('list_lists returns lists for goal', async () => {
    const { server, tools } = mockServer()
    const lists = [{ id: 1, name: `Backlog ${ts()}` }, { id: 2, name: `Sprint ${ts()}` }]
    registerListsTools(server, mockApi({ goalLists: { fetchLists: apiReturn(lists) } }))

    const result = await findTool(tools, 'list_lists').cb({ goalId: 5 })
    expect(result.content[0].text).toContain(lists[0].name)
    expect(result.content[0].text).toContain(lists[1].name)
  })

  it('create_list returns new list', async () => {
    const { server, tools } = mockServer()
    const name = `List ${ts()}`
    registerListsTools(server, mockApi({ goalLists: { createList: apiReturn({ id: 10, name }) } }))

    const result = await findTool(tools, 'create_list').cb({ goalId: 1, name })
    expect(result.content[0].text).toContain(name)
  })

  it('update_list returns updated list', async () => {
    const { server, tools } = mockServer()
    const name = `Renamed ${ts()}`
    registerListsTools(server, mockApi({ goalLists: { updateList: apiReturn({ id: 1, name }) } }))

    const result = await findTool(tools, 'update_list').cb({ id: 1, name })
    expect(result.content[0].text).toContain(name)
  })

  it('delete_list returns success', async () => {
    const { server, tools } = mockServer()
    registerListsTools(server, mockApi({ goalLists: { deleteList: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_list').cb({ id: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerListsTools(server, mockApi({ goalLists: { fetchLists: apiThrow(`DB error ${ts()}`) } }))

    const result = await findTool(tools, 'list_lists').cb({ goalId: 1 })
    expect(result.isError).toBe(true)
  })
})

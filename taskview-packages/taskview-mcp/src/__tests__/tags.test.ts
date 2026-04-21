import { describe, it, expect } from 'vitest'
import { registerTagsTools } from '../tools/tags.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('tags tools', () => {
  it('registers all tag tools', () => {
    const { server, tools } = mockServer()
    registerTagsTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['list_tags', 'create_tag', 'update_tag', 'delete_tag', 'toggle_task_tag'])
  })

  it('list_tags returns tags', async () => {
    const { server, tools } = mockServer()
    const tags = [{ id: 1, name: `bug-${ts()}`, color: '#EF4444' }]
    registerTagsTools(server, mockApi({ tags: { fetchAllTagsForUser: apiReturn(tags) } }))

    const result = await findTool(tools, 'list_tags').cb({})
    expect(result.content[0].text).toContain(tags[0].name)
  })

  it('create_tag returns new tag', async () => {
    const { server, tools } = mockServer()
    const name = `tag-${ts()}`
    registerTagsTools(server, mockApi({ tags: { createTag: apiReturn({ id: 5, name }) } }))

    const result = await findTool(tools, 'create_tag').cb({ goalId: 1, name, color: '#10B981' })
    expect(result.content[0].text).toContain(name)
  })

  it('update_tag returns updated tag', async () => {
    const { server, tools } = mockServer()
    const name = `updated-${ts()}`
    registerTagsTools(server, mockApi({ tags: { updateTag: apiReturn({ id: 1, name }) } }))

    const result = await findTool(tools, 'update_tag').cb({ id: 1, name, color: '#000', goalId: 1 })
    expect(result.content[0].text).toContain(name)
  })

  it('delete_tag returns success', async () => {
    const { server, tools } = mockServer()
    registerTagsTools(server, mockApi({ tags: { deleteTag: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_tag').cb({ tagId: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('toggle_task_tag returns action', async () => {
    const { server, tools } = mockServer()
    registerTagsTools(server, mockApi({ tags: { toggleTag: apiReturn({ action: 'add' }) } }))

    const result = await findTool(tools, 'toggle_task_tag').cb({ tagId: 1, taskId: 10 })
    expect(result.content[0].text).toContain('add')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerTagsTools(server, mockApi({ tags: { createTag: apiThrow(`Conflict ${ts()}`) } }))

    const result = await findTool(tools, 'create_tag').cb({ goalId: 1, name: 'x', color: '#000' })
    expect(result.isError).toBe(true)
  })
})

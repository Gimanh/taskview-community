import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { registerTagsTools } from '../../tools/tags.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)
registerTagsTools(server, api)

let goalId: number
let taskId: number
let tagId: number

beforeAll(async () => {
  const goalResult = await call(tools, 'create_goal', { name: `Tags Test ${ts()}` })
  goalId = parse(goalResult).id

  const taskResult = await call(tools, 'create_task', { goalId, description: `Tag target ${ts()}` })
  taskId = parse(taskResult).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('tags integration', () => {
  it('creates a tag', async () => {
    const name = `tag-${ts()}`
    const result = await call(tools, 'create_tag', { goalId, name, color: '#EF4444' })
    const tag = parse(result)

    expect(tag.id).toBeTypeOf('number')
    expect(tag.name).toBe(name)
    tagId = tag.id
  })

  it('lists tags', async () => {
    const result = await call(tools, 'list_tags')
    const tags = parse(result)

    expect(Array.isArray(tags)).toBe(true)
    expect(tags.some((t: { id: number }) => t.id === tagId)).toBe(true)
  })

  it('updates a tag', async () => {
    const newName = `updated-${ts()}`
    const result = await call(tools, 'update_tag', { id: tagId, name: newName, color: '#3B82F6', goalId })
    const tag = parse(result)

    expect(tag.name).toBe(newName)
  })

  it('toggles tag on task (add)', async () => {
    const result = await call(tools, 'toggle_task_tag', { tagId, taskId })
    const data = parse(result)

    expect(data.action).toBe('add')
  })

  it('toggles tag on task (remove)', async () => {
    const result = await call(tools, 'toggle_task_tag', { tagId, taskId })
    const data = parse(result)

    expect(data.action).toBe('delete')
  })

  it('deletes a tag', async () => {
    const createResult = await call(tools, 'create_tag', { goalId, name: `del-${ts()}`, color: '#000' })
    const created = parse(createResult)

    const result = await call(tools, 'delete_tag', { tagId: created.id })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})

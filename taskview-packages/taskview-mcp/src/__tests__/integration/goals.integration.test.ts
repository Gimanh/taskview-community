import { describe, it, expect, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)

const createdGoalIds: number[] = []

afterAll(async () => {
  for (const id of createdGoalIds) {
    await call(tools, 'delete_goal', { goalId: id }).catch(() => {})
  }
})

describe('goals integration', () => {
  it('creates a goal', async () => {
    const name = `Test Goal ${ts()}`
    const result = await call(tools, 'create_goal', { name, description: 'integration test', color: '#10B981' })
    const goal = parse(result)

    expect(goal.id).toBeTypeOf('number')
    expect(goal.name).toBe(name)
    createdGoalIds.push(goal.id)
  })

  it('lists goals including the created one', async () => {
    const result = await call(tools, 'list_goals')
    const goals = parse(result)

    expect(Array.isArray(goals)).toBe(true)
    expect(goals.some((g: { id: number }) => g.id === createdGoalIds[0])).toBe(true)
  })

  it('updates a goal', async () => {
    const newName = `Updated Goal ${ts()}`
    const result = await call(tools, 'update_goal', { id: createdGoalIds[0], name: newName })
    const goal = parse(result)

    expect(goal.name).toBe(newName)
  })

  it('deletes a goal', async () => {
    const extraName = `ToDelete ${ts()}`
    const createResult = await call(tools, 'create_goal', { name: extraName })
    const created = parse(createResult)

    const result = await call(tools, 'delete_goal', { goalId: created.id })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})

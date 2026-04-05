import { describe, it, expect } from 'vitest'
import { registerGoalsTools } from '../tools/goals.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('goals tools', () => {
  it('registers all goal tools', () => {
    const { server, tools } = mockServer()
    registerGoalsTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['list_goals', 'create_goal', 'update_goal', 'delete_goal'])
  })

  it('list_goals returns goals', async () => {
    const { server, tools } = mockServer()
    const mockGoals = [
      { id: 1, name: `Project ${ts()}`, color: '#10B981' },
      { id: 2, name: `Project ${ts()}`, color: '#EF4444' },
    ]
    registerGoalsTools(server, mockApi({ goals: { fetchGoals: apiReturn(mockGoals) } }))

    const result = await findTool(tools, 'list_goals').cb({})
    expect(result.content[0].text).toContain(mockGoals[0].name)
    expect(result.content[0].text).toContain(mockGoals[1].name)
  })

  it('create_goal returns created goal', async () => {
    const { server, tools } = mockServer()
    const name = `New Goal ${ts()}`
    registerGoalsTools(server, mockApi({ goals: { createGoal: apiReturn({ id: 10, name }) } }))

    const result = await findTool(tools, 'create_goal').cb({ name })
    expect(result.content[0].text).toContain(name)
  })

  it('create_goal handles null response', async () => {
    const { server, tools } = mockServer()
    registerGoalsTools(server, mockApi({ goals: { createGoal: apiReturn(null) } }))

    const result = await findTool(tools, 'create_goal').cb({ name: `Fail ${ts()}` })
    expect(result.isError).toBe(true)
  })

  it('update_goal returns updated goal', async () => {
    const { server, tools } = mockServer()
    const name = `Updated ${ts()}`
    registerGoalsTools(server, mockApi({ goals: { updateGoal: apiReturn({ id: 1, name }) } }))

    const result = await findTool(tools, 'update_goal').cb({ id: 1, name })
    expect(result.content[0].text).toContain(name)
  })

  it('update_goal handles not found', async () => {
    const { server, tools } = mockServer()
    registerGoalsTools(server, mockApi({ goals: { updateGoal: apiReturn(null) } }))

    const result = await findTool(tools, 'update_goal').cb({ id: 999 })
    expect(result.isError).toBe(true)
  })

  it('delete_goal returns success', async () => {
    const { server, tools } = mockServer()
    registerGoalsTools(server, mockApi({ goals: { deleteGoal: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_goal').cb({ goalId: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors gracefully', async () => {
    const { server, tools } = mockServer()
    registerGoalsTools(server, mockApi({ goals: { fetchGoals: apiThrow(`Network error ${ts()}`) } }))

    const result = await findTool(tools, 'list_goals').cb({})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Network error')
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerCollaborationTools } from '../../tools/collaboration.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerCollaborationTools(server, api)

let goalId: number

beforeAll(async () => {
  const result = await call(tools, 'create_goal', { name: `Collab Test ${ts()}` })
  goalId = parse(result).id
})

afterAll(async () => {
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('collaboration integration', () => {
  it('lists all collaborators', async () => {
    const result = await call(tools, 'list_collaborators')
    const users = parse(result)

    expect(Array.isArray(users)).toBe(true)
  })

  it('lists collaborators for goal', async () => {
    const result = await call(tools, 'list_collaborators_for_goal', { goalId })
    const users = parse(result)

    expect(Array.isArray(users)).toBe(true)
  })

  it('lists roles for goal', async () => {
    const result = await call(tools, 'list_roles', { goalId })
    const roles = parse(result)

    expect(Array.isArray(roles)).toBe(true)
    expect(roles.length).toBeGreaterThan(0)
  })

  it('creates a role', async () => {
    const name = `test-role-${ts()}`
    const result = await call(tools, 'create_role', { goalId, roleName: name })
    const role = parse(result)

    expect(role.id).toBeTypeOf('number')
    expect(role.name).toBe(name)
  })

  it('lists permissions', async () => {
    const result = await call(tools, 'list_permissions')
    const perms = parse(result)

    expect(Array.isArray(perms)).toBe(true)
    expect(perms.length).toBeGreaterThan(0)
  })

  it('lists role permissions for goal', async () => {
    const result = await call(tools, 'list_role_permissions_for_goal', { goalId })
    const data = parse(result)

    expect(Array.isArray(data)).toBe(true)
  })

  it('invites a collaborator', async () => {
    const email = `test-${ts()}@integration-test.com`
    const result = await call(tools, 'invite_collaborator', { goalId, email })
    const user = parse(result)

    expect(user.email).toBe(email)
  })
})

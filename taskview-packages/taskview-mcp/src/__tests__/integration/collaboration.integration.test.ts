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

  it('removes a collaborator', async () => {
    const email = `remove-${ts()}@integration-test.com`
    const invited = parse(await call(tools, 'invite_collaborator', { goalId, email }))

    const result = await call(tools, 'remove_collaborator', { goalId, id: invited.id })
    const data = parse(result)
    expect(data.deleted).toBe(true)

    const users = parse(await call(tools, 'list_collaborators_for_goal', { goalId })) as Array<{ email: string }>
    expect(users.find((u) => u.email === email)).toBeUndefined()
  })

  it('toggles collaborator roles', async () => {
    const email = `roles-${ts()}@integration-test.com`
    const invited = parse(await call(tools, 'invite_collaborator', { goalId, email }))

    const roles = parse(await call(tools, 'list_roles', { goalId })) as Array<{ id: number; name: string }>
    const editor = roles.find((r) => r.name === 'editor')
    expect(editor).toBeDefined()

    const result = await call(tools, 'toggle_collaborator_roles', {
      goalId,
      userId: invited.id,
      roles: [editor!.id],
    })
    const data = parse(result)
    expect(Array.isArray(data.roles)).toBe(true)
    expect(data.roles).toContain(editor!.id)

    const users = parse(await call(tools, 'list_collaborators_for_goal', { goalId })) as Array<{ id: number; roles: number[] }>
    const user = users.find((u) => u.id === invited.id)
    expect(user?.roles).toContain(editor!.id)
  })

  it('deletes a role', async () => {
    const created = parse(await call(tools, 'create_role', { goalId, roleName: `delete-me-${ts()}` }))

    const result = await call(tools, 'delete_role', { goalId, id: created.id })
    const data = parse(result)
    expect(data.deleted).toBe(true)

    const roles = parse(await call(tools, 'list_roles', { goalId })) as Array<{ id: number }>
    expect(roles.find((r) => r.id === created.id)).toBeUndefined()
  })

  it('toggles role permission (add and remove)', async () => {
    const role = parse(await call(tools, 'create_role', { goalId, roleName: `perm-role-${ts()}` }))
    const permissions = parse(await call(tools, 'list_permissions')) as Array<{ id: number; name: string }>
    const targetPerm = permissions.find((p) => p.name === 'goal_can_watch_content')
    expect(targetPerm).toBeDefined()

    const addResult = parse(await call(tools, 'toggle_role_permission', {
      roleId: role.id,
      permissionId: targetPerm!.id,
    }))
    expect(addResult.add).toBe(true)

    const removeResult = parse(await call(tools, 'toggle_role_permission', {
      roleId: role.id,
      permissionId: targetPerm!.id,
    }))
    expect(removeResult.add).toBe(false)

    await call(tools, 'delete_role', { goalId, id: role.id }).catch(() => {})
  })
})

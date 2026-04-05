import { describe, it, expect } from 'vitest'
import { registerCollaborationTools } from '../tools/collaboration.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('collaboration tools', () => {
  it('registers all collaboration tools', () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual([
      'list_collaborators', 'list_collaborators_for_goal', 'invite_collaborator',
      'remove_collaborator', 'toggle_collaborator_roles', 'list_roles', 'create_role',
      'delete_role', 'list_role_permissions_for_goal', 'list_permissions', 'toggle_role_permission',
    ])
  })

  it('list_collaborators returns users', async () => {
    const { server, tools } = mockServer()
    const users = [{ id: 1, email: `user-${ts()}@test.com` }]
    registerCollaborationTools(server, mockApi({ collaboration: { fetchAllUsers: apiReturn(users) } }))

    const result = await findTool(tools, 'list_collaborators').cb({})
    expect(result.content[0].text).toContain(users[0].email)
  })

  it('list_collaborators_for_goal returns project users', async () => {
    const { server, tools } = mockServer()
    const users = [{ id: 1, email: `member-${ts()}@test.com` }]
    registerCollaborationTools(server, mockApi({ collaboration: { fetchUsersForGoal: apiReturn(users) } }))

    const result = await findTool(tools, 'list_collaborators_for_goal').cb({ goalId: 1 })
    expect(result.content[0].text).toContain(users[0].email)
  })

  it('invite_collaborator returns invited user', async () => {
    const { server, tools } = mockServer()
    const email = `invited-${ts()}@test.com`
    registerCollaborationTools(server, mockApi({ collaboration: { inviteUserToGoal: apiReturn({ id: 5, email }) } }))

    const result = await findTool(tools, 'invite_collaborator').cb({ goalId: 1, email })
    expect(result.content[0].text).toContain(email)
  })

  it('invite_collaborator handles null', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { inviteUserToGoal: apiReturn(null) } }))

    const result = await findTool(tools, 'invite_collaborator').cb({ goalId: 1, email: 'x@x.com' })
    expect(result.isError).toBe(true)
  })

  it('remove_collaborator returns result', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { deleteUserFromGoal: apiReturn(true) } }))

    const result = await findTool(tools, 'remove_collaborator').cb({ goalId: 1, id: 5 })
    expect(result.content[0].text).toContain('true')
  })

  it('toggle_collaborator_roles returns roles', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { toggleUserRoles: apiReturn([1, 2]) } }))

    const result = await findTool(tools, 'toggle_collaborator_roles').cb({ userId: 1, goalId: 1, roles: [1, 2] })
    expect(result.content[0].text).toContain('roles')
  })

  it('list_roles returns roles', async () => {
    const { server, tools } = mockServer()
    const roles = [{ id: 1, name: `editor-${ts()}` }]
    registerCollaborationTools(server, mockApi({ collaboration: { fetchRolesForGoal: apiReturn(roles) } }))

    const result = await findTool(tools, 'list_roles').cb({ goalId: 1 })
    expect(result.content[0].text).toContain(roles[0].name)
  })

  it('create_role returns new role', async () => {
    const { server, tools } = mockServer()
    const name = `role-${ts()}`
    registerCollaborationTools(server, mockApi({ collaboration: { createRoleForGoal: apiReturn({ id: 10, name }) } }))

    const result = await findTool(tools, 'create_role').cb({ goalId: 1, roleName: name })
    expect(result.content[0].text).toContain(name)
  })

  it('create_role handles null', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { createRoleForGoal: apiReturn(null) } }))

    const result = await findTool(tools, 'create_role').cb({ goalId: 1, roleName: 'x' })
    expect(result.isError).toBe(true)
  })

  it('delete_role returns result', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { deleteRoleFromGoal: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_role').cb({ goalId: 1, id: 5 })
    expect(result.content[0].text).toContain('true')
  })

  it('list_role_permissions_for_goal returns permissions', async () => {
    const { server, tools } = mockServer()
    const perms = [{ roleId: 1, permissionId: 2 }]
    registerCollaborationTools(server, mockApi({ collaboration: { fetchRoleToPermissionsForGoal: apiReturn(perms) } }))

    const result = await findTool(tools, 'list_role_permissions_for_goal').cb({ goalId: 1 })
    expect(result.content[0].text).toContain('roleId')
  })

  it('list_permissions returns all permissions', async () => {
    const { server, tools } = mockServer()
    const perms = [{ id: 1, name: `perm-${ts()}` }]
    registerCollaborationTools(server, mockApi({ collaboration: { fetchAllPermissions: apiReturn(perms) } }))

    const result = await findTool(tools, 'list_permissions').cb({})
    expect(result.content[0].text).toContain(perms[0].name)
  })

  it('toggle_role_permission returns result', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { toggleRolePermission: apiReturn({ add: true }) } }))

    const result = await findTool(tools, 'toggle_role_permission').cb({ roleId: 1, permissionId: 2 })
    expect(result.content[0].text).toContain('add')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerCollaborationTools(server, mockApi({ collaboration: { fetchAllUsers: apiThrow(`Auth error ${ts()}`) } }))

    const result = await findTool(tools, 'list_collaborators').cb({})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Auth error')
  })
})

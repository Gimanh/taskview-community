import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerCollaborationTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_collaborators',
    {
      description: 'List all collaborators across all projects',
    },
    async () => {
      try {
        const users = await api.collaboration.fetchAllUsers()
        return ok(users)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_collaborators_for_goal',
    {
      description: 'List collaborators for a specific project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const users = await api.collaboration.fetchUsersForGoal(goalId)
        return ok(users)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'invite_collaborator',
    {
      description: 'Invite a user to a project by email',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        email: z.string().describe('User email to invite'),
      },
    },
    async (params) => {
      try {
        const user = await api.collaboration.inviteUserToGoal(params)
        if (!user) return err('Failed to invite user')
        return ok(user)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'remove_collaborator',
    {
      description: 'Remove a user from a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        id: z.coerce.number().describe('Collaboration record ID'),
      },
    },
    async (params) => {
      try {
        const result = await api.collaboration.deleteUserFromGoal(params)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'toggle_collaborator_roles',
    {
      description: 'Update roles for a collaborator in a project',
      inputSchema: {
        userId: z.coerce.number().describe('User ID'),
        goalId: z.coerce.number().describe('Project (goal) ID'),
        roles: z.array(z.coerce.number()).describe('Role IDs to set'),
      },
    },
    async (params) => {
      try {
        const roles = await api.collaboration.toggleUserRoles(params)
        return ok({ roles })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_roles',
    {
      description: 'List all roles for a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const roles = await api.collaboration.fetchRolesForGoal(goalId)
        return ok(roles)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_role',
    {
      description: 'Create a new role for a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        roleName: z.string().describe('Role name'),
      },
    },
    async (params) => {
      try {
        const role = await api.collaboration.createRoleForGoal(params)
        if (!role) return err('Failed to create role')
        return ok(role)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_role',
    {
      description: 'Delete a role from a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        id: z.coerce.number().describe('Role ID to delete'),
      },
    },
    async (params) => {
      try {
        const result = await api.collaboration.deleteRoleFromGoal(params)
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_role_permissions_for_goal',
    {
      description: 'Get role-to-permission mappings for a project',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
      },
    },
    async ({ goalId }) => {
      try {
        const permissions = await api.collaboration.fetchRoleToPermissionsForGoal(goalId)
        return ok(permissions)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_permissions',
    {
      description: 'List all available permissions',
    },
    async () => {
      try {
        const permissions = await api.collaboration.fetchAllPermissions()
        return ok(permissions)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'toggle_role_permission',
    {
      description: 'Add or remove a permission from a role',
      inputSchema: {
        roleId: z.coerce.number().describe('Role ID'),
        permissionId: z.coerce.number().describe('Permission ID'),
      },
    },
    async (params) => {
      try {
        const result = await api.collaboration.toggleRolePermission(params)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )
}

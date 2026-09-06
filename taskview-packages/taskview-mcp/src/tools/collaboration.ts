import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err, toolAnnotations } from './helpers.js'

export function registerCollaborationTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_collaborators',
    {
      title: 'List collaborators',
      annotations: toolAnnotations.readOnly,
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
      title: 'List project collaborators',
      annotations: toolAnnotations.readOnly,
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
      title: 'Invite collaborator',
      annotations: toolAnnotations.writeExternal,
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
      title: 'Remove collaborator',
      annotations: toolAnnotations.destructive,
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
      title: 'Toggle collaborator roles',
      annotations: toolAnnotations.write,
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
      title: 'List roles',
      annotations: toolAnnotations.readOnly,
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
      title: 'Create role',
      annotations: toolAnnotations.write,
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
      title: 'Delete role',
      annotations: toolAnnotations.destructive,
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
      title: 'List role permissions for project',
      annotations: toolAnnotations.readOnly,
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
      title: 'List permissions',
      annotations: toolAnnotations.readOnly,
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
      title: 'Toggle role permission',
      annotations: toolAnnotations.write,
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

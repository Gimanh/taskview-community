import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerOrganizationsTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_organizations',
    {
      description: 'List all organizations the current user belongs to',
    },
    async () => {
      try {
        const orgs = await api.organizations.fetch()
        return ok(orgs)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_organization',
    {
      description: 'Get organization details by ID',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
      },
    },
    async ({ organizationId }) => {
      try {
        const org = await api.organizations.getById(organizationId)
        return ok(org)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'create_organization',
    {
      description: 'Create a new organization. The creator becomes the owner.',
      inputSchema: {
        name: z.string().describe('Organization name'),
        slug: z.string().optional().describe('URL-friendly slug (auto-generated if omitted)'),
        logoUrl: z.string().optional().describe('Logo URL'),
      },
    },
    async (params) => {
      try {
        const org = await api.organizations.create(params)
        if (!org) return err('Failed to create organization')
        return ok(org)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_organization',
    {
      description: 'Update organization name, slug, or logo. Requires admin or owner role.',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
        name: z.string().optional().describe('New name'),
        slug: z.string().optional().describe('New slug'),
        logoUrl: z.string().optional().describe('New logo URL'),
      },
    },
    async (params) => {
      try {
        const org = await api.organizations.update(params)
        if (!org) return err('Organization not found or update failed')
        return ok(org)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_organization',
    {
      description: 'Delete an organization. Only the owner can delete. Personal workspaces cannot be deleted.',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID to delete'),
      },
    },
    async ({ organizationId }) => {
      try {
        const result = await api.organizations.delete({ organizationId })
        return ok({ deleted: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'list_organization_members',
    {
      description: 'List all members of an organization',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
      },
    },
    async ({ organizationId }) => {
      try {
        const members = await api.organizations.fetchMembers(organizationId)
        return ok(members)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'add_organization_member',
    {
      description: 'Add a member to an organization by email. Requires admin or owner role.',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
        email: z.string().describe('Email of the user to add'),
        role: z.enum(['admin', 'member']).optional().default('member').describe('Role: admin or member'),
      },
    },
    async (params) => {
      try {
        const member = await api.organizations.addMember(params)
        if (!member) return err('Failed to add member')
        return ok(member)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'update_organization_member_role',
    {
      description: 'Change a member role in an organization. Cannot change the owner role.',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
        email: z.string().describe('Email of the member'),
        role: z.enum(['admin', 'member']).describe('New role: admin or member'),
      },
    },
    async (params) => {
      try {
        const member = await api.organizations.updateMemberRole(params)
        if (!member) return err('Failed to update member role')
        return ok(member)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'remove_organization_member',
    {
      description: 'Remove a member from an organization. Cannot remove the owner.',
      inputSchema: {
        organizationId: z.coerce.number().describe('Organization ID'),
        email: z.string().describe('Email of the member to remove'),
      },
    },
    async (params) => {
      try {
        const result = await api.organizations.removeMember(params)
        return ok({ removed: result })
      } catch (e) { return err(e) }
    },
  )
}

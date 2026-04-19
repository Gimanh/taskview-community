import { type } from 'arktype'

export const OrgRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export type OrgRole = typeof OrgRoles[keyof typeof OrgRoles]

export const ORG_ADMIN_ROLES: readonly OrgRole[] = [OrgRoles.OWNER, OrgRoles.ADMIN]
export const ORG_ALL_ROLES: readonly OrgRole[] = [OrgRoles.OWNER, OrgRoles.ADMIN, OrgRoles.MEMBER]

export const OrganizationArkTypeCreate = type({
  name: 'string > 0',
  'slug?': 'string',
  'logoUrl?': 'string | null',
})

export type OrganizationArgCreate = typeof OrganizationArkTypeCreate.infer

export const OrganizationArkTypeUpdate = type({
  'name?': 'string',
  'slug?': 'string',
  'logoUrl?': 'string | null',
})

export type OrganizationArgUpdate = typeof OrganizationArkTypeUpdate.infer & { organizationId: number }

export const OrganizationMemberArkTypeAdd = type({
  organizationId: 'number',
  email: 'string',
  'role?': "'admin' | 'member'",
})

export type OrganizationMemberArgAdd = typeof OrganizationMemberArkTypeAdd.infer

export const OrganizationMemberArkTypeUpdateRole = type({
  organizationId: 'number',
  email: 'string',
  role: "'admin' | 'member'",
})

export type OrganizationMemberArgUpdateRole = typeof OrganizationMemberArkTypeUpdateRole.infer

export const OrganizationMemberArkTypeRemove = type({
  organizationId: 'number',
  email: 'string',
})

export type OrganizationMemberArgRemove = typeof OrganizationMemberArkTypeRemove.infer

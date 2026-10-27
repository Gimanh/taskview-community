import { type, type ArkErrors } from 'arktype'
import type { Request, Response } from 'express'
import type { Database } from '../../modules/db'
import type {
  OrganizationsSchemaTypeForSelect,
  ScimGroupsSchemaTypeForInsert,
  ScimGroupsSchemaTypeForSelect,
  ScimSuspendedMembership,
  ScimUsersSchemaTypeForSelect,
  SsoConfigsSchemaTypeForSelect,
} from 'taskview-db-schemas'

export const ScimEmailArkType = type({
  value: 'string',
  'type?': 'string',
  'primary?': 'boolean | string',
})

export const ScimUserArkType = type({
  'userName?': 'string',
  'externalId?': 'string | null',
  'emails?': ScimEmailArkType.array(),
  'displayName?': 'string | null',
  'name?': {
    'givenName?': 'string | null',
    'familyName?': 'string | null',
  },
  'active?': 'boolean | string',
})

export type ScimUserBody = typeof ScimUserArkType.infer

export const ScimGroupArkType = type({
  'displayName?': 'string',
  'externalId?': 'string | null',
  'members?': type({ value: 'string' }).array(),
})

export type ScimGroupBody = typeof ScimGroupArkType.infer

export const ScimPatchArkType = type({
  Operations: type({
    op: 'string',
    'path?': 'string',
    'value?': 'unknown',
  }).array().atLeastLength(1),
})

export type ScimPatchOperation = typeof ScimPatchArkType.infer['Operations'][number]

export type ScimErrorType =
  | 'invalidFilter'
  | 'invalidSyntax'
  | 'invalidPath'
  | 'invalidValue'
  | 'mutability'
  | 'uniqueness'

export type ScimErrorArgs = {
  status: number
  detail: string
  scimType?: ScimErrorType
}

export type ScimUserAttributes = {
  userName: string
  email: string
  externalId: string | null
  displayName: string | null
  givenName: string | null
  familyName: string | null
  active: boolean
}

export type ScimFilterAttribute = 'userName' | 'externalId' | 'email'

export type ScimUserFilter = {
  attribute: ScimFilterAttribute
  value: string
}

export type ScimFilterMatch = {
  attribute: string
  value: string
}

export type ScimPage = {
  startIndex: number
  count: number
}

export type ScimListQuery = ScimPage & {
  filter: ScimUserFilter | null
}

export type ScimContext = {
  org: OrganizationsSchemaTypeForSelect
  config: SsoConfigsSchemaTypeForSelect
}

export type ScimListUsersArgs = ScimContext & {
  query: ScimListQuery
}

export type ScimListUsersResult = {
  users: ScimUsersSchemaTypeForSelect[]
  totalResults: number
}

export type ScimUserByIdArgs = ScimContext & {
  scimId: string
}

export type ScimCreateUserArgs = ScimContext & {
  attributes: ScimUserAttributes
}

export type ScimReplaceUserArgs = ScimUserByIdArgs & {
  attributes: ScimUserAttributes
}

export type ScimPatchUserArgs = ScimUserByIdArgs & {
  operations: ScimPatchOperation[]
}

export type ScimApplyChangesArgs = ScimContext & {
  user: ScimUsersSchemaTypeForSelect
  next: ScimUserAttributes
}

export type ScimEmailArgs = ScimContext & {
  email: string
}

export type ScimReactivateArgs = ScimEmailArgs & {
  suspended: ScimSuspendedMembership | null
}

export type ScimChangeEmailArgs = ScimContext & {
  memberEmail: string
  email: string
  active: boolean
}

export type ScimLinkMemberArgs = ScimEmailArgs & {
  userName: string
}

export type ScimMembershipArgs = {
  orgId: number
  email: string
}

export type ScimRestoreMembershipArgs = ScimMembershipArgs & {
  goals: ScimSuspendedMembership['goals']
}

export type ScimFindByScimIdArgs = {
  ssoConfigId: number
  scimId: string
}

export type ScimUpdateUserArgs = {
  id: number
  values: ScimUserAttributes & {
    memberEmail: string
    suspendedMembership: ScimSuspendedMembership | null
  }
}

export type ScimFindConflictArgs = {
  ssoConfigId: number
  attributes: Pick<ScimUserAttributes, 'userName' | 'email' | 'externalId'>
  excludeId?: number
}

export type ScimFindForSignInArgs = {
  ssoConfigId: number
  emails: string[]
}

export type ScimFindByFilterArgs = {
  ssoConfigId: number
  filter: ScimUserFilter
}

export type ScimListPageArgs = {
  ssoConfigId: number
  offset: number
  limit: number
}

export type ScimMoveMembershipArgs = {
  orgId: number
  oldEmail: string
  email: string
}

export type ScimApplyPatchArgs = {
  current: ScimUserAttributes
  operations: ScimPatchOperation[]
}

export type ScimApplyPatchValueArgs = {
  target: ScimUserAttributes
  path: string
  value: unknown
  remove: boolean
}

export type ScimUserResourceArgs = {
  user: ScimUsersSchemaTypeForSelect
  baseUrl: string
}

export type ScimListResponseArgs = {
  resources: unknown[]
  totalResults: number
  startIndex: number
}

export type ScimSchemaAttributeArgs = Record<string, unknown> & {
  name: string
}

export type ScimHandler = (req: Request, res: Response) => Promise<unknown>

export type ScimValidateArgs<T> = {
  schema: (data: unknown) => T | ArkErrors
  body: unknown
}

export type ScimGroupFilter = {
  attribute: 'displayName' | 'externalId'
  value: string
}

export type ScimGroupListQuery = ScimPage & {
  filter: ScimGroupFilter | null
  excludeMembers: boolean
}

export type ScimGroupAttributes = {
  displayName: string
  externalId: string | null
  // SCIM ids of the member users
  members: string[]
}

export type ScimGroupMember = {
  groupId: number
  scimId: string
  display: string
}

export type ScimGroupView = {
  group: ScimGroupsSchemaTypeForSelect
  // null when the client asked to leave members out
  members: ScimGroupMember[] | null
}

export type ScimListGroupsArgs = ScimContext & {
  query: ScimGroupListQuery
}

export type ScimListGroupsResult = {
  groups: ScimGroupView[]
  totalResults: number
}

export type ScimGroupByIdArgs = ScimContext & {
  scimId: string
}

export type ScimGetGroupArgs = ScimGroupByIdArgs & {
  excludeMembers: boolean
}

export type ScimCreateGroupArgs = ScimContext & {
  attributes: ScimGroupAttributes
}

export type ScimReplaceGroupArgs = ScimGroupByIdArgs & {
  attributes: ScimGroupAttributes
}

export type ScimPatchGroupArgs = ScimGroupByIdArgs & {
  operations: ScimPatchOperation[]
}

export type ScimApplyGroupChangesArgs = ScimContext & {
  group: ScimGroupsSchemaTypeForSelect
  next: ScimGroupAttributes
}

export type ScimFindGroupArgs = {
  ssoConfigId: number
  filter: ScimGroupFilter
}

export type ScimFindGroupConflictArgs = {
  ssoConfigId: number
  externalId: ScimGroupAttributes['externalId']
  excludeId?: number
}

export type ScimFindUsersByScimIdsArgs = {
  ssoConfigId: number
  scimIds: string[]
}

export type ScimUserRef = {
  id: number
  scimId: string
}

export type ScimInsertGroupArgs = {
  values: ScimGroupsSchemaTypeForInsert
  scimUserIds: number[]
}

export type ScimUpdateGroupArgs = {
  id: number
  values: Pick<ScimGroupAttributes, 'displayName' | 'externalId'>
  scimUserIds: number[]
}

export type ScimDbTransaction = Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0]

export type ScimReplaceGroupMembersArgs = {
  tx: ScimDbTransaction
  groupId: number
  scimUserIds: number[]
}

export type ScimWithMembersArgs = {
  groups: ScimGroupsSchemaTypeForSelect[]
  excludeMembers: boolean
}

export type ScimApplyGroupPatchArgs = {
  current: ScimGroupAttributes
  operations: ScimPatchOperation[]
}

export type ScimApplyGroupPatchValueArgs = {
  target: ScimGroupAttributes
  path: string
  value: unknown
  op: 'add' | 'replace' | 'remove'
}

export type ScimGroupResourceArgs = {
  view: ScimGroupView
  baseUrl: string
}

export type ScimAddToLinkedProjectsArgs = {
  orgId: number
  groupIds?: number[]
  goalIds?: number[]
  scimUserIds?: number[]
  // Only links made or group memberships started after this moment
  since?: Date
}

export type ScimProjectGrant = {
  email: string
  goalId: number
  roleId: number
}

export type ScimGroupProjectLink = {
  goalId: number
  goalName: string
  roleId: number
  roleName: string
}

export type ScimAdminGroup = {
  id: number
  displayName: string
  membersCount: number
  projects: ScimGroupProjectLink[]
}

export type ScimAdminProjectRole = {
  id: number
  name: string
}

export type ScimAdminProject = {
  goalId: number
  name: string
  roles: ScimAdminProjectRole[]
}

export type ScimGroupLinksOverview = {
  groups: ScimAdminGroup[]
  // Active projects of the organization with their roles
  projects: ScimAdminProject[]
}

export type ScimGroupLinksOverviewArgs = {
  config: SsoConfigsSchemaTypeForSelect
}

export type ScimGroupProjectRef = {
  config: SsoConfigsSchemaTypeForSelect
  groupId: number
  goalId: number
}

export type ScimLinkGroupProjectArgs = ScimGroupProjectRef & {
  roleId: number
}

export type ScimLinkGroupProjectResult = 'ok' | 'group_not_found' | 'project_not_found' | 'role_not_in_project'

export type ScimUnlinkGroupProjectResult = 'ok' | 'not_found'

export type ScimFindGroupForConfigArgs = {
  ssoConfigId: number
  groupId: number
}

export type ScimFindProjectRoleArgs = {
  organizationId: number
  goalId: number
  roleId: number
}

export type ScimSaveGroupProjectArgs = {
  groupId: number
  goalId: number
  roleId: number
}

export type ScimDeleteGroupProjectArgs = {
  groupId: number
  goalId: number
}

export type ScimFindActiveProjectArgs = {
  organizationId: number
  goalId: number
}

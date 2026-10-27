import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import axios from 'axios'
import { TvApi } from '@/tv'
import { initApi, API_URL } from './init-api'
import type {
  GroupProjectsLinkArgs,
  GroupProjectsMembersArgs,
  GroupProjectsProject,
  GroupProjectsRequestArgs,
} from './scim-group-projects.test.types'

// Trusted in docker/docker-compose.yml, since SCIM requires a verified domain
const DOMAIN = 'scim-groups.example'
const PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'

const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`
let seq = 0

let user1Api: TvApi
let user2Api: TvApi
let user2Email: string
let deleteAllGoals: () => Promise<void>
let orgId: number
let otherOrgId: number
let configId: number
let otherConfigId: number
let scimToken: string

const unique = (label: string) => `${label}-${run}-${seq++}`
const emailFor = (label: string) => `${unique(label)}@${DOMAIN}`

async function scim(args: GroupProjectsRequestArgs) {
  return axios.request({
    method: args.method,
    url: `${API_URL}/scim/v2${args.path}`,
    data: args.body,
    headers: { Authorization: `Bearer ${scimToken}`, 'Content-Type': 'application/scim+json' },
    validateStatus: () => true,
  })
}

async function createUser(label: string) {
  const email = emailFor(label)
  const res = await scim({ method: 'post', path: '/Users', body: { userName: email, emails: [{ value: email, primary: true }] } })
  expect(res.status).toBe(201)
  return { id: res.data.id as string, email }
}

async function createGroup(members: string[] = []) {
  const displayName = unique('Group')
  const res = await scim({ method: 'post', path: '/Groups', body: { displayName, externalId: unique('ext'), members: members.map((value) => ({ value })) } })
  expect(res.status).toBe(201)
  const overview = await user1Api.sso.fetchScimGroups(configId)
  const stored = overview.groups.find((group) => group.displayName === displayName)
  if (!stored) throw new Error('The group is missing from the overview')
  return { scimId: res.data.id as string, id: stored.id, displayName }
}

const addToGroup = async (scimGroupId: string, scimUserId: string) => {
  const res = await scim({
    method: 'patch',
    path: `/Groups/${scimGroupId}`,
    body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'add', path: 'members', value: [{ value: scimUserId }] }] },
  })
  expect(res.status).toBe(204)
}

// A full replacement, the way Pocket ID and Okta send the members
const putMembers = async (args: GroupProjectsMembersArgs) => {
  const current = await scim({ method: 'get', path: `/Groups/${args.scimGroupId}` })
  const res = await scim({
    method: 'put',
    path: `/Groups/${args.scimGroupId}`,
    body: { displayName: current.data.displayName, externalId: current.data.externalId, members: args.scimUserIds.map((value) => ({ value })) },
  })
  expect(res.status).toBe(200)
}

const setActive = async (scimUserId: string, active: boolean) => {
  const res = await scim({ method: 'patch', path: `/Users/${scimUserId}`, body: { Operations: [{ op: 'replace', path: 'active', value: active }] } })
  expect(res.status).toBe(200)
}

async function projectWithRole(organizationId = orgId): Promise<GroupProjectsProject> {
  const goal = await user1Api.goals.createGoal({ name: `SCIM groups ${unique('g')}`, organizationId })
  if (!goal) throw new Error('Failed to create the project')
  const role = await user1Api.collaboration.createRoleForGoal({ goalId: goal.id, roleName: unique('role') })
  if (!role) throw new Error('Failed to create the role')
  return { goalId: goal.id, roleId: role.id }
}

const link = (args: GroupProjectsLinkArgs) => user1Api.sso.linkScimGroupProject({ configId, ...args })

async function projectRoles(goalId: number, email: string): Promise<number[] | null> {
  const users = await user1Api.collaboration.fetchUsersForGoal(goalId)
  const user = users.find((u) => u.email === email)
  return user ? [...user.roles].sort() : null
}

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  user2Api = init.$tvApiForSecondUser
  user2Email = init.user2Email
  deleteAllGoals = init.deleteAllGoals

  const samlConfig = {
    protocol: 'saml' as const,
    samlEntryPoint: 'https://idp.example.com/saml/sso',
    samlCert: 'MIICmzCCAYMCBgF...',
    samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
  }
  orgId = (await user1Api.organizations.create({ name: 'SCIM Groups Org' })).id
  const config = await user1Api.sso.createConfig({ ...samlConfig, organizationId: orgId, displayName: 'SCIM groups', emailDomainRestriction: DOMAIN, samlIssuer: `scim-groups-${run}` })
  configId = config.id
  scimToken = (await user1Api.sso.generateScimToken(configId)).token

  otherOrgId = (await user1Api.organizations.create({ name: 'SCIM Groups Other Org' })).id
  const otherConfig = await user1Api.sso.createConfig({
    ...samlConfig,
    organizationId: otherOrgId,
    displayName: 'SCIM groups other',
    emailDomainRestriction: `other-${DOMAIN}`,
    samlIssuer: `scim-groups-other-${run}`,
  })
  otherConfigId = otherConfig.id

  // An admin of the organization who is in none of its projects
  await user1Api.organizations.addMember({ organizationId: orgId, email: user2Email, role: 'admin' })
})

afterAll(async () => {
  await user1Api.sso.deleteConfig(configId).catch(() => {})
  await user1Api.sso.deleteConfig(otherConfigId).catch(() => {})
  await user1Api.organizations.delete(orgId).catch(() => {})
  await user1Api.organizations.delete(otherOrgId).catch(() => {})
  await deleteAllGoals()
})

describe('SCIM groups linked to projects', () => {
  it('adds a person who joins a linked group to the project with the default role', async () => {
    const project = await projectWithRole()
    const group = await createGroup()
    await link({ groupId: group.id, ...project })

    const user = await createUser('joiner')
    expect(await projectRoles(project.goalId, user.email)).toBeNull()
    await addToGroup(group.scimId, user.id)

    expect(await projectRoles(project.goalId, user.email)).toEqual([project.roleId])
  })

  it('adds the current members when the link is made, but not deactivated ones', async () => {
    const member = await createUser('member')
    const deactivated = await createUser('deactivated')
    const group = await createGroup([member.id, deactivated.id])
    await setActive(deactivated.id, false)

    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })

    expect(await projectRoles(project.goalId, member.email)).toEqual([project.roleId])
    expect(await projectRoles(project.goalId, deactivated.email)).toBeNull()
  })

  it('leaves the roles of someone already in the project as they are', async () => {
    const user = await createUser('already-in')
    const project = await projectWithRole()
    const ownRole = await user1Api.collaboration.createRoleForGoal({ goalId: project.goalId, roleName: unique('own') })
    const collaborator = await user1Api.collaboration.inviteUserToGoal({ goalId: project.goalId, email: user.email })
    if (!ownRole || !collaborator) throw new Error('Failed to prepare the collaborator')
    await user1Api.collaboration.toggleUserRoles({ goalId: project.goalId, userId: collaborator.id, roles: [ownRole.id] })

    const group = await createGroup()
    await link({ groupId: group.id, ...project })
    await addToGroup(group.scimId, user.id)

    expect(await projectRoles(project.goalId, user.email)).toEqual([ownRole.id])
  })

  it('does not bring back someone taken out of the project by hand', async () => {
    const leaver = await createUser('taken-out')
    const newcomer = await createUser('newcomer')
    const group = await createGroup([leaver.id])
    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })
    expect(await projectRoles(project.goalId, leaver.email)).toEqual([project.roleId])

    const collaborator = (await user1Api.collaboration.fetchUsersForGoal(project.goalId)).find((u) => u.email === leaver.email)
    if (!collaborator) throw new Error('The member is missing from the project')
    await user1Api.collaboration.deleteUserFromGoal({ goalId: project.goalId, id: collaborator.id })

    // The provider repeats the whole list on every change
    await putMembers({ scimGroupId: group.scimId, scimUserIds: [leaver.id] })
    await putMembers({ scimGroupId: group.scimId, scimUserIds: [leaver.id, newcomer.id] })

    expect(await projectRoles(project.goalId, leaver.email)).toBeNull()
    expect(await projectRoles(project.goalId, newcomer.email)).toEqual([project.roleId])
  })

  it('keeps the project of someone who leaves the group', async () => {
    const user = await createUser('leaves-group')
    const group = await createGroup([user.id])
    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })

    await putMembers({ scimGroupId: group.scimId, scimUserIds: [] })
    expect(await projectRoles(project.goalId, user.email)).toEqual([project.roleId])
  })

  it('adds a reactivated person to what was linked while they were off, and not to what they lost before', async () => {
    const user = await createUser('reactivated')
    const group = await createGroup([user.id])
    const earlier = await projectWithRole()
    await link({ groupId: group.id, ...earlier })
    const collaborator = (await user1Api.collaboration.fetchUsersForGoal(earlier.goalId)).find((u) => u.email === user.email)
    if (!collaborator) throw new Error('The member is missing from the project')
    await user1Api.collaboration.deleteUserFromGoal({ goalId: earlier.goalId, id: collaborator.id })

    await setActive(user.id, false)
    const later = await projectWithRole()
    await link({ groupId: group.id, ...later })
    expect(await projectRoles(later.goalId, user.email)).toBeNull()

    await setActive(user.id, true)
    expect(await projectRoles(later.goalId, user.email)).toEqual([later.roleId])
    expect(await projectRoles(earlier.goalId, user.email)).toBeNull()
  })

  it('adds a reactivated person to the projects of a group they joined while off', async () => {
    const user = await createUser('joined-while-off')
    const project = await projectWithRole()
    const group = await createGroup()
    await link({ groupId: group.id, ...project })

    await setActive(user.id, false)
    await addToGroup(group.scimId, user.id)
    expect(await projectRoles(project.goalId, user.email)).toBeNull()

    await setActive(user.id, true)
    expect(await projectRoles(project.goalId, user.email)).toEqual([project.roleId])
  })

  it('does not add someone an admin removed from the organization', async () => {
    const user = await createUser('removed-from-org')
    const group = await createGroup([user.id])
    await user1Api.organizations.removeMember({ organizationId: orgId, email: user.email })

    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })
    expect(await projectRoles(project.goalId, user.email)).toBeNull()
  })

  it('does not add people to an archived project', async () => {
    const group = await createGroup()
    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })
    await user1Api.goals.updateGoal({ id: project.goalId, archive: 1 })

    const user = await createUser('archived')
    await addToGroup(group.scimId, user.id)
    expect(await projectRoles(project.goalId, user.email)).toBeNull()
  })

  it('stops adding people once the project is unlinked', async () => {
    const group = await createGroup()
    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })
    await user1Api.sso.unlinkScimGroupProject({ configId, groupId: group.id, goalId: project.goalId })

    const user = await createUser('after-unlink')
    await addToGroup(group.scimId, user.id)
    expect(await projectRoles(project.goalId, user.email)).toBeNull()
  })

  it('shows the groups with their projects and the projects the admin may link', async () => {
    const user = await createUser('listed')
    const group = await createGroup([user.id])
    const project = await projectWithRole()
    await link({ groupId: group.id, ...project })

    const overview = await user1Api.sso.fetchScimGroups(configId)
    const listed = overview.groups.find((g) => g.id === group.id)
    expect(listed).toMatchObject({ displayName: group.displayName, membersCount: 1 })
    expect(listed?.projects).toEqual([expect.objectContaining({ goalId: project.goalId, roleId: project.roleId })])

    const linkable = overview.projects.find((p) => p.goalId === project.goalId)
    expect(linkable?.roles.map((r) => r.id)).toContain(project.roleId)
  })
})

describe('SCIM group links: who may make them', () => {
  const expectStatus = async (request: Promise<unknown>, status: number) => {
    const error = await request.then(() => null, (e) => e)
    expect(error?.response?.status ?? error?.status).toBe(status)
  }

  it('refuses a role of another project', async () => {
    const group = await createGroup()
    const project = await projectWithRole()
    const other = await projectWithRole()
    await expectStatus(link({ groupId: group.id, goalId: project.goalId, roleId: other.roleId }), 400)
  })

  it('refuses a project of another organization', async () => {
    const group = await createGroup()
    const foreign = await projectWithRole(otherOrgId)
    await expectStatus(link({ groupId: group.id, ...foreign }), 404)
  })

  it('refuses a group of another SSO configuration', async () => {
    const group = await createGroup()
    const project = await projectWithRole(otherOrgId)
    await expectStatus(user1Api.sso.linkScimGroupProject({ configId: otherConfigId, groupId: group.id, ...project }), 404)
  })

  it('lets an organization admin link and unlink a project they are not in', async () => {
    const user = await createUser('admin-link')
    const group = await createGroup([user.id])
    const project = await projectWithRole()

    const overview = await user2Api.sso.fetchScimGroups(configId)
    expect(overview.projects.map((p) => p.goalId)).toContain(project.goalId)
    await user2Api.sso.linkScimGroupProject({ configId, groupId: group.id, ...project })
    expect(await projectRoles(project.goalId, user.email)).toEqual([project.roleId])

    const listed = (await user2Api.sso.fetchScimGroups(configId)).groups.find((g) => g.id === group.id)
    expect(listed?.projects).toEqual([expect.objectContaining({ goalId: project.goalId, roleId: project.roleId, goalName: expect.any(String) })])
    await user2Api.sso.unlinkScimGroupProject({ configId, groupId: group.id, goalId: project.goalId })
    expect((await user2Api.sso.fetchScimGroups(configId)).groups.find((g) => g.id === group.id)?.projects).toEqual([])
  })

  it('does not offer or link an archived project', async () => {
    const group = await createGroup()
    const project = await projectWithRole()
    await user1Api.goals.updateGoal({ id: project.goalId, archive: 1 })

    const overview = await user1Api.sso.fetchScimGroups(configId)
    expect(overview.projects.map((p) => p.goalId)).not.toContain(project.goalId)
    await expectStatus(link({ groupId: group.id, ...project }), 404)
  })

  it('refuses someone who is not an organization admin', async () => {
    const memberOrg = (await user1Api.organizations.create({ name: 'SCIM Groups Member Org' })).id
    try {
      const memberConfig = await user1Api.sso.createConfig({
        organizationId: memberOrg,
        protocol: 'saml',
        displayName: 'SCIM groups member',
        emailDomainRestriction: `member-${DOMAIN}`,
        samlEntryPoint: 'https://idp.example.com/saml/sso',
        samlIssuer: `scim-groups-member-${run}`,
        samlCert: 'MIICmzCCAYMCBgF...',
        samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
      })
      await user1Api.organizations.addMember({ organizationId: memberOrg, email: user2Email, role: 'member' })
      await expectStatus(user2Api.sso.fetchScimGroups(memberConfig.id), 403)
      await user1Api.sso.deleteConfig(memberConfig.id)
    } finally {
      await user1Api.organizations.delete(memberOrg).catch(() => {})
    }
  })
})

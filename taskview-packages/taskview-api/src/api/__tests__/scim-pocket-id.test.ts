import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import axios from 'axios'
import { TvApi } from '@/tv'
import { initApi, API_URL } from './init-api'
import { PocketIdClient } from './pocket-id-client'
import type { PocketIdUser } from './pocket-id-client.types'
import type { PocketIdTestProject, PocketIdTestProjectArgs } from './scim-pocket-id.test.types'

// A real Pocket ID instance (docker/docker-compose.yml) provisions users into TaskView over SCIM
const DOMAIN = 'scim-pocketid.example'
// The address of the api as Pocket ID sees it from inside the compose network
const SCIM_ENDPOINT = process.env.POCKET_ID_SCIM_ENDPOINT || 'http://api:1401/scim/v2'

const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`
let seq = 0

const pocketId = new PocketIdClient()
let user1Api: TvApi
let deleteAllGoals: () => Promise<void>
let orgId: number
let configId: number
let scimToken: string
let groupId: string
let clientId: string
let providerId: string
const groupMembers: string[] = []
const allowedGroups: string[] = []
const pocketIdUsers: string[] = []

const BULK_USERS = 600

const unique = (label: string) => `${label}-${run}-${seq++}`
const emailFor = (label: string) => `${unique(label)}@${DOMAIN}`

async function scimGet(path: string) {
  const res = await axios.get(`${API_URL}/scim/v2${path}`, {
    headers: { Authorization: `Bearer ${scimToken}` },
    validateStatus: () => true,
  })
  expect(res.status).toBe(200)
  return res.data
}

// Every user of the connection, read page by page as an identity provider does
async function allScimUsers() {
  const users = []
  for (let startIndex = 1; ; startIndex += 200) {
    const page = await scimGet(`/Users?startIndex=${startIndex}&count=200`)
    users.push(...page.Resources)
    if (!page.Resources.length || users.length >= page.totalResults) return users
  }
}

async function inBatches<T>(items: T[], work: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += 25) await Promise.all(items.slice(i, i + 25).map(work))
}

async function scimUserByExternalId(externalId: string) {
  const list = await scimGet(`/Users?filter=${encodeURIComponent(`externalId eq "${externalId}"`)}`)
  return list.Resources[0]
}

async function scimUserByEmail(email: string) {
  const list = await scimGet(`/Users?filter=${encodeURIComponent(`emails.value eq "${email}"`)}`)
  return list.Resources[0]
}

async function orgMember(email: string) {
  const members = await user1Api.organizations.fetchMembers(orgId)
  return members.find((m) => m.email === email.toLowerCase())
}

async function projectMember(goalId: number, email: string) {
  const users = await user1Api.collaboration.fetchUsersForGoal(goalId)
  return users.find((u) => u.email === email.toLowerCase())
}

async function createPocketIdUser(label: string): Promise<PocketIdUser> {
  const user = await pocketId.createUser({
    username: unique(label),
    email: emailFor(label),
    firstName: 'Test',
    lastName: label,
  })
  pocketIdUsers.push(user.id)
  return user
}

async function grantAccess(user: PocketIdUser) {
  groupMembers.push(user.id)
  await pocketId.setGroupUsers({ groupId, userIds: groupMembers })
}

async function revokeAccess(user: PocketIdUser) {
  groupMembers.splice(groupMembers.indexOf(user.id), 1)
  await pocketId.setGroupUsers({ groupId, userIds: groupMembers })
}

// Pocket ID on SQLite keeps change times in whole seconds and skips a user whose change is not newer than
// our meta.lastModified, so a change made in the same second as the last sync would never be pushed
async function afterSecondOf(lastModified: string) {
  const wait = Math.floor(Date.parse(lastModified) / 1000) * 1000 + 1100 - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
}

async function nextSecond(externalId: string) {
  const { meta } = await scimUserByExternalId(externalId)
  await afterSecondOf(meta.lastModified)
}

// The same rule holds for groups: a group change is pushed only when it is newer than our meta.lastModified
async function nextSecondForGroup(externalId: string) {
  const { meta } = await scimGroupByExternalId(externalId)
  await afterSecondOf(meta.lastModified)
}

async function scimGroupByExternalId(externalId: string) {
  const list = await scimGet(`/Groups?filter=${encodeURIComponent(`externalId eq "${externalId}"`)}`)
  return list.Resources[0]
}

// Our SCIM ids of the given Pocket ID users, in the order a group lists its members
async function scimIdsOf(users: PocketIdUser[]) {
  const ids = await Promise.all(users.map(async (user) => (await scimUserByExternalId(user.id)).id))
  return ids.sort()
}

async function scimGroupMembers(externalId: string) {
  const group = await scimGroupByExternalId(externalId)
  return (group.members ?? []).map((member: { value: string }) => member.value).sort()
}

// A group the application allows, so Pocket ID pushes it with its members
async function createAllowedGroup(members: PocketIdUser[], friendlyName = unique('Group')): Promise<string> {
  const id = await pocketId.createGroup({ name: unique('group'), friendlyName })
  allowedGroups.push(id)
  await pocketId.setGroupUsers({ groupId: id, userIds: members.map((user) => user.id) })
  await pocketId.setAllowedGroups({ clientId, groupIds: [groupId, ...allowedGroups] })
  return id
}

async function disallowGroup(id: string) {
  allowedGroups.splice(allowedGroups.indexOf(id), 1)
  await pocketId.setAllowedGroups({ clientId, groupIds: [groupId, ...allowedGroups] })
}

// People who keep access to the application through the access group, so a group change only changes membership
async function usersWithAccess(count: number, label: string) {
  const users: PocketIdUser[] = []
  for (let i = 0; i < count; i++) users.push(await createPocketIdUser(label))
  groupMembers.push(...users.map((user) => user.id))
  await pocketId.setGroupUsers({ groupId, userIds: groupMembers })
  return users
}

async function syncOk() {
  const result = await pocketId.sync(providerId)
  expect(result, JSON.stringify(result.body)).toMatchObject({ status: 200 })
}

// A project of the organization where the person holds a project role
async function projectWithRole(args: PocketIdTestProjectArgs): Promise<PocketIdTestProject> {
  const goal = await user1Api.goals.createGoal({ name: `Pocket ID ${unique(args.label)}`, organizationId: orgId })
  if (!goal) throw new Error('Failed to create the project')
  const collaborator = await user1Api.collaboration.inviteUserToGoal({ goalId: goal.id, email: args.email })
  const role = await user1Api.collaboration.createRoleForGoal({ goalId: goal.id, roleName: `role ${unique('r')}` })
  if (!collaborator || !role) throw new Error('Failed to prepare the collaborator')
  await user1Api.collaboration.toggleUserRoles({ goalId: goal.id, userId: collaborator.id, roles: [role.id] })
  return { goalId: goal.id, roleId: role.id }
}

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  deleteAllGoals = init.deleteAllGoals

  const org = await user1Api.organizations.create({ name: 'Pocket ID SCIM Org' })
  orgId = org.id
  const config = await user1Api.sso.createConfig({
    organizationId: orgId,
    protocol: 'saml',
    displayName: 'Pocket ID SCIM',
    emailDomainRestriction: DOMAIN,
    samlEntryPoint: 'https://idp.example.com/saml/sso',
    samlIssuer: 'taskview-scim-pocket-id',
    samlCert: 'MIICmzCCAYMCBgF...',
    samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
    defaultOrgRole: 'member',
  })
  configId = config.id
  scimToken = (await user1Api.sso.generateScimToken(configId)).token

  const accessGroup = unique('taskview')
  groupId = await pocketId.createGroup({ name: accessGroup, friendlyName: accessGroup })
  clientId = await pocketId.createGroupClient(groupId)
  providerId = await pocketId.createScimProvider({ endpoint: SCIM_ENDPOINT, token: scimToken, oidcClientId: clientId })
})

afterAll(async () => {
  await pocketId.deleteScimProvider(providerId).catch(() => {})
  await pocketId.deleteClient(clientId).catch(() => {})
  await pocketId.deleteGroup(groupId).catch(() => {})
  await inBatches(allowedGroups, (id) => pocketId.deleteGroup(id).catch(() => {}))
  await inBatches(pocketIdUsers, (id) => pocketId.deleteUser(id).catch(() => {}))
  await user1Api.sso.deleteConfig(configId).catch(() => {})
  await user1Api.organizations.delete(orgId).catch(() => {})
  await deleteAllGoals()
})

describe('SCIM with Pocket ID: users', () => {
  it('provisions a user who gets access to the application', async () => {
    const user = await createPocketIdUser('new')
    await grantAccess(user)
    await syncOk()

    const scimUser = await scimUserByExternalId(user.id)
    expect(scimUser).toMatchObject({
      userName: user.username,
      active: true,
      emails: [expect.objectContaining({ value: user.email })],
      name: { givenName: 'Test', familyName: 'new' },
    })
    expect(await orgMember(user.email)).toMatchObject({ role: 'member' })
  })

  it('does not provision users outside the allowed group', async () => {
    const user = await createPocketIdUser('outsider')
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toBeUndefined()
    expect(await orgMember(user.email)).toBeUndefined()
  })

  it('applies a changed email and name', async () => {
    const user = await createPocketIdUser('rename')
    await grantAccess(user)
    await syncOk()

    await nextSecond(user.id)
    const renamed = await pocketId.updateUser({ user, changes: { email: emailFor('renamed'), lastName: 'Renamed' } })
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toMatchObject({
      emails: [expect.objectContaining({ value: renamed.email })],
      name: { givenName: 'Test', familyName: 'Renamed' },
    })
    // Without a TaskView account the invitation moves to the new address
    expect(await orgMember(renamed.email)).toBeTruthy()
    expect(await orgMember(user.email)).toBeUndefined()
  })

  it('takes access away from a disabled user and gives it back with the project roles', async () => {
    const user = await createPocketIdUser('disabled')
    await grantAccess(user)
    await syncOk()
    const project = await projectWithRole({ email: user.email, label: 'disabled' })

    await nextSecond(user.id)
    const disabled = await pocketId.updateUser({ user, changes: { disabled: true } })
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toMatchObject({ active: false })
    expect(await orgMember(user.email)).toBeUndefined()
    expect(await projectMember(project.goalId, user.email)).toBeUndefined()

    await nextSecond(user.id)
    await pocketId.updateUser({ user: disabled, changes: { disabled: false } })
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toMatchObject({ active: true })
    expect(await orgMember(user.email)).toMatchObject({ role: 'member' })
    expect((await projectMember(project.goalId, user.email))?.roles).toEqual([project.roleId])
  })

  it('removes a user who loses access to the application', async () => {
    const user = await createPocketIdUser('revoked')
    await grantAccess(user)
    await syncOk()
    const project = await projectWithRole({ email: user.email, label: 'revoked' })

    await revokeAccess(user)
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toBeUndefined()
    expect(await orgMember(user.email)).toBeUndefined()
    expect(await projectMember(project.goalId, user.email)).toBeUndefined()
  })

  it('removes a user deleted in Pocket ID', async () => {
    const user = await createPocketIdUser('deleted')
    await grantAccess(user)
    await syncOk()

    groupMembers.splice(groupMembers.indexOf(user.id), 1)
    await pocketId.deleteUser(user.id)
    await syncOk()

    expect(await scimUserByEmail(user.email)).toBeUndefined()
    expect(await orgMember(user.email)).toBeUndefined()
  })

  it('leaves alone a member added by hand who is not in Pocket ID', async () => {
    const email = emailFor('manual')
    await user1Api.organizations.addMember({ organizationId: orgId, email, role: 'admin' })
    await syncOk()

    expect(await orgMember(email)).toMatchObject({ role: 'admin' })
  })

  it('links a member added by hand who is in Pocket ID and keeps their projects', async () => {
    const user = await createPocketIdUser('linked')
    await user1Api.organizations.addMember({ organizationId: orgId, email: user.email, role: 'admin' })
    const project = await projectWithRole({ email: user.email, label: 'linked' })

    await grantAccess(user)
    await syncOk()

    expect(await scimUserByExternalId(user.id)).toMatchObject({ active: true })
    expect(await orgMember(user.email)).toMatchObject({ role: 'admin' })
    expect((await projectMember(project.goalId, user.email))?.roles).toEqual([project.roleId])
  })

  it('removes a member that another provider connected and Pocket ID does not know', async () => {
    const email = emailFor('foreign')
    await user1Api.organizations.addMember({ organizationId: orgId, email, role: 'member' })
    // Another provider looks the member up by userName, which connects them to SCIM without a Pocket ID externalId
    expect(await scimGet(`/Users?filter=${encodeURIComponent(`userName eq "${email}"`)}`)).toMatchObject({ totalResults: 1 })

    await syncOk()

    expect(await scimUserByEmail(email)).toBeUndefined()
    expect(await orgMember(email)).toBeUndefined()
  })

  it('replaces a member that another provider connected with the Pocket ID user of the same email', async () => {
    const user = await createPocketIdUser('takeover')
    await user1Api.organizations.addMember({ organizationId: orgId, email: user.email, role: 'admin' })
    const project = await projectWithRole({ email: user.email, label: 'takeover' })
    await scimGet(`/Users?filter=${encodeURIComponent(`userName eq "${user.email}"`)}`)
    await grantAccess(user)

    // The create is refused because the email is taken, and the foreign record is deleted in the same sync
    const first = await pocketId.sync(providerId)
    expect(first.status).not.toBe(200)
    expect(await scimUserByEmail(user.email)).toBeUndefined()
    expect(await orgMember(user.email)).toBeUndefined()

    await syncOk()

    expect(await scimUserByExternalId(user.id)).toMatchObject({ active: true })
    expect(await orgMember(user.email)).toMatchObject({ role: 'member' })
    expect(await projectMember(project.goalId, user.email)).toBeUndefined()
  })

  it('changes nothing when nothing changed in Pocket ID', async () => {
    const user = await createPocketIdUser('stable')
    await grantAccess(user)
    await syncOk()
    const before = await scimUserByExternalId(user.id)

    await syncOk()

    expect(await scimUserByExternalId(user.id)).toEqual(before)
  })
})

describe('SCIM with Pocket ID: groups', () => {
  it('provisions an allowed group with its members', async () => {
    const users = await usersWithAccess(2, 'member')
    const friendlyName = unique('Designers')
    const id = await createAllowedGroup(users, friendlyName)
    await syncOk()

    expect(await scimGroupByExternalId(id)).toMatchObject({ displayName: friendlyName, externalId: id })
    expect(await scimGroupMembers(id)).toEqual(await scimIdsOf(users))
  })

  it('does not provision a group the application does not allow', async () => {
    const id = await pocketId.createGroup({ name: unique('hidden'), friendlyName: unique('Hidden') })
    allowedGroups.push(id)
    await pocketId.setAllowedGroups({ clientId, groupIds: [groupId, ...allowedGroups.filter((group) => group !== id)] })
    await syncOk()

    expect(await scimGroupByExternalId(id)).toBeUndefined()
    await disallowGroup(id)
  })

  it('applies membership changes made on the group page', async () => {
    const [first, second, third] = await usersWithAccess(3, 'page')
    const id = await createAllowedGroup([first, second])
    await syncOk()

    await nextSecondForGroup(id)
    await pocketId.setGroupUsers({ groupId: id, userIds: [second.id, third.id] })
    await syncOk()

    expect(await scimGroupMembers(id)).toEqual(await scimIdsOf([second, third]))
  })

  it('applies a rename', async () => {
    const id = await createAllowedGroup(await usersWithAccess(1, 'rename'))
    await syncOk()

    const renamed = unique('Renamed')
    await nextSecondForGroup(id)
    await pocketId.renameGroup({ id, name: unique('renamed'), friendlyName: renamed })
    await syncOk()

    expect(await scimGroupByExternalId(id)).toMatchObject({ displayName: renamed })
  })

  it('adds a person who joins a group linked to a project to that project with the default role', async () => {
    const [member, joining] = await usersWithAccess(2, 'linked')
    const friendlyName = unique('Linked')
    const id = await createAllowedGroup([member], friendlyName)
    await syncOk()

    const goal = await user1Api.goals.createGoal({ name: `Pocket ID ${unique('linked')}`, organizationId: orgId })
    const role = goal && await user1Api.collaboration.createRoleForGoal({ goalId: goal.id, roleName: unique('role') })
    if (!goal || !role) throw new Error('Failed to prepare the project')
    const overview = await user1Api.sso.fetchScimGroups(configId)
    const group = overview.groups.find((g) => g.displayName === friendlyName)
    if (!group) throw new Error('The group is missing from the overview')
    await user1Api.sso.linkScimGroupProject({ configId, groupId: group.id, goalId: goal.id, roleId: role.id })
    expect((await projectMember(goal.id, member.email))?.roles).toEqual([role.id])

    await nextSecondForGroup(id)
    await pocketId.setGroupUsers({ groupId: id, userIds: [member.id, joining.id] })
    await syncOk()

    expect((await projectMember(goal.id, joining.email))?.roles).toEqual([role.id])
  })

  it('applies a membership added on the user page', async () => {
    const [member, joining] = await usersWithAccess(2, 'join')
    const id = await createAllowedGroup([member])
    await syncOk()

    await nextSecondForGroup(id)
    await pocketId.setUserGroups({ userId: joining.id, groupIds: [groupId, id] })
    await syncOk()

    expect(await scimGroupMembers(id)).toEqual(await scimIdsOf([member, joining]))
  })

  // Skipped: a Pocket ID bug (v2.18.0), not ours. UserService.UpdateUserGroups (user_service.go:629-635)
  // bumps UpdatedAt only of the groups the user is put into, not of the ones they leave, so the sync
  // sees no change in the left group and never sends its PUT. Removing the user on the group page works.
  it.skip('applies a membership removed on the user page', async () => {
    const [member, leaving] = await usersWithAccess(2, 'leave')
    const id = await createAllowedGroup([member, leaving])
    await syncOk()

    await nextSecondForGroup(id)
    await pocketId.setUserGroups({ userId: leaving.id, groupIds: [groupId] })
    await syncOk()

    expect(await scimGroupMembers(id)).toEqual(await scimIdsOf([member]))
  })

  it('drops a deleted user from the groups', async () => {
    const [member, deleted] = await usersWithAccess(2, 'gone')
    const id = await createAllowedGroup([member, deleted])
    await syncOk()

    groupMembers.splice(groupMembers.indexOf(deleted.id), 1)
    await pocketId.deleteUser(deleted.id)
    await syncOk()

    expect(await scimGroupMembers(id)).toEqual(await scimIdsOf([member]))
  })

  it('removes a group the application no longer allows and keeps its members', async () => {
    const users = await usersWithAccess(1, 'disallowed')
    const id = await createAllowedGroup(users)
    await syncOk()

    await disallowGroup(id)
    await syncOk()

    expect(await scimGroupByExternalId(id)).toBeUndefined()
    expect(await scimUserByExternalId(users[0].id)).toMatchObject({ active: true })
  })

  it('removes a group deleted in Pocket ID', async () => {
    const id = await createAllowedGroup(await usersWithAccess(1, 'deleted-group'))
    await syncOk()

    allowedGroups.splice(allowedGroups.indexOf(id), 1)
    await pocketId.deleteGroup(id)
    await syncOk()

    expect(await scimGroupByExternalId(id)).toBeUndefined()
  })

  it('provisions two groups that share a friendly name', async () => {
    const friendlyName = unique('Shared')
    const first = await createAllowedGroup(await usersWithAccess(1, 'shared'), friendlyName)
    const second = await createAllowedGroup(await usersWithAccess(1, 'shared'), friendlyName)
    await syncOk()

    const [firstGroup, secondGroup] = [await scimGroupByExternalId(first), await scimGroupByExternalId(second)]
    expect(firstGroup).toMatchObject({ displayName: friendlyName })
    expect(secondGroup).toMatchObject({ displayName: friendlyName })
    expect(secondGroup.id).not.toBe(firstGroup.id)
  })
})

describe('SCIM with Pocket ID: many users', () => {
  // We answer at most 200 users per page while Pocket ID asks for 1000, so it has to walk several pages
  it(`provisions ${BULK_USERS} users and sees all of them on the next sync`, async () => {
    const users: PocketIdUser[] = []
    await inBatches([...Array(BULK_USERS).keys()], async () => {
      users.push(await createPocketIdUser('bulk'))
    })
    groupMembers.push(...users.map((user) => user.id))
    await pocketId.setGroupUsers({ groupId, userIds: groupMembers })

    await syncOk()

    const provisioned = await allScimUsers()
    const ids = new Set(users.map((user) => user.id))
    const bulk = provisioned.filter((user) => ids.has(user.externalId))
    expect(bulk).toHaveLength(BULK_USERS)
    expect(new Set(provisioned.map((user) => user.id)).size).toBe(provisioned.length)

    // A user missed on a page would be created again and refused with 409, which fails the sync
    await syncOk()

    expect(await allScimUsers()).toEqual(provisioned)
  }, 180_000)
})

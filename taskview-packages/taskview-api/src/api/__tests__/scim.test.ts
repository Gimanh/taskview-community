import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import axios from 'axios'
import { TvApi } from '@/tv'
import { initApi, API_URL } from './init-api'
import type { ScimTestRequestArgs, ScimTestUserArgs } from './scim.test.types'

const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
const GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group'
const PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'
const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'
const DOMAIN = 'scim-e2e.example'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const scimUrl = `${API_URL}/scim/v2`
const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`
let seq = 0

let user1Api: TvApi
let user1Email: string
let user2Email: string
let deleteAllGoals: () => Promise<void>
let testOrgId: number
let otherOrgId: number
let configId: number
let otherConfigId: number
let scimToken: string
let otherScimToken: string

const unique = (label: string) => `${label}-${run}-${seq++}`
const emailFor = (label: string) => `${unique(label)}@${DOMAIN}`

async function scim(args: ScimTestRequestArgs) {
  return axios.request({
    method: args.method,
    url: `${scimUrl}${args.path}`,
    data: args.body,
    headers: {
      Authorization: `Bearer ${args.token ?? scimToken}`,
      'Content-Type': args.contentType ?? 'application/scim+json',
    },
    validateStatus: () => true,
  })
}

async function createUser(args: ScimTestUserArgs = {}) {
  const email = args.email ?? emailFor('user')
  const res = await scim({
    method: 'post',
    path: '/Users',
    body: {
      schemas: [USER_SCHEMA],
      userName: args.userName ?? email,
      emails: [{ value: email, type: 'work', primary: true }],
      ...(args.externalId ? { externalId: args.externalId } : {}),
      ...(args.displayName ? { displayName: args.displayName } : {}),
      ...(args.active !== undefined ? { active: args.active } : {}),
    },
  })
  expect(res.status).toBe(201)
  return res.data
}

async function orgMember(email: string) {
  const members = await user1Api.organizations.fetchMembers(testOrgId)
  return members.find((m) => m.email === email.toLowerCase())
}

const filter = (expression: string) => scim({ method: 'get', path: `/Users?filter=${encodeURIComponent(expression)}` })

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  user1Email = init.user1Email
  user2Email = init.user2Email
  deleteAllGoals = init.deleteAllGoals

  const org = await user1Api.organizations.create({ name: 'SCIM Test Org' })
  testOrgId = org.id
  const config = await user1Api.sso.createConfig({
    organizationId: testOrgId,
    protocol: 'saml',
    displayName: 'SCIM SAML',
    emailDomainRestriction: DOMAIN,
    samlEntryPoint: 'https://idp.example.com/saml/sso',
    samlIssuer: 'taskview-scim-e2e',
    samlCert: 'MIICmzCCAYMCBgF...',
    samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
    defaultOrgRole: 'admin',
  })
  configId = config.id
  scimToken = (await user1Api.sso.generateScimToken(configId)).token

  const otherOrg = await user1Api.organizations.create({ name: 'SCIM Other Org' })
  otherOrgId = otherOrg.id
  const otherConfig = await user1Api.sso.createConfig({
    organizationId: otherOrgId,
    protocol: 'saml',
    displayName: 'SCIM SAML other',
    emailDomainRestriction: 'scim-e2e-other.example',
    samlEntryPoint: 'https://idp.example.com/saml/sso',
    samlIssuer: 'taskview-scim-e2e-other',
    samlCert: 'MIICmzCCAYMCBgF...',
    samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
  })
  otherConfigId = otherConfig.id
  otherScimToken = (await user1Api.sso.generateScimToken(otherConfigId)).token

  await user1Api.organizations.addMember({ organizationId: testOrgId, email: user2Email, role: 'member' })
})

afterAll(async () => {
  await user1Api.sso.deleteConfig(configId).catch(() => {})
  await user1Api.sso.deleteConfig(otherConfigId).catch(() => {})
  await user1Api.organizations.delete(testOrgId).catch(() => {})
  await user1Api.organizations.delete(otherOrgId).catch(() => {})
  await deleteAllGoals()
})

describe('SCIM: authentication', () => {
  it('rejects a request without token', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { validateStatus: () => true })
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token', async () => {
    const res = await scim({ method: 'get', path: '/Users', token: 'invalid_token' })
    expect(res.status).toBe(401)
  })

  it('answers with application/scim+json', async () => {
    const res = await scim({ method: 'get', path: '/Users' })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/scim+json')
    expect(res.data.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse')
  })
})

describe('SCIM: discovery', () => {
  it('describes the service provider', async () => {
    const res = await scim({ method: 'get', path: '/ServiceProviderConfig' })
    expect(res.status).toBe(200)
    expect(res.data.patch.supported).toBe(true)
    expect(res.data.filter.supported).toBe(true)
    expect(res.data.bulk.supported).toBe(false)
    expect(res.data.authenticationSchemes[0].type).toBe('oauthbearertoken')
  })

  it('lists the User and Group resource types and schemas', async () => {
    const types = await scim({ method: 'get', path: '/ResourceTypes' })
    expect(types.data.Resources.map((r: any) => r.id)).toEqual(['User', 'Group'])
    expect((await scim({ method: 'get', path: '/ResourceTypes/Group' })).data.endpoint).toBe('/Groups')

    const schemas = await scim({ method: 'get', path: '/Schemas' })
    expect(schemas.data.Resources.map((r: any) => r.id)).toEqual([USER_SCHEMA, GROUP_SCHEMA])
    expect(schemas.data.Resources[0].attributes.map((a: any) => a.name)).toEqual(
      expect.arrayContaining(['userName', 'externalId', 'emails', 'active']),
    )
    expect(schemas.data.Resources[1].attributes.map((a: any) => a.name)).toEqual(['displayName', 'externalId', 'members'])

    expect((await scim({ method: 'get', path: `/Schemas/${USER_SCHEMA}` })).status).toBe(200)
    expect((await scim({ method: 'get', path: `/Schemas/${GROUP_SCHEMA}` })).status).toBe(200)
  })

  it('answers unknown endpoints with a SCIM 404', async () => {
    const res = await scim({ method: 'get', path: '/Teams' })
    expect(res.status).toBe(404)
    expect(res.data.schemas).toContain(ERROR_SCHEMA)
  })

  it('answers malformed JSON with a SCIM 400', async () => {
    const res = await scim({ method: 'post', path: '/Users', body: '{"userName": ' })
    expect(res.status).toBe(400)
    expect(res.data.schemas).toContain(ERROR_SCHEMA)
    expect(res.data.scimType).toBe('invalidSyntax')
  })
})

describe('SCIM: create user', () => {
  it('creates a user whose userName is not an email, with a stable uuid id', async () => {
    const email = emailFor('jdoe')
    const userName = unique('jdoe')
    const res = await scim({
      method: 'post',
      path: '/Users',
      body: { userName, emails: [{ value: email.toUpperCase(), type: 'work', primary: true }], externalId: unique('ext') },
    })

    expect(res.status).toBe(201)
    expect(res.data.id).toMatch(UUID)
    expect(res.data.userName).toBe(userName)
    expect(res.data.emails[0].value).toBe(email)
    expect(res.data.meta.resourceType).toBe('User')
    expect(res.headers.location).toBe(res.data.meta.location)
    expect((await orgMember(email))?.role).toBe('admin')
  })

  it('creates a user from userName alone when it is an email', async () => {
    const email = emailFor('only-username')
    const res = await scim({ method: 'post', path: '/Users', body: { userName: email } })

    expect(res.status).toBe(201)
    expect(res.data.userName).toBe(email)
    expect(await orgMember(email)).toBeTruthy()
  })

  it('rejects a user without any email', async () => {
    const res = await scim({ method: 'post', path: '/Users', body: { userName: unique('no-email') } })
    expect(res.status).toBe(400)
    expect(res.data.scimType).toBe('invalidValue')
  })

  it('rejects an email outside the SSO domain', async () => {
    const res = await scim({ method: 'post', path: '/Users', body: { userName: `${unique('outsider')}@elsewhere.example` } })
    expect(res.status).toBe(400)
    expect(res.data.scimType).toBe('invalidValue')
  })

  it('returns 409 uniqueness for a duplicate userName in another case', async () => {
    const user = await createUser({ userName: unique('Dup.User') })
    const res = await scim({
      method: 'post',
      path: '/Users',
      body: { userName: user.userName.toUpperCase(), emails: [{ value: emailFor('dup-other') }] },
    })
    expect(res.status).toBe(409)
    expect(res.data.scimType).toBe('uniqueness')
  })

  it('creates an inactive user without organization access', async () => {
    const email = emailFor('inactive')
    const user = await createUser({ email, active: false })

    expect(user.active).toBe(false)
    expect(await orgMember(email)).toBeUndefined()
  })
})

describe('SCIM: filter', () => {
  it('finds a user by userName regardless of case', async () => {
    const user = await createUser({ userName: unique('Case.User') })
    const res = await filter(`USERNAME Eq "${user.userName.toLowerCase()}"`)

    expect(res.status).toBe(200)
    expect(res.data.totalResults).toBe(1)
    expect(res.data.Resources[0].id).toBe(user.id)
  })

  it('finds a user by externalId and by work email', async () => {
    const externalId = unique('ext')
    const user = await createUser({ userName: unique('by-ext'), externalId })

    const byExternalId = await filter(`externalId eq "${externalId}"`)
    expect(byExternalId.data.Resources.map((r: any) => r.id)).toEqual([user.id])

    const byEmail = await filter(`emails[type eq "work"].value eq "${user.emails[0].value}"`)
    expect(byEmail.data.Resources.map((r: any) => r.id)).toEqual([user.id])
  })

  it('returns an empty list for an unknown user', async () => {
    const res = await filter(`userName eq "${unique('nobody')}"`)
    expect(res.status).toBe(200)
    expect(res.data.totalResults).toBe(0)
    expect(res.data.Resources).toEqual([])
  })

  it('rejects unsupported filters with invalidFilter', async () => {
    for (const expression of ['displayName co "x"', 'userName eq "a" and active eq true']) {
      const res = await filter(expression)
      expect(res.status).toBe(400)
      expect(res.data.scimType).toBe('invalidFilter')
    }
  })

  it('links an existing organization member found by an email of the SSO domain', async () => {
    const email = emailFor('member')
    await user1Api.organizations.addMember({ organizationId: testOrgId, email, role: 'member' })

    const res = await filter(`userName eq "${email}"`)
    expect(res.data.totalResults).toBe(1)
    expect(res.data.Resources[0].emails[0].value).toBe(email)

    const again = await scim({ method: 'get', path: `/Users/${encodeURIComponent(res.data.Resources[0].id)}` })
    expect(again.status).toBe(200)
  })

  it('never links members outside the SSO domain, the owner included', async () => {
    for (const email of [user1Email, user2Email]) {
      const res = await filter(`userName eq "${email}"`)
      expect(res.data.totalResults).toBe(0)
    }
  })

  it('rejects an oversized filter', async () => {
    const res = await filter(`userName eq "${'a'.repeat(600)}"`)
    expect(res.status).toBe(400)
    expect(res.data.scimType).toBe('invalidFilter')
  })
})

describe('SCIM: list and pagination', () => {
  it('pages with a stable order', async () => {
    for (let i = 0; i < 3; i++) await createUser()

    const first = await scim({ method: 'get', path: '/Users?startIndex=1&count=2' })
    expect(first.data.startIndex).toBe(1)
    expect(first.data.itemsPerPage).toBe(2)
    expect(first.data.totalResults).toBeGreaterThanOrEqual(3)

    const second = await scim({ method: 'get', path: '/Users?startIndex=3&count=2' })
    const firstIds = first.data.Resources.map((r: any) => r.id)
    for (const r of second.data.Resources) expect(firstIds).not.toContain(r.id)
  })

  it('does not show users of another organization', async () => {
    const user = await createUser()
    const res = await scim({ method: 'get', path: `/Users/${user.id}`, token: otherScimToken })
    expect(res.status).toBe(404)
  })
})

describe('SCIM: deactivate and reactivate', () => {
  it('deactivates with an Entra-style PATCH and keeps the user retrievable', async () => {
    const user = await createUser()
    const email = user.emails[0].value

    const res = await scim({
      method: 'patch',
      path: `/Users/${user.id}`,
      body: { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'Replace', path: 'active', value: 'False' }] },
    })
    expect(res.status).toBe(200)
    expect(res.data.active).toBe(false)
    expect(await orgMember(email)).toBeUndefined()

    const get = await scim({ method: 'get', path: `/Users/${user.id}` })
    expect(get.status).toBe(200)
    expect(get.data.active).toBe(false)
  })

  it('restores the organization role and project access on reactivation', async () => {
    const user = await createUser()
    const email = user.emails[0].value

    const goal = await user1Api.goals.createGoal({ name: `SCIM goal ${unique('g')}`, organizationId: testOrgId })
    if (!goal) throw new Error('Failed to create goal')
    const collaborator = await user1Api.collaboration.inviteUserToGoal({ goalId: goal.id, email })
    if (!collaborator) throw new Error('Failed to invite collaborator')
    const role = await user1Api.collaboration.createRoleForGoal({ goalId: goal.id, roleName: `SCIM role ${unique('r')}` })
    if (!role) throw new Error('Failed to create role')
    await user1Api.collaboration.toggleUserRoles({ goalId: goal.id, userId: collaborator.id, roles: [role.id] })

    await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'replace', path: 'active', value: false }] } })
    expect((await user1Api.collaboration.fetchUsersForGoal(goal.id)).map((u) => u.email)).not.toContain(email)

    const res = await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'replace', value: { active: true } }] } })
    expect(res.status).toBe(200)
    expect(res.data.active).toBe(true)
    expect((await orgMember(email))?.role).toBe('admin')

    const restored = (await user1Api.collaboration.fetchUsersForGoal(goal.id)).find((u) => u.email === email)
    expect(restored).toBeTruthy()
    expect(restored?.roles).toContain(role.id)
  })

  it('drops the project role links on deactivation', async () => {
    const user = await createUser()
    const email = user.emails[0].value

    const goal = await user1Api.goals.createGoal({ name: `SCIM goal ${unique('g')}`, organizationId: testOrgId })
    const foreignGoal = await user1Api.goals.createGoal({ name: `SCIM foreign ${unique('g')}`, organizationId: otherOrgId })
    if (!goal || !foreignGoal) throw new Error('Failed to create goals')
    // A project of another organization keeps the collaborator row alive after the deactivation
    await user1Api.collaboration.inviteUserToGoal({ goalId: foreignGoal.id, email })
    const collaborator = await user1Api.collaboration.inviteUserToGoal({ goalId: goal.id, email })
    const role = await user1Api.collaboration.createRoleForGoal({ goalId: goal.id, roleName: `SCIM role ${unique('r')}` })
    if (!collaborator || !role) throw new Error('Failed to prepare collaborator')
    await user1Api.collaboration.toggleUserRoles({ goalId: goal.id, userId: collaborator.id, roles: [role.id] })

    await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'replace', path: 'active', value: false }] } })
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal.id, email })

    const invitedAgain = (await user1Api.collaboration.fetchUsersForGoal(goal.id)).find((u) => u.email === email)
    expect(invitedAgain?.id).toBe(collaborator.id)
    expect(invitedAgain?.roles).toEqual([])
  })

  it('deactivates and reactivates through PUT (Okta)', async () => {
    const user = await createUser({ displayName: 'Before' })
    const email = user.emails[0].value
    const body = { userName: user.userName, emails: [{ value: email, primary: true }], active: false }

    const off = await scim({ method: 'put', path: `/Users/${user.id}`, body })
    expect(off.status).toBe(200)
    expect(off.data.active).toBe(false)
    expect(off.data.displayName).toBeUndefined()
    expect(await orgMember(email)).toBeUndefined()

    const on = await scim({ method: 'put', path: `/Users/${user.id}`, body: { ...body, active: true } })
    expect(on.data.active).toBe(true)
    expect(await orgMember(email)).toBeTruthy()
  })

})

describe('SCIM: update attributes', () => {
  it('applies supported attributes and ignores unknown ones', async () => {
    const user = await createUser()
    const res = await scim({
      method: 'patch',
      path: `/Users/${user.id}`,
      body: {
        Operations: [
          { op: 'add', path: 'displayName', value: 'Jane Doe' },
          { op: 'replace', path: 'name.givenName', value: 'Jane' },
          { op: 'replace', path: 'externalId', value: unique('ext') },
          { op: 'replace', path: 'title', value: 'Engineer' },
        ],
      },
    })

    expect(res.status).toBe(200)
    expect(res.data.displayName).toBe('Jane Doe')
    expect(res.data.name.givenName).toBe('Jane')
    expect(res.data.title).toBeUndefined()
  })

  it('rejects a userName that another user already has', async () => {
    const first = await createUser()
    const second = await createUser()
    const res = await scim({ method: 'patch', path: `/Users/${second.id}`, body: { Operations: [{ op: 'replace', path: 'userName', value: first.userName }] } })

    expect(res.status).toBe(409)
    expect(res.data.scimType).toBe('uniqueness')
  })

  it('validates PATCH requests', async () => {
    const user = await createUser()

    const empty = await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [] } })
    expect(empty.status).toBe(400)

    const badOp = await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'move', path: 'active', value: false }] } })
    expect(badOp.status).toBe(400)

    const unknown = await scim({ method: 'patch', path: `/Users/${unique('missing')}`, body: { Operations: [{ op: 'replace', path: 'active', value: false }] } })
    expect(unknown.status).toBe(404)
  })

  it('accepts PUT and PATCH sent as application/json too', async () => {
    const user = await createUser()
    const res = await scim({
      method: 'patch',
      path: `/Users/${user.id}`,
      contentType: 'application/json',
      body: { Operations: [{ op: 'replace', path: 'displayName', value: 'Plain JSON' }] },
    })
    expect(res.data.displayName).toBe('Plain JSON')
  })
})

describe('SCIM: security', () => {
  it('refuses a token whose SSO domain is not verified', async () => {
    const org = await user1Api.organizations.create({ name: 'SCIM Unverified Org' })
    try {
      const config = await user1Api.sso.createConfig({
        organizationId: org.id,
        protocol: 'saml',
        displayName: 'SCIM unverified',
        emailDomainRestriction: `${unique('unverified')}.example`,
        samlEntryPoint: 'https://idp.example.com/saml/sso',
        samlIssuer: 'taskview-scim-e2e-unverified',
        samlCert: 'MIICmzCCAYMCBgF...',
        samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
      })
      const { token } = await user1Api.sso.generateScimToken(config.id)

      const res = await scim({ method: 'get', path: '/Users', token })
      expect(res.status).toBe(403)
      expect(res.data.schemas).toContain(ERROR_SCHEMA)
    } finally {
      await user1Api.organizations.delete(org.id).catch(() => {})
    }
  })

  it('cannot provision or take over an account outside the SSO domain', async () => {
    const res = await scim({ method: 'post', path: '/Users', body: { userName: user2Email } })
    expect(res.status).toBe(400)
    expect((await filter(`emails.value eq "${user2Email}"`)).data.totalResults).toBe(0)
  })

  it('moves only this organization project access on an email change', async () => {
    const email = emailFor('mover')
    const user = await createUser({ email })

    const ownGoal = await user1Api.goals.createGoal({ name: `SCIM own ${unique('g')}`, organizationId: testOrgId })
    const foreignGoal = await user1Api.goals.createGoal({ name: `SCIM foreign ${unique('g')}`, organizationId: otherOrgId })
    if (!ownGoal || !foreignGoal) throw new Error('Failed to create goals')
    await user1Api.organizations.addMember({ organizationId: otherOrgId, email, role: 'member' })
    const own = await user1Api.collaboration.inviteUserToGoal({ goalId: ownGoal.id, email })
    await user1Api.collaboration.inviteUserToGoal({ goalId: foreignGoal.id, email })
    if (!own) throw new Error('Failed to invite collaborator')
    const role = await user1Api.collaboration.createRoleForGoal({ goalId: ownGoal.id, roleName: `SCIM role ${unique('r')}` })
    if (!role) throw new Error('Failed to create role')
    await user1Api.collaboration.toggleUserRoles({ goalId: ownGoal.id, userId: own.id, roles: [role.id] })

    const renamed = emailFor('renamed')
    const res = await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'replace', path: 'emails[type eq "work"].value', value: renamed }] } })
    expect(res.status).toBe(200)
    expect(res.data.emails[0].value).toBe(renamed)

    expect(await orgMember(email)).toBeUndefined()
    expect(await orgMember(renamed)).toBeTruthy()
    const ownUsers = await user1Api.collaboration.fetchUsersForGoal(ownGoal.id)
    expect(ownUsers.find((u) => u.email === renamed)?.roles).toContain(role.id)
    expect(ownUsers.map((u) => u.email)).not.toContain(email)

    const foreignUsers = await user1Api.collaboration.fetchUsersForGoal(foreignGoal.id)
    expect(foreignUsers.map((u) => u.email)).toContain(email)
    expect(foreignUsers.map((u) => u.email)).not.toContain(renamed)
    const otherMembers = await user1Api.organizations.fetchMembers(otherOrgId)
    expect(otherMembers.map((m) => m.email)).toContain(email)
  })

  it('rejects an email change to an address outside the SSO domain', async () => {
    const user = await createUser()
    const res = await scim({ method: 'patch', path: `/Users/${user.id}`, body: { Operations: [{ op: 'replace', path: 'emails', value: [{ value: user2Email, primary: true }] }] } })
    expect(res.status).toBe(400)
  })
})

describe('SCIM: groups', () => {
  const createGroup = async (body: Record<string, unknown>) => {
    const res = await scim({ method: 'post', path: '/Groups', body: { schemas: [GROUP_SCHEMA], ...body } })
    expect(res.status).toBe(201)
    return res.data
  }
  const membersOf = async (id: string) => {
    const res = await scim({ method: 'get', path: `/Groups/${id}` })
    expect(res.status).toBe(200)
    return (res.data.members ?? []).map((m: any) => m.value).sort()
  }
  const patchGroup = (id: string, Operations: unknown[]) =>
    scim({ method: 'patch', path: `/Groups/${id}`, body: { schemas: [PATCH_SCHEMA], Operations } })

  it('creates a group with members and returns them', async () => {
    const user = await createUser({ displayName: 'Group Member' })
    const externalId = unique('ext')
    const res = await scim({
      method: 'post',
      path: '/Groups',
      body: { schemas: [GROUP_SCHEMA], displayName: unique('Marketing'), externalId, members: [{ value: user.id }] },
    })
    expect(res.status).toBe(201)
    expect(res.data.id).toMatch(UUID)
    expect(res.data.externalId).toBe(externalId)
    expect(res.headers.location).toBe(res.data.meta.location)
    expect(res.data.meta.resourceType).toBe('Group')
    expect(res.data.members).toEqual([{ value: user.id, display: 'Group Member', $ref: expect.stringMatching(new RegExp(`/scim/v2/Users/${user.id}$`)) }])
  })

  it('creates a group without members the way Microsoft Entra ID does', async () => {
    const group = await createGroup({ displayName: unique('Empty'), externalId: unique('ext'), meta: { resourceType: 'Group' } })
    expect(group.members).toEqual([])
  })

  // RFC 7643 sets no uniqueness on displayName and Pocket ID sends friendly names that may repeat
  it('keeps two groups with the same displayName apart and finds both by it', async () => {
    const displayName = unique('Sales')
    const first = await createGroup({ displayName, externalId: unique('ext') })
    const second = await createGroup({ displayName: displayName.toUpperCase(), externalId: unique('ext') })
    expect(second.id).not.toBe(first.id)

    const expression = encodeURIComponent(`displayName eq "${displayName}"`)
    const res = await scim({ method: 'get', path: `/Groups?filter=${expression}` })
    expect(res.data.totalResults).toBe(2)
    expect(res.data.Resources.map((group: any) => group.id)).toEqual([first.id, second.id])
  })

  it('rejects a second group with the same externalId', async () => {
    const externalId = unique('ext')
    const first = await createGroup({ displayName: unique('Finance'), externalId })
    const res = await scim({ method: 'post', path: '/Groups', body: { displayName: unique('Finance'), externalId } })
    expect(res.status).toBe(409)
    expect(res.data.scimType).toBe('uniqueness')

    const other = await createGroup({ displayName: unique('Legal'), externalId: unique('ext') })
    const renamed = await scim({ method: 'put', path: `/Groups/${other.id}`, body: { displayName: unique('Legal'), externalId } })
    expect(renamed.status).toBe(409)
    expect((await scim({ method: 'get', path: `/Groups/${first.id}` })).data.externalId).toBe(externalId)
  })

  it('finds a group by displayName regardless of case and leaves members out on request', async () => {
    const user = await createUser()
    const displayName = unique('Support')
    const group = await createGroup({ displayName, members: [{ value: user.id }] })

    const expression = encodeURIComponent(`displayName eq "${displayName.toLowerCase()}"`)
    const res = await scim({ method: 'get', path: `/Groups?excludedAttributes=members&filter=${expression}` })
    expect(res.status).toBe(200)
    expect(res.data.totalResults).toBe(1)
    expect(res.data.Resources[0].id).toBe(group.id)
    expect(res.data.Resources[0].members).toBeUndefined()

    const single = await scim({ method: 'get', path: `/Groups/${group.id}?excludedAttributes=members` })
    expect(single.data.members).toBeUndefined()

    const byExternalId = await scim({ method: 'get', path: `/Groups?filter=${encodeURIComponent('externalId eq "missing"')}` })
    expect(byExternalId.data.totalResults).toBe(0)

    const unsupported = await scim({ method: 'get', path: `/Groups?filter=${encodeURIComponent('members eq "x"')}` })
    expect(unsupported.status).toBe(400)
    expect(unsupported.data.scimType).toBe('invalidFilter')
  })

  it('adds and removes members with Microsoft Entra ID PATCH requests', async () => {
    const first = await createUser()
    const second = await createUser()
    const group = await createGroup({ displayName: unique('Engineering') })

    const add = await patchGroup(group.id, [{ op: 'Add', path: 'members', value: [{ $ref: null, value: first.id }, { $ref: null, value: second.id }] }])
    expect(add.status).toBe(204)
    expect(await membersOf(group.id)).toEqual([first.id, second.id].sort())

    const remove = await patchGroup(group.id, [{ op: 'Remove', path: 'members', value: [{ $ref: null, value: first.id }] }])
    expect(remove.status).toBe(204)
    expect(await membersOf(group.id)).toEqual([second.id])

    const byFilter = await patchGroup(group.id, [{ op: 'remove', path: `members[value eq "${second.id}"]` }])
    expect(byFilter.status).toBe(204)
    expect(await membersOf(group.id)).toEqual([])
  })

  it('renames a group with a PATCH replace', async () => {
    const group = await createGroup({ displayName: unique('Old') })
    const renamed = unique('New')

    const res = await patchGroup(group.id, [{ op: 'Replace', path: 'displayName', value: renamed }])
    expect(res.status).toBe(204)
    const found = await scim({ method: 'get', path: `/Groups?filter=${encodeURIComponent(`displayName eq "${renamed}"`)}` })
    expect(found.data.Resources[0].id).toBe(group.id)

    const removeName = await patchGroup(group.id, [{ op: 'remove', path: 'displayName' }])
    expect(removeName.status).toBe(400)
  })

  it('replaces the whole group with PUT', async () => {
    const kept = await createUser()
    const dropped = await createUser()
    const group = await createGroup({ displayName: unique('Ops'), members: [{ value: kept.id }, { value: dropped.id }] })
    const displayName = unique('Ops renamed')

    const res = await scim({ method: 'put', path: `/Groups/${group.id}`, body: { displayName, externalId: 'ops-ext', members: [{ value: kept.id }] } })
    expect(res.status).toBe(200)
    expect(res.data.displayName).toBe(displayName)
    expect(res.data.externalId).toBe('ops-ext')
    expect(res.data.members.map((m: any) => m.value)).toEqual([kept.id])
  })

  it('rejects members that are not users of this connection', async () => {
    const group = await createGroup({ displayName: unique('Strict') })
    const unknown = await patchGroup(group.id, [{ op: 'add', path: 'members', value: [{ value: 'no-such-user' }] }])
    expect(unknown.status).toBe(400)
    expect(unknown.data.scimType).toBe('invalidValue')

    const foreign = await scim({
      method: 'post',
      path: '/Users',
      token: otherScimToken,
      body: { userName: `${unique('foreign')}@scim-e2e-other.example` },
    })
    expect(foreign.status).toBe(201)
    const cross = await patchGroup(group.id, [{ op: 'add', path: 'members', value: [{ value: foreign.data.id }] }])
    expect(cross.status).toBe(400)
    expect(await membersOf(group.id)).toEqual([])
  })

  it('keeps groups of another connection invisible', async () => {
    const group = await createGroup({ displayName: unique('Private') })
    const res = await scim({ method: 'get', path: `/Groups/${group.id}`, token: otherScimToken })
    expect(res.status).toBe(404)
    const list = await scim({ method: 'get', path: '/Groups', token: otherScimToken })
    expect(list.data.Resources.map((g: any) => g.id)).not.toContain(group.id)
  })

  it('drops a deleted user from their groups', async () => {
    const user = await createUser()
    const group = await createGroup({ displayName: unique('Leavers'), members: [{ value: user.id }] })

    expect((await scim({ method: 'delete', path: `/Users/${user.id}` })).status).toBe(204)
    expect(await membersOf(group.id)).toEqual([])
  })

  it('deletes a group', async () => {
    const group = await createGroup({ displayName: unique('Temp') })
    expect((await scim({ method: 'delete', path: `/Groups/${group.id}` })).status).toBe(204)
    expect((await scim({ method: 'get', path: `/Groups/${group.id}` })).status).toBe(404)
  })
})

describe('SCIM: delete user', () => {
  it('deletes the user and their organization access', async () => {
    const user = await createUser()
    const email = user.emails[0].value

    const res = await scim({ method: 'delete', path: `/Users/${user.id}` })
    expect(res.status).toBe(204)
    expect(await orgMember(email)).toBeUndefined()

    const get = await scim({ method: 'get', path: `/Users/${user.id}` })
    expect(get.status).toBe(404)
  })
})

import type { Request, Response } from 'express'
import { and, eq, inArray, like } from 'drizzle-orm'
import {
  OrganizationMembersSchema,
  OrganizationsSchema,
  SsoConfigsSchema,
  UsersSchema,
  type OrganizationsSchemaTypeForSelect,
  type SsoConfigsSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Database } from '../../../modules/db'
import { ScimManager } from '../../scim/ScimManager'
import type { ScimUserAttributes } from '../../scim/types'
import { SsoController } from '../SsoController'
import type { CreateConfigArgs, SignInArgs, SignInOutcome } from './SsoSignInScim.integration.spec.types'

// Only the identity provider's answer is faked: the callback, the SCIM rules and the database are real
const idp = vi.hoisted(() => ({ result: { email: '', externalId: '' } }))
vi.mock('../providers/provider-factory', () => ({
  createSsoProvider: () => ({ handleCallback: async () => ({ ...idp.result }) }),
}))

const run = `${Date.now() % 1e8}${Math.floor(Math.random() * 100)}`
const DOMAIN = `si${run}.example`
const JIT_DOMAIN = `sj${run}.example`
let seq = 0

const db = () => Database.getInstance().dbDrizzle
const controller = new SsoController()
const manager = new ScimManager()

let ownerId = 0
let org: OrganizationsSchemaTypeForSelect
let jitOrg: OrganizationsSchemaTypeForSelect
let config: SsoConfigsSchemaTypeForSelect
let jitConfig: SsoConfigsSchemaTypeForSelect

const nextEmail = (label: string, domain = DOMAIN) => `${label}-${run}-${seq++}@${domain}`

async function createOrg(name: string): Promise<OrganizationsSchemaTypeForSelect> {
  const [created] = await db().insert(OrganizationsSchema).values({ name, slug: `${name}-${run}`, ownerId }).returning()
  return created
}

async function createConfig(args: CreateConfigArgs) {
  const [created] = await db()
    .insert(SsoConfigsSchema)
    .values({
      organizationId: args.organizationId,
      protocol: 'saml',
      displayName: `sign-in-${run}`,
      emailDomainRestriction: args.domain,
      domainVerifiedAt: new Date(),
      scimEnabled: args.scimEnabled,
      defaultOrgRole: 'member',
    })
    .returning()
  return created
}

async function signIn(args: SignInArgs): Promise<SignInOutcome> {
  idp.result = { email: args.email, externalId: args.externalId }
  let location = ''
  const res = {
    redirect: (url: string) => { location = url },
    status: () => res,
    tvJson: () => res,
  }
  const req = { params: { configId: String(args.configId) }, body: {}, query: {} }
  await controller.handleCallback(req as unknown as Request, res as unknown as Response)
  const query = new URL(location, 'http://app.test').searchParams
  return { tokens: query.has('tokens'), error: query.get('sso_error') }
}

async function memberRole(organizationId: number, email: string): Promise<string | null> {
  const [member] = await db()
    .select({ role: OrganizationMembersSchema.role })
    .from(OrganizationMembersSchema)
    .where(and(eq(OrganizationMembersSchema.organizationId, organizationId), eq(OrganizationMembersSchema.email, email)))
  return member?.role ?? null
}

async function accountExists(email: string): Promise<boolean> {
  const rows = await db().select({ id: UsersSchema.id }).from(UsersSchema).where(eq(UsersSchema.email, email))
  return rows.length > 0
}

const attributesFor = (email: string): ScimUserAttributes => ({
  userName: email,
  email,
  externalId: `ext-${email}`,
  displayName: null,
  givenName: null,
  familyName: null,
  active: true,
})

const setActive = (scimId: string, value: boolean) =>
  manager.patchUser({ org, config, scimId, operations: [{ op: 'replace', path: 'active', value }] })

describe('SSO sign-in to an organization with SCIM', () => {
  beforeAll(async () => {
    const [owner] = await db()
      .insert(UsersSchema)
      .values({ login: `sso-owner-${run}`, email: `owner-${run}@owner.example`, password: 'not-used' })
      .returning({ id: UsersSchema.id })
    ownerId = owner.id
    org = await createOrg('sso-scim')
    jitOrg = await createOrg('sso-jit')
    config = await createConfig({ organizationId: org.id, domain: DOMAIN, scimEnabled: 1 })
    jitConfig = await createConfig({ organizationId: jitOrg.id, domain: JIT_DOMAIN, scimEnabled: 0 })
  })

  afterAll(async () => {
    // Accounts made by the sign-in take their personal organizations and SSO identities with them
    await db().delete(OrganizationsSchema).where(inArray(OrganizationsSchema.id, [org.id, jitOrg.id]))
    await db().delete(UsersSchema).where(like(UsersSchema.email, `%@${DOMAIN}`))
    await db().delete(UsersSchema).where(like(UsersSchema.email, `%@${JIT_DOMAIN}`))
    await db().delete(UsersSchema).where(eq(UsersSchema.id, ownerId))
  })

  it('lets in a person SCIM provisioned', async () => {
    const email = nextEmail('active')
    await manager.createUser({ org, config, attributes: attributesFor(email) })

    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    expect(await memberRole(org.id, email)).toBe('member')
  })

  it('refuses a person SCIM deactivated and does not bring them back', async () => {
    const email = nextEmail('deactivated')
    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })

    await setActive(user.scimId, false)
    expect(await memberRole(org.id, email)).toBeNull()

    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: false, error: 'account_deactivated' })
    expect(await memberRole(org.id, email)).toBeNull()
    expect((await manager.getUser({ org, config, scimId: user.scimId })).active).toBe(false)

    // Reactivation over SCIM is what lets them in again
    await setActive(user.scimId, true)
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    expect(await memberRole(org.id, email)).toBe('member')
  })

  it('refuses a deactivated person who has not signed in yet and creates no account', async () => {
    const email = nextEmail('never-signed-in')
    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    await setActive(user.scimId, false)

    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: false, error: 'account_deactivated' })
    expect(await accountExists(email)).toBe(false)
  })

  it('refuses a deactivated person who signs in with an address SCIM has not caught up with', async () => {
    const email = nextEmail('old-address')
    const renamed = nextEmail('new-address')
    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    await setActive(user.scimId, false)

    // The identity provider already sends the new address, the SCIM record still holds the old one.
    // Deactivation dropped the SSO identity, so the new address leads to nobody we know
    expect(await signIn({ configId: config.id, email: renamed, externalId: `idp-${email}` })).toEqual({ tokens: false, error: 'not_provisioned' })
    expect(await memberRole(org.id, email)).toBeNull()
    expect(await memberRole(org.id, renamed)).toBeNull()
  })

  it('refuses a person SCIM deleted', async () => {
    const email = nextEmail('deleted')
    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })

    await manager.deleteUser({ org, config, scimId: user.scimId })
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: false, error: 'not_provisioned' })
    expect(await memberRole(org.id, email)).toBeNull()
  })

  it('refuses a person SCIM never provisioned and creates no account', async () => {
    const email = nextEmail('unknown')

    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: false, error: 'not_provisioned' })
    expect(await memberRole(org.id, email)).toBeNull()
    expect(await accountExists(email)).toBe(false)
  })

  it('lets in a member added by hand, whom SCIM does not manage', async () => {
    const email = nextEmail('manual')
    await db().insert(OrganizationMembersSchema).values({ organizationId: org.id, email, role: 'admin' })

    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    expect(await memberRole(org.id, email)).toBe('admin')
  })

  it('lets in a member added by hand whose address changed in the identity provider', async () => {
    const email = nextEmail('manual-old')
    const renamed = nextEmail('manual-new')
    await db().insert(OrganizationMembersSchema).values({ organizationId: org.id, email, role: 'admin' })
    expect(await signIn({ configId: config.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })

    expect(await signIn({ configId: config.id, email: renamed, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    expect(await memberRole(org.id, renamed)).toBe('admin')
    expect(await memberRole(org.id, email)).toBeNull()
  })

  it('still adds anyone who signs in when SCIM is off', async () => {
    const email = nextEmail('jit', JIT_DOMAIN)

    expect(await signIn({ configId: jitConfig.id, email, externalId: `idp-${email}` })).toEqual({ tokens: true, error: null })
    expect(await memberRole(jitOrg.id, email)).toBe('member')
  })
})

import fs from 'fs/promises'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { join } from 'path'
import {
  CollaborationUsersSchema,
  CollaborationUsersToGoalsSchema,
  GoalsSchema,
  OrganizationMembersSchema,
  OrganizationsSchema,
  ScimUsersSchema,
  SsoConfigsSchema,
  UsersSchema,
  type OrganizationsSchemaTypeForSelect,
  type SsoConfigsSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../modules/db'
import AuthModel from '../../auth/AuthModel'
import { ScimManager } from '../ScimManager'
import type { ScimUserAttributes } from '../types'

const MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.70.0')
const run = `${Date.now() % 1e8}${Math.floor(Math.random() * 100)}`
const DOMAIN = `sm${run}.example`
let seq = 0

const db = () => Database.getInstance().dbDrizzle
const manager = new ScimManager()
const authModel = new AuthModel()

let ownerId = 0
let org: OrganizationsSchemaTypeForSelect
let otherOrg: OrganizationsSchemaTypeForSelect
let config: SsoConfigsSchemaTypeForSelect
const userIds: number[] = []

async function createAccount(email: string): Promise<number> {
  const [user] = await db()
    .insert(UsersSchema)
    .values({ login: `scim-${run}-${seq++}`, email, password: 'not-used' })
    .returning({ id: UsersSchema.id })
  userIds.push(user.id)
  return user.id
}

async function createOrg(name: string): Promise<OrganizationsSchemaTypeForSelect> {
  const [created] = await db()
    .insert(OrganizationsSchema)
    .values({ name, slug: `${name}-${run}`, ownerId })
    .returning()
  return created
}

async function inviteToNewGoal(organizationId: number, email: string): Promise<number> {
  const [goal] = await db()
    .insert(GoalsSchema)
    .values({ name: `goal-${run}`, owner: ownerId, organizationId })
    .returning({ id: GoalsSchema.id })
  const [existing] = await db()
    .select({ id: CollaborationUsersSchema.id })
    .from(CollaborationUsersSchema)
    .where(eq(CollaborationUsersSchema.email, email))
  const collabId = existing?.id
    ?? (await db().insert(CollaborationUsersSchema).values({ email }).returning({ id: CollaborationUsersSchema.id }))[0].id
  await db().insert(CollaborationUsersToGoalsSchema).values({ userId: collabId, goalId: goal.id })
  return goal.id
}

async function goalEmails(goalId: number): Promise<string[]> {
  const rows = await db()
    .select({ email: CollaborationUsersSchema.email })
    .from(CollaborationUsersToGoalsSchema)
    .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersSchema.id, CollaborationUsersToGoalsSchema.userId))
    .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId))
  // The project owner is a collaborator too: only the provisioned people matter here
  return rows.map((r) => r.email).filter((email) => email.endsWith(`@${DOMAIN}`))
}

async function memberEmails(organizationId: number): Promise<string[]> {
  const rows = await db()
    .select({ email: OrganizationMembersSchema.email })
    .from(OrganizationMembersSchema)
    .where(eq(OrganizationMembersSchema.organizationId, organizationId))
  return rows.map((r) => r.email).filter((email) => email.endsWith(`@${DOMAIN}`))
}

const attributesFor = (email: string): ScimUserAttributes => ({
  userName: email,
  email,
  externalId: null,
  displayName: null,
  givenName: null,
  familyName: null,
  active: true,
})

const changeEmailOp = (email: string) => [{ op: 'replace', path: 'emails[type eq "work"].value', value: email }]

describe('SCIM email change of a person who already has an account', () => {
  beforeAll(async () => {
    const client = await Database.getInstance().getClient()
    // Integration specs run in parallel and re-apply migration SQL; an advisory lock keeps the DDL from racing.
    await client.query('SELECT pg_advisory_lock(1401070)')
    try {
      await client.query(await fs.readFile(join(MIGRATION_DIR, '0.create-scim-users.sql'), 'utf8'))
    } finally {
      await client.query('SELECT pg_advisory_unlock(1401070)')
      client.release()
    }

    ownerId = await createAccount(`owner-${run}@owner.example`)
    org = await createOrg('scim-move')
    otherOrg = await createOrg('scim-move-other')
    const [created] = await db()
      .insert(SsoConfigsSchema)
      .values({ organizationId: org.id, protocol: 'saml', displayName: 'scim-move', emailDomainRestriction: DOMAIN })
      .returning()
    config = created
  })

  afterAll(async () => {
    const emails = sql`${CollaborationUsersSchema.email} like ${`%@${DOMAIN}`}`
    await db().delete(CollaborationUsersSchema).where(emails)
    await db().delete(OrganizationsSchema).where(inArray(OrganizationsSchema.id, [org.id, otherOrg.id]))
    await db().delete(UsersSchema).where(inArray(UsersSchema.id, userIds))
  })

  it('leaves renaming to the next sign-in, which then succeeds, and deactivation keeps working', async () => {
    const email = `person-${run}@${DOMAIN}`
    const renamed = `renamed-${run}@${DOMAIN}`
    const accountId = await createAccount(email)
    await db().insert(OrganizationMembersSchema).values({ organizationId: otherOrg.id, email, role: 'member' })
    const ownGoal = await inviteToNewGoal(org.id, email)
    const foreignGoal = await inviteToNewGoal(otherOrg.id, email)

    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    await manager.patchUser({ org, config, scimId: user.scimId, operations: changeEmailOp(renamed) })

    expect(await memberEmails(org.id)).toEqual([email])
    expect(await goalEmails(ownGoal)).toEqual([email])
    const [stored] = await db().select().from(ScimUsersSchema).where(eq(ScimUsersSchema.id, user.id))
    expect(stored.email).toBe(renamed)
    expect(stored.memberEmail).toBe(email)

    // The SSO sign-in with the new address renames the account everywhere
    const result = await authModel.updateUserEmail({ userId: accountId, oldEmail: email, email: renamed })
    expect(result).toBe('ok')
    expect(await memberEmails(org.id)).toEqual([renamed])
    expect(await memberEmails(otherOrg.id)).toEqual([renamed])
    expect(await goalEmails(ownGoal)).toEqual([renamed])
    expect(await goalEmails(foreignGoal)).toEqual([renamed])
    const [synced] = await db().select().from(ScimUsersSchema).where(eq(ScimUsersSchema.id, user.id))
    expect(synced.memberEmail).toBe(renamed)

    await manager.patchUser({ org, config, scimId: user.scimId, operations: [{ op: 'replace', path: 'active', value: false }] })
    expect(await memberEmails(org.id)).toEqual([])
    expect(await goalEmails(ownGoal)).toEqual([])
    expect(await goalEmails(foreignGoal)).toEqual([renamed])
  })

  it('deactivates by the address the person still holds before their next sign-in', async () => {
    const email = `waiting-${run}@${DOMAIN}`
    await createAccount(email)
    const user = await manager.createUser({ org, config, attributes: attributesFor(email) })
    await manager.patchUser({ org, config, scimId: user.scimId, operations: changeEmailOp(`waiting-new-${run}@${DOMAIN}`) })

    await manager.patchUser({ org, config, scimId: user.scimId, operations: [{ op: 'replace', path: 'active', value: false }] })
    const members = await db()
      .select()
      .from(OrganizationMembersSchema)
      .where(and(eq(OrganizationMembersSchema.organizationId, org.id), eq(OrganizationMembersSchema.email, email)))
    expect(members).toEqual([])

    await manager.patchUser({ org, config, scimId: user.scimId, operations: [{ op: 'replace', path: 'active', value: true }] })
    expect(await memberEmails(org.id)).toContain(email)
  })
})

import fs from 'fs'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initApi } from './init-api'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import { clientFor } from './start-test-helpers'
import { deleteUsers, finishOnboardingRaw } from './onboarding-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'
import type { OnboardingBackfillAccounts, OnboardingBackfillResult } from './onboarding-test-helpers.types'

const BACKFILL_SQL = fs.readFileSync(
  path.resolve(__dirname, '../../../../../api/src/migrations/taskview/sql/1.75.0/1.backfill-user-onboarding.sql'),
  'utf8',
)

const ctx = {} as AuthTestContext
const accounts = {} as OnboardingBackfillAccounts
let result: OnboardingBackfillResult

async function createProject(owner: SessionUser, name: string): Promise<number> {
  const goal = await clientFor(owner.access).goals.createGoal({ name: `${name} ${Date.now()}` })
  expect(goal?.id).toBeGreaterThan(0)
  return goal!.id
}

/**
 * Applies the 1.75.0 backfill to the accounts as they were before the upgrade (no stored answers except
 * the one the test keeps on purpose) and reads what it stored. Runs in a transaction that is rolled back,
 * so the rows it writes for the other accounts of the shared database never become visible.
 */
async function runBackfill(): Promise<OnboardingBackfillResult> {
  const ids = Object.fromEntries(Object.entries(accounts).map(([key, user]) => [key, user.id])) as Record<keyof OnboardingBackfillAccounts, number>
  await ctx.db.query('begin')
  try {
    await ctx.db.query(BACKFILL_SQL)
    const rows = await ctx.db.query<{ user_id: number, status: string }>(
      'select user_id, status from tv_auth.user_onboarding where user_id = any($1::int[])',
      [Object.values(ids)],
    )
    const byUser = new Map(rows.rows.map((row) => [row.user_id, row.status]))
    return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, byUser.get(id) ?? null])) as OnboardingBackfillResult
  } finally {
    await ctx.db.query('rollback')
  }
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Onboarding backfill org ${Date.now()}` })
  ctx.orgId = org.id

  accounts.projectOwner = await createSessionUser({ ctx, prefix: 'onb-own' })
  accounts.archivedProjectOwner = await createSessionUser({ ctx, prefix: 'onb-arc' })
  accounts.projectMember = await createSessionUser({ ctx, prefix: 'onb-mem' })
  accounts.inboxOnly = await createSessionUser({ ctx, prefix: 'onb-inb' })
  accounts.alreadyCompleted = await createSessionUser({ ctx, prefix: 'onb-done' })

  const sharedGoalId = await createProject(accounts.projectOwner, 'Backfill project')
  const invited = await clientFor(accounts.projectOwner.access).collaboration.inviteUserToGoal({
    goalId: sharedGoalId,
    email: accounts.projectMember.email,
  })
  expect(invited).toBeTruthy()

  const archivedGoalId = await createProject(accounts.archivedProjectOwner, 'Backfill archived project')
  await clientFor(accounts.archivedProjectOwner.access).goals.updateGoal({ id: archivedGoalId, archive: 1 })

  await createProject(accounts.alreadyCompleted, 'Backfill answered project')
  expect((await finishOnboardingRaw({ token: accounts.alreadyCompleted.access, body: { status: 'completed' } })).status).toBe(200)

  // The account without a project works in the app like any other: it opens its workspace and gets its Inbox
  const ownGoals = await clientFor(accounts.inboxOnly.access).goals.fetchGoals()
  expect((ownGoals ?? []).filter((goal) => !goal.isInbox)).toEqual([])

  result = await runBackfill()
})

afterAll(async () => {
  // The projects belong to the accounts and go away with them
  await deleteUsers(ctx.db, Object.values(accounts).map((user) => user.id))
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('1.75.0 backfill: who is offered the first-run tour after the upgrade', () => {
  it('an account that owns a project is not offered the tour', () => {
    expect(result.projectOwner).toBe('dismissed')
  })

  it('an account whose only project is archived still owns a project and is not offered the tour', () => {
    expect(result.archivedProjectOwner).toBe('dismissed')
  })

  it('an account that is a member of someone else\'s project is not offered the tour', () => {
    expect(result.projectMember).toBe('dismissed')
  })

  it('an account with no project (only its own Inbox) is still offered the tour', () => {
    expect(result.inboxOnly).toBeNull()
  })

  it('an answer given before the backfill is kept', () => {
    expect(result.alreadyCompleted).toBe('completed')
  })

  it('leaves nothing behind for the accounts it was tried on', async () => {
    const rows = await ctx.db.query<{ user_id: number, status: string }>(
      'select user_id, status from tv_auth.user_onboarding where user_id = any($1::int[])',
      [Object.values(accounts).map((user) => user.id)],
    )
    expect(rows.rows).toEqual([{ user_id: accounts.alreadyCompleted.id, status: 'completed' }])
  })
})

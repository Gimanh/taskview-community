import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initApi } from './init-api'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import { clientFor } from './start-test-helpers'
import { createSecondSession, deleteUsers, finishOnboardingRaw, getOnboardingRaw, onboardingRows } from './onboarding-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'

const ctx = {} as AuthTestContext
const createdUserIds: number[] = []

const PENDING = { response: { status: 'pending' } }
const COMPLETED = { response: { status: 'completed' } }
const DISMISSED = { response: { status: 'dismissed' } }

/** Every test works as an account of its own: the answer is stored per account */
async function newAccount(): Promise<SessionUser> {
  const user = await createSessionUser({ ctx, prefix: 'onb' })
  createdUserIds.push(user.id)
  return user
}

async function apiTokenOf(user: SessionUser): Promise<string> {
  const created = await clientFor(user.access).apiTokens.create({ name: `Onboarding ${Date.now()}` })
  expect(created?.token).toMatch(/^tvk_/)
  return created!.token
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Onboarding org ${Date.now()}` })
  ctx.orgId = org.id
})

afterAll(async () => {
  await deleteUsers(ctx.db, createdUserIds)
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('onboarding state of an account', () => {
  it('is pending for an account that has not answered, and nothing is stored for it', async () => {
    const user = await newAccount()

    const res = await getOnboardingRaw(user.access)

    expect(res.status).toBe(200)
    expect(res.data).toEqual(PENDING)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })

  it('becomes dismissed after the user declines, and stays so on the next read', async () => {
    const user = await newAccount()

    const finished = await finishOnboardingRaw({ token: user.access, body: { status: 'dismissed' } })

    expect(finished.status).toBe(200)
    expect(finished.data).toEqual(DISMISSED)
    expect((await getOnboardingRaw(user.access)).data).toEqual(DISMISSED)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([{ status: 'dismissed' }])
  })

  it('becomes completed after the user finishes the tour, and stays so on the next read', async () => {
    const user = await newAccount()

    const finished = await finishOnboardingRaw({ token: user.access, body: { status: 'completed' } })

    expect(finished.status).toBe(200)
    expect(finished.data).toEqual(COMPLETED)
    expect((await getOnboardingRaw(user.access)).data).toEqual(COMPLETED)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([{ status: 'completed' }])
  })

  it('is the same in a second session of the same account', async () => {
    const user = await newAccount()
    await finishOnboardingRaw({ token: user.access, body: { status: 'dismissed' } })

    const secondSession = await createSecondSession(ctx.db, user)

    expect((await getOnboardingRaw(secondSession)).data).toEqual(DISMISSED)
  })

  it('keeps a repeated answer: sending the same status twice leaves one stored row', async () => {
    const user = await newAccount()

    const first = await finishOnboardingRaw({ token: user.access, body: { status: 'completed' } })
    const second = await finishOnboardingRaw({ token: user.access, body: { status: 'completed' } })

    expect([first.status, second.status]).toEqual([200, 200])
    expect(await onboardingRows(ctx.db, user.id)).toEqual([{ status: 'completed' }])
  })

  it('survives parallel answers: every request succeeds and exactly one row is stored', async () => {
    const user = await newAccount()

    const results = await Promise.all(
      Array.from({ length: 20 }, () => finishOnboardingRaw({ token: user.access, body: { status: 'dismissed' } })),
    )

    expect(results.map((res) => res.status)).toEqual(Array(20).fill(200))
    expect(await onboardingRows(ctx.db, user.id)).toEqual([{ status: 'dismissed' }])
    expect((await getOnboardingRaw(user.access)).data).toEqual(DISMISSED)
  })

  it('is removed together with the account', async () => {
    const user = await newAccount()
    await finishOnboardingRaw({ token: user.access, body: { status: 'completed' } })
    expect(await onboardingRows(ctx.db, user.id)).toHaveLength(1)

    await deleteUsers(ctx.db, [user.id])

    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })
})

describe('onboarding state is per account', () => {
  it('one account answering does not change the state of the others', async () => {
    const decliner = await newAccount()
    const finisher = await newAccount()
    const silent = await newAccount()

    await finishOnboardingRaw({ token: decliner.access, body: { status: 'dismissed' } })
    await finishOnboardingRaw({ token: finisher.access, body: { status: 'completed' } })

    expect((await getOnboardingRaw(decliner.access)).data).toEqual(DISMISSED)
    expect((await getOnboardingRaw(finisher.access)).data).toEqual(COMPLETED)
    expect((await getOnboardingRaw(silent.access)).data).toEqual(PENDING)
    expect(await onboardingRows(ctx.db, silent.id)).toEqual([])
  })

  it.each(['userId', 'user_id', 'id'])('ignores another account passed in the body as %s', async (key) => {
    const attacker = await newAccount()
    const victim = await newAccount()

    const res = await finishOnboardingRaw({ token: attacker.access, body: { status: 'dismissed', [key]: victim.id } })

    expect(res.status).toBe(200)
    expect(res.data).toEqual(DISMISSED)
    expect(await onboardingRows(ctx.db, attacker.id)).toEqual([{ status: 'dismissed' }])
    expect(await onboardingRows(ctx.db, victim.id)).toEqual([])
    expect((await getOnboardingRaw(victim.access)).data).toEqual(PENDING)
  })
})

describe('onboarding endpoints need a signed-in browser session', () => {
  it('GET without a token answers 401', async () => {
    const res = await getOnboardingRaw()

    expect(res.status).toBe(401)
    expect(res.data).not.toHaveProperty('response')
  })

  it('POST finish without a token answers 401', async () => {
    const res = await finishOnboardingRaw({ body: { status: 'dismissed' } })

    expect(res.status).toBe(401)
  })

  it.each([
    ['a made-up JWT', 'aaa.bbb.ccc'],
    ['an unknown API token', `tvk_${'0'.repeat(64)}`],
    ['an empty bearer', ''],
  ])('%s answers 401 on both endpoints', async (_label, token) => {
    const read = await getOnboardingRaw(token || ' ')
    const write = await finishOnboardingRaw({ token: token || ' ', body: { status: 'dismissed' } })

    expect([read.status, write.status]).toEqual([401, 401])
  })

  it('the refresh token of the session is not accepted', async () => {
    const user = await newAccount()

    const read = await getOnboardingRaw(user.refresh)
    const write = await finishOnboardingRaw({ token: user.refresh, body: { status: 'dismissed' } })

    expect([read.status, write.status]).toEqual([401, 401])
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })

  it('an API token of the account is refused on GET', async () => {
    const user = await newAccount()
    const token = await apiTokenOf(user)

    const res = await getOnboardingRaw(token)

    expect(res.status).toBe(403)
    expect(res.data).not.toHaveProperty('response')
  })

  it('an API token of the account is refused on POST finish and stores nothing', async () => {
    const user = await newAccount()
    const token = await apiTokenOf(user)

    const res = await finishOnboardingRaw({ token, body: { status: 'dismissed' } })

    expect(res.status).toBe(403)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
    expect((await getOnboardingRaw(user.access)).data).toEqual(PENDING)
  })

  it('a blocked account is refused', async () => {
    const user = await newAccount()
    await ctx.db.query('update tv_auth.users set block = 1 where id = $1', [user.id])

    const read = await getOnboardingRaw(user.access)
    const write = await finishOnboardingRaw({ token: user.access, body: { status: 'dismissed' } })

    expect([read.status, write.status]).toEqual([401, 401])
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })
})

describe('POST /module/onboarding/finish accepts only completed or dismissed', () => {
  let user: SessionUser

  beforeAll(async () => {
    user = await newAccount()
  })

  it.each([
    ['pending', { status: 'pending' }],
    ['an unknown word', { status: 'skipped' }],
    ['another letter case', { status: 'Completed' }],
    ['a padded value', { status: ' completed ' }],
    ['an empty string', { status: '' }],
    ['null', { status: null }],
    ['a number', { status: 1 }],
    ['a boolean', { status: true }],
    ['an array', { status: ['completed'] }],
    ['an object', { status: { value: 'completed' } }],
    ['a very long string', { status: 'c'.repeat(100_000) }],
    ['no status at all', {}],
    ['the status under another key', { state: 'completed' }],
    ['an array as the body', ['completed']],
  ])('%s → 400, nothing stored', async (_label, body) => {
    const res = await finishOnboardingRaw({ token: user.access, body })

    expect(res.status).toBe(400)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })

  it.each([
    ['broken JSON', '{"status": "completed"'],
    ['a bare JSON string', '"completed"'],
    ['JSON null', 'null'],
    ['an empty body', ''],
  ])('%s → 400, nothing stored', async (_label, body) => {
    const res = await finishOnboardingRaw({ token: user.access, body, raw: true })

    expect(res.status).toBe(400)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })

  it('the account is still pending after every refused request', async () => {
    expect((await getOnboardingRaw(user.access)).data).toEqual(PENDING)
  })
})

describe('tv_auth.user_onboarding', () => {
  it('cannot hold a status other than completed or dismissed', async () => {
    const user = await newAccount()

    const insert = ctx.db.query('insert into tv_auth.user_onboarding (user_id, status) values ($1, $2)', [user.id, 'pending'])

    await expect(insert).rejects.toThrow(/user_onboarding_status_check/)
    expect(await onboardingRows(ctx.db, user.id)).toEqual([])
  })
})

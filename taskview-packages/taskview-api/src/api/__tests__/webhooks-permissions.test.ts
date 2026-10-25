import type { TvApi } from '@/tv'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import type { AuthTestContext } from './auth-test-helpers.types'
import { clientFor } from './start-test-helpers'
import { createWebhookReceiver } from './webhook-receiver'
import type {
  AddMemberArgs,
  MemberTokenArgs,
  WebhooksMember,
  WebhooksPermissionsFixture,
} from './webhooks-permissions.test.types'

/**
 * Webhooks are governed by two independent project permissions: webhooks_can_view
 * lists the webhooks and their delivery history, webhooks_can_manage changes them —
 * managing does not include viewing. Both work for any project member whose role
 * grants them, not only for the owner, and a token narrows them like everywhere else. Every write is verified through the
 * owner session, not only by the status code.
 */
const ctx = {} as AuthTestContext
const fx = {} as WebhooksPermissionsFixture
const receiver = createWebhookReceiver()
const tokenIds: { member: WebhooksMember; id: number }[] = []
let permissionIds: Record<string, number> = {}

const statusOf = async (call: Promise<unknown>) =>
  call.then(() => 200).catch((err) => err.status ?? err.response?.status)

async function freshUser(prefix: string): Promise<WebhooksMember> {
  const user = await createSessionUser({ ctx, prefix })
  return { user, api: clientFor(user.access) }
}

async function addMember(member: WebhooksMember, args: AddMemberArgs): Promise<void> {
  const collab = await fx.owner.api.collaboration.inviteUserToGoal({ goalId: args.goalId, email: member.user.email })
  const role = await fx.owner.api.collaboration.createRoleForGoal({
    goalId: args.goalId,
    roleName: `webhooks-${Date.now()}-${Math.random()}`,
  })
  for (const name of args.permissions) {
    const permissionId = permissionIds[name]
    if (!permissionId) throw new Error(`Permission ${name} is not in the catalogue`)
    const toggled = await fx.owner.api.collaboration.toggleRolePermission({ roleId: role!.id, permissionId })
    expect(toggled!.add).toBe(true)
  }
  await fx.owner.api.collaboration.toggleUserRoles({ goalId: args.goalId, userId: collab!.id, roles: [role!.id] })
}

async function memberToken(args: MemberTokenArgs): Promise<TvApi> {
  const created = await args.member.api.apiTokens.create({
    name: `webhooks-perm-${Date.now()}-${Math.random()}`,
    allowedPermissions: args.allowedPermissions,
    allowedGoalIds: args.allowedGoalIds,
  })
  tokenIds.push({ member: args.member, id: created!.item.id })
  return clientFor(created!.token)
}

async function ownerWebhooks(goalId: number) {
  return (await fx.owner.api.webhooks.fetch(goalId))!
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Webhooks permissions org ${Date.now()}` })
  ctx.orgId = org.id
  await receiver.start()

  fx.owner = await freshUser('whown')
  fx.viewer = await freshUser('whview')
  fx.manager = await freshUser('whman')
  fx.member = await freshUser('whmem')
  fx.fullManager = await freshUser('whfull')

  const catalogue = await fx.owner.api.collaboration.fetchAllPermissions()
  permissionIds = Object.fromEntries(catalogue!.map((p) => [p.name, p.id]))

  const goal = await fx.owner.api.goals.createGoal({ name: `webhooks-permissions-${Date.now()}` })
  fx.goalId = goal!.id!
  const privateGoal = await fx.owner.api.goals.createGoal({ name: `webhooks-private-${Date.now()}` })
  fx.privateGoalId = privateGoal!.id!

  fx.webhookUrl = receiver.getUrl()
  const hook = await fx.owner.api.webhooks.create({ goalId: fx.goalId, url: fx.webhookUrl, events: ['task.created'] })
  fx.webhookId = hook!.webhook.id
  const privateHook = await fx.owner.api.webhooks.create({ goalId: fx.privateGoalId, url: fx.webhookUrl, events: ['task.created'] })
  fx.privateWebhookId = privateHook!.webhook.id

  await fx.owner.api.tasks.createTask({ goalId: fx.goalId, description: `webhooks-permissions-task-${Date.now()}` })
  await receiver.waitForDelivery('task.created', 5000)
  const deliveries = await fx.owner.api.webhooks.fetchDeliveries(fx.webhookId)
  fx.deliveryId = deliveries![0].id

  await addMember(fx.viewer, { goalId: fx.goalId, permissions: ['goal_can_watch_content', 'webhooks_can_view'] })
  await addMember(fx.manager, { goalId: fx.goalId, permissions: ['goal_can_watch_content', 'webhooks_can_manage'] })
  await addMember(fx.member, { goalId: fx.goalId, permissions: ['goal_can_watch_content'] })
  await addMember(fx.fullManager, { goalId: fx.goalId, permissions: ['goal_can_watch_content', 'webhooks_can_view', 'webhooks_can_manage'] })
}, 30000)

afterAll(async () => {
  for (const token of tokenIds) {
    await token.member.api.apiTokens.delete(token.id).catch(() => {})
  }
  for (const goalId of [fx.goalId, fx.privateGoalId]) {
    if (goalId) await fx.owner.api.goals.deleteGoal(goalId).catch(() => {})
  }
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
  await receiver.stop()
})

describe('permission catalogue', () => {
  it('offers webhooks_can_view and webhooks_can_manage in a webhooks group of their own', async () => {
    const catalogue = await fx.owner.api.collaboration.fetchAllPermissions()
    const view = catalogue!.find((p) => p.name === 'webhooks_can_view')
    const manage = catalogue!.find((p) => p.name === 'webhooks_can_manage')

    expect(view?.permissionGroup).toBe(9)
    expect(manage?.permissionGroup).toBe(9)
  })

  it('carries localized descriptions for webhooks_can_view', async () => {
    const catalogue = await fx.owner.api.apiTokens.fetchPermissions()
    const view = catalogue!.find((p) => p.name === 'webhooks_can_view')

    expect(view?.descriptionLocales?.en).toBeTruthy()
    expect(view?.descriptionLocales?.ru).toBeTruthy()
  })

  it('grants both to the project owner', async () => {
    const goal = (await fx.owner.api.goals.fetchGoals())!.find((g) => g.id === fx.goalId)

    expect(goal!.permissions.webhooks_can_view).toBe(true)
    expect(goal!.permissions.webhooks_can_manage).toBe(true)
  })
})

describe('member with webhooks_can_view', () => {
  it('lists the webhooks of the project with the full URL', async () => {
    const hooks = await fx.viewer.api.webhooks.fetch(fx.goalId)

    expect(hooks!.find((h) => h.id === fx.webhookId)?.url).toBe(fx.webhookUrl)
  })

  it('reads the delivery history with payloads', async () => {
    const deliveries = await fx.viewer.api.webhooks.fetchDeliveries(fx.webhookId)
    const delivery = deliveries!.find((d) => d.id === fx.deliveryId)

    expect(delivery?.event).toBe('task.created')
    expect(delivery?.payload).toBeTruthy()
  })

  it('cannot create a webhook', async () => {
    const before = (await ownerWebhooks(fx.goalId)).map((h) => h.id)

    const status = await statusOf(fx.viewer.api.webhooks.create({
      goalId: fx.goalId,
      url: `https://viewer.test/${Date.now()}`,
      events: ['task.created'],
    }))

    expect(status).toBe(403)
    expect((await ownerWebhooks(fx.goalId)).map((h) => h.id)).toEqual(before)
  })

  it('cannot update, rotate, test or delete a webhook, or retry a delivery', async () => {
    const results = await Promise.all([
      statusOf(fx.viewer.api.webhooks.update({ id: fx.webhookId, url: `https://viewer.test/${Date.now()}` })),
      statusOf(fx.viewer.api.webhooks.rotateSecret(fx.webhookId)),
      statusOf(fx.viewer.api.webhooks.testDelivery(fx.webhookId)),
      statusOf(fx.viewer.api.webhooks.retryDelivery(fx.deliveryId)),
      statusOf(fx.viewer.api.webhooks.delete({ id: fx.webhookId })),
    ])

    expect(results).toEqual([403, 403, 403, 403, 403])
    const hook = (await ownerWebhooks(fx.goalId)).find((h) => h.id === fx.webhookId)
    expect(hook!.url).toBe(fx.webhookUrl)
  })
})

describe('member with webhooks_can_manage', () => {
  it('cannot list webhooks or read deliveries without webhooks_can_view', async () => {
    const results = await Promise.all([
      statusOf(fx.manager.api.webhooks.fetch(fx.goalId)),
      statusOf(fx.manager.api.webhooks.fetchDeliveries(fx.webhookId)),
    ])

    expect(results).toEqual([403, 403])
  })

  it('creates, updates, rotates, tests and deletes a webhook', async () => {
    const created = await fx.manager.api.webhooks.create({
      goalId: fx.goalId,
      url: `https://manager.test/${Date.now()}`,
      events: ['task.created'],
    })
    const id = created!.webhook.id
    const newUrl = `https://manager.test/renamed-${Date.now()}`

    await fx.manager.api.webhooks.update({ id, url: newUrl })
    const rotated = await fx.manager.api.webhooks.rotateSecret(id)
    const testStatus = await statusOf(fx.manager.api.webhooks.testDelivery(id))

    expect((await ownerWebhooks(fx.goalId)).find((h) => h.id === id)?.url).toBe(newUrl)
    expect(rotated!.secret).toBeTruthy()
    expect(testStatus).toBe(200)

    await fx.manager.api.webhooks.delete({ id })
    expect((await ownerWebhooks(fx.goalId)).map((h) => h.id)).not.toContain(id)
  })

  it('retries a delivery of the project', async () => {
    const status = await statusOf(fx.manager.api.webhooks.retryDelivery(fx.deliveryId))

    expect(status).toBe(200)
  })

  it('cannot touch a webhook of a project it is not a member of', async () => {
    const results = await Promise.all([
      statusOf(fx.manager.api.webhooks.fetch(fx.privateGoalId)),
      statusOf(fx.manager.api.webhooks.fetchDeliveries(fx.privateWebhookId)),
      statusOf(fx.manager.api.webhooks.update({ id: fx.privateWebhookId, url: `https://manager.test/${Date.now()}` })),
      statusOf(fx.manager.api.webhooks.delete({ id: fx.privateWebhookId })),
    ])

    expect(results).toEqual([403, 403, 403, 403])
    expect((await ownerWebhooks(fx.privateGoalId)).map((h) => h.id)).toContain(fx.privateWebhookId)
  })
})

describe('member with both webhooks_can_view and webhooks_can_manage', () => {
  it('lists webhooks, reads deliveries and creates a webhook', async () => {
    const hooks = await fx.fullManager.api.webhooks.fetch(fx.goalId)
    const deliveries = await fx.fullManager.api.webhooks.fetchDeliveries(fx.webhookId)
    const created = await fx.fullManager.api.webhooks.create({
      goalId: fx.goalId,
      url: `https://full.test/${Date.now()}`,
      events: ['task.created'],
    })

    expect(hooks!.map((h) => h.id)).toContain(fx.webhookId)
    expect(deliveries!.map((d) => d.id)).toContain(fx.deliveryId)
    expect((await ownerWebhooks(fx.goalId)).map((h) => h.id)).toContain(created!.webhook.id)

    await fx.fullManager.api.webhooks.delete({ id: created!.webhook.id })
  })
})

describe('member without webhook permissions', () => {
  it('cannot list webhooks or read deliveries', async () => {
    const results = await Promise.all([
      statusOf(fx.member.api.webhooks.fetch(fx.goalId)),
      statusOf(fx.member.api.webhooks.fetchDeliveries(fx.webhookId)),
    ])

    expect(results).toEqual([403, 403])
  })

  it('cannot create a webhook or retry a delivery', async () => {
    const results = await Promise.all([
      statusOf(fx.member.api.webhooks.create({
        goalId: fx.goalId,
        url: `https://member.test/${Date.now()}`,
        events: ['task.created'],
      })),
      statusOf(fx.member.api.webhooks.retryDelivery(fx.deliveryId)),
    ])

    expect(results).toEqual([403, 403])
  })
})

describe('owner', () => {
  it('retries a delivery of its own webhook', async () => {
    const status = await statusOf(fx.owner.api.webhooks.retryDelivery(fx.deliveryId))

    expect(status).toBe(200)
  })

  it('cannot retry a delivery id of another project through its own webhook', async () => {
    const outsider = await freshUser('whout')
    const outsiderGoal = await outsider.api.goals.createGoal({ name: `webhooks-outsider-${Date.now()}` })
    await outsider.api.webhooks.create({ goalId: outsiderGoal!.id!, url: `https://outsider.test/${Date.now()}`, events: ['task.created'] })

    const status = await statusOf(outsider.api.webhooks.retryDelivery(fx.deliveryId))

    expect(status).toBe(403)
    await outsider.api.goals.deleteGoal(outsiderGoal!.id!).catch(() => {})
  })
})

describe('tokens narrow webhook permissions', () => {
  it('an owner token holding only webhooks_can_view lists but cannot create', async () => {
    const client = await memberToken({ member: fx.owner, allowedPermissions: ['webhooks_can_view'], allowedGoalIds: [fx.goalId] })

    const fetchStatus = await statusOf(client.webhooks.fetch(fx.goalId))
    const createStatus = await statusOf(client.webhooks.create({
      goalId: fx.goalId,
      url: `https://token.test/${Date.now()}`,
      events: ['task.created'],
    }))

    expect(fetchStatus).toBe(200)
    expect(createStatus).toBe(403)
  })

  it('a viewer token asking for webhooks_can_manage still cannot create', async () => {
    const client = await memberToken({ member: fx.viewer, allowedPermissions: ['webhooks_can_manage'], allowedGoalIds: [fx.goalId] })

    const status = await statusOf(client.webhooks.create({
      goalId: fx.goalId,
      url: `https://token.test/${Date.now()}`,
      events: ['task.created'],
    }))

    expect(status).toBe(403)
  })
})

import type { TvApi } from '@/tv'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import type { AuthTestContext } from './auth-test-helpers.types'
import { clientFor } from './start-test-helpers'
import type { RolesScopeFixture, RolesScopeTokenArgs } from './collaboration-roles-token-scope.test.types'

/**
 * Role management (/module/collaborationroles) and webhooks are guarded by project
 * ownership. A token acts as its issuer, so the ownership check alone lets a token
 * issued for project A, or a read-only token, create, delete and rewire roles —
 * and manage webhooks — in every project the issuer owns. These tests pin the
 * token scope on top of ownership: the goal must be in allowedGoalIds and the
 * matching permission must survive the token's allowedPermissions.
 *
 * Every write is verified through the owner session, not only by the status code.
 */
const ctx = {} as AuthTestContext
const fx = {} as RolesScopeFixture
const tokenIds: number[] = []

async function tokenClient(args: RolesScopeTokenArgs): Promise<TvApi> {
  const created = await fx.ownerApi.apiTokens.create({
    name: `roles-scope-${Date.now()}-${Math.random()}`,
    allowedPermissions: args.allowedPermissions,
    allowedGoalIds: args.allowedGoalIds,
  })
  tokenIds.push(created!.item.id)
  return clientFor(created!.token)
}

const statusOf = async (call: Promise<unknown>) =>
  call.then(() => 200).catch((err) => err.status ?? err.response?.status)

async function freshRole(goalId: number): Promise<number> {
  const role = await fx.ownerApi.collaboration.createRoleForGoal({ goalId, roleName: `scope-role-${Date.now()}-${Math.random()}` })
  return role!.id
}

async function rolePermissionIds(goalId: number, roleId: number): Promise<number[]> {
  const matrix = await fx.ownerApi.collaboration.fetchRoleToPermissionsForGoal(goalId)
  return matrix!
    .filter((r) => r.roleId === roleId)
    .map((r) => r.permissionId)
    .filter((id): id is number => id !== null)
}

async function roleNames(goalId: number): Promise<string[]> {
  return (await fx.ownerApi.collaboration.fetchRolesForGoal(goalId))!.map((r) => r.name)
}

async function roleIds(goalId: number): Promise<number[]> {
  return (await fx.ownerApi.collaboration.fetchRolesForGoal(goalId))!.map((r) => r.id)
}

async function webhookIds(goalId: number): Promise<number[]> {
  return (await fx.ownerApi.webhooks.fetch(goalId))!.map((w) => w.id)
}

async function firstDeliveryId(webhookId: number): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const deliveries = await fx.ownerApi.webhooks.fetchDeliveries(webhookId)
    if (deliveries?.length) return deliveries[0].id
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`no delivery recorded for webhook ${webhookId}`)
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Roles scope org ${Date.now()}` })
  ctx.orgId = org.id

  fx.owner = await createSessionUser({ ctx, prefix: 'roles' })
  fx.ownerApi = clientFor(fx.owner.access)

  const permissions = await fx.ownerApi.collaboration.fetchAllPermissions()
  fx.watchContentPermissionId = permissions!.find((p) => p.name === 'goal_can_watch_content')!.id

  for (const key of ['projectA', 'projectB'] as const) {
    const goal = await fx.ownerApi.goals.createGoal({ name: `roles-scope-${key}-${Date.now()}` })
    const hook = await fx.ownerApi.webhooks.create({
      goalId: goal!.id!,
      url: `https://receiver.test/${key}-${Date.now()}`,
      events: ['task.created'],
    })
    fx[key] = { goalId: goal!.id!, webhookId: hook!.webhook.id }
  }
})

afterAll(async () => {
  for (const id of tokenIds) {
    await fx.ownerApi.apiTokens.delete(id).catch(() => {})
  }
  for (const project of [fx.projectA, fx.projectB]) {
    if (project) await fx.ownerApi.goals.deleteGoal(project.goalId).catch(() => {})
  }
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('toggling a role permission', () => {
  it('denies a token restricted to another project and leaves the role unchanged', async () => {
    const client = await tokenClient({ allowedPermissions: [], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectB.goalId)

    const status = await statusOf(client.collaboration.toggleRolePermission({ roleId, permissionId: fx.watchContentPermissionId }))

    expect(status).toBe(403)
    expect(await rolePermissionIds(fx.projectB.goalId, roleId)).toEqual([])
  })

  it('denies a read-only token in its own project and leaves the role unchanged', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_watch_content'], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectA.goalId)

    const status = await statusOf(client.collaboration.toggleRolePermission({ roleId, permissionId: fx.watchContentPermissionId }))

    expect(status).toBe(403)
    expect(await rolePermissionIds(fx.projectA.goalId, roleId)).toEqual([])
  })

  it('allows a token holding goal_can_manage_users on the project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_manage_users'], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectA.goalId)

    const toggled = await client.collaboration.toggleRolePermission({ roleId, permissionId: fx.watchContentPermissionId })

    expect(toggled!.add).toBe(true)
    expect(await rolePermissionIds(fx.projectA.goalId, roleId)).toEqual([fx.watchContentPermissionId])
  })

  it('allows an unrestricted token in any owned project', async () => {
    const client = await tokenClient({ allowedPermissions: [], allowedGoalIds: [] })
    const roleId = await freshRole(fx.projectB.goalId)

    const toggled = await client.collaboration.toggleRolePermission({ roleId, permissionId: fx.watchContentPermissionId })

    expect(toggled!.add).toBe(true)
  })

  it('allows the owner session', async () => {
    const roleId = await freshRole(fx.projectB.goalId)

    const toggled = await fx.ownerApi.collaboration.toggleRolePermission({ roleId, permissionId: fx.watchContentPermissionId })

    expect(toggled!.add).toBe(true)
  })
})

describe('creating a role', () => {
  it('denies a token restricted to another project', async () => {
    const client = await tokenClient({ allowedPermissions: [], allowedGoalIds: [fx.projectA.goalId] })
    const roleName = `denied-${Date.now()}`

    const status = await statusOf(client.collaboration.createRoleForGoal({ goalId: fx.projectB.goalId, roleName }))

    expect(status).toBe(403)
    expect(await roleNames(fx.projectB.goalId)).not.toContain(roleName)
  })

  it('denies a read-only token in its own project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_watch_content'], allowedGoalIds: [fx.projectA.goalId] })
    const roleName = `read-only-${Date.now()}`

    const status = await statusOf(client.collaboration.createRoleForGoal({ goalId: fx.projectA.goalId, roleName }))

    expect(status).toBe(403)
    expect(await roleNames(fx.projectA.goalId)).not.toContain(roleName)
  })

  it('allows a token holding goal_can_manage_users on the project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_manage_users'], allowedGoalIds: [fx.projectA.goalId] })
    const roleName = `allowed-${Date.now()}`

    const role = await client.collaboration.createRoleForGoal({ goalId: fx.projectA.goalId, roleName })

    expect(role!.id).toBeGreaterThan(0)
    expect(await roleNames(fx.projectA.goalId)).toContain(roleName)
  })
})

describe('deleting a role', () => {
  it('denies a token restricted to another project and keeps the role', async () => {
    const client = await tokenClient({ allowedPermissions: [], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectB.goalId)

    const status = await statusOf(client.collaboration.deleteRoleFromGoal({ goalId: fx.projectB.goalId, id: roleId }))

    expect(status).toBe(403)
    expect(await roleIds(fx.projectB.goalId)).toContain(roleId)
  })

  it('denies a read-only token in its own project and keeps the role', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_watch_content'], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectA.goalId)

    const status = await statusOf(client.collaboration.deleteRoleFromGoal({ goalId: fx.projectA.goalId, id: roleId }))

    expect(status).toBe(403)
    expect(await roleIds(fx.projectA.goalId)).toContain(roleId)
  })

  it('allows a token holding goal_can_manage_users on the project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_manage_users'], allowedGoalIds: [fx.projectA.goalId] })
    const roleId = await freshRole(fx.projectA.goalId)

    const deleted = await client.collaboration.deleteRoleFromGoal({ goalId: fx.projectA.goalId, id: roleId })

    expect(deleted).toBe(true)
    expect(await roleIds(fx.projectA.goalId)).not.toContain(roleId)
  })
})

describe('reading the role-to-permission matrix', () => {
  it('denies a token restricted to another project', async () => {
    const client = await tokenClient({ allowedPermissions: [], allowedGoalIds: [fx.projectA.goalId] })

    const status = await statusOf(client.collaboration.fetchRoleToPermissionsForGoal(fx.projectB.goalId))

    expect(status).toBe(403)
  })

  it('denies a read-only token in its own project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_watch_content'], allowedGoalIds: [fx.projectA.goalId] })

    const status = await statusOf(client.collaboration.fetchRoleToPermissionsForGoal(fx.projectA.goalId))

    expect(status).toBe(403)
  })

  it('allows a token holding goal_can_manage_users on the project', async () => {
    const client = await tokenClient({ allowedPermissions: ['goal_can_manage_users'], allowedGoalIds: [fx.projectA.goalId] })

    const status = await statusOf(client.collaboration.fetchRoleToPermissionsForGoal(fx.projectA.goalId))

    expect(status).toBe(200)
  })
})

describe('webhooks with a token holding webhooks_can_view and webhooks_can_manage for project A only', () => {
  let client: TvApi

  beforeAll(async () => {
    client = await tokenClient({ allowedPermissions: ['webhooks_can_view', 'webhooks_can_manage'], allowedGoalIds: [fx.projectA.goalId] })
  })

  it('manages webhooks of project A', async () => {
    const fetchStatus = await statusOf(client.webhooks.fetch(fx.projectA.goalId))
    const created = await client.webhooks.create({
      goalId: fx.projectA.goalId,
      url: `https://receiver.test/a-${Date.now()}`,
      events: ['task.created'],
    })

    expect(fetchStatus).toBe(200)
    expect(await webhookIds(fx.projectA.goalId)).toContain(created!.webhook.id)
  })

  it('cannot list webhooks of project B', async () => {
    expect(await statusOf(client.webhooks.fetch(fx.projectB.goalId))).toBe(403)
  })

  it('cannot create a webhook in project B', async () => {
    const before = await webhookIds(fx.projectB.goalId)

    const status = await statusOf(client.webhooks.create({
      goalId: fx.projectB.goalId,
      url: `https://exfiltration.test/${Date.now()}`,
      events: ['task.created'],
    }))

    expect(status).toBe(403)
    expect(await webhookIds(fx.projectB.goalId)).toEqual(before)
  })

  it('cannot update, rotate, test or read deliveries of a project B webhook', async () => {
    const id = fx.projectB.webhookId

    const results = await Promise.all([
      statusOf(client.webhooks.update({ id, url: `https://exfiltration.test/${Date.now()}` })),
      statusOf(client.webhooks.rotateSecret(id)),
      statusOf(client.webhooks.testDelivery(id)),
      statusOf(client.webhooks.fetchDeliveries(id)),
    ])

    expect(results).toEqual([403, 403, 403, 403])
    const hook = (await fx.ownerApi.webhooks.fetch(fx.projectB.goalId))!.find((w) => w.id === id)
    expect(hook!.url).toMatch(/^https:\/\/receiver\.test\//)
  })

  it('cannot retry a delivery of a project B webhook', async () => {
    await fx.ownerApi.tasks.createTask({ goalId: fx.projectB.goalId, description: `roles-scope-b-task-${Date.now()}` })
    const deliveryId = await firstDeliveryId(fx.projectB.webhookId)

    const status = await statusOf(client.webhooks.retryDelivery(deliveryId))

    expect(status).toBe(403)
  })

  it('cannot delete a project B webhook', async () => {
    const status = await statusOf(client.webhooks.delete({ id: fx.projectB.webhookId }))

    expect(status).toBe(403)
    expect(await webhookIds(fx.projectB.goalId)).toContain(fx.projectB.webhookId)
  })
})

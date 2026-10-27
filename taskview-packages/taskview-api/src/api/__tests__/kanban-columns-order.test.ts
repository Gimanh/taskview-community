import type { TvApi } from '@/tv'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import type { AuthTestContext } from './auth-test-helpers.types'
import { clientFor } from './start-test-helpers'
import type {
  KanbanOrderMember,
  KanbanOrderProject,
  KanbanOrderShareArgs,
  KanbanOrderTokenArgs,
} from './kanban-columns-order.test.types'

/**
 * Kanban columns are shown in their saved position (view_order), not in creation
 * order. A project starts with TODO, In Progress, Done; a new column goes last; the
 * whole order is saved at once by PATCH /module/kanban/reorder-statuses, which
 * needs kanban_can_manage and must list every column of the project exactly once.
 */
const ctx = {} as AuthTestContext
const goalIds: number[] = []
const tokenIds: number[] = []
let owner: KanbanOrderMember
let viewer: KanbanOrderMember
let manager: KanbanOrderMember
let permissionIdByName: Map<string, number>

const statusOf = async (call: Promise<unknown>) =>
  call.then(() => 200).catch((err) => err.status ?? err.response?.status)

async function freshMember(prefix: string): Promise<KanbanOrderMember> {
  const user = await createSessionUser({ ctx, prefix })
  return { user, api: clientFor(user.access) }
}

async function newProject(): Promise<KanbanOrderProject> {
  const goal = await owner.api.goals.createGoal({ name: `kanban-order-${Date.now()}-${Math.random()}` })
  goalIds.push(goal!.id!)
  const columns = await owner.api.kanban.fetchAllColumns(goal!.id!)
  return { goalId: goal!.id!, columnIds: columns!.map((c) => c.id) }
}

async function columnIds(goalId: number): Promise<number[]> {
  return (await owner.api.kanban.fetchAllColumns(goalId))!.map((c) => c.id)
}

async function share(args: KanbanOrderShareArgs): Promise<void> {
  const collab = await owner.api.collaboration.inviteUserToGoal({ goalId: args.goalId, email: args.member.user.email })
  const role = await owner.api.collaboration.createRoleForGoal({ goalId: args.goalId, roleName: `kanban-order-${Date.now()}` })
  for (const name of args.permissions) {
    await owner.api.collaboration.toggleRolePermission({ roleId: role!.id, permissionId: permissionIdByName.get(name)! })
  }
  await owner.api.collaboration.toggleUserRoles({ goalId: args.goalId, userId: collab!.id, roles: [role!.id] })
}

async function ownerToken(args: KanbanOrderTokenArgs): Promise<TvApi> {
  const created = await owner.api.apiTokens.create({
    name: `kanban-order-${Date.now()}-${Math.random()}`,
    allowedPermissions: args.allowedPermissions,
    allowedGoalIds: args.allowedGoalIds,
  })
  tokenIds.push(created!.item.id)
  return clientFor(created!.token)
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Kanban order org ${Date.now()}` })
  ctx.orgId = org.id

  owner = await freshMember('kbown')
  viewer = await freshMember('kbview')
  manager = await freshMember('kbman')
  const catalogue = await owner.api.collaboration.fetchAllPermissions()
  permissionIdByName = new Map(catalogue!.map((p) => [p.name, p.id]))
})

afterAll(async () => {
  for (const id of tokenIds) await owner.api.apiTokens.delete(id).catch(() => {})
  for (const id of goalIds) await owner.api.goals.deleteGoal(id).catch(() => {})
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('default columns', () => {
  it('a new project starts with TODO, In Progress, Done in that order', async () => {
    const p = await newProject()
    const columns = await owner.api.kanban.fetchAllColumns(p.goalId)

    expect(columns!.map((c) => c.name)).toEqual(['TODO', 'In Progress', 'Done'])
    expect(columns!.map((c) => c.viewOrder)).toEqual([1, 2, 3])
  })

  it('a column added later goes last', async () => {
    const p = await newProject()
    const added = await owner.api.kanban.addColumn({ goalId: p.goalId, name: 'Review' })

    expect(await columnIds(p.goalId)).toEqual([...p.columnIds, added!.id])
  })
})

describe('reordering', () => {
  it('saves the new order and answers with it', async () => {
    const p = await newProject()
    const [todo, inProgress, done] = p.columnIds

    const saved = await owner.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: [done, todo, inProgress] })

    expect(saved.map((c) => c.id)).toEqual([done, todo, inProgress])
    expect(saved.map((c) => c.viewOrder)).toEqual([1, 2, 3])
    expect(await columnIds(p.goalId)).toEqual([done, todo, inProgress])
  })

  it('still puts a column added after a reorder last', async () => {
    const p = await newProject()
    const [todo, inProgress, done] = p.columnIds
    await owner.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: [inProgress, done, todo] })

    const added = await owner.api.kanban.addColumn({ goalId: p.goalId, name: 'Archive' })

    expect(await columnIds(p.goalId)).toEqual([inProgress, done, todo, added!.id])
  })

  it('refuses an order that leaves a column out', async () => {
    const p = await newProject()
    const [todo, inProgress] = p.columnIds

    const status = await statusOf(owner.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: [inProgress, todo] }))

    expect(status).toBe(400)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
  })

  it('refuses an order that repeats a column', async () => {
    const p = await newProject()
    const [todo, inProgress] = p.columnIds

    const status = await statusOf(owner.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: [todo, todo, inProgress] }))

    expect(status).toBe(400)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
  })

  it('refuses a column of another project', async () => {
    const p = await newProject()
    const other = await newProject()
    const [todo, inProgress] = p.columnIds

    const status = await statusOf(owner.api.kanban.reorderColumns({
      goalId: p.goalId,
      statusIds: [todo, inProgress, other.columnIds[0]],
    }))

    expect(status).toBe(400)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
    expect(await columnIds(other.goalId)).toEqual(other.columnIds)
  })
})

describe('who may reorder', () => {
  it('denies a member with kanban_can_view only', async () => {
    const p = await newProject()
    await share({ goalId: p.goalId, member: viewer, permissions: ['kanban_can_view'] })

    const status = await statusOf(viewer.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: [...p.columnIds].reverse() }))

    expect(status).toBe(403)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
  })

  it('allows a member with kanban_can_manage', async () => {
    const p = await newProject()
    await share({ goalId: p.goalId, member: manager, permissions: ['kanban_can_manage'] })
    const reversed = [...p.columnIds].reverse()

    const status = await statusOf(manager.api.kanban.reorderColumns({ goalId: p.goalId, statusIds: reversed }))

    expect(status).toBe(200)
    expect(await columnIds(p.goalId)).toEqual(reversed)
  })

  it('denies an owner token holding kanban_can_view only', async () => {
    const p = await newProject()
    const client = await ownerToken({ allowedPermissions: ['kanban_can_view'], allowedGoalIds: [p.goalId] })

    const status = await statusOf(client.kanban.reorderColumns({ goalId: p.goalId, statusIds: [...p.columnIds].reverse() }))

    expect(status).toBe(403)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
  })

  it('denies an owner token restricted to another project', async () => {
    const p = await newProject()
    const other = await newProject()
    const client = await ownerToken({ allowedPermissions: [], allowedGoalIds: [other.goalId] })

    const status = await statusOf(client.kanban.reorderColumns({ goalId: p.goalId, statusIds: [...p.columnIds].reverse() }))

    expect(status).toBe(403)
    expect(await columnIds(p.goalId)).toEqual(p.columnIds)
  })
})

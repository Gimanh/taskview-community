import type { TvApi } from '@/tv'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { ymd } from './test-helpers'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import type { AuthTestContext } from './auth-test-helpers.types'
import {
  clientFor,
  fetchCollaborators,
  fetchLists,
  fetchState,
  fetchTags,
  rawGet,
  searchTasks,
  stateTaskIds,
} from './start-test-helpers'
import type { ScopedToken, ScopedTokenArgs, StartScopeFixture } from './start-token-scope.test.types'

/**
 * The main screen routes (/module/about/*) and the cross-project collaborator and
 * tag lists build their project set from "every project I own or that is shared
 * with me" and never intersect it with the API token's allowedGoalIds or
 * allowedPermissions. A token issued for one project therefore reads tasks, notes,
 * collaborator emails, list names and tags of the issuer's other projects, while
 * the ordinary task and goal routes deny the same token.
 *
 * The owner is a fresh account so the LIMIT 30 of the start queries cannot push
 * the fixture tasks out and make a leak look like a pass.
 */
const ctx = {} as AuthTestContext
const fx = {} as StartScopeFixture
const tokenIds: number[] = []
let otherUserApi: TvApi
let user2Email: string

async function issueToken(args: ScopedTokenArgs): Promise<ScopedToken> {
  const created = await fx.ownerApi.apiTokens.create({
    name: `start-scope-${Date.now()}-${Math.random()}`,
    allowedPermissions: args.allowedPermissions,
    allowedGoalIds: args.allowedGoalIds,
  })
  tokenIds.push(created!.item.id)
  return { token: created!.token, api: clientFor(created!.token) }
}

function excludedTaskIds(): number[] {
  return [
    fx.projectB.activeTaskId,
    fx.projectB.todayTaskId,
    fx.projectB.upcomingTaskId,
    fx.projectB.completedTaskId,
    fx.projectC.activeTaskId,
  ]
}

beforeAll(async () => {
  const init = await initApi()
  otherUserApi = init.$tvApi
  user2Email = init.user2Email
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Start scope org ${Date.now()}` })
  ctx.orgId = org.id

  fx.marker = `TVSCOPE${Date.now()}`
  fx.owner = await createSessionUser({ ctx, prefix: 'scope' })
  fx.ownerApi = clientFor(fx.owner.access)

  const goalA = await fx.ownerApi.goals.createGoal({ name: `${fx.marker}_A` })
  const listA = await fx.ownerApi.goalLists.createList({ goalId: goalA!.id!, name: `${fx.marker}_LIST_A` })
  const tagA = await fx.ownerApi.tags.createTag({ goalId: goalA!.id!, name: `${fx.marker}_TAG_A`, color: '#00aa00' })
  const taskA = await fx.ownerApi.tasks.createTask({
    goalId: goalA!.id!,
    description: `${fx.marker}_TASK_A`,
    note: `${fx.marker}_NOTE_A`,
  })
  const collabA = await fx.ownerApi.collaboration.inviteUserToGoal({ goalId: goalA!.id!, email: user2Email })
  await fx.ownerApi.tasks.toggleTasksAssignee({ taskId: taskA!.id, userIds: [collabA!.id] })
  fx.projectA = {
    goalId: goalA!.id!,
    listId: listA!.id,
    tagId: tagA!.id,
    activeTaskId: taskA!.id,
    collaboratorId: collabA!.id,
  }

  const goalB = await fx.ownerApi.goals.createGoal({ name: `${fx.marker}_B` })
  const goalBId = goalB!.id!
  const listB = await fx.ownerApi.goalLists.createList({ goalId: goalBId, name: `${fx.marker}_LIST_B` })
  const tagB = await fx.ownerApi.tags.createTag({ goalId: goalBId, name: `${fx.marker}_TAG_B`, color: '#aa0000' })
  const collaboratorEmail = `scope-collab-${Date.now()}@leak.example`
  const collabB = await fx.ownerApi.collaboration.inviteUserToGoal({ goalId: goalBId, email: collaboratorEmail })
  const activeB = await fx.ownerApi.tasks.createTask({
    goalId: goalBId,
    description: `${fx.marker}_TASK_B_ACTIVE`,
    note: `${fx.marker}_NOTE_B`,
  })
  await fx.ownerApi.tasks.toggleTasksAssignee({ taskId: activeB!.id, userIds: [collabB!.id] })
  const todayB = await fx.ownerApi.tasks.createTask({ goalId: goalBId, description: `${fx.marker}_TASK_B_TODAY` })
  await fx.ownerApi.tasks.updateTask({ id: todayB!.id, endDate: ymd(0) })
  const upcomingB = await fx.ownerApi.tasks.createTask({ goalId: goalBId, description: `${fx.marker}_TASK_B_UPCOMING` })
  await fx.ownerApi.tasks.updateTask({ id: upcomingB!.id, endDate: ymd(7) })
  const completedB = await fx.ownerApi.tasks.createTask({ goalId: goalBId, description: `${fx.marker}_TASK_B_DONE` })
  await fx.ownerApi.tasks.updateTask({ id: completedB!.id, complete: true })
  fx.projectB = {
    goalId: goalBId,
    listId: listB!.id,
    tagId: tagB!.id,
    activeTaskId: activeB!.id,
    todayTaskId: todayB!.id,
    upcomingTaskId: upcomingB!.id,
    completedTaskId: completedB!.id,
    collaboratorEmail,
  }

  const goalC = await otherUserApi.goals.createGoal({ name: `${fx.marker}_C` })
  const goalCId = goalC!.id!
  const listC = await otherUserApi.goalLists.createList({ goalId: goalCId, name: `${fx.marker}_LIST_C` })
  const tagC = await otherUserApi.tags.createTag({ goalId: goalCId, name: `${fx.marker}_TAG_C`, color: '#0000aa' })
  const taskC = await otherUserApi.tasks.createTask({
    goalId: goalCId,
    description: `${fx.marker}_TASK_C`,
    note: `${fx.marker}_NOTE_C`,
  })
  const ownerInC = await otherUserApi.collaboration.inviteUserToGoal({ goalId: goalCId, email: fx.owner.email })
  const rolesC = await otherUserApi.collaboration.fetchRolesForGoal(goalCId)
  const editorC = rolesC!.find((r) => r.name === 'editor')
  await otherUserApi.collaboration.toggleUserRoles({ goalId: goalCId, userId: ownerInC!.id, roles: [editorC!.id] })
  fx.projectC = {
    goalId: goalCId,
    listId: listC!.id,
    tagId: tagC!.id,
    activeTaskId: taskC!.id,
  }
})

afterAll(async () => {
  for (const id of tokenIds) {
    await fx.ownerApi.apiTokens.delete(id).catch(() => {})
  }
  for (const goalId of [fx.projectA?.goalId, fx.projectB?.goalId]) {
    if (goalId) await fx.ownerApi.goals.deleteGoal(goalId).catch(() => {})
  }
  if (fx.projectC?.goalId) await otherUserApi.goals.deleteGoal(fx.projectC.goalId).catch(() => {})
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('fixture sanity: the owner session sees all three projects', () => {
  it('fetchallstate holds every fixture task, note and assignee', async () => {
    const state = await fetchState(fx.owner.access)
    const ids = stateTaskIds(state)

    expect(ids).toContain(fx.projectA.activeTaskId)
    for (const id of excludedTaskIds()) expect(ids).toContain(id)
    expect(state.tasks.find((t) => t.id === fx.projectB.activeTaskId)?.note).toBe(`${fx.marker}_NOTE_B`)
    expect(state.assignees.some((a) => a.taskId === fx.projectB.activeTaskId)).toBe(true)
    expect(state.users.find((g) => g.id === fx.projectB.goalId)?.users.map((u) => u.email))
      .toContain(fx.projectB.collaboratorEmail)
  })

  it('search, lists, collaborators and tags cover all three projects', async () => {
    const found = (await searchTasks(fx.owner.access, fx.marker)).map((t) => t.id)
    const lists = (await fetchLists(fx.owner.access)).map((l) => l.listId)
    const collaboratorGoals = (await fetchCollaborators(fx.owner.access)).map((c) => c.goalId)
    const tags = (await fetchTags(fx.owner.access)).map((t) => t.id)

    expect(found).toEqual(expect.arrayContaining([fx.projectA.activeTaskId, fx.projectB.activeTaskId, fx.projectC.activeTaskId]))
    expect(lists).toEqual(expect.arrayContaining([fx.projectA.listId, fx.projectB.listId, fx.projectC.listId]))
    expect(collaboratorGoals).toEqual(expect.arrayContaining([fx.projectA.goalId, fx.projectB.goalId, fx.projectC.goalId]))
    expect(tags).toEqual(expect.arrayContaining([fx.projectA.tagId, fx.projectB.tagId, fx.projectC.tagId]))
  })
})

describe('token restricted to project A (all permissions)', () => {
  let scoped: ScopedToken

  beforeAll(async () => {
    scoped = await issueToken({ allowedPermissions: [], allowedGoalIds: [fx.projectA.goalId] })
  })

  it('is denied by the ordinary goal and task routes for B and C', async () => {
    const goals = (await scoped.api.goals.fetchGoals())!.map((g) => g.id)
    const directB = await rawGet({ token: scoped.token, path: `/module/tasks/${fx.projectB.activeTaskId}` })
    const directC = await rawGet({ token: scoped.token, path: `/module/tasks/${fx.projectC.activeTaskId}` })

    expect(goals).toEqual([fx.projectA.goalId])
    expect(directB.status).toBe(403)
    expect(directC.status).toBe(403)
  })

  it('fetchallstate keeps project A tasks', async () => {
    const state = await fetchState(scoped.token)

    expect(state.tasks.map((t) => t.id)).toContain(fx.projectA.activeTaskId)
  })

  it('fetchallstate does not return active tasks of B or C', async () => {
    const ids = (await fetchState(scoped.token)).tasks.map((t) => t.id)

    expect(ids).not.toContain(fx.projectB.activeTaskId)
    expect(ids).not.toContain(fx.projectC.activeTaskId)
  })

  it('fetchallstate does not leak B notes anywhere in the payload', async () => {
    const state = await fetchState(scoped.token)

    expect(JSON.stringify(state)).not.toContain(`${fx.marker}_NOTE_B`)
    expect(JSON.stringify(state)).not.toContain(`${fx.marker}_NOTE_C`)
  })

  it('fetchallstate does not return B tasks in the today bucket', async () => {
    const ids = (await fetchState(scoped.token)).tasksToday.map((t) => t.id)

    expect(ids).not.toContain(fx.projectB.todayTaskId)
  })

  it('fetchallstate does not return B tasks in the upcoming bucket', async () => {
    const ids = (await fetchState(scoped.token)).tasksUpcoming.map((t) => t.id)

    expect(ids).not.toContain(fx.projectB.upcomingTaskId)
  })

  it('fetchallstate does not return B tasks in the last completed bucket', async () => {
    const ids = (await fetchState(scoped.token)).tasksLastCompleted.map((t) => t.id)

    expect(ids).not.toContain(fx.projectB.completedTaskId)
  })

  it('fetchallstate keeps A assignees but drops assignees of B tasks', async () => {
    const state = await fetchState(scoped.token)

    expect(state.assignees.some((a) => a.taskId === fx.projectA.activeTaskId)).toBe(true)
    expect(state.assignees.some((a) => a.taskId === fx.projectB.activeTaskId)).toBe(false)
  })

  it('fetchallstate does not disclose B collaborators and their emails', async () => {
    const state = await fetchState(scoped.token)

    expect(state.users.map((g) => g.id)).not.toContain(fx.projectB.goalId)
    expect(JSON.stringify(state)).not.toContain(fx.projectB.collaboratorEmail)
  })

  it('search-task finds A tasks only', async () => {
    const ids = (await searchTasks(scoped.token, fx.marker)).map((t) => t.id)

    expect(ids).toContain(fx.projectA.activeTaskId)
    expect(ids).not.toContain(fx.projectB.activeTaskId)
    expect(ids).not.toContain(fx.projectC.activeTaskId)
  })

  it('search-task by #id does not return a B task', async () => {
    const found = await searchTasks(scoped.token, `#${fx.projectB.activeTaskId}`)

    expect(found).toEqual([])
  })

  it('fetch/lists returns A lists only', async () => {
    const rows = await fetchLists(scoped.token)

    expect(rows.map((r) => r.listId)).toContain(fx.projectA.listId)
    expect(rows.map((r) => r.goalId)).not.toContain(fx.projectB.goalId)
    expect(rows.map((r) => r.goalId)).not.toContain(fx.projectC.goalId)
  })

  it('collaboration list returns A collaborators only', async () => {
    const goalIds = (await fetchCollaborators(scoped.token)).map((c) => c.goalId)

    expect(goalIds).toContain(fx.projectA.goalId)
    expect(goalIds).not.toContain(fx.projectB.goalId)
    expect(goalIds).not.toContain(fx.projectC.goalId)
  })

  it('tags list returns A tags only', async () => {
    const tagIds = (await fetchTags(scoped.token)).map((t) => t.id)

    expect(tagIds).toContain(fx.projectA.tagId)
    expect(tagIds).not.toContain(fx.projectB.tagId)
    expect(tagIds).not.toContain(fx.projectC.tagId)
  })
})

describe('token from the report: goal_can_watch_content + component_can_watch_content on A', () => {
  let scoped: ScopedToken

  beforeAll(async () => {
    scoped = await issueToken({
      allowedPermissions: ['goal_can_watch_content', 'component_can_watch_content'],
      allowedGoalIds: [fx.projectA.goalId],
    })
  })

  it('fetchallstate and search-task return no B or C tasks', async () => {
    const stateIds = stateTaskIds(await fetchState(scoped.token))
    const searchIds = (await searchTasks(scoped.token, fx.marker)).map((t) => t.id)

    for (const id of excludedTaskIds()) {
      expect(stateIds).not.toContain(id)
      expect(searchIds).not.toContain(id)
    }
  })

  it('fetchallstate serializes an A task the same way the task route does for this token', async () => {
    const direct = await scoped.api.tasks.fetchTaskById(fx.projectA.activeTaskId)
    const fromStart = (await fetchState(scoped.token)).tasks.find((t) => t.id === fx.projectA.activeTaskId)

    expect(fromStart).toBeDefined()
    expect(direct!.note).not.toBe(`${fx.marker}_NOTE_A`)
    expect(fromStart!.note).toBe(direct!.note)
  })

  it('search-task does not return the A note without task_can_watch_note', async () => {
    const fromSearch = (await searchTasks(scoped.token, fx.marker)).find((t) => t.id === fx.projectA.activeTaskId)

    expect(fromSearch).toBeDefined()
    expect(fromSearch!.note).not.toBe(`${fx.marker}_NOTE_A`)
  })

  it('fetchallstate does not expose assignees or collaborator emails without the matching permissions', async () => {
    const state = await fetchState(scoped.token)

    expect(state.assignees).toEqual([])
    expect(state.users.flatMap((g) => g.users)).toEqual([])
  })

  it('tags list returns nothing without task_can_watch_tags', async () => {
    const tagIds = (await fetchTags(scoped.token)).map((t) => t.id)

    expect(tagIds).not.toContain(fx.projectA.tagId)
    expect(tagIds).not.toContain(fx.projectB.tagId)
  })
})

describe('list-only token: goal_can_watch_content on B', () => {
  let scoped: ScopedToken

  beforeAll(async () => {
    scoped = await issueToken({ allowedPermissions: ['goal_can_watch_content'], allowedGoalIds: [fx.projectB.goalId] })
  })

  it('is denied by the ordinary task route', async () => {
    const direct = await rawGet({ token: scoped.token, path: `/module/tasks/${fx.projectB.activeTaskId}` })

    expect(direct.status).toBe(403)
  })

  it('may still see B lists, which goal_can_watch_content grants', async () => {
    const rows = await fetchLists(scoped.token)

    expect(rows.map((r) => r.listId)).toContain(fx.projectB.listId)
  })

  it('fetchallstate returns no B task in any bucket', async () => {
    const ids = stateTaskIds(await fetchState(scoped.token))

    expect(ids).not.toContain(fx.projectB.activeTaskId)
    expect(ids).not.toContain(fx.projectB.todayTaskId)
    expect(ids).not.toContain(fx.projectB.upcomingTaskId)
    expect(ids).not.toContain(fx.projectB.completedTaskId)
  })

  it('fetchallstate does not leak the B note', async () => {
    const state = await fetchState(scoped.token)

    expect(JSON.stringify(state)).not.toContain(`${fx.marker}_NOTE_B`)
  })

  it('fetchallstate does not expose B assignees or collaborator emails', async () => {
    const state = await fetchState(scoped.token)

    expect(state.assignees.some((a) => a.taskId === fx.projectB.activeTaskId)).toBe(false)
    expect(JSON.stringify(state)).not.toContain(fx.projectB.collaboratorEmail)
  })

  it('search-task returns no B task', async () => {
    const ids = (await searchTasks(scoped.token, fx.marker)).map((t) => t.id)

    expect(ids).not.toContain(fx.projectB.activeTaskId)
  })

  it('collaboration list does not expose B collaborators without user permissions', async () => {
    const collaborators = await fetchCollaborators(scoped.token)

    expect(collaborators.map((c) => c.email)).not.toContain(fx.projectB.collaboratorEmail)
  })

  it('tags list does not return B tags without task_can_watch_tags', async () => {
    const tagIds = (await fetchTags(scoped.token)).map((t) => t.id)

    expect(tagIds).not.toContain(fx.projectB.tagId)
  })
})

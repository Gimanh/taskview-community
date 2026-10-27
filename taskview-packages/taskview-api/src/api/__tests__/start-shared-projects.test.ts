import type { TvApi } from '@/tv'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { ymd } from './test-helpers'
import { openTestDb } from './test-db'
import { createSessionUser } from './auth-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'
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
import type { ScopedToken, ScopedTokenArgs } from './start-token-scope.test.types'
import type { CreateSharedProjectArgs, SharedProjectFixture } from './start-shared-projects.test.types'

/**
 * The positive side of the Start screen scoping: projects shared with a collaborator
 * must show up on the main screen, in search, lists, tags and the collaborator list,
 * and every field must follow the collaborator's role in that project — the same
 * rules the ordinary task routes apply. Tokens the collaborator issues narrow that
 * further, never widen it.
 *
 * Owner and collaborator are fresh accounts, so the LIMIT 30 of the start queries
 * only ever sees this spec's tasks.
 */
const ctx = {} as AuthTestContext
const tokenIds: number[] = []
const marker = `TVSHARED${Date.now()}`
let owner: SessionUser
let ownerApi: TvApi
let collaborator: SessionUser
let collaboratorApi: TvApi
let full: SharedProjectFixture
let contentOnly: SharedProjectFixture
let listOnly: SharedProjectFixture

async function createSharedProject(args: CreateSharedProjectArgs): Promise<SharedProjectFixture> {
  const goal = await ownerApi.goals.createGoal({ name: `${marker}_${args.name}` })
  const goalId = goal!.id!
  const list = await ownerApi.goalLists.createList({ goalId, name: `${marker}_${args.name}_LIST` })
  const tag = await ownerApi.tags.createTag({ goalId, name: `${marker}_${args.name}_TAG`, color: '#00aa00' })
  const collab = await ownerApi.collaboration.inviteUserToGoal({ goalId, email: collaborator.email })

  let roleId: number
  if (args.role === 'editor') {
    const roles = await ownerApi.collaboration.fetchRolesForGoal(goalId)
    roleId = roles!.find((r) => r.name === 'editor')!.id
  } else {
    const role = await ownerApi.collaboration.createRoleForGoal({ goalId, roleName: `${marker}_${args.name}_ROLE` })
    roleId = role!.id
    const permissions = await ownerApi.collaboration.fetchAllPermissions()
    for (const name of args.role) {
      const permission = permissions!.find((p) => p.name === name)
      const toggled = await ownerApi.collaboration.toggleRolePermission({ roleId, permissionId: permission!.id })
      expect(toggled!.add).toBe(true)
    }
  }
  await ownerApi.collaboration.toggleUserRoles({ goalId, userId: collab!.id, roles: [roleId] })

  const note = `${marker}_${args.name}_NOTE`
  const active = await ownerApi.tasks.createTask({ goalId, description: `${marker}_${args.name}_ACTIVE`, note })
  await ownerApi.tags.toggleTag({ tagId: tag!.id, taskId: active!.id })
  await ownerApi.tasks.toggleTasksAssignee({ taskId: active!.id, userIds: [collab!.id] })
  const today = await ownerApi.tasks.createTask({ goalId, description: `${marker}_${args.name}_TODAY` })
  await ownerApi.tasks.updateTask({ id: today!.id, endDate: ymd(0) })
  const upcoming = await ownerApi.tasks.createTask({ goalId, description: `${marker}_${args.name}_UPCOMING` })
  await ownerApi.tasks.updateTask({ id: upcoming!.id, endDate: ymd(7) })
  const completed = await ownerApi.tasks.createTask({ goalId, description: `${marker}_${args.name}_DONE` })
  await ownerApi.tasks.updateTask({ id: completed!.id, complete: true })

  return {
    goalId,
    listId: list!.id,
    tagId: tag!.id,
    activeTaskId: active!.id,
    todayTaskId: today!.id,
    upcomingTaskId: upcoming!.id,
    completedTaskId: completed!.id,
    collaboratorId: collab!.id,
    note,
  }
}

async function issueCollaboratorToken(args: ScopedTokenArgs): Promise<ScopedToken> {
  const created = await collaboratorApi.apiTokens.create({
    name: `start-shared-${Date.now()}-${Math.random()}`,
    allowedPermissions: args.allowedPermissions,
    allowedGoalIds: args.allowedGoalIds,
  })
  tokenIds.push(created!.item.id)
  return { token: created!.token, api: clientFor(created!.token) }
}

function bucketIds(project: SharedProjectFixture): number[] {
  return [project.activeTaskId, project.todayTaskId, project.upcomingTaskId, project.completedTaskId]
}

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Start shared org ${Date.now()}` })
  ctx.orgId = org.id

  owner = await createSessionUser({ ctx, prefix: 'shown' })
  ownerApi = clientFor(owner.access)
  collaborator = await createSessionUser({ ctx, prefix: 'shcol' })
  collaboratorApi = clientFor(collaborator.access)

  full = await createSharedProject({ name: 'FULL', role: 'editor' })
  contentOnly = await createSharedProject({
    name: 'CONTENT',
    role: ['goal_can_watch_content', 'component_can_watch_content'],
  })
  listOnly = await createSharedProject({ name: 'LISTS', role: ['goal_can_watch_content'] })
})

afterAll(async () => {
  for (const id of tokenIds) {
    await collaboratorApi.apiTokens.delete(id).catch(() => {})
  }
  for (const project of [full, contentOnly, listOnly]) {
    if (project) await ownerApi.goals.deleteGoal(project.goalId).catch(() => {})
  }
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('collaborator with the editor role', () => {
  it('sees each task in its bucket', async () => {
    const state = await fetchState(collaborator.access)

    expect(state.tasks.map((t) => t.id)).toContain(full.activeTaskId)
    expect(state.tasksToday.map((t) => t.id)).toContain(full.todayTaskId)
    expect(state.tasksUpcoming.map((t) => t.id)).toContain(full.upcomingTaskId)
    expect(state.tasksLastCompleted.map((t) => t.id)).toContain(full.completedTaskId)
  })

  it('sees the note', async () => {
    const task = (await fetchState(collaborator.access)).tasks.find((t) => t.id === full.activeTaskId)

    expect(task!.note).toBe(full.note)
  })

  it('sees the assignee of the task', async () => {
    const state = await fetchState(collaborator.access)

    expect(state.assignees).toContainEqual(expect.objectContaining({
      taskId: full.activeTaskId,
      collabUserId: full.collaboratorId,
    }))
    expect(state.tasks.find((t) => t.id === full.activeTaskId)!.assignedUsers).toEqual([full.collaboratorId])
  })

  it('sees the tags of the task', async () => {
    const task = (await fetchState(collaborator.access)).tasks.find((t) => t.id === full.activeTaskId)

    expect(task!.tags).toEqual([full.tagId])
  })

  it('sees the project members', async () => {
    const state = await fetchState(collaborator.access)

    expect(state.users.find((g) => g.id === full.goalId)?.users.map((u) => u.email)).toContain(collaborator.email)
  })

  it('finds the task with its note in search', async () => {
    const found = (await searchTasks(collaborator.access, marker)).find((t) => t.id === full.activeTaskId)

    expect(found!.note).toBe(full.note)
  })

  it('sees the lists, tags and collaborators of the project', async () => {
    const lists = (await fetchLists(collaborator.access)).map((l) => l.listId)
    const tags = (await fetchTags(collaborator.access)).map((t) => t.id)
    const collaboratorGoals = (await fetchCollaborators(collaborator.access)).map((c) => c.goalId)

    expect(lists).toContain(full.listId)
    expect(tags).toContain(full.tagId)
    expect(collaboratorGoals).toContain(full.goalId)
  })
})

describe('collaborator whose role grants content but not notes, assignees or tags', () => {
  it('sees each task in its bucket', async () => {
    const ids = stateTaskIds(await fetchState(collaborator.access))

    for (const id of bucketIds(contentOnly)) expect(ids).toContain(id)
  })

  it('gets the task serialized like the task route does', async () => {
    const direct = await collaboratorApi.tasks.fetchTaskById(contentOnly.activeTaskId)
    const fromStart = (await fetchState(collaborator.access)).tasks.find((t) => t.id === contentOnly.activeTaskId)

    expect(direct!.note).toBeNull()
    expect(fromStart!.note).toBeNull()
    expect(fromStart!.description).toBe(direct!.description)
    expect(fromStart!.priorityId).toBe(direct!.priorityId)
  })

  it('gets no note in search', async () => {
    const found = (await searchTasks(collaborator.access, marker)).find((t) => t.id === contentOnly.activeTaskId)

    expect(found).toBeDefined()
    expect(found!.note).toBeNull()
  })

  it('sees no assignees, members, task tags or collaborators of the project', async () => {
    const state = await fetchState(collaborator.access)
    const task = state.tasks.find((t) => t.id === contentOnly.activeTaskId)
    const collaboratorGoals = (await fetchCollaborators(collaborator.access)).map((c) => c.goalId)

    expect(state.assignees.some((a) => a.taskId === contentOnly.activeTaskId)).toBe(false)
    expect(task!.assignedUsers).toEqual([])
    expect(task!.tags).toEqual([])
    expect(state.users.map((g) => g.id)).not.toContain(contentOnly.goalId)
    expect(collaboratorGoals).not.toContain(contentOnly.goalId)
  })

  it('sees the lists but not the tags of the project', async () => {
    const lists = (await fetchLists(collaborator.access)).map((l) => l.listId)
    const tags = (await fetchTags(collaborator.access)).map((t) => t.id)

    expect(lists).toContain(contentOnly.listId)
    expect(tags).not.toContain(contentOnly.tagId)
  })
})

describe('collaborator whose role grants only goal_can_watch_content', () => {
  it('sees the lists of the project', async () => {
    const lists = (await fetchLists(collaborator.access)).map((l) => l.listId)

    expect(lists).toContain(listOnly.listId)
  })

  it('is denied the task by the task route', async () => {
    const direct = await rawGet({ token: collaborator.access, path: `/module/tasks/${listOnly.activeTaskId}` })

    expect(direct.status).toBe(403)
  })

  it('gets no task of the project on the main screen or in search', async () => {
    const stateIds = stateTaskIds(await fetchState(collaborator.access))
    const searchIds = (await searchTasks(collaborator.access, marker)).map((t) => t.id)

    for (const id of bucketIds(listOnly)) {
      expect(stateIds).not.toContain(id)
      expect(searchIds).not.toContain(id)
    }
  })
})

describe('tokens issued by the collaborator', () => {
  it('an unrestricted token sees shared projects like the session does', async () => {
    const scoped = await issueCollaboratorToken({ allowedPermissions: [], allowedGoalIds: [] })
    const state = await fetchState(scoped.token)
    const ids = stateTaskIds(state)

    for (const id of [...bucketIds(full), ...bucketIds(contentOnly)]) expect(ids).toContain(id)
    expect(state.tasks.find((t) => t.id === full.activeTaskId)!.note).toBe(full.note)
  })

  it('a token for one shared project sees only that project', async () => {
    const scoped = await issueCollaboratorToken({ allowedPermissions: [], allowedGoalIds: [full.goalId] })
    const stateIds = stateTaskIds(await fetchState(scoped.token))
    const searchIds = (await searchTasks(scoped.token, marker)).map((t) => t.id)
    const lists = (await fetchLists(scoped.token)).map((l) => l.goalId)

    for (const id of bucketIds(full)) expect(stateIds).toContain(id)
    for (const id of bucketIds(contentOnly)) expect(stateIds).not.toContain(id)
    expect(searchIds).toContain(full.activeTaskId)
    expect(searchIds).not.toContain(contentOnly.activeTaskId)
    expect(lists).toContain(full.goalId)
    expect(lists).not.toContain(contentOnly.goalId)
    expect(lists).not.toContain(listOnly.goalId)
  })

  it('a token without task_can_watch_note hides the note the editor role would show', async () => {
    const scoped = await issueCollaboratorToken({
      allowedPermissions: ['goal_can_watch_content', 'component_can_watch_content'],
      allowedGoalIds: [],
    })
    const task = (await fetchState(scoped.token)).tasks.find((t) => t.id === full.activeTaskId)

    expect(task).toBeDefined()
    expect(task!.note).toBeNull()
  })
})

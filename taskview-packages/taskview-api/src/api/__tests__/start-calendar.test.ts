import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import type { TaskArgUpdate } from '@/api/tasks.api.types'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { ymd } from './test-helpers'
import { expectApiError } from './automations-test-helpers'

/**
 * The calendar on the main screen: dated top-level tasks of every project the caller
 * can see, with each task's hidden fields decided by its own project.
 */
describe('Start screen calendar', () => {
  let ownerApi: TvApi
  let memberApi: TvApi
  let memberEmail: string
  const goalIds: number[] = []
  const memberGoalIds: number[] = []

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    memberApi = init.$tvApiForSecondUser
    memberEmail = init.user2Email
  })

  afterAll(async () => {
    for (const id of goalIds) await ownerApi.goals.deleteGoal(id).catch(() => {})
    for (const id of memberGoalIds) await memberApi.goals.deleteGoal(id).catch(() => {})
  })

  async function createGoal(api: TvApi, name: string) {
    const goal = await api.goals.createGoal({ name: `${name} ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')
    ;(api === ownerApi ? goalIds : memberGoalIds).push(goal.id)
    return goal
  }

  async function createTask(api: TvApi, goalId: number, patch: Omit<TaskArgUpdate, 'id'>) {
    const task = await api.tasks.createTask({ goalId, description: `Calendar task ${Date.now()}-${Math.random()}` })
    if (!task) throw new Error('Failed to create task')
    if (Object.keys(patch).length) await api.tasks.updateTask({ id: task.id, ...patch })
    return task
  }

  async function tagTask(api: TvApi, goalId: number, taskId: number) {
    const tag = await api.tags.createTag({ goalId, name: `tag-${Date.now()}`, color: '#22c55e' })
    if (!tag) throw new Error('Failed to create tag')
    await api.tags.toggleTag({ tagId: tag.id, taskId })
    return tag
  }

  it('returns the dated tasks of every project that overlap the period', async () => {
    const first = await createGoal(ownerApi, 'Calendar A')
    const second = await createGoal(ownerApi, 'Calendar B')
    const inFirst = await createTask(ownerApi, first.id, { endDate: ymd(1) })
    const spanning = await createTask(ownerApi, second.id, { startDate: ymd(-5), endDate: ymd(3) })
    const later = await createTask(ownerApi, first.id, { endDate: ymd(40) })
    const undated = await createTask(ownerApi, second.id, {})
    const subtask = await ownerApi.tasks.createTask({ goalId: first.id, description: 'Subtask', parentId: inFirst.id, endDate: ymd(2) })

    const tasks = await ownerApi.start.fetchCalendarTasks({ from: ymd(0), to: ymd(10) })
    const ids = tasks!.map((task) => task.id)

    expect(ids).toEqual(expect.arrayContaining([inFirst.id, spanning.id]))
    expect(ids).not.toContain(later.id)
    expect(ids).not.toContain(undated.id)
    expect(ids).not.toContain(subtask!.id)
    expect(tasks!.find((task) => task.id === spanning.id)?.goalId).toBe(second.id)
  })

  it('leaves out the projects the caller is not a member of', async () => {
    const ownerOnly = await createGoal(ownerApi, 'Calendar private')
    const hidden = await createTask(ownerApi, ownerOnly.id, { endDate: ymd(1) })

    const tasks = await memberApi.start.fetchCalendarTasks({ from: ymd(0), to: ymd(10) })

    expect(tasks!.map((task) => task.id)).not.toContain(hidden.id)
  })

  it('hides the fields a project role does not show, project by project', async () => {
    const shared = await createGoal(ownerApi, 'Calendar shared')
    const sharedTask = await createTask(ownerApi, shared.id, { endDate: ymd(1), priorityId: 3 })
    await tagTask(ownerApi, shared.id, sharedTask.id)

    const collab = await ownerApi.collaboration.inviteUserToGoal({ email: memberEmail, goalId: shared.id })
    if (!collab) throw new Error('Failed to invite the member')
    const role = await ownerApi.collaboration.createRoleForGoal({ goalId: shared.id, roleName: `Viewer ${Date.now()}` })
    if (!role) throw new Error('Failed to create role')
    const permissions = await ownerApi.collaboration.fetchAllPermissions()
    for (const name of [TvPermissions.GOAL_CAN_WATCH_CONTENT, TvPermissions.COMPONENT_CAN_WATCH_CONTENT]) {
      const permission = permissions.find((item) => item.name === name)
      if (!permission) throw new Error(`Permission "${name}" is not in DB`)
      await ownerApi.collaboration.toggleRolePermission({ roleId: role.id, permissionId: permission.id })
    }
    await ownerApi.collaboration.toggleUserRoles({ goalId: shared.id, userId: collab.id, roles: [role.id] })

    const own = await createGoal(memberApi, 'Calendar own')
    const ownTask = await createTask(memberApi, own.id, { endDate: ymd(2), priorityId: 2 })
    const ownTag = await tagTask(memberApi, own.id, ownTask.id)

    const tasks = await memberApi.start.fetchCalendarTasks({ from: ymd(0), to: ymd(10) })
    const seenShared = tasks!.find((task) => task.id === sharedTask.id)
    const seenOwn = tasks!.find((task) => task.id === ownTask.id)

    expect(seenShared).toBeDefined()
    expect(seenShared!.tags).toEqual([])
    expect(seenShared!.priorityId).toBeNull()
    expect(seenOwn!.tags).toEqual([ownTag.id])
    expect(seenOwn!.priorityId).toBe(2)
  })

  it('rejects a period that is reversed, malformed or longer than 100 days', async () => {
    const invalid = [
      { from: ymd(5), to: ymd(0) },
      { from: '2026-13-01', to: '2026-13-05' },
      { from: 'today', to: ymd(1) },
      { from: ymd(0), to: ymd(101) },
    ]
    for (const period of invalid) {
      await expectApiError({ request: ownerApi.start.fetchCalendarTasks(period), status: 400 })
    }
  })
})

import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import type { StartDashboardBucketTask } from '@/api/start.types'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { ymd } from './test-helpers'
import { expectApiError, shareGoalWith } from './automations-test-helpers'
import type { StartDashboardBucketTasksArgs, StartDashboardCreateTaskArgs } from './start-dashboard.test.types'

/**
 * The dashboard on the main screen: counters across every project the caller can see.
 * Other specs leave projects behind for the same users, so the checks look at this spec's own projects.
 */
describe('Start screen dashboard', () => {
  let ownerApi: TvApi
  let memberApi: TvApi
  let memberEmail: string
  const goalIds: number[] = []

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    memberApi = init.$tvApiForSecondUser
    memberEmail = init.user2Email
  })

  afterAll(async () => {
    for (const id of goalIds) await ownerApi.goals.deleteGoal(id).catch(() => {})
  })

  async function createGoal(name: string) {
    const goal = await ownerApi.goals.createGoal({ name: `${name} ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')
    goalIds.push(goal.id)
    return goal
  }

  async function createTask(args: StartDashboardCreateTaskArgs) {
    const task = await ownerApi.tasks.createTask({
      goalId: args.goalId,
      description: `Dashboard task ${Date.now()}-${Math.random()}`,
    })
    if (!task) throw new Error('Failed to create task')
    if (args.patch) await ownerApi.tasks.updateTask({ id: task.id, ...args.patch })
    return task
  }

  // Other specs leave tasks behind for the same users, so a column is read to its end and narrowed to this spec's project
  async function bucketTasks(args: StartDashboardBucketTasksArgs): Promise<StartDashboardBucketTask[]> {
    const tasks: StartDashboardBucketTask[] = []
    for (;;) {
      const page = await args.api.start.fetchDashboardTasks({
        tz: 'UTC',
        bucket: args.bucket,
        date: args.date,
        offset: tasks.length,
        limit: 100,
      })
      tasks.push(...page.tasks)
      if (!page.tasks.length || tasks.length >= page.total) break
    }
    return tasks.filter((task) => task.goalId === args.goalId)
  }

  it('counts the open, overdue and completed top-level tasks of each project', async () => {
    const goal = await createGoal('Dashboard counts')
    const late = await createTask({ goalId: goal.id, patch: { endDate: ymd(-3) } })
    await createTask({ goalId: goal.id, patch: { endDate: ymd(2) } })
    await createTask({ goalId: goal.id })
    await createTask({ goalId: goal.id, patch: { complete: true } })
    await ownerApi.tasks.createTask({ goalId: goal.id, description: 'Subtask', parentId: late.id, endDate: ymd(-5) })

    const dashboard = await ownerApi.start.fetchDashboard({ tz: 'UTC' })

    expect(dashboard.today).toBe(ymd(0))
    expect(dashboard.projects.find((project) => project.goalId === goal.id)).toEqual({
      goalId: goal.id,
      total: 4,
      done: 1,
      open: 3,
      overdue: 1,
    })
    expect(dashboard.runway).toHaveLength(7)
    expect(dashboard.runway[0].date).toBe(ymd(0))
    expect(dashboard.weeks).toHaveLength(12)
    expect(dashboard.totals.total).toBe(dashboard.totals.done + dashboard.totals.open)
    expect(dashboard.totals.open).toBe(dashboard.projects.reduce((sum, project) => sum + project.open, 0))
    expect(dashboard.completedLast7Days).toBeGreaterThanOrEqual(1)
    expect(dashboard.completedInPaceWindow).toBeGreaterThanOrEqual(dashboard.completedLast7Days)
    expect(dashboard.completedInPreviousPaceWindow).toBeGreaterThanOrEqual(0)
  })

  it('leaves out the projects the caller is not a member of', async () => {
    const ownerOnly = await createGoal('Dashboard private')
    await createTask({ goalId: ownerOnly.id, patch: { endDate: ymd(-1) } })

    const dashboard = await memberApi.start.fetchDashboard({ tz: 'UTC' })

    expect(dashboard.projects.map((project) => project.goalId)).not.toContain(ownerOnly.id)
  })

  it('rejects an unknown timezone and a week start outside 0-6', async () => {
    await expectApiError({ request: ownerApi.start.fetchDashboard({ tz: 'Mars/Olympus' }), status: 400 })
    await expectApiError({
      request: ownerApi.start.fetchDashboard({ tz: 'UTC', weekStart: 9 as unknown as 0 }),
      status: 400,
    })
  })

  it('lists the overdue tasks behind the past due column, the most overdue first', async () => {
    const goal = await createGoal('Dashboard overdue list')
    const late = await createTask({ goalId: goal.id, patch: { endDate: ymd(-2) } })
    const later = await createTask({ goalId: goal.id, patch: { endDate: ymd(-9) } })
    await createTask({ goalId: goal.id, patch: { endDate: ymd(3) } })
    await createTask({ goalId: goal.id })
    await createTask({ goalId: goal.id, patch: { endDate: ymd(-4), complete: true } })
    await ownerApi.tasks.createTask({ goalId: goal.id, description: 'Subtask', parentId: late.id, endDate: ymd(-5) })

    const tasks = await bucketTasks({ api: ownerApi, goalId: goal.id, bucket: 'overdue' })

    expect(tasks.map((task) => task.id)).toEqual([later.id, late.id])
    expect(tasks.map((task) => task.daysLate)).toEqual([9, 2])
    expect(tasks[0].description).toContain('Dashboard task')
    expect(tasks[0].completedOn).toBeNull()
  })

  it('lists the tasks due on the day of a deadline column', async () => {
    const goal = await createGoal('Dashboard day list')
    const due = await createTask({ goalId: goal.id, patch: { endDate: ymd(2) } })
    await createTask({ goalId: goal.id, patch: { endDate: ymd(3) } })
    await createTask({ goalId: goal.id, patch: { endDate: ymd(2), complete: true } })

    const tasks = await bucketTasks({ api: ownerApi, goalId: goal.id, bucket: 'day', date: ymd(2) })

    expect(tasks.map((task) => task.id)).toEqual([due.id])
    expect(tasks[0].daysLate).toBe(-1)
  })

  it('lists the tasks completed in the week of a bar, and the bar counts the same tasks', async () => {
    const goal = await createGoal('Dashboard week list')
    const done = await createTask({ goalId: goal.id, patch: { complete: true } })
    await createTask({ goalId: goal.id })

    const dashboard = await ownerApi.start.fetchDashboard({ tz: 'UTC' })
    const currentWeek = dashboard.weeks[dashboard.weeks.length - 1]
    const page = await ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'week', date: currentWeek.start, limit: 1 })
    const tasks = await bucketTasks({ api: ownerApi, goalId: goal.id, bucket: 'week', date: currentWeek.start })

    expect(page.tasks).toHaveLength(1)
    expect(page.total).toBeGreaterThanOrEqual(1)
    expect(tasks.map((task) => task.id)).toEqual([done.id])
    expect(tasks[0].completedOn).toBe(ymd(0))
  })

  it('pages through a column without repeating or dropping tasks', async () => {
    const goal = await createGoal('Dashboard paging')
    for (let index = 0; index < 3; index++) await createTask({ goalId: goal.id, patch: { endDate: ymd(-1) } })

    const whole = await ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'overdue', limit: 100 })
    const first = await ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'overdue', limit: 2 })
    const second = await ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'overdue', limit: 2, offset: 2 })

    expect(first.tasks).toHaveLength(2)
    expect(first.total).toBe(whole.total)
    expect([...first.tasks, ...second.tasks].map((task) => task.id)).toEqual(whole.tasks.slice(0, 4).map((task) => task.id))
  })

  it('keeps the tasks of projects the caller is not a member of out of every column', async () => {
    const ownerOnly = await createGoal('Dashboard private list')
    await createTask({ goalId: ownerOnly.id, patch: { endDate: ymd(-1) } })
    await createTask({ goalId: ownerOnly.id, patch: { endDate: ymd(1) } })
    await createTask({ goalId: ownerOnly.id, patch: { complete: true } })
    const dashboard = await ownerApi.start.fetchDashboard({ tz: 'UTC' })
    const week = dashboard.weeks[dashboard.weeks.length - 1].start

    expect(await bucketTasks({ api: memberApi, goalId: ownerOnly.id, bucket: 'overdue' })).toEqual([])
    expect(await bucketTasks({ api: memberApi, goalId: ownerOnly.id, bucket: 'day', date: ymd(1) })).toEqual([])
    expect(await bucketTasks({ api: memberApi, goalId: ownerOnly.id, bucket: 'week', date: week })).toEqual([])
  })

  it('names the assignee only to a member who may see assignees', async () => {
    const goal = await createGoal('Dashboard list assignee')
    const task = await createTask({ goalId: goal.id, patch: { endDate: ymd(-1) } })
    const permissions = await ownerApi.collaboration.fetchAllPermissions()
    await shareGoalWith({
      ownerApi,
      goalId: goal.id,
      email: memberEmail,
      permissionIdByName: new Map(permissions.map((permission) => [permission.name, permission.id])),
      permissions: [TvPermissions.GOAL_CAN_WATCH_CONTENT, TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
    })
    const collaborator = (await ownerApi.collaboration.fetchUsersForGoal(goal.id)).find((user) => user.email === memberEmail)
    if (!collaborator) throw new Error('The member is not in the project')
    await ownerApi.tasks.toggleTasksAssignee({ taskId: task.id, userIds: [collaborator.id] })

    const forOwner = await bucketTasks({ api: ownerApi, goalId: goal.id, bucket: 'overdue' })
    const forMember = await bucketTasks({ api: memberApi, goalId: goal.id, bucket: 'overdue' })

    expect(forOwner.map((item) => item.assigneeEmail)).toEqual([memberEmail])
    expect(forMember.map((item) => item.id)).toEqual([task.id])
    expect(forMember.map((item) => item.assigneeEmail)).toEqual([null])
  })

  it('rejects a column without its day, a malformed day and an unknown column', async () => {
    await expectApiError({ request: ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'day' }), status: 400 })
    await expectApiError({ request: ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'week' }), status: 400 })
    await expectApiError({
      request: ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'day', date: '2026-13-45' }),
      status: 400,
    })
    await expectApiError({
      request: ownerApi.start.fetchDashboardTasks({ tz: 'UTC', bucket: 'everything' as unknown as 'overdue' }),
      status: 400,
    })
    await expectApiError({ request: ownerApi.start.fetchDashboardTasks({ tz: 'Mars/Olympus', bucket: 'overdue' }), status: 400 })
  })
})

import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import { ALL_TASKS_LIST_ID } from '@/api/tasks.api.types'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'
import { shareGoalWith } from './automations-test-helpers'

/**
 * Whether a task is done is always visible with the task; the permission to edit the status only lets a member change it.
 */
describe('Task completion visibility', () => {
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

  it('shows a done task as done to a member who may not change the status', async () => {
    const goal = await ownerApi.goals.createGoal({ name: `Completion visibility ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')
    goalIds.push(goal.id)
    const done = await ownerApi.tasks.createTask({ goalId: goal.id, description: `Done ${Date.now()}` })
    const open = await ownerApi.tasks.createTask({ goalId: goal.id, description: `Open ${Date.now()}` })
    if (!done || !open) throw new Error('Failed to create tasks')
    await ownerApi.tasks.updateTask({ id: done.id, complete: true })

    const permissions = await ownerApi.collaboration.fetchAllPermissions()
    await shareGoalWith({
      ownerApi,
      goalId: goal.id,
      email: memberEmail,
      permissionIdByName: new Map(permissions.map((permission) => [permission.name, permission.id])),
      permissions: [TvPermissions.GOAL_CAN_WATCH_CONTENT, TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
    })

    const tasks = await memberApi.tasks.fetch({
      goalId: goal.id,
      componentId: ALL_TASKS_LIST_ID,
      page: 0,
      showCompleted: 0,
      ignoreCompleted: true,
      firstNew: 0,
      unlimited: true,
    })

    expect(tasks.find((task) => task.id === done.id)?.complete).toBe(true)
    expect(tasks.find((task) => task.id === open.id)?.complete).toBe(false)

    await memberApi.tasks.updateTask({ id: done.id, complete: false }).catch(() => null)
    const afterAttempt = await ownerApi.tasks.fetchTaskById(done.id)
    expect(afterAttempt?.complete).toBe(true)
  })
})

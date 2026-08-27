import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import axios, { type AxiosInstance } from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'

/**
 * Board writes (columns and task placement) are gated by kanban_can_manage, the
 * permission the UI has always used. They used to accept component_can_add_tasks
 * or task_can_add_subtasks instead, which let a rank-and-file member delete other
 * people's board columns.
 */
describe('Kanban permission boundaries', () => {
  let ownerApi: TvApi
  let outsiderApi: TvApi
  let outsiderEmail: string
  let deleteAllGoals: () => Promise<void>
  let attackerAxios: AxiosInstance
  const permissionIdByName = new Map<string, number>()

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    outsiderApi = init.$tvApiForSecondUser
    outsiderEmail = init.user2Email
    deleteAllGoals = init.deleteAllGoals

    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER_2,
      password: DEFAULT_PASSWORD,
    })
    attackerAxios = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })

    for (const permission of await ownerApi.collaboration.fetchAllPermissions()) {
      permissionIdByName.set(permission.name, permission.id)
    }
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  async function expectHttpStatus<T>(promise: Promise<T>, status: number): Promise<void> {
    try {
      await promise
      throw new Error(`Expected HTTP ${status} but request succeeded`)
    } catch (e: any) {
      if (typeof e.message === 'string' && e.message.startsWith('Expected HTTP')) throw e
      expect(e.response?.status ?? e.status, `Expected ${status}, got ${e.response?.status ?? e.status}`).toBe(status)
    }
  }

  /** A goal of user1 that user2 joins through a role carrying exactly `permissionNames`. */
  async function shareGoalWith(permissionNames: string[]) {
    const goal = await ownerApi.goals.createGoal({ name: `Kanban access ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')

    const collab = await ownerApi.collaboration.inviteUserToGoal({ email: outsiderEmail, goalId: goal.id })
    if (!collab) throw new Error('Failed to invite user2')

    const role = await ownerApi.collaboration.createRoleForGoal({
      goalId: goal.id,
      roleName: `Role ${Date.now()}`,
    })
    if (!role) throw new Error('Failed to create role')

    for (const name of permissionNames) {
      const permissionId = permissionIdByName.get(name)
      if (!permissionId) throw new Error(`Permission "${name}" is not in DB`)

      const toggled = await ownerApi.collaboration.toggleRolePermission({ roleId: role.id, permissionId })
      if (!toggled || toggled.add !== true) {
        throw new Error(`Expected "${name}" to be added, got ${JSON.stringify(toggled)}`)
      }
    }

    await ownerApi.collaboration.toggleUserRoles({ goalId: goal.id, userId: collab.id, roles: [role.id] })

    return goal
  }

  async function addColumn(goalId: number, name: string) {
    const column = await ownerApi.kanban.addColumn({ goalId, name })
    if (!column) throw new Error('Failed to create column')
    return column
  }

  describe('a member holding kanban_can_manage', () => {
    it('can create, rename and delete a board column', async () => {
      const goal = await shareGoalWith([TvPermissions.KANBAN_CAN_MANAGE])

      const created = await outsiderApi.kanban.addColumn({ goalId: goal.id, name: 'Created by member' })
      expect(created?.id).toBeGreaterThan(0)

      const renamed = await outsiderApi.kanban.updateColumn({ id: created!.id, name: 'Renamed by member' })
      expect(renamed).toBeTruthy()

      const deleted = await outsiderApi.kanban.deleteColumn({ id: created!.id })
      expect(deleted).toBeTruthy()
    })

    it('can move a task into another column', async () => {
      const goal = await shareGoalWith([TvPermissions.KANBAN_CAN_MANAGE])
      const from = await addColumn(goal.id, 'From')
      const to = await addColumn(goal.id, 'To')

      const task = await ownerApi.tasks.createTask({
        goalId: goal.id,
        description: `movable-${Date.now()}`,
        statusId: from.id,
      })
      if (!task) throw new Error('Failed to create task')

      const moved = await outsiderApi.kanban.updateTasksOrderAndColumn({
        goalId: goal.id,
        columnId: to.id,
        taskId: task.id,
        prevTaskId: null,
        nextTaskId: null,
      })
      expect(moved).toBeDefined()
    })
  })

  describe('a member holding only task-level permissions', () => {
    // exactly the pair the routes used to accept — the escalation that was closed
    const TASK_LEVEL = [TvPermissions.COMPONENT_CAN_ADD_TASKS, TvPermissions.TASK_CAN_ADD_SUBTASKS]

    it('cannot create a board column', async () => {
      const goal = await shareGoalWith(TASK_LEVEL)

      await expectHttpStatus(outsiderApi.kanban.addColumn({ goalId: goal.id, name: 'Nope' }), 403)
    })

    it('cannot rename or delete a board column', async () => {
      const goal = await shareGoalWith(TASK_LEVEL)
      const column = await addColumn(goal.id, 'Owned by user1')

      await expectHttpStatus(outsiderApi.kanban.updateColumn({ id: column.id, name: 'Nope' }), 403)
      await expectHttpStatus(outsiderApi.kanban.deleteColumn({ id: column.id }), 403)

      const survivors = await ownerApi.kanban.fetchAllColumns(goal.id)
      expect(survivors?.some(c => c.id === column.id), 'column was destroyed').toBe(true)
    })

    it('cannot move a task into another column', async () => {
      const goal = await shareGoalWith(TASK_LEVEL)
      const from = await addColumn(goal.id, 'From')
      const to = await addColumn(goal.id, 'To')

      const task = await ownerApi.tasks.createTask({
        goalId: goal.id,
        description: `pinned-${Date.now()}`,
        statusId: from.id,
      })
      if (!task) throw new Error('Failed to create task')

      await expectHttpStatus(
        outsiderApi.kanban.updateTasksOrderAndColumn({
          goalId: goal.id,
          columnId: to.id,
          taskId: task.id,
          prevTaskId: null,
          nextTaskId: null,
        }),
        403,
      )
    })
  })

  describe('a member holding only kanban_can_view', () => {
    it('can read the task order of a column', async () => {
      const goal = await shareGoalWith([TvPermissions.KANBAN_CAN_VIEW])
      const column = await addColumn(goal.id, 'Readable')

      const order = await outsiderApi.kanban.getTaskOrdersForColumnAndCursor(goal.id, column.id, null)
      expect(order).toBeDefined()
    })

    it('cannot create a board column', async () => {
      const goal = await shareGoalWith([TvPermissions.KANBAN_CAN_VIEW])

      await expectHttpStatus(outsiderApi.kanban.addColumn({ goalId: goal.id, name: 'Nope' }), 403)
    })
  })

  describe('the goal a column belongs to is never taken from the request', () => {
    it('rejects deleting or renaming a foreign column even when a self-owned goalId is supplied', async () => {
      const victimGoal = await ownerApi.goals.createGoal({ name: `Victim board ${Date.now()}` })
      if (!victimGoal) throw new Error('Failed to create victim goal')
      const victimColumn = await addColumn(victimGoal.id, 'Victim column')

      // a project user2 fully controls, offered to the guard as the authorization target
      const ownGoal = await outsiderApi.goals.createGoal({ name: `Attacker board ${Date.now()}` })
      if (!ownGoal) throw new Error('Failed to create attacker goal')

      const deleteResponse = await attackerAxios.post('/module/kanban/delete-status', {
        id: victimColumn.id,
        goalId: ownGoal.id,
      })
      const updateResponse = await attackerAxios.post('/module/kanban/update-status', {
        id: victimColumn.id,
        name: 'Renamed by an outsider',
        goalId: ownGoal.id,
      })

      const survivors = await ownerApi.kanban.fetchAllColumns(victimGoal.id)
      const survivor = (survivors ?? []).find(c => c.id === victimColumn.id)
      expect(survivor, `victim column ${victimColumn.id} was destroyed`).toBeDefined()
      expect(survivor?.name, 'victim column was renamed').toBe('Victim column')

      expect(deleteResponse.status).toBe(403)
      expect(updateResponse.status).toBe(403)
    })
  })
})

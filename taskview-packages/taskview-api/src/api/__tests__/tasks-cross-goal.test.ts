import { TvApi } from '@/tv'
import axios, { type AxiosInstance } from 'axios'
import type { Client } from 'pg'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'
import { openTestDb } from './test-db'
import type { CrossGoalFixture, TaskRow } from './tasks-cross-goal.test.types'

/**
 * Authorization of a task write is checked on one project: the project of the task being
 * updated, or the goalId of the task being created. A list, kanban column or parent named in
 * the same request must belong to that project — otherwise a DB trigger rewrites goal_id from
 * the list and the task lands on the board of a project the caller is not a member of.
 */
describe('Task writes stay inside the authorized project', () => {
  let ownerApi: TvApi
  let attackerApi: TvApi
  let attackerAxios: AxiosInstance
  let deleteAllGoals: () => Promise<void>
  let db: Client
  let attackerUserId: number
  let victimUserId: number
  const fx = {} as CrossGoalFixture

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    attackerApi = init.$tvApiForSecondUser
    deleteAllGoals = init.deleteAllGoals
    db = await openTestDb()

    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER_2,
      password: DEFAULT_PASSWORD,
    })
    attackerUserId = auth.data.userData.id
    attackerAxios = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })
    const victimRow = await db.query<{ id: number }>('select id from tv_auth.users where email = $1', [init.user1Email])
    victimUserId = victimRow.rows[0].id

    const victimGoal = await ownerApi.goals.createGoal({ name: `Victim cross-goal ${Date.now()}` })
    if (!victimGoal) throw new Error('Failed to create victim goal')
    fx.victimGoalId = victimGoal.id
    const victimList = await ownerApi.goalLists.createList({ goalId: victimGoal.id, name: 'Victim list' })
    if (!victimList) throw new Error('Failed to create victim list')
    fx.victimListId = victimList.id
    const victimColumn = await ownerApi.kanban.addColumn({ goalId: victimGoal.id, name: 'Victim column' })
    if (!victimColumn) throw new Error('Failed to create victim column')
    fx.victimColumnId = victimColumn.id
    const victimTask = await ownerApi.tasks.createTask({ goalId: victimGoal.id, description: `victim-${Date.now()}` })
    if (!victimTask) throw new Error('Failed to create victim task')
    fx.victimTaskId = victimTask.id
    const victimSprint = await ownerApi.sprints.create({
      goalId: victimGoal.id,
      name: 'Victim sprint',
      startDate: '2026-01-01',
      endDate: '2026-01-14',
    })
    if (!victimSprint) throw new Error('Failed to create victim sprint')
    fx.victimSprintId = victimSprint.id

    const attackerGoal = await attackerApi.goals.createGoal({ name: `Attacker cross-goal ${Date.now()}` })
    if (!attackerGoal) throw new Error('Failed to create attacker goal')
    fx.attackerGoalId = attackerGoal.id
    const attackerList = await attackerApi.goalLists.createList({ goalId: attackerGoal.id, name: 'Attacker list' })
    if (!attackerList) throw new Error('Failed to create attacker list')
    fx.attackerListId = attackerList.id
    const attackerColumn = await attackerApi.kanban.addColumn({ goalId: attackerGoal.id, name: 'Attacker column' })
    if (!attackerColumn) throw new Error('Failed to create attacker column')
    fx.attackerColumnId = attackerColumn.id
  })

  afterAll(async () => {
    await deleteAllGoals()
    await db.end()
  })

  async function readTask(taskId: number): Promise<TaskRow> {
    const result = await db.query<TaskRow>(
      `select goal_id, goal_list_id, status_id, parent_id, sprint_id, creator_id, source_url, date_complete,
              recurrence_rule_id
       from tasks.tasks where id = $1`,
      [taskId]
    )
    expect(result.rows).toHaveLength(1)
    return result.rows[0]
  }

  async function countTasksWithDescription(description: string): Promise<number> {
    const result = await db.query<{ total: number }>(
      'select count(*)::int as total from tasks.tasks where description = $1',
      [description]
    )
    return result.rows[0].total
  }

  async function createAttackerTask(): Promise<number> {
    const task = await attackerApi.tasks.createTask({
      goalId: fx.attackerGoalId,
      goalListId: fx.attackerListId,
      description: `attacker-${Date.now()}`,
    })
    if (!task) throw new Error('Failed to create attacker task')
    return task.id
  }

  describe('updating a task (PATCH /module/tasks)', () => {
    it("rejects moving the task into another project's list", async () => {
      const taskId = await createAttackerTask()

      const res = await attackerAxios.patch('/module/tasks', { id: taskId, goalListId: fx.victimListId })

      expect(res.status).toBe(400)
      const row = await readTask(taskId)
      expect(row.goal_id).toBe(fx.attackerGoalId)
      expect(row.goal_list_id).toBe(fx.attackerListId)
    })

    it("rejects putting the task into another project's kanban column", async () => {
      const taskId = await createAttackerTask()

      const res = await attackerAxios.patch('/module/tasks', { id: taskId, statusId: fx.victimColumnId })

      expect(res.status).toBe(400)
      expect((await readTask(taskId)).status_id).toBeNull()
    })

    it("rejects making the task a subtask of another project's task", async () => {
      const taskId = await createAttackerTask()

      const res = await attackerAxios.patch('/module/tasks', { id: taskId, parentId: fx.victimTaskId })

      expect(res.status).toBe(400)
      expect((await readTask(taskId)).parent_id).toBeNull()
    })

    it("the victim's list does not show the attacker's task", async () => {
      const taskId = await createAttackerTask()
      await attackerAxios.patch('/module/tasks', { id: taskId, goalListId: fx.victimListId })

      const victimTasks = await ownerApi.tasks.fetch({
        goalId: fx.victimGoalId,
        componentId: fx.victimListId,
        page: 0,
        showCompleted: 0,
        firstNew: 0,
      })
      const ids = (victimTasks ?? []).map(t => t.id)
      expect(ids).not.toContain(taskId)
    })
  })

  describe('creating a task (POST /module/tasks)', () => {
    it("rejects creating a task in another project's list", async () => {
      const description = `injected-list-${Date.now()}`

      const res = await attackerAxios.post('/module/tasks', {
        goalId: fx.attackerGoalId,
        goalListId: fx.victimListId,
        description,
      })

      expect(res.status).toBe(400)
      expect(await countTasksWithDescription(description)).toBe(0)
    })

    it("rejects creating a task in another project's kanban column", async () => {
      const description = `injected-column-${Date.now()}`

      const res = await attackerAxios.post('/module/tasks', {
        goalId: fx.attackerGoalId,
        statusId: fx.victimColumnId,
        description,
      })

      expect(res.status).toBe(400)
      expect(await countTasksWithDescription(description)).toBe(0)
    })

    it("rejects creating a subtask under another project's task", async () => {
      const description = `injected-subtask-${Date.now()}`

      const res = await attackerAxios.post('/module/tasks', {
        goalId: fx.attackerGoalId,
        parentId: fx.victimTaskId,
        description,
      })

      expect(res.status).toBe(400)
      expect(await countTasksWithDescription(description)).toBe(0)
    })

    it('ignores server-managed columns sent next to the declared fields', async () => {
      const res = await attackerAxios.post('/module/tasks', {
        goalId: fx.attackerGoalId,
        description: `injected-columns-${Date.now()}`,
        sprintId: fx.victimSprintId,
        creatorId: victimUserId,
        sourceUrl: 'https://phishing.example/login',
        dateComplete: '2020-01-01 00:00:00',
        recurrenceRuleId: 1,
      })

      expect(res.status).toBe(200)
      const row = await readTask(res.data.response.id)
      expect(row.goal_id).toBe(fx.attackerGoalId)
      expect(row.sprint_id).toBeNull()
      expect(row.creator_id).toBe(attackerUserId)
      expect(row.source_url).toBeNull()
      expect(row.date_complete).toBeNull()
      expect(row.recurrence_rule_id).toBeNull()
    })

    it("control: creates a task in the project's own list, column and under its own parent", async () => {
      const parentId = await createAttackerTask()

      const res = await attackerAxios.post('/module/tasks', {
        goalId: fx.attackerGoalId,
        goalListId: fx.attackerListId,
        statusId: fx.attackerColumnId,
        parentId,
        description: `own-${Date.now()}`,
      })

      expect(res.status).toBe(200)
      const row = await readTask(res.data.response.id)
      expect(row.goal_id).toBe(fx.attackerGoalId)
      expect(row.goal_list_id).toBe(fx.attackerListId)
      expect(row.status_id).toBe(fx.attackerColumnId)
      expect(row.parent_id).toBe(parentId)
      expect(row.creator_id).toBe(attackerUserId)
    })
  })
})

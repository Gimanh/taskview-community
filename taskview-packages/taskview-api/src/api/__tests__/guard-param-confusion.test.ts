import { TvApi } from '@/tv'
import axios, { type AxiosInstance } from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'

/**
 * Several guards pick the goal to authorize with `req.body.goalId ? req.body : req.params`,
 * while their handlers read `req.params`. Supplying a body that names a goal the caller owns
 * must not authorize a request whose path points at someone else's goal.
 */
describe('Guard/handler parameter confusion', () => {
  let ownerApi: TvApi
  let deleteAllGoals: () => Promise<void>
  let attackerAxios: AxiosInstance
  let victimGoalId: number
  let attackerGoalId: number
  let victimColumnId: number

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
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

    const victimGoal = await ownerApi.goals.createGoal({ name: `Victim confusion ${Date.now()}` })
    if (!victimGoal) throw new Error('Failed to create victim goal')
    victimGoalId = victimGoal.id

    const attackerGoal = await axios.post(
      `${API_URL}/module/goals`,
      { name: `Attacker confusion ${Date.now()}` },
      { headers: { Authorization: `Bearer ${auth.data.access}` } },
    )
    attackerGoalId = attackerGoal.data.response.id

    await ownerApi.tasks.createTask({
      goalId: victimGoalId,
      description: `secret-task-${Date.now()}`,
    })

    const columns = await ownerApi.kanban.fetchAllColumns(victimGoalId)
    if (!columns?.length) throw new Error('Victim goal has no kanban columns')
    victimColumnId = columns[0].id
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  it('rejects reading another goal kanban tasks when a self-owned goalId is put in the body', async () => {
    const response = await attackerAxios.request({
      method: 'get',
      url: `/module/kanban/tasks/${victimGoalId}/${victimColumnId}/0`,
      data: { goalId: attackerGoalId, columnId: victimColumnId },
    })

    expect(
      response.status,
      `Leaked kanban tasks of goal ${victimGoalId}: ${JSON.stringify(response.data)}`,
    ).toBe(403)
  })

  it('rejects reading another goal task order when a self-owned goalId is put in the body', async () => {
    const response = await attackerAxios.request({
      method: 'get',
      url: `/module/kanban/tasks-order/${victimGoalId}/${victimColumnId}/0`,
      data: { goalId: attackerGoalId, columnId: victimColumnId },
    })

    expect(response.status).toBe(403)
  })

  it('rejects reading another goal role-to-permission matrix when a self-owned goalId is put in the body', async () => {
    const response = await attackerAxios.request({
      method: 'get',
      url: `/module/collaborationroles/role-to-permissions/${victimGoalId}`,
      data: { goalId: attackerGoalId },
    })

    expect(
      response.status,
      `Leaked role matrix of goal ${victimGoalId}: ${JSON.stringify(response.data)}`,
    ).toBe(403)
  })

  it('control: the same requests without a body are already rejected', async () => {
    const kanban = await attackerAxios.get(`/module/kanban/tasks/${victimGoalId}/${victimColumnId}/0`)
    expect(kanban.status).toBe(403)

    const roles = await attackerAxios.get(`/module/collaborationroles/role-to-permissions/${victimGoalId}`)
    expect(roles.status).toBe(403)
  })

  it('control: the owner still reads their own kanban tasks and role matrix', async () => {
    const tasks = await ownerApi.kanban
      .fetchTasksForColumn(victimGoalId, victimColumnId, 0)
      .catch((e: any) => { throw new Error(`kanban read failed: ${e.response?.status}`) })
    expect(tasks).toBeDefined()

    const matrix = await ownerApi.collaboration.fetchRoleToPermissionsForGoal(victimGoalId)
      .catch((e: any) => { throw new Error(`role matrix read failed: ${e.response?.status}`) })
    expect(matrix).toBeDefined()
  })
})

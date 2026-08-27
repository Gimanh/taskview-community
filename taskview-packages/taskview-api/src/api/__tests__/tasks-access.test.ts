import { TvApi } from '@/tv'
import axios, { type AxiosInstance } from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'

/**
 * CanFetchTask authorizes `req.query.taskId || req.params.taskId`, while
 * fetchTaskByIdNew reads `req.params`. A caller must not be able to name a task
 * they own in the query string and have the guard authorize it while the handler
 * returns someone else's task.
 */
describe('Task object-level access control', () => {
  let ownerApi: TvApi
  let outsiderApi: TvApi
  let deleteAllGoals: () => Promise<void>
  let attackerAxios: AxiosInstance
  let victimTaskId: number
  let attackerTaskId: number

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    outsiderApi = init.$tvApiForSecondUser
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

    const victimGoal = await ownerApi.goals.createGoal({ name: `Victim tasks ${Date.now()}` })
    if (!victimGoal) throw new Error('Failed to create victim goal')
    const victimTask = await ownerApi.tasks.createTask({
      goalId: victimGoal.id,
      description: `victim-secret-${Date.now()}`,
    })
    if (!victimTask) throw new Error('Failed to create victim task')
    victimTaskId = victimTask.id

    const attackerGoal = await outsiderApi.goals.createGoal({ name: `Attacker tasks ${Date.now()}` })
    if (!attackerGoal) throw new Error('Failed to create attacker goal')
    const attackerTask = await outsiderApi.tasks.createTask({
      goalId: attackerGoal.id,
      description: `attacker-own-${Date.now()}`,
    })
    if (!attackerTask) throw new Error('Failed to create attacker task')
    attackerTaskId = attackerTask.id
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  it('rejects reading another user task when a self-owned taskId is put in the query string', async () => {
    const response = await attackerAxios.get(`/module/tasks/${victimTaskId}`, {
      params: { taskId: attackerTaskId },
    })

    expect(
      response.status,
      `Leaked task ${victimTaskId}: ${JSON.stringify(response.data)}`,
    ).toBe(403)
  })

  it('control: without the query parameter the guard already rejects the same request', async () => {
    const response = await attackerAxios.get(`/module/tasks/${victimTaskId}`)

    expect(response.status).toBe(403)
  })

  it('control: the owner can still read their own task', async () => {
    const task = await ownerApi.tasks.fetchTaskById(victimTaskId)
    expect(task?.id).toBe(victimTaskId)
  })
})

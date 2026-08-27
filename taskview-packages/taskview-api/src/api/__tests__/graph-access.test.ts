import { TvApi } from '@/tv'
import axios, { type AxiosInstance } from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'

/**
 * resolveGoalId() for the graph module inspects req.body.source before falling
 * back to req.params.id, while deleteEdge acts on req.params.id. A caller must
 * not be able to point the guard at a task they own while the handler operates
 * on an edge belonging to someone else.
 */
describe('Graph object-level access control', () => {
  let ownerApi: TvApi
  let outsiderApi: TvApi
  let deleteAllGoals: () => Promise<void>
  let attackerAxios: AxiosInstance
  let victimGoalId: number
  let attackerTaskId: number
  let victimTaskId: number

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

    const victimGoal = await ownerApi.goals.createGoal({ name: `Victim graph ${Date.now()}` })
    if (!victimGoal) throw new Error('Failed to create victim goal')
    victimGoalId = victimGoal.id

    const victimTask = await ownerApi.tasks.createTask({
      goalId: victimGoalId,
      description: `victim-task-${Date.now()}`,
    })
    if (!victimTask) throw new Error('Failed to create victim task')
    victimTaskId = victimTask.id

    const attackerGoal = await outsiderApi.goals.createGoal({ name: `Attacker graph ${Date.now()}` })
    if (!attackerGoal) throw new Error('Failed to create attacker goal')

    const attackerTask = await outsiderApi.tasks.createTask({
      goalId: attackerGoal.id,
      description: `attacker-task-${Date.now()}`,
    })
    if (!attackerTask) throw new Error('Failed to create attacker task')
    attackerTaskId = attackerTask.id
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

  async function createVictimEdge(): Promise<number> {
    const from = await ownerApi.tasks.createTask({
      goalId: victimGoalId,
      description: `victim-edge-from-${Date.now()}`,
    })
    const to = await ownerApi.tasks.createTask({
      goalId: victimGoalId,
      description: `victim-edge-to-${Date.now()}`,
    })
    if (!from || !to) throw new Error('Failed to create victim tasks')

    const edge = await ownerApi.graph.addEdge({ source: from.id, target: to.id })
    if (!edge) throw new Error('Failed to create victim edge')
    return edge.id
  }

  async function victimEdgeExists(edgeId: number): Promise<boolean> {
    const edges = await ownerApi.graph.fetchAllEdges(victimGoalId)
    return (edges ?? []).some(e => e.id === edgeId)
  }

  it('rejects deleting another user edge even when a self-owned source task is supplied', async () => {
    const edgeId = await createVictimEdge()

    const response = await attackerAxios.delete(`/module/graph/${edgeId}`, {
      data: { source: attackerTaskId },
    })

    expect(
      await victimEdgeExists(edgeId),
      `victim edge ${edgeId} was destroyed by a non-member`,
    ).toBe(true)
    expect(response.status).toBe(403)
  })

  // A graph lives inside one project, so an edge across two of them is not a
  // permission question but an impossible object: it is refused before any
  // permission is looked at. Driven through the SDK on purpose — this needs no
  // crafted request at all, an ordinary client using the public API reaches it.
  it('rejects creating an edge whose endpoints live in different projects', async () => {
    await expectHttpStatus(
      outsiderApi.graph.addEdge({ source: attackerTaskId, target: victimTaskId }),
      400,
    )
  })

  // the mirror of the case above: a foreign source with an own target. This one
  // fails closed even without the endpoint comparison (the goal would resolve to
  // the victim project and the permission check would deny it), which is exactly
  // why it needs pinning — a regression here would be silent
  it('rejects creating an edge from a foreign task into a project the caller owns', async () => {
    await expectHttpStatus(
      outsiderApi.graph.addEdge({ source: victimTaskId, target: attackerTaskId }),
      400,
    )
  })

  // both endpoints inside the victim project: the goal resolves cleanly, so this
  // is decided purely by the permission check on that goal
  it('rejects creating an edge between two tasks of a project the caller is not a member of', async () => {
    const second = await ownerApi.tasks.createTask({
      goalId: victimGoalId,
      description: `victim-second-${Date.now()}`,
    })
    if (!second) throw new Error('Failed to create second victim task')

    await expectHttpStatus(
      outsiderApi.graph.addEdge({ source: victimTaskId, target: second.id }),
      403,
    )
  })

  it('control: without the injected source the guard already rejects the delete', async () => {
    const edgeId = await createVictimEdge()

    const response = await attackerAxios.delete(`/module/graph/${edgeId}`)

    expect(response.status).toBe(403)
    expect(await victimEdgeExists(edgeId)).toBe(true)
  })

  it('control: the owner can still delete their own edge', async () => {
    const edgeId = await createVictimEdge()

    const deleted = await ownerApi.graph.deleteEdge(edgeId)
    expect(deleted).toBeTruthy()
    expect(await victimEdgeExists(edgeId)).toBe(false)
  })
})

import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { initApi, API_URL, DEFAULT_USER_2, DEFAULT_PASSWORD } from './init-api'
import { ymd } from './test-helpers'

/**
 * Cross-tenant (IDOR) tests for the sprints module.
 *
 * `owner` (user1) owns a project the `attacker` (user2) is NOT a member of.
 * The attacker only manages their OWN project. Each test tries to read or
 * mutate the victim's sprint data through an injection vector (body.goalId,
 * body.sprintId, query goalId override) and asserts it is refused / has no
 * effect. These assertions describe the SECURE behaviour — they fail against a
 * server that still trusts a client-supplied goalId, and pass once the
 * goal-id-resolver + controller param-precedence fixes are deployed.
 */
describe('Sprints — cross-tenant access (IDOR)', () => {
  let owner: TvApi
  let attacker: TvApi
  let attackerRaw: AxiosInstance

  let victimGoalId: number
  let victimSprintId: number
  let victimDeletableSprintId: number
  let victimTaskId: number
  let attackerGoalId: number
  let attackerSprintId: number
  let attackerTaskId: number

  const VICTIM_SPRINT_NAME = 'Victim sprint'

  beforeAll(async () => {
    const { $tvApi, $tvApiForSecondUser } = await initApi()
    owner = $tvApi
    attacker = $tvApiForSecondUser

    // Raw axios as the attacker — lets us send crafted payloads the typed client
    // would never produce. validateStatus:true so we can assert on status codes.
    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER_2,
      password: DEFAULT_PASSWORD,
    })
    attackerRaw = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })

    // Victim project + sprint (attacker is not a member).
    const vGoal = await owner.goals.createGoal({ name: `Victim project-${Date.now()}` })
    if (!vGoal) throw new Error('Failed to create victim goal')
    victimGoalId = vGoal.id!
    const vSprint = await owner.sprints.create({
      goalId: victimGoalId, name: VICTIM_SPRINT_NAME, startDate: ymd(7), endDate: ymd(21),
    })
    if (!vSprint) throw new Error('Failed to create victim sprint')
    victimSprintId = vSprint.id

    // A task inside the victim sprint — used to detect planning-list leaks.
    const vTask = await owner.tasks.createTask({ goalId: victimGoalId, description: `Victim task-${Date.now()}` })
    if (!vTask) throw new Error('Failed to create victim task')
    victimTaskId = vTask.id
    await owner.sprints.setTaskSprint({ taskId: victimTaskId, sprintId: victimSprintId })

    // A separate throwaway victim sprint for the destructive delete test, so a
    // successful exploit there can't wipe the shared victim other tests rely on.
    const vDeletable = await owner.sprints.create({
      goalId: victimGoalId, name: 'Victim deletable', startDate: ymd(7), endDate: ymd(21),
    })
    if (!vDeletable) throw new Error('Failed to create deletable victim sprint')
    victimDeletableSprintId = vDeletable.id

    // Attacker's own project + sprint (attacker manages it).
    const aGoal = await attacker.goals.createGoal({ name: `Attacker project-${Date.now()}` })
    if (!aGoal) throw new Error('Failed to create attacker goal')
    attackerGoalId = aGoal.id!
    const aSprint = await attacker.sprints.create({
      goalId: attackerGoalId, name: 'Attacker sprint', startDate: ymd(7), endDate: ymd(21),
    })
    if (!aSprint) throw new Error('Failed to create attacker sprint')
    attackerSprintId = aSprint.id

    // A task the attacker owns — used to probe the setTaskSprint goal boundary.
    const aTask = await attacker.tasks.createTask({ goalId: attackerGoalId, description: `Attacker task-${Date.now()}` })
    if (!aTask) throw new Error('Failed to create attacker task')
    attackerTaskId = aTask.id
  })

  afterAll(async () => {
    await owner.goals.deleteGoal(victimGoalId).catch(() => {})
    await attacker.goals.deleteGoal(attackerGoalId).catch(() => {})
  })

  it('denies reading another project\'s sprint directly', async () => {
    const res = await attackerRaw.get(`/module/sprints/sprint/${victimSprintId}`)
    expect(res.status).toBe(403)
  })

  it('denies updating another project\'s sprint via injected body.goalId', async () => {
    const res = await attackerRaw.patch(`/module/sprints/sprint/${victimSprintId}`, {
      goalId: attackerGoalId, // attacker's own goal — a vulnerable server authorizes against this
      name: 'HACKED',
    })
    expect(res.status).toBe(403)

    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.name).toBe(VICTIM_SPRINT_NAME)
  })

  it('denies deleting another project\'s sprint via injected body.goalId', async () => {
    const res = await attackerRaw.delete(`/module/sprints/sprint/${victimDeletableSprintId}`, {
      data: { goalId: attackerGoalId },
    })
    expect(res.status).toBe(403)

    const victim = await owner.sprints.getById(victimDeletableSprintId)
    expect(victim).not.toBeNull()
  })

  it('denies activating another project\'s sprint via injected body.goalId', async () => {
    const res = await attackerRaw.post(`/module/sprints/sprint/${victimSprintId}/activate`, {
      goalId: attackerGoalId,
    })
    expect(res.status).toBe(403)

    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.status).toBe('planned')
  })

  it('does not let body.sprintId redirect an update onto another project\'s sprint', async () => {
    // Attacker legitimately updates their OWN sprint, but injects the victim id.
    await attackerRaw.patch(`/module/sprints/sprint/${attackerSprintId}`, {
      sprintId: victimSprintId, // a vulnerable controller lets the body override the URL id
      name: 'REDIRECTED',
    })

    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.name).toBe(VICTIM_SPRINT_NAME)
  })

  it('does not leak another project\'s sprints via a query goalId override', async () => {
    const res = await attackerRaw.get(`/module/sprints/${attackerGoalId}`, {
      params: { goalId: victimGoalId }, // try to redirect the listing to the victim project
    })
    expect(res.status).toBe(200)

    const sprints = (res.data?.response ?? []) as Array<{ id: number }>
    const ids = sprints.map((s) => s.id)
    expect(ids).not.toContain(victimSprintId)
    expect(ids).toContain(attackerSprintId)
  })

  it('does not leak another project\'s planning tasks via a query sprintId override', async () => {
    const res = await attackerRaw.get(`/module/sprints/sprint/${attackerSprintId}/planning`, {
      params: { sprintId: victimSprintId, scope: 'sprint' }, // try to redirect to the victim sprint
    })
    expect(res.status).toBe(200)

    // Must be scoped to the attacker's own (empty) sprint — never expose the victim's task.
    const tasks = (res.data?.response?.tasks ?? []) as Array<{ id: number }>
    expect(tasks.map((t) => t.id)).not.toContain(victimTaskId)
  })

  it('does not let setCadence write to another project via body.goalId', async () => {
    // Attacker legitimately configures cadence on their OWN goal but injects the
    // victim goal in the body. The URL param must win: cadence lands on the
    // attacker's goal, the victim's stays untouched.
    const res = await attackerRaw.put(`/module/sprints/goal/${attackerGoalId}/cadence`, {
      goalId: victimGoalId,
      enabled: true,
      lengthDays: 7,
      startDate: ymd(0),
    })
    expect(res.status).toBe(200)

    const victimCadence = await owner.sprints.getCadence(victimGoalId)
    expect(victimCadence).toBeNull()

    const attackerCadence = await attacker.sprints.getCadence(attackerGoalId)
    expect(attackerCadence?.enabled).toBe(true)
  })

  it('denies closing another project\'s sprint via injected body.goalId', async () => {
    const res = await attackerRaw.post(`/module/sprints/sprint/${victimSprintId}/close`, {
      goalId: attackerGoalId,
      outcomes: [],
      goalAchieved: false,
    })
    expect(res.status).toBe(403)

    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.status).toBe('planned')
  })

  it('denies overwriting another project\'s sprint retro via injected body.goalId', async () => {
    const res = await attackerRaw.put(`/module/sprints/sprint/${victimSprintId}/retro`, {
      goalId: attackerGoalId,
      wentWell: 'HACKED',
    })
    expect(res.status).toBe(403)

    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.retro?.wentWell ?? null).toBeNull()
  })

  it('denies review/pause/resume on another project\'s sprint', async () => {
    for (const action of ['review', 'pause', 'resume']) {
      const res = await attackerRaw.post(`/module/sprints/sprint/${victimSprintId}/${action}`, {
        goalId: attackerGoalId,
      })
      expect(res.status).toBe(403)
    }
    const victim = await owner.sprints.getById(victimSprintId)
    expect(victim?.status).toBe('planned')
  })

  it('denies reading another project\'s burndown, velocity and cadence', async () => {
    const burndown = await attackerRaw.get(`/module/sprints/sprint/${victimSprintId}/burndown`)
    expect(burndown.status).toBe(403)

    const velocity = await attackerRaw.get(`/module/sprints/goal/${victimGoalId}/velocity`)
    expect(velocity.status).toBe(403)

    const cadence = await attackerRaw.get(`/module/sprints/goal/${victimGoalId}/cadence`)
    expect(cadence.status).toBe(403)
  })

  describe('setTaskSprint goal boundary', () => {
    it('denies pulling another project\'s task into the attacker\'s sprint', async () => {
      const res = await attackerRaw.patch(`/module/sprints/task/${victimTaskId}/sprint`, {
        sprintId: attackerSprintId,
      })
      expect(res.status).toBe(403)

      // The victim task stays in the victim sprint.
      const page = await owner.sprints.getPlanningTasks({ sprintId: victimSprintId, scope: 'sprint' })
      expect(page?.tasks.map((t) => t.id)).toContain(victimTaskId)
    })

    it('denies pushing the attacker\'s task into another project\'s sprint (manager goal-match)', async () => {
      // canAssignSprintTasks authorizes on the task's (attacker's) goal, so the
      // middleware passes — only the manager's task.goalId === sprint.goalId check
      // can stop this. It must reject.
      const res = await attackerRaw.patch(`/module/sprints/task/${attackerTaskId}/sprint`, {
        sprintId: victimSprintId,
      })
      expect(res.status).toBe(403)

      // The attacker's task must NOT appear in the victim sprint.
      const page = await owner.sprints.getPlanningTasks({ sprintId: victimSprintId, scope: 'sprint' })
      expect(page?.tasks.map((t) => t.id)).not.toContain(attackerTaskId)
    })
  })

  describe('positive control — the owner is not over-blocked', () => {
    // Proves the fixes deny attackers without breaking legitimate access: if a
    // future over-broad fix 403'd everyone, the IDOR tests above would still pass
    // but these would fail.
    let scratchSprintId: number

    beforeAll(async () => {
      const s = await attacker.sprints.create({
        goalId: attackerGoalId, name: 'Owner scratch', startDate: ymd(7), endDate: ymd(21),
      })
      if (!s) throw new Error('Failed to create scratch sprint')
      scratchSprintId = s.id
    })

    it('can read and update its own sprint', async () => {
      const fetched = await attacker.sprints.getById(scratchSprintId)
      expect(fetched?.id).toBe(scratchSprintId)

      const updated = await attacker.sprints.update({ sprintId: scratchSprintId, name: 'Renamed by owner' })
      expect(updated?.name).toBe('Renamed by owner')
    })

    it('can run its own sprint through the lifecycle', async () => {
      const activated = await attacker.sprints.activate(scratchSprintId)
      expect(activated?.status).toBe('active')

      const paused = await attacker.sprints.pause(scratchSprintId)
      expect(paused?.pausedAt).toBeTruthy()

      const resumed = await attacker.sprints.resume(scratchSprintId)
      expect(resumed?.pausedAt).toBeNull()
    })

    it('can read its own analytics', async () => {
      const burndown = await attacker.sprints.getBurndown(scratchSprintId)
      expect(burndown).toBeDefined()

      const velocity = await attacker.sprints.getVelocity({ goalId: attackerGoalId })
      expect(Array.isArray(velocity)).toBe(true)
    })
  })
})

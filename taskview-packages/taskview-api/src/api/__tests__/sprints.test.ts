import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest'
import { initApi } from './init-api'
import { ymd } from './test-helpers'
import type { SprintPlanningSprintPage } from '@/api/sprints.types'

describe('Sprints', () => {
  let $api: TvApi
  let goalId: number
  const created: number[] = []

  /** Track a sprint so afterEach can drive it to a terminal/deletable state. */
  const track = (id: number) => { created.push(id); return id }

  /** Force a sprint out of any active/review state so it never blocks later activations. */
  async function releaseSprint(id: number) {
    const s = await $api.sprints.getById(id).catch(() => null)
    if (!s) return
    if (s.status === 'draft' || s.status === 'planned') {
      await $api.sprints.remove(id).catch(() => {})
      return
    }
    if (s.status === 'active') {
      await $api.sprints.startReview(id).catch(() => {})
    }
    const cur = await $api.sprints.getById(id).catch(() => null)
    if (cur?.status === 'review') {
      await $api.sprints.close({ sprintId: id, outcomes: [], goalAchieved: false }).catch(() => {})
    }
  }

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    const goal = await $api.goals.createGoal({ name: `Sprint test project-${Date.now()}` }).catch(console.error)
    if (!goal) throw new Error('Failed to create goal')
    goalId = goal.id!
  })

  afterEach(async () => {
    for (const id of created) {
      await releaseSprint(id)
    }
    created.length = 0
  })

  afterAll(async () => {
    await $api.goals.deleteGoal(goalId).catch(() => {})
  })

  async function createPlanned(name = `Planned-${Date.now()}`) {
    const sprint = await $api.sprints.create({
      goalId,
      name,
      startDate: ymd(7),
      endDate: ymd(21),
    }).catch(console.error)
    if (!sprint) throw new Error('Failed to create sprint')
    return track(sprint.id)
  }

  describe('CRUD', () => {
    it('creates a planned sprint when startDate is in the future', async () => {
      const sprint = await $api.sprints.create({
        goalId,
        name: 'Future sprint',
        startDate: ymd(7),
        endDate: ymd(21),
        goalText: 'Ship the thing',
        capacity: 40,
      }).catch(console.error)

      if (!sprint) throw new Error('Failed to create sprint')
      track(sprint.id)

      expect(sprint.id).toBeGreaterThan(0)
      expect(sprint.goalId).toBe(goalId)
      expect(sprint.name).toBe('Future sprint')
      expect(sprint.status).toBe('planned')
      expect(sprint.startDate).toBe(ymd(7))
      expect(sprint.endDate).toBe(ymd(21))
      expect(sprint.goalText).toBe('Ship the thing')
      expect(Number(sprint.capacity)).toBe(40)
    })

    it('creates a draft sprint when startDate is today or earlier', async () => {
      const sprint = await $api.sprints.create({
        goalId,
        name: 'Draft sprint',
        startDate: ymd(0),
        endDate: ymd(14),
      }).catch(console.error)

      if (!sprint) throw new Error('Failed to create sprint')
      track(sprint.id)

      expect(sprint.status).toBe('draft')
    })

    it('rejects creation when endDate is before startDate', async () => {
      const sprint = await $api.sprints.create({
        goalId,
        name: 'Bad dates',
        startDate: ymd(10),
        endDate: ymd(5),
      }).catch(() => null)

      expect(sprint).toBeFalsy()
    })

    it('lists sprints for a goal', async () => {
      const id = await createPlanned('Listed sprint')

      const list = await $api.sprints.listForGoal({ goalId }).catch(console.error)
      if (!list) throw new Error('Failed to list sprints')

      expect(Array.isArray(list)).toBe(true)
      expect(list.find((s) => s.id === id)).toBeDefined()
    })

    it('filters sprints by status', async () => {
      const plannedId = await createPlanned('Planned for filter')
      const draft = await $api.sprints.create({
        goalId, name: 'Draft for filter', startDate: ymd(0), endDate: ymd(14),
      }).catch(console.error)
      if (!draft) throw new Error('Failed to create draft')
      track(draft.id)

      const onlyPlanned = await $api.sprints.listForGoal({ goalId, status: 'planned' }).catch(console.error)
      if (!onlyPlanned) throw new Error('Failed to filter sprints')

      expect(onlyPlanned.every((s) => s.status === 'planned')).toBe(true)
      expect(onlyPlanned.find((s) => s.id === plannedId)).toBeDefined()
      expect(onlyPlanned.find((s) => s.id === draft.id)).toBeUndefined()
    })

    it('gets a sprint by id with a null retro', async () => {
      const id = await createPlanned('Fetched sprint')

      const sprint = await $api.sprints.getById(id).catch(console.error)
      if (!sprint) throw new Error('Failed to get sprint')

      expect(sprint.id).toBe(id)
      expect(sprint.retro).toBeNull()
    })

    it('updates name, dates, goalText and capacity', async () => {
      const id = await createPlanned('Before update')

      const updated = await $api.sprints.update({
        sprintId: id,
        name: 'After update',
        startDate: ymd(8),
        endDate: ymd(22),
        goalText: 'Revised goal',
        capacity: 55,
      }).catch(console.error)
      if (!updated) throw new Error('Failed to update sprint')

      expect(updated.name).toBe('After update')
      expect(updated.startDate).toBe(ymd(8))
      expect(updated.endDate).toBe(ymd(22))
      expect(updated.goalText).toBe('Revised goal')
      expect(Number(updated.capacity)).toBe(55)
    })

    it('deletes a draft/planned sprint', async () => {
      const sprint = await $api.sprints.create({
        goalId, name: 'To delete', startDate: ymd(5), endDate: ymd(19),
      }).catch(console.error)
      if (!sprint) throw new Error('Failed to create sprint')

      const result = await $api.sprints.remove(sprint.id).catch(console.error)
      expect(result).toBe(true)

      const gone = await $api.sprints.getById(sprint.id).catch(() => null)
      expect(gone).toBeNull()
    })
  })

  describe('Lifecycle', () => {
    it('activates a planned sprint', async () => {
      const id = await createPlanned()

      const activated = await $api.sprints.activate(id).catch(console.error)
      if (!activated) throw new Error('Failed to activate')

      expect(activated.status).toBe('active')
    })

    it('rejects activating a second sprint while one is active', async () => {
      const first = await createPlanned('First active')
      await $api.sprints.activate(first)

      const second = await createPlanned('Second sprint')
      const conflict = await $api.sprints.activate(second).catch(() => null)

      expect(conflict).toBeFalsy()
    })

    it('rejects deleting an active sprint', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)

      const result = await $api.sprints.remove(id).catch(() => null)
      expect(result).toBeFalsy()
    })

    it('pauses and resumes an active sprint', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)

      const paused = await $api.sprints.pause(id).catch(console.error)
      if (!paused) throw new Error('Failed to pause')
      expect(paused.status).toBe('active')
      expect(paused.pausedAt).toBeTruthy()

      const resumed = await $api.sprints.resume(id).catch(console.error)
      if (!resumed) throw new Error('Failed to resume')
      expect(resumed.status).toBe('active')
      expect(resumed.pausedAt).toBeNull()
    })

    it('rejects pausing a sprint that is not active', async () => {
      const id = await createPlanned()
      const result = await $api.sprints.pause(id).catch(() => null)
      expect(result).toBeFalsy()
    })

    it('moves an active sprint into review', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)

      const review = await $api.sprints.startReview(id).catch(console.error)
      if (!review) throw new Error('Failed to start review')

      expect(review.status).toBe('review')
      expect(review.reviewStartedAt).toBeTruthy()
    })

    it('rejects starting review on a non-active sprint', async () => {
      const id = await createPlanned()
      const result = await $api.sprints.startReview(id).catch(() => null)
      expect(result).toBeFalsy()
    })

    it('closes a sprint in review and marks it completed', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)
      await $api.sprints.startReview(id)

      const closed = await $api.sprints.close({
        sprintId: id,
        outcomes: [],
        goalAchieved: true,
      }).catch(console.error)
      if (!closed) throw new Error('Failed to close')

      expect(closed.status).toBe('completed')
      expect(closed.goalAchieved).toBe(true)
      expect(closed.completedAt).toBeTruthy()
    })

    it('rejects closing a sprint that is not in review', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)

      const result = await $api.sprints.close({ sprintId: id, outcomes: [], goalAchieved: true }).catch(() => null)
      expect(result).toBeFalsy()
    })

    it('treats a completed sprint as read-only and undeletable', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)
      await $api.sprints.startReview(id)
      await $api.sprints.close({ sprintId: id, outcomes: [], goalAchieved: false })

      const update = await $api.sprints.update({ sprintId: id, name: 'nope' }).catch(() => null)
      expect(update).toBeFalsy()

      const remove = await $api.sprints.remove(id).catch(() => null)
      expect(remove).toBeFalsy()
    })
  })

  describe('Close outcomes', () => {
    async function reviewSprintWithTask(opts: { complete?: boolean } = {}) {
      const id = await createPlanned()
      const task = await $api.tasks.createTask({ goalId, description: `Outcome task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')
      if (opts.complete) await $api.tasks.updateTask({ id: task.id, complete: true })
      await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id })
      await $api.sprints.activate(id)
      await $api.sprints.startReview(id)
      return { id, taskId: task.id }
    }

    it('carries an unfinished task over to the target sprint', async () => {
      const target = await createPlanned('Carry-over target')
      const { id, taskId } = await reviewSprintWithTask()

      const closed = await $api.sprints.close({
        sprintId: id,
        outcomes: [{ taskId, outcome: 'carried-over', carriedOverTo: target }],
        goalAchieved: false,
      }).catch(console.error)
      expect(closed).toBeTruthy()

      const moved = await $api.tasks.fetchTaskById(taskId).catch(console.error)
      expect(moved?.sprintId).toBe(target)

      await $api.tasks.deleteTask(taskId).catch(() => {})
    })

    it('drops an unfinished task out of the sprint', async () => {
      const { id, taskId } = await reviewSprintWithTask()

      const closed = await $api.sprints.close({
        sprintId: id,
        outcomes: [{ taskId, outcome: 'dropped' }],
        goalAchieved: false,
      }).catch(console.error)
      expect(closed).toBeTruthy()

      const dropped = await $api.tasks.fetchTaskById(taskId).catch(console.error)
      expect(dropped?.sprintId).toBeNull()

      await $api.tasks.deleteTask(taskId).catch(() => {})
    })

    it('forces a completed task to "accepted" even when the client requests "dropped"', async () => {
      const { id, taskId } = await reviewSprintWithTask({ complete: true })

      await $api.sprints.close({
        sprintId: id,
        outcomes: [{ taskId, outcome: 'dropped' }],
        goalAchieved: true,
      })

      // A done task can't be dropped — it is accepted and stays in the closed sprint.
      const kept = await $api.tasks.fetchTaskById(taskId).catch(console.error)
      expect(kept?.sprintId).toBe(id)

      await $api.tasks.deleteTask(taskId).catch(() => {})
    })

    it('rejects carrying a task over to the same sprint', async () => {
      const { id, taskId } = await reviewSprintWithTask()

      const result = await $api.sprints.close({
        sprintId: id,
        outcomes: [{ taskId, outcome: 'carried-over', carriedOverTo: id }],
        goalAchieved: false,
      }).catch(() => null)
      expect(result).toBeFalsy()

      const stillReview = await $api.sprints.getById(id).catch(console.error)
      expect(stillReview?.status).toBe('review')

      await $api.tasks.deleteTask(taskId).catch(() => {})
    })

    it('rejects carrying a task over to a sprint in a different project', async () => {
      const otherGoal = await $api.goals.createGoal({ name: `Other project-${Date.now()}` }).catch(console.error)
      if (!otherGoal) throw new Error('Failed to create other goal')
      const otherSprint = await $api.sprints.create({
        goalId: otherGoal.id!, name: 'Other sprint', startDate: ymd(7), endDate: ymd(21),
      }).catch(console.error)
      if (!otherSprint) throw new Error('Failed to create other sprint')

      const { id, taskId } = await reviewSprintWithTask()

      const result = await $api.sprints.close({
        sprintId: id,
        outcomes: [{ taskId, outcome: 'carried-over', carriedOverTo: otherSprint.id }],
        goalAchieved: false,
      }).catch(() => null)
      expect(result).toBeFalsy()

      await $api.tasks.deleteTask(taskId).catch(() => {})
      await $api.goals.deleteGoal(otherGoal.id!).catch(() => {})
    })
  })

  describe('Tasks in sprint', () => {
    it('assigns a task to a sprint and removes it', async () => {
      const id = await createPlanned()
      const task = await $api.tasks.createTask({ goalId, description: `Sprint task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')

      const assigned = await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id }).catch(console.error)
      expect(assigned).toBeDefined()
      expect(assigned!.sprintId).toBe(id)

      const inSprint = await $api.sprints.getPlanningTasks({ sprintId: id, scope: 'sprint' }).catch(console.error)
      expect(inSprint?.tasks.find((t) => t.id === task.id)).toBeDefined()

      const removed = await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: null }).catch(console.error)
      expect(removed).toBeDefined()
      expect(removed!.sprintId).toBeNull()

      await $api.tasks.deleteTask(task.id).catch(() => {})
    })

    it('rejects assigning a task into a completed sprint', async () => {
      const id = await createPlanned()
      await $api.sprints.activate(id)
      await $api.sprints.startReview(id)
      await $api.sprints.close({ sprintId: id, outcomes: [], goalAchieved: false })

      const task = await $api.tasks.createTask({ goalId, description: `Late task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')

      const result = await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id }).catch(() => null)
      expect(result).toBeFalsy()

      await $api.tasks.deleteTask(task.id).catch(() => {})
    })

    it('rejects assigning a task to a sprint in a different project', async () => {
      const otherGoal = await $api.goals.createGoal({ name: `Foreign project-${Date.now()}` }).catch(console.error)
      if (!otherGoal) throw new Error('Failed to create other goal')
      const otherSprint = await $api.sprints.create({
        goalId: otherGoal.id!, name: 'Foreign sprint', startDate: ymd(7), endDate: ymd(21),
      }).catch(console.error)
      if (!otherSprint) throw new Error('Failed to create other sprint')

      const task = await $api.tasks.createTask({ goalId, description: `Foreign assign-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')

      const result = await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: otherSprint.id }).catch(() => null)
      expect(result).toBeFalsy()

      await $api.tasks.deleteTask(task.id).catch(() => {})
      await $api.goals.deleteGoal(otherGoal.id!).catch(() => {})
    })

    it('separates backlog and sprint planning scopes with capacity totals', async () => {
      const id = await createPlanned()
      const task = await $api.tasks.createTask({ goalId, description: `Backlog task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')
      await $api.tasks.updateTask({ id: task.id, estimateValue: 8 })

      const backlog = await $api.sprints.getPlanningTasks({ sprintId: id, scope: 'backlog' }).catch(console.error)
      expect(backlog?.tasks.find((t) => t.id === task.id)).toBeDefined()

      await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id })

      const sprintScope = await $api.sprints.getPlanningTasks({ sprintId: id, scope: 'sprint' }).catch(console.error) as SprintPlanningSprintPage | undefined
      expect(sprintScope?.tasks.find((t) => t.id === task.id)).toBeDefined()
      expect(sprintScope?.totalPoints).toBe(8)

      const backlogAfter = await $api.sprints.getPlanningTasks({ sprintId: id, scope: 'backlog' }).catch(console.error)
      expect(backlogAfter?.tasks.find((t) => t.id === task.id)).toBeUndefined()

      await $api.tasks.deleteTask(task.id).catch(() => {})
    })
  })

  describe('Retro', () => {
    it('saves and reads back a retrospective', async () => {
      const id = await createPlanned()

      const saved = await $api.sprints.saveRetro({
        sprintId: id,
        wentWell: 'Shipped on time',
        wentBad: 'Too many meetings',
        actionItems: 'Fewer meetings',
      }).catch(console.error)
      expect(saved).toBeDefined()

      const sprint = await $api.sprints.getById(id).catch(console.error)
      expect(sprint?.retro).toBeDefined()
      expect(sprint?.retro?.wentWell).toBe('Shipped on time')
      expect(sprint?.retro?.wentBad).toBe('Too many meetings')
      expect(sprint?.retro?.actionItems).toBe('Fewer meetings')
    })
  })

  describe('Burndown & Velocity', () => {
    it('returns a burndown curve with the total estimate', async () => {
      const id = await createPlanned()
      const task = await $api.tasks.createTask({ goalId, description: `Burndown task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')
      await $api.tasks.updateTask({ id: task.id, estimateValue: 6 })
      await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id })

      const burndown = await $api.sprints.getBurndown(id).catch(console.error)
      if (!burndown) throw new Error('Failed to get burndown')

      expect(burndown.total).toBeGreaterThanOrEqual(6)
      expect(Array.isArray(burndown.points)).toBe(true)
      expect(burndown.points.length).toBeGreaterThan(0)

      await $api.tasks.deleteTask(task.id).catch(() => {})
    })

    it('reports velocity for completed sprints', async () => {
      const id = await createPlanned()
      const task = await $api.tasks.createTask({ goalId, description: `Velocity task-${Date.now()}` }).catch(console.error)
      if (!task) throw new Error('Failed to create task')
      await $api.tasks.updateTask({ id: task.id, estimateValue: 5, complete: true })
      await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: id })

      await $api.sprints.activate(id)
      await $api.sprints.startReview(id)
      await $api.sprints.close({ sprintId: id, outcomes: [], goalAchieved: true })

      const velocity = await $api.sprints.getVelocity({ goalId }).catch(console.error)
      if (!velocity) throw new Error('Failed to get velocity')

      const point = velocity.find((p) => p.sprintId === id)
      expect(point).toBeDefined()
      expect(point!.acceptedHours).toBe(5)
      expect(point!.plannedHours).toBe(5)

      await $api.tasks.deleteTask(task.id).catch(() => {})
    })
  })

  describe('Cadence', () => {
    it('returns null cadence before configuration', async () => {
      const fresh = await $api.goals.createGoal({ name: `Cadence empty-${Date.now()}` }).catch(console.error)
      if (!fresh) throw new Error('Failed to create goal')

      const cadence = await $api.sprints.getCadence(fresh.id!).catch(console.error)
      expect(cadence).toBeNull()

      await $api.goals.deleteGoal(fresh.id!).catch(() => {})
    })

    it('configures cadence and auto-generates planned sprints', async () => {
      const fresh = await $api.goals.createGoal({ name: `Cadence project-${Date.now()}` }).catch(console.error)
      if (!fresh) throw new Error('Failed to create goal')
      const cadenceGoalId = fresh.id!

      const saved = await $api.sprints.setCadence({
        goalId: cadenceGoalId,
        enabled: true,
        lengthDays: 7,
        startDate: ymd(0),
        lookahead: 2,
        nameTemplate: 'Iteration {n}',
      }).catch(console.error)
      if (!saved) throw new Error('Failed to set cadence')

      expect(saved.enabled).toBe(true)
      expect(saved.lengthDays).toBe(7)
      expect(saved.lookahead).toBe(2)
      expect(saved.nameTemplate).toBe('Iteration {n}')

      const cadence = await $api.sprints.getCadence(cadenceGoalId).catch(console.error)
      expect(cadence?.enabled).toBe(true)
      expect(cadence?.lengthDays).toBe(7)

      const generated = await $api.sprints.listForGoal({ goalId: cadenceGoalId }).catch(console.error)
      expect(generated && generated.length).toBeGreaterThanOrEqual(1)
      expect(generated!.every((s) => s.status === 'planned')).toBe(true)

      await $api.goals.deleteGoal(cadenceGoalId).catch(() => {})
    })
  })
})

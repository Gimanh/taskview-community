import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { initApi, API_URL, DEFAULT_USER, DEFAULT_USER_2, DEFAULT_PASSWORD } from './init-api'
import { ymd } from './test-helpers'
import type { RecurrenceRuleDetails } from '@/api/recurrence.types'

/**
 * Integration tests for recurring tasks (lazy materialization).
 *
 * The model keeps exactly ONE open instance per series: completing it
 * materializes the next occurrence through an async event handler, so
 * assertions about "the next card" poll via waitFor().
 *
 * All rules use Europe/Moscow (fixed UTC+3, no DST) with a 10:45 wall-clock
 * time, so UTC expectations are deterministic: stored start_time is 07:45:00.
 */
describe('Recurrence', () => {
  let $api: TvApi
  let raw: AxiosInstance
  let goalId: number

  const MSK_TIME = 'T10:45:00'
  const UTC_TIME = '07:45:00'

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    // Raw axios with validateStatus:true to assert error statuses directly.
    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER,
      password: DEFAULT_PASSWORD,
    })
    raw = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })

    const goal = await $api.goals.createGoal({ name: `Recurrence test project-${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')
    goalId = goal.id!
  })

  afterAll(async () => {
    await $api.goals.deleteGoal(goalId).catch(() => {})
  })

  async function createTask(description: string, startDate = ymd(3)) {
    const task = await $api.tasks.createTask({
      goalId,
      description,
      startDate,
      startTime: UTC_TIME, // stored frame is UTC; wall-clock 10:45 MSK
      endDate: startDate,
      endTime: '08:45:00',
    })
    if (!task) throw new Error('Failed to create task')
    return task
  }

  async function createRule(taskId: number, rrule: string, startDate = ymd(3)) {
    return await $api.recurrence.create({
      taskId,
      rrule,
      dtstart: `${startDate}${MSK_TIME}`,
      timezone: 'Europe/Moscow',
    })
  }

  /** Last day of the month `monthsAhead` months from now ('YYYY-MM-DD', UTC). */
  function lastDayOfMonth(monthsAhead: number): string {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead + 1, 0)).toISOString().slice(0, 10)
  }

  /** Polls the rule details until the predicate holds (materialization is async). */
  async function waitFor(
    ruleId: number,
    predicate: (details: RecurrenceRuleDetails) => boolean,
    timeoutMs = 8000,
  ): Promise<RecurrenceRuleDetails> {
    const startedAt = Date.now()
    for (;;) {
      const details = await $api.recurrence.getById(ruleId).catch(() => null)
      if (details && predicate(details)) return details
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`waitFor timed out for rule ${ruleId}: ${JSON.stringify(details)?.slice(0, 300)}`)
      }
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  describe('validation', () => {
    let taskId: number

    beforeAll(async () => {
      taskId = (await createTask('Validation target')).id
    })

    const base = { dtstart: `${ymd(3)}${MSK_TIME}`, timezone: 'Europe/Moscow' }

    it('rejects sub-daily frequencies', async () => {
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'FREQ=HOURLY', ...base })
      expect(res.status).toBe(422)
    })

    it('rejects an invalid IANA timezone', async () => {
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'FREQ=DAILY', ...base, timezone: 'Mars/Olympus' })
      expect(res.status).toBe(422)
    })

    it('rejects a malformed rrule string', async () => {
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'garbage', ...base })
      expect(res.status).toBe(422)
    })

    it('rejects COUNT and UNTIL together (RFC 5545)', async () => {
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'FREQ=DAILY;COUNT=5;UNTIL=20270101T000000Z', ...base })
      expect(res.status).toBe(422)
    })

    it('rejects an oversized COUNT', async () => {
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'FREQ=DAILY;COUNT=100000', ...base })
      expect(res.status).toBe(422)
    })

    it('returns 404 for a missing task', async () => {
      const res = await raw.post('/module/recurrence', { taskId: 99999999, rrule: 'FREQ=DAILY', ...base })
      expect(res.status).toBe(404)
    })

    it('rejects a completed task as series origin', async () => {
      const done = await createTask('Already done')
      await $api.tasks.updateTask({ id: done.id, complete: true })
      const res = await raw.post('/module/recurrence', { taskId: done.id, rrule: 'FREQ=DAILY', ...base })
      expect(res.status).toBe(400)
    })

    it('rejects a subtask as series origin', async () => {
      const parent = await createTask('Parent')
      const sub = await $api.tasks.createTask({ goalId, parentId: parent.id, description: 'Subtask' })
      const res = await raw.post('/module/recurrence', { taskId: sub!.id, rrule: 'FREQ=DAILY', ...base })
      expect(res.status).toBe(400)
    })

    it('rejects a second rule on the same task', async () => {
      await createRule(taskId, 'FREQ=DAILY')
      const res = await raw.post('/module/recurrence', { taskId, rrule: 'FREQ=WEEKLY', ...base })
      expect(res.status).toBe(409)
    })
  })

  describe('lifecycle', () => {
    it('origin task becomes the open instance with a UTC-normalized window', async () => {
      const task = await createTask('Daily standup')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      expect(rule.state).toBe('active')
      expect(rule.instancesCreated).toBe(1)
      expect(rule.timezone).toBe('Europe/Moscow')

      const details = await $api.recurrence.getForTask(task.id)
      expect(details?.rule.id).toBe(rule.id)
      expect(details?.openInstance?.id).toBe(task.id)
      expect(details?.openInstance?.recurrenceInstanceDate).toBe(ymd(3))
      // 10:45 wall-clock Moscow stored as the 07:45 UTC instant
      expect(details?.openInstance?.startTime).toBe(UTC_TIME)
    })

    it('completing the open instance materializes exactly one next occurrence', async () => {
      const task = await createTask('Daily report')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      await $api.tasks.updateTask({ id: task.id, complete: true })

      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
      expect(details.openInstance?.startTime).toBe(UTC_TIME)
      expect(details.openInstance?.complete).toBe(false)
      expect(details.openInstance?.description).toBe('Daily report')
      expect(details.rule.instancesCreated).toBe(2)

      // A repeated complete=true PATCH must not spawn another instance.
      await $api.tasks.updateTask({ id: task.id, complete: true })
      await new Promise((r) => setTimeout(r, 1500))
      const after = await $api.recurrence.getById(rule.id)
      expect(after?.rule.instancesCreated).toBe(2)
    })

    it('weekly rule materializes on the next scheduled weekday', async () => {
      // First Monday at least 3 days out, so "today in MSK" never overtakes it.
      let offset = 3
      while (new Date(`${ymd(offset)}T00:00:00Z`).getUTCDay() !== 1) offset++

      const task = await createTask('Weekly sync', ymd(offset))
      const rule = await createRule(task.id, 'FREQ=WEEKLY;BYDAY=MO', ymd(offset))

      const details = await $api.recurrence.getForTask(task.id)
      expect(details?.openInstance?.recurrenceInstanceDate).toBe(ymd(offset))

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const next = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(next.openInstance?.recurrenceInstanceDate).toBe(ymd(offset + 7))
    })

    it('skip jumps the card to the next date and records the skipped occurrence', async () => {
      const task = await createTask('Skippable daily')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      const details = await $api.recurrence.skip(rule.id)
      expect(details.skipDates).toContain(ymd(3))
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
      // the skipped origin task is deleted, so its rule lookup is gone too
      const forTask = await raw.get(`/module/recurrence/task/${task.id}`)
      expect(forTask.status).toBe(404)
    })

    it('a COUNT-limited series ends after the last materialized instance is completed', async () => {
      const task = await createTask('Twice and done')
      const rule = await createRule(task.id, 'FREQ=DAILY;COUNT=2')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const second = await waitFor(rule.id, (d) => d.rule.instancesCreated === 2)
      expect(second.openInstance).toBeTruthy()

      await $api.tasks.updateTask({ id: second.openInstance!.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
      expect(ended.rule.instancesCreated).toBe(2)
    })

    it('pause blocks materialization; resume restores the open instance', async () => {
      const task = await createTask('Pausable daily')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      const paused = await $api.recurrence.pause(rule.id)
      expect(paused.state).toBe('paused')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      await new Promise((r) => setTimeout(r, 1500))
      const whilePaused = await $api.recurrence.getById(rule.id)
      expect(whilePaused?.openInstance).toBeNull()
      expect(whilePaused?.rule.instancesCreated).toBe(1)

      const resumed = await $api.recurrence.resume(rule.id)
      expect(resumed.state).toBe('active')
      const restored = await waitFor(rule.id, (d) => !!d.openInstance)
      expect(restored.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
    })

    it('renaming the open instance renames future occurrences (template auto-sync)', async () => {
      const task = await createTask('Original name')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      // user edits the visible card: description, note, priority
      await $api.tasks.updateTask({ id: task.id, description: 'Renamed card', note: 'fresh note', priorityId: 2 })
      await new Promise((r) => setTimeout(r, 800)) // template sync is event-driven

      const synced = await $api.recurrence.getById(rule.id)
      expect(synced?.rule.templateDescription).toBe('Renamed card')
      expect(synced?.rule.templateNote).toBe('fresh note')
      expect(synced?.rule.templatePriorityId).toBe(2)

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.description).toBe('Renamed card')
      expect(details.openInstance?.note).toBe('fresh note')
      expect(details.openInstance?.priorityId).toBe(2)

      // editing a COMPLETED (historical) instance must NOT touch the template
      await $api.tasks.updateTask({ id: task.id, description: 'History edit' })
      await new Promise((r) => setTimeout(r, 800))
      const after = await $api.recurrence.getById(rule.id)
      expect(after?.rule.templateDescription).toBe('Renamed card')
    })

    it('template overrides apply to the next materialized instance', async () => {
      const task = await createTask('Old name')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      const updated = await $api.recurrence.update({
        ruleId: rule.id,
        templateOverrides: { description: 'New name', priorityId: 3 },
      })
      expect(updated.templateDescription).toBe('New name')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.description).toBe('New name')
      expect(details.openInstance?.priorityId).toBe(3)
    })

    it('updating rrule and timezone re-anchors the series', async () => {
      const task = await createTask('Movable')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      const updated = await $api.recurrence.update({
        ruleId: rule.id,
        rrule: 'FREQ=WEEKLY;BYDAY=TH',
        timezone: 'Asia/Vladivostok',
        notifyOnOccurrence: true,
      })
      expect(updated.rrule).toContain('BYDAY=TH')
      expect(updated.timezone).toBe('Asia/Vladivostok')
      expect(updated.notifyOnOccurrence).toBe(true)
    })

    it('deleting the series keeps existing instances as ordinary tasks', async () => {
      const task = await createTask('Survivor')
      const rule = await createRule(task.id, 'FREQ=DAILY')

      const removed = await $api.recurrence.remove(rule.id)
      expect(removed.deleted).toBe(true)

      const ruleGone = await raw.get(`/module/recurrence/${rule.id}`)
      expect(ruleGone.status).toBe(404)

      const survivor = await $api.tasks.fetchTaskById(task.id)
      expect(survivor).toBeTruthy()
      expect(survivor!.recurrenceRuleId).toBeNull()
    })
  })

  describe('advanced schedules & series content', () => {
    it('a skipped occurrence counts toward COUNT (RFC 5545)', async () => {
      const task = await createTask('Skip eats count')
      const rule = await createRule(task.id, 'FREQ=DAILY;COUNT=2')

      // skip removes the origin and materializes occurrence #2 of 2
      const details = await $api.recurrence.skip(rule.id)
      expect(details.rule.instancesCreated).toBe(2)
      expect(details.skipDates).toContain(ymd(3))
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(4))

      // completing the last allowed occurrence ends the series
      await $api.tasks.updateTask({ id: details.openInstance!.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
    })

    it('an UNTIL-bounded series ends once the boundary is passed', async () => {
      const task = await createTask('Until series')
      const until = `${ymd(4).replace(/-/g, '')}T235959Z` // floating wall-clock boundary
      const rule = await createRule(task.id, `FREQ=DAILY;UNTIL=${until}`)

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const second = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(second.openInstance?.recurrenceInstanceDate).toBe(ymd(4))

      await $api.tasks.updateTask({ id: second.openInstance!.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
    })

    it('last-day-of-month rule lands on actual month ends', async () => {
      const firstEnd = lastDayOfMonth(1)
      const secondEnd = lastDayOfMonth(2)

      const task = await createTask('Close the books', firstEnd)
      const rule = await createRule(task.id, 'FREQ=MONTHLY;BYMONTHDAY=-1', firstEnd)

      const details = await $api.recurrence.getForTask(task.id)
      expect(details?.openInstance?.recurrenceInstanceDate).toBe(firstEnd)

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const next = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(next.openInstance?.recurrenceInstanceDate).toBe(secondEnd)
    })

    it('a date-only series gets deadline = occurrence date (shows up in Today/Upcoming)', async () => {
      const task = await $api.tasks.createTask({ goalId, description: 'No-end daily', startDate: ymd(3) })
      const rule = await $api.recurrence.create({
        taskId: task!.id,
        rrule: 'FREQ=DAILY',
        dtstart: `${ymd(3)}T00:00:00`,
        timezone: 'Europe/Moscow',
      })

      // the origin window is normalized the same way
      const origin = await $api.tasks.fetchTaskById(task!.id)
      expect(origin?.endDate).toBe(ymd(3))
      expect(origin?.endTime).toBeNull()

      await $api.tasks.updateTask({ id: task!.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task!.id)
      expect(details.openInstance?.startDate).toBe(ymd(4))
      expect(details.openInstance?.endDate).toBe(ymd(4))
      expect(details.openInstance?.startTime).toBeNull()
      expect(details.openInstance?.endTime).toBeNull()
    })

    it('a timed series without duration is due at the occurrence moment', async () => {
      const task = await $api.tasks.createTask({
        goalId,
        description: 'Timed no-end',
        startDate: ymd(3),
        startTime: UTC_TIME,
      })
      const rule = await createRule(task!.id, 'FREQ=DAILY')

      await $api.tasks.updateTask({ id: task!.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task!.id)
      expect(details.openInstance?.endDate).toBe(ymd(4))
      expect(details.openInstance?.endTime).toBe(UTC_TIME) // due exactly at 10:45 MSK
    })

    it('materialized instances inherit assignees and tags from the snapshot', async () => {
      const task = await createTask('Assigned standup')

      // collaborator + tag must exist on the origin BEFORE the rule snapshots them
      await $api.collaboration.inviteUserToGoal({ goalId, email: 'user2@test.com' })
      const users = await $api.collaboration.fetchUsersForGoal(goalId)
      const collabId = users?.find((u) => u.email === 'user2@test.com')?.id
      expect(collabId).toBeTruthy()
      await $api.tasks.toggleTasksAssignee({ taskId: task.id, userIds: [collabId!] })

      const tag = await $api.tags.createTag({ goalId, name: `recur-tag-${Date.now()}`, color: '#00ff00' })
      expect(tag?.id).toBeTruthy()
      await $api.tags.toggleTag({ tagId: tag!.id, taskId: task.id })

      const rule = await createRule(task.id, 'FREQ=DAILY')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)

      const instance = await $api.tasks.fetchTaskById(details.openInstance!.id)
      expect(instance?.assignedUsers).toContain(collabId)
      expect(instance?.tags).toContain(tag!.id)
    })

    it('a collaborator removed from the project stops being auto-assigned', async () => {
      const task = await createTask('Ex-employee standup')

      await $api.collaboration.inviteUserToGoal({ goalId, email: 'user2@test.com' })
      const users = await $api.collaboration.fetchUsersForGoal(goalId)
      const collabId = users?.find((u) => u.email === 'user2@test.com')?.id
      expect(collabId).toBeTruthy()
      await $api.tasks.toggleTasksAssignee({ taskId: task.id, userIds: [collabId!] })

      const rule = await createRule(task.id, 'FREQ=DAILY')

      // remove the collaborator — the assignee snapshot must be cleaned up
      await $api.collaboration.deleteUserFromGoal({ goalId, id: collabId! })
      await new Promise((r) => setTimeout(r, 1000)) // cleanup is event-driven

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)

      const instance = await $api.tasks.fetchTaskById(details.openInstance!.id)
      expect(instance?.assignedUsers ?? []).not.toContain(collabId)
    })
  })

  describe('cross-tenant access (IDOR)', () => {
    let attackerRaw: AxiosInstance
    let victimTaskId: number
    let victimRuleId: number

    beforeAll(async () => {
      const auth = await axios.post(`${API_URL}/module/auth/login`, {
        login: DEFAULT_USER_2,
        password: DEFAULT_PASSWORD,
      })
      attackerRaw = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${auth.data.access}` },
        validateStatus: () => true,
      })

      const task = await createTask('Victim recurring')
      victimTaskId = task.id
      const rule = await createRule(task.id, 'FREQ=DAILY')
      victimRuleId = rule.id
    })

    it('denies reading a foreign rule', async () => {
      const res = await attackerRaw.get(`/module/recurrence/${victimRuleId}`)
      expect(res.status).toBe(403)
    })

    it('denies reading a foreign rule through the task route', async () => {
      const res = await attackerRaw.get(`/module/recurrence/task/${victimTaskId}`)
      expect(res.status).toBe(403)
    })

    it('denies creating a rule on a foreign task', async () => {
      const res = await attackerRaw.post('/module/recurrence', {
        taskId: victimTaskId,
        rrule: 'FREQ=DAILY',
        dtstart: `${ymd(3)}${MSK_TIME}`,
        timezone: 'Europe/Moscow',
      })
      expect(res.status).toBe(403)
    })

    it('denies updating a foreign rule (including body.ruleId injection)', async () => {
      const res = await attackerRaw.patch(`/module/recurrence/${victimRuleId}`, {
        ruleId: victimRuleId, // injected — params must win anyway
        rrule: 'FREQ=YEARLY',
      })
      expect(res.status).toBe(403)

      const intact = await $api.recurrence.getById(victimRuleId)
      expect(intact?.rule.rrule).toContain('DAILY')
    })

    it('denies skip / pause / delete on a foreign rule', async () => {
      const skip = await attackerRaw.post(`/module/recurrence/${victimRuleId}/skip`, {})
      expect(skip.status).toBe(403)
      const pause = await attackerRaw.post(`/module/recurrence/${victimRuleId}/pause`, {})
      expect(pause.status).toBe(403)
      const del = await attackerRaw.delete(`/module/recurrence/${victimRuleId}`)
      expect(del.status).toBe(403)

      const intact = await $api.recurrence.getById(victimRuleId)
      expect(intact?.rule.state).toBe('active')
    })
  })
})

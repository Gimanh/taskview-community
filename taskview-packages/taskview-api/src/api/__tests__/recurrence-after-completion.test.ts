import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { initApi, API_URL, DEFAULT_USER, DEFAULT_PASSWORD } from './init-api'
import { ymd } from './test-helpers'
import type { RecurrenceRuleDetails } from '@/api/recurrence.types'

/**
 * Integration tests for the 'after-completion' schedule mode.
 *
 * Unlike the fixed mode (calendar grid anchored to dtstart), an
 * after-completion series has no calendar anchor: the next instance date is
 * exactly one FREQ/INTERVAL step after max(lastInstanceDate, today) — dates
 * stay strictly increasing even when the card is completed early, and BYDAY /
 * BYMONTHDAY have no defined meaning and are rejected.
 *
 * Same deterministic frame as recurrence.test.ts: Europe/Moscow (fixed UTC+3),
 * 10:45 wall-clock → 07:45:00 UTC stored.
 */
describe('Recurrence (after-completion)', () => {
  let $api: TvApi
  let raw: AxiosInstance
  let goalId: number

  const MSK_TIME = 'T10:45:00'
  const UTC_TIME = '07:45:00'

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER,
      password: DEFAULT_PASSWORD,
    })
    raw = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })

    const goal = await $api.goals.createGoal({ name: `After-completion test project-${Date.now()}` })
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
      startTime: UTC_TIME,
      endDate: startDate,
      endTime: '08:45:00',
    })
    if (!task) throw new Error('Failed to create task')
    return task
  }

  async function createAcRule(taskId: number, rrule: string, startDate = ymd(3)) {
    return await $api.recurrence.create({
      taskId,
      rrule,
      dtstart: `${startDate}${MSK_TIME}`,
      timezone: 'Europe/Moscow',
      scheduleMode: 'after-completion',
    })
  }

  /** Last day of the month `monthsAhead` months from now ('YYYY-MM-DD', UTC). */
  function lastDayOfMonth(monthsAhead: number): string {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead + 1, 0)).toISOString().slice(0, 10)
  }

  /** `iso` plus `months` calendar months, day clamped to the target month's length (luxon semantics). */
  function addMonthsClamped(iso: string, months: number): string {
    const [y, m, d] = iso.split('-').map(Number)
    const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
    return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10)
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
    const base = { dtstart: `${ymd(3)}${MSK_TIME}`, timezone: 'Europe/Moscow', scheduleMode: 'after-completion' }

    it('rejects an unknown scheduleMode value (request shape, 400)', async () => {
      const task = await createTask('Bad mode target')
      const res = await raw.post('/module/recurrence', { taskId: task.id, rrule: 'FREQ=DAILY', ...base, scheduleMode: 'whenever' })
      expect(res.status).toBe(400)
    })

    it('rejects an update that leaves no next step (UNTIL in the past)', async () => {
      const task = await createTask('Dead-end update')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')
      const res = await raw.patch(`/module/recurrence/${rule.id}`, { rrule: 'FREQ=DAILY;UNTIL=20000101T000000Z' })
      expect(res.status).toBe(422)
    })

    it('rejects BYDAY on create (no calendar anchor in this mode)', async () => {
      const task = await createTask('BYDAY target')
      const res = await raw.post('/module/recurrence', { taskId: task.id, rrule: 'FREQ=WEEKLY;BYDAY=MO', ...base })
      expect(res.status).toBe(422)
    })

    it('rejects BYMONTHDAY on create', async () => {
      const task = await createTask('BYMONTHDAY target')
      const res = await raw.post('/module/recurrence', { taskId: task.id, rrule: 'FREQ=MONTHLY;BYMONTHDAY=-1', ...base })
      expect(res.status).toBe(422)
    })

    it('rejects switching a BYDAY fixed rule to after-completion', async () => {
      const task = await createTask('Anchored fixed')
      const rule = await $api.recurrence.create({
        taskId: task.id,
        rrule: 'FREQ=WEEKLY;BYDAY=MO,TH',
        dtstart: `${ymd(3)}${MSK_TIME}`,
        timezone: 'Europe/Moscow',
      })
      const res = await raw.patch(`/module/recurrence/${rule.id}`, { scheduleMode: 'after-completion' })
      expect(res.status).toBe(422)

      const intact = await $api.recurrence.getById(rule.id)
      expect(intact?.rule.scheduleMode).toBe('fixed')
    })

    it('rejects updating the rrule to BYDAY while the mode stays after-completion', async () => {
      const task = await createTask('Stays unanchored')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')
      const res = await raw.patch(`/module/recurrence/${rule.id}`, { rrule: 'FREQ=WEEKLY;BYDAY=FR' })
      expect(res.status).toBe(422)
    })

    it('allows BYDAY when the same PATCH switches the rule back to fixed', async () => {
      const task = await createTask('Mode and rrule together')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')
      // validation must run against the NEW mode, not the stored one
      const res = await raw.patch(`/module/recurrence/${rule.id}`, {
        scheduleMode: 'fixed',
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
      })
      expect(res.status).toBe(200)

      const updated = await $api.recurrence.getById(rule.id)
      expect(updated?.rule.scheduleMode).toBe('fixed')
      expect(updated?.rule.rrule).toContain('BYDAY=MO')
    })
  })

  describe('lifecycle', () => {
    it('a rule created without scheduleMode defaults to fixed', async () => {
      const task = await createTask('Default mode')
      const rule = await $api.recurrence.create({
        taskId: task.id,
        rrule: 'FREQ=DAILY',
        dtstart: `${ymd(3)}${MSK_TIME}`,
        timezone: 'Europe/Moscow',
      })
      expect(rule.scheduleMode).toBe('fixed')
    })

    it('origin task becomes the open instance, mode carried in rule and details', async () => {
      const task = await createTask('AC standup')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')

      expect(rule.scheduleMode).toBe('after-completion')
      expect(rule.state).toBe('active')
      expect(rule.instancesCreated).toBe(1)

      const details = await $api.recurrence.getForTask(task.id)
      expect(details?.rule.scheduleMode).toBe('after-completion')
      expect(details?.openInstance?.id).toBe(task.id)
      expect(details?.openInstance?.recurrenceInstanceDate).toBe(ymd(3))
      expect(details?.openInstance?.startTime).toBe(UTC_TIME)
    })

    it('daily: completing steps one day past the scheduled date, even when completed early', async () => {
      const task = await createTask('AC daily')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')

      // completed today, 3 days ahead of schedule — the next date steps from
      // the scheduled day (max(lastInstanceDate, today)), NOT from today,
      // so instance dates stay strictly increasing
      await $api.tasks.updateTask({ id: task.id, complete: true })

      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
      expect(details.openInstance?.startTime).toBe(UTC_TIME)
      expect(details.openInstance?.complete).toBe(false)
      expect(details.openInstance?.description).toBe('AC daily')
      expect(details.rule.instancesCreated).toBe(2)
    })

    it('INTERVAL is respected: every 3 days lands 3 days after the scheduled date', async () => {
      const task = await createTask('AC every 3 days')
      const rule = await createAcRule(task.id, 'FREQ=DAILY;INTERVAL=3')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(6))
    })

    it('weekly: exactly +7 days, no weekday grid (contrast with fixed BYDAY)', async () => {
      const task = await createTask('AC weekly')
      const rule = await createAcRule(task.id, 'FREQ=WEEKLY')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(10))
    })

    it('monthly: the step clamps to the last valid day and does not re-anchor to month end', async () => {
      const start = lastDayOfMonth(1)
      const task = await createTask('AC monthly close', start)
      const rule = await createAcRule(task.id, 'FREQ=MONTHLY', start)

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const first = addMonthsClamped(start, 1)
      const second = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      // clamped calendar step, NOT a month-end anchor: from a 31-day month end
      // it lands on the 30th of a 30-day month
      expect(second.openInstance?.recurrenceInstanceDate).toBe(first)

      // the clamped day is what steps forward: Aug 31 → Sep 30 → Oct 30
      // (fixed BYMONTHDAY=-1 would re-anchor to Oct 31)
      await $api.tasks.updateTask({ id: second.openInstance!.id, complete: true })
      const third = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== second.openInstance!.id)
      expect(third.openInstance?.recurrenceInstanceDate).toBe(addMonthsClamped(first, 1))
    })

    it('yearly: exactly +1 year from the scheduled date', async () => {
      const task = await createTask('AC yearly review')
      const rule = await createAcRule(task.id, 'FREQ=YEARLY')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(addMonthsClamped(ymd(3), 12))
    })

    it('COUNT=1: completing the origin ends the series without a successor', async () => {
      const task = await createTask('AC one-shot')
      const rule = await createAcRule(task.id, 'FREQ=DAILY;COUNT=1')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
      expect(ended.rule.instancesCreated).toBe(1)
    })

    it('pause blocks the completion step; resume materializes it', async () => {
      const task = await createTask('AC pausable')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')

      await $api.recurrence.pause(rule.id)
      await $api.tasks.updateTask({ id: task.id, complete: true })
      await new Promise((r) => setTimeout(r, 1500))
      const whilePaused = await $api.recurrence.getById(rule.id)
      expect(whilePaused?.openInstance).toBeNull()
      expect(whilePaused?.rule.instancesCreated).toBe(1)

      await $api.recurrence.resume(rule.id)
      const restored = await waitFor(rule.id, (d) => !!d.openInstance)
      expect(restored.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
    })

    it('a COUNT-limited series ends after the last instance is completed', async () => {
      const task = await createTask('AC twice and done')
      const rule = await createAcRule(task.id, 'FREQ=DAILY;COUNT=2')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const second = await waitFor(rule.id, (d) => d.rule.instancesCreated === 2)
      expect(second.openInstance?.recurrenceInstanceDate).toBe(ymd(4))

      await $api.tasks.updateTask({ id: second.openInstance!.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
      expect(ended.rule.instancesCreated).toBe(2)
    })

    it('an UNTIL-bounded series ends once the next step lands past the boundary', async () => {
      const task = await createTask('AC until')
      const until = `${ymd(4).replace(/-/g, '')}T235959Z`
      const rule = await createAcRule(task.id, `FREQ=DAILY;UNTIL=${until}`)

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const second = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(second.openInstance?.recurrenceInstanceDate).toBe(ymd(4))

      // next step would be ymd(5) > UNTIL — the series is over
      await $api.tasks.updateTask({ id: second.openInstance!.id, complete: true })
      const ended = await waitFor(rule.id, (d) => d.rule.state === 'ended')
      expect(ended.openInstance).toBeNull()
    })

    it('skip jumps the card one interval step and records the skipped date', async () => {
      const task = await createTask('AC skippable')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')

      const details = await $api.recurrence.skip(rule.id)
      expect(details.skipDates).toContain(ymd(3))
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(4))
      expect(details.rule.instancesCreated).toBe(2)
    })

    it('switching a live fixed series to after-completion takes effect on the next completion', async () => {
      const task = await createTask('Mode switch mid-series')
      const rule = await $api.recurrence.create({
        taskId: task.id,
        rrule: 'FREQ=DAILY;INTERVAL=3',
        dtstart: `${ymd(3)}${MSK_TIME}`,
        timezone: 'Europe/Moscow',
      })

      const switched = await $api.recurrence.update({ ruleId: rule.id, scheduleMode: 'after-completion' })
      expect(switched.scheduleMode).toBe('after-completion')

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.recurrenceInstanceDate).toBe(ymd(6))
      expect(details.rule.scheduleMode).toBe('after-completion')
    })

    it('a date-only after-completion series stays date-only on the next instance', async () => {
      const task = await $api.tasks.createTask({ goalId, description: 'AC date-only', startDate: ymd(3) })
      const rule = await $api.recurrence.create({
        taskId: task!.id,
        rrule: 'FREQ=DAILY',
        dtstart: ymd(3),
        timezone: 'Europe/Moscow',
        scheduleMode: 'after-completion',
      })
      expect(rule.hasTime).toBe(false)

      await $api.tasks.updateTask({ id: task!.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task!.id)
      expect(details.openInstance?.startDate).toBe(ymd(4))
      expect(details.openInstance?.endDate).toBe(ymd(4))
      expect(details.openInstance?.startTime).toBeNull()
      expect(details.openInstance?.endTime).toBeNull()
    })

    it('template overrides apply to the next materialized instance', async () => {
      const task = await createTask('AC old name')
      const rule = await createAcRule(task.id, 'FREQ=DAILY')

      await $api.recurrence.update({
        ruleId: rule.id,
        templateOverrides: { description: 'AC new name', priorityId: 3 },
      })

      await $api.tasks.updateTask({ id: task.id, complete: true })
      const details = await waitFor(rule.id, (d) => !!d.openInstance && d.openInstance.id !== task.id)
      expect(details.openInstance?.description).toBe('AC new name')
      expect(details.openInstance?.priorityId).toBe(3)
    })
  })
})

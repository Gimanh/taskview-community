import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { registerTimeTrackingTools } from '../../tools/time-tracking.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)
registerTimeTrackingTools(server, api)

let goalId: number
let taskId: number
let secondaryTaskId: number
let organizationId: number

const iso = (offsetMinutes: number) => new Date(Date.now() + offsetMinutes * 60_000).toISOString()

beforeAll(async () => {
  const orgs = await api.organizations.fetch()
  if (!orgs || orgs.length === 0) throw new Error('No organizations available for user')
  organizationId = orgs[0].id

  const goalResult = await call(tools, 'create_goal', { name: `TimeTracking Test ${ts()}`, organizationId })
  goalId = parse(goalResult).id

  const taskResult = await call(tools, 'create_task', { goalId, description: `TT Task ${ts()}` })
  taskId = parse(taskResult).id

  const secondaryResult = await call(tools, 'create_task', { goalId, description: `TT Task 2 ${ts()}` })
  secondaryTaskId = parse(secondaryResult).id

  const active = await call(tools, 'get_active_timer', {})
  const data = parse(active)
  if (data) await call(tools, 'stop_timer', { entryId: data.id }).catch(() => {})
})

afterAll(async () => {
  const active = await call(tools, 'get_active_timer', {}).catch(() => null)
  if (active) {
    const data = parse(active)
    if (data) await call(tools, 'stop_timer', { entryId: data.id }).catch(() => {})
  }
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('time-tracking integration', () => {
  it('starts a timer and reports it as active', async () => {
    const started = await call(tools, 'start_timer', { taskId, description: 'integration timer' })
    const { entry, autoStoppedEntry } = parse(started)

    expect(entry.taskId).toBe(taskId)
    expect(entry.endedAt).toBeNull()
    expect(autoStoppedEntry).toBeNull()

    const active = await call(tools, 'get_active_timer', {})
    const activeEntry = parse(active)
    expect(activeEntry.id).toBe(entry.id)
  })

  it('auto-stops previous timer when starting a new one on another task', async () => {
    const second = await call(tools, 'start_timer', { taskId: secondaryTaskId })
    const { entry, autoStoppedEntry } = parse(second)

    expect(entry.taskId).toBe(secondaryTaskId)
    expect(autoStoppedEntry).not.toBeNull()
    expect(autoStoppedEntry.endedAt).not.toBeNull()
  })

  it('stops the active timer and reports no active afterwards', async () => {
    const stopped = await call(tools, 'stop_timer', {})
    const entry = parse(stopped)
    expect(entry.endedAt).not.toBeNull()

    const active = await call(tools, 'get_active_timer', {})
    expect(parse(active)).toBeNull()
  })

  it('logs a manual entry retroactively', async () => {
    const result = await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-60),
      endedAt: iso(-30),
      description: 'manual log',
      billable: true,
    })
    const entry = parse(result)
    expect(entry.taskId).toBe(taskId)
    expect(entry.durationSeconds).toBeGreaterThan(0)
    expect(entry.billable).toBe(true)
    expect(entry.description).toBe('manual log')
  })

  it('rejects manual entry with endedAt before startedAt', async () => {
    const result = await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-30),
      endedAt: iso(-60),
    })
    if (!result.isError) {
      expect(parse(result)).toBeNull()
    } else {
      expect(result.content[0].text).toMatch(/400|invalid|range/i)
    }
  })

  it('lists time entries filtered by goalId', async () => {
    const result = await call(tools, 'list_time_entries', { goalId })
    const entries = parse(result)
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
    for (const e of entries) expect(e.goalId).toBe(goalId)
  })

  it('lists time entries filtered by taskId', async () => {
    const result = await call(tools, 'list_time_entries', { taskId })
    const entries = parse(result)
    expect(Array.isArray(entries)).toBe(true)
    for (const e of entries) expect(e.taskId).toBe(taskId)
  })

  it('returns task summary with totalSeconds and byUser breakdown', async () => {
    const result = await call(tools, 'get_time_summary', { scope: 'task', id: taskId })
    const summary = parse(result)

    expect(typeof summary.totalSeconds).toBe('number')
    expect(summary.totalSeconds).toBeGreaterThan(0)
    expect(Array.isArray(summary.byUser)).toBe(true)
  })

  it('returns goal summary with byTask breakdown', async () => {
    const result = await call(tools, 'get_time_summary', { scope: 'goal', id: goalId })
    const summary = parse(result)

    expect(typeof summary.totalSeconds).toBe('number')
    expect(Array.isArray(summary.byUser)).toBe(true)
    expect(Array.isArray(summary.byTask)).toBe(true)
    expect(summary.byTask.some((t: { taskId: number }) => t.taskId === taskId)).toBe(true)
  })

  it('updates description of a completed entry', async () => {
    const created = await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-120),
      endedAt: iso(-90),
      description: 'before',
    })
    const entry = parse(created)

    const newDesc = `updated ${ts()}`
    const updated = await call(tools, 'update_time_entry', {
      id: entry.id,
      description: newDesc,
    })
    const result = parse(updated)
    expect(result.description).toBe(newDesc)
  })

  it('returns report summary for the organization', async () => {
    const result = await call(tools, 'get_time_report', {
      scope: 'summary',
      organizationId,
      from: iso(-60 * 24 * 7),
      to: iso(60),
      goalIds: [goalId],
    })
    const summary = parse(result)

    expect(typeof summary.totalSeconds).toBe('number')
    expect(typeof summary.totalBillableSeconds).toBe('number')
    expect(typeof summary.entriesCount).toBe('number')
    expect(summary.entriesCount).toBeGreaterThan(0)
  })

  it('returns report by-day grouped rows', async () => {
    const result = await call(tools, 'get_time_report', {
      scope: 'by-day',
      organizationId,
      from: iso(-60 * 24 * 7),
      to: iso(60),
      goalIds: [goalId],
    })
    const rows = parse(result)

    expect(Array.isArray(rows)).toBe(true)
    if (rows.length > 0) {
      expect(typeof rows[0].day).toBe('string')
      expect(typeof rows[0].totalSeconds).toBe('number')
    }
  })

  it('returns report by-user', async () => {
    const result = await call(tools, 'get_time_report', {
      scope: 'by-user',
      organizationId,
      from: iso(-60 * 24 * 7),
      to: iso(60),
      goalIds: [goalId],
    })
    const rows = parse(result)

    expect(Array.isArray(rows)).toBe(true)
    if (rows.length > 0) {
      expect(typeof rows[0].userId).toBe('number')
      expect(typeof rows[0].totalSeconds).toBe('number')
    }
  })

  it('returns report by-task', async () => {
    const result = await call(tools, 'get_time_report', {
      scope: 'by-task',
      organizationId,
      from: iso(-60 * 24 * 7),
      to: iso(60),
      goalIds: [goalId],
    })
    const rows = parse(result)

    expect(Array.isArray(rows)).toBe(true)
    expect(rows.some((r: { taskId: number }) => r.taskId === taskId)).toBe(true)
  })

  it('returns contributors for the goal', async () => {
    const result = await call(tools, 'get_time_contributors', {
      organizationId,
      from: iso(-60 * 24 * 7),
      to: iso(60),
      goalIds: [goalId],
    })
    const rows = parse(result)

    expect(Array.isArray(rows)).toBe(true)
    if (rows.length > 0) {
      expect(typeof rows[0].userId).toBe('number')
      expect(typeof rows[0].totalSeconds).toBe('number')
    }
  })

  it('rejects report request without organizationId', async () => {
    const result = await call(tools, 'get_time_report', {
      scope: 'summary',
      from: iso(-60 * 24),
      to: iso(60),
    } as unknown as Record<string, unknown>)
    expect(result.isError).toBe(true)
  })

  it('deletes a time entry', async () => {
    const created = await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-30),
      endedAt: iso(-15),
    })
    const entry = parse(created)

    const result = await call(tools, 'delete_time_entry', { id: entry.id })
    const data = parse(result)
    expect(data.deleted).toBe(true)

    const list = await call(tools, 'list_time_entries', { taskId })
    const entries = parse(list)
    expect(entries.some((e: { id: number }) => e.id === entry.id)).toBe(false)
  })

  it('stops a specific timer by entryId', async () => {
    const started = parse(await call(tools, 'start_timer', { taskId }))
    expect(started.entry.endedAt).toBeNull()

    const stopped = parse(await call(tools, 'stop_timer', { entryId: started.entry.id }))
    expect(stopped.id).toBe(started.entry.id)
    expect(stopped.endedAt).not.toBeNull()

    const active = parse(await call(tools, 'get_active_timer', {}))
    expect(active).toBeNull()
  })

  it('updates startedAt/endedAt of completed entry and recalculates durationSeconds', async () => {
    const created = parse(await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-60),
      endedAt: iso(-30),
    }))
    const originalDuration = created.durationSeconds

    const newStart = iso(-120)
    const newEnd = iso(-30)
    const updated = parse(await call(tools, 'update_time_entry', {
      id: created.id,
      startedAt: newStart,
      endedAt: newEnd,
    }))
    expect(updated.durationSeconds).not.toBe(originalDuration)
    expect(updated.durationSeconds).toBeGreaterThan(originalDuration)
    expect(new Date(updated.endedAt).getTime() - new Date(updated.startedAt).getTime())
      .toBe(updated.durationSeconds * 1000)

    await call(tools, 'delete_time_entry', { id: created.id }).catch(() => {})
  })

  it('refuses to change startedAt/endedAt of a running timer', async () => {
    const started = parse(await call(tools, 'start_timer', { taskId }))

    const result = await call(tools, 'update_time_entry', {
      id: started.entry.id,
      startedAt: iso(-60),
    })
    expect(result.isError).toBe(true)

    await call(tools, 'stop_timer', { entryId: started.entry.id }).catch(() => {})
  })

  it('allows description-only update on a running timer', async () => {
    const started = parse(await call(tools, 'start_timer', { taskId }))

    const updated = parse(await call(tools, 'update_time_entry', {
      id: started.entry.id,
      description: 'running update',
    }))
    expect(updated.description).toBe('running update')
    expect(updated.endedAt).toBeNull()

    await call(tools, 'stop_timer', { entryId: started.entry.id }).catch(() => {})
  })

  it('lists time entries filtered by from/to date range', async () => {
    const oldEntry = parse(await call(tools, 'log_time', {
      taskId,
      startedAt: '2026-01-01T10:00:00Z',
      endedAt: '2026-01-01T11:00:00Z',
      description: 'old',
    }))
    const recentEntry = parse(await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-30),
      endedAt: iso(-15),
      description: 'recent',
    }))

    const result = parse(await call(tools, 'list_time_entries', {
      taskId,
      from: iso(-60),
      to: iso(60),
    })) as Array<{ id: number }>

    expect(result.some((e) => e.id === recentEntry.id)).toBe(true)
    expect(result.some((e) => e.id === oldEntry.id)).toBe(false)

    await call(tools, 'delete_time_entry', { id: oldEntry.id }).catch(() => {})
    await call(tools, 'delete_time_entry', { id: recentEntry.id }).catch(() => {})
  })

  it('lists time entries with limit and offset', async () => {
    const created: number[] = []
    for (let i = 0; i < 3; i++) {
      const r = parse(await call(tools, 'log_time', {
        taskId,
        startedAt: iso(-60 - i * 10),
        endedAt: iso(-30 - i * 10),
      }))
      created.push(r.id)
    }

    const first = parse(await call(tools, 'list_time_entries', { taskId, limit: 2, offset: 0 })) as unknown[]
    const second = parse(await call(tools, 'list_time_entries', { taskId, limit: 2, offset: 2 })) as unknown[]
    expect(first.length).toBeLessThanOrEqual(2)
    expect(second.length).toBeLessThanOrEqual(2)

    for (const id of created) {
      await call(tools, 'delete_time_entry', { id }).catch(() => {})
    }
  })

  it('reportSummary with billable=true filter returns only billable seconds', async () => {
    const billable = parse(await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-50),
      endedAt: iso(-40),
      billable: true,
    }))
    const nonBillable = parse(await call(tools, 'log_time', {
      taskId,
      startedAt: iso(-30),
      endedAt: iso(-20),
      billable: false,
    }))

    const billableOnly = parse(await call(tools, 'get_time_report', {
      scope: 'summary',
      organizationId,
      from: iso(-60 * 24),
      to: iso(60),
      goalIds: [goalId],
      billable: true,
    }))
    const allOnly = parse(await call(tools, 'get_time_report', {
      scope: 'summary',
      organizationId,
      from: iso(-60 * 24),
      to: iso(60),
      goalIds: [goalId],
    }))

    expect(billableOnly.totalSeconds).toBeLessThan(allOnly.totalSeconds)

    await call(tools, 'delete_time_entry', { id: billable.id }).catch(() => {})
    await call(tools, 'delete_time_entry', { id: nonBillable.id }).catch(() => {})
  })
})

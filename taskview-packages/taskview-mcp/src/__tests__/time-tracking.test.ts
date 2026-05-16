import { describe, it, expect } from 'vitest'
import { registerTimeTrackingTools } from '../tools/time-tracking.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('time-tracking tools', () => {
  it('registers all time-tracking tools', () => {
    const { server, tools } = mockServer()
    registerTimeTrackingTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual([
      'start_timer',
      'stop_timer',
      'get_active_timer',
      'log_time',
      'list_time_entries',
      'get_time_summary',
      'update_time_entry',
      'get_time_report',
      'get_time_contributors',
      'delete_time_entry',
    ])
  })

  describe('start_timer', () => {
    it('returns entry and autoStoppedEntry from api', async () => {
      const { server, tools } = mockServer()
      const result = { entry: { id: 1, taskId: 42 }, autoStoppedEntry: null }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { start: apiReturn(result) } }))

      const res = await findTool(tools, 'start_timer').cb({ taskId: 42 })
      expect(res.content[0].text).toContain('"taskId": 42')
      expect(res.content[0].text).toContain('"autoStoppedEntry": null')
    })

    it('passes taskId and description to api', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const start = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: null, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { start } }))

      const desc = `working on bug ${ts()}`
      await findTool(tools, 'start_timer').cb({ taskId: 17, description: desc })
      expect(captured.taskId).toBe(17)
      expect(captured.description).toBe(desc)
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { start: apiThrow(`Forbidden ${ts()}`) } }))

      const res = await findTool(tools, 'start_timer').cb({ taskId: 1 })
      expect(res.isError).toBe(true)
      expect(res.content[0].text).toContain('Forbidden')
    })
  })

  describe('stop_timer', () => {
    it('stops user active timer when entryId omitted', async () => {
      const { server, tools } = mockServer()
      let capturedArg: unknown = 'not-called'
      const stop = (data: unknown) => {
        capturedArg = data
        return Promise.resolve({ response: { id: 1, endedAt: '2026-05-14T10:00:00Z' }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { stop } }))

      const res = await findTool(tools, 'stop_timer').cb({})
      expect(capturedArg).toEqual({})
      expect(res.content[0].text).toContain('endedAt')
    })

    it('passes specific entryId when provided', async () => {
      const { server, tools } = mockServer()
      let capturedArg: Record<string, unknown> = {}
      const stop = (data: Record<string, unknown>) => {
        capturedArg = data
        return Promise.resolve({ response: { id: 9 }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { stop } }))

      await findTool(tools, 'stop_timer').cb({ entryId: 9 })
      expect(capturedArg.entryId).toBe(9)
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { stop: apiThrow(`Not found ${ts()}`) } }))

      const res = await findTool(tools, 'stop_timer').cb({})
      expect(res.isError).toBe(true)
    })
  })

  describe('get_active_timer', () => {
    it('returns active entry', async () => {
      const { server, tools } = mockServer()
      const entry = { id: 5, taskId: 99, endedAt: null }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { getActive: apiReturn(entry) } }))

      const res = await findTool(tools, 'get_active_timer').cb({})
      expect(res.content[0].text).toContain('"taskId": 99')
      expect(res.content[0].text).toContain('"endedAt": null')
    })

    it('returns null when no active timer', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { getActive: apiReturn(null) } }))

      const res = await findTool(tools, 'get_active_timer').cb({})
      expect(res.isError).toBeUndefined()
      expect(res.content[0].text).toContain('null')
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { getActive: apiThrow(`Boom ${ts()}`) } }))

      const res = await findTool(tools, 'get_active_timer').cb({})
      expect(res.isError).toBe(true)
    })
  })

  describe('log_time', () => {
    it('passes all fields to createManual', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const createManual = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: { id: 1 }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { createManual } }))

      await findTool(tools, 'log_time').cb({
        taskId: 7,
        startedAt: '2026-05-14T09:00:00Z',
        endedAt: '2026-05-14T10:30:00Z',
        description: 'pair programming',
        billable: false,
      })
      expect(captured).toEqual({
        taskId: 7,
        startedAt: '2026-05-14T09:00:00Z',
        endedAt: '2026-05-14T10:30:00Z',
        description: 'pair programming',
        billable: false,
      })
    })

    it('returns created entry', async () => {
      const { server, tools } = mockServer()
      const entry = { id: 33, taskId: 7, durationSeconds: 5400 }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { createManual: apiReturn(entry) } }))

      const res = await findTool(tools, 'log_time').cb({
        taskId: 7,
        startedAt: '2026-05-14T09:00:00Z',
        endedAt: '2026-05-14T10:30:00Z',
      })
      expect(res.content[0].text).toContain('"durationSeconds": 5400')
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { createManual: apiThrow(`Invalid range ${ts()}`) } }))

      const res = await findTool(tools, 'log_time').cb({
        taskId: 1,
        startedAt: '2026-05-14T10:00:00Z',
        endedAt: '2026-05-14T09:00:00Z',
      })
      expect(res.isError).toBe(true)
    })
  })

  describe('list_time_entries', () => {
    it('returns entries', async () => {
      const { server, tools } = mockServer()
      const entries = [
        { id: 1, taskId: 1, durationSeconds: 60 },
        { id: 2, taskId: 1, durationSeconds: 120 },
      ]
      registerTimeTrackingTools(server, mockApi({ timeTracking: { fetchEntries: apiReturn(entries) } }))

      const res = await findTool(tools, 'list_time_entries').cb({ goalId: 5 })
      expect(res.content[0].text).toContain('"durationSeconds": 60')
      expect(res.content[0].text).toContain('"durationSeconds": 120')
    })

    it('passes filters to api', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const fetchEntries = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: [], rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { fetchEntries } }))

      await findTool(tools, 'list_time_entries').cb({
        goalId: 5,
        taskId: 10,
        userId: 3,
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
        limit: 100,
        offset: 50,
      })
      expect(captured.goalId).toBe(5)
      expect(captured.taskId).toBe(10)
      expect(captured.userId).toBe(3)
      expect(captured.from).toBe('2026-05-01T00:00:00Z')
      expect(captured.to).toBe('2026-05-31T23:59:59Z')
      expect(captured.limit).toBe(100)
      expect(captured.offset).toBe(50)
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { fetchEntries: apiThrow(`Forbidden ${ts()}`) } }))

      const res = await findTool(tools, 'list_time_entries').cb({ goalId: 1 })
      expect(res.isError).toBe(true)
    })
  })

  describe('get_time_summary', () => {
    it('routes scope=task to summaryByTask', async () => {
      const { server, tools } = mockServer()
      let calledTaskWith: number | null = null
      let calledGoalWith: number | null = null
      const summaryByTask = (id: number) => {
        calledTaskWith = id
        return Promise.resolve({ response: { totalSeconds: 360, byUser: [] }, rid: `rid-${ts()}` })
      }
      const summaryByGoal = (id: number) => {
        calledGoalWith = id
        return Promise.resolve({ response: { totalSeconds: 0, byUser: [], byTask: [] }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { summaryByTask, summaryByGoal } }))

      const res = await findTool(tools, 'get_time_summary').cb({ scope: 'task', id: 42 })
      expect(calledTaskWith).toBe(42)
      expect(calledGoalWith).toBeNull()
      expect(res.content[0].text).toContain('"totalSeconds": 360')
    })

    it('routes scope=goal to summaryByGoal', async () => {
      const { server, tools } = mockServer()
      let calledTaskWith: number | null = null
      let calledGoalWith: number | null = null
      const summaryByTask = (id: number) => {
        calledTaskWith = id
        return Promise.resolve({ response: null, rid: `rid-${ts()}` })
      }
      const summaryByGoal = (id: number) => {
        calledGoalWith = id
        return Promise.resolve({ response: { totalSeconds: 7200, byUser: [], byTask: [] }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { summaryByTask, summaryByGoal } }))

      const res = await findTool(tools, 'get_time_summary').cb({ scope: 'goal', id: 17 })
      expect(calledGoalWith).toBe(17)
      expect(calledTaskWith).toBeNull()
      expect(res.content[0].text).toContain('"totalSeconds": 7200')
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { summaryByTask: apiThrow(`Boom ${ts()}`) } }))

      const res = await findTool(tools, 'get_time_summary').cb({ scope: 'task', id: 1 })
      expect(res.isError).toBe(true)
    })
  })

  describe('update_time_entry', () => {
    it('passes fields to update', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const update = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: { id: 5 }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { update } }))

      await findTool(tools, 'update_time_entry').cb({
        id: 5,
        startedAt: '2026-05-14T09:00:00Z',
        endedAt: '2026-05-14T10:00:00Z',
        description: 'edit',
        billable: true,
      })
      expect(captured.id).toBe(5)
      expect(captured.startedAt).toBe('2026-05-14T09:00:00Z')
      expect(captured.endedAt).toBe('2026-05-14T10:00:00Z')
      expect(captured.description).toBe('edit')
      expect(captured.billable).toBe(true)
    })

    it('returns updated entry', async () => {
      const { server, tools } = mockServer()
      const entry = { id: 5, description: 'updated' }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { update: apiReturn(entry) } }))

      const res = await findTool(tools, 'update_time_entry').cb({ id: 5, description: 'updated' })
      expect(res.content[0].text).toContain('"description": "updated"')
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { update: apiThrow(`Forbidden ${ts()}`) } }))

      const res = await findTool(tools, 'update_time_entry').cb({ id: 1 })
      expect(res.isError).toBe(true)
    })
  })

  describe('get_time_report', () => {
    const baseParams = {
      organizationId: 1,
      from: '2026-05-01T00:00:00Z',
      to: '2026-05-31T23:59:59Z',
    }

    it('routes scope=by-day to reportByDay', async () => {
      const { server, tools } = mockServer()
      let called: string | null = null
      const reportByDay = () => { called = 'by-day'; return Promise.resolve({ response: [{ day: '2026-05-14', totalSeconds: 3600, entriesCount: 2 }], rid: `rid-${ts()}` }) }
      const reportByUser = () => { called = 'by-user'; return Promise.resolve({ response: [], rid: `rid-${ts()}` }) }
      const reportByTask = () => { called = 'by-task'; return Promise.resolve({ response: [], rid: `rid-${ts()}` }) }
      const reportSummary = () => { called = 'summary'; return Promise.resolve({ response: { totalSeconds: 0, totalBillableSeconds: 0, entriesCount: 0 }, rid: `rid-${ts()}` }) }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportByDay, reportByUser, reportByTask, reportSummary } }))

      const res = await findTool(tools, 'get_time_report').cb({ scope: 'by-day', ...baseParams })
      expect(called).toBe('by-day')
      expect(res.content[0].text).toContain('"day": "2026-05-14"')
    })

    it('routes scope=by-user to reportByUser', async () => {
      const { server, tools } = mockServer()
      let called: string | null = null
      const reportByUser = () => { called = 'by-user'; return Promise.resolve({ response: [{ userId: 1, userEmail: 'a@b.c', totalSeconds: 60, entriesCount: 1 }], rid: `rid-${ts()}` }) }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportByUser } }))

      const res = await findTool(tools, 'get_time_report').cb({ scope: 'by-user', ...baseParams })
      expect(called).toBe('by-user')
      expect(res.content[0].text).toContain('"userEmail": "a@b.c"')
    })

    it('routes scope=by-task to reportByTask', async () => {
      const { server, tools } = mockServer()
      let called: string | null = null
      const reportByTask = () => { called = 'by-task'; return Promise.resolve({ response: [{ taskId: 7, taskDescription: 'fix bug', goalId: 1, totalSeconds: 120, entriesCount: 3 }], rid: `rid-${ts()}` }) }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportByTask } }))

      const res = await findTool(tools, 'get_time_report').cb({ scope: 'by-task', ...baseParams })
      expect(called).toBe('by-task')
      expect(res.content[0].text).toContain('"taskId": 7')
    })

    it('routes scope=summary to reportSummary', async () => {
      const { server, tools } = mockServer()
      let called: string | null = null
      const reportSummary = () => { called = 'summary'; return Promise.resolve({ response: { totalSeconds: 480, totalBillableSeconds: 360, entriesCount: 5 }, rid: `rid-${ts()}` }) }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportSummary } }))

      const res = await findTool(tools, 'get_time_report').cb({ scope: 'summary', ...baseParams })
      expect(called).toBe('summary')
      expect(res.content[0].text).toContain('"totalBillableSeconds": 360')
    })

    it('passes filters (goalIds, userId, billable) to report', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const reportSummary = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: { totalSeconds: 0, totalBillableSeconds: 0, entriesCount: 0 }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportSummary } }))

      await findTool(tools, 'get_time_report').cb({
        scope: 'summary',
        ...baseParams,
        goalIds: [10, 11],
        userId: 3,
        billable: true,
      })
      expect(captured.organizationId).toBe(1)
      expect(captured.from).toBe(baseParams.from)
      expect(captured.to).toBe(baseParams.to)
      expect(captured.goalIds).toEqual([10, 11])
      expect(captured.userId).toBe(3)
      expect(captured.billable).toBe(true)
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportSummary: apiThrow(`No access ${ts()}`) } }))

      const res = await findTool(tools, 'get_time_report').cb({ scope: 'summary', ...baseParams })
      expect(res.isError).toBe(true)
    })
  })

  describe('get_time_contributors', () => {
    it('returns contributors', async () => {
      const { server, tools } = mockServer()
      const rows = [
        { userId: 1, userEmail: 'a@b.c', totalSeconds: 7200, entriesCount: 5 },
        { userId: 2, userEmail: 'd@e.f', totalSeconds: 3600, entriesCount: 3 },
      ]
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportContributors: apiReturn(rows) } }))

      const res = await findTool(tools, 'get_time_contributors').cb({
        organizationId: 1,
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
      })
      expect(res.content[0].text).toContain('"userId": 1')
      expect(res.content[0].text).toContain('"userId": 2')
    })

    it('passes filters to api', async () => {
      const { server, tools } = mockServer()
      let captured: Record<string, unknown> = {}
      const reportContributors = (params: Record<string, unknown>) => {
        captured = params
        return Promise.resolve({ response: [], rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportContributors } }))

      await findTool(tools, 'get_time_contributors').cb({
        organizationId: 1,
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
        goalIds: [5, 6],
        billable: false,
      })
      expect(captured.organizationId).toBe(1)
      expect(captured.goalIds).toEqual([5, 6])
      expect(captured.billable).toBe(false)
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { reportContributors: apiThrow(`Forbidden ${ts()}`) } }))

      const res = await findTool(tools, 'get_time_contributors').cb({
        organizationId: 1,
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
      })
      expect(res.isError).toBe(true)
    })
  })

  describe('delete_time_entry', () => {
    it('passes id to delete and returns result', async () => {
      const { server, tools } = mockServer()
      let capturedId: number | null = null
      const del = (id: number) => {
        capturedId = id
        return Promise.resolve({ response: { deleted: true }, rid: `rid-${ts()}` })
      }
      registerTimeTrackingTools(server, mockApi({ timeTracking: { delete: del } }))

      const res = await findTool(tools, 'delete_time_entry').cb({ id: 42 })
      expect(capturedId).toBe(42)
      expect(res.content[0].text).toContain('"deleted": true')
    })

    it('errors when api throws', async () => {
      const { server, tools } = mockServer()
      registerTimeTrackingTools(server, mockApi({ timeTracking: { delete: apiThrow(`Forbidden ${ts()}`) } }))

      const res = await findTool(tools, 'delete_time_entry').cb({ id: 1 })
      expect(res.isError).toBe(true)
    })
  })
})

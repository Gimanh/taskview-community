import { describe, it, expect } from 'vitest'
import { registerStartTools } from '../tools/start.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('start tools', () => {
  it('registers the agenda tool', () => {
    const { server, tools } = mockServer()
    registerStartTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['get_agenda'])
  })

  it('returns today, upcoming and recently completed in one call', async () => {
    const { server, tools } = mockServer()
    const data = {
      tasks: [],
      tasksToday: [{ id: 1, description: `Today ${ts()}` }],
      tasksUpcoming: [{ id: 2, description: `Later ${ts()}` }],
      tasksLastCompleted: [{ id: 3, description: `Done ${ts()}` }],
      users: [],
      assignees: [],
      listToGoal: {},
    }
    registerStartTools(server, mockApi({ start: { fetchAllState: apiReturn(data) } }))

    const result = await findTool(tools, 'get_agenda').cb({})
    expect(result.content[0].text).toContain(data.tasksToday[0].description)
    expect(result.content[0].text).toContain(data.tasksUpcoming[0].description)
    expect(result.content[0].text).toContain(data.tasksLastCompleted[0].description)
  })

  it('passes the timezone through, since the server splits the day by it', async () => {
    const { server, tools } = mockServer()
    let captured: unknown
    const fetchAllState = (args: unknown) => {
      captured = args
      return Promise.resolve({ response: {}, rid: `rid-${ts()}` })
    }
    registerStartTools(server, mockApi({ start: { fetchAllState } }))

    await findTool(tools, 'get_agenda').cb({ timezone: 'Europe/Belgrade', organizationId: 7 })

    expect(captured).toEqual({ tz: 'Europe/Belgrade', organizationId: 7 })
  })

  it('falls back to UTC when the caller does not know the timezone', async () => {
    const { server, tools } = mockServer()
    let captured: any
    const fetchAllState = (args: unknown) => {
      captured = args
      return Promise.resolve({ response: {}, rid: `rid-${ts()}` })
    }
    registerStartTools(server, mockApi({ start: { fetchAllState } }))

    await findTool(tools, 'get_agenda').cb({})

    // The API rejects a request without tz, so the tool must always send one.
    expect(captured.tz).toBe('UTC')
  })

  it('reports an API failure instead of throwing', async () => {
    const { server, tools } = mockServer()
    registerStartTools(server, mockApi({ start: { fetchAllState: apiThrow('boom') } }))

    const result = await findTool(tools, 'get_agenda').cb({})
    expect(result.isError).toBe(true)
  })
})

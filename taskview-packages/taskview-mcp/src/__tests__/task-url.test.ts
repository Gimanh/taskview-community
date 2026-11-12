import { describe, it, expect } from 'vitest'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { TaskUrlBuilder } from '../tools/task-url.js'
import { registerTasksTools } from '../tools/tasks.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool } from './setup.js'

const APP_URL = 'https://app.example.test'

function apiWithProjects() {
  return mockApi({
    goals: { fetchGoals: apiReturn([{ id: 1032, organizationId: 7 }, { id: 2000, organizationId: null }]) },
    organizations: { fetch: apiReturn([{ id: 7, slug: 'org-f4f20892' }]) },
  })
}

describe('TaskUrlBuilder', () => {
  it('builds the web-app link through the organization slug and the all-tasks list', async () => {
    const builder = new TaskUrlBuilder({ api: apiWithProjects(), appUrl: `${APP_URL}/` })

    const url = await builder.urlFor({ id: 9257, goalId: 1032 })
    expect(url).toBe(`${APP_URL}/org-f4f20892/1032/${ALL_TASKS_LIST_ID}/9257`)
  })

  it('gives no link without an app url', async () => {
    const builder = new TaskUrlBuilder({ api: apiWithProjects() })

    expect(await builder.urlFor({ id: 9257, goalId: 1032 })).toBeNull()
  })

  it('gives no link for a project outside any organization or unknown to the user', async () => {
    const builder = new TaskUrlBuilder({ api: apiWithProjects(), appUrl: APP_URL })

    expect(await builder.urlFor({ id: 1, goalId: 2000 })).toBeNull()
    expect(await builder.urlFor({ id: 1, goalId: 404 })).toBeNull()
  })

  it('loads projects and organizations once per builder', async () => {
    let goalCalls = 0
    let orgCalls = 0
    const api = mockApi({
      goals: { fetchGoals: () => { goalCalls++; return Promise.resolve([{ id: 1032, organizationId: 7 }]) } },
      organizations: { fetch: () => { orgCalls++; return Promise.resolve([{ id: 7, slug: 'acme' }]) } },
    })
    const builder = new TaskUrlBuilder({ api, appUrl: APP_URL })

    await builder.urlFor({ id: 1, goalId: 1032 })
    await builder.urlFor({ id: 2, goalId: 1032 })
    expect(goalCalls).toBe(1)
    expect(orgCalls).toBe(1)
  })

  it('leaves the task without a link when the lookup fails', async () => {
    const api = mockApi({ goals: { fetchGoals: apiThrow('boom') }, organizations: { fetch: apiReturn([]) } })
    const builder = new TaskUrlBuilder({ api, appUrl: APP_URL })

    const task = await builder.withUrl({ id: 1, goalId: 1032 })
    expect(task).not.toHaveProperty('url')
  })
})

describe('task tools links', () => {
  const task = { id: 9257, goalId: 1032, description: 'Linked task' }
  const expectedUrl = `${APP_URL}/org-f4f20892/1032/${ALL_TASKS_LIST_ID}/9257`

  function register() {
    const { server, tools } = mockServer()
    const api = mockApi({
      goals: { fetchGoals: apiReturn([{ id: 1032, organizationId: 7 }]) },
      organizations: { fetch: apiReturn([{ id: 7, slug: 'org-f4f20892' }]) },
      tasks: { fetchTaskById: apiReturn(task), createTask: apiReturn(task), updateTask: apiReturn(task) },
    })
    registerTasksTools({ server, api, taskUrls: new TaskUrlBuilder({ api, appUrl: APP_URL }) })
    return tools
  }

  it.each([
    ['get_task', { taskId: 9257 }],
    ['create_task', { goalId: 1032, description: 'Linked task' }],
    ['update_task', { id: 9257, description: 'Linked task' }],
  ])('%s returns the task url', async (name, input) => {
    const result = await findTool(register(), name).cb(input)
    expect(JSON.parse(result.content[0].text).url).toBe(expectedUrl)
  })
})

import { describe, it, expect } from 'vitest'
import { registerTasksTools } from '../tools/tasks.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('tasks tools', () => {
  it('registers all task tools', () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual([
      'list_tasks', 'get_task', 'create_task', 'update_task',
      'delete_task', 'toggle_task_assignees', 'get_task_history', 'restore_task_from_history',
    ])
  })

  it('list_tasks returns paginated tasks', async () => {
    const { server, tools } = mockServer()
    const mockTasks = [{ id: 1, description: `Task A ${ts()}` }]
    registerTasksTools(server, mockApi({ tasks: { fetch: apiReturn(mockTasks) } }))

    const result = await findTool(tools, 'list_tasks').cb({ goalId: 1 })
    expect(result.content[0].text).toContain(mockTasks[0].description)
  })

  it('list_tasks passes correct params', async () => {
    const { server, tools } = mockServer()
    let captured: Record<string, unknown> = {}
    const fetch = (params: Record<string, unknown>) => {
      captured = params
      return Promise.resolve({ response: [], rid: `rid-${ts()}` })
    }
    registerTasksTools(server, mockApi({ tasks: { fetch } }))

    await findTool(tools, 'list_tasks').cb({
      goalId: 5, componentId: 10, page: 2, showCompleted: true, searchText: 'test',
    })
    expect(captured.goalId).toBe(5)
    expect(captured.componentId).toBe(10)
    expect(captured.page).toBe(2)
    expect(captured.showCompleted).toBe(1)
    expect(captured.searchText).toBe('test')
  })

  it('list_tasks defaults componentId and page', async () => {
    const { server, tools } = mockServer()
    let captured: Record<string, unknown> = {}
    const fetch = (params: Record<string, unknown>) => {
      captured = params
      return Promise.resolve({ response: [], rid: `rid-${ts()}` })
    }
    registerTasksTools(server, mockApi({ tasks: { fetch } }))

    await findTool(tools, 'list_tasks').cb({ goalId: 1 })
    expect(captured.componentId).toBe(0)
    expect(captured.page).toBe(1)
    expect(captured.showCompleted).toBe(0)
  })

  it('get_task returns task', async () => {
    const { server, tools } = mockServer()
    const task = { id: 42, description: `Detail ${ts()}` }
    registerTasksTools(server, mockApi({ tasks: { fetchTaskById: apiReturn(task) } }))

    const result = await findTool(tools, 'get_task').cb({ taskId: 42 })
    expect(result.content[0].text).toContain(task.description)
  })

  it('get_task handles not found', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { fetchTaskById: apiReturn(null) } }))

    const result = await findTool(tools, 'get_task').cb({ taskId: 999 })
    expect(result.isError).toBe(true)
  })

  it('create_task returns new task', async () => {
    const { server, tools } = mockServer()
    const desc = `New task ${ts()}`
    registerTasksTools(server, mockApi({ tasks: { createTask: apiReturn({ id: 100, description: desc }) } }))

    const result = await findTool(tools, 'create_task').cb({ goalId: 1, description: desc })
    expect(result.content[0].text).toContain(desc)
  })

  it('update_task returns updated task', async () => {
    const { server, tools } = mockServer()
    const desc = `Updated ${ts()}`
    registerTasksTools(server, mockApi({ tasks: { updateTask: apiReturn({ id: 1, description: desc }) } }))

    const result = await findTool(tools, 'update_task').cb({ id: 1, description: desc })
    expect(result.content[0].text).toContain(desc)
  })

  it('update_task handles not found', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { updateTask: apiReturn(null) } }))

    const result = await findTool(tools, 'update_task').cb({ id: 999 })
    expect(result.isError).toBe(true)
  })

  it('delete_task returns result', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { deleteTask: apiReturn({ delete: true }) } }))

    const result = await findTool(tools, 'delete_task').cb({ taskId: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('toggle_task_assignees returns user ids', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { toggleTasksAssignee: apiReturn({ userIds: [1, 2] }) } }))

    const result = await findTool(tools, 'toggle_task_assignees').cb({ taskId: 1, userIds: [1, 2] })
    expect(result.content[0].text).toContain('1')
  })

  it('get_task_history returns history', async () => {
    const { server, tools } = mockServer()
    const history = { history: [{ id: 1, description: `v1 ${ts()}` }] }
    registerTasksTools(server, mockApi({ tasks: { fetchTaskHistory: apiReturn(history) } }))

    const result = await findTool(tools, 'get_task_history').cb({ taskId: 1 })
    expect(result.content[0].text).toContain('v1')
  })

  it('restore_task_from_history returns result', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { recoveryTaskHistory: apiReturn({ recovery: true }) } }))

    const result = await findTool(tools, 'restore_task_from_history').cb({ taskId: 1, historyId: 5 })
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerTasksTools(server, mockApi({ tasks: { fetch: apiThrow(`Timeout ${ts()}`) } }))

    const result = await findTool(tools, 'list_tasks').cb({ goalId: 1 })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Timeout')
  })
})

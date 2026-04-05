import { describe, it, expect } from 'vitest'
import { registerGraphTools } from '../tools/graph.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('graph tools', () => {
  it('registers all graph tools', () => {
    const { server, tools } = mockServer()
    registerGraphTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['list_task_dependencies', 'add_task_dependency', 'delete_task_dependency'])
  })

  it('list_task_dependencies returns edges', async () => {
    const { server, tools } = mockServer()
    const edges = [{ id: 1, fromTaskId: 10, toTaskId: 20, createdAt: new Date(ts()).toISOString() }]
    registerGraphTools(server, mockApi({ graph: { fetchAllEdges: apiReturn(edges) } }))

    const result = await findTool(tools, 'list_task_dependencies').cb({ goalId: 1 })
    expect(result.content[0].text).toContain('fromTaskId')
  })

  it('add_task_dependency returns new edge', async () => {
    const { server, tools } = mockServer()
    const edge = { id: 5, fromTaskId: 1, toTaskId: 2, createdAt: new Date(ts()).toISOString() }
    registerGraphTools(server, mockApi({ graph: { addEdge: apiReturn(edge) } }))

    const result = await findTool(tools, 'add_task_dependency').cb({ source: 1, target: 2 })
    expect(result.content[0].text).toContain('"id": 5')
  })

  it('delete_task_dependency returns result', async () => {
    const { server, tools } = mockServer()
    registerGraphTools(server, mockApi({ graph: { deleteEdge: apiReturn(true) } }))

    const result = await findTool(tools, 'delete_task_dependency').cb({ id: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerGraphTools(server, mockApi({ graph: { addEdge: apiThrow(`Cycle detected ${ts()}`) } }))

    const result = await findTool(tools, 'add_task_dependency').cb({ source: 1, target: 2 })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Cycle detected')
  })
})

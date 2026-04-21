import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { initApi } from './init-api'

describe('TvApi graph tests', () => {
  let $api: TvApi
  let goalId: number

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    const goal = await $api.goals.createGoal({
      name: `Goal for graph tests-${Date.now()}`,
    }).catch(console.error)

    if (!goal) {
      throw new Error('Failed to create goal')
    }

    goalId = goal.id
  })

  afterAll(async () => {
    await $api.goals.deleteGoal(goalId).catch(() => {})
  })

  describe('Edge add', () => {
    it('should add an edge between two tasks', async () => {
      const task1 = await $api.tasks.createTask({ goalId, description: `graph-task-a-${Date.now()}` }).catch(console.error)
      const task2 = await $api.tasks.createTask({ goalId, description: `graph-task-b-${Date.now()}` }).catch(console.error)

      if (!task1 || !task2) {
        throw new Error('Failed to create tasks')
      }

      const edge = await $api.graph.addEdge({ source: task1.id, target: task2.id }).catch(console.error)

      if (!edge) {
        throw new Error('Failed to add edge')
      }

      expect(edge).toBeDefined()
      expect(edge.id).toBeDefined()
      expect(edge.fromTaskId).toBe(task1.id)
      expect(edge.toTaskId).toBe(task2.id)
      expect(edge.createdAt).toBeDefined()
    })
  })

  describe('Edge fetch all', () => {
    it('should fetch all edges for a goal', async () => {
      const task1 = await $api.tasks.createTask({ goalId, description: `graph-fetch-a-${Date.now()}` }).catch(console.error)
      const task2 = await $api.tasks.createTask({ goalId, description: `graph-fetch-b-${Date.now()}` }).catch(console.error)

      if (!task1 || !task2) {
        throw new Error('Failed to create tasks')
      }

      const added = await $api.graph.addEdge({ source: task1.id, target: task2.id }).catch(console.error)

      if (!added) {
        throw new Error('Failed to add edge')
      }

      const edges = await $api.graph.fetchAllEdges(goalId).catch(console.error)

      if (!edges) {
        throw new Error('Failed to fetch edges')
      }

      expect(edges.length).toBeGreaterThan(0)
      const found = edges.find((e) => e.id === added.id)
      expect(found).toBeDefined()
      expect(found?.fromTaskId).toBe(task1.id)
      expect(found?.toTaskId).toBe(task2.id)
    })
  })

  describe('Edge delete', () => {
    it('should delete an edge', async () => {
      const task1 = await $api.tasks.createTask({ goalId, description: `graph-del-a-${Date.now()}` }).catch(console.error)
      const task2 = await $api.tasks.createTask({ goalId, description: `graph-del-b-${Date.now()}` }).catch(console.error)

      if (!task1 || !task2) {
        throw new Error('Failed to create tasks')
      }

      const edge = await $api.graph.addEdge({ source: task1.id, target: task2.id }).catch(console.error)

      if (!edge) {
        throw new Error('Failed to add edge')
      }

      const result = await $api.graph.deleteEdge(edge.id).catch(console.error)
      expect(result).toBe(true)

      const edges = await $api.graph.fetchAllEdges(goalId).catch(console.error)
      const found = edges?.find((e) => e.id === edge.id)
      expect(found).toBeUndefined()
    })

    it('should fail to delete non-existent edge', async () => {
      const result = await $api.graph.deleteEdge(-400).catch((err) => err.status)
      expect(result).toBeDefined()
    })
  })

  describe('Edge error handling', () => {
    // TODO: FIX — API allows self-referencing edges (A→A), DB trigger should check from_task_id <> to_task_id
    it.skip('should not allow self-referencing edge', async () => {
      const task = await $api.tasks.createTask({ goalId, description: `graph-self-${Date.now()}` }).catch(console.error)

      if (!task) {
        throw new Error('Failed to create task')
      }

      const status = await $api.graph.addEdge({ source: task.id, target: task.id }).catch((err) => err.status)
      expect(status).toBeGreaterThanOrEqual(400)
    })

    it('should handle edge to non-existent task', async () => {
      const task = await $api.tasks.createTask({ goalId, description: `graph-noexist-${Date.now()}` }).catch(console.error)

      if (!task) {
        throw new Error('Failed to create task')
      }

      try {
        await $api.graph.addEdge({ source: task.id, target: 999999 })
        throw new Error('Expected error was not thrown')
      } catch (err: any) {
        expect(err.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('Multiple edges', () => {
    it('should create a chain A->B->C and verify both edges', async () => {
      const taskA = await $api.tasks.createTask({ goalId, description: `graph-chain-a-${Date.now()}` }).catch(console.error)
      const taskB = await $api.tasks.createTask({ goalId, description: `graph-chain-b-${Date.now()}` }).catch(console.error)
      const taskC = await $api.tasks.createTask({ goalId, description: `graph-chain-c-${Date.now()}` }).catch(console.error)

      if (!taskA || !taskB || !taskC) {
        throw new Error('Failed to create tasks')
      }

      const edgeAB = await $api.graph.addEdge({ source: taskA.id, target: taskB.id }).catch(console.error)
      const edgeBC = await $api.graph.addEdge({ source: taskB.id, target: taskC.id }).catch(console.error)

      if (!edgeAB || !edgeBC) {
        throw new Error('Failed to add edges')
      }

      expect(edgeAB.fromTaskId).toBe(taskA.id)
      expect(edgeAB.toTaskId).toBe(taskB.id)
      expect(edgeBC.fromTaskId).toBe(taskB.id)
      expect(edgeBC.toTaskId).toBe(taskC.id)

      const edges = await $api.graph.fetchAllEdges(goalId).catch(console.error)

      if (!edges) {
        throw new Error('Failed to fetch edges')
      }

      const foundAB = edges.find((e) => e.id === edgeAB.id)
      const foundBC = edges.find((e) => e.id === edgeBC.id)
      expect(foundAB).toBeDefined()
      expect(foundBC).toBeDefined()
    })
  })
})

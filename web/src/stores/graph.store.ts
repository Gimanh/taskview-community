import { defineStore } from 'pinia'
import type { GoalItem, GraphArgAddEdge, TaskArgUpdate } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type { GraphStore } from '@/types/graph.types'
import type { TaskItem } from '@/types/tasks.types'
import { useGoalListsStore } from './goal-lists.store'
import { useTasksStore } from './tasks.store'
import { logError } from '@/helpers/Helper'

export const useGraphStore = defineStore('use-graph-store', {
  state: (): GraphStore => {
    return {
      nodes: [],
      edges: [],
      allNodes: [],
      allEdges: [],
    }
  },
  actions: {
    getStores() {
      return {
        tasksStore: useTasksStore(),
        goalListsStore: useGoalListsStore(),
      }
    },

    async fetchAllTasksAndLists(goalId: GoalItem['id']): Promise<void> {
      const { tasksStore, goalListsStore } = this.getStores()

      await Promise.all([
        goalListsStore.fetchLists(goalId),
        tasksStore.fetchAllTasks(goalId, 1, 1, true),
      ])

      const nodes = tasksStore.tasks.map((task) => ({
        id: task.id.toString(),
        data: { task, label: `${task.description} == ${task.id}` },
        position: task.nodeGraphPosition ?? { x: 0, y: 0 },
        type: 'task',
        style: { resize: 'none' as const },
      }))
      this.allNodes = nodes
      this.nodes = [...nodes]
      await this.fetchAllEdges(goalId)
    },

    async addNode(task: TaskItem) {
      const node = {
        id: task.id.toString(),
        data: { task, label: `${task.description} == ${task.id}` },
        position: task.nodeGraphPosition ?? { x: 0, y: 0 },
        type: 'task',
        style: { resize: 'none' as const },
      }
      this.allNodes.push({ ...node })
      this.nodes.push(node)
      return task.id.toString()
    },

    async addEdge(data: GraphArgAddEdge) {
      const result = await $tvApi.graph.addEdge(data).catch((err: unknown) => logError(err))
      if (!result) return

      const edge = result

      const newEdge = {
        id: edge.id.toString(),
        source: edge.fromTaskId.toString(),
        target: edge.toTaskId.toString(),
      }

      this.allEdges.push({ ...newEdge })
      this.edges.push(newEdge)

      return newEdge
    },

    async fetchAllEdges(goalId: number) {
      const result = await $tvApi.graph.fetchAllEdges(goalId).catch((err: unknown) => logError(err))
      if (!result) return
      const edges = result.map((edge) => ({
        id: edge.id.toString(),
        source: edge.fromTaskId.toString(),
        target: edge.toTaskId.toString(),
      }))
      this.allEdges = edges
      this.edges = [...edges]
    },

    removeTask(taskId: number) {
      const nodeId = taskId.toString()
      this.allNodes = this.allNodes.filter((n) => n.id !== nodeId)
      this.allEdges = this.allEdges.filter((e) => e.source !== nodeId && e.target !== nodeId)
      this.nodes = this.nodes.filter((n) => n.id !== nodeId)
      this.edges = this.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    },

    async deleteEdge(id: number) {
      const result = await $tvApi.graph.deleteEdge(id).catch((err: unknown) => logError(err))
      if (!result) return
      const idStr = id.toString()
      this.allEdges = this.allEdges.filter((e) => e.id !== idStr)
      this.edges = this.edges.filter((e) => e.id !== idStr)
    },

    syncTask(task: { id: number; description?: string }) {
      const node = this.nodes.find((n) => n.id === task.id.toString())
      if (!node) return
      Object.assign(node.data.task, task)
      if (task.description !== undefined) {
        node.data.label = `${task.description} == ${task.id}`
      }
    },

    async updateTaskPosition(data: TaskArgUpdate) {
      const result = await $tvApi.tasks.updateTask(data).catch((err: unknown) => logError(err))
      if (!result) return
    },
  },
})

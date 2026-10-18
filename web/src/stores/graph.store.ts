import { defineStore } from 'pinia'
import type { GoalItem, GraphArgAddEdge, GraphResponseAddEdge, TaskArgUpdate } from 'taskview-api'
import { Position, type XYPosition } from '@vue-flow/core'
import { $tvApi } from '@/plugins/axios'
import type { GraphDirection, GraphInsertTaskArgs, GraphPositionNearArgs, GraphStore } from '@/types/graph.types'
import type { TaskItem } from '@/types/tasks.types'
import { useGoalListsStore } from './goal-lists.store'
import { useTasksStore } from './tasks.store'
import { logError } from '@/helpers/Helper'
import { placeNodeNear } from '@/components/features/graph/composables/useLayout'

export const useGraphStore = defineStore('use-graph-store', {
  state: (): GraphStore => {
    return {
      nodes: [],
      edges: [],
      allNodes: [],
      allEdges: [],
      goalId: null,
      direction: 'TB',
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
      this.goalId = goalId

      await Promise.all([
        goalListsStore.fetchLists(goalId),
        tasksStore.fetchAllTasks(goalId, 1, 1, true),
        this.fetchAllEdges(goalId),
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
    },

    async addNode(task: TaskItem) {
      if (this.hasTask(task.id)) return task.id.toString()
      const node = {
        id: task.id.toString(),
        data: { task, label: `${task.description} == ${task.id}` },
        position: task.nodeGraphPosition ?? { x: 0, y: 0 },
        type: 'task',
        style: { resize: 'none' as const },
        ...this.handlePositions(this.direction),
      }
      this.allNodes.push({ ...node })
      this.nodes.push(node)
      return task.id.toString()
    },

    // A task created elsewhere (the task panel, another device) joins the graph of its project
    insertTask({ task, position }: GraphInsertTaskArgs) {
      if (task.goalId !== this.goalId) return
      const nodeId = task.id.toString()
      if (position) {
        for (const node of [...this.allNodes, ...this.nodes]) {
          if (node.id === nodeId) node.position = position
        }
      }
      void this.addNode(position ? { ...task, nodeGraphPosition: position } : task)
    },

    // Where a new task goes next to one already shown, or null when that task is not on screen.
    // Rendered nodes carry the laid-out positions; allNodes keeps the ones loaded from the server
    positionNear({ taskId, task, side }: GraphPositionNearArgs): XYPosition | null {
      const anchor = this.nodes.find((item) => item.id === taskId.toString())
      if (!anchor) return null
      return placeNodeNear({
        anchor,
        node: { data: { task } },
        side,
        direction: this.direction,
        obstacles: this.nodes,
      })
    },

    handlePositions(direction: GraphDirection) {
      const isHorizontal = direction === 'LR'
      return {
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      }
    },

    async addEdge(data: GraphArgAddEdge) {
      const result = await $tvApi.graph.addEdge(data).catch((err: unknown) => logError(err))
      if (!result) return
      return this.insertEdge(result)
    },

    // An edge saved elsewhere shows up only when both of its tasks are on the loaded graph
    insertEdge(edge: GraphResponseAddEdge) {
      const newEdge = {
        id: edge.id.toString(),
        source: edge.fromTaskId.toString(),
        target: edge.toTaskId.toString(),
      }
      if (!this.hasTask(edge.fromTaskId) || !this.hasTask(edge.toTaskId)) return newEdge
      if (this.allEdges.some((item) => item.id === newEdge.id)) return newEdge

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

    hasTask(taskId: number): boolean {
      const nodeId = taskId.toString()
      return this.allNodes.some((node) => node.id === nodeId)
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
      this.removeEdge(id)
    },

    removeEdge(id: number) {
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

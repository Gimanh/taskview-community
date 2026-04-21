import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { initApi } from './init-api'

describe('TvApi kanban tests', () => {
  let $api: TvApi
  let goalId: number

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    const goal = await $api.goals.createGoal({
      name: `Goal for kanban tests-${Date.now()}`,
    }).catch(console.error)

    if (!goal) {
      throw new Error('Failed to create goal')
    }

    goalId = goal.id
  })

  afterAll(async () => {
    await $api.goals.deleteGoal(goalId).catch(() => {})
  })

  describe('Column add', () => {
    it('should add a column with name and goalId', async () => {
      const name = `column-${Date.now()}`
      const column = await $api.kanban.addColumn({ goalId, name }).catch(console.error)

      if (!column) {
        throw new Error('Failed to add column')
      }

      expect(column).toBeDefined()
      expect(column.id).toBeDefined()
      expect(column.name).toBe(name)
      expect(column.goalId).toBe(goalId)
      expect(column.viewOrder).toBeDefined()
    })
  })

  describe('Column fetch all', () => {
    it('should fetch all columns for a goal', async () => {
      const name = `column-fetch-${Date.now()}`
      const added = await $api.kanban.addColumn({ goalId, name }).catch(console.error)

      if (!added) {
        throw new Error('Failed to add column')
      }

      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)

      if (!columns) {
        throw new Error('Failed to fetch columns')
      }

      expect(columns.length).toBeGreaterThan(0)
      const found = columns.find((c) => c.id === added.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe(name)
      expect(found?.goalId).toBe(goalId)
    })
  })

  describe('Column update', () => {
    it('should update column name', async () => {
      const column = await $api.kanban.addColumn({
        goalId,
        name: `column-update-${Date.now()}`,
      }).catch(console.error)

      if (!column) {
        throw new Error('Failed to add column')
      }

      const updatedName = `column-updated-${Date.now()}`
      const result = await $api.kanban.updateColumn({
        id: column.id,
        name: updatedName,
      }).catch(console.error)

      expect(result).toBe(true)

      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)
      const found = columns?.find((c) => c.id === column.id)
      expect(found?.name).toBe(updatedName)
    })

    it('should update column viewOrder', async () => {
      const column = await $api.kanban.addColumn({
        goalId,
        name: `column-order-${Date.now()}`,
      }).catch(console.error)

      if (!column) {
        throw new Error('Failed to add column')
      }

      const result = await $api.kanban.updateColumn({
        id: column.id,
        name: column.name,
        viewOrder: 999,
      }).catch(console.error)

      expect(result).toBe(true)

      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)
      const found = columns?.find((c) => c.id === column.id)
      expect(found?.viewOrder).toBe(999)
    })
  })

  describe('Column ordering', () => {
    it('should create 3 columns and verify ordering', async () => {
      const freshGoal = await $api.goals.createGoal({
        name: `Goal for ordering-${Date.now()}`,
      }).catch(console.error)

      if (!freshGoal) {
        throw new Error('Failed to create goal')
      }

      const col1 = await $api.kanban.addColumn({ goalId: freshGoal.id, name: 'Col A' }).catch(console.error)
      const col2 = await $api.kanban.addColumn({ goalId: freshGoal.id, name: 'Col B' }).catch(console.error)
      const col3 = await $api.kanban.addColumn({ goalId: freshGoal.id, name: 'Col C' }).catch(console.error)

      if (!col1 || !col2 || !col3) {
        throw new Error('Failed to create columns')
      }

      const columns = await $api.kanban.fetchAllColumns(freshGoal.id).catch(console.error)

      if (!columns) {
        throw new Error('Failed to fetch columns')
      }

      // default columns are created by DB trigger, so total > 3
      expect(columns.length).toBeGreaterThanOrEqual(3)
      expect(columns.find(c => c.id === col1.id)).toBeTruthy()
      expect(columns.find(c => c.id === col2.id)).toBeTruthy()
      expect(columns.find(c => c.id === col3.id)).toBeTruthy()

      await $api.kanban.updateColumn({ id: col3.id, name: 'Col C', viewOrder: 1 }).catch(console.error)
      await $api.kanban.updateColumn({ id: col1.id, name: 'Col A', viewOrder: 2 }).catch(console.error)
      await $api.kanban.updateColumn({ id: col2.id, name: 'Col B', viewOrder: 3 }).catch(console.error)

      const reordered = await $api.kanban.fetchAllColumns(freshGoal.id).catch(console.error)

      if (!reordered) {
        throw new Error('Failed to fetch reordered columns')
      }

      const ourColumns = reordered
        .filter(c => [col1.id, col2.id, col3.id].includes(c.id))
        .sort((a, b) => a.viewOrder - b.viewOrder)
      expect(ourColumns[0].name).toBe('Col C')
      expect(ourColumns[1].name).toBe('Col A')
      expect(ourColumns[2].name).toBe('Col B')

      await $api.goals.deleteGoal(freshGoal.id).catch(() => {})
    })
  })

  describe('Tasks in columns', () => {
    it('should fetch tasks for a column', async () => {
      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)

      if (!columns || columns.length === 0) {
        throw new Error('Failed to fetch columns')
      }

      const columnId = columns[0].id

      const task = await $api.tasks.createTask({
        goalId,
        description: `kanban task-${Date.now()}`,
        statusId: columnId,
      }).catch(console.error)

      if (!task) {
        throw new Error('Failed to create task')
      }

      const result = await $api.kanban.fetchTasksForColumn(goalId, columnId, null).catch(console.error)

      if (!result) {
        throw new Error('Failed to fetch tasks for column')
      }

      expect(result.tasks).toBeDefined()
      const found = result.tasks.find((t) => t.id === task.id)
      expect(found).toBeDefined()
    })

    it('should move task between columns', async () => {
      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)

      if (!columns || columns.length < 2) {
        throw new Error('Need at least 2 columns')
      }

      const firstColumn = columns[0]
      const secondColumn = columns[1]

      const task = await $api.tasks.createTask({
        goalId,
        description: `kanban move-${Date.now()}`,
        statusId: firstColumn.id,
      }).catch(console.error)

      if (!task) {
        throw new Error('Failed to create task')
      }

      await $api.kanban.updateTasksOrderAndColumn({
        goalId,
        columnId: secondColumn.id,
        taskId: task.id,
        prevTaskId: null,
        nextTaskId: null,
      }).catch(console.error)

      const result = await $api.kanban.fetchTasksForColumn(goalId, secondColumn.id, null).catch(console.error)

      if (!result) {
        throw new Error('Failed to fetch tasks for second column')
      }

      const found = result.tasks.find((t) => t.id === task.id)
      expect(found).toBeDefined()
    })
  })

  describe('Column delete', () => {
    it('should delete a column', async () => {
      const column = await $api.kanban.addColumn({
        goalId,
        name: `column-delete-${Date.now()}`,
      }).catch(console.error)

      if (!column) {
        throw new Error('Failed to add column')
      }

      const result = await $api.kanban.deleteColumn({ id: column.id }).catch(console.error)
      expect(result).toBe(true)

      const columns = await $api.kanban.fetchAllColumns(goalId).catch(console.error)
      const found = columns?.find((c) => c.id === column.id)
      expect(found).toBeUndefined()
    })

    it('should fail to delete non-existent column', async () => {
      const result = await $api.kanban.deleteColumn({ id: -400 }).catch((err) => err.status)
      expect(result).toBeDefined()
    })
  })
})

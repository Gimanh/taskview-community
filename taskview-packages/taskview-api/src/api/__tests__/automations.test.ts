import { TvApi } from '@/tv'
import type { AutomationRule, AutomationRuleCreateArgs } from '@/api/automations.types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initApi } from './init-api'
import { createAutomationsProject, createTask, expectApiError, waitFor } from './automations-test-helpers'
import type { AutomationsTestProject } from './automations-test-helpers.types'

/**
 * Rules run in the pg-boss worker of the real API container, so every
 * execution check polls the task through the public API until the
 * automation result shows up. One job runs its rules one by one in id order,
 * so a negative check creates the rule under test first and waits for a
 * control rule created after it.
 */
describe('Automations', () => {
  let api: TvApi
  let deleteAllGoals: () => Promise<void>

  beforeAll(async () => {
    const init = await initApi()
    api = init.$tvApi
    deleteAllGoals = init.deleteAllGoals
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  const project = (name: string) => createAutomationsProject({ api, name })

  const fetchTask = async (taskId: number) => {
    const task = await api.tasks.fetchTaskById(taskId)
    if (!task) throw new Error(`Task ${taskId} is not readable`)
    return task
  }

  const createRule = async (args: AutomationRuleCreateArgs): Promise<AutomationRule> => {
    const rule = await api.automations.createRule(args)
    expect(rule.id).toBeGreaterThan(0)
    return rule
  }

  const completedToDone = (p: AutomationsTestProject): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: 'Completed to Done',
    trigger: { module: 'tasks', event: 'task.completed', params: {} },
    action: { module: 'kanban', action: 'change.status', params: { statusId: p.doneId } },
  })

  const createdAddsTag = (p: AutomationsTestProject, tagId: number): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: `Created adds tag ${tagId}`,
    trigger: { module: 'tasks', event: 'task.created', params: {} },
    action: { module: 'tags', action: 'add.tag', params: { tagId } },
  })

  describe('catalog and options', () => {
    it('describes the modules, events and actions the UI builds rules from', async () => {
      const catalog = await api.automations.getCatalog()
      const byName = new Map(catalog.modules.map((module) => [module.name, module]))

      expect([...byName.keys()].sort()).toEqual(['kanban', 'lists', 'tags', 'tasks'])
      expect(byName.get('tasks')?.events.map(({ name }) => name).sort()).toEqual(['task.completed', 'task.created', 'task.reopened'])
      expect(byName.get('tasks')?.actions.map(({ name }) => name).sort()).toEqual(['complete', 'reopen'])
      expect(byName.get('kanban')?.events).toEqual([
        { name: 'task.movedToColumn', params: [{ key: 'statusId', source: 'kanban.statuses' }] },
      ])
      expect(byName.get('kanban')?.actions).toEqual([
        { name: 'change.status', params: [{ key: 'statusId', source: 'kanban.statuses' }], requiredPermissions: ['kanban_can_manage'] },
      ])
      expect(byName.get('tags')?.events).toEqual([
        { name: 'tag.addedToTask', params: [{ key: 'tagId', source: 'tags.goalTags' }] },
        { name: 'tag.removedFromTask', params: [{ key: 'tagId', source: 'tags.goalTags' }] },
      ])
      expect(byName.get('tags')?.actions).toEqual([
        { name: 'add.tag', params: [{ key: 'tagId', source: 'tags.goalTags' }], requiredPermissions: ['task_can_edit_tags'] },
      ])
      expect(byName.get('lists')?.events).toEqual([
        { name: 'task.addedToList', params: [{ key: 'goalListId', source: 'lists.goalLists' }] },
      ])
      expect(byName.get('lists')?.actions).toEqual([
        { name: 'move.toList', params: [{ key: 'goalListId', source: 'lists.goalLists' }], requiredPermissions: ['component_can_watch_content'] },
      ])
    })

    it('offers the columns and tags of the project only', async () => {
      const p = await project('Automation options')
      const other = await project('Automation options other')

      const columns = await api.automations.getOptions({ goalId: p.goalId, source: 'kanban.statuses' })
      const columnIds = columns.map(({ id }) => id)
      expect(columnIds).toEqual(expect.arrayContaining([p.todoId, p.doneId, p.reviewId]))
      expect(columnIds).not.toContain(other.doneId)
      expect(columns.find(({ id }) => id === p.doneId)?.label).toBe('Done')

      const tags = await api.automations.getOptions({ goalId: p.goalId, source: 'tags.goalTags' })
      expect(tags.map(({ id }) => id).sort((a, b) => a - b)).toEqual([p.tagAId, p.tagBId].sort((a, b) => a - b))

      const lists = await api.automations.getOptions({ goalId: p.goalId, source: 'lists.goalLists' })
      expect(lists.map(({ id }) => id).sort((a, b) => a - b)).toEqual([p.listAId, p.listBId].sort((a, b) => a - b))
      expect(lists.find(({ id }) => id === p.listBId)?.label).toBe('Bugs')
    })

    it('rejects an unknown data source', async () => {
      const p = await project('Automation unknown source')
      await expectApiError({
        request: api.automations.getOptions({ goalId: p.goalId, source: 'constructor' as never }),
        status: 400,
      })
    })
  })

  const addedToListAddsTag = (p: AutomationsTestProject, list: { goalListId: number; tagId: number }): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: `List ${list.goalListId} adds tag ${list.tagId}`,
    trigger: { module: 'lists', event: 'task.addedToList', params: { goalListId: list.goalListId } },
    action: { module: 'tags', action: 'add.tag', params: { tagId: list.tagId } },
  })

  const tagAddedAddsTag = (p: AutomationsTestProject, tags: { from: number; to: number }): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: `Tag ${tags.from} adds tag ${tags.to}`,
    trigger: { module: 'tags', event: 'tag.addedToTask', params: { tagId: tags.from } },
    action: { module: 'tags', action: 'add.tag', params: { tagId: tags.to } },
  })

  describe('managing rules', () => {
    it('creates, lists, renames, toggles and deletes a rule', async () => {
      const p = await project('Automation CRUD')
      const created = await createRule(completedToDone(p))
      expect(created).toMatchObject({
        goalId: p.goalId,
        name: 'Completed to Done',
        enabled: true,
        trigger: { module: 'tasks', event: 'task.completed', params: {} },
        action: { module: 'kanban', action: 'change.status', params: { statusId: p.doneId } },
      })

      expect((await api.automations.listRules(p.goalId)).map(({ id }) => id)).toEqual([created.id])

      const renamed = await api.automations.updateRule({ ruleId: created.id, name: '  Move finished work  ' })
      expect(renamed.name).toBe('Move finished work')

      expect((await api.automations.updateRule({ ruleId: created.id, enabled: false })).enabled).toBe(false)
      expect((await api.automations.updateRule({ ruleId: created.id, enabled: true })).enabled).toBe(true)

      expect(await api.automations.deleteRule(created.id)).toBe(true)
      expect(await api.automations.listRules(p.goalId)).toEqual([])
      await expectApiError({ request: api.automations.deleteRule(created.id), status: 404 })
    })

    it('rejects unknown events, missing params and values of another project', async () => {
      const p = await project('Automation validation')
      const other = await project('Automation validation other')

      await expectApiError({
        request: api.automations.createRule({ ...completedToDone(p), trigger: { module: 'tasks', event: 'task.exploded', params: {} } }),
        status: 400,
        code: 'invalid',
      })
      await expectApiError({
        request: api.automations.createRule({ ...completedToDone(p), action: { module: 'kanban', action: 'change.status', params: {} } }),
        status: 400,
        code: 'invalid',
      })
      await expectApiError({
        request: api.automations.createRule({
          ...completedToDone(p),
          action: { module: 'kanban', action: 'change.status', params: { statusId: other.doneId } },
        }),
        status: 400,
        code: 'invalid',
      })
      await expectApiError({ request: api.automations.createRule({ ...completedToDone(p), name: '   ' }), status: 400 })
    })

    it('drops params the event or action does not declare', async () => {
      const p = await project('Automation undeclared params')
      const rule = await createRule({
        ...completedToDone(p),
        trigger: { module: 'tasks', event: 'task.completed', params: { injected: 1 } },
        action: { module: 'kanban', action: 'change.status', params: { statusId: p.doneId, goalId: 999_999 } },
      })
      expect(rule.trigger.params).toEqual({})
      expect(rule.action.params).toEqual({ statusId: p.doneId })
    })

    it('refuses a rule that closes an endless loop, unless it is saved disabled', async () => {
      const p = await project('Automation cycle')
      await createRule(completedToDone(p))
      const closingLoop: AutomationRuleCreateArgs = {
        goalId: p.goalId,
        name: 'Done completes again',
        trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: p.doneId } },
        action: { module: 'tasks', action: 'complete', params: {} },
      }

      await expectApiError({ request: api.automations.createRule(closingLoop), status: 409, code: 'cycle' })

      const disabled = await createRule({ ...closingLoop, enabled: false })
      expect(disabled.enabled).toBe(false)
      await expectApiError({ request: api.automations.updateRule({ ruleId: disabled.id, enabled: true }), status: 409, code: 'cycle' })
    })

    it('refuses tag rules that would keep adding each other', async () => {
      const p = await project('Automation tag cycle')
      await createRule(tagAddedAddsTag(p, { from: p.tagAId, to: p.tagBId }))

      await expectApiError({
        request: api.automations.createRule(tagAddedAddsTag(p, { from: p.tagBId, to: p.tagAId })),
        status: 409,
        code: 'cycle',
      })
    })

    it('refuses list rules that would keep moving a task back and forth', async () => {
      const p = await project('Automation list cycle')
      const moveBetween = (from: number, to: number): AutomationRuleCreateArgs => ({
        goalId: p.goalId,
        name: `List ${from} to ${to}`,
        trigger: { module: 'lists', event: 'task.addedToList', params: { goalListId: from } },
        action: { module: 'lists', action: 'move.toList', params: { goalListId: to } },
      })
      await createRule(moveBetween(p.listAId, p.listBId))

      await expectApiError({ request: api.automations.createRule(moveBetween(p.listBId, p.listAId)), status: 409, code: 'cycle' })
    })

    it('limits a project to 100 rules', async () => {
      const p = await project('Automation limit')
      for (let index = 0; index < 100; index += 1) {
        await createRule({ ...createdAddsTag(p, p.tagAId), name: `Rule ${index}` })
      }
      await expectApiError({ request: api.automations.createRule(createdAddsTag(p, p.tagAId)), status: 409, code: 'limit_reached' })
    })
  })

  describe('running rules', () => {
    it('moves a completed task to the Done column', async () => {
      const p = await project('Automation completed to Done')
      await createRule(completedToDone(p))
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.tasks.updateTask({ id: taskId, complete: true })

      expect(await waitFor(async () => (await fetchTask(taskId)).statusId === p.doneId)).toBe(true)
    })

    it('tags a task as soon as it is created', async () => {
      const p = await project('Automation created tag')
      await createRule(createdAddsTag(p, p.tagAId))

      const taskId = await createTask({ api, goalId: p.goalId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
    })

    it('reacts to a card dragged into a column on the board', async () => {
      const p = await project('Automation kanban drag')
      await createRule({
        goalId: p.goalId,
        name: 'Review gets a tag',
        trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: p.reviewId } },
        action: { module: 'tags', action: 'add.tag', params: { tagId: p.tagAId } },
      })
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.kanban.updateTasksOrderAndColumn({ goalId: p.goalId, columnId: p.reviewId, taskId, prevTaskId: null, nextTaskId: null })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
    })

    it('chains rules: the move made by one rule triggers the next one', async () => {
      const p = await project('Automation chain')
      await createRule(completedToDone(p))
      await createRule({
        goalId: p.goalId,
        name: 'Done gets a tag',
        trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: p.doneId } },
        action: { module: 'tags', action: 'add.tag', params: { tagId: p.tagAId } },
      })
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.tasks.updateTask({ id: taskId, complete: true })

      expect(
        await waitFor(async () => {
          const task = await fetchTask(taskId)
          return task.statusId === p.doneId && task.tags.includes(p.tagAId)
        }),
      ).toBe(true)
    })

    it('does not run a disabled rule', async () => {
      const p = await project('Automation disabled')
      await createRule({ ...createdAddsTag(p, p.tagBId), enabled: false })
      await createRule(createdAddsTag(p, p.tagAId))

      const taskId = await createTask({ api, goalId: p.goalId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
      expect((await fetchTask(taskId)).tags).not.toContain(p.tagBId)
    })

    it('does not run the rules of another project', async () => {
      const p = await project('Automation isolation')
      const other = await project('Automation isolation other')
      await createRule(createdAddsTag(other, other.tagAId))
      await createRule(createdAddsTag(p, p.tagAId))

      const taskId = await createTask({ api, goalId: p.goalId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
      expect((await fetchTask(taskId)).tags).toEqual([p.tagAId])
    })
  })

  describe('running list and tag rules', () => {
    it('reacts to a task moved into a list, and only into that list', async () => {
      const p = await project('Automation moved to list')
      await createRule(addedToListAddsTag(p, { goalListId: p.listBId, tagId: p.tagBId }))
      await createRule(addedToListAddsTag(p, { goalListId: p.listAId, tagId: p.tagAId }))
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.tasks.updateTask({ id: taskId, goalListId: p.listAId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
      expect((await fetchTask(taskId)).tags).not.toContain(p.tagBId)
    })

    it('reacts to a task created right in the list', async () => {
      const p = await project('Automation created in list')
      await createRule(addedToListAddsTag(p, { goalListId: p.listBId, tagId: p.tagAId }))

      const taskId = await createTask({ api, goalId: p.goalId, goalListId: p.listBId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagAId))).toBe(true)
    })

    it('moves a completed task to a list', async () => {
      const p = await project('Automation move to list')
      await createRule({ ...completedToDone(p), action: { module: 'lists', action: 'move.toList', params: { goalListId: p.listBId } } })
      const taskId = await createTask({ api, goalId: p.goalId, goalListId: p.listAId })

      await api.tasks.updateTask({ id: taskId, complete: true })

      expect(await waitFor(async () => (await fetchTask(taskId)).goalListId === p.listBId)).toBe(true)
    })

    it('reacts to a tag added to a task by hand', async () => {
      const p = await project('Automation tag added')
      await createRule(tagAddedAddsTag(p, { from: p.tagAId, to: p.tagBId }))
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.tags.toggleTag({ tagId: p.tagAId, taskId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagBId))).toBe(true)
    })

    it('reacts to a tag removed from a task, not to a tag added', async () => {
      const p = await project('Automation tag removed')
      await createRule({
        goalId: p.goalId,
        name: 'Untagged goes to Bugs',
        trigger: { module: 'tags', event: 'tag.removedFromTask', params: { tagId: p.tagAId } },
        action: { module: 'lists', action: 'move.toList', params: { goalListId: p.listBId } },
      })
      await createRule(tagAddedAddsTag(p, { from: p.tagAId, to: p.tagBId }))
      const taskId = await createTask({ api, goalId: p.goalId })

      await api.tags.toggleTag({ tagId: p.tagAId, taskId })
      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagBId))).toBe(true)
      expect((await fetchTask(taskId)).goalListId).not.toBe(p.listBId)

      await api.tags.toggleTag({ tagId: p.tagAId, taskId })
      expect(await waitFor(async () => (await fetchTask(taskId)).goalListId === p.listBId)).toBe(true)
    })

    it('chains a tag added by one rule into the next rule', async () => {
      const p = await project('Automation tag chain')
      await createRule(createdAddsTag(p, p.tagAId))
      await createRule(tagAddedAddsTag(p, { from: p.tagAId, to: p.tagBId }))

      const taskId = await createTask({ api, goalId: p.goalId })

      expect(await waitFor(async () => (await fetchTask(taskId)).tags.includes(p.tagBId))).toBe(true)
    })
  })

  describe('deleted columns, tags and lists', () => {
    it('turns off the rules that use a deleted column and keeps them off', async () => {
      const p = await project('Automation deleted column')
      const temp = await api.kanban.addColumn({ goalId: p.goalId, name: 'Temporary' })
      if (!temp) throw new Error('Failed to add column')

      const moveToTemp = await createRule({ ...completedToDone(p), action: { module: 'kanban', action: 'change.status', params: { statusId: temp.id } } })
      const fromTemp = await createRule({
        goalId: p.goalId,
        name: 'Temporary gets a tag',
        trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: temp.id } },
        action: { module: 'tags', action: 'add.tag', params: { tagId: p.tagAId } },
      })
      const unrelated = await createRule(createdAddsTag(p, p.tagAId))

      expect(await api.kanban.deleteColumn({ id: temp.id })).toBeTruthy()

      const enabledIds = async () => (await api.automations.listRules(p.goalId)).filter(({ enabled }) => enabled).map(({ id }) => id)
      expect(await waitFor(async () => (await enabledIds()).length === 1)).toBe(true)
      expect(await enabledIds()).toEqual([unrelated.id])

      await expectApiError({ request: api.automations.updateRule({ ruleId: moveToTemp.id, enabled: true }), status: 400, code: 'invalid' })
      await expectApiError({ request: api.automations.updateRule({ ruleId: fromTemp.id, enabled: true }), status: 400, code: 'invalid' })
    })

    it('turns off the rules that add a deleted tag', async () => {
      const p = await project('Automation deleted tag')
      const tagged = await createRule(createdAddsTag(p, p.tagBId))
      const unrelated = await createRule(createdAddsTag(p, p.tagAId))

      expect(await api.tags.deleteTag({ tagId: p.tagBId })).toBeTruthy()

      expect(
        await waitFor(async () => {
          const rules = await api.automations.listRules(p.goalId)
          return rules.find(({ id }) => id === tagged.id)?.enabled === false
        }),
      ).toBe(true)
      expect((await api.automations.listRules(p.goalId)).find(({ id }) => id === unrelated.id)?.enabled).toBe(true)
    })

    it('turns off the rules that use a deleted list', async () => {
      const p = await project('Automation deleted list')
      const fromList = await createRule(addedToListAddsTag(p, { goalListId: p.listBId, tagId: p.tagAId }))
      const unrelated = await createRule(createdAddsTag(p, p.tagAId))

      expect(await api.goalLists.deleteList(p.listBId)).toBe(true)

      expect(
        await waitFor(async () => {
          const rules = await api.automations.listRules(p.goalId)
          return rules.find(({ id }) => id === fromList.id)?.enabled === false
        }),
      ).toBe(true)
      expect((await api.automations.listRules(p.goalId)).find(({ id }) => id === unrelated.id)?.enabled).toBe(true)
      await expectApiError({ request: api.automations.updateRule({ ruleId: fromList.id, enabled: true }), status: 400, code: 'invalid' })
    })
  })
})

import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import type { AutomationRuleCreateArgs } from '@/api/automations.types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initApi } from './init-api'
import { createAutomationsProject, createTask, expectApiError, shareGoalWith, waitFor } from './automations-test-helpers'
import type { AutomationsTestProject } from './automations-test-helpers.types'

describe('Automations permission boundaries', () => {
  let ownerApi: TvApi
  let memberApi: TvApi
  let memberEmail: string
  let deleteAllGoals: () => Promise<void>
  const permissionIdByName = new Map<string, number>()

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    memberApi = init.$tvApiForSecondUser
    memberEmail = init.user2Email
    deleteAllGoals = init.deleteAllGoals

    for (const permission of await ownerApi.collaboration.fetchAllPermissions()) {
      permissionIdByName.set(permission.name, permission.id)
    }
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  const project = () => createAutomationsProject({ api: ownerApi, name: 'Automations access' })

  const share = (goalId: number, permissions: string[]) =>
    shareGoalWith({ ownerApi, goalId, email: memberEmail, permissionIdByName, permissions })

  const createdAddsTag = (p: AutomationsTestProject, tagId: number): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: `Created adds tag ${tagId}`,
    trigger: { module: 'tasks', event: 'task.created', params: {} },
    action: { module: 'tags', action: 'add.tag', params: { tagId } },
  })

  const completedToDone = (p: AutomationsTestProject): AutomationRuleCreateArgs => ({
    goalId: p.goalId,
    name: 'Completed to Done',
    trigger: { module: 'tasks', event: 'task.completed', params: {} },
    action: { module: 'kanban', action: 'change.status', params: { statusId: p.doneId } },
  })

  const taskTags = async (taskId: number) => (await ownerApi.tasks.fetchTaskById(taskId))?.tags ?? []

  it('hides the rules of a project from users who are not in it', async () => {
    const p = await project()
    const rule = await ownerApi.automations.createRule(createdAddsTag(p, p.tagAId))

    await expectApiError({ request: memberApi.automations.listRules(p.goalId), status: 403 })
    await expectApiError({ request: memberApi.automations.createRule(createdAddsTag(p, p.tagAId)), status: 403 })
    await expectApiError({ request: memberApi.automations.updateRule({ ruleId: rule.id, enabled: false }), status: 403 })
    await expectApiError({ request: memberApi.automations.deleteRule(rule.id), status: 403 })
    await expectApiError({ request: memberApi.automations.getOptions({ goalId: p.goalId, source: 'tags.goalTags' }), status: 403 })

    expect((await ownerApi.automations.listRules(p.goalId))[0]).toMatchObject({ id: rule.id, enabled: true })
  })

  it('answers 404 for a rule that does not exist', async () => {
    await expectApiError({ request: ownerApi.automations.updateRule({ ruleId: 2_000_000_000, enabled: false }), status: 404 })
    await expectApiError({ request: ownerApi.automations.deleteRule(2_000_000_000), status: 404 })
  })

  it('lets a viewer read the rules but not change them', async () => {
    const p = await project()
    const rule = await ownerApi.automations.createRule(createdAddsTag(p, p.tagAId))
    await share(p.goalId, [TvPermissions.AUTOMATION_CAN_VIEW])

    expect((await memberApi.automations.listRules(p.goalId)).map(({ id }) => id)).toEqual([rule.id])

    await expectApiError({ request: memberApi.automations.createRule(createdAddsTag(p, p.tagAId)), status: 403 })
    await expectApiError({ request: memberApi.automations.updateRule({ ruleId: rule.id, name: 'Hijacked' }), status: 403 })
    await expectApiError({ request: memberApi.automations.deleteRule(rule.id), status: 403 })
    expect((await ownerApi.automations.listRules(p.goalId))[0].name).toBe(rule.name)
  })

  it('shows columns and tags as rule values only to users who can see them', async () => {
    const p = await project()
    await share(p.goalId, [TvPermissions.AUTOMATION_CAN_VIEW, TvPermissions.KANBAN_CAN_VIEW])

    const columns = await memberApi.automations.getOptions({ goalId: p.goalId, source: 'kanban.statuses' })
    expect(columns.map(({ id }) => id)).toContain(p.doneId)
    await expectApiError({ request: memberApi.automations.getOptions({ goalId: p.goalId, source: 'tags.goalTags' }), status: 403 })
  })

  it('refuses a rule whose action needs a permission the author does not have', async () => {
    const p = await project()
    await share(p.goalId, [TvPermissions.AUTOMATION_CAN_MANAGE, TvPermissions.TASK_CAN_EDIT_TAGS])

    await expectApiError({ request: memberApi.automations.createRule(completedToDone(p)), status: 403, code: 'forbidden' })

    const allowed = await memberApi.automations.createRule(createdAddsTag(p, p.tagAId))
    expect(allowed.enabled).toBe(true)
  })

  it('keeps running the rules of an author who lost the right to manage automations', async () => {
    const p = await project()
    const { roleId } = await share(p.goalId, [TvPermissions.AUTOMATION_CAN_MANAGE, TvPermissions.TASK_CAN_EDIT_TAGS])
    await memberApi.automations.createRule(createdAddsTag(p, p.tagBId))
    await ownerApi.automations.createRule(createdAddsTag(p, p.tagAId))

    const before = await createTask({ api: ownerApi, goalId: p.goalId })
    expect(await waitFor(async () => (await taskTags(before)).includes(p.tagBId))).toBe(true)

    const manageId = permissionIdByName.get(TvPermissions.AUTOMATION_CAN_MANAGE)
    if (!manageId) throw new Error('automation_can_manage is not in DB')
    const revoked = await ownerApi.collaboration.toggleRolePermission({ roleId, permissionId: manageId })
    expect(revoked?.add).toBe(false)

    const after = await createTask({ api: ownerApi, goalId: p.goalId })
    expect(await waitFor(async () => {
      const tags = await taskTags(after)
      return tags.includes(p.tagAId) && tags.includes(p.tagBId)
    })).toBe(true)
    await expectApiError({
      request: memberApi.automations.createRule(createdAddsTag(p, p.tagAId)),
      status: 403,
    })
  })

  it('checks the editor\'s permissions and records them as the author', async () => {
    const p = await project()
    const rule = await ownerApi.automations.createRule(createdAddsTag(p, p.tagAId))
    await share(p.goalId, [TvPermissions.AUTOMATION_CAN_MANAGE, TvPermissions.TASK_CAN_EDIT_TAGS])

    await expectApiError({
      request: memberApi.automations.updateRule({ ruleId: rule.id, action: completedToDone(p).action }),
      status: 403,
      code: 'forbidden',
    })

    const edited = await memberApi.automations.updateRule({ ruleId: rule.id, action: { module: 'tags', action: 'add.tag', params: { tagId: p.tagBId } } })
    expect(edited.creatorId).not.toBe(rule.creatorId)

    const renamed = await ownerApi.automations.updateRule({ ruleId: rule.id, name: 'Renamed by the owner' })
    expect(renamed.creatorId).toBe(edited.creatorId)
  })
})

import { expect } from 'vitest'
import type {
  AutomationsCreateProjectArgs,
  AutomationsCreateTaskArgs,
  AutomationsExpectErrorArgs,
  AutomationsShareGoalArgs,
  AutomationsSharedGoal,
  AutomationsTestProject,
} from './automations-test-helpers.types'

const WAIT_TIMEOUT_MS = 10_000
const WAIT_STEP_MS = 100

export async function waitFor(check: () => Promise<boolean>): Promise<boolean> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS))
  }
  return false
}

export async function expectApiError(args: AutomationsExpectErrorArgs): Promise<void> {
  const error = await args.request.then(
    () => null,
    (err: { response?: { status: number; data?: { code?: string } } }) => err,
  )
  expect(error, `Expected HTTP ${args.status}, but the request succeeded`).not.toBeNull()
  expect(error?.response?.status).toBe(args.status)
  if (args.code) expect(error?.response?.data?.code).toBe(args.code)
}

export async function createAutomationsProject(args: AutomationsCreateProjectArgs): Promise<AutomationsTestProject> {
  const { api } = args
  const goal = await api.goals.createGoal({ name: `${args.name} ${Date.now()}` })
  if (!goal) throw new Error('Failed to create goal')

  const todo = await api.kanban.addColumn({ goalId: goal.id, name: 'Todo' })
  const done = await api.kanban.addColumn({ goalId: goal.id, name: 'Done' })
  const review = await api.kanban.addColumn({ goalId: goal.id, name: 'Review' })
  const tagA = await api.tags.createTag({ goalId: goal.id, name: `auto-a-${Date.now()}`, color: '#22c55e' })
  const tagB = await api.tags.createTag({ goalId: goal.id, name: `auto-b-${Date.now()}`, color: '#3b82f6' })
  const listA = await api.goalLists.createList({ goalId: goal.id, name: 'Inbox' })
  const listB = await api.goalLists.createList({ goalId: goal.id, name: 'Bugs' })
  if (!todo || !done || !review || !tagA || !tagB || !listA || !listB) throw new Error('Failed to prepare the project')

  return {
    goalId: goal.id,
    todoId: todo.id,
    doneId: done.id,
    reviewId: review.id,
    tagAId: tagA.id,
    tagBId: tagB.id,
    listAId: listA.id,
    listBId: listB.id,
  }
}

export async function createTask(args: AutomationsCreateTaskArgs): Promise<number> {
  const task = await args.api.tasks.createTask({
    goalId: args.goalId,
    description: `automation task ${Date.now()}`,
    ...(args.statusId !== undefined ? { statusId: args.statusId } : {}),
    ...(args.goalListId !== undefined ? { goalListId: args.goalListId } : {}),
  })
  if (!task) throw new Error('Failed to create task')
  return task.id
}

export async function shareGoalWith(args: AutomationsShareGoalArgs): Promise<AutomationsSharedGoal> {
  const { ownerApi, goalId } = args
  const collaborator = await ownerApi.collaboration.inviteUserToGoal({ email: args.email, goalId })
  if (!collaborator) throw new Error('Failed to invite the collaborator')

  const role = await ownerApi.collaboration.createRoleForGoal({ goalId, roleName: `Automations role ${Date.now()}` })
  if (!role) throw new Error('Failed to create role')

  for (const name of args.permissions) {
    const permissionId = args.permissionIdByName.get(name)
    if (!permissionId) throw new Error(`Permission "${name}" is not in DB`)
    const toggled = await ownerApi.collaboration.toggleRolePermission({ roleId: role.id, permissionId })
    if (!toggled || toggled.add !== true) throw new Error(`Expected "${name}" to be added, got ${JSON.stringify(toggled)}`)
  }

  await ownerApi.collaboration.toggleUserRoles({ goalId, userId: collaborator.id, roles: [role.id] })
  return { roleId: role.id }
}

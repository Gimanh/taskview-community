import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { initApi } from './init-api'
import { createWebhookReceiver } from './webhook-receiver'
import { ymd } from './test-helpers'

const SPRINT_EVENTS = [
  'sprint.created',
  'sprint.updated',
  'sprint.activated',
  'sprint.reviewStarted',
  'sprint.completed',
  'sprint.paused',
  'sprint.resumed',
  'sprint.deleted',
  'task.assignedToSprint',
]

describe('Webhooks: sprint events', () => {
  let $api: TvApi
  let goalId: number
  let webhookId: number
  let webhookUrl: string
  const receiver = createWebhookReceiver()

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    await receiver.start()
    webhookUrl = receiver.getUrl()

    const goal = await $api.goals.createGoal({ name: `Sprint webhook project-${Date.now()}` }).catch(console.error)
    if (!goal) throw new Error('Failed to create goal')
    goalId = goal.id!

    const created = await $api.webhooks.create({
      goalId,
      url: webhookUrl,
      events: SPRINT_EVENTS,
    }).catch(console.error)
    if (!created) throw new Error('Failed to create webhook')
    webhookId = created.webhook.id

    expect(created.webhook.events).toEqual(SPRINT_EVENTS)
  })

  afterAll(async () => {
    await $api.webhooks.delete({ id: webhookId }).catch(() => {})
    await $api.goals.deleteGoal(goalId).catch(() => {})
    await receiver.stop()
  })

  async function createPlanned(name = `Webhook sprint-${Date.now()}`) {
    const sprint = await $api.sprints.create({
      goalId, name, startDate: ymd(7), endDate: ymd(21),
    }).catch(console.error)
    if (!sprint) throw new Error('Failed to create sprint')
    return sprint
  }

  it('delivers an enriched payload through the whole lifecycle', async () => {
    receiver.clear()

    const sprint = await createPlanned('Lifecycle sprint')

    const createdPayload = await receiver.waitForDelivery('sprint.created')
    expect(createdPayload.event).toBe('sprint.created')
    expect(createdPayload.timestamp).toBeTruthy()
    expect(createdPayload.sprint).toBeDefined()
    expect(createdPayload.sprint.id).toBe(sprint.id)
    expect(createdPayload.sprint.goalId).toBe(goalId)
    // The event is attributed to the acting user — the same id the sprint records as its creator.
    expect(createdPayload.initiatorId).toBe(createdPayload.sprint.creatorId)

    await $api.sprints.update({
      sprintId: sprint.id,
      name: 'Lifecycle renamed',
      goalText: 'Revised',
      capacity: 30,
    })
    const updatedPayload = await receiver.waitForDelivery('sprint.updated')
    expect(updatedPayload.sprint.id).toBe(sprint.id)
    expect(updatedPayload.changes).toBeDefined()
    expect(updatedPayload.changes.name).toBe('Lifecycle renamed')
    expect(updatedPayload.changes.goalText).toBe('Revised')
    // capacity is serialized to a numeric string in the change set.
    expect(Number(updatedPayload.changes.capacity)).toBe(30)

    await $api.sprints.activate(sprint.id)
    const activatedPayload = await receiver.waitForDelivery('sprint.activated')
    expect(activatedPayload.sprintId).toBe(sprint.id)
    expect(activatedPayload.goalId).toBe(goalId)
    expect(activatedPayload.sprint?.status).toBe('active')

    await $api.sprints.pause(sprint.id)
    const pausedPayload = await receiver.waitForDelivery('sprint.paused')
    expect(pausedPayload.sprintId).toBe(sprint.id)
    expect(pausedPayload.sprint?.pausedAt).toBeTruthy()

    await $api.sprints.resume(sprint.id)
    const resumedPayload = await receiver.waitForDelivery('sprint.resumed')
    expect(resumedPayload.sprintId).toBe(sprint.id)
    expect(resumedPayload.sprint?.pausedAt).toBeNull()

    await $api.sprints.startReview(sprint.id)
    const reviewPayload = await receiver.waitForDelivery('sprint.reviewStarted')
    expect(reviewPayload.sprintId).toBe(sprint.id)
    expect(reviewPayload.sprint?.status).toBe('review')

    await $api.sprints.close({ sprintId: sprint.id, outcomes: [], goalAchieved: true })
    const completedPayload = await receiver.waitForDelivery('sprint.completed')
    expect(completedPayload.sprintId).toBe(sprint.id)
    expect(completedPayload.goalId).toBe(goalId)
    expect(completedPayload.sprint?.status).toBe('completed')
    expect(completedPayload.sprint?.goalAchieved).toBe(true)
  }, 40000)

  it('signs sprint deliveries with an HMAC header', async () => {
    receiver.clear()
    const sprint = await createPlanned('Signed sprint')

    await receiver.waitForDelivery('sprint.created')
    const delivery = receiver.received.find((r) => r.body?.event === 'sprint.created')
    expect(delivery).toBeDefined()
    const signature = delivery!.headers['x-webhook-signature']
    expect(typeof signature).toBe('string')
    expect(String(signature)).toMatch(/^sha256=/)

    await $api.sprints.remove(sprint.id).catch(() => {})
  }, 15000)

  it('delivers sprint.deleted with ids only (no sprint body)', async () => {
    receiver.clear()
    const sprint = await createPlanned('Deletable sprint')
    await receiver.waitForDelivery('sprint.created')

    receiver.clear()
    await $api.sprints.remove(sprint.id)

    const deletedPayload = await receiver.waitForDelivery('sprint.deleted')
    expect(deletedPayload.sprintId).toBe(sprint.id)
    expect(deletedPayload.goalId).toBe(goalId)
    expect(typeof deletedPayload.initiatorId).toBe('number')
    expect(deletedPayload.sprint).toBeUndefined()
  }, 15000)

  it('delivers task.assignedToSprint on assignment and removal', async () => {
    receiver.clear()
    const sprint = await createPlanned('Assignment sprint')
    await receiver.waitForDelivery('sprint.created')

    const task = await $api.tasks.createTask({ goalId, description: `Assigned task-${Date.now()}` }).catch(console.error)
    if (!task) throw new Error('Failed to create task')

    receiver.clear()
    await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: sprint.id })

    const assignedPayload = await receiver.waitForDelivery('task.assignedToSprint')
    expect(assignedPayload.taskId).toBe(task.id)
    expect(assignedPayload.sprintId).toBe(sprint.id)
    expect(assignedPayload.prevSprintId).toBeNull()
    expect(assignedPayload.goalId).toBe(goalId)

    receiver.clear()
    await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: null })

    const removedPayload = await receiver.waitForDelivery('task.assignedToSprint')
    expect(removedPayload.taskId).toBe(task.id)
    expect(removedPayload.sprintId).toBeNull()
    expect(removedPayload.prevSprintId).toBe(sprint.id)

    await $api.tasks.deleteTask(task.id).catch(() => {})
    await $api.sprints.remove(sprint.id).catch(() => {})
  }, 20000)

  it('does not emit task.assignedToSprint when a close carries a task over', async () => {
    // Closing a sprint moves carried-over tasks directly; unlike setTaskSprint it
    // does NOT emit task.assignedToSprint. Only sprint.completed should fire.
    receiver.clear()
    const target = await createPlanned('Carry target (wh)')
    const source = await createPlanned('Carry source (wh)')
    const task = await $api.tasks.createTask({ goalId, description: `Carry task-${Date.now()}` }).catch(console.error)
    if (!task) throw new Error('Failed to create task')

    await $api.sprints.setTaskSprint({ taskId: task.id, sprintId: source.id })
    // Drain the legit assignment event before clearing, so its async delivery
    // can't bleed into the post-close window and be mistaken for a close emit.
    await receiver.waitForDelivery('task.assignedToSprint')
    await $api.sprints.activate(source.id)
    await $api.sprints.startReview(source.id)

    receiver.clear()
    await $api.sprints.close({
      sprintId: source.id,
      outcomes: [{ taskId: task.id, outcome: 'carried-over', carriedOverTo: target.id }],
      goalAchieved: false,
    })

    await receiver.waitForDelivery('sprint.completed')
    // Give any (erroneous) task.assignedToSprint delivery time to land, then assert none did.
    await new Promise((r) => setTimeout(r, 1500))
    const assignmentEvents = receiver.received.filter((r) => r.body?.event === 'task.assignedToSprint')
    expect(assignmentEvents.length).toBe(0)

    // The move still happened in the data, just without an assignment event.
    const moved = await $api.tasks.fetchTaskById(task.id).catch(console.error)
    expect(moved?.sprintId).toBe(target.id)

    await $api.tasks.deleteTask(task.id).catch(() => {})
    await $api.sprints.remove(target.id).catch(() => {})
  }, 25000)

  it('delivers only subscribed events to a narrowly-scoped webhook', async () => {
    // A dedicated receiver + a webhook subscribed ONLY to sprint.completed: it must
    // receive nothing for sprint.created, but must receive sprint.completed.
    const narrowReceiver = createWebhookReceiver()
    await narrowReceiver.start()
    const narrow = await $api.webhooks.create({
      goalId,
      url: narrowReceiver.getUrl(),
      events: ['sprint.completed'],
    }).catch(console.error)
    if (!narrow) throw new Error('Failed to create narrow webhook')

    try {
      const sprint = await createPlanned('Narrow-scope sprint')
      // sprint.created fired; let any delivery settle, then confirm the narrow webhook got nothing.
      await new Promise((r) => setTimeout(r, 1500))
      expect(narrowReceiver.received.length).toBe(0)

      await $api.sprints.activate(sprint.id)
      await $api.sprints.startReview(sprint.id)
      await $api.sprints.close({ sprintId: sprint.id, outcomes: [], goalAchieved: true })

      const completed = await narrowReceiver.waitForDelivery('sprint.completed')
      expect(completed.sprintId).toBe(sprint.id)
      // It only ever saw the one subscribed event.
      expect(narrowReceiver.received.every((r) => r.body?.event === 'sprint.completed')).toBe(true)
    } finally {
      await $api.webhooks.delete({ id: narrow.webhook.id }).catch(() => {})
      await narrowReceiver.stop()
    }
  }, 20000)
})

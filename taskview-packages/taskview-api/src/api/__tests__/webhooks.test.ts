import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { initApi } from './init-api'
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { networkInterfaces } from 'os'

function getLocalIp(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

function createWebhookReceiver() {
  const received: Array<{ body: any; headers: Record<string, string | string[] | undefined> }> = []
  const waiters: Array<(value: any) => void> = []

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let parsed: any = null
      try { parsed = JSON.parse(body) } catch { parsed = body }
      received.push({ body: parsed, headers: req.headers })
      if (waiters.length > 0) {
        waiters.shift()!(parsed)
      }
      res.writeHead(200)
      res.end('ok')
    })
  })

  const ip = getLocalIp()

  return {
    server,
    received,
    getUrl: () => `http://${ip}:${(server.address() as any).port}/webhook`,
    start: () => new Promise<void>((resolve) => {
      server.listen(0, '0.0.0.0', () => resolve())
    }),
    stop: () => new Promise<void>((resolve) => {
      server.close(() => resolve())
    }),
    clear: () => { received.length = 0 },
    waitForDelivery: (event?: string, timeoutMs = 5000) => new Promise<any>((resolve, reject) => {
      // check already received
      const idx = event
        ? received.findIndex(r => r.body?.event === event)
        : received.length > 0 ? 0 : -1
      if (idx >= 0) {
        resolve(received[idx].body)
        return
      }

      const timer = setTimeout(() => {
        reject(new Error(`No webhook delivery${event ? ` for ${event}` : ''} received within ${timeoutMs}ms`))
      }, timeoutMs)

      const check = (payload: any) => {
        if (!event || payload?.event === event) {
          clearTimeout(timer)
          resolve(payload)
        } else {
          waiters.push(check)
        }
      }
      waiters.push(check)
    }),
  }
}

describe('Webhooks', () => {
  let $api: TvApi
  let goalId: number
  let webhookUrl: string
  const receiver = createWebhookReceiver()

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi

    await receiver.start()
    webhookUrl = receiver.getUrl()

    const goal = await $api.goals.createGoal({
      name: `Webhook test project-${Date.now()}`,
    }).catch(console.error)

    if (!goal) {
      throw new Error('Failed to create goal')
    }

    goalId = goal.id!
  })

  afterAll(async () => {
    await $api.goals.deleteGoal(goalId).catch(() => {})
    await receiver.stop()
  })

  describe('CRUD', () => {
    it('should create a webhook and return secret', async () => {
      const result = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!result) {
        throw new Error('Failed to create webhook')
      }

      expect(result.webhook).toBeDefined()
      expect(result.webhook.id).toBeGreaterThan(0)
      expect(result.webhook.goalId).toBe(goalId)
      expect(result.webhook.url).toBe(webhookUrl)
      expect(result.webhook.events).toEqual(['task.created'])
      expect(result.webhook.isActive).toBe(true)
      expect(result.secret).toBeDefined()
      expect(typeof result.secret).toBe('string')
      expect(result.secret.length).toBeGreaterThan(0)

      await $api.webhooks.delete({ id: result.webhook.id })
    })

    it('should fetch webhooks for a goal', async () => {
      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) {
        throw new Error('Failed to create webhook')
      }

      const webhooks = await $api.webhooks.fetch(goalId).catch(console.error)

      if (!webhooks) {
        throw new Error('Failed to fetch webhooks')
      }

      expect(webhooks.length).toBeGreaterThanOrEqual(1)

      const found = webhooks.find((w) => w.id === created.webhook.id)
      expect(found).toBeDefined()
      expect(found!.url).toBe(webhookUrl)
      expect(found!.events).toEqual(['task.created'])
      expect(found!.isActive).toBe(true)

      await $api.webhooks.delete({ id: created.webhook.id })
    })

    it('should update webhook url and events', async () => {
      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) {
        throw new Error('Failed to create webhook')
      }

      const newUrl = webhookUrl + '/updated'
      const updated = await $api.webhooks.update({
        id: created.webhook.id,
        url: newUrl,
        events: ['task.created', 'task.updated', 'task.deleted'],
      }).catch(console.error)

      if (!updated) {
        throw new Error('Failed to update webhook')
      }

      expect(updated.url).toBe(newUrl)
      expect(updated.events).toEqual(['task.created', 'task.updated', 'task.deleted'])

      await $api.webhooks.delete({ id: created.webhook.id })
    })

    it('should toggle webhook isActive', async () => {
      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) {
        throw new Error('Failed to create webhook')
      }

      const deactivated = await $api.webhooks.update({
        id: created.webhook.id,
        isActive: false,
      }).catch(console.error)

      expect(deactivated).toBeDefined()
      expect(deactivated!.isActive).toBe(false)

      const reactivated = await $api.webhooks.update({
        id: created.webhook.id,
        isActive: true,
      }).catch(console.error)

      expect(reactivated).toBeDefined()
      expect(reactivated!.isActive).toBe(true)

      await $api.webhooks.delete({ id: created.webhook.id })
    })

    it('should delete a webhook and verify it is gone', async () => {
      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) {
        throw new Error('Failed to create webhook')
      }

      const deleteResult = await $api.webhooks.delete({ id: created.webhook.id }).catch(console.error)
      expect(deleteResult).toBe(true)

      const webhooks = await $api.webhooks.fetch(goalId).catch(console.error)
      const found = webhooks?.find((w) => w.id === created.webhook.id)
      expect(found).toBeUndefined()
    })

    it('should rotate webhook secret', async () => {
      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) {
        throw new Error('Failed to create webhook')
      }

      const rotated = await $api.webhooks.rotateSecret(created.webhook.id).catch(console.error)

      if (!rotated) {
        throw new Error('Failed to rotate secret')
      }

      expect(rotated.secret).toBeDefined()
      expect(typeof rotated.secret).toBe('string')
      expect(rotated.secret.length).toBeGreaterThan(0)

      await $api.webhooks.delete({ id: created.webhook.id })
    })
  })

  describe('Webhook delivery', () => {
    it('should deliver webhook when task is created', async () => {
      receiver.clear()

      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) throw new Error('Failed to create webhook')

      const task = await $api.tasks.createTask({
        goalId,
        description: `Webhook delivery test-${Date.now()}`,
      }).catch(console.error)

      if (!task) throw new Error('Failed to create task')

      const payload = await receiver.waitForDelivery('task.created', 5000)

      expect(payload).toBeDefined()
      expect(payload.event).toBe('task.created')
      expect(payload.task).toBeDefined()
      expect(payload.task.id).toBe(task.id)

      await $api.tasks.deleteTask(task.id).catch(() => {})
      await $api.webhooks.delete({ id: created.webhook.id })
    }, 10000)

    it('should deliver webhook when task is deleted', async () => {
      receiver.clear()

      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created', 'task.deleted'],
      }).catch(console.error)

      if (!created) throw new Error('Failed to create webhook')

      const task = await $api.tasks.createTask({
        goalId,
        description: `Webhook delete test-${Date.now()}`,
      }).catch(console.error)

      if (!task) throw new Error('Failed to create task')

      // wait for task.created first, then clear and delete
      await receiver.waitForDelivery('task.created', 5000)
      receiver.clear()

      await $api.tasks.deleteTask(task.id)

      const payload = await receiver.waitForDelivery('task.deleted', 5000)

      expect(payload).toBeDefined()
      expect(payload.event).toBe('task.deleted')

      await $api.webhooks.delete({ id: created.webhook.id })
    }, 15000)

    it('should not deliver webhook for unsubscribed events', async () => {
      receiver.clear()

      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.deleted'],
      }).catch(console.error)

      if (!created) throw new Error('Failed to create webhook')

      const task = await $api.tasks.createTask({
        goalId,
        description: `No delivery test-${Date.now()}`,
      }).catch(console.error)

      if (!task) throw new Error('Failed to create task')

      await new Promise((r) => setTimeout(r, 2000))
      const createdEvents = receiver.received.filter(r => r.body?.event === 'task.created')
      expect(createdEvents.length).toBe(0)

      await $api.tasks.deleteTask(task.id).catch(() => {})
      await $api.webhooks.delete({ id: created.webhook.id })
    }, 10000)

    it('should not deliver webhook when deactivated', async () => {
      receiver.clear()

      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) throw new Error('Failed to create webhook')

      await $api.webhooks.update({
        id: created.webhook.id,
        isActive: false,
      })

      const task = await $api.tasks.createTask({
        goalId,
        description: `Deactivated webhook test-${Date.now()}`,
      }).catch(console.error)

      if (!task) throw new Error('Failed to create task')

      await new Promise((r) => setTimeout(r, 2000))
      const createdEvents = receiver.received.filter(r => r.body?.event === 'task.created')
      expect(createdEvents.length).toBe(0)

      await $api.tasks.deleteTask(task.id).catch(() => {})
      await $api.webhooks.delete({ id: created.webhook.id })
    }, 10000)

    it('should return delivery records after webhook fires', async () => {
      receiver.clear()

      const created = await $api.webhooks.create({
        goalId,
        url: webhookUrl,
        events: ['task.created'],
      }).catch(console.error)

      if (!created) throw new Error('Failed to create webhook')

      const task = await $api.tasks.createTask({
        goalId,
        description: `Delivery records test-${Date.now()}`,
      }).catch(console.error)

      if (!task) throw new Error('Failed to create task')

      await receiver.waitForDelivery('task.created', 5000)

      const deliveries = await $api.webhooks.fetchDeliveries(created.webhook.id).catch(console.error)

      if (!deliveries) throw new Error('Failed to fetch deliveries')

      expect(deliveries.length).toBeGreaterThanOrEqual(1)
      expect(deliveries[0].event).toBe('task.created')
      expect(deliveries[0].status).toBeDefined()

      await $api.tasks.deleteTask(task.id).catch(() => {})
      await $api.webhooks.delete({ id: created.webhook.id })
    }, 10000)
  })
})

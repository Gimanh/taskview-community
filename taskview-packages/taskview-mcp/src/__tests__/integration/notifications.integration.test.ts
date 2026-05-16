import { describe, it, expect } from 'vitest'
import { registerNotificationsTools } from '../../tools/notifications.js'
import { api, captureServer, call, parse } from './setup.js'

const { server, tools } = captureServer()
registerNotificationsTools(server, api)

describe('notifications integration', () => {
  it('lists notifications', async () => {
    const result = await call(tools, 'list_notifications')
    const data = parse(result)

    expect(data).toBeDefined()
  })

  it('lists notifications with cursor', async () => {
    const first = parse(await call(tools, 'list_notifications'))
    const items = first?.notifications ?? first
    const cursor = Array.isArray(items) && items.length > 0
      ? items[items.length - 1].id
      : 0

    const result = await call(tools, 'list_notifications', { cursor })
    const data = parse(result)
    expect(data).toBeDefined()
  })

  it('marks a specific notification read', async () => {
    const listResult = parse(await call(tools, 'list_notifications'))
    const items = listResult?.notifications ?? listResult
    const target = Array.isArray(items) && items.length > 0 ? items[0].id : 1

    const result = await call(tools, 'mark_notification_read', { notificationId: target })
    const data = parse(result)
    expect(data.read).toBeDefined()
  })

  it('marks all notifications read', async () => {
    const result = await call(tools, 'mark_all_notifications_read')
    const data = parse(result)

    expect(data.read).toBeDefined()
  })
})

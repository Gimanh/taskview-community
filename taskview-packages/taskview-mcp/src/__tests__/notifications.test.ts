import { describe, it, expect } from 'vitest'
import { registerNotificationsTools } from '../tools/notifications.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

describe('notifications tools', () => {
  it('registers all notification tools', () => {
    const { server, tools } = mockServer()
    registerNotificationsTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual(['list_notifications', 'mark_notification_read', 'mark_all_notifications_read'])
  })

  it('list_notifications returns notifications', async () => {
    const { server, tools } = mockServer()
    const data = { notifications: [{ id: 1, title: `Notif ${ts()}`, read: false }] }
    registerNotificationsTools(server, mockApi({ notifications: { fetch: apiReturn(data) } }))

    const result = await findTool(tools, 'list_notifications').cb({})
    expect(result.content[0].text).toContain(data.notifications[0].title)
  })

  it('list_notifications passes cursor', async () => {
    const { server, tools } = mockServer()
    let capturedCursor: unknown
    const fetch = (cursor: unknown) => {
      capturedCursor = cursor
      return Promise.resolve({ response: { notifications: [] }, rid: `rid-${ts()}` })
    }
    registerNotificationsTools(server, mockApi({ notifications: { fetch } }))

    await findTool(tools, 'list_notifications').cb({ cursor: 42 })
    expect(capturedCursor).toBe(42)
  })

  it('mark_notification_read returns result', async () => {
    const { server, tools } = mockServer()
    registerNotificationsTools(server, mockApi({ notifications: { markRead: apiReturn(true) } }))

    const result = await findTool(tools, 'mark_notification_read').cb({ notificationId: 1 })
    expect(result.content[0].text).toContain('true')
  })

  it('mark_all_notifications_read returns result', async () => {
    const { server, tools } = mockServer()
    registerNotificationsTools(server, mockApi({ notifications: { markAllRead: apiReturn(true) } }))

    const result = await findTool(tools, 'mark_all_notifications_read').cb({})
    expect(result.content[0].text).toContain('true')
  })

  it('handles API errors', async () => {
    const { server, tools } = mockServer()
    registerNotificationsTools(server, mockApi({ notifications: { markRead: apiThrow(`Not found ${ts()}`) } }))

    const result = await findTool(tools, 'mark_notification_read').cb({ notificationId: 999 })
    expect(result.isError).toBe(true)
  })
})

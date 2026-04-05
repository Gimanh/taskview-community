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

  it('marks all notifications read', async () => {
    const result = await call(tools, 'mark_all_notifications_read')
    const data = parse(result)

    expect(data.read).toBeDefined()
  })
})

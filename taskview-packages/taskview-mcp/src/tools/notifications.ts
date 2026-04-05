import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err } from './helpers.js'

export function registerNotificationsTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_notifications',
    {
      description: 'Get user notifications',
      inputSchema: {
        cursor: z.coerce.number().optional().describe('Pagination cursor'),
      },
    },
    async ({ cursor }) => {
      try {
        const result = await api.notifications.fetch(cursor)
        return ok(result)
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'mark_notification_read',
    {
      description: 'Mark a notification as read',
      inputSchema: {
        notificationId: z.coerce.number().describe('Notification ID'),
      },
    },
    async ({ notificationId }) => {
      try {
        const result = await api.notifications.markRead(notificationId)
        return ok({ read: result })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'mark_all_notifications_read',
    {
      description: 'Mark all notifications as read',
    },
    async () => {
      try {
        const result = await api.notifications.markAllRead()
        return ok({ read: result })
      } catch (e) { return err(e) }
    },
  )
}

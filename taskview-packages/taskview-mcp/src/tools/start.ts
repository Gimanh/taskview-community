import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err, toolAnnotations } from './helpers.js'

export function registerStartTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'get_agenda',
    {
      title: 'Get agenda',
      annotations: toolAnnotations.readOnly,
      description:
        'Get the user\'s agenda across every project in one call: tasks due today, '
        + 'upcoming tasks, recently completed ones, and tasks with no deadline. '
        + 'Use this for questions like "what do I have today", "what is coming up" or '
        + '"what did I finish recently" instead of listing projects and their tasks one '
        + 'by one — this is the same data the app\'s main screen shows, and the split '
        + 'into today/upcoming is computed on the server in the given timezone.',
      inputSchema: {
        timezone: z
          .string()
          .optional()
          .describe(
            'IANA timezone deciding where "today" ends, e.g. "Europe/Belgrade". '
            + 'Defaults to UTC; pass the user\'s zone when it is known, otherwise the '
            + 'day boundary may be off by a few hours.',
          ),
        organizationId: z.coerce
          .number()
          .optional()
          .describe('Limit to one organization; omit for every organization the user belongs to'),
      },
    },
    async ({ timezone, organizationId }) => {
      try {
        const result = await api.start.fetchAllState({
          tz: timezone || 'UTC',
          organizationId,
        })
        return ok(result)
      } catch (e) { return err(e) }
    },
  )
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TvApi } from 'taskview-api'
import { z } from 'zod'
import { ok, err, toolAnnotations } from './helpers.js'

const fileId = z.string().uuid().describe('File ID (uuid)')

export function registerFilesTools(server: McpServer, api: TvApi) {
  server.registerTool(
    'list_files',
    {
      title: 'List files',
      annotations: toolAnnotations.readOnly,
      description:
        'List files attached to a project or to one task. With taskId returns the files of that task; '
        + 'without it returns the project files page by page (nextCursor → cursor). '
        + 'Each file carries linkedTaskIds — the tasks it is attached to.',
      inputSchema: {
        goalId: z.coerce.number().describe('Project (goal) ID'),
        taskId: z.coerce.number().optional().describe('Task ID — list only the files attached to this task'),
        search: z.string().optional().describe('Filter project files by name (ignored with taskId)'),
        type: z.enum(['image', 'document', 'all']).optional().describe('Filter project files by kind (ignored with taskId)'),
        cursor: z.string().optional().describe('nextCursor from the previous page (ignored with taskId)'),
        limit: z.coerce.number().optional().describe('Page size, up to 200 (ignored with taskId)'),
      },
    },
    async ({ goalId, taskId, search, type, cursor, limit }) => {
      try {
        if (taskId !== undefined) return ok(await api.files.listForTask(taskId))
        return ok(await api.files.listForGoal({ goalId, search, type, cursor, limit }))
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_file',
    {
      title: 'Get file',
      annotations: toolAnnotations.readOnly,
      description: 'Get one file by ID: name, mime type, size, uploader, creation date and the tasks it is attached to',
      inputSchema: { fileId },
    },
    async ({ fileId }) => {
      try {
        return ok(await api.files.getById(fileId))
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'get_file_download_url',
    {
      title: 'Get file download URL',
      annotations: toolAnnotations.readOnly,
      description:
        'Issue a short-lived (5 minutes) download link for a file. No authentication is needed to open it. '
        + 'Fails when file storage is not configured on the server.',
      inputSchema: {
        fileId,
        inline: z.boolean().optional().describe('true to open in the browser instead of downloading'),
      },
    },
    async ({ fileId, inline }) => {
      try {
        const issued = await api.files.downloadUrl({ fileId, inline: inline ?? false })
        const base = api.baseUrl
        const url = base ? new URL(issued.url, base.endsWith('/') ? base : `${base}/`).toString() : issued.url
        return ok({ url, expiresAt: issued.expiresAt })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'attach_files_to_task',
    {
      title: 'Attach files to task',
      annotations: toolAnnotations.write,
      description: 'Attach existing project files to a task. The files must belong to the same project as the task',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
        fileIds: z.array(z.string().uuid()).min(1).describe('File IDs to attach'),
      },
    },
    async ({ taskId, fileIds }) => {
      try {
        return ok(await api.files.link({ taskId, fileIds }))
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'detach_file_from_task',
    {
      title: 'Detach file from task',
      annotations: toolAnnotations.write,
      description: 'Remove a file from a task. The file itself stays in the project',
      inputSchema: {
        taskId: z.coerce.number().describe('Task ID'),
        fileId,
      },
    },
    async ({ taskId, fileId }) => {
      try {
        await api.files.unlink({ taskId, fileId })
        return ok({ success: true })
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'rename_file',
    {
      title: 'Rename file',
      annotations: toolAnnotations.write,
      description: 'Rename a file. The original extension is kept',
      inputSchema: {
        fileId,
        name: z.string().min(1).describe('New file name'),
      },
    },
    async ({ fileId, name }) => {
      try {
        return ok(await api.files.rename({ fileId, name }))
      } catch (e) { return err(e) }
    },
  )

  server.registerTool(
    'delete_file',
    {
      title: 'Delete file',
      annotations: toolAnnotations.destructive,
      description: 'Delete a file forever from the project and from every task it is attached to',
      inputSchema: { fileId },
    },
    async ({ fileId }) => {
      try {
        await api.files.deleteForever(fileId)
        return ok({ success: true })
      } catch (e) { return err(e) }
    },
  )
}

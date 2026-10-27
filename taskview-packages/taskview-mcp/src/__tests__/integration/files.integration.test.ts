import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerGoalsTools } from '../../tools/goals.js'
import { registerTasksTools } from '../../tools/tasks.js'
import { registerFilesTools } from '../../tools/files.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerGoalsTools(server, api)
registerTasksTools(server, api)
registerFilesTools(server, api)

const content = `mcp files integration ${ts()}`
let goalId: number
let taskId: number
let fileId: string

beforeAll(async () => {
  const goal = await call(tools, 'create_goal', { name: `Files MCP Test ${ts()}` })
  goalId = parse(goal).id
  const task = await call(tools, 'create_task', { goalId, description: `task with files ${ts()}` })
  taskId = parse(task).id

  // Uploading is deliberately not an MCP tool, so the fixture file goes in through the API client.
  const uploaded = await api.files.upload({
    goalId,
    taskId: null,
    file: new Blob([content], { type: 'text/plain' }),
    fileName: `notes-${ts()}.txt`,
  })
  fileId = uploaded.id
})

afterAll(async () => {
  await call(tools, 'delete_file', { fileId }).catch(() => {})
  await call(tools, 'delete_goal', { goalId }).catch(() => {})
})

describe('files integration', () => {
  it('lists the uploaded file among the project files and finds it by search', async () => {
    const all = parse(await call(tools, 'list_files', { goalId }))
    expect(all.items.map((f: { id: string }) => f.id)).toContain(fileId)

    const found = parse(await call(tools, 'list_files', { goalId, search: 'notes-', type: 'document' }))
    expect(found.items.map((f: { id: string }) => f.id)).toContain(fileId)

    const none = parse(await call(tools, 'list_files', { goalId, type: 'image' }))
    expect(none.items.map((f: { id: string }) => f.id)).not.toContain(fileId)
  })

  it('gets the file with its metadata', async () => {
    const file = parse(await call(tools, 'get_file', { fileId }))
    expect(file.id).toBe(fileId)
    expect(file.goalId).toBe(goalId)
    expect(file.mimeType).toBe('text/plain')
    expect(file.sizeBytes).toBe(Buffer.byteLength(content))
    expect(file.linkedTaskIds).toEqual([])
  })

  it('attaches the file to a task and lists it under the task', async () => {
    const attached = parse(await call(tools, 'attach_files_to_task', { taskId, fileIds: [fileId] }))
    expect(attached[0].linkedTaskIds).toContain(taskId)

    const taskFiles = parse(await call(tools, 'list_files', { goalId, taskId }))
    expect(taskFiles.map((f: { id: string }) => f.id)).toEqual([fileId])
  })

  it('issues a download link that serves the bytes without authentication', async () => {
    const link = parse(await call(tools, 'get_file_download_url', { fileId }))
    expect(link.url).toMatch(/^https?:\/\/.+\/module\/files\/content\//)
    expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now())

    const response = await axios.get(link.url, { responseType: 'text', validateStatus: () => true })
    expect(response.status).toBe(200)
    expect(response.data).toBe(content)
    expect(response.headers['content-disposition']).toContain('attachment')
  })

  it('renames the file and keeps the extension', async () => {
    const renamed = parse(await call(tools, 'rename_file', { fileId, name: 'renamed-by-mcp' }))
    expect(renamed.name).toBe('renamed-by-mcp.txt')
  })

  it('detaches the file from the task but keeps it in the project', async () => {
    expect(parse(await call(tools, 'detach_file_from_task', { taskId, fileId })).success).toBe(true)

    const taskFiles = parse(await call(tools, 'list_files', { goalId, taskId }))
    expect(taskFiles).toEqual([])
    const file = parse(await call(tools, 'get_file', { fileId }))
    expect(file.linkedTaskIds).toEqual([])
  })

  it('refuses to attach a file to a task of another project', async () => {
    const other = parse(await call(tools, 'create_goal', { name: `Files MCP Other ${ts()}` }))
    try {
      const foreignTask = parse(await call(tools, 'create_task', { goalId: other.id, description: 'foreign' }))
      const result = await call(tools, 'attach_files_to_task', { taskId: foreignTask.id, fileIds: [fileId] })
      expect(result.isError).toBe(true)
    } finally {
      await call(tools, 'delete_goal', { goalId: other.id }).catch(() => {})
    }
  })

  it('deletes the file forever', async () => {
    expect(parse(await call(tools, 'delete_file', { fileId })).success).toBe(true)

    const gone = await call(tools, 'get_file', { fileId })
    expect(gone.isError).toBe(true)
    const all = parse(await call(tools, 'list_files', { goalId }))
    expect(all.items.map((f: { id: string }) => f.id)).not.toContain(fileId)
  })
})

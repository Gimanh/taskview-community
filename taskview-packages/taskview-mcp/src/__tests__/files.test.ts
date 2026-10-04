import { describe, it, expect } from 'vitest'
import { registerFilesTools } from '../tools/files.js'
import { mockServer, mockApi, apiReturn, apiThrow, findTool, ts } from './setup.js'

const FILE_ID = '4eddd060-ed84-4cfd-b2e3-2256bdd47ddb'

function withBaseUrl(api: ReturnType<typeof mockApi>, baseUrl: string | undefined) {
  Object.defineProperty(api, 'baseUrl', { value: baseUrl })
  return api
}

describe('files tools', () => {
  it('registers all file tools', () => {
    const { server, tools } = mockServer()
    registerFilesTools(server, mockApi())

    expect(tools.map((t) => t.name)).toEqual([
      'list_files', 'get_file', 'get_file_download_url', 'attach_files_to_task',
      'detach_file_from_task', 'rename_file', 'delete_file',
    ])
  })

  it('list_files lists project files when no taskId is given', async () => {
    const { server, tools } = mockServer()
    const name = `spec-${ts()}.pdf`
    const listForGoal = apiReturn({ items: [{ id: FILE_ID, name, linkedTaskIds: [] }], nextCursor: null })
    const listForTask = apiThrow('must not be called')
    registerFilesTools(server, mockApi({ files: { listForGoal, listForTask } }))

    const result = await findTool(tools, 'list_files').cb({ goalId: 1, search: 'spec', type: 'document' })
    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain(name)
  })

  it('list_files lists task files when taskId is given', async () => {
    const { server, tools } = mockServer()
    const name = `task-${ts()}.png`
    registerFilesTools(server, mockApi({
      files: { listForTask: apiReturn([{ id: FILE_ID, name, linkedTaskIds: [10] }]), listForGoal: apiThrow('must not be called') },
    }))

    const result = await findTool(tools, 'list_files').cb({ goalId: 1, taskId: 10 })
    expect(result.content[0].text).toContain(name)
  })

  it('get_file returns the file', async () => {
    const { server, tools } = mockServer()
    const name = `one-${ts()}.txt`
    registerFilesTools(server, mockApi({ files: { getById: apiReturn({ id: FILE_ID, name }) } }))

    const result = await findTool(tools, 'get_file').cb({ fileId: FILE_ID })
    expect(result.content[0].text).toContain(name)
  })

  it('get_file_download_url makes the link absolute against the API base URL', async () => {
    const { server, tools } = mockServer()
    const api = withBaseUrl(mockApi({
      files: { downloadUrl: apiReturn({ url: '/module/files/content/tok.sig', expiresAt: '2026-10-04T10:00:00.000Z' }) },
    }), 'https://api.example.com')
    registerFilesTools(server, api)

    const result = await findTool(tools, 'get_file_download_url').cb({ fileId: FILE_ID, inline: true })
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.url).toBe('https://api.example.com/module/files/content/tok.sig')
    expect(parsed.expiresAt).toBe('2026-10-04T10:00:00.000Z')
  })

  it('get_file_download_url keeps the relative link when no base URL is known', async () => {
    const { server, tools } = mockServer()
    const api = withBaseUrl(mockApi({
      files: { downloadUrl: apiReturn({ url: '/module/files/content/tok.sig', expiresAt: 'x' }) },
    }), undefined)
    registerFilesTools(server, api)

    const result = await findTool(tools, 'get_file_download_url').cb({ fileId: FILE_ID })
    expect(JSON.parse(result.content[0].text).url).toBe('/module/files/content/tok.sig')
  })

  it('attach_files_to_task returns the attached files', async () => {
    const { server, tools } = mockServer()
    registerFilesTools(server, mockApi({ files: { link: apiReturn([{ id: FILE_ID, linkedTaskIds: [7] }]) } }))

    const result = await findTool(tools, 'attach_files_to_task').cb({ taskId: 7, fileIds: [FILE_ID] })
    expect(result.content[0].text).toContain(FILE_ID)
  })

  it('detach_file_from_task and delete_file report success', async () => {
    const { server, tools } = mockServer()
    registerFilesTools(server, mockApi({ files: { unlink: apiReturn(null), deleteForever: apiReturn(null) } }))

    expect((await findTool(tools, 'detach_file_from_task').cb({ taskId: 7, fileId: FILE_ID })).content[0].text).toContain('true')
    expect((await findTool(tools, 'delete_file').cb({ fileId: FILE_ID })).content[0].text).toContain('true')
  })

  it('rename_file returns the renamed file', async () => {
    const { server, tools } = mockServer()
    const name = `renamed-${ts()}.txt`
    registerFilesTools(server, mockApi({ files: { rename: apiReturn({ id: FILE_ID, name }) } }))

    const result = await findTool(tools, 'rename_file').cb({ fileId: FILE_ID, name })
    expect(result.content[0].text).toContain(name)
  })

  it('surfaces API errors, e.g. storage not configured', async () => {
    const { server, tools } = mockServer()
    registerFilesTools(server, mockApi({ files: { downloadUrl: apiThrow('File storage is not configured on this server') } }))

    const result = await findTool(tools, 'get_file_download_url').cb({ fileId: FILE_ID })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('not configured')
  })
})

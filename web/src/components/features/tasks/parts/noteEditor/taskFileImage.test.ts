import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Slice } from '@tiptap/pm/model'
import { isFileDropHandled } from '@/helpers/noteImageFiles'
import { TaskFileImage } from '@/components/features/tasks/parts/noteEditor/taskFileImage'

let editor: Editor | null = null

function createEditor(content: string) {
  editor = new Editor({ extensions: [StarterKit, TaskFileImage], content })
  return editor
}

function firstImage(instance: Editor) {
  let attrs: Record<string, unknown> | null = null
  instance.state.doc.descendants((node) => {
    if (node.type.name === 'image' && !attrs) attrs = node.attrs
  })
  return attrs as Record<string, unknown> | null
}

afterEach(() => {
  editor?.destroy()
  editor = null
})

describe('TaskFileImage', () => {
  it('parses data-file-id into the fileId attribute', () => {
    const instance = createEditor('<img data-file-id="file-1" alt="Screenshot">')

    expect(firstImage(instance)).toMatchObject({ fileId: 'file-1', alt: 'Screenshot', src: null })
  })

  it('renders file images with data-file-id and without src', () => {
    const instance = createEditor('<img data-file-id="file-1" alt="Screenshot">')

    const html = instance.getHTML()

    expect(html).toContain('data-file-id="file-1"')
    expect(html).toContain('alt="Screenshot"')
    expect(html).not.toContain('src=')
  })

  it('drops a stale src from file images', () => {
    const instance = createEditor('<img data-file-id="file-1" src="https://api.test/module/files/content/old">')

    expect(instance.getHTML()).not.toContain('src=')
  })

  it('keeps plain src images working', () => {
    const instance = createEditor('<img src="https://example.com/a.png" alt="A">')

    expect(firstImage(instance)).toMatchObject({ src: 'https://example.com/a.png', fileId: null })
    const html = instance.getHTML()
    expect(html).toContain('src="https://example.com/a.png"')
    expect(html).not.toContain('data-file-id')
  })

  it('round-trips a file image through getHTML', () => {
    const first = createEditor('<p>Before</p><img data-file-id="file-2" alt="Diagram"><p>After</p>')
    const html = first.getHTML()
    first.destroy()

    const second = createEditor(html)

    expect(firstImage(second)).toMatchObject({ fileId: 'file-2', alt: 'Diagram' })
  })
})

describe('TaskFileImage paste and drop', () => {
  const png = new File(['x'], 'shot.png', { type: 'image/png' })
  const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

  function setupPlugin(canUpload: boolean) {
    // jsdom has no layout, so posAtCoords needs a stub to resolve the drop position.
    document.elementFromPoint ??= () => null
    const onFiles = vi.fn()
    const instance = new Editor({
      element: document.body.appendChild(document.createElement('div')),
      extensions: [StarterKit, TaskFileImage.configure({ canUploadFiles: () => canUpload, onFiles })],
      content: '<p>Text</p>',
    })
    editor = instance
    return { instance, onFiles }
  }

  function paste(instance: Editor, files: File[]) {
    const event = { clipboardData: { files, getData: () => '' }, preventDefault: () => {} } as unknown as ClipboardEvent
    return instance.view.someProp('handlePaste', (handler) => handler(instance.view, event, Slice.empty)) ?? false
  }

  function drop(instance: Editor, files: File[], moved = false) {
    const event = new Event('drop') as DragEvent
    Object.defineProperty(event, 'dataTransfer', { value: { files } })
    const handled = instance.view.someProp('handleDrop', (handler) => handler(instance.view, event, Slice.empty, moved)) ?? false
    return { handled, event }
  }

  it('hands pasted images to onFiles', () => {
    const { instance, onFiles } = setupPlugin(true)

    expect(paste(instance, [png, pdf])).toBe(true)
    expect(onFiles).toHaveBeenCalledWith([png, pdf], expect.any(Number))
  })

  it('lets pastes without images fall through', () => {
    const { instance, onFiles } = setupPlugin(true)

    expect(paste(instance, [pdf])).toBe(false)
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('ignores images when uploads are not allowed', () => {
    const { instance, onFiles } = setupPlugin(false)

    expect(paste(instance, [png])).toBe(false)
    expect(drop(instance, [png]).handled).toBe(false)
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('handles dropped images and marks the drop as handled', () => {
    const { instance, onFiles } = setupPlugin(true)

    const { handled, event } = drop(instance, [png])

    expect(handled).toBe(true)
    expect(isFileDropHandled(event)).toBe(true)
    expect(onFiles).toHaveBeenCalledWith([png], expect.any(Number))
  })

  it('lets non-image drops and moved content fall through', () => {
    const { instance, onFiles } = setupPlugin(true)

    const nonImage = drop(instance, [pdf])
    expect(nonImage.handled).toBe(false)
    expect(isFileDropHandled(nonImage.event)).toBe(false)
    expect(drop(instance, [png], true).handled).toBe(false)
    expect(onFiles).not.toHaveBeenCalled()
  })
})

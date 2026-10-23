import { mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Image, { type ImageOptions } from '@tiptap/extension-image'
import { markFileDropHandled, pickImageFiles } from '@/helpers/noteImageFiles'
import TaskFileImageView from './TaskFileImageView.vue'

export type TaskFileImageOptions = ImageOptions & {
  canViewFiles: () => boolean
  resolveUrl: (fileId: string) => Promise<string | null>
  invalidateUrl: (fileId: string) => void
  canUploadFiles: () => boolean
  // Called with every pasted/dropped file once at least one of them is an image; non-image drops fall through.
  onFiles: (files: File[], position: number) => void
}

const pasteDropKey = new PluginKey('taskFileImagePasteDrop')

// Images attached to the task are stored by file id only: download URLs are short-lived tokens,
// so the node view resolves a fresh one each time the note is displayed.
export const TaskFileImage = Image.extend<TaskFileImageOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      canViewFiles: () => false,
      resolveUrl: async () => null,
      invalidateUrl: () => {},
      canUploadFiles: () => false,
      onFiles: () => {},
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id') || null,
        renderHTML: (attributes) => (attributes.fileId ? { 'data-file-id': attributes.fileId } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-file-id]' }, ...(this.parent?.() ?? [])]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, ...rest } = HTMLAttributes
    const attributes = node.attrs.fileId ? rest : { ...rest, src }
    return ['img', mergeAttributes(this.options.HTMLAttributes, attributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(TaskFileImageView)
  },

  addProseMirrorPlugins() {
    const options = this.options
    const hasImages = (files: File[]) => options.canUploadFiles() && pickImageFiles(files).length > 0

    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: pasteDropKey,
        props: {
          handlePaste: (view, event) => {
            const files = Array.from(event.clipboardData?.files ?? [])
            if (!hasImages(files)) return false
            options.onFiles(files, view.state.selection.from)
            return true
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = Array.from(event.dataTransfer?.files ?? [])
            if (moved || !hasImages(files)) return false
            const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from
            markFileDropHandled(event)
            options.onFiles(files, position)
            return true
          },
        },
      }),
    ]
  },
})

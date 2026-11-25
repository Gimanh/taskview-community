import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { NoteImageFiles } from '@/editor/NoteImageFiles'
import { NoteImageUploadPlugin } from '@/editor/NoteImageUploadPlugin'
import type { NoteImageOptions } from '@/editor/NoteImage.types'
import NoteImageView from '@/components/features/tasks/parts/NoteImageView.vue'

export const NoteImage = Node.create<NoteImageOptions>({
  name: 'noteImage',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { taskId: null, uploader: null, uploadingLabel: '' }
  },

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-file-id')
          return NoteImageFiles.validId(value) ? value.toLowerCase() : null
        },
        renderHTML: (attributes) => (attributes.fileId ? { 'data-file-id': attributes.fileId } : {}),
      },
      alt: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-file-id]', priority: 60 }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  renderMarkdown(node) {
    const fileId = node.attrs?.fileId
    if (!NoteImageFiles.validId(fileId)) return ''
    const alt = String(node.attrs?.alt ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<img data-file-id="${fileId}" alt="${alt}">`
  },

  addNodeView() {
    return VueNodeViewRenderer(NoteImageView)
  },

  addProseMirrorPlugins() {
    const { uploader, uploadingLabel } = this.options
    if (!uploader) return []
    return [NoteImageUploadPlugin.create({ nodeName: this.name, uploader, uploadingLabel })]
  },
})

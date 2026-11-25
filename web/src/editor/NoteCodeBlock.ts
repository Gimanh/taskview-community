import { CodeBlock } from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { NoteCodeHighlightPlugin } from '@/editor/NoteCodeHighlightPlugin'
import NoteCodeBlockView from '@/components/features/tasks/parts/NoteCodeBlockView.vue'

export const NoteCodeBlock = CodeBlock.extend({
  addNodeView() {
    return VueNodeViewRenderer(NoteCodeBlockView)
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), NoteCodeHighlightPlugin.create(this.name)]
  },
})

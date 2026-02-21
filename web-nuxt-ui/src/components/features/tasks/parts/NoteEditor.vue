<template>
  <div class="note-editor border border-default rounded-lg dark:bg-tv-ui-bg-elevated!">
    <UEditor
      v-if="canViewTaskNote"
      #default="{ editor }"
      v-model="initialContent"
      :placeholder="placeholder"
      :extensions="extensions"
      :editable="canEditTaskNote"
      class="min-h-32"
      @update:model-value="handleUpdate"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="border-b border-default overflow-x-auto"
      />
      <!-- <UEditorDragHandle :editor="editor" /> -->
    </UEditor>
  </div>
</template>

<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'
import { useDebounceFn } from '@vueuse/core'
import TextAlign from '@tiptap/extension-text-align'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { 
  canEditTaskNote, 
  canViewTaskNote, 
} = useGoalPermissions()

const extensions = [
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
]

const props = defineProps<{
  content: string
  placeholder?: string
  debounce?: number
}>()

const emit = defineEmits<{
  save: [value: string]
}>()

// Initial content - set once when component mounts
const initialContent = props.content

// Debounced save - triggers after user stops typing
const debouncedSave = useDebounceFn((value: string) => {
  emit('save', value)
}, props.debounce ?? 500)

function handleUpdate(value: string) {
  debouncedSave(value)
}

const toolbarItemUi = {
  leadingIcon: 'size-5',
}

const toolbarItems: EditorToolbarItem[][] = [
  // History controls
  [{
    kind: 'undo',
    icon: 'i-lucide-undo',
    tooltip: { text: 'Undo' },
    ui: toolbarItemUi,
  }, {
    kind: 'redo',
    icon: 'i-lucide-redo',
    tooltip: { text: 'Redo' },
    ui: toolbarItemUi,
  }],
  // Block types
  [{
    icon: 'i-lucide-heading',
    tooltip: { text: 'Headings' },
    content: {
      align: 'start',
    },
    items: [{
      kind: 'heading',
      level: 1,
      icon: 'i-lucide-heading-1',
      label: 'Heading 1',
      ui: toolbarItemUi,
    }, {
      kind: 'heading',
      level: 2,
      icon: 'i-lucide-heading-2',
      label: 'Heading 2',
      ui: toolbarItemUi,
    }, {
      kind: 'heading',
      level: 3,
      icon: 'i-lucide-heading-3',
      label: 'Heading 3',
      ui: toolbarItemUi,
    }, {
      kind: 'heading',
      level: 4,
      icon: 'i-lucide-heading-4',
      label: 'Heading 4',
      ui: toolbarItemUi,
    }],
  }, {
    icon: 'i-lucide-list',
    tooltip: { text: 'Lists' },
    content: {
      align: 'start',
    },
    items: [{
      kind: 'bulletList',
      icon: 'i-lucide-list',
      label: 'Bullet List',
      ui: toolbarItemUi,
    }, {
      kind: 'orderedList',
      icon: 'i-lucide-list-ordered',
      label: 'Ordered List',
      ui: toolbarItemUi,
    }],
  }, {
    kind: 'blockquote',
    icon: 'i-lucide-text-quote',
    tooltip: { text: 'Blockquote' },
    ui: toolbarItemUi,
  }, {
    kind: 'codeBlock',
    icon: 'i-lucide-square-code',
    tooltip: { text: 'Code Block' },
    ui: toolbarItemUi,
  }, {
    kind: 'horizontalRule',
    icon: 'i-lucide-separator-horizontal',
    tooltip: { text: 'Horizontal Rule' },
    ui: toolbarItemUi,
  }],
  // Text formatting
  [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-lucide-bold',
    tooltip: { text: 'Bold' },
    ui: toolbarItemUi,
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-lucide-italic',
    tooltip: { text: 'Italic' },
    ui: toolbarItemUi,
  }, {
    kind: 'mark',
    mark: 'underline',
    icon: 'i-lucide-underline',
    tooltip: { text: 'Underline' },
    ui: toolbarItemUi,
  }, {
    kind: 'mark',
    mark: 'strike',
    icon: 'i-lucide-strikethrough',
    tooltip: { text: 'Strikethrough' },
    ui: toolbarItemUi,
  }, {
    kind: 'mark',
    mark: 'code',
    icon: 'i-lucide-code',
    tooltip: { text: 'Code' },
    ui: toolbarItemUi,
  }],
  // Link
  [{
    kind: 'link',
    icon: 'i-lucide-link',
    tooltip: { text: 'Link' },
    ui: toolbarItemUi,
  }],
  // Text alignment
  [{
    icon: 'i-lucide-align-justify',
    tooltip: { text: 'Text Align' },
    content: {
      align: 'end',
    },
    items: [{
      kind: 'textAlign',
      align: 'left',
      icon: 'i-lucide-align-left',
      label: 'Align Left',
      ui: toolbarItemUi,
    }, {
      kind: 'textAlign',
      align: 'center',
      icon: 'i-lucide-align-center',
      label: 'Align Center',
      ui: toolbarItemUi,
    }, {
      kind: 'textAlign',
      align: 'right',
      icon: 'i-lucide-align-right',
      label: 'Align Right',
      ui: toolbarItemUi,
    }, {
      kind: 'textAlign',
      align: 'justify',
      icon: 'i-lucide-align-justify',
      label: 'Align Justify',
      ui: toolbarItemUi,
    }],
  }],
]
</script>

<style scoped>
.note-editor :deep(.tiptap) {
  padding: 0.75rem;
  padding-left: 2rem;
  outline: none;
}

.note-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--color-text-muted);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>

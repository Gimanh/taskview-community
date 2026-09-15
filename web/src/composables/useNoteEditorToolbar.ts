import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EditorToolbarItem } from '@nuxt/ui'
import type { UseNoteEditorToolbarArgs } from '@/composables/useNoteEditorToolbar.types'

const itemUi = {
  leadingIcon: 'size-5',
}

const historyItems: EditorToolbarItem[] = [{
  kind: 'undo',
  icon: 'i-lucide-undo',
  tooltip: { text: 'Undo' },
  ui: itemUi,
}, {
  kind: 'redo',
  icon: 'i-lucide-redo',
  tooltip: { text: 'Redo' },
  ui: itemUi,
}]

const blockItems: EditorToolbarItem[] = [{
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
    ui: itemUi,
  }, {
    kind: 'heading',
    level: 2,
    icon: 'i-lucide-heading-2',
    label: 'Heading 2',
    ui: itemUi,
  }, {
    kind: 'heading',
    level: 3,
    icon: 'i-lucide-heading-3',
    label: 'Heading 3',
    ui: itemUi,
  }, {
    kind: 'heading',
    level: 4,
    icon: 'i-lucide-heading-4',
    label: 'Heading 4',
    ui: itemUi,
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
    ui: itemUi,
  }, {
    kind: 'orderedList',
    icon: 'i-lucide-list-ordered',
    label: 'Ordered List',
    ui: itemUi,
  }],
}, {
  kind: 'blockquote',
  icon: 'i-lucide-text-quote',
  tooltip: { text: 'Blockquote' },
  ui: itemUi,
}, {
  kind: 'codeBlock',
  icon: 'i-lucide-square-code',
  tooltip: { text: 'Code Block' },
  ui: itemUi,
}, {
  kind: 'horizontalRule',
  icon: 'i-lucide-separator-horizontal',
  tooltip: { text: 'Horizontal Rule' },
  ui: itemUi,
}]

const markItems: EditorToolbarItem[] = [{
  kind: 'mark',
  mark: 'bold',
  icon: 'i-lucide-bold',
  tooltip: { text: 'Bold' },
  ui: itemUi,
}, {
  kind: 'mark',
  mark: 'italic',
  icon: 'i-lucide-italic',
  tooltip: { text: 'Italic' },
  ui: itemUi,
}, {
  kind: 'mark',
  mark: 'underline',
  icon: 'i-lucide-underline',
  tooltip: { text: 'Underline' },
  ui: itemUi,
}, {
  kind: 'mark',
  mark: 'strike',
  icon: 'i-lucide-strikethrough',
  tooltip: { text: 'Strikethrough' },
  ui: itemUi,
}, {
  kind: 'mark',
  mark: 'code',
  icon: 'i-lucide-code',
  tooltip: { text: 'Code' },
  ui: itemUi,
}]

const linkItems: EditorToolbarItem[] = [{
  kind: 'link',
  icon: 'i-lucide-link',
  tooltip: { text: 'Link' },
  ui: itemUi,
}]

const alignItems: EditorToolbarItem[] = [{
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
    ui: itemUi,
  }, {
    kind: 'textAlign',
    align: 'center',
    icon: 'i-lucide-align-center',
    label: 'Align Center',
    ui: itemUi,
  }, {
    kind: 'textAlign',
    align: 'right',
    icon: 'i-lucide-align-right',
    label: 'Align Right',
    ui: itemUi,
  }, {
    kind: 'textAlign',
    align: 'justify',
    icon: 'i-lucide-align-justify',
    label: 'Align Justify',
    ui: itemUi,
  }],
}]

export function useNoteEditorToolbar({ isFullscreen, onToggleFullscreen }: UseNoteEditorToolbarArgs) {
  const { t } = useI18n()

  const fullscreenItems = computed<EditorToolbarItem[]>(() => [{
    icon: isFullscreen.value ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2',
    tooltip: { text: isFullscreen.value ? t('tasks.noteExitFullscreen') : t('tasks.noteFullscreen') },
    'aria-label': isFullscreen.value ? t('tasks.noteExitFullscreen') : t('tasks.noteFullscreen'),
    ui: itemUi,
    onClick: onToggleFullscreen,
  }])

  const toolbarItems = computed<EditorToolbarItem[][]>(() => [
    historyItems,
    blockItems,
    markItems,
    linkItems,
    alignItems,
    fullscreenItems.value,
  ])

  return { toolbarItems }
}

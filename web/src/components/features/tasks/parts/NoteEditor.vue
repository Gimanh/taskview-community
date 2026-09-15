<template>
  <div>
    <Teleport
      :to="fullscreenTarget"
      :disabled="!isTeleported"
    >
      <div
        class="note-editor overflow-clip dark:bg-tv-ui-bg-elevated!"
        :class="isFullscreen ? 'flex flex-col flex-1 min-h-0' : 'border border-default rounded-2xl'"
        data-testid="task-note-editor"
      >
        <UEditor
          v-if="canViewTaskNote"
          ref="editorRef"
          #default="{ editor }"
          v-model="initialContent"
          :content-type="contentType"
          :placeholder="placeholder"
          :extensions="extensions"
          :editable="canEditTaskNote"
          :class="isFullscreen ? 'flex flex-col flex-1 min-h-0' : 'min-h-32'"
          :ui="{ content: contentClass }"
          @update:model-value="handleUpdate"
        >
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
            class="sticky -top-5 z-10 border-b border-default overflow-x-auto shrink-0 bg-default dark:bg-tv-ui-bg-elevated"
            :ui="{base: 'p-2'}"
          />
        </UEditor>
        <NoteEditorFooter
          v-if="isOverflowing"
          :expanded="isExpanded"
          @toggle-expand="toggleExpanded"
          @fullscreen="toggleFullscreen"
        />
      </div>
    </Teleport>

    <UModal
      v-model:open="isFullscreen"
      fullscreen
      :title="t('tasks.note')"
      :ui="{ body: 'p-0! flex flex-col min-h-0' }"
      data-testid="task-note-fullscreen"
      @after:leave="focusEditor"
    >
      <template #body>
        <div
          ref="fullscreenTarget"
          class="flex flex-col flex-1 min-h-0"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import TextAlign from '@tiptap/extension-text-align'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useNoteEditorToolbar } from '@/composables/useNoteEditorToolbar'
import { useNoteEditorCollapse } from '@/composables/useNoteEditorCollapse'
import NoteEditorFooter from '@/components/features/tasks/parts/NoteEditorFooter.vue'

const { t } = useI18n()

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
  contentType?: 'html' | 'markdown'
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

const editorRef = useTemplateRef('editorRef')
const fullscreenTarget = useTemplateRef<HTMLElement>('fullscreenTarget')

const isFullscreen = ref(false)
const isTeleported = computed(() => isFullscreen.value && !!fullscreenTarget.value)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

const { toolbarItems } = useNoteEditorToolbar({
  isFullscreen,
  onToggleFullscreen: toggleFullscreen,
})

const contentElement = computed(() => editorRef.value?.editor?.view.dom ?? null)

const { isOverflowing, isCollapsed, isExpanded, toggleExpanded } = useNoteEditorCollapse({
  contentElement,
  isFullscreen,
})

const contentClass = computed(() => {
  if (isFullscreen.value) return 'flex-1 min-h-0 overflow-y-auto'
  if (isCollapsed.value) return 'max-h-80 overflow-y-auto'
  return ''
})

async function focusEditor() {
  await nextTick()
  editorRef.value?.editor?.commands.focus()
}

watch(isTeleported, (teleported) => {
  if (teleported) focusEditor()
})
</script>

<style scoped>
.note-editor :deep(.tiptap) {
  padding: 0.75rem;
  padding-left: 2rem;
  outline: none;
}

.note-editor :deep(.tiptap li){
  margin-top: 2px;
  margin-bottom: 2px;
}

.note-editor :deep(.tiptap > p){
  margin-bottom: 16px;
  line-height: 24px;
}
.note-editor :deep(.tiptap > * + *) {
  margin-top: 16px;
  margin-bottom: 16px;
  line-height: 24px;
}

.note-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--color-text-muted);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>

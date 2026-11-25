<template>
  <NodeViewWrapper
    class="note-image"
    data-testid="note-image"
    :data-state="state"
  >
    <USkeleton
      v-if="state === 'loading'"
      class="h-40 w-full max-w-md rounded-lg"
    />
    <div
      v-else-if="state === 'ready' && url"
      class="group relative inline-block max-w-full align-top"
    >
      <img
        :src="url"
        :alt="name"
        draggable="false"
        data-drag-handle
        class="block max-w-full max-h-96 w-auto h-auto rounded-lg cursor-zoom-in"
        :class="{ 'outline-2 outline-primary': selected }"
        @error="onError"
        @dblclick="view"
      />
      <UButton
        contenteditable="false"
        size="xs"
        color="neutral"
        variant="solid"
        icon="i-lucide-maximize-2"
        :aria-label="t('tasks.noteImageOpen')"
        class="absolute top-1.5 end-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        data-testid="note-image-open"
        @click="view"
      />
    </div>
    <div
      v-else
      contenteditable="false"
      data-drag-handle
      class="inline-flex max-w-full items-center gap-2 rounded-lg border border-default bg-elevated/50 px-3 py-2 text-sm text-muted"
      :class="{ 'outline-2 outline-primary': selected }"
    >
      <UIcon
        :name="state === 'undisplayable' ? 'i-lucide-file-image' : 'i-lucide-image-off'"
        class="size-5 shrink-0"
      />
      <span class="truncate">{{ state === 'undisplayable' ? (name || t('tasks.noteImageUndisplayable')) : t('tasks.noteImageUnavailable') }}</span>
      <UButton
        v-if="state === 'undisplayable'"
        size="xs"
        color="neutral"
        variant="soft"
        icon="i-lucide-download"
        :label="t('files.menu.download')"
        data-testid="note-image-download"
        @click="save"
      />
    </div>
    <FilesViewer
      v-model:index="viewedIndex"
      :files="viewed"
    />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { useNoteImageSource } from '@/composables/useNoteImageSource'
import FilesViewer from '@/components/features/files/FilesViewer.vue'
import type { NoteImageOptions } from '@/editor/NoteImage.types'

const props = defineProps(nodeViewProps)

const { t } = useI18n()

const name = computed<string>(() => props.node.attrs.alt ?? '')

const { state, url, onError, save, view, viewed, viewedIndex } = useNoteImageSource({
  fileId: () => props.node.attrs.fileId,
  name: () => name.value,
  taskId: (props.extension.options as NoteImageOptions).taskId,
})
</script>

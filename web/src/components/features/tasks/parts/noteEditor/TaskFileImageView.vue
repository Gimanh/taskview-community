<template>
  <NodeViewWrapper
    class="task-file-image"
    :class="{ 'is-selected': selected }"
    data-drag-handle
  >
    <img
      v-if="src"
      :src="src"
      :alt="node.attrs.alt ?? ''"
      :title="node.attrs.title ?? undefined"
      :width="node.attrs.width ?? undefined"
      :height="node.attrs.height ?? undefined"
      @load="onLoad"
      @error="onError"
    />
    <span
      v-else
      class="inline-flex items-center gap-1.5 rounded-md border border-dashed border-default px-2 py-1 text-sm text-muted"
      data-testid="task-note-image-placeholder"
    >
      <UIcon
        :name="status === 'loading' ? 'i-lucide-loader-circle' : 'i-lucide-image-off'"
        class="size-4 shrink-0"
        :class="{ 'animate-spin': status === 'loading' }"
      />
      {{ placeholderText }}
    </span>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { TaskFileImageOptions } from './taskFileImage'

const props = defineProps(nodeViewProps)

const { t } = useI18n()

const options = computed(() => props.extension.options as TaskFileImageOptions)
const fileId = computed(() => (props.node.attrs.fileId as string | null) ?? null)

const src = ref<string | null>(null)
const status = ref<'loading' | 'ready' | 'unavailable'>('loading')
// One fresh URL per failure is enough: a second error means the file is gone or access was revoked.
let retried = false
let requestId = 0

const placeholderText = computed(() => {
  if (status.value === 'loading') return t('tasks.noteImageLoading')
  return props.node.attrs.alt || t('tasks.noteImageUnavailable')
})

async function load() {
  const current = ++requestId
  const id = fileId.value
  if (!id) {
    src.value = props.node.attrs.src ?? null
    status.value = src.value ? 'ready' : 'unavailable'
    return
  }
  if (!options.value.canViewFiles()) {
    src.value = null
    status.value = 'unavailable'
    return
  }
  status.value = 'loading'
  const url = await options.value.resolveUrl(id)
  if (current !== requestId) return
  src.value = url
  status.value = url ? 'ready' : 'unavailable'
}

function onLoad() {
  retried = false
}

function onError() {
  const id = fileId.value
  src.value = null
  if (!id || retried) {
    status.value = 'unavailable'
    return
  }
  retried = true
  options.value.invalidateUrl(id)
  void load()
}

watch(
  () => [fileId.value, props.node.attrs.src, options.value.canViewFiles()] as const,
  () => {
    retried = false
    void load()
  },
  { immediate: true },
)
</script>

<style scoped>
.task-file-image img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.task-file-image.is-selected img,
.task-file-image.is-selected > span {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>

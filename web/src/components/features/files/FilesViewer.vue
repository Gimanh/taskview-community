<template>
  <UModal
    v-model:open="open"
    fullscreen
    :ui="{ content: 'bg-black/95 text-white', body: 'p-0 flex-1 min-h-0' }"
  >
    <template #content>
      <div
        class="flex flex-col h-full"
        tabindex="0"
        @keydown.left="prev"
        @keydown.right="next"
        @keydown.esc="open = false"
      >
        <div class="flex items-center gap-2 px-4 py-3">
          <p class="flex-1 min-w-0 truncate text-sm">
            {{ current?.name }}
            <span
              v-if="current"
              class="text-white/60"
            >· {{ formatBytes(current.sizeBytes) }}</span>
          </p>
          <span
            v-if="files.length > 1"
            class="text-xs text-white/60"
          >{{ (index ?? 0) + 1 }} / {{ files.length }}</span>
          <UButton
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            :aria-label="t('files.menu.download')"
            data-testid="file-viewer-download"
            @click="current && download(current)"
          />
          <UButton
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            :aria-label="t('files.menu.openInNewTab')"
            @click="current && openInNewTab(current)"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            :aria-label="t('files.close')"
            data-testid="file-viewer-close"
            @click="open = false"
          />
        </div>

        <div class="relative flex-1 min-h-0 flex items-center justify-center px-12">
          <UButton
            v-if="files.length > 1"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xl"
            class="absolute left-2 top-1/2 -translate-y-1/2"
            :aria-label="t('files.previous')"
            @click="prev"
          />

          <div
            v-if="loading"
            class="flex items-center justify-center"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-8 animate-spin text-white/60"
            />
          </div>
          <template v-else-if="current && src">
            <img
              v-if="kind === 'image'"
              :src="src"
              :alt="current.name"
              class="max-w-full max-h-full object-contain"
            />
            <video
              v-else-if="kind === 'video'"
              :src="src"
              controls
              class="max-w-full max-h-full"
            />
            <audio
              v-else-if="kind === 'audio'"
              :src="src"
              controls
            />
            <iframe
              v-else-if="kind === 'pdf' || kind === 'text'"
              :src="src"
              :title="current.name"
              class="w-full h-full bg-white rounded-lg"
            />
            <div
              v-else
              class="flex flex-col items-center gap-3 text-white/80"
            >
              <UIcon
                :name="iconOf(current.mimeType)"
                class="size-12"
              />
              <p class="text-sm">
                {{ t('files.viewer.noPreview') }}
              </p>
              <UButton
                :label="t('files.menu.download')"
                icon="i-lucide-download"
                @click="download(current)"
              />
            </div>
          </template>

          <UButton
            v-if="files.length > 1"
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="xl"
            class="absolute right-2 top-1/2 -translate-y-1/2"
            :aria-label="t('files.next')"
            @click="next"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TvFile } from 'taskview-api'
import { useFileKind } from '@/composables/useFileKind'
import { useFileDownload } from '@/composables/useFileDownload'

const props = defineProps<{
  files: TvFile[]
}>()

const index = defineModel<number | null>('index', { default: null })

const { t } = useI18n()
const { kindOf, iconOf, formatBytes } = useFileKind()
const { urlFor, download, openInNewTab } = useFileDownload()

const src = ref<string | null>(null)
const loading = ref(false)

const open = computed({
  get: () => index.value !== null,
  set: (value: boolean) => {
    if (!value) index.value = null
  },
})
const current = computed(() => (index.value === null ? null : props.files[index.value] ?? null))
const kind = computed(() => (current.value ? kindOf(current.value.mimeType) : 'other'))

watch(current, async (file) => {
  src.value = null
  if (!file) return
  if (kind.value === 'other') {
    src.value = 'unavailable'
    return
  }
  loading.value = true
  src.value = await urlFor(file, true).finally(() => {
    loading.value = false
  })
}, { immediate: true })

function prev() {
  if (index.value === null || props.files.length < 2) return
  index.value = (index.value - 1 + props.files.length) % props.files.length
}

function next() {
  if (index.value === null || props.files.length < 2) return
  index.value = (index.value + 1) % props.files.length
}
</script>

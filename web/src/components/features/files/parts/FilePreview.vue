<template>
  <div class="relative w-full h-full flex items-center justify-center bg-elevated/60 overflow-hidden">
    <img
      v-if="kind === 'image' && src"
      :src="src"
      :alt="file.name"
      class="w-full h-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <div
      v-else
      class="flex flex-col items-center gap-1 text-muted"
    >
      <UIcon
        :name="iconOf(file.mimeType)"
        class="size-7"
      />
      <span
        v-if="extension"
        class="text-[10px] font-semibold tracking-wide"
      >{{ extension }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TvFile } from 'taskview-api'
import { useFileKind } from '@/composables/useFileKind'
import { useFileDownload } from '@/composables/useFileDownload'

const props = defineProps<{
  file: TvFile
}>()

const { kindOf, iconOf, extensionOf } = useFileKind()
const { urlFor } = useFileDownload()

const failed = ref(false)
const src = ref<string | null>(null)
const kind = computed(() => (failed.value ? 'other' : kindOf(props.file.mimeType)))
const extension = computed(() => extensionOf(props.file.name))

watch(
  () => props.file.id,
  async () => {
    failed.value = false
    src.value = null
    if (kindOf(props.file.mimeType) === 'image') src.value = await urlFor(props.file, true)
  },
  { immediate: true },
)
</script>

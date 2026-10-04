<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('files.picker.title')"
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="query"
          :placeholder="t('files.searchPlaceholder')"
          icon="i-lucide-search"
          variant="soft"
          autofocus
          :loading="loading"
        />
        <div class="max-h-80 overflow-y-auto flex flex-col gap-1">
          <p
            v-if="!loading && options.length === 0"
            class="text-sm text-muted py-6 text-center"
          >
            {{ t('files.picker.empty') }}
          </p>
          <label
            v-for="file in options"
            :key="file.id"
            class="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-elevated cursor-pointer"
          >
            <UCheckbox
              :model-value="selected.has(file.id)"
              @update:model-value="toggle(file.id)"
            />
            <UIcon
              :name="iconOf(file.mimeType)"
              class="size-4 text-muted shrink-0"
            />
            <span class="text-sm truncate flex-1">{{ file.name }}</span>
            <span class="text-xs text-muted shrink-0">{{ formatBytes(file.sizeBytes) }}</span>
          </label>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('files.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="t('files.picker.submit', { count: selected.size }, selected.size)"
          :disabled="selected.size === 0"
          data-testid="file-picker-submit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import type { TvFile } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useTaskView } from '@/composables/useTaskView'
import { useFileKind } from '@/composables/useFileKind'

const props = defineProps<{
  goalId: number
  excludedIds: string[]
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  select: [fileIds: string[]]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const { iconOf, formatBytes } = useFileKind()

const query = ref('')
const loading = ref(false)
const items = ref<TvFile[]>([])
const selected = ref(new Set<string>())

const options = computed(() => items.value.filter((f) => !props.excludedIds.includes(f.id)))

async function load() {
  loading.value = true
  const page = await $tvApi.files
    .listForGoal({ goalId: props.goalId, search: query.value || null, limit: 100 })
    .catch(logError)
    .finally(() => {
      loading.value = false
    })
  items.value = page?.items ?? []
}

const debouncedLoad = useDebounceFn(load, 300)

watch(query, () => debouncedLoad())
watch(open, (value) => {
  if (!value) return
  query.value = ''
  selected.value = new Set()
  void load()
})

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function submit() {
  emit('select', [...selected.value])
  open.value = false
}
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="options"
    multiple
    value-key="value"
    :placeholder="t('filters.allStatuses')"
    :search-input="false"
    size="sm"
    variant="subtle"
    class="min-w-40 max-w-56 shrink-0 [&>button]:truncate"
  >
    <template #leading>
      <UIcon
        :name="model.length === 0 ? 'i-lucide-circle-dashed' : 'i-lucide-circle-dot'"
        class="size-4"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKanbanStatusOptions } from '@/composables/useKanbanStatusOptions'
import { NO_STATUS } from '@/composables/useCalendarRouteState'

const ALL_VALUE = -1

const model = defineModel<number[]>({ default: () => [] })

const { t } = useI18n()
const { options: statusOptions } = useKanbanStatusOptions()

const options = computed(() => [
  { label: t('filters.allStatuses'), value: ALL_VALUE },
  // Tasks without a status sit in the board's first column; here they get their own option
  ...statusOptions.value.map((status) => ({
    label: status.value === null ? t('filters.noStatus') : status.label,
    value: status.value ?? NO_STATUS,
  })),
])

const hadAll = computed(() => model.value.length === 0)

const selected = computed({
  get() {
    return model.value.length === 0 ? [ALL_VALUE] : model.value
  },
  set(val: number[]) {
    const allJustSelected = val.includes(ALL_VALUE) && !hadAll.value
    if (allJustSelected || val.length === 0) {
      model.value = []
    } else {
      model.value = val.filter((v) => v !== ALL_VALUE)
    }
  },
})
</script>

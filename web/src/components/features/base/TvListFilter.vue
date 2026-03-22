<template>
  <USelectMenu
    v-model="selected"
    :items="options"
    multiple
    value-key="value"
    :placeholder="t('tasks.allTasks')"
    :search-input="false"
    size="sm"
    variant="subtle"
    class="min-w-40 max-w-56 shrink-0 [&>button]:truncate"
  >
    <template #leading>
      <UIcon
        :name="model.length === 0 ? 'i-lucide-layers' : 'i-lucide-list'"
        class="size-4"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalListsStore } from '@/stores/goal-lists.store'

const ALL_VALUE = -1

const model = defineModel<number[]>({ default: () => [] })

const { t } = useI18n()
const goalListsStore = useGoalListsStore()

const options = computed(() => [
  { label: t('tasks.allTasks'), value: ALL_VALUE },
  ...goalListsStore.lists.map((list) => ({
    label: list.name,
    value: list.id,
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

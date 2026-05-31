<template>
  <USelectMenu
    v-if="canView"
    :model-value="selectedValue"
    :items="options"
    value-key="value"
    :search-input="false"
    size="sm"
    variant="subtle"
    class="min-w-40 max-w-56 shrink-0 [&>button]:truncate"
    @update:model-value="onSelect"
    @update:open="onOpen"
  >
    <template #leading>
      <UIcon
        name="i-lucide-rocket"
        class="size-4"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'

const props = defineProps<{
  goalId: number
}>()

const model = defineModel<number | null>({ default: null })

const ALL_VALUE = 'all'
const CURRENT_VALUE = 'current'

const { t } = useI18n()
const goalsStore = useGoalsStore()

const sprints = ref<Sprint[]>([])
const loadedGoalId = ref<number | null>(null)

const goal = computed(() => goalsStore.goalMap.get(props.goalId) ?? null)
const { canViewSprints: canView } = useGoalPermissionsFor(goal)

const activeSprintId = computed(() => sprints.value.find((s) => s.status === 'active')?.id ?? null)

const options = computed(() => [
  { label: t('kanban.sprintFilter.all'), value: ALL_VALUE },
  ...(activeSprintId.value != null
    ? [{ label: t('kanban.sprintFilter.current'), value: CURRENT_VALUE }]
    : []),
  ...sprints.value.map((s) => ({ label: s.name, value: String(s.id) })),
])

const selectedValue = computed(() => {
  if (model.value == null) return ALL_VALUE
  if (model.value === activeSprintId.value) return CURRENT_VALUE
  return String(model.value)
})

const onSelect = (value: string) => {
  if (value === ALL_VALUE) {
    model.value = null
  } else if (value === CURRENT_VALUE) {
    model.value = activeSprintId.value
  } else {
    model.value = Number(value)
  }
}

const loadSprints = async (force = false) => {
  if (!canView.value) return
  if (!force && loadedGoalId.value === props.goalId) return
  const result = await $tvApi.sprints.listForGoal({ goalId: props.goalId }).catch(logError)
  if (!result) return
  sprints.value = result
  loadedGoalId.value = props.goalId
}

// Refetch on open so the list (and which sprint is "current") stays fresh
// when a sprint is activated/closed elsewhere.
const onOpen = (open: boolean) => {
  if (open) loadSprints(true)
}

watch(
  () => [props.goalId, canView.value] as const,
  () => loadSprints(),
  { immediate: true },
)
</script>

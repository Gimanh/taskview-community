<template>
  <div class="flex flex-col gap-4">
    <UFormField
      :label="t('uiCustomization.others.weekStart')"
      :description="t('uiCustomization.others.weekStartHint')"
    >
      <USelectMenu
        v-model="weekStart"
        :items="weekStartItems"
        value-key="value"
        variant="soft"
        class="w-full lg:w-72"
        size="xl"
        :ui="{ base: 'rounded-xl' }"
      />
    </UFormField>

    <UFormField
      :label="t('uiCustomization.others.defaultProject')"
      :description="t('uiCustomization.others.defaultProjectHint')"
    >
      <USelectMenu
        v-model="defaultProject"
        :items="projectItems"
        value-key="value"
        variant="soft"
        class="w-full lg:w-72"
        size="xl"
        :ui="{ base: 'rounded-xl' }"
      />
    </UFormField>

    <UFormField
      :label="t('uiCustomization.others.defaultView')"
      :description="t('uiCustomization.others.defaultViewHint')"
    >
      <USelectMenu
        v-model="defaultView"
        :items="viewItems"
        value-key="value"
        :disabled="defaultProject === NONE"
        variant="soft"
        class="w-full lg:w-72"
        size="xl"
        :ui="{ base: 'rounded-xl' }"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DefaultView, FirstDayOfWeek } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { useGoalsStore } from '@/stores/goals.store'

const { t } = useI18n()
const store = useUiPreferencesStore()
const goalsStore = useGoalsStore()

const DEFAULT = -1
const NONE = -1

onMounted(() => {
  if (!goalsStore.initialized) goalsStore.fetchGoals()
})

const defaultProject = computed<number>({
  get: () => store.settings.defaultProjectId ?? NONE,
  set: (value) => {
    store.setSetting('defaultProjectId', value === NONE ? undefined : value)
    if (value === NONE) store.setSetting('defaultView', undefined)
  },
})

const defaultView = computed<DefaultView>({
  get: () => store.settings.defaultView ?? 'tasks',
  set: (value) => {
    store.setSetting('defaultView', value === 'tasks' ? undefined : value)
  },
})

const projectItems = computed(() => [
  { value: NONE, label: t('uiCustomization.others.defaultProjectNone') },
  ...goalsStore.goals.map((goal) => ({ value: goal.id, label: goal.name })),
])

const viewItems = computed(() => [
  { value: 'tasks', label: t('uiCustomization.others.viewTasks') },
  { value: 'kanban', label: t('uiCustomization.others.viewKanban') },
  { value: 'graph', label: t('uiCustomization.others.viewGraph') },
  { value: 'sprints', label: t('uiCustomization.others.viewSprints') },
])

const weekStart = computed<number>({
  get: () => store.settings.firstDayOfWeek ?? DEFAULT,
  set: (value) => {
    store.setSetting('firstDayOfWeek', value === DEFAULT ? undefined : (value as FirstDayOfWeek))
  },
})

const weekStartItems = computed(() => [
  { value: DEFAULT, label: t('uiCustomization.others.weekStartDefault') },
  { value: 1, label: t('uiCustomization.others.monday') },
  { value: 2, label: t('uiCustomization.others.tuesday') },
  { value: 3, label: t('uiCustomization.others.wednesday') },
  { value: 4, label: t('uiCustomization.others.thursday') },
  { value: 5, label: t('uiCustomization.others.friday') },
  { value: 6, label: t('uiCustomization.others.saturday') },
  { value: 0, label: t('uiCustomization.others.sunday') },
])
</script>

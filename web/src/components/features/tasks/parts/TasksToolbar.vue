<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center justify-end gap-2 p-2 bg-tv-ui-bg-elevated rounded-3xl">
      <!-- Filter -->
      <UTooltip :text="t('filters.title')">
        <UButton
          icon="i-lucide-filter"
          :color="hasActiveFilters ? 'primary' : 'info'"
          variant="soft"
          size="sm"
          @click="isFilterDrawerOpen = true"
        />
      </UTooltip>

      <!-- Toggle Completed Tasks -->
      <UTooltip :text="showCompletedTooltip">
        <UButton
          :icon="showCompleted ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :color="showCompleted ? 'primary' : 'info'"
          variant="soft"
          size="sm"
          :loading="loading"
          :disabled="loading"
          @click="toggleCompleted"
        />
      </UTooltip>

      <!-- Sort -->
      <UFieldGroup size="sm">
        <USelect
          v-model="sortBy"
          :items="sortItems"
          value-key="value"
          icon="i-lucide-arrow-up-down"
          color="info"
          variant="subtle"
          :disabled="loading"
          :ui="{ base: 'min-w-32' }"
        />
        <UTooltip :text="sortTooltip">
          <UButton
            :icon="firstNew ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-down-narrow-wide'"
            color="info"
            variant="subtle"
            :loading="loading"
            :disabled="loading"
            @click="toggleSort"
          />
        </UTooltip>
      </UFieldGroup>

      <!-- Reset All -->
      <UButton
        v-if="hasActiveSearch || hasActiveFilters"
        icon="i-lucide-x"
        color="error"
        variant="soft"
        size="sm"
        @click="resetAll"
      />

      <TasksFilterDrawer v-model:open="isFilterDrawerOpen" />
    </div>

    <!-- Active search/filters indicators -->
    <div
      v-if="hasActiveSearch || hasActiveFilters"
      class="flex flex-wrap items-center gap-1.5 px-1"
    >
      <UBadge
        v-if="hasActiveSearch"
        :label="`${t('tasks.searchPlaceholder')}: ${fetchRules.searchText}`"
        icon="i-lucide-search"
        color="info"
        variant="subtle"
        size="sm"
        class="max-w-full"
        :ui="{ leadingIcon: 'size-3' }"
      >
        <template #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="xs"
            class="p-0"
            @click="resetSearch"
          />
        </template>
      </UBadge>

      <UBadge
        v-if="hasActiveFilters"
        :label="t('filters.title')"
        icon="i-lucide-filter"
        color="primary"
        variant="subtle"
        size="sm"
        :ui="{ leadingIcon: 'size-3' }"
      >
        <template #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="xs"
            class="p-0"
            @click="resetFilters"
          />
        </template>
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TaskSortBy } from 'taskview-api'
import { useTasksStore } from '@/stores/tasks.store'
import TasksFilterDrawer from './TasksFilterDrawer.vue'

const { t } = useI18n()
const route = useRoute()
const tasksStore = useTasksStore()

const { fetchRules } = storeToRefs(tasksStore)

const loading = ref(false)
const isFilterDrawerOpen = ref(false)

const hasActiveSearch = computed(() => !!fetchRules.value.searchText)

const hasActiveFilters = computed(() => {
  const filters = fetchRules.value.filters
  return (
    filters.selectedUser !== undefined ||
    filters.priority !== undefined ||
    (filters.selectedTags && Object.keys(filters.selectedTags).length > 0)
  )
})

const showCompleted = computed(() => fetchRules.value.showCompleted === 1)
const firstNew = computed(() => fetchRules.value.firstNew === 1)

const sortItems = computed(() => [
  { label: t('tasks.sortByDate'), value: 'date' as const },
  { label: t('tasks.sortByPriority'), value: 'priority' as const },
])

const sortBy = computed<TaskSortBy>({
  get: () => fetchRules.value.sortBy,
  set: (value) => applySort({ sortBy: value }),
})

const showCompletedTooltip = computed(() =>
  showCompleted.value ? t('tasks.hideCompleted') : t('tasks.showCompleted'),
)

const sortTooltip = computed(() => {
  if (fetchRules.value.sortBy === 'priority') {
    return firstNew.value ? t('tasks.sortHighestFirst') : t('tasks.sortLowestFirst')
  }
  return firstNew.value ? t('tasks.sortNewestFirst') : t('tasks.sortOldestFirst')
})

async function toggleCompleted() {
  if (loading.value) return

  loading.value = true

  const listId = route.params.listId
  const projectId = route.params.projectId

  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    showCompleted: showCompleted.value ? 0 : 1,
    currentListId: listId ? Number(listId) : fetchRules.value.currentListId,
    goalId: projectId ? Number(projectId) : fetchRules.value.goalId,
    currentPage: 0,
    endOfTasks: false,
  })

  await tasksStore.fetchTasks()
  loading.value = false
}

async function applySort(rules: Partial<typeof fetchRules.value>) {
  if (loading.value) return

  loading.value = true

  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    ...rules,
    currentPage: 0,
    endOfTasks: false,
  })

  await tasksStore.fetchTasks()
  loading.value = false
}

function toggleSort() {
  return applySort({ firstNew: firstNew.value ? 0 : 1 })
}

async function resetSearch() {
  loading.value = true
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    searchText: '',
    currentPage: 0,
    endOfTasks: false,
  })
  await tasksStore.fetchTasks()
  loading.value = false
}

async function resetFilters() {
  loading.value = true
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    filters: {},
    currentPage: 0,
    endOfTasks: false,
  })
  await tasksStore.fetchTasks()
  loading.value = false
}

async function resetAll() {
  loading.value = true
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    searchText: '',
    filters: {},
    currentPage: 0,
    endOfTasks: false,
  })
  await tasksStore.fetchTasks()
  loading.value = false
}
</script>

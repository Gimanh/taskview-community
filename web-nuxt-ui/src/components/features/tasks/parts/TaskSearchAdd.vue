<template>
  <div class="flex items-center gap-2 w-full">
    <div class="flex-1">
      <UInput
        v-model="inputValue"
        :placeholder="mode === 'add' ? t('tasks.addPlaceholder') : t('tasks.searchPlaceholder')"
        :loading="loading"
        variant="soft"
        class="w-full"
        :ui="{
          base: 'bg-tv-ui-bg-elevated',
        }"
        @keydown.enter="handleEnter"
        @update:model-value="handleInput"
      >
        <template #leading>
          <UIcon
            :name="mode === 'add' ? 'i-lucide-plus' : 'i-lucide-search'"
            class="size-4 text-dimmed"
          />
        </template>
        <template #trailing>
          <UButton
            v-if="inputValue.trim() && mode === 'search'"
            :label="t('tasks.add')"
            icon="i-lucide-plus"
            color="primary"
            variant="ghost"
            size="xs"
            @click="addTask"
          />
          <UButton
            v-else-if="inputValue.trim() && mode === 'add'"
            icon="i-lucide-corner-down-left"
            color="primary"
            variant="ghost"
            size="xs"
            :aria-label="t('tasks.add')"
            @click="addTask"
          />
          <UIcon
            v-else
            name="i-lucide-keyboard"
            class="size-4 text-dimmed"
          />
        </template>
      </UInput>
    </div>

    <UButton
      :icon="mode === 'add' ? 'i-lucide-search' : 'i-lucide-plus'"
      color="neutral"
      variant="soft"
      size="xl"
      @click="toggleMode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useTasksStore } from '@/stores/tasks.store'
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'

const emit = defineEmits<{
  add: [name: string]
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { projectId, listId } = useAppRouteInfo()

const initialSearchText = tasksStore.fetchRules.searchText
const mode = ref<'add' | 'search'>(initialSearchText ? 'search' : 'add')
const inputValue = ref(initialSearchText)
const loading = ref(false)

const debouncedSearch = useDebounceFn(async () => {
  if (mode.value === 'search') {
    await searchTasks()
  }
}, 500)

function toggleMode() {
  mode.value = mode.value === 'add' ? 'search' : 'add'
  inputValue.value = ''

  // Reset search when switching back to add mode
  if (mode.value === 'add') {
    resetSearch()
  }
}

function handleEnter() {
  if (mode.value === 'add') {
    addTask()
  } else {
    searchTasks()
  }
}

function handleInput() {
  if (mode.value === 'search') {
    debouncedSearch()
  }
}

function addTask() {
  const name = inputValue.value.trim()
  if (name) {
    emit('add', name)
    inputValue.value = ''

    // If in search mode, refresh the search results
    if (mode.value === 'search') {
      debouncedSearch()
    }
  }
}

async function searchTasks() {
  loading.value = true
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    endOfTasks: false,
    currentPage: 0,
    goalId: Number(projectId.value),
    currentListId: listId.value ? Number(listId.value) : ALL_TASKS_LIST_ID,
    searchText: inputValue.value.trim(),
  })

  await tasksStore.fetchTasks()
  loading.value = false
}

async function resetSearch() {
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    endOfTasks: false,
    currentPage: 0,
    goalId: projectId.value,
    currentListId: listId.value ? listId.value : ALL_TASKS_LIST_ID,
    searchText: '',
  })

  await tasksStore.fetchTasks()
}

// Sync with store when searchText is reset externally (e.g. from toolbar)
watch(
  () => tasksStore.fetchRules.searchText,
  (newSearchText) => {
    if (!newSearchText && mode.value === 'search') {
      mode.value = 'add'
      inputValue.value = ''
    }
  },
)
</script>

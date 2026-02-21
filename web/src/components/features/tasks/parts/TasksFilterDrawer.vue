<template>
  <UDrawer
    v-model:open="isOpen"
    :title="t('filters.title')"
    :ui="{header: 'flex flex-col gap-2', content: 'items-center w-full lg:w-1/2 mx-auto max-w-2xl' }"
  >
    <template #header>
      <h2 class="text-highlighted font-semibold">
        {{ t('filters.title') }}
      </h2>
      <USeparator />
    </template>
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- User Filter -->
        <UFormField
          :label="t('filters.assignee')"
          :class="sectionClasses"
        >
          <USelectMenu
            v-model="filters.selectedUser"
            :items="userItems"
            :placeholder="t('filters.selectAssignee')"
            :search-input="false"
            value-key="value"
            class="w-full"
            size="xl"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <!-- Tags Filter -->
        <UFormField
          :label="t('tasks.tags')"
          :class="sectionClasses"
        >
          <div
            v-if="filteredTags.length > 0"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="tag in filteredTags"
              :key="tag.id"
              :label="tag.name"
              icon="i-lucide-tag"
              size="xl"
              :style="{
                backgroundColor: isTagSelected(tag.id) ? tag.color : undefined,
                borderColor: isTagSelected(tag.id) ? tag.color : undefined,
                color: isTagSelected(tag.id) ? getContrastColor(tag.color) : undefined,
              }"
              :ui="{ label: 'text-base', base:'gap-2', leadingIcon: 'size-4' }"
              :color="isTagSelected(tag.id) ? 'primary' : 'neutral'"
              :variant="isTagSelected(tag.id) ? 'soft' : 'outline'"
              class="cursor-pointer transition-colors min-h-9"
              @click="toggleTag(tag.id)"
            />
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ t('tags.noTagsFound') }}
          </p>
        </UFormField>

        <!-- Priority Filter -->
        <UFormField
          :label="t('tasks.priority')"
          :class="sectionClasses"
        >
          <div class="flex gap-2">
            <UButton
              v-for="priority in priorityOptions"
              :key="priority.value"
              :label="priority.label"
              :color="filters.priority === priority.value ? 'primary' : 'neutral'"
              :variant="filters.priority === priority.value ? 'outline' : 'outline'"
              size="lg"
              @click="togglePriority(priority.value)"
            />
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <USeparator />
      <div class="flex justify-between gap-2 p-4">
        <UButton
          :label="t('filters.reset')"
          color="neutral"
          variant="outline"
          @click="resetFilters"
        />
        <UButton
          :label="t('filters.apply')"
          color="primary"
          variant="outline"
          @click="applyFilters"
        />
      </div>
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
import { computed, watch, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TaskFilters } from 'taskview-api'
import { useTasksStore } from '@/stores/tasks.store'
import { useTagsStore } from '@/stores/tag.store'
import { useCollaborationStore } from '@/stores/collaboration.store'

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const route = useRoute()

const tasksStore = useTasksStore()
const tagsStore = useTagsStore()
const collaborationStore = useCollaborationStore()

const { fetchRules } = storeToRefs(tasksStore)
const { filteredTags } = storeToRefs(tagsStore)
const { users } = storeToRefs(collaborationStore)

const filters = reactive<TaskFilters>({
  selectedUser: undefined,
  selectedTags: {},
  priority: undefined,
})

const sectionClasses = 'shadow-md bg-elevated/30 p-2 rounded-lg'

const userItems = computed(() => [
  ...users.value.map((user) => ({
    label: user.email,
    value: user.id,
  })),
])

const priorityOptions = computed(() => [
  { label: t('tasks.priorityLow'), value: 1 as const },
  { label: t('tasks.priorityMedium'), value: 2 as const },
  { label: t('tasks.priorityHigh'), value: 3 as const },
])

watch(isOpen, (open) => {
  if (open) {
    // Sync filters with current fetchRules
    filters.selectedUser = fetchRules.value.filters.selectedUser
    filters.selectedTags = { ...fetchRules.value.filters.selectedTags }
    filters.priority = fetchRules.value.filters.priority

    // Fetch users for current project
    const projectId = route.params.projectId
    if (projectId) {
      collaborationStore.fetchCollaborationUsersForGoal(Number(projectId))
    }
  }
})

function isTagSelected(tagId: number): boolean {
  return !!filters.selectedTags?.[tagId]
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

function toggleTag(tagId: number) {
  if (!filters.selectedTags) {
    filters.selectedTags = {}
  }
  if (filters.selectedTags[tagId]) {
    delete filters.selectedTags[tagId]
  } else {
    filters.selectedTags[tagId] = true
  }
}

function togglePriority(value: 1 | 2 | 3) {
  filters.priority = filters.priority === value ? undefined : value
}

function resetFilters() {
  filters.selectedUser = undefined
  filters.selectedTags = {}
  filters.priority = undefined
}

async function applyFilters() {
  tasksStore.resetTasks()
  tasksStore.updateFetchRules({
    filters: {
      selectedUser: filters.selectedUser,
      selectedTags: filters.selectedTags,
      priority: filters.priority,
    },
    currentPage: 0,
    endOfTasks: false,
  })

  await tasksStore.fetchTasks()
  isOpen.value = false
}
</script>

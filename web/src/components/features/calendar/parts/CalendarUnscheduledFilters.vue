<template>
  <UPopover
    v-if="canViewAssignedUsersToTask || canViewTaskPriority"
    :content="{ align: 'end' }"
  >
    <UChip
      :show="isFiltered"
      size="md"
      inset
    >
      <UButton
        icon="i-lucide-list-filter"
        color="neutral"
        :variant="isFiltered ? 'soft' : 'ghost'"
        :size="size"
        square
        :aria-label="t('calendar.unscheduled.filter')"
        data-testid="calendar-unscheduled-filter"
      />
    </UChip>

    <template #content>
      <div class="flex w-64 flex-col gap-3 p-3">
        <UFormField
          v-if="canViewAssignedUsersToTask"
          :label="t('calendar.unscheduled.assignee')"
        >
          <USelectMenu
            v-model="assignees"
            :items="assigneeOptions"
            multiple
            value-key="value"
            :placeholder="t('calendar.unscheduled.anyAssignee')"
            :search-input="{ placeholder: t('calendar.unscheduled.findAssignee') }"
            class="w-full"
            data-testid="calendar-unscheduled-filter-assignees"
          />
        </UFormField>

        <UFormField
          v-if="canViewTaskPriority"
          :label="t('tasks.priority')"
        >
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="option in priorityOptions"
              :key="option.value"
              :label="option.label"
              icon="i-lucide-flag"
              :trailing-icon="priorities.includes(option.value) ? 'i-lucide-check' : undefined"
              :color="priorities.includes(option.value) ? 'primary' : 'neutral'"
              :variant="priorities.includes(option.value) ? 'subtle' : 'outline'"
              size="xs"
              :aria-pressed="priorities.includes(option.value)"
              :ui="{ leadingIcon: option.iconClass }"
              :data-testid="`calendar-unscheduled-filter-priority-${option.value}`"
              @click="togglePriority(option.value)"
            />
          </div>
        </UFormField>

        <UButton
          v-if="isFiltered"
          icon="i-lucide-x"
          :label="t('filters.reset')"
          color="neutral"
          variant="soft"
          size="sm"
          block
          data-testid="calendar-unscheduled-filter-reset"
          @click="reset"
        />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { usePriorityOptions } from '@/composables/usePriorityOptions'
import {
  NO_ASSIGNEE,
  NO_PRIORITY,
  useCalendarUnscheduledFilters,
  type UnscheduledPriorityFilter,
} from '@/composables/useCalendarRouteState'

const { size = 'sm' } = defineProps<{ size?: 'sm' | 'md' }>()

const { t } = useI18n()
const collaborationStore = useCollaborationStore()
const { canViewTaskPriority, canViewAssignedUsersToTask } = useGoalPermissions()
const { options } = usePriorityOptions()
const { assignees, priorities, isFiltered, reset } = useCalendarUnscheduledFilters()

const assigneeOptions = computed(() => [
  { label: t('calendar.unscheduled.noAssignee'), value: NO_ASSIGNEE, icon: 'i-lucide-user-x' },
  ...collaborationStore.users.map((user) => ({ label: user.email, value: user.id })),
])

const priorityOptions = computed<Array<{ value: UnscheduledPriorityFilter, label: string, iconClass: string }>>(() => [
  ...options.value,
  { value: NO_PRIORITY, label: t('tasks.priorityNone'), iconClass: 'text-dimmed' },
])

function togglePriority(value: UnscheduledPriorityFilter) {
  priorities.value = priorities.value.includes(value)
    ? priorities.value.filter((id) => id !== value)
    : [...priorities.value, value]
}
</script>

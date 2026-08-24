<template>
  <div class="flex flex-col gap-1 min-w-0 h-full">
    <div class="flex items-center gap-1.5 px-1">
      <UIcon
        :name="icon"
        class="size-3.5 text-muted"
      />
      <span class="text-xs text-muted">{{ title }}</span>
    </div>

    <div
      v-for="entry in entries"
      :key="entry.edgeId"
      class="flex items-center gap-2 rounded-xl bg-default shadow-xs px-3 py-2"
      :data-testid="`dependency-${direction}-${entry.task.id}`"
    >
      <UIcon
        :name="entry.task.complete ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
        class="size-3.5 shrink-0"
        :class="entry.task.complete ? 'text-success' : 'text-muted'"
      />
      <button
        type="button"
        class="flex-1 min-w-0 text-left text-sm truncate cursor-pointer"
        :class="{ 'text-muted line-through': entry.task.complete }"
        @click="$emit('open', entry.task.id)"
      >
        {{ entry.task.description }}
      </button>
      <UButton
        v-if="canManage"
        icon="i-lucide-x"
        color="error"
        variant="ghost"
        size="xs"
        class="shrink-0"
        :aria-label="t('common.delete')"
        @click="$emit('remove', entry.edgeId)"
      />
    </div>

    <p
      v-if="entries.length === 0"
      class="text-sm text-dimmed px-2 py-1"
    >
      {{ t('tasks.dependencies.none') }}
    </p>

    <div
      v-if="canManage"
      class="mt-auto"
    >
      <TaskDependencyPicker
        :goal-id="goalId"
        :excluded-ids="excludedIds"
        @select="(task) => $emit('add', task)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TaskDependencyPicker from './TaskDependencyPicker.vue'
import type { DependencyEntry, DependencyTask } from './TaskDependencies.types'

defineProps<{
  title: string
  icon: string
  direction: 'previous' | 'next'
  entries: DependencyEntry[]
  goalId: number
  excludedIds: number[]
  canManage: boolean
}>()

defineEmits<{
  open: [taskId: number]
  add: [task: DependencyTask]
  remove: [edgeId: number]
}>()

const { t } = useI18n()
</script>

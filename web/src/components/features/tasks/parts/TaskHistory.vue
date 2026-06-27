<template>
  <div class="flex flex-col gap-2">
    <UButton
      icon="i-lucide-history"
      color="neutral"
      variant="soft"
      size="xl"
      block
      :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :ui="activatorUi('text-muted')"
      @click="toggleExpand"
    >
      <span class="flex-1 text-left">{{ t('history.title') }}</span>
      <UBadge
        v-if="changes.length > 0"
        :label="String(changes.length)"
        color="neutral"
        variant="subtle"
        size="sm"
        :ui="{ base: 'rounded-full' }"
      />
    </UButton>

    <div
      v-if="loading"
      class="flex items-center justify-center py-6"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-5 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="isExpanded && changes.length > 0 && canAccessTaskHistory"
      class="flex flex-col gap-1 rounded-2xl bg-elevated p-2 max-h-64 overflow-y-auto"
    >
      <div
        v-for="(item, index) in changes"
        :key="index"
        class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-default shadow-xs"
      >
        <p class="flex-1 min-w-0 text-sm truncate">
          {{ item.description }}
        </p>
        <div class="flex items-center gap-0.5 shrink-0">
          <UButton
            :disabled="!canAccessTaskHistory"
            icon="i-lucide-info"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="openDetailModal(item)"
          />
          <UButton
            v-if="item.historyId && canRecoveryTaskHistory"
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="restoringId === item.historyId"
            :disabled="restoringId !== null"
            @click="handleRestore(item.historyId)"
          />
        </div>
      </div>
    </div>

    <div
      v-else-if="isExpanded && changes.length === 0"
      class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-elevated py-8 text-muted"
    >
      <UIcon
        name="i-lucide-history"
        class="size-8"
      />
      <p class="text-sm">
        {{ t('history.empty') }}
      </p>
    </div>

    <UModal
      v-model:open="isDetailModalOpen"
      :fullscreen="isFullscreenModal"
      :title="t('history.details')"
      :ui="{ content: isFullscreenModal ? '' : 'sm:max-w-md' }"
    >
      <template #body>
        <p class="text-sm whitespace-pre-wrap break-words">
          {{ selectedChange?.description }}
        </p>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTaskHistory } from '@/stores/task-history.store'
import type { TaskItem } from '@/types/tasks.types'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'
import { useTaskView } from '@/composables/useTaskView'

type HistoryChange = {
  historyId: number | null
  description: string
}

const props = defineProps<{
  taskId: number
}>()

const { t } = useI18n()
const taskHistoryStore = useTaskHistory()
const { canAccessTaskHistory, canRecoveryTaskHistory } = useGoalPermissions()
const { activatorUi } = useNuxtUiTaskItemStyles()
const { isFullscreenModal } = useTaskView()
const { history } = storeToRefs(taskHistoryStore)

const isExpanded = ref(false)
const loading = ref(false)
const restoringId = ref<number | null>(null)
const isDetailModalOpen = ref(false)
const selectedChange = ref<HistoryChange | null>(null)

const changes = computed(() => {
  const result: HistoryChange[] = []
  history.value.reduce((acc, current, index, arr) => {
    if (index + 1 <= arr.length - 1) {
      acc.push(...getChanges(arr[index + 1], current))
    }
    return acc
  }, result)
  return result
})

function getHistoryDescription(fieldName: string, from: string, to: string, historyId: number | null): HistoryChange {
  return {
    historyId,
    description: `${t('history.changed')} [${t(`history.fields.${fieldName}`)}]: "${from}" => "${to}"`,
  }
}

function getChanges(t1: TaskItem, t2: TaskItem): HistoryChange[] {
  const result: HistoryChange[] = []

  if (t1.note !== t2.note) {
    result.push(getHistoryDescription('note', t1.note || '', t2.note || '', t1.historyId ?? null))
  }
  if (t1.description !== t2.description) {
    result.push(getHistoryDescription('description', t1.description || '', t2.description || '', t1.historyId ?? null))
  }
  if (t1.complete !== t2.complete) {
    result.push(
      getHistoryDescription(
        'complete',
        t1.complete ? t('history.completeTrue') : t('history.completeFalse'),
        t2.complete ? t('history.completeTrue') : t('history.completeFalse'),
        t1.historyId ?? null,
      ),
    )
  }
  if (t1.priorityId !== t2.priorityId) {
    result.push(
      getHistoryDescription('priority', t1.priorityId?.toString() || '', t2.priorityId?.toString() || '', t1.historyId ?? null),
    )
  }
  if (t1.goalListId !== t2.goalListId) {
    result.push(
      getHistoryDescription('list', t1.goalListId?.toString() || '', t2.goalListId?.toString() || '', t1.historyId ?? null),
    )
  }
  if (t1.endDate !== t2.endDate) {
    result.push(getHistoryDescription('endDate', t1.endDate || '', t2.endDate || '', t1.historyId ?? null))
  }
  if (t1.startDate !== t2.startDate) {
    result.push(getHistoryDescription('startDate', t1.startDate || '', t2.startDate || '', t1.historyId ?? null))
  }

  return result
}

async function fetchHistory() {
  loading.value = true
  try {
    await taskHistoryStore.fetchHistoryForTask(props.taskId)
  } finally {
    loading.value = false
  }
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value && history.value.length === 0) {
    fetchHistory()
  }
}

function openDetailModal(change: HistoryChange) {
  selectedChange.value = change
  isDetailModalOpen.value = true
}

async function handleRestore(historyId: number) {
  restoringId.value = historyId
  try {
    const success = await taskHistoryStore.recoverState(historyId, props.taskId)
    if (success) {
      await fetchHistory()
    }
  } finally {
    restoringId.value = null
  }
}

watch(() => props.taskId, () => {
  isExpanded.value = false
  taskHistoryStore.history = []
})

onMounted(() => {
  fetchHistory()
})
</script>

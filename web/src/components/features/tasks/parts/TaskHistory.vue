<template>
  <div class="shadow-sm rounded-lg p-2 dark:bg-tv-ui-bg-elevated">
    <div
      class="flex items-center justify-between"
      @click="toggleExpand"
    >
      <label class="text-base text-muted">{{ t('history.title') }}</label>
      <UButton
        v-if="!isExpanded"
        :label="t('history.show')"
        icon="i-lucide-history"
        color="neutral"
        variant="ghost"
        size="md"
      />
      <UButton
        v-else
        :label="t('history.hide')"
        icon="i-lucide-chevron-up"
        color="neutral"
        variant="ghost"
        size="md"
      />
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-4"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-5 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="isExpanded && changes.length > 0 && canAccessTaskHistory"
      class="space-y-2 max-h-64 overflow-y-auto mt-2"
    >
      <div
        v-for="(item, index) in changes"
        :key="index"
        class="flex items-center justify-between p-2 rounded-lg border border-default hover:bg-elevated transition-colors"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">
            {{ item.description }}
          </p>
        </div>
        <div class="flex items-center gap-1">
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
      class="flex flex-col items-center justify-center py-4 text-muted"
    >
      <UIcon
        name="i-lucide-history"
        class="size-8 mb-2"
      />
      <p class="text-sm">
        {{ t('history.empty') }}
      </p>
    </div>

    <UModal v-model:open="isDetailModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium">
                {{ t('history.details') }}
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="isDetailModalOpen = false"
              />
            </div>
          </template>
          <p class="text-sm whitespace-pre-wrap break-words">
            {{ selectedChange?.description }}
          </p>
        </UCard>
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

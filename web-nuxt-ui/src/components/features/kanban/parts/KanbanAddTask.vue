<template>
  <UInput
    v-model="taskName"
    :loading="loading"
    :placeholder="t('kanban.addTask')"
    :trailing-icon="inputIcon"
    icon="i-lucide-plus"
    size="xl"
    class="mt-1 rounded-lg"
    enterkeyhint="go"
    spellcheck="false"
    @keyup.enter="addTask"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GoalItem } from 'taskview-api'
import { useKanbanStore } from '@/stores/kanban.store'
import { DEFAULT_ID } from '@/types/app.types'
import type { TaskItem } from '@/types/tasks.types'

const props = defineProps<{
  goalId: GoalItem['id']
  statusId: TaskItem['statusId']
}>()

const { t } = useI18n()
const kanbanStore = useKanbanStore()

const taskName = ref('')
const loading = ref(false)
const inputIcon = computed(() => taskName.value.trim() ? 'i-lucide-corner-down-left' : 'i-lucide-keyboard')

const addTask = async () => {
  if (!taskName.value.trim()) {
    return
  }

  loading.value = true

  await kanbanStore.addTask({
    goalId: props.goalId,
    goalListId: null,
    description: taskName.value,
    statusId: props.statusId === DEFAULT_ID ? null : props.statusId,
  })

  taskName.value = ''
  loading.value = false
}
</script>

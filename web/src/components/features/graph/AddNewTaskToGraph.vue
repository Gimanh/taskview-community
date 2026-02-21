<template>
  <UModal v-model:open="model">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ t('graph.addTask') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="close"
            />
          </div>
        </template>

        <UFormField :label="t('tasks.description')">
          <UInput
            v-model="taskName"
            :placeholder="t('tasks.addPlaceholder')"
            class="w-full"
            @keyup.enter="addTask"
          />
        </UFormField>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="close"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              :disabled="!taskName.trim()"
              variant="outline"
              @click="addTask"
            >
              {{ t('tasks.add') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import type { TaskItem } from '@/types/tasks.types'

const emit = defineEmits<{
  addTask: [task: TaskItem]
  close: []
}>()

const model = defineModel<boolean>({ required: true })
const props = defineProps<{
  goalId: number
  nodePosition: { x: number; y: number } | undefined
}>()

const { t } = useI18n()
const taskName = ref('')
const store = useTasksStore()

const addTask = async () => {
  if (!props.goalId) return
  if (!taskName.value.trim()) return

  const task = await store.addTask({
    description: taskName.value,
    goalId: props.goalId,
    nodeGraphPosition: props.nodePosition,
  })

  if (!task) {
    return
  }

  emit('addTask', task)
  taskName.value = ''
}

const close = () => {
  taskName.value = ''
  emit('close')
}
</script>

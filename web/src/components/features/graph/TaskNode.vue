<template>
  <div class="bg-elevated rounded-lg w-72 shadow-lg">
    <Handle
      v-if="props.data.direction !== 'LR'"
      type="target"
      :position="Position.Bottom"
      :style="targetHandleStyle"
    />

    <Handle
      v-if="props.data.direction !== 'LR'"
      type="source"
      :position="Position.Top"
      :style="sourceHandleStyle"
    />

    <Handle
      v-if="props.data.direction === 'LR'"
      type="target"
      :position="Position.Left"
      :style="targetHandleStyle"
    />
    <Handle
      v-if="props.data.direction === 'LR'"
      type="source"
      :position="Position.Right"
      :style="sourceHandleStyle"
    />

    <TaskItem 
      :task="props.data.task" 
      class="w-full"
      @toggle="toggleComplete($event)" 
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import type { TaskItem } from '@/types/tasks.types'
import { useTasksStore } from '@/stores/tasks.store'
import { Task } from 'taskview-api'

type TaskNodeProps = {
  toolbarVisible: boolean
  toolbarPosition: Position
  label: string
  task: TaskItem
  direction?: 'LR' | 'TB'
}

const props = defineProps<{ data: TaskNodeProps }>()
const tasksStore = useTasksStore()

async function toggleComplete(task: Task) {
  await tasksStore.updateTaskCompleteStatus({
    id: task.id,
    complete: !task.complete,
  })
}

const handleStyle = computed(() => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
}))

const targetHandleStyle = computed(() => ({
  ...handleStyle.value,
  background: '#f43f5e',
}))

const sourceHandleStyle = computed(() => ({
  ...handleStyle.value,
  background: '#22c55e',
}))
</script>

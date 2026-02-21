<template>
  <div class="flex items-center gap-2 group ">
    <UTextarea
      ref="inputRef"
      v-model="localDescription"
      type="text"
      class="flex-1 text-sm border-none outline-none focus:ring-0 p-1 rounded-lg hover:bg-muted/10 focus:bg-muted/10 shadow-sm dark:bg-tv-ui-bg-elevated!"
      :class="{ 'line-through text-muted': subtask.complete }"
      :rows="1"
      :autoresize="true"
      variant="ghost"
      @input="onInput"
      @blur="flushSave"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
    >
      <template #leading>
        <div class="flex items-start h-full py-1.5">
          <UCheckbox
            :model-value="!!subtask.complete"
            @update:model-value="$emit('update:complete')"
          />
        </div>
      </template> 
      <template #trailing>
        <div class="flex items-start h-full py-1">
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click="$emit('delete')"
          />
        </div>
      </template>
    </UTextarea>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Task } from 'taskview-api'

const props = defineProps<{
  subtask: Task
}>()

const emit = defineEmits<{
  'update:description': [value: string]
  'update:complete': []
  'delete': []
}>()

const inputRef = useTemplateRef('inputRef')
const localDescription = ref(props.subtask.description)
let lastEmitted = props.subtask.description

watch(() => props.subtask.description, (val) => {
  if (val !== lastEmitted) {
    localDescription.value = val
    lastEmitted = val
  }
})

const debouncedSave = useDebounceFn(() => {
  if (localDescription.value !== lastEmitted) {
    lastEmitted = localDescription.value
    emit('update:description', localDescription.value)
  }
}, 500)

function onInput() {
  debouncedSave()
}

function flushSave() {
  if (localDescription.value !== lastEmitted) {
    lastEmitted = localDescription.value
    emit('update:description', localDescription.value)
  }
}

function focus() {
  const textarea = inputRef.value?.textareaRef
  textarea?.focus()
  textarea?.select()
}

defineExpose({ focus })
</script>

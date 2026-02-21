<template>
  <UBadge
    :label="tag.name"
    :style="badgeStyle"
    :variant="isSelected ? 'solid' : 'outline'"
    class="cursor-pointer select-none"
    size="lg"
    @click="handleClick"
  >
    <template #leading>
      <UIcon
        name="i-lucide-tag"
        class="size-3"
      />
    </template>

    <template
      v-if="editMode"
      #trailing
    >
      <div class="flex items-center ml-1 -mr-1 gap-2">
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          color="neutral"
          variant="ghost"
          @click.stop="$emit('edit', tag)"
        />
        <!-- <UButton
          icon="i-lucide-x"
          size="xs"
          color="error"
          variant="ghost"
          @click.stop="$emit('delete', tag)"
        /> -->
      </div>
    </template>
  </UBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagItem as TagItemType } from 'taskview-api'

const props = defineProps<{
  tag: TagItemType
  isSelected: boolean
  editMode?: boolean
}>()

const emit = defineEmits<{
  toggle: [tag: TagItemType]
  edit: [tag: TagItemType]
  delete: [tag: TagItemType]
}>()

const badgeStyle = computed(() => {
  if (props.isSelected) {
    return {
      backgroundColor: props.tag.color,
      borderColor: props.tag.color,
      color: getContrastColor(props.tag.color),
    }
  }
  return {
    borderColor: props.tag.color,
    color: props.tag.color,
  }
})

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

function handleClick() {
  emit('toggle', props.tag)
}
</script>

<template>
  <div class="space-y-3">
    <UInput
      v-model="searchQuery"
      :placeholder="t('tags.searchPlaceholder')"
      icon="i-lucide-search"
      size="xl"
      class="w-full"
      :variant="isDark ? 'subtle' : 'soft'"
      @keydown.enter="handleEnter"
    />

    <div
      v-if="filteredTags.length > 0"
      class="flex flex-wrap gap-2"
    >
      <TagItem
        v-for="tag in filteredTags"
        :key="tag.id"
        :tag="tag"
        :is-selected="isTagSelected(tag.id)"
        :edit-mode="editMode"
        @toggle="$emit('toggle', tag)"
        @edit="$emit('edit', tag)"
        @delete="$emit('delete', tag)"
      />
    </div>

    <div
      v-else-if="searchQuery.trim()"
      class="text-sm text-muted py-2"
    >
      {{ t('tags.noTagsFound') }}
    </div>

    <UButton
      :disabled="!canEditTaskTags"
      icon="i-lucide-plus"
      color="neutral"
      variant="subtle"
      size="md"
      class="w-full justify-start"
      @click="$emit('create')"
    >
      {{ t('tags.createTag') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TagItem as TagItemType } from 'taskview-api'
import TagItem from './TagItem.vue'
import { useColorMode } from '@vueuse/core'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const props = defineProps<{
  tags: TagItemType[]
  selectedTagIds: number[]
  editMode?: boolean
}>()

const emit = defineEmits<{
  toggle: [tag: TagItemType]
  edit: [tag: TagItemType]
  delete: [tag: TagItemType]
  create: []
  quickCreate: [data: { name: string; color: string }]
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const { canEditTaskTags } = useGoalPermissions()
const { t } = useI18n()

const searchQuery = ref('')

const colorPresets = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#546E7A', '#26A69A', '#EC407A',
]

const filteredTags = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return props.tags
  return props.tags.filter(tag =>
    tag.name.toLowerCase().includes(query),
  )
})

function isTagSelected(tagId: number): boolean {
  return props.selectedTagIds.includes(tagId)
}

function getRandomColor(): string {
  return colorPresets[Math.floor(Math.random() * colorPresets.length)]
}

function handleEnter() {
  const name = searchQuery.value.trim()
  if (!name) return

  const existingTag = props.tags.find(
    tag => tag.name.toLowerCase() === name.toLowerCase(),
  )

  if (existingTag) {
    emit('toggle', existingTag)
  } else {
    emit('quickCreate', { name, color: getRandomColor() })
  }
  searchQuery.value = ''
}
</script>

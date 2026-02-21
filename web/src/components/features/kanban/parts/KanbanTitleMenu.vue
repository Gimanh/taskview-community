<template>
  <UDropdownMenu
    :items="menuItems"
    :ui="{ content: 'z-50' }"
    size="lg"
  >
    <UButton
      icon="i-lucide-ellipsis"
      color="neutral"
      variant="ghost"
      size="sm"
    />
  </UDropdownMenu>

  <KanbanEditModal
    v-model="editOpen"
    :status="props.status"
  />

  <KanbanDeleteModal
    v-model="deleteOpen"
    :status="props.status"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { KanbanColumnItem } from 'taskview-api'
import type { DropdownMenuItem } from '@nuxt/ui'
import KanbanEditModal from './KanbanEditModal.vue'
import KanbanDeleteModal from './KanbanDeleteModal.vue'

const props = defineProps<{ status: KanbanColumnItem }>()

const { t } = useI18n()

const editOpen = ref(false)
const deleteOpen = ref(false)

const ui = {
  itemLeadingIcon: 'size-4',
  item: 'items-center',
}
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('kanban.edit'),
      icon: 'i-lucide-pencil',
      ui,
      // size: 'lg',
      onSelect: () => {
        editOpen.value = true
      },
    },
    {
      label: t('kanban.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      ui,
      onSelect: () => {
        deleteOpen.value = true
      },
    },
  ],
])
</script>

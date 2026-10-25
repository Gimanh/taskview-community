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
      data-testid="kanban-column-menu-trigger"
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
import { useKanbanStore } from '@/stores/kanban.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { DEFAULT_ID } from '@/types/app.types'
import type { KanbanMoveStatusArgs } from '@/types/kanban.types'

const props = defineProps<{ status: KanbanColumnItem }>()

const { t } = useI18n()
const toast = useToast()
const kanbanStore = useKanbanStore()
const { canManageKanban } = useGoalPermissions()

const columnIds = computed(() => kanbanStore.statuses.filter((stat) => stat.id !== DEFAULT_ID).map((stat) => stat.id))
const position = computed(() => columnIds.value.indexOf(props.status.id))

async function move(direction: KanbanMoveStatusArgs['direction']) {
  const moved = await kanbanStore.moveStatus({ statusId: props.status.id, direction })
  if (!moved) {
    toast.add({ title: t('kanban.moveFailed'), color: 'error' })
  }
}

const editOpen = ref(false)
const deleteOpen = ref(false)

const ui = {
  itemLeadingIcon: 'size-4',
  item: 'items-center',
} as DropdownMenuItem['ui']
const moveItems = computed<DropdownMenuItem[]>(() => [
  {
    label: t('kanban.moveLeft'),
    icon: 'i-lucide-arrow-left',
    ui,
    disabled: position.value <= 0,
    'data-testid': 'kanban-menu-move-left',
    onSelect: () => move('left'),
  },
  {
    label: t('kanban.moveRight'),
    icon: 'i-lucide-arrow-right',
    ui,
    disabled: position.value === -1 || position.value >= columnIds.value.length - 1,
    'data-testid': 'kanban-menu-move-right',
    onSelect: () => move('right'),
  },
])

const menuItems = computed<DropdownMenuItem[][]>(() => [
  ...(canManageKanban.value ? [moveItems.value] : []),
  [
    {
      label: t('kanban.edit'),
      icon: 'i-lucide-pencil',
      ui,
      'data-testid': 'kanban-menu-edit',
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
      'data-testid': 'kanban-menu-delete',
      onSelect: () => {
        deleteOpen.value = true
      },
    },
  ],
])
</script>

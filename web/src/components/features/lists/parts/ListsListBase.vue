<template>
  <UCollapsible
    v-model:open="isOpen"
    class="flex flex-col gap-2 w-full group"
  >
    <TvGoalLikeItem variant="taskview">
      {{ title }}

      <UIcon
        name="i-lucide-chevron-down"
        class="group-data-[state=open]:rotate-180 transition-transform duration-200"
      />
    </TvGoalLikeItem>
    <template #content>
      <UPageList class="w-full gap-2 flex flex-col">
        <ListAddInput
          v-if="!isArchive"
          @add="handleAdd"
        />
        <TvGoalLikeItem
          v-for="list in lists"
          :key="list.id"
          variant="taskview"
          :to="{ name: 'user', params: { projectId, listId: list.id } }"
          :active="currentListId === list.id"
        >
          <div class="flex items-center justify-between w-full">
            <span>{{ list.name }}</span>
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="xs"
              class="z-10 cursor-pointer"
              @click.prevent.stop="openContextMenu($event, list)"
            />
          </div>
        </TvGoalLikeItem>
      </UPageList>
    </template>
  </UCollapsible>

  <TvContextMenu ref="contextMenu">
    <div class="p-1 flex flex-col gap-1">
      <!-- Edit -->
      <UButton
        :label="t('contextMenu.edit')"
        icon="i-lucide-pencil"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        @click="openEditModal"
      />

      <!-- Archive/Restore -->
      <UButton
        v-if="!isArchive"
        :label="t('contextMenu.moveToArchive')"
        icon="i-lucide-archive"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        @click="handleArchive"
      />
      <UButton
        v-else
        :label="t('contextMenu.restoreFromArchive')"
        icon="i-lucide-archive-restore"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        @click="handleRestore"
      />

      <USeparator class="my-1" />

      <!-- Delete -->
      <UButton
        :label="t('contextMenu.delete')"
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        class="w-full justify-start"
        @click="openDeleteDialog"
      />
    </div>
  </TvContextMenu>

  <!-- Edit Modal -->
  <ListEditModal
    v-model:open="isEditModalOpen"
    :list="selectedList"
    @save="handleSave"
  />

  <!-- Delete Confirmation Dialog -->
  <ListDeleteDialog
    v-model:open="isDeleteDialogOpen"
    :list="selectedList"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TvContextMenu from '@/components/features/base/TvContextMenu.vue'
import ListEditModal from '@/components/features/lists/parts/ListEditModal.vue'
import ListDeleteDialog from '@/components/features/lists/parts/ListDeleteDialog.vue'
import ListAddInput from '@/components/features/lists/parts/ListAddInput.vue'
import type { List } from '@/components/features/lists/types'

withDefaults(
  defineProps<{
    title: string
    lists: List[]
    isArchive?: boolean
  }>(),
  {
    isArchive: false,
  },
)

const emit = defineEmits<{
  save: [list: List, data: { name: string }]
  delete: [list: List]
  archive: [list: List]
  restore: [list: List]
  add: [name: string]
}>()

const { t } = useI18n()
const route = useRoute()

const isOpen = defineModel<boolean>('open', { required: false, default: true })

const projectId = computed(() => route.params.projectId)
const currentListId = computed(() => Number(route.params.listId) || null)

const contextMenu = ref<InstanceType<typeof TvContextMenu> | null>(null)
const selectedList = ref<List | null>(null)

const isEditModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)

function openContextMenu(event: MouseEvent, list: List) {
  selectedList.value = list
  contextMenu.value?.openAt(event)
}

function openEditModal() {
  contextMenu.value?.close()
  isEditModalOpen.value = true
}

function handleSave(data: { name: string }) {
  if (selectedList.value) {
    emit('save', selectedList.value, data)
  }
}

function handleArchive() {
  if (selectedList.value) {
    emit('archive', selectedList.value)
  }
  contextMenu.value?.close()
}

function handleRestore() {
  if (selectedList.value) {
    emit('restore', selectedList.value)
  }
  contextMenu.value?.close()
}

function openDeleteDialog() {
  contextMenu.value?.close()
  isDeleteDialogOpen.value = true
}

function handleDelete() {
  if (selectedList.value) {
    emit('delete', selectedList.value)
  }
}

function handleAdd(name: string) {
  emit('add', name)
}
</script>

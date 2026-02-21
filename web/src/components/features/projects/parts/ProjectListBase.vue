<template>
  <UCollapsible
    v-model:open="isOpen"
    v-bind="$attrs"
    class="flex flex-col gap-2 w-full group"
    :ui="{
      content: 'p-0 pl-3',
    }"
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
        <ProjectAddInput
          v-if="!isArchive"
          @add="handleAdd"
        />
        <TvGoalLikeItem
          v-for="project in projects"
          :key="project.id"
          variant="taskview"
          :to="{ name: 'user', params: { projectId: project.id, listId: '-1401' } }"
          :active="currentProjectId === project.id"
        >
          <div
            class="flex items-center justify-between w-full"
            :data-testid="`project-row-${project.name}`"
          >
            <span>{{ project.name }}</span>
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="xs"
              class="z-10 cursor-pointer"
              data-testid="project-menu-trigger"
              @click.prevent.stop="openContextMenu($event, project)"
            />
          </div>
        </TvGoalLikeItem>
      </UPageList>
    </template>
  </UCollapsible>

  <TvContextMenu ref="contextMenu">
    <div class="p-1 flex flex-col gap-1">
      <!-- Navigation items -->
      <!-- Kanban -->
      <UButton
        v-if="canViewKanban"
        :label="t('contextMenu.kanban')"
        icon="i-lucide-kanban"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        :to="{ name: 'kanban', params: { projectId: selectedProject?.id } }"
        @click="contextMenu?.close()"
      />
      <!-- Graph -->
      <UButton
        v-if="canViewGraph"
        :label="t('contextMenu.graph')"
        icon="i-lucide-git-graph"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        :to="{ name: 'graph', params: { projectId: selectedProject?.id } }"
        @click="contextMenu?.close()"
      />
      <!-- Collaboration -->
      <UButton
        v-if="canManageUsers"
        :label="t('contextMenu.collaboration')"
        icon="i-lucide-users"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        :to="{ name: 'collaboration', params: { projectId: selectedProject?.id } }"
        @click="contextMenu?.close()"
      />

      <USeparator class="my-1" />

      <!-- Edit -->
      <UButton
        v-if="canEditGoal"
        :label="t('contextMenu.edit')"
        icon="i-lucide-pencil"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        data-testid="context-menu-edit"
        @click="openEditModal"
      />

      <!-- Archive/Restore -->
      <template v-if="canEditGoal"> 
        <UButton
          v-if="!isArchive"
          :label="t('contextMenu.moveToArchive')"
          icon="i-lucide-archive"
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          data-testid="context-menu-move-to-archive"
          @click="handleArchive"
        />
        <UButton
          v-else
          :label="t('contextMenu.restoreFromArchive')"
          icon="i-lucide-archive-restore"
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          data-testid="context-menu-restore-from-archive"
          @click="handleRestore"
        />
      </template>

      <USeparator class="my-1" />

      <!-- Delete -->
      <UButton
        v-if="canDeleteGoal"
        :label="t('contextMenu.delete')"
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        class="w-full justify-start"
        data-testid="context-menu-delete"
        @click="openDeleteDialog"
      />
    </div>
  </TvContextMenu>

  <!-- Edit Modal -->
  <ProjectEditModal
    v-model:open="isEditModalOpen"
    :project="selectedProject"
    @save="handleSave"
  />

  <!-- Delete Confirmation Dialog -->
  <ProjectDeleteDialog
    v-model:open="isDeleteDialogOpen"
    :project="selectedProject"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import TvContextMenu from '@/components/features/base/TvContextMenu.vue'
import ProjectEditModal from '@/components/features/projects/parts/ProjectEditModal.vue'
import ProjectDeleteDialog from '@/components/features/projects/parts/ProjectDeleteDialog.vue'
import ProjectAddInput from '@/components/features/projects/parts/ProjectAddInput.vue'
import type { Project } from '@/components/features/projects/types'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const currentProjectId = computed(() => Number(route.params.projectId) || null)

withDefaults(
  defineProps<{
    title: string
    projects: Project[]
    isArchive?: boolean
  }>(),
  {
    isArchive: false,
  },
)

const emit = defineEmits<{
  save: [project: Project, data: { name: string; description: string }]
  delete: [project: Project]
  archive: [project: Project]
  restore: [project: Project]
  add: [name: string]
}>()

const { t } = useI18n()

const isOpen = defineModel<boolean>('open', { required: false, default: true })

const contextMenu = ref<InstanceType<typeof TvContextMenu> | null>(null)

const selectedProject = ref<Project | null>(null)

const {
  canViewKanban,
  canViewGraph,
  canManageUsers,
  canEditGoal,
  canDeleteGoal,
} = useGoalPermissionsFor(selectedProject)

const isEditModalOpen = ref(false)

const isDeleteDialogOpen = ref(false)

function openContextMenu(event: MouseEvent, project: Project) {
  selectedProject.value = project
  contextMenu.value?.openAt(event)
}

function openEditModal() {
  contextMenu.value?.close()
  isEditModalOpen.value = true
}

function handleSave(data: { name: string; description: string }) {
  if (selectedProject.value) {
    emit('save', selectedProject.value, data)
  }
}

function handleArchive() {
  if (selectedProject.value) {
    emit('archive', selectedProject.value)
  }
  contextMenu.value?.close()
}

function handleRestore() {
  if (selectedProject.value) {
    emit('restore', selectedProject.value)
  }
  contextMenu.value?.close()
}

function openDeleteDialog() {
  contextMenu.value?.close()
  isDeleteDialogOpen.value = true
}

function handleDelete() {
  if (selectedProject.value) {
    emit('delete', selectedProject.value)
  }
}

function handleAdd(name: string) {
  emit('add', name)
}
</script>

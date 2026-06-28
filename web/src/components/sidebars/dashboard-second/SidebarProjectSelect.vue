<template>
  <div class="flex flex-col gap-2">
    <UPopover
      v-model:open="open"
      :content="{ align: 'start' }"
      :ui="{ content: 'w-(--reka-popper-anchor-width) rounded-xl' }"
    >
      <UButton
        color="neutral"
        variant="soft"
        size="xl"
        block
        :icon="currentProject?.isInbox ? 'i-lucide-inbox' : 'i-lucide-folder'"
        trailing-icon="i-lucide-chevron-down"
        :ui="{ base: 'rounded-xl', trailingIcon: 'ms-auto' }"
      >
        <span
          class="flex-1 text-left truncate"
          :class="currentProject ? '' : 'text-muted'"
        >
          {{ currentProjectLabel }}
        </span>
      </UButton>

      <template #content>
        <div class="p-1 flex flex-col gap-0.5 max-h-72 overflow-auto">
          <UButton
            v-for="project in activeProjects"
            :key="project.id"
            :label="project.name"
            icon="i-lucide-folder"
            color="neutral"
            :variant="project.id === currentProjectId ? 'soft' : 'ghost'"
            block
            class="justify-start"
            @click="selectProject(project)"
          />
          <p
            v-if="!activeProjects.length"
            class="text-sm text-muted px-3 py-2"
          >
            {{ t('projects.empty') }}
          </p>

          <USeparator
            v-if="archivedProjects.length"
            class="my-1"
          />
          <UCollapsible
            v-if="archivedProjects.length"
            v-model:open="archiveOpen"
            class="group"
            :ui="{ content: 'p-0' }"
          >
            <button
              type="button"
              class="flex items-center justify-between w-full px-2 py-1.5 cursor-pointer select-none"
            >
              <span class="text-xs font-semibold uppercase tracking-wide text-muted">
                {{ t('archive.title') }} · {{ archivedProjects.length }}
              </span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-muted transition-transform duration-200 group-data-[state=closed]:-rotate-90"
              />
            </button>
            <template #content>
              <div class="flex flex-col gap-0.5 pt-0.5">
                <UButton
                  v-for="project in archivedProjects"
                  :key="project.id"
                  :label="project.name"
                  icon="i-lucide-archive"
                  color="neutral"
                  :variant="project.id === currentProjectId ? 'soft' : 'ghost'"
                  block
                  class="justify-start"
                  @click="selectProject(project)"
                />
              </div>
            </template>
          </UCollapsible>
        </div>
      </template>
    </UPopover>

    <div
      v-if="currentProject"
      class="flex items-center justify-end gap-2"
    >
      <UButton
        v-if="canEditGoal && !isArchived && !isInbox"
        icon="i-lucide-archive"
        color="neutral"
        variant="soft"
        size="sm"
        :title="t('contextMenu.moveToArchive')"
        :ui="{ base: 'rounded-lg' }"
        @click="archive"
      />
      <UButton
        v-if="canEditGoal && isArchived && !isInbox"
        icon="i-lucide-archive-restore"
        color="neutral"
        variant="soft"
        size="sm"
        :title="t('contextMenu.restoreFromArchive')"
        :ui="{ base: 'rounded-lg' }"
        @click="restore"
      />
      <UButton
        v-if="canEditGoal && !isInbox"
        icon="i-lucide-pencil"
        color="neutral"
        variant="soft"
        size="sm"
        :ui="{ base: 'rounded-lg' }"
        @click="isEditOpen = true"
      />
      <UButton
        v-if="canDeleteGoal && !isInbox"
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        size="sm"
        :ui="{ base: 'rounded-lg' }"
        @click="isDeleteOpen = true"
      />
    </div>

    <ProjectEditModal
      v-model:open="isEditOpen"
      :project="currentProject"
      @save="onSave"
    />
    <ProjectDeleteDialog
      v-model:open="isDeleteOpen"
      :project="currentProject"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import type { Project, ProjectSaveData } from '@/components/features/projects/types'
import ProjectEditModal from '@/components/features/projects/parts/ProjectEditModal.vue'
import ProjectDeleteDialog from '@/components/features/projects/parts/ProjectDeleteDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const goalsStore = useGoalsStore()
const { goals } = storeToRefs(goalsStore)

const open = ref(false)
const archiveOpen = ref(false)
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)

const currentProjectId = computed(() => Number(route.params.projectId) || null)
const activeProjects = computed(() => goals.value.filter(p => p.archive === 0 && !p.isInbox))
const archivedProjects = computed(() => goals.value.filter(p => p.archive === 1 && !p.isInbox))
const currentProject = computed<Project | null>(() =>
  currentProjectId.value ? goalsStore.goalMap.get(currentProjectId.value) ?? null : null,
)
const isArchived = computed(() => currentProject.value?.archive === 1)
const isInbox = computed(() => currentProject.value?.isInbox === true)
const currentProjectLabel = computed(() =>
  currentProject.value
    ? (currentProject.value.isInbox ? t('projects.inbox') : currentProject.value.name)
    : t('projects.selectProject'),
)

const { canEditGoal, canDeleteGoal } = useGoalPermissionsFor(currentProject)

function selectProject(project: Project) {
  open.value = false
  router.push({ name: 'user', params: { projectId: project.id, listId: ALL_TASKS_LIST_ID } })
}

async function archive() {
  if (!currentProject.value) return
  await goalsStore.updateGoal({ id: currentProject.value.id, archive: 1 })
}

async function restore() {
  if (!currentProject.value) return
  await goalsStore.updateGoal({ id: currentProject.value.id, archive: 0 })
}

async function onSave(data: ProjectSaveData) {
  if (!currentProject.value) return
  await goalsStore.updateGoal({
    id: currentProject.value.id,
    name: data.name,
    description: data.description,
    estimateUnit: data.estimateUnit,
  })
}

async function onDelete() {
  if (!currentProject.value) return
  await goalsStore.deleteGoal(currentProject.value.id)
  router.push({ name: 'user' })
}
</script>

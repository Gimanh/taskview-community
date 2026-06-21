<template>
  <div
    class="flex flex-col gap-2"
    data-testid="task-tags-manager"
  >
    <UButton
      icon="i-lucide-tag"
      color="neutral"
      variant="soft"
      size="xl"
      block
      :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :ui="activatorUi('text-muted')"
      data-testid="task-tags-manager-activator"
      @click="isExpanded = !isExpanded"
    >
      <div
        ref="tagsRowRef"
        class="flex-1 flex items-center gap-1 overflow-hidden"
      >
        <template v-if="selectedTags.length > 0">
          <UBadge
            v-for="(tag, i) in selectedTags"
            :key="tag.id"
            :label="tag.name"
            size="sm"
            class="shrink-0 max-w-40 truncate"
            :class="{ hidden: i >= visibleCount }"
            :style="{ backgroundColor: tag.color, color: getContrastColor(tag.color) }"
            :ui="{ base: 'rounded-md' }"
          />
          <UBadge
            v-if="overflowCount > 0"
            :label="`+${overflowCount}`"
            size="sm"
            color="neutral"
            variant="subtle"
            class="shrink-0"
            :ui="{ base: 'rounded-md' }"
          />
        </template>
        <span
          v-else
          class="text-muted"
        >{{ t('tasks.tags') }}</span>
      </div>
    </UButton>

    <div
      v-if="isExpanded && canViewTaskTags"
      class="flex flex-col gap-3 rounded-2xl bg-elevated p-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted">{{ t('tasks.tags') }}</span>
        <UButton
          :icon="isEditMode ? 'i-lucide-check' : 'i-lucide-settings-2'"
          :label="isEditMode ? t('common.done') : t('tags.manageTags')"
          :color="isEditMode ? 'primary' : 'neutral'"
          variant="soft"
          :disabled="!canEditTaskTags"
          size="sm"
          :ui="{ base: 'rounded-lg' }"
          data-testid="task-tags-manager-manage-toggle"
          @click="isEditMode = !isEditMode"
        />
      </div>

      <TagSearchAdd
        :tags="availableTags"
        :selected-tag-ids="taskTagIds"
        :edit-mode="isEditMode"
        @toggle="handleToggleTag"
        @edit="openEditDialog"
        @delete="openDeleteConfirm"
        @create="openCreateDialog"
        @quick-create="handleQuickCreate"
      />
    </div>

    <!-- Edit/Create Tag Dialog -->
    <TagEditDialog
      v-model:open="isEditDialogOpen"
      :tag="editingTag"
      :goal-id="goalId"
      @save="handleSaveTag"
      @delete="openDeleteConfirm"
    />

    <!-- Delete Confirmation Dialog -->
    <UModal
      v-model:open="isDeleteDialogOpen"
      :fullscreen="isMobile"
      :title="t('tags.deleteConfirm')"
      :ui="{ content: 'sm:max-w-sm' }"
    >
      <template #body>
        <div
          class="flex flex-col items-center text-center gap-3 py-2"
          data-testid="task-tags-manager-delete-dialog"
        >
          <div class="flex items-center justify-center size-14 rounded-full bg-error/10">
            <UIcon
              name="i-lucide-trash-2"
              class="size-7 text-error"
            />
          </div>
          <p class="text-sm text-muted max-w-xs">
            {{ t('tags.deleteMessage', { name: deletingTag?.name }) }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            block
            data-testid="task-tags-manager-delete-cancel"
            @click="isDeleteDialogOpen = false"
          />
          <UButton
            :label="t('common.delete')"
            color="error"
            block
            data-testid="task-tags-manager-delete-confirm"
            @click="confirmDeleteTag"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagsStore } from '@/stores/tag.store'
import { useTasksStore } from '@/stores/tasks.store'
import type { TagItem as TagItemType } from 'taskview-api'
import TagSearchAdd from './TagSearchAdd.vue'
import TagEditDialog from './TagEditDialog.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useProjectContext } from '@/composables/useProjectContext'
import { useTaskView } from '@/composables/useTaskView'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'

const props = defineProps<{
  taskId: number
  taskTagIds: number[]
  goalId: number
}>()

const { canEditTaskTags, canViewTaskTags } = useGoalPermissions()
const { isMobile } = useTaskView()
const { activatorUi } = useNuxtUiTaskItemStyles()
const { t } = useI18n()
const tagsStore = useTagsStore()
const tasksStore = useTasksStore()
const projectContext = useProjectContext()

onMounted(async () => {
  if (tagsStore.tags.length === 0) {
    await tagsStore.fetchAllTags()
  }
})

const isExpanded = ref(false)
const isEditMode = ref(false)
const isEditDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const editingTag = ref<TagItemType | null>(null)
const deletingTag = ref<TagItemType | null>(null)

const availableTags = computed(() =>
  projectContext ? projectContext.tags.value : tagsStore.filteredTags,
)

const selectedTags = computed(() =>
  availableTags.value.filter(tag => props.taskTagIds.includes(tag.id)),
)

const tagsRowRef = ref<HTMLElement | null>(null)
const visibleCount = ref(0)
const overflowCount = computed(() => Math.max(0, selectedTags.value.length - visibleCount.value))

async function measureVisibleTags() {
  const total = selectedTags.value.length
  if (total === 0) {
    visibleCount.value = 0
    return
  }
  visibleCount.value = total
  await nextTick()
  const row = tagsRowRef.value
  if (!row) return

  const available = row.clientWidth
  const gap = 4
  const widths = (Array.from(row.children) as HTMLElement[])
    .slice(0, total)
    .map(child => child.offsetWidth)

  const totalWidth = widths.reduce((sum, width, i) => sum + width + (i > 0 ? gap : 0), 0)
  if (totalWidth <= available) {
    visibleCount.value = total
    return
  }

  const reserve = 44
  let used = 0
  let fit = 0
  for (let i = 0; i < total; i++) {
    used += (i > 0 ? gap : 0) + widths[i]
    if (used <= available - reserve) fit++
    else break
  }
  visibleCount.value = Math.max(1, fit)
}

let resizeObserver: ResizeObserver | null = null

watch(selectedTags, () => measureVisibleTags())

onMounted(() => {
  resizeObserver = new ResizeObserver(() => measureVisibleTags())
  if (tagsRowRef.value) resizeObserver.observe(tagsRowRef.value)
  measureVisibleTags()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

async function handleToggleTag(tag: TagItemType) {
  await tasksStore.toggleTagForTask({
    taskId: props.taskId,
    tagId: tag.id,
  })
}

function openEditDialog(tag: TagItemType) {
  editingTag.value = tag
  isEditDialogOpen.value = true
}

function openCreateDialog() {
  editingTag.value = null
  isEditDialogOpen.value = true
}

function openDeleteConfirm(tag: TagItemType) {
  deletingTag.value = tag
  isDeleteDialogOpen.value = true
}

async function confirmDeleteTag() {
  if (deletingTag.value) {
    await tagsStore.deleteTag(deletingTag.value.id)
    deletingTag.value = null
    isDeleteDialogOpen.value = false
    isEditDialogOpen.value = false
  }
}

async function handleSaveTag(data: { id?: number; name: string; color: string; goalId: number }) {
  if (data.id) {
    await tagsStore.updateTag({
      id: data.id,
      name: data.name,
      color: data.color,
      goalId: data.goalId,
    })
  } else {
    const success = await tagsStore.addTag({
      name: data.name,
      color: data.color,
      goalId: data.goalId,
    })

    if (success) {
      const newTag = tagsStore.tags.find(
        tag => tag.name.toLowerCase() === data.name.toLowerCase(),
      )
      if (newTag) {
        await tasksStore.toggleTagForTask({
          taskId: props.taskId,
          tagId: newTag.id,
        })
      }
    }
  }
}

async function handleQuickCreate(data: { name: string; color: string }) {
  const success = await tagsStore.addTag({
    name: data.name,
    color: data.color,
    goalId: props.goalId,
  })

  if (success) {
    const newTag = tagsStore.tags.find(
      tag => tag.name.toLowerCase() === data.name.toLowerCase(),
    )
    if (newTag) {
      await tasksStore.toggleTagForTask({
        taskId: props.taskId,
        tagId: newTag.id,
      })
    }
  }
}
</script>

<template>
  <div class="shadow-sm rounded-lg p-2 dark:bg-tv-ui-bg-elevated">
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm text-muted">{{ t('tasks.tags') }}</label>
      <UButton
        :icon="isEditMode ? 'i-lucide-check' : 'i-lucide-settings'"
        :ui="{base: 'text-sm'}"
        :disabled="!canEditTaskTags"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="isEditMode = !isEditMode"
      >
        {{ isEditMode ? t('common.done') : t('tags.manageTags') }}
      </UButton>
    </div>

    <TagSearchAdd
      v-if="canViewTaskTags"
      :tags="availableTags"
      :selected-tag-ids="taskTagIds"
      :edit-mode="isEditMode"
      @toggle="handleToggleTag"
      @edit="openEditDialog"
      @delete="openDeleteConfirm"
      @create="openCreateDialog"
      @quick-create="handleQuickCreate"
    />

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
      :title="t('tags.deleteConfirm')"
    >
      <template #body>
        <p>{{ t('tags.deleteMessage', { name: deletingTag?.name }) }}</p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="isDeleteDialogOpen = false"
          />
          <UButton
            :label="t('common.delete')"
            color="error"
            variant="outline"
            @click="confirmDeleteTag"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagsStore } from '@/stores/tag.store'
import { useTasksStore } from '@/stores/tasks.store'
import type { TagItem as TagItemType } from 'taskview-api'
import TagSearchAdd from './TagSearchAdd.vue'
import TagEditDialog from './TagEditDialog.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useProjectContext } from '@/composables/useProjectContext'

const props = defineProps<{
  taskId: number
  taskTagIds: number[]
  goalId: number
}>()

const { canEditTaskTags, canViewTaskTags } = useGoalPermissions()
const { t } = useI18n()
const tagsStore = useTagsStore()
const tasksStore = useTasksStore()
const projectContext = useProjectContext()

onMounted(async () => {
  if (tagsStore.tags.length === 0) {
    await tagsStore.fetchAllTags()
  }
})

const isEditMode = ref(false)
const isEditDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const editingTag = ref<TagItemType | null>(null)
const deletingTag = ref<TagItemType | null>(null)

const availableTags = computed(() =>
  projectContext ? projectContext.tags.value : tagsStore.filteredTags,
)

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

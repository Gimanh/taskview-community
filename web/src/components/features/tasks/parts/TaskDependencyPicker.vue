<template>
  <UPopover
    v-model:open="open"
    class="w-full"
  >
    <UButton
      icon="i-lucide-plus"
      :label="t('tasks.dependencies.add')"
      color="neutral"
      variant="soft"
      size="sm"
      block
      class="text-muted"
      :ui="{ base: 'rounded-xl justify-start' }"
      data-testid="dependency-add"
    />
    <template #content>
      <div class="w-72 p-2 flex flex-col gap-2">
        <UInput
          v-model="query"
          :placeholder="t('tasks.dependencies.searchPlaceholder')"
          icon="i-lucide-search"
          variant="soft"
          size="sm"
          autofocus
          :loading="loading"
          data-testid="dependency-search"
        />
        <div class="max-h-64 overflow-y-auto flex flex-col gap-0.5">
          <button
            v-for="option in options"
            :key="option.id"
            type="button"
            class="flex items-center gap-2 w-full text-left rounded-10 px-2 py-1.5 hover:bg-muted/10 cursor-pointer"
            @click="pick(option)"
          >
            <UIcon
              :name="option.complete ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
              class="size-3.5 shrink-0"
              :class="option.complete ? 'text-success' : 'text-muted'"
            />
            <span
              class="text-sm truncate"
              :class="{ 'text-muted line-through': option.complete }"
            >
              {{ option.description }}
            </span>
          </button>
          <p
            v-if="!loading && options.length === 0"
            class="text-sm text-muted text-center py-3"
          >
            {{ t('tasks.dependencies.noResults') }}
          </p>
        </div>
        <UButton
          v-if="canAddTask && newTaskName"
          icon="i-lucide-plus"
          :label="t('tasks.dependencies.create', { name: newTaskName })"
          :loading="creating"
          color="primary"
          variant="ghost"
          size="sm"
          block
          class="justify-start"
          :ui="{ label: 'truncate' }"
          data-testid="dependency-create"
          @click="create"
        />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { ALL_TASKS_LIST_ID, type Task } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import type { DependencyTask } from './TaskDependencies.types'

const props = defineProps<{
  goalId: number
  excludedIds: number[]
}>()

const emit = defineEmits<{
  select: [task: DependencyTask]
  created: [task: Task]
}>()

const { t } = useI18n()
const toast = useToast()
const { canAddTask } = useGoalPermissions()

const open = ref(false)
const query = ref('')
const loading = ref(false)
const creating = ref(false)
const results = ref<DependencyTask[]>([])

const newTaskName = computed(() => query.value.trim())

const options = computed(() =>
  results.value.filter((task) => !props.excludedIds.includes(task.id)),
)

async function search() {
  loading.value = true
  const tasks = await $tvApi.tasks
    .fetch({
      goalId: props.goalId,
      componentId: ALL_TASKS_LIST_ID,
      page: 0,
      showCompleted: 0,
      ignoreCompleted: true,
      firstNew: 1,
      searchText: query.value.trim() || undefined,
    })
    .catch((err: unknown) => logError(err))
  results.value = tasks ?? []
  loading.value = false
}

const debouncedSearch = useDebounceFn(search, 300)

watch(query, () => debouncedSearch())

watch(open, (isOpen) => {
  if (isOpen) {
    query.value = ''
    results.value = []
    search()
  }
})

function pick(task: DependencyTask) {
  open.value = false
  emit('select', task)
}

async function create() {
  if (!newTaskName.value || creating.value) return
  creating.value = true
  const task = await $tvApi.tasks
    .createTask({ goalId: props.goalId, description: newTaskName.value })
    .catch((err: unknown) => logError(err))
  creating.value = false
  if (!task) {
    toast.add({ title: t('tasks.dependencies.createFailed'), color: 'error' })
    return
  }
  emit('created', task)
  pick({ id: task.id, description: task.description, complete: task.complete })
}
</script>

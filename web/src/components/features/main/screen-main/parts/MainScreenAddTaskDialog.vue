<template>
  <UModal 
    v-model:open="model" 
    :fullscreen="isMobile"
    
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="close"
        />
      </div>
    </template>
        
    <template #body>
      <UCard>
        <div class="flex flex-col gap-4">
          <UFormField :label="t('tasks.description')">
            <UInput
              v-model="taskDescription"
              :placeholder="t('tasks.addPlaceholder')"
              class="w-full"
              @keyup.enter="addTask"
            />
          </UFormField>

          <UFormField :label="t('projects.project')">
            <USelectMenu
              v-model="selectedGoalId"
              :items="goalOptions"
              :placeholder="t('projects.selectProject')"
              :search-input="false"
              size="xl"
              value-key="value"
              option-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="!noDates"
            :label="t('tasks.deadline')"
          >
            <UPopover>
              <UButton
                :label="formattedDeadline || t('tasks.addDueDate')"
                icon="i-lucide-calendar"
                color="neutral"
                variant="outline"
                class="w-full justify-start"
                :ui="{leadingIcon: 'size-4.5'}"
              />
              <template #content>
                <UCalendar
                  v-model="(deadline as any)"
                  class="p-2"
                />
              </template>
            </UPopover>
          </UFormField>
        </div>
      </UCard>
    </template>

    <template #default="slotProps">
      <slot
        name="activator"
        v-bind="slotProps"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="outline"
          @click="close"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :disabled="!canAdd"
          :loading="loading"
          variant="outline"
          @click="addTask"
        >
          {{ t('tasks.add') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate } from '@internationalized/date'
import { useGoalsStore } from '@/stores/goals.store'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { $ls, $tvApi } from '@/plugins/axios'
import { useTaskView } from '@/composables/useTaskView'

const LAST_SELECTED_PROJECT_KEY = 'lastSelectedProjectId'

const props = withDefaults(defineProps<{
  title?: string
  disabled?: boolean
  upcomingTask?: boolean
  noDates?: boolean
  taskName?: string
}>(), {
  title: '',
  disabled: false,
  upcomingTask: false,
  noDates: false,
  taskName: '',
})

const emit = defineEmits<{
  added: []
  close: []
}>()

const model = defineModel<boolean>({ default: false })

const { t } = useI18n()
const goalsStore = useGoalsStore()
const baseScreenStore = useBaseScreenStore()
const { isMobile } = useTaskView()

const taskDescription = ref(props.taskName)
const selectedGoalId = ref<number | undefined>(undefined)
const deadline = ref<CalendarDate | null>(null)
const loading = ref(false)
const lastSavedProjectId = ref<number | undefined>(undefined)

onMounted(async () => {
  const saved = await $ls.getValue(LAST_SELECTED_PROJECT_KEY)
  if (saved) {
    lastSavedProjectId.value = Number(saved)
  }
})

watch(() => props.taskName, (newVal) => {
  taskDescription.value = newVal
})

watch(model, async (isOpen) => {
  if (isOpen) {
    // Set default deadline based on widget type
    if (!props.noDates) {
      const today = new Date()
      if (props.upcomingTask) {
        today.setDate(today.getDate() + 1)
      }
      deadline.value = new CalendarDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      )
    }

    // Set default goal from localStorage or first available
    const activeGoals = goalsStore.goals.filter(g => !g.archive)

    if (lastSavedProjectId.value) {
      const savedGoal = activeGoals.find(g => g.id === lastSavedProjectId.value)
      if (savedGoal) {
        selectedGoalId.value = savedGoal.id
      } else if (activeGoals.length === 1) {
        selectedGoalId.value = activeGoals[0].id
      }
    } else if (activeGoals.length === 1) {
      selectedGoalId.value = activeGoals[0].id
    }
  } else {
    // Reset form on close
    taskDescription.value = props.taskName
    selectedGoalId.value = undefined
    deadline.value = null
  }
})

const goalOptions = computed(() =>
  goalsStore.goals
    .filter(g => !g.archive)
    .map(g => ({
      label: g.name,
      value: g.id,
    })),
)

const formattedDeadline = computed(() => {
  if (!deadline.value) return ''
  return `${deadline.value.day}.${String(deadline.value.month).padStart(2, '0')}.${deadline.value.year}`
})

const canAdd = computed(() =>
  taskDescription.value.trim() && selectedGoalId.value !== undefined,
)

async function addTask() {
  if (!canAdd.value || !selectedGoalId.value) return

  loading.value = true

  try {
    // Save selected project to localStorage
    await $ls.setValue(LAST_SELECTED_PROJECT_KEY, selectedGoalId.value.toString())
    lastSavedProjectId.value = selectedGoalId.value

    const endDate = deadline.value
      ? `${deadline.value.year}-${String(deadline.value.month).padStart(2, '0')}-${String(deadline.value.day).padStart(2, '0')}`
      : null

    const task = await $tvApi.tasks.createTask({
      description: taskDescription.value.trim(),
      goalId: selectedGoalId.value,
      goalListId: null,
      endDate,
    })

    if (task) {
      // Add task to appropriate list based on deadline
      if (props.noDates) {
        baseScreenStore.tasks.unshift(task)
      } else if (props.upcomingTask) {
        baseScreenStore.tasksUpcoming.unshift(task)
      } else {
        baseScreenStore.tasksToday.unshift(task)
      }

      emit('added')
      close()
    }
  }
  finally {
    loading.value = false
  }
}

function close() {
  model.value = false
  emit('close')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: 'lg:max-w-3xl' }"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ t('sprints.review.title') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <div class="flex flex-col gap-3">
          <p class="text-sm text-muted">
            {{ t('sprints.review.hint') }}
          </p>

          <UAlert
            icon="i-lucide-triangle-alert"
            color="warning"
            variant="subtle"
            :title="t('sprints.review.warningTitle')"
            :description="t('sprints.review.warning')"
          />

          <p
            v-if="!tasks.length"
            class="py-4 text-center text-sm text-dimmed"
          >
            {{ t('sprints.review.noTasks') }}
          </p>

          <div
            v-else
            class="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1"
          >
            <div
              v-for="task in tasks"
              :key="task.id"
              class="flex flex-col gap-2 rounded-lg border border-default p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="font-medium">{{ task.description }}</span>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="shrink-0"
                >
                  {{ formatPoints(toNumber(task.estimateValue)) }} {{ unitLabel(unit, true) }}
                </UBadge>
              </div>
              <div
                v-if="task.complete"
                class="flex items-center gap-1.5 text-sm text-success"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-4"
                />
                {{ t('sprints.outcomes.accepted') }}
              </div>
              <div
                v-else
                class="flex flex-col gap-2"
              >
                <URadioGroup
                  v-model="outcomes[task.id]"
                  :items="incompleteOutcomeItems"
                  orientation="horizontal"
                  size="sm"
                />
                <div
                  v-if="outcomes[task.id] === 'carried-over'"
                  class="mt-1 flex flex-col gap-1"
                >
                  <span class="text-xs text-muted">{{ t('sprints.review.carryTo') }}</span>
                  <USelectMenu
                    v-model="carryTargets[task.id]"
                    :items="carryTargetItems"
                    value-key="value"
                    size="sm"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <USeparator />

          <UCheckbox
            v-model="goalAchieved"
            :label="t('sprints.review.goalAchieved')"
          />
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="t('sprints.actions.close')"
              color="primary"
              :loading="loading"
              @click="confirmOpen = true"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <UModal
    v-model:open="confirmOpen"
    :fullscreen="isMobile"
  >
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('sprints.review.confirmTitle') }}
          </h3>
        </template>

        <p class="text-sm text-muted">
          {{ t('sprints.review.confirmMessage') }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="t('common.no')"
              color="neutral"
              variant="ghost"
              @click="confirmOpen = false"
            />
            <UButton
              :label="t('common.yes')"
              color="primary"
              :loading="loading"
              @click="performClose"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint, SprintOutcome, SprintTaskOutcomeInput } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintsStore } from '@/stores/sprints.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useSprintFormat } from '../composables/useSprintFormat'
import type { SprintTask } from '@/types/sprints.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  sprint: Sprint
  tasks: SprintTask[]
}>()

const emit = defineEmits<{
  closed: [sprint: Sprint]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const toast = useToast()
const sprintsStore = useSprintsStore()
const goalsStore = useGoalsStore()
const { formatPoints, toNumber, unitLabel } = useSprintFormat()

const unit = computed(() => goalsStore.goalMap.get(props.sprint.goalId)?.estimateUnit ?? 'points')

const loading = ref(false)
const confirmOpen = ref(false)
const goalAchieved = ref(false)
const outcomes = ref<Record<number, SprintOutcome>>({})
// Target sprint per carried-over task. The BACKLOG sentinel (0) means "no sprint"
// (sprintId becomes null); any positive value is the destination sprint id.
const BACKLOG = 0
const carryTargets = ref<Record<number, number>>({})

// Accepted ⇔ task is done. For unfinished tasks the only meaningful choices are
// carry over (continue in another sprint) or drop (won't do). Completed tasks are
// fixed as accepted — carrying over / dropping already-done work skews velocity.
const incompleteOutcomeItems = [
  { value: 'carried-over', label: t('sprints.outcomes.carriedOver') },
  { value: 'dropped', label: t('sprints.outcomes.dropped') },
]

// Sprints a task can be carried into: any sprint of this project that isn't the one
// being closed and isn't already completed, ordered by start date (soonest first).
const carryCandidates = computed(() =>
  sprintsStore.sprints
    .filter((s) => s.id !== props.sprint.id && s.status !== 'completed')
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id),
)

// Default destination: the soonest candidate, or backlog when there is none.
const nearestTarget = computed(() => carryCandidates.value[0]?.id ?? BACKLOG)

const carryTargetItems = computed(() => [
  { value: BACKLOG, label: t('sprints.review.backlogOption') },
  ...carryCandidates.value.map((s) => ({ value: s.id, label: s.name })),
])

watch(open, (value) => {
  if (value) {
    goalAchieved.value = false
    outcomes.value = Object.fromEntries(
      props.tasks.map((task) => [task.id, task.complete ? 'accepted' : 'carried-over']),
    )
    carryTargets.value = Object.fromEntries(
      props.tasks.filter((task) => !task.complete).map((task) => [task.id, nearestTarget.value]),
    )
  }
})

async function performClose() {
  loading.value = true
  try {
    // Lifecycle is active -> review -> completed. If review hasn't been started
    // yet (sprint still active), move it into review first, then close.
    if (props.sprint.status === 'active') {
      const review = await sprintsStore.startReview(props.sprint.id)
      if (!review) {
        toast.add({ title: t('sprints.toasts.closeFailed'), color: 'error' })
        return
      }
    }

    const payload: SprintTaskOutcomeInput[] = props.tasks
      .filter((task) => outcomes.value[task.id])
      .map((task) => {
        const outcome = outcomes.value[task.id]
        if (outcome !== 'carried-over') {
          return { taskId: task.id, outcome }
        }
        const target = carryTargets.value[task.id] ?? BACKLOG
        return { taskId: task.id, outcome, carriedOverTo: target === BACKLOG ? null : target }
      })

    const sprint = await sprintsStore.closeSprint({
      sprintId: props.sprint.id,
      outcomes: payload,
      goalAchieved: goalAchieved.value,
    })

    if (sprint) {
      toast.add({ title: t('sprints.toasts.closed'), color: 'success' })
      emit('closed', sprint)
      open.value = false
    }
  } finally {
    loading.value = false
    // The confirm step is consumed either way: on success both dialogs close,
    // on failure the toast is shown and the user stays in the review dialog.
    confirmOpen.value = false
  }
}
</script>

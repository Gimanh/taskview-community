<template>
  <UDashboardPanel id="sprints">
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('sprints.title')}`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <UButton
            v-if="canManage"
            icon="i-lucide-repeat"
            :label="t('sprints.cadence.button')"
            color="neutral"
            variant="ghost"
            @click="cadenceOpen = true"
          />
          <UButton
            v-if="canManage"
            icon="i-lucide-plus"
            :label="t('sprints.create')"
            @click="openCreate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="!canView"
        class="flex flex-col items-center gap-2 py-16 text-center"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-8 text-dimmed"
        />
        <p class="text-muted">
          {{ t('sprints.noPermission') }}
        </p>
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          class="w-full"
        />

        <div
          v-if="loading"
          class="flex justify-center py-10"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>

        <template v-else-if="activeTab === 'active'">
          <div
            v-if="activeSprint"
            class="flex flex-col gap-4"
          >
            <SprintHeader
              :sprint="activeSprint"
              :tasks="activeSprintTasks"
            >
              <template #actions>
                <UButton
                  v-if="canAssign"
                  icon="i-lucide-list-plus"
                  :label="t('sprints.actions.plan')"
                  size="sm"
                  variant="soft"
                  @click="planningOpen = true"
                />
                <UDropdownMenu
                  v-if="canManage"
                  :items="activeSprintMenu"
                >
                  <UButton
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                  />
                </UDropdownMenu>
              </template>
            </SprintHeader>

            <SprintBurndownChart
              v-if="canViewAnalytics"
              :burndown="burndown"
              :unit="estimateUnit"
            />
            <SprintTaskList
              :tasks="activeSprintTasks"
              :user-map="userMap"
              :unit="estimateUnit"
            />
          </div>
          <p
            v-else
            class="py-12 text-center text-muted"
          >
            {{ t('sprints.noActive') }}
          </p>
        </template>

        <template v-else>
          <p
            v-if="!visibleSprints.length"
            class="py-12 text-center text-muted"
          >
            {{ t('sprints.empty') }}
          </p>
          <UCard
            v-for="sprint in visibleSprints"
            :key="sprint.id"
            class="cursor-pointer hover:bg-elevated/50"
            @click="selectSprint(sprint)"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ sprint.name }}</span>
                <UBadge
                  :color="statusColor(sprint.status)"
                  variant="subtle"
                  size="sm"
                >
                  {{ t(`sprints.status.${sprint.status}`) }}
                </UBadge>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-dimmed">{{ formatRange(sprint) }}</span>
                <template v-if="canManage && (sprint.status === 'draft' || sprint.status === 'planned')">
                  <UButton
                    icon="i-lucide-play"
                    :label="t('sprints.actions.activate')"
                    size="xs"
                    @click.stop="activate(sprint)"
                  />
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click.stop="openEdit(sprint)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :loading="deletingId === sprint.id"
                    @click.stop="remove(sprint)"
                  />
                </template>
              </div>
            </div>
          </UCard>
        </template>

        <template v-if="activeTab === 'completed' && currentSprint">
          <SprintRetroPanel
            :sprint-id="currentSprint.id"
            :retro="currentSprint.retro"
            :can-manage="canManage"
          />
          <SprintVelocityChart
            v-if="canViewAnalytics"
            :points="velocity"
            :unit="estimateUnit"
          />
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <SprintFormDialog
    v-if="canManage"
    v-model:open="formOpen"
    :goal-id="projectId"
    :sprint="editSprint"
    @saved="onSaved"
  />

  <SprintReviewDialog
    v-if="canManage && activeSprint"
    v-model:open="reviewOpen"
    :sprint="activeSprint"
    :tasks="activeSprintTasks"
    @closed="onClosed"
  />

  <SprintPlanningDialog
    v-if="canAssign && activeSprint"
    v-model:open="planningOpen"
    :sprint="activeSprint"
    @changed="reloadTasks"
  />

  <SprintCadenceDialog
    v-if="canManage"
    v-model:open="cadenceOpen"
    :goal-id="projectId"
    @saved="loadAll"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useDateFormat } from '@vueuse/core'
import type { Sprint } from 'taskview-api'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import SprintHeader from '@/components/features/sprints/parts/SprintHeader.vue'
import SprintTaskList from '@/components/features/sprints/parts/SprintTaskList.vue'
import SprintBurndownChart from '@/components/features/sprints/parts/SprintBurndownChart.vue'
import SprintVelocityChart from '@/components/features/sprints/parts/SprintVelocityChart.vue'
import SprintRetroPanel from '@/components/features/sprints/parts/SprintRetroPanel.vue'
import SprintFormDialog from '@/components/features/sprints/parts/SprintFormDialog.vue'
import SprintReviewDialog from '@/components/features/sprints/parts/SprintReviewDialog.vue'
import SprintPlanningDialog from '@/components/features/sprints/parts/SprintPlanningDialog.vue'
import SprintCadenceDialog from '@/components/features/sprints/parts/SprintCadenceDialog.vue'
import { useSprintFormat } from '@/components/features/sprints/composables/useSprintFormat'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalsStore } from '@/stores/goals.store'
import { useSprintsStore } from '@/stores/sprints.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import type { SprintTask } from '@/types/sprints.types'

type SprintTab = 'active' | 'planned' | 'backlog' | 'completed'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const sprintsStore = useSprintsStore()
const collaborationStore = useCollaborationStore()
const { statusColor } = useSprintFormat()

const { activeSprint, currentSprint, velocity, loading } = storeToRefs(sprintsStore)
const { userMap } = storeToRefs(collaborationStore)

useProjectDataLoader(projectId)

const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')
const goal = computed(() => goalsStore.goalMap.get(projectId.value) ?? null)
const estimateUnit = computed(() => goalsStore.goalMap.get(projectId.value)?.estimateUnit ?? 'points')

const {
  canViewSprints: canView,
  canManageSprints: canManage,
  canAssignSprintTasks: canAssign,
  canViewSprintAnalytics: canViewAnalytics,
} = useGoalPermissionsFor(goal)

const activeTab = ref<SprintTab>('active')
const tabItems = computed(() => [
  { value: 'active', label: t('sprints.tabs.active') },
  { value: 'planned', label: t('sprints.tabs.planned') },
  { value: 'backlog', label: t('sprints.tabs.backlog') },
  { value: 'completed', label: t('sprints.tabs.completed') },
])

const allTasks = ref<SprintTask[]>([])
const formOpen = ref(false)
const editSprint = ref<Sprint | null>(null)
const reviewOpen = ref(false)
const planningOpen = ref(false)
const cadenceOpen = ref(false)
const burndown = computed(() => (activeSprint.value ? sprintsStore.burndownById[activeSprint.value.id] ?? null : null))

const visibleSprints = computed(() => {
  const status = activeTab.value === 'backlog' ? 'draft' : activeTab.value
  return sprintsStore.sprints.filter((s) => s.status === status)
})

const activeSprintTasks = computed(() =>
  activeSprint.value ? allTasks.value.filter((task) => task.sprintId === activeSprint.value?.id) : [],
)

const activeSprintMenu = computed(() => {
  if (!activeSprint.value) return []
  const sprint = activeSprint.value
  const items = []
  if (sprint.status === 'active') {
    items.push({
      label: t('sprints.actions.startReview'),
      icon: 'i-lucide-clipboard-check',
      onSelect: () => { reviewOpen.value = true },
    })
    items.push(
      sprint.pausedAt
        ? { label: t('sprints.actions.resume'), icon: 'i-lucide-play', onSelect: () => sprintsStore.resumeSprint(sprint.id) }
        : { label: t('sprints.actions.pause'), icon: 'i-lucide-pause', onSelect: () => sprintsStore.pauseSprint(sprint.id) },
    )
  }
  if (sprint.status === 'review') {
    items.push({
      label: t('sprints.actions.close'),
      icon: 'i-lucide-flag',
      onSelect: () => { reviewOpen.value = true },
    })
  }
  items.push({ label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(sprint) })
  return items
})

function formatRange(sprint: Sprint): string {
  const start = useDateFormat(new Date(sprint.startDate), 'DD MMM').value
  const end = useDateFormat(new Date(sprint.endDate), 'DD MMM YYYY').value
  return `${start} – ${end}`
}

function openCreate() {
  editSprint.value = null
  formOpen.value = true
}

function openEdit(sprint: Sprint) {
  editSprint.value = sprint
  formOpen.value = true
}

function selectSprint(sprint: Sprint) {
  sprintsStore.fetchSprint(sprint.id)
}

async function activate(sprint: Sprint) {
  const result = await sprintsStore.activateSprint(sprint.id)
  if (!result) return
  activeTab.value = 'active'
  await loadAll()
}

const deletingId = ref<number | null>(null)
async function remove(sprint: Sprint) {
  if (!window.confirm(t('sprints.deleteConfirm', { name: sprint.name }))) return
  deletingId.value = sprint.id
  const ok = await sprintsStore.removeSprint(sprint.id).finally(() => {
    deletingId.value = null
  })
  if (ok) await loadAll()
}

async function reloadTasks() {
  if (projectId.value <= 0) return
  const tasks = await $tvApi.tasks
    .fetch({
      goalId: projectId.value,
      componentId: -1401,
      page: 0,
      // ignoreCompleted skips the complete-filter entirely so we get BOTH
      // incomplete (backlog) AND completed (in-sprint / burndown) tasks.
      // (showCompleted: 1 alone would return ONLY completed tasks.)
      showCompleted: 1,
      ignoreCompleted: true,
      firstNew: 1,
      unlimited: true,
    })
    .catch(logError)
  if (tasks) allTasks.value = tasks as SprintTask[]
}

async function loadAll() {
  if (projectId.value <= 0 || !canView.value) return
  await Promise.all([
    sprintsStore.fetchSprintsForGoal({ goalId: projectId.value }),
    reloadTasks(),
  ])
  if (canViewAnalytics.value && activeSprint.value) {
    await sprintsStore.fetchBurndown(activeSprint.value.id)
  }
  if (canViewAnalytics.value) {
    await sprintsStore.fetchVelocity({ goalId: projectId.value, lastN: 6 })
  }
}

function onSaved() {
  loadAll()
}

function onClosed() {
  loadAll()
}

watch([projectId, canView], () => loadAll(), { immediate: true })

watch(activeSprint, (sprint) => {
  if (sprint && canViewAnalytics.value) sprintsStore.fetchBurndown(sprint.id)
})
</script>

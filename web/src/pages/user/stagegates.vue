<template>
  <UDashboardPanel id="stagegates">
    <template #header>
      <UDashboardNavbar :title="`${projectName} - Stagegates & Approval Cycles`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="New Stagegate Phase"
              icon="i-lucide-plus"
              color="primary"
              @click="openCreateModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <!-- Banner Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-1">
            <span class="text-xs text-muted uppercase font-semibold">Total Phases</span>
            <div class="text-2xl font-bold text-default">{{ stagegates.length }}</div>
            <span class="text-xs text-muted">Sequential project phase-gates</span>
          </div>
          <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-1">
            <span class="text-xs text-muted uppercase font-semibold">Approved Gates</span>
            <div class="text-2xl font-bold text-emerald-500">{{ approvedGatesCount }}</div>
            <span class="text-xs text-muted">Passed gate approval sign-off</span>
          </div>
          <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-1">
            <span class="text-xs text-muted uppercase font-semibold">Awaiting Review</span>
            <div class="text-2xl font-bold text-amber-500">{{ reviewGatesCount }}</div>
            <span class="text-xs text-muted">Pending approval decision</span>
          </div>
          <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-1">
            <span class="text-xs text-muted uppercase font-semibold">Overall Gate Progress</span>
            <div class="text-2xl font-bold text-primary">{{ overallProgress }}%</div>
            <div class="w-full bg-default/20 rounded-full h-1.5 mt-1 overflow-hidden">
              <div class="bg-primary h-full transition-all duration-300" :style="{ width: `${overallProgress}%` }" />
            </div>
          </div>
        </div>

        <!-- Stagegates Pipeline Stepper -->
        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-default flex items-center gap-2">
            <UIcon name="i-lucide-git-merge" class="size-5 text-primary" />
            Phase-Gate Governance Pipeline
          </h2>

          <div v-if="loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
          </div>

          <div v-else-if="stagegates.length === 0" class="p-12 text-center rounded-xl border border-dashed border-default bg-elevated/20 flex flex-col items-center gap-3">
            <UIcon name="i-lucide-shield-alert" class="size-12 text-muted" />
            <div class="text-base font-medium">No stagegates configured for this project</div>
            <p class="text-sm text-muted max-w-md">Initialize the phase-gate approval cycle to enforce governance, track deliverables, and manage approvals between project stages.</p>
            <UButton label="Initialize Standard Stagegates" icon="i-lucide-sparkles" color="primary" @click="initializeDefaultGates" />
          </div>

          <!-- Pipeline Flow Cards -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div
              v-for="(gate, idx) in stagegates"
              :key="gate.id"
              class="relative rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col gap-3"
              :class="selectedGate?.id === gate.id ? 'border-primary ring-2 ring-primary/20 bg-elevated/80 shadow-md' : 'border-default bg-elevated/30 hover:border-default hover:bg-elevated/50'"
              @click="selectedGate = gate"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getPhaseBadgeClass(gate.status)">
                  Gate {{ idx + 1 }}: {{ gate.status.replace(/_/g, ' ').toUpperCase() }}
                </span>
                <span v-if="gate.gateDate" class="text-xs text-muted flex items-center gap-1">
                  <UIcon name="i-lucide-calendar" class="size-3.5" />
                  {{ formatDate(gate.gateDate) }}
                </span>
              </div>

              <div>
                <h3 class="font-semibold text-default text-base leading-tight">{{ gate.name }}</h3>
                <p class="text-xs text-muted line-clamp-2 mt-1">{{ gate.description || 'No description provided' }}</p>
              </div>

              <!-- Progress bar -->
              <div class="flex flex-col gap-1 mt-auto pt-2 border-t border-default/50">
                <div class="flex justify-between text-xs text-muted">
                  <span>Task Deliverables</span>
                  <span class="font-medium text-default">{{ gate.progress?.progressPercent || 0 }}%</span>
                </div>
                <div class="w-full bg-default/20 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-primary h-full transition-all duration-300" :style="{ width: `${gate.progress?.progressPercent || 0}%` }" />
                </div>
                <div class="flex justify-between items-center text-[11px] text-muted mt-1">
                  <span>{{ gate.progress?.completedTasks || 0 }} / {{ gate.progress?.totalTasks || 0 }} tasks</span>
                  <span v-if="gate.progress?.mandatoryCriteriaTotal" class="font-medium" :class="gate.progress.mandatoryCriteriaMet === gate.progress.mandatoryCriteriaTotal ? 'text-emerald-500' : 'text-amber-500'">
                    {{ gate.progress.mandatoryCriteriaMet }}/{{ gate.progress.mandatoryCriteriaTotal }} exit criteria
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Gate Detail & Governance Section -->
        <div v-if="selectedGate" class="flex flex-col gap-6 p-6 rounded-2xl border border-default bg-elevated/20">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-default">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-default">{{ selectedGate.name }}</h3>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full" :class="getPhaseBadgeClass(selectedGate.status)">
                  {{ selectedGate.status.replace(/_/g, ' ').toUpperCase() }}
                </span>
              </div>
              <p class="text-sm text-muted mt-1">{{ selectedGate.description }}</p>
            </div>

            <!-- Action Buttons for Approval Cycle -->
            <div class="flex items-center gap-2">
              <UButton
                v-if="selectedGate.status === 'not_started' || selectedGate.status === 'in_progress' || selectedGate.status === 'rejected'"
                label="Submit for Gate Review"
                icon="i-lucide-send"
                color="primary"
                @click="submitForReview(selectedGate.id)"
              />
              <UButton
                v-if="selectedGate.status === 'ready_for_review'"
                label="Review & Decide Approval"
                icon="i-lucide-check-circle"
                color="warning"
                @click="openApprovalModal = true"
              />
              <UButton
                label="Delete Phase"
                icon="i-lucide-trash"
                color="neutral"
                variant="ghost"
                @click="deleteGate(selectedGate.id)"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left 2 Cols: Exit Criteria & Deliverables -->
            <div class="lg:col-span-2 flex flex-col gap-6">
              <!-- Exit Criteria Checklist -->
              <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-semibold text-default flex items-center gap-2">
                    <UIcon name="i-lucide-clipboard-check" class="size-4 text-primary" />
                    Stagegate Exit Criteria Checklist
                  </h4>
                  <UButton label="Add Criterion" icon="i-lucide-plus" size="xs" variant="soft" color="neutral" @click="addCriterion" />
                </div>

                <div v-if="!selectedGate.exitCriteria?.length" class="text-sm text-muted py-2">
                  No criteria defined. Add mandatory checklist items required to pass this stagegate.
                </div>

                <div v-else class="flex flex-col gap-2">
                  <div
                    v-for="(crit, cIdx) in selectedGate.exitCriteria"
                    :key="crit.id || cIdx"
                    class="flex items-center justify-between p-2.5 rounded-lg border border-default bg-background/50"
                  >
                    <div class="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        :checked="crit.completed"
                        class="size-4 rounded text-primary focus:ring-primary"
                        @change="toggleCriterion(cIdx)"
                      />
                      <span :class="crit.completed ? 'line-through text-muted text-sm' : 'text-sm text-default font-medium'">
                        {{ crit.title }}
                      </span>
                    </div>
                    <span v-if="crit.required" class="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                      Mandatory
                    </span>
                  </div>
                </div>
              </div>

              <!-- Rejection Reason if any -->
              <div v-if="selectedGate.rejectionReason" class="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex flex-col gap-1">
                <span class="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                  <UIcon name="i-lucide-alert-triangle" class="size-4" />
                  Gate Rejected Feedback
                </span>
                <p class="text-sm text-red-400 mt-1">{{ selectedGate.rejectionReason }}</p>
              </div>

              <!-- Assign Task to Gate -->
              <div class="p-4 rounded-xl border border-default bg-elevated/40 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-semibold text-default flex items-center gap-2">
                    <UIcon name="i-lucide-layers" class="size-4 text-primary" />
                    Phase Task Deliverables
                  </h4>
                  <UButton label="Link Existing Task" icon="i-lucide-link" size="xs" variant="soft" color="neutral" @click="openLinkTaskModal = true" />
                </div>
                <div class="text-sm text-muted">
                  Tasks linked to this stagegate contribute dynamically to the gate's completion progress and exit criteria.
                </div>
              </div>
            </div>

            <!-- Right Col: Approval Cycle Audit Trail -->
            <div class="flex flex-col gap-4 p-4 rounded-xl border border-default bg-elevated/40">
              <h4 class="font-semibold text-default flex items-center gap-2">
                <UIcon name="i-lucide-history" class="size-4 text-primary" />
                Approval Sign-off Audit Trail
              </h4>

              <div v-if="!selectedGate.approvals?.length" class="text-sm text-muted py-4 text-center">
                No approval records yet. When submitted for review, stakeholder approvals are recorded here.
              </div>

              <div v-else class="flex flex-col gap-3">
                <div
                  v-for="appr in selectedGate.approvals"
                  :key="appr.id"
                  class="p-3 rounded-lg border border-default bg-background/50 flex flex-col gap-1"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="appr.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">
                      {{ appr.status.toUpperCase() }}
                    </span>
                    <span class="text-[11px] text-muted">{{ formatDate(appr.decidedAt || appr.createdDate) }}</span>
                  </div>
                  <p v-if="appr.comments" class="text-xs text-default mt-1 italic">"{{ appr.comments }}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Gate Modal -->
        <UModal v-model:open="openCreateModal" title="Create Stagegate Phase">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Phase Name</label>
                <UInput v-model="newGate.name" placeholder="e.g., Phase 2: Architecture & Detailed Planning" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Phase Objective & Exit Scope</label>
                <UTextarea v-model="newGate.description" placeholder="Specify deliverables required to pass this gate..." class="w-full mt-1" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Phase Order Index</label>
                  <UInput v-model.number="newGate.orderIndex" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Target Gate Review Date</label>
                  <UInput v-model="newGate.gateDate" type="date" class="w-full mt-1" />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openCreateModal = false" />
              <UButton label="Create Phase" color="primary" @click="createGate" />
            </div>
          </template>
        </UModal>

        <!-- Approval Decision Modal -->
        <UModal v-model:open="openApprovalModal" title="Stagegate Approval Decision">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <p class="text-sm text-default">
                You are reviewing phase <strong>{{ selectedGate?.name }}</strong>. Verify that all mandatory exit criteria, deliverables, and architecture sign-offs have been satisfied.
              </p>
              <div>
                <label class="text-xs font-medium text-muted">Decision</label>
                <div class="flex gap-4 mt-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="approved" v-model="approvalDecision" class="text-emerald-500" />
                    <span class="text-sm font-semibold text-emerald-500">Approve Gate</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="rejected" v-model="approvalDecision" class="text-red-500" />
                    <span class="text-sm font-semibold text-red-500">Reject / Request Rework</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Sign-off Comments / Justification</label>
                <UTextarea v-model="approvalComments" placeholder="Enter review notes, feedback, or approval authorization..." class="w-full mt-1" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openApprovalModal = false" />
              <UButton label="Confirm Decision" :color="approvalDecision === 'approved' ? 'primary' : 'error'" @click="decideApproval" />
            </div>
          </template>
        </UModal>

        <!-- Link Task Modal -->
        <UModal v-model:open="openLinkTaskModal" title="Link Task to Phase">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Task ID</label>
                <UInput v-model.number="taskIdToLink" type="number" placeholder="Enter task ID" class="w-full mt-1" />
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="isMandatoryTask" class="size-4 rounded text-primary" />
                <span class="text-sm text-default font-medium">Mark as Mandatory Exit Criterion</span>
              </label>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openLinkTaskModal = false" />
              <UButton label="Link Task" color="primary" @click="linkTask" />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import $api from '@/helpers/axios'
import { useGoalsStore } from '@/stores/goals.store'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'

const route = useRoute()
const goalsStore = useGoalsStore()

const projectId = computed(() => Number(route.params.projectId))
const currentProject = computed(() => goalsStore.goals.find(g => g.id === projectId.value))
const projectName = computed(() => currentProject.value?.name || 'Project')

const stagegates = ref<any[]>([])
const selectedGate = ref<any | null>(null)
const loading = ref(false)

const openCreateModal = ref(false)
const openApprovalModal = ref(false)
const openLinkTaskModal = ref(false)

const newGate = ref({
  name: '',
  description: '',
  orderIndex: 1,
  gateDate: '',
})

const approvalDecision = ref<'approved' | 'rejected'>('approved')
const approvalComments = ref('')
const taskIdToLink = ref<number | null>(null)
const isMandatoryTask = ref(false)

const approvedGatesCount = computed(() => stagegates.value.filter(g => g.status === 'approved').length)
const reviewGatesCount = computed(() => stagegates.value.filter(g => g.status === 'ready_for_review').length)
const overallProgress = computed(() => {
  if (!stagegates.value.length) return 0
  const sum = stagegates.value.reduce((acc, g) => acc + (g.progress?.progressPercent || (g.status === 'approved' ? 100 : 0)), 0)
  return Math.round(sum / stagegates.value.length)
})

function getPhaseBadgeClass(status: string) {
  switch (status) {
    case 'approved': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
    case 'ready_for_review': return 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
    case 'in_progress': return 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
    case 'rejected': return 'bg-red-500/10 text-red-500 border border-red-500/30'
    default: return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30'
  }
}

function formatDate(val: any) {
  if (!val) return ''
  return new Date(val).toLocaleDateString()
}

async function loadStagegates() {
  loading.value = true
  try {
    const res = await $api.get(`/module/stagegates/goal/${projectId.value}`)
    stagegates.value = res.data?.response || []
    if (stagegates.value.length && (!selectedGate.value || !stagegates.value.some(g => g.id === selectedGate.value.id))) {
      selectedGate.value = stagegates.value[0]
    }
  } catch (err) {
    console.error('Failed to load stagegates:', err)
  } finally {
    loading.value = false
  }
}

async function createGate() {
  if (!newGate.value.name) return
  try {
    await $api.post('/module/stagegates', {
      goalId: projectId.value,
      name: newGate.value.name,
      description: newGate.value.description,
      orderIndex: newGate.value.orderIndex,
      gateDate: newGate.value.gateDate || undefined,
    })
    openCreateModal.value = false
    newGate.value = { name: '', description: '', orderIndex: stagegates.value.length + 1, gateDate: '' }
    await loadStagegates()
  } catch (err) {
    console.error('Failed to create stagegate:', err)
  }
}

async function initializeDefaultGates() {
  const defaults = [
    { name: 'Phase 1: Project Charter & Feasibility', orderIndex: 1, description: 'Scope alignment, business case, and stakeholder charter sign-off.' },
    { name: 'Phase 2: Detailed Planning & Architecture', orderIndex: 2, description: 'WBS definition, architecture review, and budget baseline approval.' },
    { name: 'Phase 3: Execution, Build & Testing', orderIndex: 3, description: 'Core deliverable development, testing, and acceptance verification.' },
    { name: 'Phase 4: Launch & Handover', orderIndex: 4, description: 'Production rollout, training, and operational handover.' },
  ]
  for (const d of defaults) {
    await $api.post('/module/stagegates', {
      goalId: projectId.value,
      ...d,
      exitCriteria: [
        { id: '1', title: 'Phase Deliverables Sign-off', required: true, completed: false },
        { id: '2', title: 'Budget & Schedule Review', required: true, completed: false },
      ],
    })
  }
  await loadStagegates()
}

async function submitForReview(gateId: number) {
  try {
    await $api.post(`/module/stagegates/${gateId}/submit`)
    await loadStagegates()
  } catch (err) {
    console.error('Failed to submit for review:', err)
  }
}

async function decideApproval() {
  if (!selectedGate.value) return
  try {
    await $api.post(`/module/stagegates/${selectedGate.value.id}/decide`, {
      decision: approvalDecision.value,
      comments: approvalComments.value,
    })
    openApprovalModal.value = false
    approvalComments.value = ''
    await loadStagegates()
  } catch (err) {
    console.error('Failed to decide approval:', err)
  }
}

async function deleteGate(gateId: number) {
  if (!confirm('Are you sure you want to delete this stagegate phase?')) return
  try {
    await $api.delete(`/module/stagegates/${gateId}`)
    await loadStagegates()
  } catch (err) {
    console.error('Failed to delete stagegate:', err)
  }
}

async function toggleCriterion(index: number) {
  if (!selectedGate.value) return
  const crit = selectedGate.value.exitCriteria[index]
  crit.completed = !crit.completed
  try {
    await $api.patch(`/module/stagegates/${selectedGate.value.id}`, {
      exitCriteria: selectedGate.value.exitCriteria,
    })
    await loadStagegates()
  } catch (err) {
    console.error('Failed to update exit criteria:', err)
  }
}

async function addCriterion() {
  const title = prompt('Enter new exit criterion title:')
  if (!title || !selectedGate.value) return
  const critList = selectedGate.value.exitCriteria || []
  critList.push({ id: `crit-${Date.now()}`, title, required: true, completed: false })
  try {
    await $api.patch(`/module/stagegates/${selectedGate.value.id}`, {
      exitCriteria: critList,
    })
    await loadStagegates()
  } catch (err) {
    console.error('Failed to add criterion:', err)
  }
}

async function linkTask() {
  if (!taskIdToLink.value || !selectedGate.value) return
  try {
    await $api.post(`/module/stagegates/${selectedGate.value.id}/tasks`, {
      taskId: taskIdToLink.value,
      isMandatory: isMandatoryTask.value,
    })
    openLinkTaskModal.value = false
    taskIdToLink.value = null
    await loadStagegates()
  } catch (err) {
    console.error('Failed to link task:', err)
  }
}

onMounted(() => {
  loadStagegates()
})
</script>

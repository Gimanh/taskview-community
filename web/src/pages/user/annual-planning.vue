<template>
  <UDashboardPanel id="annual-planning">
    <template #header>
      <UDashboardNavbar title="Annual Strategic Planning & Demand Automation">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Submit Proposal"
              icon="i-lucide-file-plus"
              color="primary"
              @click="openProposalModal = true"
            />
            <UButton
              label="New Planning Cycle"
              icon="i-lucide-calendar-plus"
              variant="soft"
              color="neutral"
              @click="openCycleModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <!-- Cycle Selector and Budget Allocation Banner -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-default bg-elevated/40">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-calendar" class="size-6" />
            </div>
            <div>
              <span class="text-xs text-muted uppercase font-semibold">Active Planning Cycle</span>
              <div class="flex items-center gap-2 mt-0.5">
                <select
                  v-model="selectedCycleId"
                  class="rounded-lg border border-default bg-background p-1.5 font-bold text-base text-default focus:ring-primary"
                  @change="loadProposals"
                >
                  <option v-for="c in cycles" :key="c.id" :value="c.id">
                    FY {{ c.year }} - {{ c.title }}
                  </option>
                </select>
                <span v-if="activeCycle" class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getCycleStatusClass(activeCycle.status)">
                  {{ activeCycle.status.replace(/_/g, ' ').toUpperCase() }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="activeCycle" class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col">
              <span class="text-xs text-muted">Capital Budget Pool</span>
              <span class="text-lg font-bold text-default">${{ (activeCycle.totalCapitalBudget || 0).toLocaleString() }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted">Approved Allocation</span>
              <span class="text-lg font-bold text-emerald-500">${{ (activeCycle.allocatedBudget || 0).toLocaleString() }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted">Total Requested</span>
              <span class="text-lg font-bold text-amber-500">${{ (activeCycle.totalRequestedBudget || 0).toLocaleString() }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted">Unallocated Pool</span>
              <span class="text-lg font-bold text-primary">${{ Math.max(0, (activeCycle.remainingCapitalBudget || 0)).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <div v-else-if="!cycles.length" class="p-12 text-center rounded-2xl border border-dashed border-default bg-elevated/20 flex flex-col items-center gap-3">
          <UIcon name="i-lucide-calendar-x" class="size-12 text-muted" />
          <h3 class="text-base font-semibold">No Planning Cycles Configured</h3>
          <p class="text-sm text-muted max-w-md">Initialize an Annual Planning exercise (e.g., FY 2026/2027) to collect project proposals, score business cases, and automate portfolio intake.</p>
          <UButton label="Create Annual Planning Cycle" color="primary" @click="openCycleModal = true" />
        </div>

        <!-- Proposals Prioritization & Scoring Matrix Table -->
        <div v-else class="flex flex-col gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 class="text-lg font-bold text-default">Demand Intake & Prioritization Scoring Matrix</h3>
              <p class="text-xs text-muted">Proposals ranked by Priority Score (Strategic Alignment + Financial ROI + Risk Rating).</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">{{ proposals.length }} Proposals Submitted</span>
            </div>
          </div>

          <div v-if="!proposals.length" class="p-8 text-center rounded-xl border border-dashed border-default bg-elevated/20 text-muted text-sm">
            No project proposals submitted for this cycle yet. Click "Submit Proposal" to initiate project demand intake.
          </div>

          <div v-else class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
            <table class="w-full text-left text-sm">
              <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                <tr>
                  <th class="p-3">Rank & Proposal</th>
                  <th class="p-3">Requested Budget</th>
                  <th class="p-3 text-center">Strategic (1-10)</th>
                  <th class="p-3 text-center">Financial (1-10)</th>
                  <th class="p-3 text-center">Risk (1-5)</th>
                  <th class="p-3 text-center">Priority Score</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/50">
                <tr v-for="(prop, pIdx) in proposals" :key="prop.id" class="hover:bg-elevated/40">
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs text-muted">#{{ pIdx + 1 }}</span>
                      <div>
                        <div class="font-semibold text-default">{{ prop.title }}</div>
                        <div class="text-xs text-muted line-clamp-1">{{ prop.description || prop.businessCase }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="p-3 font-bold text-default">
                    ${{ (prop.requestedBudget || 0).toLocaleString() }}
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded font-semibold text-xs bg-blue-500/10 text-blue-500">
                      {{ prop.strategicAlignmentScore }}/10
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded font-semibold text-xs bg-emerald-500/10 text-emerald-500">
                      {{ prop.financialScore }}/10
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded font-semibold text-xs" :class="prop.riskScore >= 4 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'">
                      {{ prop.riskScore }}/5
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <div class="inline-flex items-center gap-1 font-extrabold text-sm text-primary">
                      {{ prop.priorityScore }}/100
                    </div>
                  </td>
                  <td class="p-3">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getProposalStatusClass(prop.status)">
                      {{ prop.status.replace(/_/g, ' ').toUpperCase() }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <UButton
                        v-if="prop.status !== 'approved'"
                        label="Promote to Project"
                        icon="i-lucide-sparkles"
                        size="xs"
                        color="primary"
                        @click="promoteProposal(prop.id)"
                      />
                      <span v-else class="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                        <UIcon name="i-lucide-check-circle-2" class="size-4" />
                        Project #{{ prop.convertedGoalId }}
                      </span>
                      <UButton
                        icon="i-lucide-trash"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        @click="deleteProposal(prop.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create Proposal Modal -->
        <UModal v-model:open="openProposalModal" title="Submit Project Demand Proposal">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Proposal Title</label>
                <UInput v-model="newProposal.title" placeholder="e.g., Enterprise Customer Data Platform (CDP)" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Executive Business Case & Justification</label>
                <UTextarea v-model="newProposal.businessCase" placeholder="Summarize problem statement, strategic benefits, and expected ROI..." class="w-full mt-1" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Requested Capital Budget ($)</label>
                  <UInput v-model.number="newProposal.requestedBudget" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Estimated Total Cost ($)</label>
                  <UInput v-model.number="newProposal.estimatedCost" type="number" class="w-full mt-1" />
                </div>
              </div>
              <!-- Scoring Inputs -->
              <div class="p-3 rounded-xl border border-default bg-elevated/30 flex flex-col gap-3">
                <span class="text-xs font-semibold text-default uppercase">Multi-Criteria Prioritization Scoring</span>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="text-xs text-muted">Strategic Value (1-10)</label>
                    <UInput v-model.number="newProposal.strategicAlignmentScore" type="number" min="1" max="10" class="w-full mt-1" />
                  </div>
                  <div>
                    <label class="text-xs text-muted">Financial ROI (1-10)</label>
                    <UInput v-model.number="newProposal.financialScore" type="number" min="1" max="10" class="w-full mt-1" />
                  </div>
                  <div>
                    <label class="text-xs text-muted">Risk Level (1-5)</label>
                    <UInput v-model.number="newProposal.riskScore" type="number" min="1" max="5" class="w-full mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openProposalModal = false" />
              <UButton label="Submit for Prioritization" color="primary" @click="submitProposal" />
            </div>
          </template>
        </UModal>

        <!-- Create Cycle Modal -->
        <UModal v-model:open="openCycleModal" title="Create Annual Planning Cycle">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Fiscal Year</label>
                  <UInput v-model.number="newCycle.year" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Cycle Title</label>
                  <UInput v-model="newCycle.title" placeholder="e.g., Annual Capital Allocation" class="w-full mt-1" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Total Capital Pool ($)</label>
                  <UInput v-model.number="newCycle.totalCapitalBudget" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Operating Budget ($)</label>
                  <UInput v-model.number="newCycle.totalOperatingBudget" type="number" class="w-full mt-1" />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openCycleModal = false" />
              <UButton label="Create Cycle" color="primary" @click="createCycle" />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import $api from '@/helpers/axios'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'

const cycles = ref<any[]>([])
const selectedCycleId = ref<number | null>(null)
const proposals = ref<any[]>([])
const loading = ref(false)

const openProposalModal = ref(false)
const openCycleModal = ref(false)

const activeCycle = computed(() => cycles.value.find(c => c.id === selectedCycleId.value))

const newProposal = ref({
  title: '',
  businessCase: '',
  requestedBudget: 150000,
  estimatedCost: 150000,
  strategicAlignmentScore: 8,
  financialScore: 7,
  riskScore: 2,
})

const newCycle = ref({
  year: 2027,
  title: 'Annual Capital Portfolio Exercise',
  totalCapitalBudget: 5000000,
  totalOperatingBudget: 2000000,
})

function getCycleStatusClass(status: string) {
  switch (status) {
    case 'intake_open': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
    case 'scoring': return 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
    case 'approved': return 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
    default: return 'bg-neutral-500/10 text-neutral-400'
  }
}

function getProposalStatusClass(status: string) {
  switch (status) {
    case 'approved': return 'bg-emerald-500/10 text-emerald-500'
    case 'under_review': return 'bg-blue-500/10 text-blue-500'
    case 'submitted': return 'bg-amber-500/10 text-amber-500'
    case 'deferred': return 'bg-purple-500/10 text-purple-500'
    case 'rejected': return 'bg-red-500/10 text-red-500'
    default: return 'bg-neutral-500/10 text-neutral-400'
  }
}

async function loadCycles() {
  loading.value = true
  try {
    const res = await $api.get('/module/annual-planning/cycles')
    cycles.value = res.data?.response || []
    if (cycles.value.length && !selectedCycleId.value) {
      selectedCycleId.value = cycles.value[0].id
    }
    if (selectedCycleId.value) {
      await loadProposals()
    }
  } catch (err) {
    console.error('Failed to load cycles:', err)
  } finally {
    loading.value = false
  }
}

async function loadProposals() {
  if (!selectedCycleId.value) return
  try {
    const res = await $api.get(`/module/annual-planning/proposals?cycleId=${selectedCycleId.value}`)
    proposals.value = res.data?.response || []
  } catch (err) {
    console.error('Failed to load proposals:', err)
  }
}

async function submitProposal() {
  if (!newProposal.value.title || !selectedCycleId.value) return
  try {
    await $api.post('/module/annual-planning/proposals', {
      cycleId: selectedCycleId.value,
      ...newProposal.value,
    })
    openProposalModal.value = false
    newProposal.value = {
      title: '',
      businessCase: '',
      requestedBudget: 150000,
      estimatedCost: 150000,
      strategicAlignmentScore: 8,
      financialScore: 7,
      riskScore: 2,
    }
    await loadCycles()
  } catch (err) {
    console.error('Failed to submit proposal:', err)
  }
}

async function createCycle() {
  if (!newCycle.value.title) return
  try {
    const res = await $api.post('/module/annual-planning/cycles', newCycle.value)
    openCycleModal.value = false
    selectedCycleId.value = res.data?.response?.id
    await loadCycles()
  } catch (err) {
    console.error('Failed to create cycle:', err)
  }
}

async function promoteProposal(proposalId: number) {
  try {
    const res = await $api.post(`/module/annual-planning/proposals/${proposalId}/promote`)
    alert(res.data?.response?.message || 'Proposal promoted to active project!')
    await loadCycles()
  } catch (err) {
    console.error('Failed to promote proposal:', err)
  }
}

async function deleteProposal(id: number) {
  if (!confirm('Are you sure you want to delete this proposal?')) return
  try {
    await $api.delete(`/module/annual-planning/proposals/${id}`)
    await loadProposals()
  } catch (err) {
    console.error('Failed to delete proposal:', err)
  }
}

onMounted(() => {
  loadCycles()
})
</script>

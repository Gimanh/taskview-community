<template>
  <UDashboardPanel id="risks">
    <template #header>
      <UDashboardNavbar :title="isProjectScope ? `${projectName} - Risk Register & 5x5 Matrix` : 'Enterprise Risk Management (ERM) & Risk Register'">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Add Risk"
              icon="i-lucide-shield-alert"
              color="primary"
              @click="openRiskModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
            <span class="text-xs uppercase font-semibold text-muted">Total Open Risks</span>
            <div class="text-3xl font-extrabold text-default">
              {{ matrixData?.totalOpenRisks || risks.length }}
            </div>
            <span class="text-xs text-muted">Active tracked risk items</span>
          </div>

          <div class="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col gap-1">
            <span class="text-xs uppercase font-semibold text-red-400">Critical / High Severity</span>
            <div class="text-3xl font-extrabold text-red-500">
              {{ matrixData?.criticalCount || 0 }}
            </div>
            <span class="text-xs text-red-400/80">Score ≥ 15 (Requires executive attention)</span>
          </div>

          <div class="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
            <span class="text-xs uppercase font-semibold text-amber-400">Medium Severity</span>
            <div class="text-3xl font-extrabold text-amber-500">
              {{ matrixData?.mediumCount || 0 }}
            </div>
            <span class="text-xs text-amber-400/80">Score 8-14 (Mitigation active)</span>
          </div>

          <div class="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1">
            <span class="text-xs uppercase font-semibold text-emerald-400">Low Severity</span>
            <div class="text-3xl font-extrabold text-emerald-500">
              {{ matrixData?.lowCount || 0 }}
            </div>
            <span class="text-xs text-emerald-400/80">Score &lt; 8 (Under observation)</span>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <template v-else>
          <!-- 5x5 Probability-Impact Risk Heatmap Matrix -->
          <div class="p-6 rounded-2xl border border-default bg-elevated/30 flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-default text-base flex items-center gap-2">
                  <UIcon name="i-lucide-grid" class="size-5 text-primary" />
                  5x5 Probability vs. Impact Risk Heatmap Matrix
                </h3>
                <p class="text-xs text-muted">Click any cell to filter risks in that risk exposure quadrant.</p>
              </div>
              <div v-if="filterCell" class="flex items-center gap-2">
                <span class="text-xs font-semibold text-primary">Filtering: P={{ filterCell.p }} × I={{ filterCell.i }}</span>
                <UButton label="Clear Filter" size="xs" variant="ghost" color="neutral" @click="filterCell = null" />
              </div>
            </div>

            <!-- Heatmap Grid -->
            <div class="flex items-center gap-4 overflow-x-auto py-2">
              <!-- Y-axis Label -->
              <div class="rotate-[-90deg] text-xs font-bold uppercase tracking-wider text-muted whitespace-nowrap">
                Probability (Likelihood) ➔
              </div>

              <!-- Matrix Table -->
              <div class="flex flex-col gap-1.5 min-w-[320px]">
                <div
                  v-for="(row, rIdx) in (matrixData?.matrix || [])"
                  :key="rIdx"
                  class="flex items-center gap-1.5"
                >
                  <!-- Row header (P5 to P1) -->
                  <span class="w-6 text-xs font-bold text-muted text-right">P{{ 5 - rIdx }}</span>
                  <!-- 5 cells in row -->
                  <div
                    v-for="(cell, cIdx) in row"
                    :key="cIdx"
                    class="size-14 sm:size-16 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border"
                    :class="getCellBgClass(cell.probability, cell.impact, filterCell?.p === cell.probability && filterCell?.i === cell.impact)"
                    @click="filterCell = { p: cell.probability, i: cell.impact }"
                  >
                    <span class="text-base font-extrabold text-white">{{ cell.count }}</span>
                    <span class="text-[10px] text-white/80 font-medium">Score {{ cell.probability * cell.impact }}</span>
                  </div>
                </div>

                <!-- X-axis Labels (I1 to I5) -->
                <div class="flex items-center gap-1.5 ml-8 mt-1">
                  <span class="w-14 sm:w-16 text-center text-xs font-bold text-muted">I1 (Negl)</span>
                  <span class="w-14 sm:w-16 text-center text-xs font-bold text-muted">I2 (Minor)</span>
                  <span class="w-14 sm:w-16 text-center text-xs font-bold text-muted">I3 (Mod)</span>
                  <span class="w-14 sm:w-16 text-center text-xs font-bold text-muted">I4 (Major)</span>
                  <span class="w-14 sm:w-16 text-center text-xs font-bold text-muted">I5 (Catas)</span>
                </div>
                <div class="text-center text-xs font-bold uppercase tracking-wider text-muted mt-1 ml-8">
                  Impact (Severity) ➔
                </div>
              </div>

              <!-- Legend -->
              <div class="ml-auto hidden xl:flex flex-col gap-2 p-4 rounded-xl border border-default bg-elevated/40 text-xs">
                <span class="font-bold text-default uppercase">Heatmap Zones</span>
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded bg-red-600" />
                  <span>Critical Risk (15-25)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded bg-amber-500" />
                  <span>Medium Risk (8-14)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded bg-emerald-600" />
                  <span>Low Risk (1-7)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Risk Register Table -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 class="font-bold text-default text-base flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-list" class="size-5 text-primary" />
                Comprehensive Risk Register
              </h3>
              <!-- Category Filter -->
              <div class="flex items-center gap-2">
                <select v-model="selectedCategory" class="rounded-lg border border-default bg-background p-1.5 text-xs">
                  <option value="">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="operational">Operational</option>
                  <option value="financial">Financial</option>
                  <option value="schedule">Schedule</option>
                  <option value="strategic">Strategic</option>
                  <option value="external">External</option>
                </select>
                <select v-model="selectedStatus" class="rounded-lg border border-default bg-background p-1.5 text-xs">
                  <option value="">All Statuses</option>
                  <option value="identified">Identified</option>
                  <option value="analyzed">Analyzed</option>
                  <option value="mitigating">Mitigating</option>
                  <option value="accepted">Accepted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div v-if="!filteredRisks.length" class="p-8 text-center rounded-xl border border-dashed border-default bg-elevated/20 text-muted text-sm">
              No risks matching criteria. Click "Add Risk" to register risks into the matrix.
            </div>

            <div v-else class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                  <tr>
                    <th class="p-3">Risk Title & Description</th>
                    <th class="p-3">Category</th>
                    <th class="p-3 text-center">P × I</th>
                    <th class="p-3 text-center">Severity</th>
                    <th class="p-3">Strategy</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Mitigation Action Plan</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default/50">
                  <tr v-for="risk in filteredRisks" :key="risk.id" class="hover:bg-elevated/40">
                    <td class="p-3">
                      <div class="font-semibold text-default">{{ risk.title }}</div>
                      <div class="text-xs text-muted line-clamp-1">{{ risk.description }}</div>
                    </td>
                    <td class="p-3">
                      <span class="text-xs font-semibold uppercase text-muted">{{ risk.category }}</span>
                    </td>
                    <td class="p-3 text-center font-mono text-xs">
                      {{ risk.probability }} × {{ risk.impact }}
                    </td>
                    <td class="p-3 text-center">
                      <span class="text-xs font-extrabold px-2 py-0.5 rounded-full" :class="getSeverityBadge(risk.severityScore)">
                        {{ risk.severityScore }} ({{ risk.severityLevel.toUpperCase() }})
                      </span>
                    </td>
                    <td class="p-3 capitalize text-xs text-default font-medium">{{ risk.responseStrategy }}</td>
                    <td class="p-3">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" :class="getStatusBadge(risk.status)">
                        {{ risk.status }}
                      </span>
                    </td>
                    <td class="p-3 text-xs text-default max-w-xs truncate">
                      {{ risk.mitigationPlan || 'No mitigation defined' }}
                    </td>
                    <td class="p-3 text-right">
                      <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost" @click="deleteRisk(risk.id)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Create Risk Modal -->
        <UModal v-model:open="openRiskModal" title="Register New Risk">
          <template #body>
            <div class="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label class="text-xs font-medium text-muted">Risk Title *</label>
                <UInput v-model="newRisk.title" placeholder="e.g., Critical third-party API latency / data mismatch" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Risk Description</label>
                <UTextarea v-model="newRisk.description" placeholder="Describe root cause and trigger event..." class="w-full mt-1" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Risk Category</label>
                  <select v-model="newRisk.category" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="technical">Technical</option>
                    <option value="operational">Operational</option>
                    <option value="financial">Financial</option>
                    <option value="schedule">Schedule</option>
                    <option value="strategic">Strategic</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Response Strategy</label>
                  <select v-model="newRisk.responseStrategy" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="mitigate">Mitigate</option>
                    <option value="avoid">Avoid</option>
                    <option value="transfer">Transfer</option>
                    <option value="accept">Accept</option>
                  </select>
                </div>
              </div>

              <!-- Probability & Impact Matrix Selectors -->
              <div class="p-3.5 rounded-xl border border-default bg-elevated/30 flex flex-col gap-3">
                <span class="text-xs font-bold text-default uppercase">Risk Evaluation (Probability × Impact)</span>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs text-muted">Probability (1 = Rare, 5 = Almost Certain)</label>
                    <select v-model.number="newRisk.probability" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background font-bold">
                      <option :value="1">1 - Rare (0-10%)</option>
                      <option :value="2">2 - Unlikely (10-30%)</option>
                      <option :value="3">3 - Possible (30-60%)</option>
                      <option :value="4">4 - Likely (60-85%)</option>
                      <option :value="5">5 - Almost Certain (&gt;85%)</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs text-muted">Impact (1 = Negligible, 5 = Catastrophic)</label>
                    <select v-model.number="newRisk.impact" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background font-bold">
                      <option :value="1">1 - Negligible</option>
                      <option :value="2">2 - Minor</option>
                      <option :value="3">3 - Moderate</option>
                      <option :value="4">4 - Major</option>
                      <option :value="5">5 - Catastrophic</option>
                    </select>
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs font-bold pt-2 border-t border-default/50">
                  <span>Computed Severity Score:</span>
                  <span class="px-2.5 py-0.5 rounded-full text-sm font-extrabold" :class="getSeverityBadge(newRisk.probability * newRisk.impact)">
                    {{ newRisk.probability * newRisk.impact }} / 25
                  </span>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Mitigation Action Plan</label>
                <UTextarea v-model="newRisk.mitigationPlan" placeholder="Actions to reduce probability or impact..." class="w-full mt-1" />
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Contingency Plan</label>
                <UTextarea v-model="newRisk.contingencyPlan" placeholder="Fallback steps if risk materializes..." class="w-full mt-1" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openRiskModal = false" />
              <UButton label="Save Risk" color="primary" @click="createRisk" />
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
const isProjectScope = computed(() => !!projectId.value && !isNaN(projectId.value))
const currentProject = computed(() => goalsStore.goals.find(g => g.id === projectId.value))
const projectName = computed(() => currentProject.value?.name || 'Project')

const loading = ref(false)
const openRiskModal = ref(false)
const filterCell = ref<{ p: number; i: number } | null>(null)
const selectedCategory = ref('')
const selectedStatus = ref('')

const matrixData = ref<any>(null)
const risks = ref<any[]>([])

const newRisk = ref({
  title: '',
  description: '',
  category: 'technical' as any,
  probability: 3,
  impact: 3,
  responseStrategy: 'mitigate' as any,
  mitigationPlan: '',
  contingencyPlan: '',
})

const filteredRisks = computed(() => {
  return risks.value.filter(r => {
    if (filterCell.value && (r.probability !== filterCell.value.p || r.impact !== filterCell.value.i)) return false
    if (selectedCategory.value && r.category !== selectedCategory.value) return false
    if (selectedStatus.value && r.status !== selectedStatus.value) return false
    return true
  })
})

function getCellBgClass(p: number, i: number, isSelected: boolean) {
  const score = p * i
  let base = ''
  if (score >= 15) base = 'bg-red-600/90 hover:bg-red-600 border-red-500/50'
  else if (score >= 8) base = 'bg-amber-600/90 hover:bg-amber-600 border-amber-500/50'
  else base = 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/50'

  if (isSelected) {
    return `${base} ring-4 ring-primary scale-105 shadow-lg`
  }
  return base
}

function getSeverityBadge(score: number) {
  if (score >= 15) return 'bg-red-500/20 text-red-500 border border-red-500/40'
  if (score >= 8) return 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
  return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'mitigating': return 'bg-blue-500/10 text-blue-500'
    case 'closed': return 'bg-neutral-500/10 text-neutral-400'
    case 'analyzed': return 'bg-purple-500/10 text-purple-500'
    default: return 'bg-amber-500/10 text-amber-500'
  }
}

async function loadData() {
  loading.value = true
  try {
    const url = isProjectScope.value
      ? `/module/risks/matrix?goalId=${projectId.value}`
      : '/module/risks/matrix'
    const res = await $api.get(url)
    matrixData.value = res.data?.response
    risks.value = res.data?.response?.risks || []
  } catch (err) {
    console.error('Failed to load risks:', err)
  } finally {
    loading.value = false
  }
}

async function createRisk() {
  if (!newRisk.value.title) return
  try {
    await $api.post('/module/risks', {
      goalId: isProjectScope.value ? projectId.value : undefined,
      ...newRisk.value,
    })
    openRiskModal.value = false
    newRisk.value = {
      title: '',
      description: '',
      category: 'technical',
      probability: 3,
      impact: 3,
      responseStrategy: 'mitigate',
      mitigationPlan: '',
      contingencyPlan: '',
    }
    await loadData()
  } catch (err) {
    console.error('Failed to create risk:', err)
  }
}

async function deleteRisk(id: number) {
  if (!confirm('Are you sure you want to delete this risk?')) return
  try {
    await $api.delete(`/module/risks/${id}`)
    await loadData()
  } catch (err) {
    console.error('Failed to delete risk:', err)
  }
}

onMounted(() => {
  loadData()
})
</script>

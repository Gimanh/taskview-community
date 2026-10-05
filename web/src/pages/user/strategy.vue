<template>
  <UDashboardPanel id="strategy">
    <template #header>
      <UDashboardNavbar title="Strategic Portfolio & SPM Dashboards">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="New Objective"
              icon="i-lucide-target"
              color="primary"
              @click="openObjectiveModal = true"
            />
            <UButton
              label="New Initiative"
              icon="i-lucide-rocket"
              variant="soft"
              color="primary"
              @click="openInitiativeModal = true"
            />
            <UButton
              label="New KPI"
              icon="i-lucide-gauge"
              variant="soft"
              color="neutral"
              @click="openKpiModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <!-- Navigation Tabs -->
        <div class="flex border-b border-default gap-2 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
            :class="activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-default'"
            @click="activeTab = tab.id"
          >
            <span class="flex items-center gap-2">
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
            </span>
          </button>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <template v-else>
          <!-- TAB 1: EXECUTIVE DASHBOARD (Tier 1 & Tier 2) -->
          <div v-if="activeTab === 'executive'" class="flex flex-col gap-6">
            <!-- Strategic KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Strategic Alignment Health</span>
                <div class="text-3xl font-extrabold text-primary">
                  {{ dashboard?.executiveTier?.strategicAlignmentHealth || 100 }}%
                </div>
                <span class="text-xs text-muted">Objectives on-track or achieved</span>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Strategic Objectives</span>
                <div class="text-3xl font-extrabold text-default">
                  {{ dashboard?.executiveTier?.totalObjectives || 0 }}
                </div>
                <div class="flex gap-2 text-xs text-muted mt-1">
                  <span class="text-emerald-500 font-medium">{{ dashboard?.executiveTier?.onTrackObjectives || 0 }} on-track</span>
                  <span>•</span>
                  <span class="text-amber-500 font-medium">{{ dashboard?.executiveTier?.atRiskObjectives || 0 }} at-risk</span>
                </div>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Strategic Initiatives</span>
                <div class="text-3xl font-extrabold text-default">
                  {{ dashboard?.portfolioTier?.totalInitiatives || 0 }}
                </div>
                <span class="text-xs text-muted">
                  {{ dashboard?.portfolioTier?.activeInitiatives || 0 }} active programs
                </span>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Portfolio Budget</span>
                <div class="text-3xl font-extrabold text-emerald-500">
                  ${{ (dashboard?.portfolioTier?.totalBudget || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Capital allocation across initiatives</span>
              </div>
            </div>

            <!-- Objectives Progress Overview -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="p-5 rounded-2xl border border-default bg-elevated/30 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-bold text-default text-base flex items-center gap-2">
                    <UIcon name="i-lucide-target" class="size-5 text-primary" />
                    Strategic Objectives Performance
                  </h3>
                  <UButton label="View All" size="xs" variant="ghost" color="neutral" @click="activeTab = 'objectives'" />
                </div>

                <div v-if="!objectives.length" class="text-sm text-muted py-6 text-center">
                  No objectives registered yet. Create strategic targets for 2026-2028.
                </div>

                <div v-else class="flex flex-col gap-3">
                  <div
                    v-for="obj in objectives.slice(0, 4)"
                    :key="obj.id"
                    class="p-3.5 rounded-xl border border-default bg-background/50 flex flex-col gap-2"
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-sm text-default">{{ obj.title }}</span>
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getStatusClass(obj.status)">
                        {{ obj.status.replace(/_/g, ' ').toUpperCase() }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center text-xs text-muted">
                      <span>{{ obj.initiativesCount }} Initiatives • {{ obj.kpisCount }} KPIs</span>
                      <span class="font-medium text-default">{{ obj.progressPercent }}%</span>
                    </div>
                    <div class="w-full bg-default/20 rounded-full h-1.5 overflow-hidden">
                      <div class="bg-primary h-full transition-all duration-300" :style="{ width: `${obj.progressPercent}%` }" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Strategic KPI Gauges -->
              <div class="p-5 rounded-2xl border border-default bg-elevated/30 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-bold text-default text-base flex items-center gap-2">
                    <UIcon name="i-lucide-gauge" class="size-5 text-primary" />
                    Key Strategic KPI Scorecards
                  </h3>
                  <UButton label="View All" size="xs" variant="ghost" color="neutral" @click="activeTab = 'kpis'" />
                </div>

                <div v-if="!kpis.length" class="text-sm text-muted py-6 text-center">
                  No strategic KPIs registered yet. Add metrics with quantitative target values.
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    v-for="kpi in kpis.slice(0, 4)"
                    :key="kpi.id"
                    class="p-4 rounded-xl border border-default bg-background/50 flex flex-col gap-2"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-muted line-clamp-1">{{ kpi.title }}</span>
                      <span class="size-2.5 rounded-full" :class="getKpiDotClass(kpi.status)" />
                    </div>
                    <div class="flex items-baseline gap-1">
                      <span class="text-2xl font-bold text-default">{{ kpi.currentValue }}</span>
                      <span class="text-xs text-muted">/ {{ kpi.targetValue }} {{ kpi.unit }}</span>
                    </div>
                    <div class="w-full bg-default/20 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        class="h-full transition-all duration-300"
                        :class="kpi.status === 'green' ? 'bg-emerald-500' : (kpi.status === 'amber' ? 'bg-amber-500' : 'bg-red-500')"
                        :style="{ width: `${Math.min(100, Math.round((kpi.currentValue / (kpi.targetValue || 1)) * 100))}%` }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: STRATEGIC OBJECTIVES TABLE -->
          <div v-if="activeTab === 'objectives'" class="flex flex-col gap-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-default">Strategic Objectives (OKRs / Goals)</h3>
              <UButton label="Add Objective" icon="i-lucide-plus" size="sm" color="primary" @click="openObjectiveModal = true" />
            </div>

            <div class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                  <tr>
                    <th class="p-3">Title & Scope</th>
                    <th class="p-3">Horizon</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Initiatives</th>
                    <th class="p-3">Progress</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default/50">
                  <tr v-for="obj in objectives" :key="obj.id" class="hover:bg-elevated/40">
                    <td class="p-3">
                      <div class="font-semibold text-default">{{ obj.title }}</div>
                      <div class="text-xs text-muted line-clamp-1">{{ obj.description }}</div>
                    </td>
                    <td class="p-3 text-default">{{ obj.targetYear }}</td>
                    <td class="p-3">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getStatusClass(obj.status)">
                        {{ obj.status.replace(/_/g, ' ').toUpperCase() }}
                      </span>
                    </td>
                    <td class="p-3 text-default">{{ obj.initiativesCount }} initiatives</td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-medium">{{ obj.progressPercent }}%</span>
                        <div class="w-20 bg-default/20 rounded-full h-1.5 overflow-hidden">
                          <div class="bg-primary h-full" :style="{ width: `${obj.progressPercent}%` }" />
                        </div>
                      </div>
                    </td>
                    <td class="p-3 text-right">
                      <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost" @click="deleteObjective(obj.id)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: INITIATIVES PORTFOLIO -->
          <div v-if="activeTab === 'initiatives'" class="flex flex-col gap-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-default">Strategic Initiatives Portfolio</h3>
              <UButton label="Add Initiative" icon="i-lucide-plus" size="sm" color="primary" @click="openInitiativeModal = true" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="init in initiatives"
                :key="init.id"
                class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getStatusClass(init.status)">
                    {{ init.status.toUpperCase() }}
                  </span>
                  <span class="text-xs font-bold text-emerald-500">${{ (init.budget || 0).toLocaleString() }}</span>
                </div>
                <div>
                  <h4 class="font-bold text-default text-base">{{ init.title }}</h4>
                  <p class="text-xs text-muted line-clamp-2 mt-1">{{ init.description }}</p>
                </div>
                <div class="border-t border-default/50 pt-2 flex flex-col gap-1 text-xs text-muted">
                  <div class="flex justify-between">
                    <span>Linked Projects:</span>
                    <span class="font-semibold text-default">{{ (init.projects || []).length }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="proj in init.projects"
                      :key="proj.id"
                      class="px-2 py-0.5 rounded bg-default/10 text-default text-[11px]"
                    >
                      {{ proj.name }}
                    </span>
                  </div>
                </div>
                <div class="mt-auto pt-2 flex justify-between items-center border-t border-default/50">
                  <UButton label="Link Project" size="xs" variant="soft" color="neutral" @click="openLinkProject(init.id)" />
                  <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost" @click="deleteInitiative(init.id)" />
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4: KPI SCORECARD -->
          <div v-if="activeTab === 'kpis'" class="flex flex-col gap-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-default">Strategic KPI Scorecards</h3>
              <UButton label="Add KPI" icon="i-lucide-plus" size="sm" color="primary" @click="openKpiModal = true" />
            </div>

            <div class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                  <tr>
                    <th class="p-3">KPI Name</th>
                    <th class="p-3">Current</th>
                    <th class="p-3">Target</th>
                    <th class="p-3">Cadence</th>
                    <th class="p-3">Health Status</th>
                    <th class="p-3 text-right">Update Value</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default/50">
                  <tr v-for="kpi in kpis" :key="kpi.id" class="hover:bg-elevated/40">
                    <td class="p-3 font-semibold text-default">{{ kpi.title }}</td>
                    <td class="p-3 text-default font-bold">{{ kpi.currentValue }} {{ kpi.unit }}</td>
                    <td class="p-3 text-muted">{{ kpi.targetValue }} {{ kpi.unit }}</td>
                    <td class="p-3 text-muted capitalize">{{ kpi.cadence }}</td>
                    <td class="p-3">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getKpiBadgeClass(kpi.status)">
                        {{ kpi.status.toUpperCase() }}
                      </span>
                    </td>
                    <td class="p-3 text-right">
                      <UButton label="Log Value" size="xs" variant="soft" color="primary" @click="quickUpdateKpi(kpi)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 5: STRATEGIC ALIGNMENT HIERARCHY TREE -->
          <div v-if="activeTab === 'hierarchy'" class="flex flex-col gap-4">
            <h3 class="text-lg font-bold text-default">Strategic Alignment Map (Hierarchy Rollup)</h3>
            <p class="text-sm text-muted">Visual cascade from Corporate Strategic Objectives ➔ Strategic Initiatives ➔ Projects ➔ Key Performance Indicators.</p>

            <div class="flex flex-col gap-4">
              <div
                v-for="obj in dashboard?.hierarchy || []"
                :key="obj.id"
                class="p-5 rounded-2xl border border-default bg-elevated/30 flex flex-col gap-4"
              >
                <!-- Objective Header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-target" class="size-6 text-primary" />
                    <div>
                      <h4 class="font-bold text-default text-base">{{ obj.title }}</h4>
                      <span class="text-xs text-muted">Objective Progress: {{ obj.progress }}%</span>
                    </div>
                  </div>
                  <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full" :class="getStatusClass(obj.status)">
                    {{ obj.status.replace(/_/g, ' ').toUpperCase() }}
                  </span>
                </div>

                <!-- Initiatives in this Objective -->
                <div class="ml-6 pl-4 border-l-2 border-primary/30 flex flex-col gap-3">
                  <div
                    v-for="init in obj.initiatives"
                    :key="init.id"
                    class="p-4 rounded-xl border border-default bg-background/60 flex flex-col gap-2"
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-sm text-default flex items-center gap-2">
                        <UIcon name="i-lucide-rocket" class="size-4 text-emerald-500" />
                        Initiative: {{ init.title }}
                      </span>
                      <span class="text-xs text-emerald-500 font-semibold">${{ (init.budget || 0).toLocaleString() }}</span>
                    </div>

                    <!-- Linked Projects under Initiative -->
                    <div class="ml-6 pl-3 border-l-2 border-emerald-500/30 flex flex-col gap-1.5 mt-2">
                      <span class="text-xs font-semibold text-muted uppercase">Linked Operational Projects:</span>
                      <div v-if="!init.projects?.length" class="text-xs text-muted italic">No active projects linked</div>
                      <div
                        v-for="proj in init.projects"
                        :key="proj.id"
                        class="text-xs text-default font-medium p-1.5 rounded bg-elevated/40 flex items-center justify-between"
                      >
                        <span class="flex items-center gap-1.5">
                          <UIcon name="i-lucide-folder" class="size-3.5 text-primary" />
                          {{ proj.name }}
                        </span>
                        <span class="text-muted text-[11px]">ID #{{ proj.id }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Create Objective Modal -->
        <UModal v-model:open="openObjectiveModal" title="Create Strategic Objective">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Objective Title</label>
                <UInput v-model="newObjective.title" placeholder="e.g., Accelerate Cloud Modernization & Enterprise Agility" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Strategic Horizon & Description</label>
                <UTextarea v-model="newObjective.description" placeholder="Describe corporate vision, outcomes, and business impact..." class="w-full mt-1" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Target Year</label>
                  <UInput v-model.number="newObjective.targetYear" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Initial Status</label>
                  <select v-model="newObjective.status" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="behind">Behind</option>
                    <option value="achieved">Achieved</option>
                  </select>
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openObjectiveModal = false" />
              <UButton label="Create Objective" color="primary" @click="createObjective" />
            </div>
          </template>
        </UModal>

        <!-- Create Initiative Modal -->
        <UModal v-model:open="openInitiativeModal" title="Create Strategic Initiative">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Parent Strategic Objective</label>
                <select v-model="newInitiative.objectiveId" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                  <option v-for="obj in objectives" :key="obj.id" :value="obj.id">{{ obj.title }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Initiative Title</label>
                <UInput v-model="newInitiative.title" placeholder="e.g., Core Banking Platform Re-architecture" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Budget ($)</label>
                <UInput v-model.number="newInitiative.budget" type="number" class="w-full mt-1" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openInitiativeModal = false" />
              <UButton label="Create Initiative" color="primary" @click="createInitiative" />
            </div>
          </template>
        </UModal>

        <!-- Create KPI Modal -->
        <UModal v-model:open="openKpiModal" title="Create Strategic KPI">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">KPI Title</label>
                <UInput v-model="newKpi.title" placeholder="e.g., Cloud Migration Completion %" class="w-full mt-1" />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Target Value</label>
                  <UInput v-model.number="newKpi.targetValue" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Current Value</label>
                  <UInput v-model.number="newKpi.currentValue" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Unit</label>
                  <UInput v-model="newKpi.unit" placeholder="%, $, pts" class="w-full mt-1" />
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Measurement Cadence</label>
                <select v-model="newKpi.cadence" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openKpiModal = false" />
              <UButton label="Save KPI" color="primary" @click="createKpi" />
            </div>
          </template>
        </UModal>

        <!-- Link Project Modal -->
        <UModal v-model:open="openLinkProjModal" title="Link Project to Initiative">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Select Project</label>
                <select v-model="selectedProjectIdToLink" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                  <option v-for="goal in goalsStore.goals" :key="goal.id" :value="goal.id">{{ goal.name }} (ID #{{ goal.id }})</option>
                </select>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openLinkProjModal = false" />
              <UButton label="Link Project" color="primary" @click="linkProjectSubmit" />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import $api from '@/helpers/axios'
import { useGoalsStore } from '@/stores/goals.store'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'

const goalsStore = useGoalsStore()
const activeTab = ref('executive')
const loading = ref(false)

const tabs = [
  { id: 'executive', label: 'Executive Dashboard', icon: 'i-lucide-layout-dashboard' },
  { id: 'objectives', label: 'Objectives', icon: 'i-lucide-target' },
  { id: 'initiatives', label: 'Initiatives Portfolio', icon: 'i-lucide-rocket' },
  { id: 'kpis', label: 'KPI Scorecard', icon: 'i-lucide-gauge' },
  { id: 'hierarchy', label: 'Strategic Alignment Map', icon: 'i-lucide-network' },
]

const dashboard = ref<any>(null)
const objectives = ref<any[]>([])
const initiatives = ref<any[]>([])
const kpis = ref<any[]>([])

const openObjectiveModal = ref(false)
const openInitiativeModal = ref(false)
const openKpiModal = ref(false)
const openLinkProjModal = ref(false)

const targetInitiativeId = ref<number | null>(null)
const selectedProjectIdToLink = ref<number | null>(null)

const newObjective = ref({
  title: '',
  description: '',
  targetYear: 2026,
  status: 'on_track',
})

const newInitiative = ref({
  objectiveId: null as number | null,
  title: '',
  budget: 500000,
})

const newKpi = ref({
  title: '',
  targetValue: 100,
  currentValue: 25,
  unit: '%',
  cadence: 'quarterly',
})

function getStatusClass(status: string) {
  switch (status) {
    case 'on_track':
    case 'active':
    case 'achieved':
    case 'completed': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
    case 'at_risk':
    case 'planning': return 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
    case 'behind':
    case 'on_hold': return 'bg-red-500/10 text-red-500 border border-red-500/30'
    default: return 'bg-neutral-500/10 text-neutral-400'
  }
}

function getKpiDotClass(status: string) {
  if (status === 'green') return 'bg-emerald-500'
  if (status === 'amber') return 'bg-amber-500'
  return 'bg-red-500'
}

function getKpiBadgeClass(status: string) {
  if (status === 'green') return 'bg-emerald-500/10 text-emerald-500'
  if (status === 'amber') return 'bg-amber-500/10 text-amber-500'
  return 'bg-red-500/10 text-red-500'
}

async function loadData() {
  loading.value = true
  try {
    const [dashRes, objRes, initRes, kpiRes] = await Promise.all([
      $api.get('/module/strategy/dashboard'),
      $api.get('/module/strategy/objectives'),
      $api.get('/module/strategy/initiatives'),
      $api.get('/module/strategy/kpis'),
    ])
    dashboard.value = dashRes.data?.response
    objectives.value = objRes.data?.response || []
    initiatives.value = initRes.data?.response || []
    kpis.value = kpiRes.data?.response || []

    if (objectives.value.length && !newInitiative.value.objectiveId) {
      newInitiative.value.objectiveId = objectives.value[0].id
    }
  } catch (err) {
    console.error('Failed to load strategy data:', err)
  } finally {
    loading.value = false
  }
}

async function createObjective() {
  if (!newObjective.value.title) return
  try {
    await $api.post('/module/strategy/objectives', newObjective.value)
    openObjectiveModal.value = false
    newObjective.value = { title: '', description: '', targetYear: 2026, status: 'on_track' }
    await loadData()
  } catch (err) {
    console.error('Failed to create objective:', err)
  }
}

async function deleteObjective(id: number) {
  if (!confirm('Are you sure you want to delete this strategic objective?')) return
  try {
    await $api.delete(`/module/strategy/objectives/${id}`)
    await loadData()
  } catch (err) {
    console.error('Failed to delete objective:', err)
  }
}

async function createInitiative() {
  if (!newInitiative.value.title || !newInitiative.value.objectiveId) return
  try {
    await $api.post('/module/strategy/initiatives', newInitiative.value)
    openInitiativeModal.value = false
    newInitiative.value = { objectiveId: objectives.value[0]?.id || null, title: '', budget: 500000 }
    await loadData()
  } catch (err) {
    console.error('Failed to create initiative:', err)
  }
}

async function deleteInitiative(id: number) {
  if (!confirm('Are you sure you want to delete this initiative?')) return
  try {
    await $api.delete(`/module/strategy/initiatives/${id}`)
    await loadData()
  } catch (err) {
    console.error('Failed to delete initiative:', err)
  }
}

function openLinkProject(initId: number) {
  targetInitiativeId.value = initId
  selectedProjectIdToLink.value = goalsStore.goals[0]?.id || null
  openLinkProjModal.value = true
}

async function linkProjectSubmit() {
  if (!targetInitiativeId.value || !selectedProjectIdToLink.value) return
  try {
    await $api.post(`/module/strategy/initiatives/${targetInitiativeId.value}/projects`, {
      goalId: selectedProjectIdToLink.value,
    })
    openLinkProjModal.value = false
    await loadData()
  } catch (err) {
    console.error('Failed to link project:', err)
  }
}

async function createKpi() {
  if (!newKpi.value.title) return
  try {
    await $api.post('/module/strategy/kpis', newKpi.value)
    openKpiModal.value = false
    newKpi.value = { title: '', targetValue: 100, currentValue: 25, unit: '%', cadence: 'quarterly' }
    await loadData()
  } catch (err) {
    console.error('Failed to create KPI:', err)
  }
}

async function quickUpdateKpi(kpi: any) {
  const val = prompt(`Enter new value for "${kpi.title}" (target: ${kpi.targetValue} ${kpi.unit}):`, String(kpi.currentValue))
  if (val === null) return
  const num = Number(val)
  if (isNaN(num)) return
  try {
    await $api.patch(`/module/strategy/kpis/${kpi.id}`, { currentValue: num })
    await loadData()
  } catch (err) {
    console.error('Failed to update KPI:', err)
  }
}

onMounted(() => {
  loadData()
})
</script>

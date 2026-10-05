<template>
  <UDashboardPanel id="progress-reports">
    <template #header>
      <UDashboardNavbar :title="`${projectName} - Progress Reporting & Cadence Reminders`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Submit Progress Report"
              icon="i-lucide-file-text"
              color="primary"
              @click="openReportModal = true"
            />
            <UButton
              label="Reminder Cadence Settings"
              icon="i-lucide-bell-ring"
              variant="soft"
              color="neutral"
              @click="openCadenceModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <!-- Cadence Reminder Banner -->
        <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-clock" class="size-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs uppercase font-semibold text-muted">Reporting Schedule</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="cadence?.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-500/10 text-neutral-400'">
                  {{ cadence?.isActive ? 'ACTIVE REMINDERS' : 'PAUSED' }}
                </span>
              </div>
              <div class="font-bold text-default text-base mt-0.5">
                {{ cadence?.frequency?.toUpperCase() }} • Every {{ getDayName(cadence?.dayOfWeek) }} at {{ cadence?.hourUtc }}:00 UTC
              </div>
              <span class="text-xs text-muted">Delivered via {{ cadence?.reminderChannel }} notifications to project leads</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              label="Trigger Reminder Now"
              icon="i-lucide-send"
              variant="soft"
              color="primary"
              @click="sendReminderNow"
            />
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <!-- Latest Report RAG Health Status Cards -->
        <div v-if="latestReport" class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-default text-base flex items-center gap-2">
              <UIcon name="i-lucide-heart-pulse" class="size-5 text-primary" />
              Latest Project Health RAG Indicators (Reported {{ formatDate(latestReport.reportDate) }})
            </h3>
            <span class="text-xs text-muted">By {{ latestReport.reporterLogin || latestReport.reporterEmail }}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-2">
              <span class="text-xs text-muted uppercase font-semibold">Overall Project Health</span>
              <div class="flex items-center gap-2">
                <span class="size-3.5 rounded-full" :class="getRAGDotClass(latestReport.overallHealth)" />
                <span class="text-lg font-bold text-default uppercase">{{ latestReport.overallHealth }}</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-2">
              <span class="text-xs text-muted uppercase font-semibold">Stagegates & Governance</span>
              <div class="flex items-center gap-2">
                <span class="size-3.5 rounded-full" :class="getRAGDotClass(latestReport.stagegateHealth)" />
                <span class="text-lg font-bold text-default uppercase">{{ latestReport.stagegateHealth }}</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-2">
              <span class="text-xs text-muted uppercase font-semibold">Budget & Financials</span>
              <div class="flex items-center gap-2">
                <span class="size-3.5 rounded-full" :class="getRAGDotClass(latestReport.budgetHealth)" />
                <span class="text-lg font-bold text-default uppercase">{{ latestReport.budgetHealth }}</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-2">
              <span class="text-xs text-muted uppercase font-semibold">Schedule & Milestones</span>
              <div class="flex items-center gap-2">
                <span class="size-3.5 rounded-full" :class="getRAGDotClass(latestReport.scheduleHealth)" />
                <span class="text-lg font-bold text-default uppercase">{{ latestReport.scheduleHealth }}</span>
              </div>
            </div>
          </div>

          <!-- Executive Summary Callout -->
          <div class="p-5 rounded-2xl border border-default bg-elevated/20 flex flex-col gap-2">
            <span class="text-xs font-bold text-primary uppercase">Executive Summary</span>
            <p class="text-sm text-default leading-relaxed whitespace-pre-wrap">{{ latestReport.executiveSummary }}</p>

            <div v-if="latestReport.keyAccomplishments" class="mt-2 pt-2 border-t border-default/50">
              <span class="text-xs font-bold text-emerald-500 uppercase">Key Accomplishments This Period:</span>
              <p class="text-xs text-default mt-0.5 whitespace-pre-wrap">{{ latestReport.keyAccomplishments }}</p>
            </div>

            <div v-if="latestReport.blockersRisks" class="mt-2 pt-2 border-t border-default/50">
              <span class="text-xs font-bold text-red-500 uppercase">Blockers & Risks Flagged:</span>
              <p class="text-xs text-default mt-0.5 whitespace-pre-wrap">{{ latestReport.blockersRisks }}</p>
            </div>
          </div>
        </div>

        <!-- Historical Reports Timeline -->
        <div class="flex flex-col gap-3">
          <h3 class="font-bold text-default text-base flex items-center gap-2">
            <UIcon name="i-lucide-history" class="size-5 text-primary" />
            Historical Progress Reports
          </h3>

          <div v-if="!reports.length" class="p-8 text-center rounded-xl border border-dashed border-default bg-elevated/20 text-muted text-sm">
            No progress reports submitted yet. Submit a status report to establish project governance history.
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="rep in reports"
              :key="rep.id"
              class="p-4 rounded-xl border border-default bg-elevated/30 flex flex-col gap-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-bold text-default">{{ formatDate(rep.reportDate) }}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" :class="getRAGBadgeClass(rep.overallHealth)">
                    Overall: {{ rep.overallHealth }}
                  </span>
                </div>
                <span class="text-xs text-muted">Submitted by {{ rep.reporterLogin }}</span>
              </div>
              <p class="text-xs text-default line-clamp-2 mt-1">{{ rep.executiveSummary }}</p>
            </div>
          </div>
        </div>

        <!-- Submit Report Modal -->
        <UModal v-model:open="openReportModal" title="Submit Project Progress Report">
          <template #body>
            <div class="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
              <!-- RAG Selectors -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-default bg-elevated/30">
                <div>
                  <label class="text-xs font-medium text-muted">Overall Health</label>
                  <select v-model="newReport.overallHealth" class="w-full mt-1 rounded-lg border border-default p-1.5 text-xs bg-background">
                    <option value="green">Green (On Track)</option>
                    <option value="amber">Amber (Attention)</option>
                    <option value="red">Red (Critical)</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Stagegate Health</label>
                  <select v-model="newReport.stagegateHealth" class="w-full mt-1 rounded-lg border border-default p-1.5 text-xs bg-background">
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Budget Health</label>
                  <select v-model="newReport.budgetHealth" class="w-full mt-1 rounded-lg border border-default p-1.5 text-xs bg-background">
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Schedule Health</label>
                  <select v-model="newReport.scheduleHealth" class="w-full mt-1 rounded-lg border border-default p-1.5 text-xs bg-background">
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Executive Summary *</label>
                <UTextarea v-model="newReport.executiveSummary" placeholder="Key highlights, progress status, and leadership takeaway..." class="w-full mt-1" />
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Key Accomplishments This Period</label>
                <UTextarea v-model="newReport.keyAccomplishments" placeholder="What key deliverables were completed..." class="w-full mt-1" />
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Next Period Priorities</label>
                <UTextarea v-model="newReport.nextPeriodPlans" placeholder="Planned focus for upcoming week/month..." class="w-full mt-1" />
              </div>

              <div>
                <label class="text-xs font-medium text-muted">Blockers, Dependencies & Risks</label>
                <UTextarea v-model="newReport.blockersRisks" placeholder="Any impediments requiring executive intervention..." class="w-full mt-1" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openReportModal = false" />
              <UButton label="Submit Progress Report" color="primary" @click="submitReport" />
            </div>
          </template>
        </UModal>

        <!-- Cadence Settings Modal -->
        <UModal v-model:open="openCadenceModal" title="Automated Reminder Cadence Settings">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Reporting Frequency</label>
                  <select v-model="cadenceForm.frequency" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Reminder Day</label>
                  <select v-model.number="cadenceForm.dayOfWeek" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option :value="1">Monday</option>
                    <option :value="2">Tuesday</option>
                    <option :value="3">Wednesday</option>
                    <option :value="4">Thursday</option>
                    <option :value="5">Friday (Recommended)</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Hour (UTC)</label>
                  <UInput v-model.number="cadenceForm.hourUtc" type="number" min="0" max="23" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Notification Channel</label>
                  <select v-model="cadenceForm.reminderChannel" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="in_app">In-App Notification</option>
                    <option value="slack">Slack Channel / Bot</option>
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
              <label class="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" v-model="cadenceForm.isActive" class="size-4 rounded text-primary" />
                <span class="text-sm font-medium text-default">Enable Automated Periodic Reminders</span>
              </label>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openCadenceModal = false" />
              <UButton label="Save Cadence" color="primary" @click="saveCadence" />
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

const loading = ref(false)
const openReportModal = ref(false)
const openCadenceModal = ref(false)

const reports = ref<any[]>([])
const cadence = ref<any>(null)
const latestReport = computed(() => reports.value[0] || null)

const newReport = ref({
  overallHealth: 'green' as 'green' | 'amber' | 'red',
  stagegateHealth: 'green' as 'green' | 'amber' | 'red',
  budgetHealth: 'green' as 'green' | 'amber' | 'red',
  scheduleHealth: 'green' as 'green' | 'amber' | 'red',
  executiveSummary: '',
  keyAccomplishments: '',
  nextPeriodPlans: '',
  blockersRisks: '',
})

const cadenceForm = ref({
  frequency: 'weekly',
  dayOfWeek: 5,
  hourUtc: 14,
  reminderChannel: 'in_app',
  isActive: true,
})

function getDayName(day: number) {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days[day] || 'Friday'
}

function formatDate(val: any) {
  if (!val) return ''
  return new Date(val).toLocaleDateString()
}

function getRAGDotClass(val: string) {
  if (val === 'green') return 'bg-emerald-500'
  if (val === 'amber') return 'bg-amber-500'
  return 'bg-red-500'
}

function getRAGBadgeClass(val: string) {
  if (val === 'green') return 'bg-emerald-500/10 text-emerald-500'
  if (val === 'amber') return 'bg-amber-500/10 text-amber-500'
  return 'bg-red-500/10 text-red-500'
}

async function loadData() {
  if (!projectId.value) return
  loading.value = true
  try {
    const [repRes, cadRes] = await Promise.all([
      $api.get(`/module/progress-reports/projects/${projectId.value}/reports`),
      $api.get(`/module/progress-reports/projects/${projectId.value}/cadence`),
    ])
    reports.value = repRes.data?.response || []
    cadence.value = cadRes.data?.response
    if (cadence.value) {
      cadenceForm.value = { ...cadenceForm.value, ...cadence.value }
    }
  } catch (err) {
    console.error('Failed to load progress reports:', err)
  } finally {
    loading.value = false
  }
}

async function submitReport() {
  if (!newReport.value.executiveSummary || !projectId.value) return
  try {
    await $api.post('/module/progress-reports/reports', {
      goalId: projectId.value,
      ...newReport.value,
    })
    openReportModal.value = false
    newReport.value = {
      overallHealth: 'green',
      stagegateHealth: 'green',
      budgetHealth: 'green',
      scheduleHealth: 'green',
      executiveSummary: '',
      keyAccomplishments: '',
      nextPeriodPlans: '',
      blockersRisks: '',
    }
    await loadData()
  } catch (err) {
    console.error('Failed to submit report:', err)
  }
}

async function saveCadence() {
  if (!projectId.value) return
  try {
    await $api.put(`/module/progress-reports/projects/${projectId.value}/cadence`, cadenceForm.value)
    openCadenceModal.value = false
    await loadData()
  } catch (err) {
    console.error('Failed to save cadence:', err)
  }
}

async function sendReminderNow() {
  if (!projectId.value) return
  try {
    const res = await $api.post(`/module/progress-reports/projects/${projectId.value}/remind`)
    alert(res.data?.response?.message || 'Reminder dispatched to project lead!')
  } catch (err) {
    console.error('Failed to send reminder:', err)
  }
}

onMounted(() => {
  loadData()
})
</script>

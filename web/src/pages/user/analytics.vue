<template>
  <UDashboardPanel id="analytics">
    <template #header>
      <UDashboardNavbar :title="t('analytics.page.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="flex flex-col gap-6 p-2 lg:p-6">
        <AnalyticsFilters />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :title="errorMessage"
          icon="i-lucide-alert-triangle"
        />

        <UAlert
          v-else-if="analyticsStore.failedSectionIds.length > 0 && analyticsStore.sections.length > 0"
          color="warning"
          variant="soft"
          :title="t('analytics.page.partialFailure')"
          icon="i-lucide-alert-circle"
        />

        <AnalyticsSkeleton v-if="showSkeleton" />

        <template v-else-if="analyticsStore.sections.length > 0">
          <div
            v-if="analyticsStore.kpiSections.length > 0"
            class="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <AnalyticsKpiCard
              v-for="kpi in analyticsStore.kpiSections"
              :key="kpi.id"
              :section="kpi"
              @drill-down="onDrillDown"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnalyticsSectionCard
              v-for="section in analyticsStore.chartSections"
              :key="section.id"
              :section="section"
              @drill-down="onDrillDown"
            />
          </div>
        </template>

        <div
          v-else-if="showEmpty"
          class="flex flex-col items-center gap-3 py-16 text-center"
        >
          <UIcon name="i-lucide-bar-chart-3" class="size-12 text-zinc-400" />
          <p class="text-sm text-zinc-500">
            {{ emptyMessage }}
          </p>
        </div>
      </div>
      <AnalyticsDrillDownSlideover />
    </template>
  </UDashboardPanel>
</template>
<script setup lang="ts">
import type { AnalyticsPeriod } from 'taskview-api'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AnalyticsDrillDownSlideover from '@/components/features/analytics/AnalyticsDrillDownSlideover.vue'
import AnalyticsFilters from '@/components/features/analytics/AnalyticsFilters.vue'
import AnalyticsKpiCard from '@/components/features/analytics/AnalyticsKpiCard.vue'
import AnalyticsSectionCard from '@/components/features/analytics/AnalyticsSectionCard.vue'
import AnalyticsSkeleton from '@/components/features/analytics/AnalyticsSkeleton.vue'
import { useAnalyticsLocale } from '@/components/features/analytics/composables/useAnalyticsLocale'
import { useAnalyticsStore } from '@/stores/analytics.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'

const { t } = useI18n()
const { pick } = useAnalyticsLocale()
const analyticsStore = useAnalyticsStore()
const goalsStore = useGoalsStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()

const errorMessage = computed(() => {
  const e = analyticsStore.error
  if (!e) return null
  return t(`analytics.errors.${e.kind}`)
})

const showSkeleton = computed(() =>
  analyticsStore.loading && analyticsStore.sections.length === 0 && !analyticsStore.error,
)

const showEmpty = computed(() =>
  !analyticsStore.loading && !analyticsStore.error && analyticsStore.sections.length === 0,
)

const emptyMessage = computed(() => {
  const period = analyticsStore.period
  if (period === '7d' || period === '30d') {
    return t('analytics.page.emptyState')
  }
  return t('analytics.page.emptyStateForPeriod')
})

const NAMED_PERIODS = ['7d', '30d', '90d', '180d', '365d'] as const

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readPositiveInt(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function readIsoDate(value: unknown): string | null {
  const s = readString(value)
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? s : null
}

function applyQueryToStore() {
  const period = readString(route.query.period)
  if (period === 'custom') {
    const from = readIsoDate(route.query.from)
    const to = readIsoDate(route.query.to)
    if (from && to) {
      analyticsStore.period = 'custom'
      analyticsStore.customFrom = from
      analyticsStore.customTo = to
    }
  } else if (period && (NAMED_PERIODS as readonly string[]).includes(period)) {
    analyticsStore.period = period as AnalyticsPeriod
    analyticsStore.customFrom = null
    analyticsStore.customTo = null
  }

  const scope = readString(route.query.scope)
  if (scope === 'org') {
    analyticsStore.scope = { kind: 'org' }
  } else if (scope === 'project') {
    const goalId = readPositiveInt(route.query.goalId)
    if (goalId !== null) {
      analyticsStore.scope = { kind: 'project', goalId }
    }
  }
}

function buildQuery(): Record<string, string> {
  const q: Record<string, string> = { period: analyticsStore.period }
  if (analyticsStore.period === 'custom') {
    if (analyticsStore.customFrom) q.from = analyticsStore.customFrom
    if (analyticsStore.customTo) q.to = analyticsStore.customTo
  }
  if (analyticsStore.scope.kind === 'org') {
    q.scope = 'org'
  } else {
    q.scope = 'project'
    q.goalId = String(analyticsStore.scope.goalId)
  }
  return q
}

onMounted(async () => {
  applyQueryToStore()
  if (!goalsStore.goals?.length) {
    await goalsStore.fetchGoals?.()
  }
  await analyticsStore.fetchSections()
})

watch(
  [() => analyticsStore.period, () => analyticsStore.scope],
  () => {
    router.replace({ query: buildQuery() }).catch(() => {})
  },
  { deep: true },
)

watch(
  () => orgStore.currentOrg?.id,
  (newOrgId, oldOrgId) => {
    if (newOrgId === oldOrgId) return
    if (analyticsStore.scope.kind === 'project') {
      analyticsStore.scope = { kind: 'org' }
    }
    analyticsStore.fetchSections()
  },
)

function onDrillDown(payload: { sectionId: string; datasetId: string; bucket: string; index: number; meta?: Record<string, unknown> }) {
  const section = analyticsStore.sections.find(s => s.id === payload.sectionId)
  if (!section) return
  analyticsStore.openDrillDown({
    sectionId: payload.sectionId,
    sectionTitle: pick(section.title),
    bucket: payload.bucket,
    index: payload.index,
    datasetId: payload.datasetId,
    meta: payload.meta,
  })
}
</script>



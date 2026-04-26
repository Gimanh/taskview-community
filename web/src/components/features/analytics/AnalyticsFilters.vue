<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <USelectMenu
      :model-value="currentScopeValue"
      :items="scopeOptions"
      value-key="value"
      class="sm:w-64"
      @update:model-value="onScopeChange"
    />
    <USelectMenu
      :model-value="analyticsStore.period"
      :items="periodOptions"
      value-key="value"
      class="sm:w-40"
      @update:model-value="onPeriodChange"
    />
    <UButton
      icon="i-lucide-refresh-cw"
      variant="ghost"
      size="sm"
      :loading="analyticsStore.loading"
      @click="analyticsStore.fetchSections()"
    />
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsPeriod, AnalyticsScope } from 'taskview-api'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalyticsStore } from '@/stores/analytics.store'

const analyticsStore = useAnalyticsStore()
const { t } = useI18n()

const periodOptions = computed<{ label: string; value: AnalyticsPeriod }[]>(() => [
  { label: t('analytics.filters.periods.7d'), value: '7d' },
  { label: t('analytics.filters.periods.30d'), value: '30d' },
  { label: t('analytics.filters.periods.90d'), value: '90d' },
  { label: t('analytics.filters.periods.180d'), value: '180d' },
  { label: t('analytics.filters.periods.365d'), value: '365d' },
])

type ScopeOption = { label: string; value: string; scope: AnalyticsScope }

const scopeOptions = computed<ScopeOption[]>(() => {
  const base: ScopeOption[] = [
    { label: t('analytics.filters.scopes.org'), value: 'org', scope: { kind: 'org' } },
  ]
  const projects = analyticsStore.availableGoals.map(g => ({
    label: g.name,
    value: `project:${g.id}`,
    scope: { kind: 'project' as const, goalId: g.id },
  }))
  return [...base, ...projects]
})

const currentScopeValue = computed(() => {
  const s = analyticsStore.scope
  if (s.kind === 'org') return 'org'
  return `project:${s.goalId}`
})

function onScopeChange(value: string) {
  const option = scopeOptions.value.find(o => o.value === value)
  if (option) analyticsStore.setScope(option.scope)
}

function onPeriodChange(value: AnalyticsPeriod) {
  analyticsStore.setPeriod(value)
}
</script>



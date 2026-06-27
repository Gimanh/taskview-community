<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <USelectMenu
      :model-value="currentScopeValue"
      :items="scopeOptions"
      value-key="value"
      class="sm:w-64"
      size="xl"
      @update:model-value="onScopeChange"
    />

    <UPopover v-model:open="periodOpen">
      <UButton
        icon="i-lucide-calendar"
        :label="activatorLabel"
        color="neutral"
        variant="soft"
        class="sm:w-auto justify-start"
        :ui="{ leadingIcon: 'size-4.5' }"
      />

      <template #content>
        <div class="p-2 flex flex-col gap-2 w-72">
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="opt in periodOptions"
              :key="opt.value"
              :label="opt.label"
              color="neutral"
              :variant="analyticsStore.period === opt.value ? 'solid' : 'soft'"
              size="xs"
              @click="onPresetClick(opt.value)"
            />
          </div>

          <USeparator />

          <UCalendar
            :model-value="rangeModel"
            range
            :week-starts-on="weekStart"
            @update:model-value="onRangeSelect"
          />
        </div>
      </template>
    </UPopover>

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
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { useAnalyticsStore } from '@/stores/analytics.store'
import { useWeekStart } from '@/composables/useWeekStart'

const analyticsStore = useAnalyticsStore()
const { t } = useI18n()
const weekStart = useWeekStart()

const periodOpen = ref(false)

type DateRange = { start: DateValue | undefined; end: DateValue | undefined }

const periodOptions = computed<{ label: string; value: AnalyticsPeriod }[]>(() => [
  { label: t('analytics.filters.periods.month'), value: 'month' },
  { label: t('analytics.filters.periods.7d'), value: '7d' },
  { label: t('analytics.filters.periods.30d'), value: '30d' },
  { label: t('analytics.filters.periods.90d'), value: '90d' },
  { label: t('analytics.filters.periods.180d'), value: '180d' },
  { label: t('analytics.filters.periods.365d'), value: '365d' },
])

function isoToCalendarDate(iso: string): CalendarDate {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new CalendarDate(year, month, day)
}

// Parse a 'YYYY-MM-DD' as a local date (new Date(iso) would treat it as UTC).
function localDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Seed the calendar with the active range so the current selection is visible.
function rangeFromStore(): DateRange {
  const r = analyticsStore.range
  if (!r) return { start: undefined, end: undefined }
  return { start: isoToCalendarDate(r.from), end: isoToCalendarDate(r.to) }
}

const rangeModel = shallowRef<DateRange>(rangeFromStore())

// Reflect the resolved range whenever it changes (preset clicks, refresh).
watch(() => analyticsStore.range, () => {
  rangeModel.value = rangeFromStore()
})

// User picked a range in the calendar → switch to a custom period.
function onRangeSelect(value: DateRange | null) {
  rangeModel.value = value ?? { start: undefined, end: undefined }
  if (!value?.start || !value?.end) return
  analyticsStore.setCustomRange(value.start.toString().slice(0, 10), value.end.toString().slice(0, 10))
  periodOpen.value = false
}

const activatorLabel = computed(() => {
  if (analyticsStore.period !== 'custom') {
    return periodOptions.value.find(o => o.value === analyticsStore.period)?.label ?? ''
  }
  const r = analyticsStore.range
  if (!r) return t('analytics.filters.periods.custom')
  const from = useDateFormat(localDate(r.from), 'DD MMM YYYY').value
  const to = useDateFormat(localDate(r.to), 'DD MMM YYYY').value
  return `${from} — ${to}`
})

function onPresetClick(value: AnalyticsPeriod) {
  analyticsStore.setPeriod(value)
  periodOpen.value = false
}

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
</script>

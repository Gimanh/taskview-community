<template>
  <div class="flex flex-wrap items-center gap-2">
    <UPopover v-model:open="fromOpen">
      <UButton
        :label="formattedFrom"
        icon="i-lucide-calendar"
        color="neutral"
        variant="soft"
        size="lg"
        class="grow lg:grow-0"
        :ui="activatorStyle"
      />
      <template #content>
        <div class="p-2">
          <UCalendar
            v-model="fromDate"
            :max-value="toDate"
            :week-starts-on="weekStart"
          />
        </div>
      </template>
    </UPopover>

    <span class="text-muted text-sm">—</span>

    <UPopover v-model:open="toOpen">
      <UButton
        :label="formattedTo"
        icon="i-lucide-calendar-check"
        color="neutral"
        variant="soft"
        size="lg"
        class="grow lg:grow-0"
        :ui="activatorStyle"
      />
      <template #content>
        <div class="p-2">
          <UCalendar
            v-model="toDate"
            :min-value="fromDate"
            :week-starts-on="weekStart"
          />
        </div>
      </template>
    </UPopover>

    <div class="flex flex-col lg:flex-row w-full lg:w-auto gap-2">
      <USelectMenu
        v-if="availableProjects.length > 0"
        v-model="selectedGoalIds"
        :items="projectOptions"
        multiple
        :placeholder="t('timeTracking.reports.allProjects')"
        class="lg:min-w-56 w-full lg:w-auto"
        size="lg"
      />

      <USelectMenu
        v-if="canFilterByUser && contributorOptions.length > 0"
        v-model="selectedUser"
        :items="contributorOptions"
        :placeholder="t('timeTracking.reports.allUsers')"
        class="lg:min-w-56 w-full lg:w-auto"
        size="lg"
      />
    </div>
    

    <UCheckbox
      v-model="billableOnly"
      :label="t('timeTracking.reports.billableOnly')"
      :ui="{root: 'items-center'}"
    />

    <UButton
      v-if="selectedUser"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="t('timeTracking.reports.clearUser')"
      @click="store.setUserId(null)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import type { GoalItem } from 'taskview-api'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import { useWeekStart } from '@/composables/useWeekStart'

const weekStart = useWeekStart()

const props = defineProps<{
  availableProjects: GoalItem[]
  canFilterByUser: boolean
}>()

const { t } = useI18n()
const store = useTimeReportsStore()
const { filters, contributors } = storeToRefs(store)

const fromOpen = ref(false)
const toOpen = ref(false)

const activatorStyle = {
  leadingIcon: 'size-4.5',
}

const isoToCalendarDate = (iso: string): CalendarDate => {
  const d = new Date(iso)
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const calendarDateToStartOfDayIso = (d: CalendarDate): string =>
  new Date(d.year, d.month - 1, d.day, 0, 0, 0, 0).toISOString()

const calendarDateToEndOfDayIso = (d: CalendarDate): string =>
  new Date(d.year, d.month - 1, d.day, 23, 59, 59, 999).toISOString()

const fromDate = computed<CalendarDate>({
  get: () => isoToCalendarDate(filters.value.from),
  set: (v) => store.setPeriod(calendarDateToStartOfDayIso(v), filters.value.to),
})

const toDate = computed<CalendarDate>({
  get: () => isoToCalendarDate(filters.value.to),
  set: (v) => store.setPeriod(filters.value.from, calendarDateToEndOfDayIso(v)),
})

const formattedFrom = computed(() => useDateFormat(new Date(filters.value.from), 'DD MMM YYYY').value)
const formattedTo = computed(() => useDateFormat(new Date(filters.value.to), 'DD MMM YYYY').value)

const projectOptions = computed(() =>
  props.availableProjects.map((p) => ({ label: p.name, value: p.id })),
)

const selectedGoalIds = computed({
  get: () => projectOptions.value.filter((o) => filters.value.goalIds.includes(o.value)),
  set: (v) => store.setGoalIds(v.map((o) => o.value)),
})

const contributorOptions = computed(() =>
  contributors.value.map((c) => ({
    label: c.userEmail ?? `User #${c.userId}`,
    value: c.userId,
  })),
)

const selectedUser = computed({
  get: () => contributorOptions.value.find((o) => o.value === filters.value.userId),
  set: (v) => store.setUserId(v?.value ?? null),
})

const billableOnly = computed({
  get: () => filters.value.billable === true,
  set: (v) => store.setBillable(v ? true : null),
})

watch(
  () => [
    filters.value.organizationId,
    filters.value.from,
    filters.value.to,
    filters.value.goalIds,
    filters.value.userId,
    filters.value.billable,
  ],
  () => {
    if (!store.initialized) return
    store.refreshAll()
  },
  { deep: true },
)
</script>

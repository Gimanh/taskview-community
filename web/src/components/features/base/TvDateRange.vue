<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{ content: 'rounded-2xl' }"
  >
    <UButton
      :disabled="disabled"
      color="neutral"
      variant="soft"
      block
      size="xl"
      icon="i-lucide-calendar"
      :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :ui="activatorUi('text-muted')"
    >
      <span class="flex-1 flex items-center gap-2 text-left font-medium">
        <template v-if="isRange">
          <span :class="model?.start ? '' : 'text-muted'">{{ startLabel }}</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5 shrink-0 text-dimmed"
          />
          <span :class="model?.end ? '' : 'text-muted'">{{ endLabel }}</span>
        </template>
        <span
          v-else
          :class="model?.end ? '' : 'text-muted'"
        >{{ endLabel }}</span>
      </span>
    </UButton>

    <template #content>
      <div class="flex flex-col gap-3 p-3">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="q in quickRanges"
            :key="q.key"
            color="neutral"
            variant="soft"
            size="xs"
            :label="q.label"
            @click="applyQuick(q.key)"
          />
        </div>

        <UCalendar
          v-if="isRange"
          v-model="rangeModel"
          range
          :week-starts-on="weekStart"
        />
        <UCalendar
          v-else
          v-model="singleModel"
          :week-starts-on="weekStart"
        />

        <div class="flex items-center justify-between gap-2 pt-1">
          <UCheckbox
            v-model="isRange"
            size="md"
            :ui="{ root: 'items-center' }"
            :label="t('deadline.selectRange')"
          />
          <UButton
            v-if="model?.start || model?.end"
            icon="i-lucide-x"
            :label="t('common.delete')"
            color="error"
            variant="ghost"
            size="sm"
            @click="clear"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import {
  type CalendarDate,
  today,
  getLocalTimeZone,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from '@internationalized/date'
import { useWeekStart } from '@/composables/useWeekStart'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'
import type { DateRangeValue } from '@/types/tvDate.types'

const model = defineModel<DateRangeValue>()

const { disabled = false } = defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()
const weekStart = useWeekStart()
const { activatorUi } = useNuxtUiTaskItemStyles()

const open = ref(false)
const isRange = ref(false)

// drop the start date when switching back to single-date mode
watch(isRange, (on) => {
  if (!on && model.value?.start) {
    model.value = { start: undefined, end: model.value.end }
  }
})

// single-date mode fills the END date (the deadline)
const singleModel = computed<CalendarDate | undefined>({
  get: () => model.value?.end,
  set: (date) => {
    model.value = { start: undefined, end: date }
    if (date) open.value = false
  },
})

const rangeModel = computed<DateRangeValue>({
  get: () => ({ start: model.value?.start, end: model.value?.end }),
  set: (value) => {
    model.value = value ?? null
    if (value?.start && value?.end) open.value = false
  },
})

const format = (date?: CalendarDate): string =>
  date ? useDateFormat(new Date(date.toString()), 'DD MMM').value : ''

const startLabel = computed(() => model.value?.start ? format(model.value.start) : t('deadline.startDate'))
const endLabel = computed(() => {
  if (model.value?.end) return format(model.value.end)
  return isRange.value ? t('deadline.endDate') : t('tasks.deadline')
})

type QuickKey = 'today' | 'tomorrow' | 'week' | 'month'

const quickRanges = computed<{ key: QuickKey, label: string }[]>(() => [
  { key: 'today', label: t('deadline.today') },
  { key: 'tomorrow', label: t('deadline.tomorrow') },
  { key: 'week', label: t('deadline.thisWeek') },
  { key: 'month', label: t('deadline.thisMonth') },
])

function applyQuick(key: QuickKey) {
  const t0 = today(getLocalTimeZone())
  if (key === 'today') commit(t0, t0)
  else if (key === 'tomorrow') {
    const d = t0.add({ days: 1 })
    commit(d, d)
  }
  else if (key === 'week') commit(startOfWeek(t0, 'ru-RU'), endOfWeek(t0, 'ru-RU'))
  else commit(startOfMonth(t0), endOfMonth(t0))
}

// in single mode keep only the end date; in range mode keep both
function commit(start: CalendarDate, end: CalendarDate) {
  model.value = isRange.value ? { start, end } : { start: undefined, end }
  open.value = false
}

function clear() {
  model.value = null
}
</script>

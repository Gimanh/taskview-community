<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('sprints.fields.name')">
      <UInput
        v-model="model.name"
        :placeholder="t('sprints.fields.namePlaceholder')"
        autofocus
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sprints.fields.goal')">
      <UTextarea
        v-model="model.goalText"
        :placeholder="t('sprints.fields.goalPlaceholder')"
        :rows="2"
        class="w-full"
      />
    </UFormField>

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('sprints.fields.startDate')"
        class="flex-1"
      >
        <UPopover v-model:open="startOpen">
          <UButton
            icon="i-lucide-calendar"
            :label="formattedStart"
            color="neutral"
            variant="outline"
            class="w-full justify-start"
          />
          <template #content>
            <UCalendar
              v-model="startDateModel"
              :max-value="endDateModel"
              :week-starts-on="weekStart"
              class="p-2"
            />
          </template>
        </UPopover>
      </UFormField>

      <UFormField
        :label="t('sprints.fields.endDate')"
        class="flex-1"
      >
        <UPopover v-model:open="endOpen">
          <UButton
            icon="i-lucide-calendar-check"
            :label="formattedEnd"
            color="neutral"
            variant="outline"
            class="w-full justify-start"
          />
          <template #content>
            <UCalendar
              v-model="endDateModel"
              :min-value="startDateModel"
              :week-starts-on="weekStart"
              class="p-2"
            />
          </template>
        </UPopover>
      </UFormField>
    </div>

    <UFormField :label="t('sprints.fields.capacity')">
      <UInput
        v-model="capacityModel"
        type="number"
        min="0"
        step="1"
        :placeholder="t('sprints.fields.capacityPlaceholder')"
        class="w-full"
      >
        <template #trailing>
          <span class="text-xs text-dimmed">{{ unitLabel(unit, true) }}</span>
        </template>
      </UInput>
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      />
      <UButton
        :label="submitLabel"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import { useSprintFormat, type EstimateUnit } from '../composables/useSprintFormat'
import { useWeekStart } from '@/composables/useWeekStart'
import type { SprintFormValue } from '@/types/sprints.types'

const weekStart = useWeekStart()

const model = defineModel<SprintFormValue>({ required: true })

const props = withDefaults(
  defineProps<{
    submitLabel: string
    loading?: boolean
    unit?: EstimateUnit
  }>(),
  {
    unit: 'points',
  },
)

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const { t } = useI18n()
const { unitLabel } = useSprintFormat()

const unit = computed(() => props.unit)

const startOpen = ref(false)
const endOpen = ref(false)

function toCalendarDate(value: string | null): CalendarDate | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new CalendarDate(year, month, day)
}

const startDateModel = shallowRef<CalendarDate | undefined>(toCalendarDate(model.value.startDate))
const endDateModel = shallowRef<CalendarDate | undefined>(toCalendarDate(model.value.endDate))

watch(startDateModel, (value) => {
  model.value.startDate = value ? value.toString() : null
  if (value) startOpen.value = false
})
watch(endDateModel, (value) => {
  model.value.endDate = value ? value.toString() : null
  if (value) endOpen.value = false
})

watch(
  () => [model.value.startDate, model.value.endDate],
  ([start, end]) => {
    const nextStart = toCalendarDate(start)
    const nextEnd = toCalendarDate(end)
    if (nextStart?.toString() !== startDateModel.value?.toString()) startDateModel.value = nextStart
    if (nextEnd?.toString() !== endDateModel.value?.toString()) endDateModel.value = nextEnd
  },
)

const capacityModel = computed({
  get: () => (model.value.capacity === null ? '' : String(model.value.capacity)),
  set: (value: string) => {
    const trimmed = String(value).trim()
    model.value.capacity = trimmed === '' ? null : Number(trimmed)
  },
})

const formattedStart = computed(() =>
  startDateModel.value
    ? useDateFormat(new Date(startDateModel.value.toString()), 'DD MMM YYYY').value
    : t('sprints.fields.startDate'),
)
const formattedEnd = computed(() =>
  endDateModel.value
    ? useDateFormat(new Date(endDateModel.value.toString()), 'DD MMM YYYY').value
    : t('sprints.fields.endDate'),
)

const canSubmit = computed(
  () => model.value.name.trim().length > 0 && !!model.value.startDate && !!model.value.endDate,
)

function submit() {
  if (!canSubmit.value) return
  emit('submit')
}
</script>

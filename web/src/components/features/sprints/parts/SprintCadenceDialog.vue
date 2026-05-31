<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ t('sprints.cadence.title') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted">
            {{ t('sprints.cadence.description') }}
          </p>

          <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
            <div class="flex flex-col">
              <span class="font-medium">{{ t('sprints.cadence.enable') }}</span>
              <span class="text-xs text-dimmed">{{ t('sprints.cadence.enableHint') }}</span>
            </div>
            <USwitch v-model="form.enabled" />
          </div>

          <template v-if="form.enabled">
            <UFormField :label="t('sprints.cadence.length')">
              <USelect
                v-model="form.lengthWeeks"
                :items="lengthOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('sprints.cadence.startDate')">
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
                    class="p-2"
                  />
                </template>
              </UPopover>
              <p class="mt-1 text-xs text-dimmed">
                {{ t('sprints.cadence.startDateHint') }}
              </p>
            </UFormField>

            <UFormField :label="t('sprints.cadence.lookahead')">
              <USelect
                v-model="form.lookahead"
                :items="lookaheadOptions"
                class="w-full"
              />
              <p class="mt-1 text-xs text-dimmed">
                {{ t('sprints.cadence.lookaheadHint') }}
              </p>
            </UFormField>

            <UFormField :label="t('sprints.cadence.nameTemplate')">
              <UInput
                v-model="form.nameTemplate"
                :placeholder="'Sprint {n}'"
                class="w-full"
              />
              <p class="mt-1 text-xs text-dimmed">
                {{ t('sprints.cadence.nameTemplateHint') }}
              </p>
            </UFormField>
          </template>

          <div class="flex justify-end gap-2">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="t('common.save')"
              :loading="loading"
              :disabled="!canSubmit"
              @click="submit"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintsStore } from '@/stores/sprints.store'
import type { SprintCadenceFormValue } from '@/types/sprints.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  goalId: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const sprintsStore = useSprintsStore()

const loading = ref(false)
const startOpen = ref(false)

const lengthOptions = computed(() =>
  [1, 2, 3, 4].map((weeks) => ({ label: t('sprints.cadence.weeks', weeks), value: weeks })),
)
const lookaheadOptions = computed(() =>
  [1, 2, 3, 4, 5, 6].map((n) => ({ label: String(n), value: n })),
)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultForm(): SprintCadenceFormValue {
  return { enabled: false, lengthWeeks: 2, startDate: today(), lookahead: 2, nameTemplate: 'Sprint {n}' }
}

const form = ref<SprintCadenceFormValue>(defaultForm())

function toCalendarDate(value: string | null): CalendarDate | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new CalendarDate(year, month, day)
}

const startDateModel = shallowRef<CalendarDate | undefined>(toCalendarDate(form.value.startDate))

watch(startDateModel, (value) => {
  form.value.startDate = value ? value.toString() : null
  if (value) startOpen.value = false
})

const formattedStart = computed(() =>
  startDateModel.value
    ? useDateFormat(new Date(startDateModel.value.toString()), 'DD MMM YYYY').value
    : t('sprints.cadence.startDate'),
)

const canSubmit = computed(() => !form.value.enabled || (!!form.value.startDate && form.value.lengthWeeks > 0))

watch(open, async (value) => {
  if (!value) return
  await sprintsStore.fetchCadence(props.goalId)
  const c = sprintsStore.cadence
  form.value = c
    ? {
      enabled: c.enabled,
      lengthWeeks: Math.max(1, Math.round(c.lengthDays / 7)),
      startDate: c.startDate,
      lookahead: c.lookahead,
      nameTemplate: c.nameTemplate,
    }
    : defaultForm()
  startDateModel.value = toCalendarDate(form.value.startDate)
})

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    const saved = await sprintsStore.saveCadence({
      goalId: props.goalId,
      enabled: form.value.enabled,
      lengthDays: form.value.lengthWeeks * 7,
      startDate: form.value.startDate ?? today(),
      lookahead: form.value.lookahead,
      nameTemplate: form.value.nameTemplate.trim() || 'Sprint {n}',
    })
    if (saved) {
      toast.add({ title: t('sprints.cadence.saved'), color: 'success' })
      emit('saved')
      open.value = false
    }
  } finally {
    loading.value = false
  }
}
</script>

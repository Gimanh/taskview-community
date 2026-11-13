<template>
  <UModal
    v-model:open="open"
    :title="t('calendar.add.title')"
    :description="when"
    :fullscreen="isMobile"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput
        v-model="description"
        :placeholder="t('tasks.addPlaceholder')"
        autofocus
        size="xl"
        class="w-full"
        data-testid="calendar-add-input"
        @keyup.enter="submit"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="open = false"
      />
      <UButton
        :label="t('calendar.add.submit')"
        :loading="saving"
        :disabled="!description.trim()"
        variant="soft"
        data-testid="calendar-add-submit"
        @click="submit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCalendarStore } from '@/stores/calendar.store'
import { useTaskView } from '@/composables/useTaskView'
import { calendarSpanLabel, spanTaskDates, type CalendarSpan } from '@/helpers/taskCalendarDates'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ goalId: number; span: CalendarSpan | null }>()

const { t, locale } = useI18n()
const toast = useToast()
const calendarStore = useCalendarStore()
const { isMobile } = useTaskView()

const description = ref('')
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) description.value = ''
})

const when = computed(() => (props.span ? calendarSpanLabel({ span: props.span, locale: locale.value }) : ''))

async function submit() {
  const name = description.value.trim()
  if (!name || !props.span || saving.value) return
  saving.value = true
  const created = await calendarStore.addTask({ goalId: props.goalId, description: name, ...spanTaskDates(props.span) })
  saving.value = false
  if (!created) {
    toast.add({ title: t('calendar.add.error'), color: 'error' })
    return
  }
  open.value = false
}
</script>

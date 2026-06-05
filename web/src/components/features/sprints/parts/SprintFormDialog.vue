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
              {{ isEdit ? t('sprints.editTitle') : t('sprints.create') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <SprintForm
          v-model="formValue"
          :submit-label="isEdit ? t('common.save') : t('sprints.create')"
          :loading="loading"
          :unit="unit"
          @submit="submit"
          @cancel="open = false"
        />
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint } from 'taskview-api'
import SprintForm from './SprintForm.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintsStore } from '@/stores/sprints.store'
import { useGoalsStore } from '@/stores/goals.store'
import type { SprintFormValue } from '@/types/sprints.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  goalId: number
  sprint?: Sprint | null
}>()

const emit = defineEmits<{
  saved: [sprint: Sprint]
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const sprintsStore = useSprintsStore()
const goalsStore = useGoalsStore()

const loading = ref(false)
const isEdit = computed(() => !!props.sprint)
const unit = computed(() => goalsStore.goalMap.get(props.goalId)?.estimateUnit ?? 'points')

function emptyValue(): SprintFormValue {
  return { name: '', goalText: '', startDate: null, endDate: null, capacity: null }
}

function fromSprint(sprint: Sprint): SprintFormValue {
  return {
    name: sprint.name,
    goalText: sprint.goalText ?? '',
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    capacity: sprint.capacity === null ? null : Number(sprint.capacity),
  }
}

const formValue = ref<SprintFormValue>(props.sprint ? fromSprint(props.sprint) : emptyValue())

watch(open, (value) => {
  if (value) {
    formValue.value = props.sprint ? fromSprint(props.sprint) : emptyValue()
  }
})

async function submit() {
  loading.value = true
  try {
    const payload = {
      name: formValue.value.name.trim(),
      startDate: formValue.value.startDate as string,
      endDate: formValue.value.endDate as string,
      goalText: formValue.value.goalText.trim() || null,
      capacity: formValue.value.capacity,
    }

    const sprint = isEdit.value && props.sprint
      ? await sprintsStore.updateSprint({ sprintId: props.sprint.id, ...payload })
      : await sprintsStore.createSprint({ goalId: props.goalId, ...payload })

    if (sprint) {
      toast.add({ title: t(isEdit.value ? 'sprints.toasts.updated' : 'sprints.toasts.created'), color: 'success' })
      emit('saved', sprint)
      open.value = false
    }
  } finally {
    loading.value = false
  }
}
</script>

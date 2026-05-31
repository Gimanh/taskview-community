<template>
  <SprintForm
    v-model="model"
    :submit-label="t('common.save')"
    :loading="loading"
    @submit="emit('submit')"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SprintForm from './SprintForm.vue'
import type { SprintFormValue } from '@/types/sprints.types'

const model = defineModel<SprintFormValue>({ required: true })

defineProps<{ loading?: boolean }>()

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const { t } = useI18n()
</script>

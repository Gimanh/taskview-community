<template>
  <TvDropdown
    v-model="model"
    :items="options"
    :with-activator="withActivator"
    :disabled="disabled"
    :placeholder="t('tasks.selectStatus')"
    placeholder-icon="i-lucide-columns-3"
    activator-icon="i-lucide-columns-3"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvDropdown from '@/components/features/base/TvDropdown.vue'
import { useKanbanStatusOptions, type StatusValue } from '@/composables/useKanbanStatusOptions'

const model = defineModel<StatusValue>()

const { withActivator = true, disabled = false } = defineProps<{
  withActivator?: boolean
  disabled?: boolean
}>()

const { t } = useI18n()
const { options } = useKanbanStatusOptions()
</script>

<template>
  <TvDropdown
    v-model="model"
    :items="options"
    :with-activator="withActivator"
    :disabled="disabled"
    :placeholder="t('tasks.priority')"
    placeholder-icon="i-lucide-flag"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvDropdown from '@/components/features/base/TvDropdown.vue'
import { usePriorityOptions, type PriorityValue } from '@/composables/usePriorityOptions'

const model = defineModel<PriorityValue>()

const { withActivator = true, disabled = false } = defineProps<{
  withActivator?: boolean
  disabled?: boolean
}>()

const { t } = useI18n()
const { options } = usePriorityOptions()
</script>

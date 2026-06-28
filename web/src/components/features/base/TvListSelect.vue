<template>
  <TvDropdown
    v-model="model"
    :items="options"
    :with-activator="withActivator"
    :disabled="disabled"
    :placeholder="t('tasks.noList')"
    placeholder-icon="i-lucide-inbox"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvDropdown from '@/components/features/base/TvDropdown.vue'
import { useGoalListOptions, type ListValue } from '@/composables/useGoalListOptions'

const model = defineModel<ListValue>()

const { withActivator = true, disabled = false } = defineProps<{
  withActivator?: boolean
  disabled?: boolean
}>()

const { t } = useI18n()
const { options } = useGoalListOptions()
</script>

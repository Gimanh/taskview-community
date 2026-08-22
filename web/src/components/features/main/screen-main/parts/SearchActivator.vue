<template>
  <UDashboardSearchButton
    :label="t('admin.search')"
    :disabled="!hasActiveGoals"
    class="w-full"
    variant="soft"
    size="xl"
  />
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'

const { t } = useI18n()
const { hasActiveGoals } = useTaskView()
</script>

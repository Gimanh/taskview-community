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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalsStore } from '@/stores/goals.store'

const { t } = useI18n()
const goalsStore = useGoalsStore()
const hasActiveGoals = computed(() => goalsStore.goals.length > 0)
</script>

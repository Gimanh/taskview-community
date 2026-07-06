<template>
  <TvGoalLikeItem
    v-for="link in links"
    :key="link.name"
    variant="taskview"
    :to="{ name: link.name }"
    :active="route.name === link.name"
  >
    <div class="flex items-center gap-2 w-full">
      <UIcon
        :name="link.icon"
        class="size-4 shrink-0"
      />
      <span>{{ link.label }}</span>
    </div>
  </TvGoalLikeItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'

const { t } = useI18n()
const route = useRoute()

const links = computed(() => [
  { name: 'analytics', icon: 'i-lucide-bar-chart-3', label: t('userMenu.analytics') },
  { name: 'time-reports', icon: 'i-lucide-clock-4', label: t('userMenu.timeReports') },
])
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-default pb-safe">
    <div class="flex items-center justify-between min-h-14">
      <UButton
        v-for="item in navItems"
        :key="item.label"
        :icon="item.icon"
        :to="item.to"
        color="neutral"
        variant="ghost"
        size="lg"
        class="flex-1 h-full rounded-none"
        :class="{ 'text-primary': item.active?.() }"
        :ui="{
          base: ' justify-center',
        }"
        @click="item.onClick?.()"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDashboard } from '@/composables/useDashboard'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { ALL_TASKS_LIST_ID } from 'taskview-api'

const route = useRoute()
const { t } = useI18n()
const { isSidebarOpen } = useDashboard()
const { isUserRoute, isAccountRoute, hasProject, projectId, hasList } = useAppRouteInfo()

const navItems = computed(() => {
  if (isAccountRoute.value) {
    return [
      {
        label: t('main'),
        icon: 'i-lucide-house',
        to: { name: 'user' },
        active: (): boolean => false,
      },
    ]
  }

  if (isUserRoute.value && !hasProject.value) {
    return [
      {
        label: t('projects.title'),
        icon: 'i-lucide-folder',
        active: (): boolean => isSidebarOpen.value,
        onClick: () => { isSidebarOpen.value = !isSidebarOpen.value },
      },
      {
        label: t('account.title'),
        icon: 'i-lucide-settings',
        to: { name: 'account' },
        active: (): boolean => false,
      },
    ]
  }

  return [
    {
      label: t('main'),
      icon: 'i-lucide-house',
      to: { name: 'user' },
      active: (): boolean => false,
    },
    {
      label: t('projects.title'),
      icon: 'i-lucide-folder',
      active: (): boolean => isSidebarOpen.value,
      onClick: () => { isSidebarOpen.value = !isSidebarOpen.value },
    },
    {
      label: t('projects.kanban'),
      icon: 'i-lucide-kanban',
      to: { name: 'kanban', params: { projectId: projectId.value } },
      active: (): boolean => route.name === 'kanban',
    },
    {
      label: t('projects.graph'),
      icon: 'i-lucide-git-fork',
      to: { name: 'graph', params: { projectId: projectId.value } },
      active: (): boolean => route.name === 'graph',
    },
    {
      label: t('projects.collaboration'),
      icon: 'i-lucide-users',
      to: { name: 'collaboration', params: { projectId: projectId.value } },
      active: (): boolean => route.name === 'collaboration',
    },
    {
      label: t('lists.title'),
      icon: 'i-lucide-list',
      to: { name: 'user', params: { projectId: projectId.value } },
      active: (): boolean => isUserRoute.value && hasProject.value && !hasList.value,
    },
    {
      label: t('tasks.allTasks'),
      icon: 'i-lucide-list-checks',
      to: { name: 'user', params: { projectId: projectId.value, listId: ALL_TASKS_LIST_ID } },
      active: (): boolean => isUserRoute.value && hasList.value,
    },
  ]
})
</script>

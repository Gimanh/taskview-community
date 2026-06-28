<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-default pb-safe bg-default">
    <div class="flex items-stretch justify-around min-h-16 gap-1 p-1.5">
      <UButton
        v-for="item in navItems"
        :key="item.key"
        :icon="item.icon"
        :label="item.label"
        :color="item.active() ? 'primary' : 'neutral'"
        :variant="item.active() ? 'soft' : 'ghost'"
        block
        class="flex-1 min-w-0"
        :ui="{
          base: 'flex-col gap-1 py-1.5 rounded-xl',
          leadingIcon: 'size-5',
          label: 'text-[11px] leading-none truncate max-w-full',
        }"
        @click="onItemClick(item)"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDashboard } from '@/composables/useDashboard'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'

type NavItem = {
  key: string
  label: string
  icon: string
  to?: RouteLocationRaw
  active: () => boolean
  onClick?: () => void
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { isSidebarOpen } = useDashboard()
const { isUserRoute, isAccountRoute, hasProject, projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()

const currentGoal = computed(() =>
  hasProject.value ? goalsStore.goalMap.get(projectId.value) ?? null : null,
)
const { canViewKanban, canViewGraph } = useGoalPermissionsFor(currentGoal)

// A stable core (Home · Projects · … · Account) keeps tab positions predictable
// across routes; project shortcuts (Kanban/Graph) only slot in when inside a
// project and the user is allowed to see them.
const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      key: 'home',
      label: t('main'),
      icon: 'i-lucide-house',
      to: { name: 'user' },
      active: () => isUserRoute.value && !hasProject.value,
    },
    {
      key: 'projects',
      label: t('projects.title'),
      icon: 'i-lucide-panel-left',
      active: () => isSidebarOpen.value,
      onClick: () => { isSidebarOpen.value = !isSidebarOpen.value },
    },
  ]

  if (hasProject.value) {
    if (canViewKanban.value) {
      items.push({
        key: 'kanban',
        label: t('contextMenu.kanban'),
        icon: 'i-lucide-kanban',
        to: { name: 'kanban', params: { projectId: projectId.value } },
        active: () => route.name === 'kanban',
      })
    }
    if (canViewGraph.value) {
      items.push({
        key: 'graph',
        label: t('contextMenu.graph'),
        icon: 'i-lucide-git-fork',
        to: { name: 'graph', params: { projectId: projectId.value } },
        active: () => route.name === 'graph',
      })
    }
    items.push({
      key: 'list',
      label: t('contextMenu.tasks'),
      icon: 'i-lucide-list',
      to: { name: 'user', params: { projectId: projectId.value, listId: ALL_TASKS_LIST_ID } },
      active: () => isUserRoute.value && hasProject.value,
    })
  }

  // Inside a project the bar fills up with project shortcuts (List/Kanban/Graph),
  // so drop Settings there — it stays reachable from the global tabs.
  if (!hasProject.value) {
    items.push({
      key: 'account',
      label: t('account.nav'),
      icon: 'i-lucide-settings',
      to: { name: 'account' },
      active: () => isAccountRoute.value,
    })
  }

  return items
})

function onItemClick(item: NavItem) {
  if (item.onClick) {
    item.onClick()
    return
  }
  if (item.to) router.push(item.to)
}
</script>

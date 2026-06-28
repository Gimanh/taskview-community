<template>
  <TvGoalLikeItem
    v-if="inbox"
    variant="taskview"
    :to="{ name: 'user', params: { projectId: inbox.id, listId: ALL_TASKS_LIST_ID } }"
    :active="currentProjectId === inbox.id"
  >
    <div
      class="flex items-center gap-2 w-full"
      data-testid="sidebar-inbox-link"
    >
      <UIcon
        name="i-lucide-inbox"
        class="size-4 shrink-0"
      />
      <span>{{ t('projects.inbox') }}</span>
    </div>
  </TvGoalLikeItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useInbox } from '@/composables/useInbox'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'

const { t } = useI18n()
const route = useRoute()
const { inbox } = useInbox()

const currentProjectId = computed(() => Number(route.params.projectId) || null)
</script>

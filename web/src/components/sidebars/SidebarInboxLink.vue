<template>
  <TvGoalLikeItem
    v-if="link"
    variant="taskview"
    :to="link"
    :active="currentProjectId === inboxId"
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
import { useSidebarInboxLink } from '@/composables/useSidebarInboxLink'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'

const { t } = useI18n()
const route = useRoute()
const { link, inboxId } = useSidebarInboxLink()

const currentProjectId = computed(() => Number(route.params.projectId) || null)
</script>

<template>
  <UButton
    v-if="project"
    :to="projectRoute(project)"
    variant="link"
    color="neutral"
    size="sm"
    class="text-muted hover:text-default min-w-0"
    :data-project-color="color ?? undefined"
    data-testid="task-detail-project"
  >
    <template #leading>
      <UIcon
        :name="isOwnInbox(project) ? 'i-lucide-inbox' : 'i-lucide-folder'"
        class="size-4 shrink-0"
        :style="color ? { color } : undefined"
      />
    </template>
    <span class="truncate">{{ isOwnInbox(project) ? t('projects.inbox') : project.name }}</span>
  </UButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalsStore } from '@/stores/goals.store'
import { useInbox } from '@/composables/useInbox'
import { useProjectRoute } from '@/composables/useProjectRoute'
import { projectColor } from '@/helpers/color'

const props = defineProps<{
  goalId: number
}>()

const { t } = useI18n()
const goalsStore = useGoalsStore()
const { isOwnInbox } = useInbox()
const { projectRoute } = useProjectRoute()

const project = computed(() => goalsStore.goalMap.get(props.goalId) ?? null)
const color = computed(() => (project.value && !isOwnInbox(project.value) ? projectColor(project.value) : null))
</script>

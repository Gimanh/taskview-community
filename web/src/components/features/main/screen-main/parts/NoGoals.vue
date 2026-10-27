<template>
  <div
    v-if="noGoals"
    class="text-center p-5 rounded-md w-full"
  >
    <UAlert
      color="info"
      :title="t('msg.addFirstProject')"
      variant="subtle"
      icon="i-lucide-terminal"
      class="mb-4"
    />
    <ProjectAddInput @add="addProject" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import ProjectAddInput from '@/components/features/projects/parts/ProjectAddInput.vue'
import { useGoalsStore } from '@/stores/goals.store'
import { useInbox } from '@/composables/useInbox'
import { useI18n } from 'vue-i18n'

const goalsStore = useGoalsStore()
const { isOwnInbox } = useInbox()

const { t } = useI18n()
const noGoals = computed(() => goalsStore.goals.filter((g) => !g.archive && !isOwnInbox(g)).length === 0)

async function addProject(name: string) {
  await goalsStore.addGoal({ name })
}
</script>

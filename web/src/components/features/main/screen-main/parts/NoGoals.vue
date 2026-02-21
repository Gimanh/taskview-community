<template>
  <div
    v-if="noGoals"
    class="text-center p-5 rounded-md w-full"
  >
    <UAlert
      color="info"
      :title="$t('msg.addFirstProject')"
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

const goalsStore = useGoalsStore()

const noGoals = computed(() => goalsStore.goals.filter((g) => !g.archive).length === 0)

async function addProject(name: string) {
  await goalsStore.addGoal({ name })
}
</script>

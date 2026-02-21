<template>
  <div class="tv-kanban__col">
    <div class="w-full flex flex-col gap-3">
      <UInput
        v-model="statusName"
        :placeholder="t('kanban.addColumn')"
        icon="i-lucide-plus"
        size="xl"
        class="h-full max-w-[340px] min-w-[272px] bg-neutral-800 flex flex-col w-[91.666667%] rounded-lg"
      />

      <UButton
        v-if="statusName.trim()"
        @click="addStatus"
      >
        {{ t('kanban.addColumn') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GoalItem } from 'taskview-api'
import { useKanbanStore } from '@/stores/kanban.store'

const props = defineProps<{ goalId: GoalItem['id'] }>()

const { t } = useI18n()
const kanbanStore = useKanbanStore()
const statusName = ref('')

async function addStatus() {
  await kanbanStore.addStatus({ goalId: props.goalId, name: statusName.value })
  statusName.value = ''
}
</script>

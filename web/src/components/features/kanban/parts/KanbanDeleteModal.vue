<template>
  <UModal v-model:open="model">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ t('kanban.deleteColumn') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="model = false"
            />
          </div>
        </template>

        <p class="text-muted">
          {{ t('kanban.deleteColumnConfirm') }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="model = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              @click="confirmDelete"
            >
              {{ t('common.delete') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { KanbanColumnItem } from 'taskview-api'
import { useKanbanStore } from '@/stores/kanban.store'

const props = defineProps<{ status: KanbanColumnItem }>()

const model = defineModel<boolean>({ required: true })

const { t } = useI18n()
const store = useKanbanStore()

async function confirmDelete() {
  await store.deleteStatus({ id: props.status.id })
  model.value = false
}
</script>

<template>
  <UModal v-model:open="model">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ t('kanban.editColumn') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="model = false"
            />
          </div>
        </template>

        <UFormField :label="t('kanban.columnName')">
          <UInput
            v-model="name"
            :placeholder="t('kanban.columnName')"
            class="w-full"
          />
        </UFormField>

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
              variant="outline"
              @click="save"
            >
              {{ t('common.save') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { KanbanColumnItem } from 'taskview-api'
import { useKanbanStore } from '@/stores/kanban.store'

const props = defineProps<{ status: KanbanColumnItem }>()

const model = defineModel<boolean>({ required: true })

const { t } = useI18n()
const store = useKanbanStore()
const name = ref(props.status.name)

watch(model, (open) => {
  if (open) {
    name.value = props.status.name
  }
})

async function save() {
  await store.updateStatus({ id: props.status.id, name: name.value })
  model.value = false
}
</script>

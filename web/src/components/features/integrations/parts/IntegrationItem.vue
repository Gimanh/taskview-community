<template>
  <div class="flex items-center justify-between p-4 border border-default rounded-lg">
    <div class="flex items-center gap-3">
      <UIcon
        :name="providerIcon"
        class="size-6"
      />
      <div>
        <p class="font-medium">
          {{ integration.repoFullName }}
        </p>
        <p class="text-sm text-muted">
          {{ providerLabel }}
        </p>
      </div>
    </div>
    <div
      v-if="canManage"
      class="flex items-center gap-2"
    >
      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        size="xs"
        :loading="syncing"
        :disabled="!integration.isActive"
        @click="handleSync"
      />
      <USwitch
        :model-value="integration.isActive"
        @update:model-value="$emit('toggle', integration)"
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        size="xs"
        @click="$emit('remove', integration.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { IntegrationItem } from 'taskview-api'
import { useIntegrationsStore } from '@/stores/integrations.store'

const { t } = useI18n()
const integrationsStore = useIntegrationsStore()
const toast = useToast()

const props = defineProps<{
  integration: IntegrationItem
  canManage: boolean
}>()

defineEmits<{
  toggle: [item: IntegrationItem]
  remove: [id: number]
}>()

const syncing = ref(false)

const providerIcon = computed(() =>  props.integration.provider === 'github' ? 'i-mdi-github' : 'i-mdi-gitlab')

const providerLabel = computed(() => props.integration.provider === 'github' ? 'GitHub' : 'GitLab')

async function handleSync() {
  syncing.value = true
  try {
    await integrationsStore.syncIntegration(props.integration.id)
    toast.add({
      title: t('integrations.sync'),
      color: 'success',
    })
  } catch {
    toast.add({
      title: t('integrations.syncFailed'),
      color: 'error',
    })
  } finally {
    syncing.value = false
  }
}
</script>

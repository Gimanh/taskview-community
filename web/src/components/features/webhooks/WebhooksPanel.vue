<template>
  <div class="p-4">
    <div
      v-if="!hasGoalSelected"
      class="flex flex-col items-center justify-center h-64 text-muted"
    >
      <UIcon
        name="i-lucide-webhook"
        class="size-12 mb-4"
      />
      <p>{{ t('webhooks.selectProject') }}</p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ projectName }}
        </h2>
        <UButton
          v-if="canManageIntegrations"
          :label="t('webhooks.add')"
          icon="i-lucide-plus"
          color="primary"
          @click="isAddModalOpen = true"
        />
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center h-32"
      >
        <p>{{ t('common.loading') }}</p>
      </div>

      <div
        v-else-if="webhooksStore.webhooks.length === 0"
        class="flex flex-col items-center justify-center h-64 text-muted"
      >
        <UIcon
          name="i-lucide-webhook"
          class="size-12 mb-4"
        />
        <p>{{ t('webhooks.empty') }}</p>
      </div>

      <div
        v-else
        class="flex flex-col gap-3"
      >
        <WebhookItem
          v-for="item in webhooksStore.webhooks"
          :key="item.id"
          :webhook="item"
          :can-manage="canManageIntegrations"
          @toggle="handleToggle"
          @delete="handleDelete"
          @show-deliveries="openDeliveries"
          @edit="openEdit"
        />
      </div>
    </template>

    <AddWebhookModal
      v-model:open="isAddModalOpen"
      :goal-id="projectId"
      @created="fetchData"
    />

    <EditWebhookModal
      v-model:open="isEditModalOpen"
      :webhook="selectedWebhook"
      @saved="fetchData"
    />

    <WebhookDeliveries
      v-model:open="isDeliveriesOpen"
      :webhook-id="selectedWebhookId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WebhookItem as WebhookItemType } from 'taskview-api'
import { useWebhooksStore } from '@/stores/webhooks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import WebhookItem from './parts/WebhookItem.vue'
import AddWebhookModal from './parts/AddWebhookModal.vue'
import EditWebhookModal from './parts/EditWebhookModal.vue'
import WebhookDeliveries from './parts/WebhookDeliveries.vue'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const webhooksStore = useWebhooksStore()
const { canManageIntegrations } = useGoalPermissions()

const loading = ref(false)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeliveriesOpen = ref(false)
const selectedWebhookId = ref(0)
const selectedWebhook = ref<WebhookItemType | null>(null)

const hasGoalSelected = computed(() => projectId.value > 0)
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')

async function fetchData() {
  if (!hasGoalSelected.value) return
  loading.value = true
  await webhooksStore.fetchWebhooks(projectId.value)
  loading.value = false
}

watch(projectId, fetchData, { immediate: true })

async function handleToggle(id: number, isActive: boolean) {
  await webhooksStore.updateWebhook({ id, isActive })
}

async function handleDelete(id: number) {
  await webhooksStore.deleteWebhook(id)
}

function openDeliveries(webhookId: number) {
  selectedWebhookId.value = webhookId
  isDeliveriesOpen.value = true
}

function openEdit(webhook: WebhookItemType) {
  selectedWebhook.value = webhook
  isEditModalOpen.value = true
}
</script>

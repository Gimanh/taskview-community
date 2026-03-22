<template>
  <UModal v-model:open="isOpen" :fullscreen="isMobile" :ui="{ content: 'sm:max-w-3xl', body: 'p-0!' }">
    <template #header>
      <div class="flex items-center justify-between w-full gap-3">
        <h3 class="text-lg font-semibold">
          {{ t('webhooks.deliveries') }}
        </h3>
        <USelectMenu
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          :placeholder="t('webhooks.allStatuses')"
          :search-input="false"
          size="sm"
          variant="subtle"
          class="w-36 shrink-0"
        />
      </div>
    </template>
    <template #body>
      <div
        v-if="webhooksStore.deliveriesLoading && webhooksStore.deliveries.length === 0"
        class="flex items-center justify-center h-32"
      >
        <p>{{ t('common.loading') }}</p>
      </div>
      <div
        v-else-if="webhooksStore.deliveries.length === 0"
        class="flex flex-col items-center justify-center h-32 text-muted"
      >
        <p>{{ t('webhooks.noDeliveries') }}</p>
      </div>
      <div v-else ref="scrollContainer">
        <UTable
          :data="webhooksStore.deliveries"
          :columns="columns"
          sticky
          :loading="webhooksStore.deliveriesLoading && webhooksStore.deliveries.length > 0"
          :ui="{ thead: 'sticky top-0 z-10' }"
          class="max-h-80"
        >
          <template #event-cell="{ row }">
            <span class="font-mono text-xs">{{ row.original.event }}</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              :color="statusColor(row.original.status)"
              variant="subtle"
              size="xs"
            >
              {{ row.original.status }}
            </UBadge>
          </template>
          <template #responseCode-cell="{ row }">
            {{ row.original.responseCode ?? '—' }}
          </template>
          <template #createdAt-cell="{ row }">
            <span class="text-muted whitespace-nowrap">{{ formatTime(row.original.createdAt) }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-eye"
                variant="ghost"
                size="xs"
                :title="t('webhooks.viewPayload')"
                @click="openPayload(row.original)"
              />
              <UButton
                v-if="row.original.status === 'failed'"
                icon="i-lucide-refresh-cw"
                variant="ghost"
                size="xs"
                :loading="retrying === row.original.id"
                @click="retryDelivery(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end">
        <UButton
          :label="t('common.close')"
          variant="ghost"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>

  <PayloadViewer
    v-model:open="showPayload"
    :payload="selectedPayload"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import { useWebhooksStore } from '@/stores/webhooks.store'
import { useTaskView } from '@/composables/useTaskView'
import PayloadViewer from './PayloadViewer.vue'
import type { WebhookDeliveryItem } from 'taskview-api'

const props = defineProps<{
  webhookId: number
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { isMobile } = useTaskView()
const webhooksStore = useWebhooksStore()

const retrying = ref<number | null>(null)
const showPayload = ref(false)
const selectedPayload = ref<unknown>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const statusFilter = ref('all')
const hasMore = ref(true)

const ALL_VALUE = 'all'

const statusOptions = [
  { label: t('webhooks.allStatuses'), value: ALL_VALUE },
  { label: 'success', value: 'success' },
  { label: 'failed', value: 'failed' },
  { label: 'pending', value: 'pending' },
]

const columns: TableColumn<WebhookDeliveryItem>[] = [
  { accessorKey: 'event', header: t('webhooks.event') },
  { accessorKey: 'status', header: t('webhooks.status') },
  { accessorKey: 'responseCode', header: t('webhooks.httpCode') },
  { accessorKey: 'attempts', header: t('webhooks.attempts') },
  { accessorKey: 'createdAt', header: t('webhooks.time') },
  { id: 'actions', header: '' },
]

const currentStatus = () => statusFilter.value === ALL_VALUE ? undefined : statusFilter.value

async function loadInitial() {
  hasMore.value = true
  await webhooksStore.fetchDeliveries(props.webhookId, { status: currentStatus() })
  hasMore.value = webhooksStore.deliveries.length >= 20
  await nextTick()
  setupInfiniteScroll()
}

async function loadMore() {
  if (!hasMore.value || webhooksStore.deliveriesLoading) return
  const last = webhooksStore.deliveries[webhooksStore.deliveries.length - 1]
  if (!last) return
  const prevCount = webhooksStore.deliveries.length
  await webhooksStore.fetchDeliveries(props.webhookId, {
    cursor: last.id,
    status: currentStatus(),
    append: true,
  })
  hasMore.value = webhooksStore.deliveries.length - prevCount >= 20
}

function setupInfiniteScroll() {
  if (!scrollContainer.value) return
  useInfiniteScroll(scrollContainer, () => {
    loadMore()
  }, {
    distance: 200,
    canLoadMore: () => hasMore.value && !webhooksStore.deliveriesLoading,
  })
}

watch(isOpen, (open) => {
  if (open && props.webhookId) {
    loadInitial()
  }
})

watch(statusFilter, () => {
  if (isOpen.value) {
    loadInitial()
  }
})

function statusColor(status: string) {
  if (status === 'success') return 'success' as const
  if (status === 'failed') return 'error' as const
  return 'warning' as const
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function openPayload(delivery: WebhookDeliveryItem) {
  selectedPayload.value = delivery.payload
  showPayload.value = true
}

async function retryDelivery(delivery: WebhookDeliveryItem) {
  retrying.value = delivery.id
  await webhooksStore.retryDelivery(delivery.id)
  await loadInitial()
  retrying.value = null
}
</script>

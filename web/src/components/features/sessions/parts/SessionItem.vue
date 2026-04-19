<template>
  <div class="flex items-center justify-between p-4 border border-default rounded-lg">
    <div class="flex items-start gap-3 min-w-0">
      <UIcon
        :name="deviceIcon"
        class="size-5 shrink-0 text-primary mt-1"
      />
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <p class="font-medium">
            {{ session.deviceName || t('sessions.unknown') }}
          </p>
          <UBadge
            v-if="session.isCurrent"
            variant="subtle"
            color="primary"
            size="xs"
          >
            {{ t('sessions.current') }}
          </UBadge>
        </div>
        <div class="flex flex-col items-start gap-1 text-xs text-muted mt-1">
          <span v-if="session.userIp">{{ session.userIp }}</span>
          <span>{{ t('sessions.created') }}: {{ formatDate(session.createdAt) }}</span>
          <span v-if="session.lastUsedAt">
            {{ t('sessions.lastUsed') }}: {{ formatDate(session.lastUsedAt) }}
          </span>
        </div>
      </div>
    </div>
    <UButton
      v-if="!session.isCurrent"
      icon="i-lucide-log-out"
      variant="ghost"
      color="error"
      size="md"
      @click="showDeleteConfirm = true"
    />
  </div>

  <UModal
    v-model:open="showDeleteConfirm"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('common.delete') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm">
        {{ t('sessions.deleteConfirm') }}
      </p>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          @click="showDeleteConfirm = false"
        />
        <UButton
          :label="t('common.delete')"
          color="error"
          variant="outline"
          :loading="deleting"
          @click="handleDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SessionItem } from 'taskview-api'
import { useSessionsStore } from '@/stores/sessions.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  session: SessionItem
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const store = useSessionsStore()

const showDeleteConfirm = ref(false)
const deleting = ref(false)

const deviceIcon = computed(() => {
  const name = (props.session.deviceName || '').toLowerCase()
  if (name.includes('iphone') || name.includes('android') || name.includes('mobile')) {
    return 'i-lucide-smartphone'
  }
  return 'i-lucide-monitor'
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

async function handleDelete() {
  deleting.value = true
  await store.deleteSession(props.session.id)
  showDeleteConfirm.value = false
  deleting.value = false
}
</script>

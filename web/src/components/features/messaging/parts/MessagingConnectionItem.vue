<template>
  <div class="flex items-center justify-between p-4 border border-default rounded-lg">
    <div class="flex items-center gap-3 min-w-0">
      <UIcon
        :name="providerIcon"
        class="size-6 shrink-0"
        :class="connection.isActive ? 'text-primary' : 'text-muted'"
      />
      <div class="min-w-0">
        <p class="font-medium truncate">
          {{ connection.title || connection.targetChatId }}
        </p>
        <div class="flex items-center gap-2 mt-1">
          <UBadge
            variant="subtle"
            size="xs"
          >
            {{ providerLabel }}
          </UBadge>
          <span class="text-xs text-muted">
            {{ t('messaging.eventsCount', { count: connection.events.length }) }}
          </span>
        </div>
        <div
          v-if="isProject && canManage"
          class="flex items-center gap-2 mt-2"
        >
          <USwitch
            :model-value="connection.postContent"
            size="xs"
            @update:model-value="(v: boolean) => emit('update-post-content', v)"
          />
          <span
            class="text-xs text-muted"
            :title="t('messaging.postContentHint')"
          >{{ t('messaging.postContent') }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="canManage"
      class="flex items-center gap-2 shrink-0 ml-2"
    >
      <UButton
        icon="i-lucide-sliders-horizontal"
        variant="ghost"
        size="md"
        :title="t('messaging.eventsTitle')"
        @click="isEventsOpen = true"
      />
      <USwitch
        :model-value="connection.isActive"
        size="md"
        @update:model-value="(v: boolean) => emit('toggle', v)"
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        size="md"
        :title="t('messaging.disconnect')"
        @click="isConfirmOpen = true"
      />
    </div>
  </div>

  <MessagingEventsModal
    v-model:open="isEventsOpen"
    :events="connection.events"
    @save="(events) => emit('update-events', events)"
  />

  <UModal
    v-model:open="isConfirmOpen"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('messaging.disconnect') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm">
        {{ t('messaging.disconnectConfirm') }}
      </p>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          color="neutral"
          @click="isConfirmOpen = false"
        />
        <UButton
          :label="t('messaging.disconnect')"
          color="error"
          variant="soft"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MessagingConnectionItem } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import MessagingEventsModal from './MessagingEventsModal.vue'

const props = defineProps<{
  connection: MessagingConnectionItem
  canManage: boolean
}>()

const emit = defineEmits<{
  toggle: [isActive: boolean]
  delete: []
  'update-events': [events: string[]]
  'update-post-content': [postContent: boolean]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const isConfirmOpen = ref(false)
const isEventsOpen = ref(false)

const isProject = computed(() => props.connection.ownerType === 'project')
const providerIcon = computed(() => (props.connection.provider === 'slack' ? 'i-lucide-slack' : 'i-lucide-send'))
const providerLabel = computed(() => t(`messaging.${props.connection.provider}`))

function confirmDelete() {
  isConfirmOpen.value = false
  emit('delete')
}
</script>

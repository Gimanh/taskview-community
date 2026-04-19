<template>
  <div class="flex items-center justify-between p-4 border border-default rounded-lg">
    <div class="flex items-center gap-3 min-w-0">
      <UIcon
        name="i-lucide-key-round"
        class="size-5 shrink-0 text-primary"
      />
      <div class="min-w-0">
        <p class="font-medium">
          {{ token.name }}
        </p>
        <div class="flex items-center gap-3 text-xs text-muted mt-1">
          <span>{{ t('apiTokens.lastUsed') }}: {{ token.lastUsedAt ? formatDate(token.lastUsedAt) : t('apiTokens.never') }}</span>
          <span v-if="token.expiresAt">
            {{ t('apiTokens.expires') }}: {{ formatDate(token.expiresAt) }}
          </span>
        </div>
        <div
          v-if="token.allowedPermissions.length > 0"
          class="flex items-center gap-1 mt-1"
        >
          <UBadge
            variant="subtle"
            size="xs"
          >
            {{ token.allowedPermissions.length }} {{ t('apiTokens.permissionsCount') }}
          </UBadge>
        </div>
      </div>
    </div>
    <UButton
      icon="i-lucide-trash-2"
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
        {{ t('apiTokens.deleteConfirm') }}
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
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiTokenItem } from 'taskview-api'
import { useApiTokensStore } from '@/stores/api-tokens.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  token: ApiTokenItem
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const store = useApiTokensStore()

const showDeleteConfirm = ref(false)
const deleting = ref(false)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

async function handleDelete() {
  deleting.value = true
  await store.deleteToken(props.token.id)
  showDeleteConfirm.value = false
  deleting.value = false
}
</script>

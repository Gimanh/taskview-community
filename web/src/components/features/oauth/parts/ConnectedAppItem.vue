<template>
  <UCard
    variant="soft"
    :ui="{ body: 'w-full flex items-center justify-between p-4', root: 'rounded-2xl' }"
  >
    <div class="flex items-center gap-3 min-w-0">
      <UIcon
        name="i-lucide-plug-zap"
        class="size-5 shrink-0 text-primary"
      />
      <div class="min-w-0">
        <p class="font-medium truncate">
          {{ app.clientName }}
        </p>
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
          <span v-if="app.createdAt">
            {{ t('oauth.connectedApps.connected') }}: {{ formatDate(app.createdAt) }}
          </span>
          <span>
            {{ t('oauth.connectedApps.lastUsed') }}:
            {{ app.lastUsedAt ? formatDate(app.lastUsedAt) : t('oauth.connectedApps.never') }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-1 mt-1.5">
          <UBadge
            variant="subtle"
            size="xs"
          >
            {{ app.allowedPermissions.length
              ? t('oauth.connectedApps.permissionsCount', { count: app.allowedPermissions.length })
              : t('oauth.connectedApps.allPermissions') }}
          </UBadge>
          <UBadge
            variant="subtle"
            color="neutral"
            size="xs"
          >
            {{ app.allowedGoalIds.length
              ? t('oauth.connectedApps.projectsCount', { count: app.allowedGoalIds.length })
              : t('oauth.connectedApps.allProjects') }}
          </UBadge>
        </div>
      </div>
    </div>
    <UButton
      icon="i-lucide-trash-2"
      variant="ghost"
      color="error"
      size="xl"
      @click="showRevokeConfirm = true"
    />
  </UCard>

  <UModal
    v-model:open="showRevokeConfirm"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('oauth.connectedApps.revoke') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm">
        {{ t('oauth.connectedApps.revokeConfirm', { client: app.clientName }) }}
      </p>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          @click="showRevokeConfirm = false"
        />
        <UButton
          :label="t('oauth.connectedApps.revoke')"
          color="error"
          variant="soft"
          :loading="revoking"
          @click="handleRevoke"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OAuthConnectedApp } from 'taskview-api'
import { useOAuthStore } from '@/stores/oauth.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  app: OAuthConnectedApp
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const store = useOAuthStore()

const showRevokeConfirm = ref(false)
const revoking = ref(false)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

async function handleRevoke() {
  revoking.value = true
  await store.revokeConnectedApp(props.app.grantId)
  showRevokeConfirm.value = false
  revoking.value = false
}
</script>

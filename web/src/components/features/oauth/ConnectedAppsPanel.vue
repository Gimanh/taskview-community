<template>
  <div>
    <div class="mb-4">
      <h2 class="text-lg font-semibold">
        {{ t('oauth.connectedApps.title') }}
      </h2>
      <p class="text-sm text-muted">
        {{ t('oauth.connectedApps.description') }}
      </p>
    </div>

    <div
      v-if="store.loading"
      class="flex items-center justify-center h-32"
    >
      <p>{{ t('common.loading') }}</p>
    </div>

    <div
      v-else-if="store.connectedApps.length === 0"
      class="flex flex-col items-center justify-center h-32 text-muted"
    >
      <UIcon
        name="i-lucide-plug"
        class="size-10 mb-3"
      />
      <p>{{ t('oauth.connectedApps.empty') }}</p>
    </div>

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <ConnectedAppItem
        v-for="app in store.connectedApps"
        :key="app.grantId"
        :app="app"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOAuthStore } from '@/stores/oauth.store'
import ConnectedAppItem from './parts/ConnectedAppItem.vue'

const { t } = useI18n()
const store = useOAuthStore()

onMounted(() => {
  store.fetchConnectedApps()
})
</script>

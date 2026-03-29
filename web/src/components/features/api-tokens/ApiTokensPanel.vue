<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold">
          {{ t('apiTokens.title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ t('apiTokens.description') }}
        </p>
      </div>
      <UButton
        :label="t('apiTokens.add')"
        icon="i-lucide-plus"
        color="primary"
        variant="soft"
        @click="isCreateOpen = true"
      />
    </div>

    <div
      v-if="store.loading"
      class="flex items-center justify-center h-32"
    >
      <p>{{ t('common.loading') }}</p>
    </div>

    <div
      v-else-if="store.tokens.length === 0"
      class="flex flex-col items-center justify-center h-32 text-muted"
    >
      <UIcon name="i-lucide-key-round" class="size-10 mb-3" />
      <p>{{ t('apiTokens.empty') }}</p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <ApiTokenItem
        v-for="token in store.tokens"
        :key="token.id"
        :token="token"
      />
    </div>

    <CreateApiTokenModal
      v-model:open="isCreateOpen"
      @created="store.fetchTokens()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiTokensStore } from '@/stores/api-tokens.store'
import ApiTokenItem from './parts/ApiTokenItem.vue'
import CreateApiTokenModal from './parts/CreateApiTokenModal.vue'

const { t } = useI18n()
const store = useApiTokensStore()
const isCreateOpen = ref(false)

onMounted(() => {
  store.fetchTokens()
})
</script>

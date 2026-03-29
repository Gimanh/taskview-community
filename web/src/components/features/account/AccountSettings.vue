<template>
  <div class="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-full lg:max-w-2xl m-0 lg:mx-auto">
    <NotificationSettings />

    <UPageCard class="w-full">
      <SessionsPanel />
    </UPageCard>

    <UPageCard class="w-full">
      <ApiTokensPanel />
    </UPageCard>

    <UPageCard class="w-full">
      <div class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold">
          {{ t('account.management') }}
        </h2>

        <div class="text-muted">
          {{ userStore.email }}
        </div>

        <div>
          <DeleteAccountButton
            @code-sent="showCodeModal = true"
            @error="onCodeSendError"
          />
        </div>
      </div>
    </UPageCard>

    <DeleteAccountCodeModal v-model:open="showCodeModal" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user.store'
import DeleteAccountButton from './parts/DeleteAccountButton.vue'
import DeleteAccountCodeModal from './parts/DeleteAccountCodeModal.vue'
import NotificationSettings from './parts/NotificationSettings.vue'
import SessionsPanel from '@/components/features/sessions/SessionsPanel.vue'
import ApiTokensPanel from '@/components/features/api-tokens/ApiTokensPanel.vue'

const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()

const showCodeModal = ref(false)

function onCodeSendError() {
  toast.add({
    title: t('account.codeSendError'),
    color: 'error',
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-1 lg:p-6 w-full max-w-full lg:max-w-2xl m-0 lg:mx-auto">
    <NotificationSettings />

    <UPageCard
      variant="soft"
      class="w-full rounded-3xl"
    >
      <SessionsPanel />
    </UPageCard>

    <UPageCard
      variant="soft"
      class="w-full rounded-3xl"
    >
      <ApiTokensPanel />
    </UPageCard>

    <UPageCard
      variant="soft"
      class="w-full rounded-3xl"
    >
      <ConnectedAppsPanel />
    </UPageCard>

    <UPageCard
      v-if="isDefaultUser"
      variant="soft"
      class="w-full rounded-3xl bg-warning/10 ring-2 ring-warning/60"
    >
      <DefaultUserCredentials />
    </UPageCard>

    <UPageCard
      variant="soft"
      class="w-full rounded-3xl"
    >
      <PasswordSettings />
    </UPageCard>

    <UPageCard
      variant="soft"
      class="w-full rounded-3xl"
    >
      <div class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold">
          {{ t('account.management') }}
        </h2>

        <div class="text-muted">
          {{ userStore.email }}
        </div>

        <div v-if="deletionAllowed">
          <DeleteAccountButton
            @code-sent="showCodeModal = true"
            @error="onCodeSendError"
          />
        </div>
        <p
          v-else-if="deletionAllowed === false"
          class="text-sm text-muted"
        >
          {{ t('account.deletionDisabled') }}
        </p>
      </div>
    </UPageCard>

    <DeleteAccountCodeModal v-model:open="showCodeModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'
import { logError } from '@/helpers/Helper'
import { useUserStore } from '@/stores/user.store'
import DeleteAccountButton from './parts/DeleteAccountButton.vue'
import DeleteAccountCodeModal from './parts/DeleteAccountCodeModal.vue'
import NotificationSettings from './parts/NotificationSettings.vue'
import PasswordSettings from './parts/PasswordSettings.vue'
import DefaultUserCredentials from './parts/DefaultUserCredentials.vue'
import SessionsPanel from '@/components/features/sessions/SessionsPanel.vue'
import ApiTokensPanel from '@/components/features/api-tokens/ApiTokensPanel.vue'
import ConnectedAppsPanel from '@/components/features/oauth/ConnectedAppsPanel.vue'

const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()

const showCodeModal = ref(false)
// null until the server answers, so the button does not flash on servers where deletion is off
const deletionAllowed = ref<boolean | null>(null)

onMounted(async () => {
  const result = await $api
    .get<{ allowed: boolean }>('/module/auth/delete/account/options')
    .catch(logError)
  if (result) deletionAllowed.value = result.data.allowed
})

// Seeded default user on self-hosted installs (migration 0.0.0); backend enforces the same check
const isDefaultUser = computed(() => userStore.email.toLowerCase() === 'test@mail.dest')

function onCodeSendError() {
  toast.add({
    title: t('account.codeSendError'),
    color: 'error',
  })
}
</script>

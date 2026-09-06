<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-elevated/40">
    <div
      v-if="paramError"
      class="w-full max-w-lg"
    >
      <UAlert
        icon="i-lucide-triangle-alert"
        color="error"
        variant="soft"
        :title="t('oauth.consent.invalidTitle')"
        :description="t('oauth.consent.invalidDescription')"
      />
    </div>

    <OAuthConsentCard
      v-else
      :client-name="clientName"
      :redirect-uri="request.redirect_uri"
      @approve="onApprove"
      @deny="onDeny"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { OAuthConsentRequest } from 'taskview-api'
import { useOAuthStore } from '@/stores/oauth.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import OAuthConsentCard from '@/components/features/oauth/OAuthConsentCard.vue'
import type { OAuthConsentSelection } from '@/types/oauth.types'

const { t } = useI18n()
const route = useRoute()
const store = useOAuthStore()
const goalsStore = useGoalsStore()
const orgStore = useOrganizationStore()

const readParam = (key: string): string => {
  const value = route.query[key]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

const clientName = computed(() => readParam('client_name') || readParam('client_id'))
const request = computed<OAuthConsentRequest>(() => ({
  client_id: readParam('client_id'),
  redirect_uri: readParam('redirect_uri'),
  code_challenge: readParam('code_challenge'),
  code_challenge_method: 'S256',
  state: readParam('state') || undefined,
  resource: readParam('resource') || undefined,
}))

const paramError = computed(() =>
  !request.value.client_id
  || !request.value.redirect_uri
  || !request.value.code_challenge
  || readParam('code_challenge_method') !== 'S256',
)

const leaving = ref(false)

const leaveTo = (url: string | null) => {
  if (!url) return
  leaving.value = true
  window.location.replace(url)
}

const onApprove = async (selection: OAuthConsentSelection) => {
  leaveTo(await store.approveConsent({ ...request.value, ...selection }))
}

const onDeny = async () => {
  leaveTo(await store.denyConsent(request.value))
}

onMounted(async () => {
  if (paramError.value) return
  if (!orgStore.organizations.length) await orgStore.fetchOrganizations()
  if (!orgStore.currentOrg) orgStore.restoreCurrentOrg()
  await goalsStore.fetchGoals()
})
</script>

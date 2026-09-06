<template>
  <UCard class="w-full max-w-lg">
    <template #header>
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-plug-zap"
          class="size-6 shrink-0 text-primary"
        />
        <div>
          <h1 class="text-lg font-semibold">
            {{ t('oauth.consent.title', { client: clientName }) }}
          </h1>
          <p class="text-sm text-muted mt-1">
            {{ t('oauth.consent.subtitle', { client: clientName }) }}
          </p>
        </div>
      </div>

      <div class="mt-4 rounded-lg bg-elevated p-3">
        <p class="text-xs text-muted">
          {{ t('oauth.consent.destinationLabel') }}
        </p>
        <p class="font-medium break-all mt-0.5">
          {{ redirectHost }}
        </p>
        <p class="text-xs text-muted break-all mt-0.5">
          {{ redirectUri }}
        </p>
        <p class="text-xs text-muted mt-2">
          {{ isLocalDestination
            ? t('oauth.consent.destinationLocalHint')
            : t('oauth.consent.destinationHint') }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-5">
      <UAlert
        icon="i-lucide-shield-check"
        color="neutral"
        variant="soft"
        :description="t('oauth.consent.rbacNote')"
      />

      <UFormField :label="t('oauth.consent.projectsLabel')">
        <USelectMenu
          v-model="selectedGoalIds"
          :items="goalOptions"
          multiple
          value-key="value"
          :search-input="false"
          class="w-full"
          :placeholder="t('oauth.consent.allProjects')"
        />
        <UAlert
          v-if="!selectedGoalIds.length"
          icon="i-lucide-triangle-alert"
          color="warning"
          variant="soft"
          class="mt-2"
          :ui="{ description: 'text-xs' }"
          :description="t('oauth.consent.projectsWarning')"
        />
        <p
          v-else
          class="text-xs text-muted mt-2"
        >
          {{ t('oauth.consent.projectsHint') }}
        </p>
      </UFormField>

      <UFormField :label="t('oauth.consent.permissionsLabel')">
        <TvPermissionPicker v-model="selectedPermissions" />
        <UAlert
          v-if="!selectedPermissions.length"
          icon="i-lucide-triangle-alert"
          color="warning"
          variant="soft"
          class="mt-2"
          :ui="{ description: 'text-xs' }"
          :description="t('oauth.consent.permissionsWarning')"
        />
        <p
          v-else
          class="text-xs text-muted mt-2"
        >
          {{ t('oauth.consent.permissionsHint') }}
        </p>
      </UFormField>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <UButton
          :label="t('oauth.consent.deny')"
          color="neutral"
          variant="ghost"
          :disabled="store.submitting"
          @click="emit('deny')"
        />
        <UButton
          :label="t('oauth.consent.approve')"
          color="primary"
          :loading="store.submitting"
          @click="onApprove"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOAuthStore } from '@/stores/oauth.store'
import { useGoalsStore } from '@/stores/goals.store'
import TvPermissionPicker from '@/components/features/base/TvPermissionPicker.vue'
import type { OAuthConsentSelection } from '@/types/oauth.types'

const { t } = useI18n()
const store = useOAuthStore()
const goalsStore = useGoalsStore()

const props = defineProps<{
  clientName: string
  redirectUri: string
}>()

const LOOPBACK_HOSTS = ['127.0.0.1', '::1', '[::1]', 'localhost']

const redirectUrl = computed(() => {
  try {
    return new URL(props.redirectUri)
  } catch {
    return null
  }
})

// The host is what a person can actually check against the app they think they
// are connecting; the full URI stays visible underneath it.
const redirectHost = computed(() => redirectUrl.value?.host ?? props.redirectUri)

const isLocalDestination = computed(() =>
  !!redirectUrl.value && LOOPBACK_HOSTS.includes(redirectUrl.value.hostname),
)

const emit = defineEmits<{
  approve: [selection: OAuthConsentSelection]
  deny: []
}>()

// Nothing ticked means "everything you can do", the same as a tvk_ token issued
// with no permissions picked. The warning under the picker spells that out.
const selectedPermissions = ref<string[]>([])
const selectedGoalIds = ref<number[]>([])

const goalOptions = computed(() =>
  goalsStore.goals
    .filter((goal) => goal.archive === 0)
    .map((goal) => ({ label: goal.name, value: goal.id })),
)

function onApprove() {
  emit('approve', {
    allowedGoalIds: selectedGoalIds.value,
    allowedPermissions: selectedPermissions.value,
  })
}
</script>

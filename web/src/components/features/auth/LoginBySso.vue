<template>
  <div class="space-y-4">
    <UForm
      :state="state"
      :schema="schema"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <UFormField
        :label="t('auth.email')"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          :placeholder="t('auth.emailPlaceholder')"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UButton
        :label="t('auth.ssoSignIn')"
        type="submit"
        color="primary"
        block
        :loading="isLoading"
      />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import $api from '@/helpers/axios'
import { useAdditionalServer } from '@/composables/useAdditionalServer'

const { t } = useI18n()
const toast = useToast()

const isLoading = ref(false)

const emailType = type('string.email').configure({ message: t('auth.invalidEmail') })

const schema = type({
  email: emailType,
})

type SsoProviderResponse = {
  response: {
    id: number
    displayName: string
    protocol: string
  } | null
}

const state = reactive({
  email: '',
})

async function handleSubmit() {
  isLoading.value = true

  try {
    const domain = state.email.split('@')[1]
    if (!domain) return

    const result = await $api.get<SsoProviderResponse>('/module/sso/providers', {
      params: { domain },
    })

    const provider = result.data.response
    if (!provider) {
      toast.add({
        title: t('auth.ssoNotFound'),
        description: t('auth.ssoNotFoundDescription', { domain }),
        color: 'warning',
      })
      return
    }

    const { mainServer } = await useAdditionalServer()
    const platform = Capacitor.isNativePlatform() ? 'mobile' : 'web'
    const url = `${mainServer.value}/module/sso/login/${provider.id}?platform=${platform}`

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url })
    } else {
      window.location.href = url
    }
  } catch {
    toast.add({
      title: t('auth.error'),
      description: t('auth.ssoError'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

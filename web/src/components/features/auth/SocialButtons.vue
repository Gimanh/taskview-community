<template>
  <div class="space-y-3">
    <UButton
      :label="t('auth.continueWithGoogle')"
      icon="i-lucide-chrome"
      color="neutral"
      variant="outline"
      block
      :loading="isLoading === 'google'"
      :disabled="isLoading !== null"
      @click="handleLogin('google')"
    />
    <UButton
      :label="t('auth.continueWithGithub')"
      icon="i-lucide-github"
      color="neutral"
      variant="outline"
      block
      :loading="isLoading === 'github'"
      :disabled="isLoading !== null"
      @click="handleLogin('github')"
    />
    <UButton
      :label="t('auth.continueWithApple')"
      icon="i-lucide-apple"
      color="neutral"
      variant="outline"
      block
      :loading="isLoading === 'apple'"
      :disabled="isLoading !== null"
      @click="handleLogin('apple')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { useAdditionalServer } from '@/composables/useAdditionalServer'

type Provider = 'google' | 'github' | 'apple'

const { t } = useI18n()

const isLoading = ref<Provider | null>(null)

async function handleLogin(provider: Provider) {
  isLoading.value = provider

  setTimeout(() => {
    isLoading.value = null
  }, 2000)

  const { mainServer } = await useAdditionalServer()

  const platform = Capacitor.isNativePlatform() ? 'mobile' : 'web'
  const url = `${mainServer.value}/module/auth/provider/${provider}?platform=${platform}`

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.location.href = url
  }
}
</script>

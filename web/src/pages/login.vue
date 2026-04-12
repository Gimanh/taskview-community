<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <UCard class="w-full max-w-md">
      <LoginForm @success="handleSuccess" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'
import { redirectToUser } from '@/components/features/auth/auth.helper'
import LoginForm from '@/components/features/auth/LoginForm.vue'

type LoginTokens = {
  code: string
  email: string
}

type LoginResponse = {
  access: string
  refresh: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

async function loginByCode(code: string, email: string) {
  const result = await $api.post<LoginResponse>('/module/auth/login-by-code', { code, email })
  if (result?.data.access) {
    $ls.setToken(result.data.access)
    $ls.setRefreshToken(result.data.refresh)
    await $ls.updateUserStoreByToken()
    await redirectToUser(router)
  }
}

onMounted(async () => {
  // If user already has a valid token, redirect to dashboard
  const existingToken = await $ls.getToken()
  if (existingToken) {
    await $ls.updateUserStoreByToken()
    await redirectToUser(router)
    return
  }

  // Handle SSO error redirect
  if (route.query.sso_error) {
    toast.add({
      title: t('auth.error'),
      description: t('auth.ssoError'),
      color: 'error',
    })
  }

  // Handle OAuth callback tokens from URL
  try {
    const tokens = route.query.tokens as string
    if (!tokens) return

    const result = JSON.parse(decodeURIComponent(tokens)) as LoginTokens
    await loginByCode(result.code, result.email)
  } catch (error) {
    console.error('Failed to process tokens from URL:', error)
  }
})

App.addListener('appUrlOpen', async ({ url }) => {
  if (!url) return

  if (url.startsWith('taskview://login?tokens')) {
    const parsed = new URL(url)
    const tokens = parsed.searchParams.get('tokens')

    if (!tokens) return

    try {
      const result = JSON.parse(decodeURIComponent(tokens)) as LoginTokens
      await loginByCode(result.code, result.email)
    } catch (error) {
      console.error('Failed to process deep link tokens:', error)
    }
  }

  await Browser.close()
})

async function handleSuccess() {
  console.log('Login successful')
}
</script>

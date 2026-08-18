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
  // Handle password reset link from email (redirects to /reset-password preserving query)
  if (route.query.resetCode) {
    await router.replace({ path: '/reset-password', query: route.query })
    return
  }

  // Handle SSO error redirect
  if (route.query.sso_error) {
    const ssoErrorKey = {
      'registration-disabled': 'auth.registrationDisabled',
      domain_unverified: 'auth.ssoDomainUnverified',
      email_in_use: 'auth.ssoEmailInUse',
    }[String(route.query.sso_error)] ?? 'auth.ssoError'

    toast.add({
      title: t('auth.error'),
      description: t(ssoErrorKey),
      color: 'error',
    })
  }

  const tokens = route.query.tokens as string
  if (tokens) {
    try {
      const result = JSON.parse(decodeURIComponent(tokens)) as LoginTokens
      await loginByCode(result.code, result.email)
      return
    } catch (error) {
      console.error('Failed to process tokens from URL:', error)
      toast.add({
        title: t('auth.error'),
        description: t('auth.loginFailed'),
        color: 'error',
      })
      return
    }
  }

  const existingToken = await $ls.getToken()
  if (existingToken) {
    await $ls.updateUserStoreByToken()
    await redirectToUser(router)
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
      toast.add({
        title: t('auth.error'),
        description: t('auth.loginFailed'),
        color: 'error',
      })
    }
  }

  await Browser.close()
})

async function handleSuccess() {
  console.log('Login successful')
}
</script>

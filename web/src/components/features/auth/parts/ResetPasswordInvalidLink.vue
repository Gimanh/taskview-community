<template>
  <div class="text-center space-y-4">
    <div class="mx-auto w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
      <UIcon
        name="i-lucide-alert-circle"
        class="w-6 h-6 text-error"
      />
    </div>
    <div>
      <h3 class="font-medium">
        {{ t('auth.invalidResetLink') }}
      </h3>
      <p class="text-sm text-muted mt-1">
        {{ t('auth.invalidResetLinkDescription') }}
      </p>
    </div>
    <UButton
      :label="t('auth.requestNewResetLink')"
      color="primary"
      block
      @click="requestNewLink"
    />
    <UButton
      :label="t('auth.backToLogin')"
      variant="outline"
      color="neutral"
      block
      @click="goToLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

function requestNewLink() {
  router.push({ path: '/login', query: { view: 'forgot' } })
}

function goToLogin() {
  router.push('/')
}
</script>

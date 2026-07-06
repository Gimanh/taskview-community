<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-2xl bg-elevated/40 border border-default px-3 py-2.5 text-left transition-colors hover:bg-error/10 focus-visible:bg-error/10 focus:outline-none"
    @click="onLogout"
  >
    <SettingsIconTile
      icon="i-lucide-log-out"
      color="rose"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-error">
      {{ t('userMenu.logout') }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLogout } from '@/composables/useLogout'
import SettingsIconTile from './SettingsIconTile.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

async function onLogout() {
  const success = await useLogout()
  if (success) {
    router.push('/')
  } else {
    toast.add({
      title: t('userMenu.logoutFailed'),
      description: t('userMenu.logoutFailedDescription'),
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-6 text-center text-muted">
    <p>{{ delivered ? t('import.callback.done') : t('import.callback.failed') }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IMPORT_POPUP_MESSAGE_TYPE } from '@/components/features/import/importProviders'
import type { ImportPopupMessage } from '@/components/features/import/importProviders.types'

const { t } = useI18n()
const delivered = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('token')
  history.replaceState(null, '', window.location.pathname)

  if (!window.opener) return
  const message: ImportPopupMessage = { type: IMPORT_POPUP_MESSAGE_TYPE, token: token || null }
  window.opener.postMessage(message, window.location.origin)
  delivered.value = true
  window.close()
})
</script>

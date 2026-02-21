<template>
  <UButton
    color="error"
    @click="handleClick"
  >
    {{ t('account.deleteAccount') }}
  </UButton>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'

const emit = defineEmits<{
  codeSent: []
  error: []
}>()

const { t } = useI18n()

async function handleClick() {
  const answer = confirm(t('account.deleteConfirm'))
  if (!answer) return

  try {
    await $api.post('/module/auth/delete/account/code')
    emit('codeSent')
  } catch (err) {
    console.log(err)
    emit('error')
  }
}
</script>

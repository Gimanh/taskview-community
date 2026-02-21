<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="flex flex-col gap-4 p-6">
        <UAlert
          color="error"
          icon="i-lucide-triangle-alert"
          :title="t('account.deleteWarning')"
        />

        <UInput
          v-model="code"
          :placeholder="t('account.enterCode')"
          spellcheck="false"
        />

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="open = false"
          >
            {{ t('account.cancel') }}
          </UButton>
          <UButton
            color="error"
            :disabled="!code"
            @click="handleConfirm"
          >
            {{ t('account.confirm') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'
import type { AppResponse } from '@/types/global-app.types'

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const code = ref('')

async function handleConfirm() {
  const result = await $api
    .post<AppResponse<{ del: boolean }>>('/module/auth/delete/account', { code: code.value })
    .catch((err) => console.log(err))

  if (result && result.data.response.del) {
    toast.add({
      title: t('account.deleted'),
      color: 'success',
    })
    $ls.invalidateTokens()
    router.push('/')
  }
}
</script>

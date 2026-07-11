<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #content>
      <div class="flex flex-col gap-4 p-6">
        <div>
          <h3 class="text-lg font-semibold">
            {{ t('account.confirmPasswordChange') }}
          </h3>
          <p class="text-sm text-muted mt-1">
            {{ t('account.passwordCodeSent') }}
          </p>
        </div>

        <UInput
          v-model="code"
          :placeholder="t('account.enterCode')"
          spellcheck="false"
          autocomplete="one-time-code"
          variant="soft"
          :ui="{ base: 'rounded-xl' }"
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
            color="primary"
            :disabled="!code"
            :loading="isLoading"
            @click="handleConfirm"
          >
            {{ t('account.changePassword') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  password: string
  passwordRepeat: string
}>()

const emit = defineEmits<{
  changed: []
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isMobile } = useTaskView()
const toast = useToast()

const code = ref('')
const isLoading = ref(false)

watch(open, (value) => {
  if (value) code.value = ''
})

async function handleConfirm() {
  isLoading.value = true
  try {
    const result = await $api.post<{ changed: boolean }>('/module/auth/password/change', {
      code: code.value.trim(),
      password: props.password,
      passwordRepeat: props.passwordRepeat,
    })
    if (result.data.changed) {
      toast.add({
        title: t('account.passwordChanged'),
        color: 'success',
      })
      open.value = false
      emit('changed')
    } else {
      toast.add({
        title: t('account.passwordChangeError'),
        color: 'error',
      })
    }
  } catch {
    toast.add({
      title: t('account.passwordChangeError'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

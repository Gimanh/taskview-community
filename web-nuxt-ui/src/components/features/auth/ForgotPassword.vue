<template>
  <div class="space-y-4">
    <!-- Success state -->
    <template v-if="isSent">
      <div class="text-center space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-mail-check"
            class="w-6 h-6 text-success"
          />
        </div>
        <div>
          <h3 class="font-medium">
            {{ t('auth.checkYourEmail') }}
          </h3>
          <p class="text-sm text-muted mt-1">
            {{ t('auth.resetLinkSent') }}
            <span class="font-medium">{{ state.email }}</span>
          </p>
        </div>
        <UButton
          :label="t('auth.backToLogin')"
          variant="outline"
          color="neutral"
          block
          @click="emit('back')"
        />
      </div>
    </template>

    <!-- Form -->
    <template v-else>
      <div class="text-center mb-4">
        <p class="text-sm text-muted">
          {{ t('auth.forgotPasswordDescription') }}
        </p>
      </div>

      <UForm
        :state="state"
        :schema="EmailSchema"
        class="space-y-4"
        @submit="onSubmit"
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
          :label="t('auth.sendResetLink')"
          type="submit"
          color="primary"
          block
          :loading="isLoading"
        />

        <UButton
          :label="t('auth.backToLogin')"
          variant="link"
          color="neutral"
          block
          @click="emit('back')"
        />
      </UForm>
    </template>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import qs from 'qs'
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'

const { t } = useI18n()

const emit = defineEmits<{
  back: []
  success: []
}>()

const toast = useToast()
const isLoading = ref(false)
const isSent = ref(false)

const EmailSchema = type({
  email: type('string.email').configure({ message: t('auth.invalidEmail') }),
})

type RecoveryResponse = {
  sent: boolean
}

const state = reactive({
  email: '',
})

async function onSubmit() {
  isLoading.value = true

  try {
    const result = await $api.post<RecoveryResponse>(
      '/module/auth/email/recovery',
      qs.stringify({ email: state.email }),
    )

    if (result.data.sent) {
      isSent.value = true
      toast.add({
        title: t('auth.emailSent'),
        description: t('auth.checkInboxForReset'),
        color: 'success',
      })
      emit('success')
    } else {
      toast.add({
        title: t('auth.error'),
        description: t('auth.failedToSendResetLink'),
        color: 'error',
      })
    }
  } catch {
    toast.add({
      title: t('auth.error'),
      description: t('auth.failedToSendResetLink'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

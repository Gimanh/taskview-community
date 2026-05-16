<template>
  <div class="space-y-4">
    <UForm
      :state="state"
      :schema="activeSchema"
      class="space-y-4"
      @submit="handleSubmit"
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

      <UFormField
        v-if="showCodeField"
        :label="t('auth.verificationCode')"
        name="code"
      >
        <UInput
          v-model="state.code"
          placeholder="000000"
          icon="i-lucide-key-round"
          class="w-full text-center tracking-widest"
          inputmode="numeric"
          autocomplete="one-time-code"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          maxlength="6"
          pattern="[0-9]{6}"
        />
      </UFormField>

      <p
        v-if="showCodeField"
        class="text-sm text-muted"
      >
        {{ t('auth.enterCode') }}
        <span class="font-medium">{{ state.email }}</span>
      </p>

      <UButton
        :label="showCodeField ? t('auth.verifyAndSignIn') : t('auth.sendCode')"
        type="submit"
        color="primary"
        block
        :loading="isLoading"
      />

      <div
        v-if="showCodeField"
        class="flex items-center justify-between text-sm"
      >
        <UButton
          :label="t('auth.back')"
          variant="link"
          color="neutral"
          size="sm"
          @click="goBack"
        />
        <UButton
          :label="t('auth.resendCode')"
          variant="link"
          color="neutral"
          size="sm"
          :loading="isLoading"
          @click="resendCode"
        />
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'
import { redirectToUser } from './auth.helper'

const { t } = useI18n()
const router = useRouter()

const emit = defineEmits<{
  success: [token: string]
}>()

const toast = useToast()

const showCodeField = ref(false)
const isLoading = ref(false)

const emailType = type('string.email').configure({ message: t('auth.invalidEmail') })
const codeType = type('/^\\d{6}$/').configure({ message: t('auth.codeMustBe6') })

const EmailSchema = type({
  email: emailType,
})

const CodeSchema = type({
  email: emailType,
  code: codeType,
})

const activeSchema = computed(() => showCodeField.value ? CodeSchema : EmailSchema)

type LoginResponse = {
  access: string
  refresh: string
}

const state = reactive({
  email: '',
  code: '',
})

onMounted(async () => {
  const savedEmail = await $ls.getValue('user-email')
  if (savedEmail) {
    state.email = savedEmail
  }
})

async function handleSubmit() {
  isLoading.value = true

  try {
    if (showCodeField.value) {
      const result = await $api.post<LoginResponse>('/module/auth/login-by-code', {
        code: state.code.trim(),
        email: state.email.trim(),
      })

      if (result.data.access) {
        $ls.setToken(result.data.access)
        $ls.setRefreshToken(result.data.refresh)
        await $ls.updateUserStoreByToken()

        toast.add({
          title: t('auth.success'),
          description: t('auth.loggedIn'),
          color: 'success',
        })

        emit('success', result.data.access)
        await redirectToUser(router)
      }
    } else {
      const email = state.email.trim()
      await $api.post('/module/auth/send-login-code', { email })
      await $ls.setValue('user-email', email)

      toast.add({
        title: t('auth.codeSent'),
        description: t('auth.checkInbox', { email }),
        color: 'success',
      })

      showCodeField.value = true
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } }
    const status = axiosError.response?.status
    if (showCodeField.value) {
      let description = t('auth.loginFailed')
      if (status === 429) description = t('auth.tooManyAttempts')
      else if (status === 400 || status === 403) description = t('auth.invalidCode')
      toast.add({ title: t('auth.error'), description, color: 'error' })
    } else {
      toast.add({
        title: t('auth.error'),
        description: status === 429 ? t('auth.tooManyAttempts') : t('auth.failedToSendCode'),
        color: 'error',
      })
    }
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  showCodeField.value = false
  state.code = ''
}

async function resendCode() {
  const email = state.email.trim()
  if (!email) return

  isLoading.value = true

  try {
    await $api.post('/module/auth/send-login-code', { email })

    toast.add({
      title: t('auth.codeResent'),
      description: t('auth.newCodeSent', { email }),
      color: 'success',
    })
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status
    toast.add({
      title: t('auth.error'),
      description: status === 429 ? t('auth.tooManyAttempts') : t('auth.failedToResendCode'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

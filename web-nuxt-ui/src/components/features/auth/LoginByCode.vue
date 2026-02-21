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
const codeType = type('string > 0').configure({ message: t('auth.codeMustBe6') })

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
        code: state.code,
        email: state.email,
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
        redirectToUser(router)
      }
    } else {
      await $api.post('/module/auth/send-login-code', { email: state.email })
      await $ls.setValue('user-email', state.email)

      toast.add({
        title: t('auth.codeSent'),
        description: t('auth.checkInbox', { email: state.email }),
        color: 'success',
      })

      showCodeField.value = true
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } }
    if (showCodeField.value) {
      toast.add({
        title: t('auth.error'),
        description: axiosError.response?.status === 403 ? t('auth.invalidCode') : t('auth.loginFailed'),
        color: 'error',
      })
    } else {
      toast.add({
        title: t('auth.error'),
        description: t('auth.failedToSendCode'),
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
  if (!state.email) return

  isLoading.value = true

  try {
    await $api.post('/module/auth/send-login-code', { email: state.email })

    toast.add({
      title: t('auth.codeResent'),
      description: t('auth.newCodeSent', { email: state.email }),
      color: 'success',
    })
  } catch {
    toast.add({
      title: t('auth.error'),
      description: t('auth.failedToResendCode'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

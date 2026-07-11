<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3">
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <UIcon
          name="i-lucide-triangle-alert"
          class="size-5 text-warning shrink-0"
        />
        {{ t('account.defaultCredsTitle') }}
      </h2>
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-alert"
        :title="t('account.defaultCredsWarning')"
        :description="t('account.defaultCredsDescription')"
      />
    </div>

    <UForm
      :state="state"
      :schema="CredentialsSchema"
      :validate="validatePasswordsMatch"
      class="space-y-4"
      @submit="save"
    >
      <UFormField
        :label="t('account.newLogin')"
        name="login"
      >
        <UInput
          v-model="state.login"
          :placeholder="t('account.newLoginPlaceholder')"
          icon="i-lucide-user"
          autocomplete="username"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('account.newEmail')"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          :placeholder="t('auth.emailPlaceholder')"
          icon="i-lucide-mail"
          autocomplete="email"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('auth.newPassword')"
        name="password"
      >
        <UInput
          v-model="state.password"
          :type="showNewPassword ? 'text' : 'password'"
          :placeholder="t('auth.newPasswordPlaceholder')"
          icon="i-lucide-lock"
          autocomplete="new-password"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              @click="showNewPassword = !showNewPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        :label="t('auth.confirmPassword')"
        name="passwordRepeat"
      >
        <UInput
          v-model="state.passwordRepeat"
          :type="showNewPasswordRepeat ? 'text' : 'password'"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          icon="i-lucide-lock"
          autocomplete="new-password"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showNewPasswordRepeat ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              @click="showNewPasswordRepeat = !showNewPasswordRepeat"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        :label="t('account.currentPassword')"
        name="currentPassword"
      >
        <UInput
          v-model="state.currentPassword"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('account.currentPasswordPlaceholder')"
          icon="i-lucide-lock"
          autocomplete="current-password"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <div>
        <UButton
          :label="t('account.saveCredentials')"
          type="submit"
          color="primary"
          :loading="isSaving"
        />
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import { isAxiosError } from 'axios'
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const isSaving = ref(false)
const showPassword = ref(false)
const showNewPassword = ref(false)
const showNewPasswordRepeat = ref(false)

const CredentialsSchema = type({
  login: type('3 <= string <= 64').configure({ message: t('account.loginInvalid') }),
  email: type('string.email').configure({ message: t('auth.invalidEmail') }),
  password: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
  passwordRepeat: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
  currentPassword: type('string >= 1').configure({ message: t('account.currentPasswordRequired') }),
})

const state = reactive({
  login: '',
  email: '',
  password: '',
  passwordRepeat: '',
  currentPassword: '',
})

function validatePasswordsMatch(formState: Partial<{ password: string; passwordRepeat: string }>) {
  const errors = []
  if (formState.password && formState.passwordRepeat && formState.password !== formState.passwordRepeat) {
    errors.push({ name: 'passwordRepeat', message: t('auth.passwordsDoNotMatch') })
  }
  return errors
}

async function save() {
  isSaving.value = true
  try {
    const result = await $api.post<{ changed: boolean }>('/module/auth/credentials/change', {
      currentPassword: state.currentPassword,
      login: state.login.trim(),
      email: state.email.trim(),
      password: state.password,
      passwordRepeat: state.passwordRepeat,
    })
    if (result.data.changed) {
      toast.add({
        title: t('account.credentialsChanged'),
        color: 'success',
      })
      $ls.invalidateTokens()
      router.push('/')
    }
  } catch (error) {
    toast.add({
      title: errorMessage(error),
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const field = error.response?.data?.field
    if (error.response?.status === 403 && field === 'currentPassword') return t('account.wrongPassword')
    if (error.response?.status === 409 && field === 'login') return t('account.loginTaken')
    if (error.response?.status === 409 && field === 'email') return t('account.emailTaken')
  }
  return t('account.credentialsChangeError')
}
</script>

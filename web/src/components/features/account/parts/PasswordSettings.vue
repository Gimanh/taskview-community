<template>
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="text-lg font-semibold">
        {{ t('account.password') }}
      </h2>
      <p class="text-sm text-muted mt-1">
        {{ byCurrentPassword ? t('account.passwordDescriptionByPassword') : t('account.passwordDescription') }}
      </p>
    </div>

    <UForm
      :state="state"
      :schema="PasswordSchema"
      :validate="validatePasswordsMatch"
      class="space-y-4"
      @submit="sendCode"
    >
      <UFormField
        :label="t('auth.newPassword')"
        name="password"
      >
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('auth.newPasswordPlaceholder')"
          icon="i-lucide-lock"
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

      <UFormField
        :label="t('auth.confirmPassword')"
        name="passwordRepeat"
      >
        <UInput
          v-model="state.passwordRepeat"
          :type="showPasswordRepeat ? 'text' : 'password'"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          icon="i-lucide-lock"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showPasswordRepeat ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              @click="showPasswordRepeat = !showPasswordRepeat"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        v-if="byCurrentPassword"
        :label="t('account.currentPassword')"
        name="currentPassword"
      >
        <UInput
          v-model="state.currentPassword"
          :type="showCurrentPassword ? 'text' : 'password'"
          :placeholder="t('account.currentPasswordPlaceholder')"
          icon="i-lucide-lock"
          autocomplete="current-password"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showCurrentPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              @click="showCurrentPassword = !showCurrentPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <div>
        <UButton
          :label="byCurrentPassword ? t('account.changePassword') : t('account.sendPasswordCode')"
          type="submit"
          color="primary"
          :loading="isSending"
        />
      </div>
    </UForm>

    <PasswordCodeModal
      v-model:open="showCodeModal"
      :password="state.password"
      :password-repeat="state.passwordRepeat"
      @changed="onPasswordChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import { isAxiosError } from 'axios'
import { ref, computed, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'
import { logError } from '@/helpers/Helper'
import PasswordCodeModal from './PasswordCodeModal.vue'

const { t } = useI18n()
const toast = useToast()

const isSending = ref(false)
const showPassword = ref(false)
const showPasswordRepeat = ref(false)
const showCurrentPassword = ref(false)
const showCodeModal = ref(false)

const confirmationMode = ref<'email' | 'password'>('email')
const byCurrentPassword = computed(() => confirmationMode.value === 'password')

onMounted(async () => {
  const result = await $api
    .get<{ mode: 'email' | 'password' }>('/module/auth/password/change/mode')
    .catch(logError)
  if (result) confirmationMode.value = result.data.mode
})

const PasswordSchema = type({
  password: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
  passwordRepeat: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
})

const state = reactive({
  password: '',
  passwordRepeat: '',
  currentPassword: '',
})

function validatePasswordsMatch(formState: Partial<{ password: string; passwordRepeat: string; currentPassword: string }>) {
  const errors = []
  if (formState.password && formState.passwordRepeat && formState.password !== formState.passwordRepeat) {
    errors.push({ name: 'passwordRepeat', message: t('auth.passwordsDoNotMatch') })
  }
  if (byCurrentPassword.value && !formState.currentPassword) {
    errors.push({ name: 'currentPassword', message: t('account.currentPasswordRequired') })
  }
  return errors
}

async function sendCode() {
  if (byCurrentPassword.value) {
    await changeByCurrentPassword()
    return
  }

  isSending.value = true
  try {
    await $api.post('/module/auth/password/change/code')
    showCodeModal.value = true
  } catch (error) {
    const isCooldown = isAxiosError(error) && error.response?.status === 429
    toast.add({
      title: isCooldown ? t('account.passwordCodeCooldown') : t('account.passwordCodeSendError'),
      color: 'error',
    })
  } finally {
    isSending.value = false
  }
}

async function changeByCurrentPassword() {
  isSending.value = true
  try {
    const result = await $api.post<{ changed: boolean }>('/module/auth/password/change', {
      currentPassword: state.currentPassword,
      password: state.password,
      passwordRepeat: state.passwordRepeat,
    })
    if (result.data.changed) {
      toast.add({
        title: t('account.passwordChanged'),
        color: 'success',
      })
      onPasswordChanged()
    }
  } catch (error) {
    const isWrongPassword = isAxiosError(error) && error.response?.status === 403
    toast.add({
      title: isWrongPassword ? t('account.wrongPassword') : t('account.passwordChangeError'),
      color: 'error',
    })
  } finally {
    isSending.value = false
  }
}

function onPasswordChanged() {
  state.password = ''
  state.passwordRepeat = ''
  state.currentPassword = ''
  showPassword.value = false
  showPasswordRepeat.value = false
  showCurrentPassword.value = false
}
</script>

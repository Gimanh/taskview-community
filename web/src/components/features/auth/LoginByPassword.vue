<template>
  <UForm
    :state="state"
    :schema="LoginSchema"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField
      :label="t('auth.login')"
      name="login"
    >
      <UInput
        v-model="state.login"
        :placeholder="t('auth.loginPlaceholder')"
        icon="i-lucide-user"
        class="w-full"
        data-testid="login-input"
      />
    </UFormField>

    <UFormField
      :label="t('auth.passwordLabel')"
      name="password"
    >
      <UInput
        v-model="state.password"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="t('auth.passwordPlaceholder')"
        icon="i-lucide-lock"
        class="w-full"
        data-testid="password-input"
      >
        <template #trailing>
          <UButton
            :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            color="neutral"
            variant="link"
            size="sm"
            :padded="false"
            @click="showPassword = !showPassword"
          />
        </template>
      </UInput>
    </UFormField>

    <div class="flex justify-end">
      <UButton
        :label="t('auth.forgotPassword')"
        variant="link"
        color="neutral"
        size="sm"
        @click="emit('forgotPassword')"
      />
    </div>

    <UButton
      :label="t('auth.signIn')"
      type="submit"
      color="primary"
      block
      :loading="isLoading"
      data-testid="sign-in-button"
    />
  </UForm>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import qs from 'qs'
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'
import { redirectToUser } from './auth.helper'

const { t } = useI18n()
const router = useRouter()

const emit = defineEmits<{
  success: [token: string]
  forgotPassword: []
}>()

const toast = useToast()
const isLoading = ref(false)
const showPassword = ref(false)

const LoginSchema = type({
  login: type('string > 0').configure({ message: t('auth.loginRequired') }),
  password: type('string > 0').configure({ message: t('auth.passwordRequired') }),
})

type LoginState = typeof LoginSchema.infer

type LoginResponse = {
  access: string
  refresh: string
}

const state = reactive<LoginState>({
  login: '',
  password: '',
})

async function onSubmit() {
  isLoading.value = true

  try {
    const { login, password } = state
    const result = await $api.post<LoginResponse>('/module/auth/login', qs.stringify({ login, password }))

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
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } }
    if (axiosError.response?.status === 403) {
      toast.add({
        title: t('auth.error'),
        description: t('auth.invalidCredentials'),
        color: 'error',
      })
    } else {
      toast.add({
        title: t('auth.error'),
        description: t('auth.loginFailed'),
        color: 'error',
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

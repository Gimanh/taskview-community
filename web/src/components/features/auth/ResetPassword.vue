<template>
  <div class="space-y-4">
    <!-- Success state -->
    <template v-if="isReset">
      <div class="text-center space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-check-circle"
            class="w-6 h-6 text-success"
          />
        </div>
        <div>
          <h3 class="font-medium">
            {{ t('auth.passwordReset') }}
          </h3>
          <p class="text-sm text-muted mt-1">
            {{ t('auth.passwordResetSuccess') }}
          </p>
        </div>
        <UButton
          :label="t('auth.backToLogin')"
          color="primary"
          block
          @click="goToLogin"
        />
      </div>
    </template>

    <!-- Error state - invalid reset link -->
    <template v-else-if="!isValidLink">
      <div class="text-center space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-alert-circle"
            class="w-6 h-6 text-error"
          />
        </div>
        <div>
          <h3 class="font-medium">
            {{ t('auth.invalidResetLink') }}
          </h3>
          <p class="text-sm text-muted mt-1">
            {{ t('auth.invalidResetLinkDescription') }}
          </p>
        </div>
        <UButton
          :label="t('auth.backToLogin')"
          variant="outline"
          color="neutral"
          block
          @click="goToLogin"
        />
      </div>
    </template>

    <!-- Form -->
    <template v-else>
      <div class="text-center mb-4">
        <h3 class="font-medium">
          {{ t('auth.setNewPassword') }}
        </h3>
        <p class="text-sm text-muted mt-1">
          {{ t('auth.setNewPasswordDescription') }}
        </p>
      </div>

      <UForm
        :state="state"
        :schema="PasswordSchema"
        :validate="validatePasswordsMatch"
        class="space-y-4"
        @submit="onSubmit"
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
                :padded="false"
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
                :padded="false"
                @click="showPasswordRepeat = !showPasswordRepeat"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton
          :label="t('auth.resetPassword')"
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
          @click="goToLogin"
        />
      </UForm>
    </template>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import qs from 'qs'
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import $api from '@/helpers/axios'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const toast = useToast()

const isLoading = ref(false)
const isReset = ref(false)
const showPassword = ref(false)
const showPasswordRepeat = ref(false)

const resetCode = computed(() => route.query.resetCode as string | undefined)
const login = computed(() => route.query.login as string | undefined)
const isValidLink = computed(() => !!resetCode.value && !!login.value)

const PasswordSchema = type({
  password: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
  passwordRepeat: type('string >= 6').configure({ message: t('auth.passwordTooShort') }),
})

type ResetResponse = {
  reset: boolean
}

const state = reactive({
  password: '',
  passwordRepeat: '',
})

function validatePasswordsMatch(state: Partial<{ password: string; passwordRepeat: string }>) {
  const errors = []
  if (state.password && state.passwordRepeat && state.password !== state.passwordRepeat) {
    errors.push({ name: 'passwordRepeat', message: t('auth.passwordsDoNotMatch') })
  }
  return errors
}

async function onSubmit() {
  if (!isValidLink.value) return

  isLoading.value = true

  try {
    const result = await $api.post<ResetResponse>(
      '/module/auth/password/reset',
      qs.stringify({
        code: resetCode.value,
        login: login.value,
        password: state.password,
        passwordRepeat: state.passwordRepeat,
      }),
    )

    if (result.data.reset) {
      isReset.value = true
      toast.add({
        title: t('auth.success'),
        description: t('auth.passwordResetSuccess'),
        color: 'success',
      })
    } else {
      toast.add({
        title: t('auth.error'),
        description: t('auth.canNotResetPassword'),
        color: 'error',
      })
    }
  } catch {
    toast.add({
      title: t('auth.error'),
      description: t('auth.canNotResetPassword'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

function goToLogin() {
  router.push('/')
}
</script>

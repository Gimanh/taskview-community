<template>
  <div class="w-full max-w-sm mx-auto space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold">
        {{ t('auth.welcome') }}
      </h1>
      <p class="text-muted mt-1">
        {{ t('auth.signInToAccount') }}
      </p>
    </div>

    <!-- Forgot Password View -->
    <template v-if="currentView === 'forgot'">
      <ForgotPassword
        @back="currentView = 'password'"
        @success="currentView = 'password'"
      />
    </template>

    <!-- Login Views -->
    <template v-else-if="isLoadingOptions">
      <div class="flex justify-center py-10">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>
    </template>

    <template v-else>
      <SocialButtons
        v-if="loginOptions.socialProviders.length > 0"
        :providers="loginOptions.socialProviders"
      />

      <!-- Divider -->
      <div
        v-if="loginOptions.socialProviders.length > 0 && tabs.length > 0"
        class="relative"
      >
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-default" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-default px-2 text-muted">{{ t('auth.orContinueWith') }}</span>
        </div>
      </div>

      <!-- Single method — no tabs needed -->
      <template v-if="tabs.length === 1">
        <LoginByCode
          v-if="tabs[0].value === 'code'"
          @success="handleSuccess"
        />
        <LoginByPassword
          v-else-if="tabs[0].value === 'password'"
          @success="handleSuccess"
          @forgot-password="currentView = 'forgot'"
        />
        <LoginBySso v-else-if="tabs[0].value === 'sso'" />
      </template>

      <!-- Tabs -->
      <UTabs
        v-else-if="tabs.length > 1"
        v-model="currentView"
        :items="tabs"
        class="w-full"
        @update:model-value="onTabChange"
      >
        <template #code>
          <div class="pt-4">
            <LoginByCode @success="handleSuccess" />
          </div>
        </template>

        <template #password>
          <div class="pt-4">
            <LoginByPassword
              @success="handleSuccess"
              @forgot-password="currentView = 'forgot'"
            />
          </div>
        </template>

        <template #sso>
          <div class="pt-4">
            <LoginBySso />
          </div>
        </template>
      </UTabs>
    </template>
    
    <!-- Server Selector (hidden when the API URL is pinned at deploy time) -->
    <UCollapsible
      v-if="!isServerLocked"
      class="flex flex-col gap-2"
    >
      <UButton
        class="group"
        :label="t('server.selectServer')"
        color="neutral"
        variant="ghost"
        icon="i-lucide-server"
        trailing-icon="i-lucide-chevron-down"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
        }"
        block
      />

      <template #content>
        <ServerSelector class="p-2 border border-default rounded-lg" />
      </template>
    </UCollapsible>

    <!-- Footer -->
    <p class="text-center text-xs text-muted">
      {{ t('auth.termsText') }}
      <a
        href="#"
        class="underline hover:text-foreground"
      >{{ t('auth.termsOfService') }}</a>
      {{ t('auth.and') }}
      <a
        href="#"
        class="underline hover:text-foreground"
      >{{ t('auth.privacyPolicy') }}</a>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import $api from '@/helpers/axios'
import { logError } from '@/helpers/Helper'
import { getConfiguredApiUrl } from '@/helpers/serverConfig'
import LoginByCode from './LoginByCode.vue'
import LoginByPassword from './LoginByPassword.vue'
import LoginBySso from './LoginBySso.vue'
import ForgotPassword from './ForgotPassword.vue'
import SocialButtons from './SocialButtons.vue'
import ServerSelector from './ServerSelector.vue'

const { t } = useI18n()

const emit = defineEmits<{
  success: [token: string]
}>()

type View = 'code' | 'password' | 'sso' | 'forgot'

type LoginOptions = {
  magicLink: boolean
  password: boolean
  sso: boolean
  socialProviders: string[]
}

const currentView = ref<View>('code')

const isLoadingOptions = ref(true)
const isServerLocked = getConfiguredApiUrl() !== null

const loginOptions = reactive<LoginOptions>({
  magicLink: true,
  password: true,
  sso: true,
  socialProviders: ['google', 'github', 'apple'],
})

onMounted(async () => {
  try {
    const result = await $api.get<LoginOptions>('/module/auth/login-options').catch(logError)
    if (result) Object.assign(loginOptions, result.data)
  } finally {
    isLoadingOptions.value = false
  }
})

const tabs = computed(() => {
  const items = []
  if (loginOptions.magicLink) items.push({ value: 'code', label: t('auth.magicLink'), slot: 'code' as const })
  if (loginOptions.password) items.push({ value: 'password', label: t('auth.password'), slot: 'password' as const })
  if (loginOptions.sso) items.push({ value: 'sso', label: 'SSO', slot: 'sso' as const })
  return items
})

watch(tabs, (items) => {
  if (currentView.value === 'forgot') return
  if (!items.some((item) => item.value === currentView.value)) {
    currentView.value = (items[0]?.value ?? 'code') as View
  }
})

function onTabChange(value: string | number) {
  currentView.value = value as View
}

function handleSuccess(token: string) {
  emit('success', token)
}

</script>

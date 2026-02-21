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
    <template v-else>
      <SocialButtons />

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-default" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-default px-2 text-muted">{{ t('auth.orContinueWith') }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <UTabs
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
      </UTabs>
    </template>
    
    <!-- Server Selector -->
    <UCollapsible class="flex flex-col gap-2">
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
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LoginByCode from './LoginByCode.vue'
import LoginByPassword from './LoginByPassword.vue'
import ForgotPassword from './ForgotPassword.vue'
import SocialButtons from './SocialButtons.vue'
import ServerSelector from './ServerSelector.vue'

const { t } = useI18n()

const emit = defineEmits<{
  success: [token: string]
}>()

type View = 'code' | 'password' | 'forgot'

const currentView = ref<View>('code')

const tabs = computed(() => [
  { value: 'code', label: t('auth.magicLink'), slot: 'code' as const },
  { value: 'password', label: t('auth.password'), slot: 'password' as const },
])

function onTabChange(value: string | number) {
  currentView.value = value as View
}

function handleSuccess(token: string) {
  emit('success', token)
}

</script>

<template>
  <div
    class="p-4 flex flex-col gap-3"
    data-testid="onboarding-exit-dialog"
  >
    <p class="font-semibold text-highlighted leading-snug">
      {{ t('onboarding.exit.title') }}
    </p>
    <p class="text-sm text-muted">
      {{ t('onboarding.exit.description') }}
    </p>
    <div class="flex flex-col gap-2">
      <UButton
        :label="t('onboarding.exit.later')"
        color="primary"
        variant="soft"
        size="md"
        block
        data-testid="onboarding-exit-later"
        @click="emit('later')"
      />
      <UButton
        :label="t('onboarding.exit.never')"
        color="neutral"
        variant="soft"
        size="md"
        block
        data-testid="onboarding-exit-never"
        @click="emit('never')"
      />
      <UButton
        :label="t('onboarding.exit.back')"
        color="neutral"
        variant="ghost"
        size="md"
        block
        data-testid="onboarding-exit-back"
        @click="emit('back')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  later: []
  never: []
  back: []
}>()

const { t } = useI18n()
</script>

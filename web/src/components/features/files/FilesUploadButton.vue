<template>
  <UButton
    icon="i-lucide-paperclip"
    :label="label ?? t('files.attach')"
    color="neutral"
    variant="soft"
    :size="size ?? 'sm'"
    :ui="{ base: 'rounded-xl' }"
    data-testid="files-upload-button"
    @click="emit('click')"
  />
</template>

<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  label?: string
  size?: ButtonProps['size']
}>()

const emit = defineEmits<{
  click: []
}>()

const { t } = useI18n()
</script>

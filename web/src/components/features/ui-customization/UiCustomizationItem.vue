<template>
  <div class="flex items-center gap-3 p-3 bg-elevated rounded-lg">
    <UIcon
      name="i-lucide-grip-vertical"
      class="size-4 text-muted shrink-0 cursor-grab drag-handle"
    />
    <span
      class="flex-1 truncate"
      :class="{ 'text-muted': hidden }"
    >
      {{ label }}
    </span>
    <UButton
      v-if="width"
      :icon="width === 'wide' ? 'i-lucide-rectangle-horizontal' : 'i-lucide-square'"
      :label="width === 'wide' ? t('uiCustomization.wide') : t('uiCustomization.narrow')"
      color="neutral"
      variant="soft"
      size="sm"
      @click="$emit('toggleWidth')"
    />
    <UButton
      :icon="hidden ? 'i-lucide-eye-off' : 'i-lucide-eye'"
      :label="hidden ? t('uiCustomization.show') : t('uiCustomization.hide')"
      color="neutral"
      variant="soft"
      size="sm"
      @click="$emit('toggle')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ItemWidth } from '@/composables/useUiPreferences'

defineProps<{
  label: string
  hidden: boolean
  width?: ItemWidth
}>()

defineEmits<{
  toggle: []
  toggleWidth: []
}>()

const { t } = useI18n()
</script>

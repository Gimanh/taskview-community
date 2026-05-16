<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
    <UIcon
      name="i-lucide-lock"
      class="size-10 text-muted"
    />
    <p class="font-medium text-default">
      {{ t('timeTracking.reports.noPermission') }}
    </p>
    <p class="text-sm text-muted max-w-md">
      {{ t('timeTracking.reports.noPermissionHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

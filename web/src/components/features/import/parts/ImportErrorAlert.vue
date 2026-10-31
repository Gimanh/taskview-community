<template>
  <UAlert
    v-if="code"
    color="error"
    variant="soft"
    icon="i-lucide-alert-triangle"
    :title="t(`import.errors.${code}`)"
    data-testid="import-error"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImportRequestErrorCode } from 'taskview-api'

defineProps<{
  code: ImportRequestErrorCode | null
}>()

const { t } = useI18n()
</script>

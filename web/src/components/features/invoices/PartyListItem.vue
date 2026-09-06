<template>
  <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-default px-4 py-3">
    <UIcon
      :name="icon"
      class="size-5 shrink-0 text-muted"
    />
    <div class="flex min-w-0 flex-1 basis-52 flex-col">
      <span class="flex items-center gap-2 truncate font-medium text-default">
        {{ title }}
        <UBadge
          v-if="archived"
          :label="t('invoices.archivedBadge')"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </span>
      <span class="truncate text-xs text-muted">{{ subtitle }}</span>
    </div>
    <div class="ml-auto flex items-center">
      <UButton
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('edit')"
      />
      <UButton
        :icon="archived ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
        color="neutral"
        variant="ghost"
        size="sm"
        :title="archived ? t('invoices.unarchive') : t('invoices.archive')"
        @click="emit('archive', !archived)"
      />
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        @click="emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  icon: string
  title: string
  subtitle: string
  archived: boolean
}>()

const emit = defineEmits<{
  edit: []
  archive: [archived: boolean]
  delete: []
}>()

const { t } = useI18n()
</script>

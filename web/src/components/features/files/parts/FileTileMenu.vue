<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end' }"
  >
    <UButton
      icon="i-lucide-ellipsis-vertical"
      color="neutral"
      :variant="variant ?? 'ghost'"
      :size="size ?? 'xs'"
      :ui="variant === 'soft' ? { base: 'rounded-xl' } : undefined"
      :aria-label="t('files.menu.more')"
      data-testid="file-menu"
      @click.stop
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ButtonProps, DropdownMenuItem } from '@nuxt/ui'
import type { TvFile } from 'taskview-api'
import { useFileKind } from '@/composables/useFileKind'

const props = defineProps<{
  file: TvFile
  canManage: boolean
  inTask: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}>()

const emit = defineEmits<{
  download: []
  openInNewTab: []
  rename: []
  unlink: []
  delete: []
}>()

const { t } = useI18n()
const { isPreviewable } = useFileKind()

const items = computed<DropdownMenuItem[][]>(() => {
  const main: DropdownMenuItem[] = [
    { label: t('files.menu.download'), icon: 'i-lucide-download', onSelect: () => emit('download') },
  ]
  if (isPreviewable(props.file.mimeType)) {
    main.push({ label: t('files.menu.openInNewTab'), icon: 'i-lucide-external-link', onSelect: () => emit('openInNewTab') })
  }
  if (!props.canManage) return [main]

  const manage: DropdownMenuItem[] = [
    { label: t('files.menu.rename'), icon: 'i-lucide-pencil', onSelect: () => emit('rename') },
  ]
  if (props.inTask) {
    manage.push({ label: t('files.menu.unlink'), icon: 'i-lucide-unlink', onSelect: () => emit('unlink') })
  }
  const danger: DropdownMenuItem[] = [
    { label: t('files.menu.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete') },
  ]
  return [main, manage, danger]
})
</script>

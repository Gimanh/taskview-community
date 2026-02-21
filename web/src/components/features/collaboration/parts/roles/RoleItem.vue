<template>
  <div class="flex items-center justify-between p-3 rounded-lg border border-default hover:bg-elevated transition-colors">
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-shield"
        class="size-4 text-muted"
      />
      <p class="text-sm font-medium">
        {{ role.name }}
      </p>
      <span class="text-xs text-muted">
        {{ t('collaboration.roles.permissionsCount', { count: permissionsCount }) }}
      </span>
    </div>

    <UButton
      icon="i-lucide-ellipsis"
      color="neutral"
      variant="ghost"
      size="xs"
      @click.stop="$emit('menu', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CollaborationRole } from '@/types/collaboration-roles.types'

defineProps<{
  role: CollaborationRole
  permissionsCount: number
}>()

defineEmits<{
  menu: [event: MouseEvent]
}>()

const { t } = useI18n()
</script>

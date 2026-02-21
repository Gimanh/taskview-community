<template>
  <div class="flex items-center justify-between p-3 rounded-lg border border-default hover:bg-elevated transition-colors">
    <div class="flex items-center gap-3">
      <UAvatar
        :alt="member.email"
        size="sm"
      >
        {{ member.email.slice(0, 2).toUpperCase() }}
      </UAvatar>
      <div>
        <p class="text-sm font-medium">
          {{ member.email }}
        </p>
        <p class="text-xs text-muted">
          {{ t('collaboration.members.invitedAt') }}: {{ formatDate(member.invitation_date) }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div
        v-if="roleNames.length > 0"
        class="flex flex-wrap gap-1"
      >
        <UBadge
          v-for="roleName in roleNames"
          :key="roleName"
          :label="roleName"
          color="primary"
          variant="outline"
          size="xs"
        />
      </div>
      <span
        v-else
        class="text-xs text-muted"
      >
        {{ t('collaboration.members.noRoles') }}
      </span>
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="xs"
        @click.stop="$emit('menu', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationResponseFetchAllUsers } from 'taskview-api'
import type { CollaborationRole } from '@/types/collaboration-roles.types'

const props = defineProps<{
  member: CollaborationResponseFetchAllUsers
  roles: CollaborationRole[]
}>()

defineEmits<{
  menu: [event: MouseEvent]
}>()

const { t } = useI18n()

const roleNames = computed(() => {
  return props.member.roles
    .map(roleId => props.roles.find(r => r.id === roleId)?.name)
    .filter(Boolean) as string[]
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}
</script>

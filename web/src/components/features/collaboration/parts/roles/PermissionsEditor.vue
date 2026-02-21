<template>
  <div class="space-y-4">
    <UInput
      v-model="searchQuery"
      :placeholder="t('collaboration.permissions.searchPlaceholder')"
      size="xl"
      variant="soft"
      class="w-full"
      :ui="{
        base: 'bg-tv-ui-bg-elevated',
      }"
    >
      <template #trailing>
        <UButton
          v-if="searchQuery"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="searchQuery = ''"
        />
        <UIcon
          v-else
          name="i-lucide-search"
          class="size-4 text-dimmed"
        />
      </template>
    </UInput>

    <div
      v-for="group in filteredPermissionGroups"
      :key="group.groupId"
      class="space-y-2"
    >
      <h4 class="text-sm font-medium">
        {{ getGroupName(group.groupId) }}
      </h4>
      <div class="space-y-1">
        <label
          v-for="permission in group.permissions"
          :key="permission.id"
          class="flex items-start gap-3 p-2 rounded hover:bg-elevated cursor-pointer"
        >
          <UCheckbox
            :model-value="!!selectedPermissions[permission.id]"
            class="mt-0.5"
            @update:model-value="$emit('toggle', permission.id)"
          />
          <div class="flex-1">
            <p class="text-base ">
              {{ getLocalizedDescription(permission) }}
            </p>
            <p class="text-xs text-muted">
              {{ permission.name }}
            </p>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationPermission } from 'taskview-api'
import { PermissionGroups, type PermissioinGroupsIds } from '@/types/collaboration-permissions.types'

const props = defineProps<{
  permissions: CollaborationPermission[]
  selectedPermissions: Record<number, true>
}>()

defineEmits<{
  toggle: [permissionId: number]
}>()

const { t, locale } = useI18n()

const searchQuery = ref('')

const permissionGroups = computed(() => {
  const groups: Record<number, CollaborationPermission[]> = {}

  for (const permission of props.permissions) {
    const groupId = permission.permission_group
    if (!groups[groupId]) {
      groups[groupId] = []
    }
    groups[groupId].push(permission)
  }

  return Object.entries(groups).map(([groupId, permissions]) => ({
    groupId: Number(groupId) as PermissioinGroupsIds,
    permissions,
  }))
})

function getLocalizedDescription(permission: CollaborationPermission): string {
  try {
    const locales = JSON.parse(permission.descriptionLocales || '{}')
    return locales[locale.value] || locales.en || permission.description
  } catch {
    return permission.description
  }
}

const filteredPermissionGroups = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return permissionGroups.value

  return permissionGroups.value
    .map(group => ({
      ...group,
      permissions: group.permissions.filter(permission => {
        const localizedDesc = getLocalizedDescription(permission).toLowerCase()
        return permission.name.toLowerCase().includes(query) || localizedDesc.includes(query)
      }),
    }))
    .filter(group => group.permissions.length > 0)
})

function getGroupName(groupId: PermissioinGroupsIds): string {
  const group = PermissionGroups[groupId]
  if (!group) return ''
  return group[locale.value as 'en' | 'ru'] || group.en
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">
      {{ t('collaboration.roles.title') }}
    </h3>

    <RoleAddInput
      :loading="loading"
      @add="$emit('create', $event)"
    />

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="roles.length === 0"
      class="flex flex-col items-center justify-center py-12 text-muted"
    >
      <UIcon
        name="i-lucide-shield"
        class="size-12 mb-4"
      />
      <p>{{ t('collaboration.roles.empty') }}</p>
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <RoleItem
        v-for="role in roles"
        :key="role.id"
        :role="role"
        :permissions-count="getPermissionsCount(role.id)"
        @menu="openContextMenu($event, role)"
      />
    </div>

    <TvContextMenu ref="contextMenu">
      <div class="p-1 flex flex-col gap-1">
        <UButton
          :label="t('collaboration.roles.assignPermissions')"
          icon="i-lucide-shield-check"
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          @click="openEditModal"
        />
        <USeparator class="my-1" />
        <UButton
          :label="t('contextMenu.delete')"
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          class="w-full justify-start"
          @click="openDeleteDialog"
        />
      </div>
    </TvContextMenu>

    <RoleEditModal
      v-model:open="isEditModalOpen"
      :role="selectedRole"
      :permissions="permissions"
      :role-permissions="getRolePermissions(selectedRole?.id)"
      @toggle-permission="handleTogglePermission"
    />

    <RoleDeleteDialog
      v-model:open="isDeleteDialogOpen"
      :role="selectedRole"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationPermission } from 'taskview-api'
import type { CollaborationRole, CollaborationRolesStore } from '@/types/collaboration-roles.types'
import TvContextMenu from '@/components/features/base/TvContextMenu.vue'
import RoleItem from './RoleItem.vue'
import RoleAddInput from './RoleAddInput.vue'
import RoleEditModal from './RoleEditModal.vue'
import RoleDeleteDialog from './RoleDeleteDialog.vue'

const props = defineProps<{
  roles: CollaborationRole[]
  permissions: CollaborationPermission[]
  rolesPermissions: CollaborationRolesStore['rolesPermissions']
  goalId: number
  loading?: boolean
}>()

const emit = defineEmits<{
  create: [name: string]
  togglePermission: [data: { roleId: number; permissionId: number }]
  delete: [roleId: number]
}>()

const { t } = useI18n()

const contextMenu = ref<InstanceType<typeof TvContextMenu> | null>(null)
const selectedRole = ref<CollaborationRole | null>(null)
const isEditModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)

function getPermissionsCount(roleId: number): number {
  const perms = props.rolesPermissions[roleId]
  return perms ? Object.keys(perms).length : 0
}

function getRolePermissions(roleId?: number): Record<number, true> {
  if (!roleId) return {}
  return props.rolesPermissions[roleId] || {}
}

function openContextMenu(event: MouseEvent, role: CollaborationRole) {
  selectedRole.value = role
  contextMenu.value?.openAt(event)
}

function openEditModal() {
  contextMenu.value?.close()
  isEditModalOpen.value = true
}

function openDeleteDialog() {
  contextMenu.value?.close()
  isDeleteDialogOpen.value = true
}

function handleTogglePermission(permissionId: number) {
  if (selectedRole.value) {
    emit('togglePermission', {
      roleId: selectedRole.value.id,
      permissionId,
    })
  }
}

function handleDelete() {
  if (selectedRole.value) {
    emit('delete', selectedRole.value.id)
    isDeleteDialogOpen.value = false
  }
}
</script>

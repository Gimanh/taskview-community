<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
  >
  <template #header="{close}">
    <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          {{ t('collaboration.roles.assignPermissions') }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="close"
        />
      </div>
  </template>
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-2 p-3 bg-elevated rounded-lg">
          <UIcon
            name="i-lucide-shield"
            class="size-5"
          />
          <span class="font-medium">{{ role?.name }}</span>
        </div>

        <PermissionsEditor
          :permissions="permissions"
          :selected-permissions="rolePermissions"
          @toggle="$emit('togglePermission', $event)"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          :label="t('common.done')"
          color="primary"
          variant="outline"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CollaborationPermission } from 'taskview-api'
import type { CollaborationRole } from '@/types/collaboration-roles.types'
import PermissionsEditor from './PermissionsEditor.vue'
import { useTaskView } from '@/composables/useTaskView'

defineProps<{
  role: CollaborationRole | null
  permissions: CollaborationPermission[]
  rolePermissions: Record<number, true>
}>()

defineEmits<{
  togglePermission: [permissionId: number]
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isMobile } = useTaskView()
</script>

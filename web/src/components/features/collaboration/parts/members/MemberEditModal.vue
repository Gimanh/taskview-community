<template>
  <UModal
    v-model:open="isOpen"
    :title="t('collaboration.members.assignRoles')"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-3 p-3 bg-elevated rounded-lg">
          <UAvatar
            :alt="member?.email"
            size="sm"
          >
            {{ member?.email?.slice(0, 2).toUpperCase() }}
          </UAvatar>
          <div>
            <p class="text-sm font-medium">
              {{ member?.email }}
            </p>
          </div>
        </div>

        <UFormField :label="t('collaboration.members.selectRoles')">
          <div class="space-y-2">
            <label
              v-for="role in roles"
              :key="role.id"
              class="flex items-center gap-3 p-2 rounded hover:bg-elevated cursor-pointer"
            >
              <UCheckbox
                :model-value="selectedRoleIds.includes(role.id)"
                @update:model-value="toggleRole(role.id, $event)"
              />
              <div class="flex-1">
                <p class="text-sm font-medium">
                  {{ role.name }}
                </p>
              </div>
            </label>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="isOpen = false"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          variant="outline"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationResponseFetchAllUsers } from 'taskview-api'
import type { CollaborationRole } from '@/types/collaboration-roles.types'

const props = defineProps<{
  member: CollaborationResponseFetchAllUsers | null
  roles: CollaborationRole[]
}>()

const emit = defineEmits<{
  save: [data: { userId: number; roles: number[] }]
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

const selectedRoleIds = ref<number[]>([])

watch(
  () => props.member,
  (member) => {
    if (member) {
      selectedRoleIds.value = [...member.roles]
    }
  },
  { immediate: true },
)

function toggleRole(roleId: number, enabled: boolean | string) {
  if (enabled) {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
  } else {
    selectedRoleIds.value = selectedRoleIds.value.filter(id => id !== roleId)
  }
}

function handleSave() {
  if (props.member) {
    emit('save', {
      userId: props.member.id,
      roles: selectedRoleIds.value,
    })
    isOpen.value = false
  }
}
</script>

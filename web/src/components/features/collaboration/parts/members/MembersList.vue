<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">
      {{ t('collaboration.members.title') }}
    </h3>

    <MemberAddInput
      :loading="loading"
      @add="$emit('invite', $event)"
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
      v-else-if="invitedMembers.length === 0"
      class="flex flex-col items-center justify-center py-12 text-muted"
    >
      <UIcon
        name="i-lucide-users"
        class="size-12 mb-4"
      />
      <p>{{ t('collaboration.members.empty') }}</p>
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <MemberItem
        v-for="member in invitedMembers"
        :key="member.id"
        :member="member"
        :roles="roles"
        @menu="openContextMenu($event, member)"
      />
    </div>

    <TvContextMenu ref="contextMenu">
      <div class="p-1 flex flex-col gap-1">
        <UButton
          :label="t('collaboration.members.assignRoles')"
          icon="i-lucide-user-cog"
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          @click="openEditModal"
        />
        <USeparator class="my-1" />
        <UButton
          :label="t('collaboration.members.remove')"
          icon="i-lucide-user-minus"
          variant="ghost"
          color="error"
          class="w-full justify-start"
          :disabled="selectedMember?.goalOwner"
          @click="handleRemove"
        />
      </div>
    </TvContextMenu>

    <MemberEditModal
      v-model:open="isEditModalOpen"
      :member="selectedMember"
      :roles="roles"
      @save="handleUpdateRoles"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationResponseFetchAllUsers } from 'taskview-api'
import type { CollaborationRole } from '@/types/collaboration-roles.types'
import TvContextMenu from '@/components/features/base/TvContextMenu.vue'
import MemberItem from './MemberItem.vue'
import MemberAddInput from './MemberAddInput.vue'
import MemberEditModal from './MemberEditModal.vue'

const props = defineProps<{
  members: CollaborationResponseFetchAllUsers[]
  roles: CollaborationRole[]
  goalId: number
  loading?: boolean
}>()

const invitedMembers = computed(() =>
  props.members.filter(member => !member.goalOwner),
)

const emit = defineEmits<{
  invite: [email: string]
  updateRoles: [data: { userId: number; roles: number[] }]
  remove: [userId: number]
}>()

const { t } = useI18n()

const contextMenu = ref<InstanceType<typeof TvContextMenu> | null>(null)
const selectedMember = ref<CollaborationResponseFetchAllUsers | null>(null)
const isEditModalOpen = ref(false)

function openContextMenu(event: MouseEvent, member: CollaborationResponseFetchAllUsers) {
  selectedMember.value = member
  contextMenu.value?.openAt(event)
}

function openEditModal() {
  contextMenu.value?.close()
  isEditModalOpen.value = true
}

function handleUpdateRoles(data: { userId: number; roles: number[] }) {
  emit('updateRoles', data)
}

function handleRemove() {
  if (selectedMember.value) {
    emit('remove', selectedMember.value.id)
  }
  contextMenu.value?.close()
}
</script>

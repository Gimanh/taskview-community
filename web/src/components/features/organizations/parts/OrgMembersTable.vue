<template>
  <div class="flex flex-col gap-4 pt-4">
    <div class="flex gap-2">
      <UInput
        v-model="newEmail"
        :placeholder="t('organizations.email')"
        class="flex-1"
      />
      <UButton
        :label="t('organizations.addMember')"
        :loading="adding"
        variant="outline"
        @click="handleAdd"
      />
    </div>

    <UTable
      :data="members"
      :columns="columns"
    >
      <template #email-cell="{ row }">
        <span class="text-sm font-medium">{{ row.original.email }}</span>
      </template>
      <template #role-cell="{ row }">
        <USelect
          v-if="row.original.role !== 'owner'"
          :model-value="row.original.role"
          :items="roleOptions"
          size="xs"
          @update:model-value="(val: string) => handleRoleChange(row.original.email, val)"
        />
        <UBadge
          v-else
          color="primary"
          variant="subtle"
          size="xs"
        >
          {{ t('organizations.owner') }}
        </UBadge>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          v-if="row.original.role !== 'owner'"
          icon="i-lucide-x"
          size="xs"
          variant="outline"
          color="error"
          @click="handleRemove(row.original.email)"
        />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OrgMember } from 'taskview-api'

const props = defineProps<{
  members: OrgMember[]
}>()

const emit = defineEmits<{
  add: [email: string]
  remove: [email: string]
  roleChange: [email: string, role: string]
}>()

const { t } = useI18n()

const newEmail = ref('')
const adding = ref(false)

const roleOptions = [
  { label: t('organizations.admin'), value: 'admin' },
  { label: t('organizations.member'), value: 'member' },
]

const columns = computed(() => [
  { accessorKey: 'email', header: t('organizations.email') },
  { accessorKey: 'role', header: t('organizations.role') },
  { accessorKey: 'actions', header: '' },
])

async function handleAdd() {
  if (!newEmail.value.trim()) return
  adding.value = true
  emit('add', newEmail.value.trim())
  newEmail.value = ''
  adding.value = false
}

function handleRoleChange(email: string, role: string) {
  emit('roleChange', email, role)
}

function handleRemove(email: string) {
  emit('remove', email)
}
</script>

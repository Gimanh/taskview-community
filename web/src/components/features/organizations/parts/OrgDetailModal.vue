<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: 'max-w-lg max-h-[90vh] flex flex-col' }"
  >
    <template #content>
      <UCard
        v-if="organization"
        :ui="{ root: 'flex flex-col flex-1 min-h-0', body: 'flex-1 min-h-0 overflow-y-auto' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ organization.name }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <UTabs
          :items="tabs"
          class="w-full"
        >
          <template #general>
            <div class="flex flex-col gap-4 pt-4">
              <UFormField :label="t('organizations.name')">
                <UInput
                  v-model="editName"
                  :disabled="!isAdmin"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('organizations.slug')">
                <UInput
                  v-model="editSlug"
                  :disabled="!isAdmin"
                  :placeholder="t('organizations.slugPlaceholder')"
                  class="w-full"
                />
              </UFormField>
              <UButton
                v-if="isAdmin"
                :label="t('organizations.save')"
                :loading="saving"
                @click="save"
              />
            </div>
          </template>

          <template #members>
            <OrgMembersTable
              :members="orgStore.members"
              @add="addMember"
              @remove="removeMember"
              @role-change="updateRole"
            />
          </template>
          <template #sso>
            <OrgSsoSettings :organization-id="organization.id" />
          </template>
        </UTabs>

        <template #footer>
          <div class="flex justify-between">
            <UButton
              v-if="isOwner"
              :label="t('organizations.delete')"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :ui="{leadingIcon: 'size-4.5'}"
              @click="deleteOrg"
            />
            <div v-else />
            <UButton
              :label="t('organizations.close')"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrganizationStore } from '@/stores/organization.store'
import { useTaskView } from '@/composables/useTaskView'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import OrgMembersTable from './OrgMembersTable.vue'
import OrgSsoSettings from './OrgSsoSettings.vue'

const open = defineModel<boolean>({ default: false })
const props = defineProps<{
  organization: any
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const orgStore = useOrganizationStore()
const { isAdmin, isOwner } = useOrgPermissions(() => props.organization)

const editName = ref('')
const editSlug = ref('')
const saving = ref(false)

const tabs = computed(() => {
  const items = [
    { label: t('organizations.general'), slot: 'general' },
  ]
  if (isAdmin.value) {
    items.push({ label: t('organizations.members'), slot: 'members' })
    items.push({ label: 'SSO', slot: 'sso' })
  }
  return items
})

watch(() => props.organization, (org) => {
  if (org) {
    editName.value = org.name
    editSlug.value = org.slug
    if (org.currentUserRole === 'owner' || org.currentUserRole === 'admin') {
      orgStore.fetchMembers(org.id)
    }
  }
}, { immediate: true })

async function save() {
  if (!props.organization) return
  saving.value = true
  try {
    const result = await orgStore.updateOrganization(props.organization.id, {
      name: editName.value,
      slug: editSlug.value,
    })
    if (result) {
      toast.add({ title: t('organizations.updated'), color: 'success' })
    } else {
      toast.add({ title: t('organizations.slugTaken'), color: 'error' })
    }
  } finally {
    saving.value = false
  }
}

async function addMember(email: string) {
  if (!props.organization) return
  const result = await orgStore.addMember(props.organization.id, email)
  if (result) {
    toast.add({ title: t('organizations.memberAdded'), color: 'success' })
  }
}

async function updateRole(email: string, role: string) {
  if (!props.organization) return
  await orgStore.updateMemberRole(props.organization.id, email, role as 'admin' | 'member')
  toast.add({ title: t('organizations.roleUpdated'), color: 'success' })
}

async function removeMember(email: string) {
  if (!props.organization) return
  await orgStore.removeMember(props.organization.id, email)
  toast.add({ title: t('organizations.memberRemoved'), color: 'success' })
}

async function deleteOrg() {
  if (!props.organization) return
  const result = await orgStore.deleteOrganization(props.organization.id)
  if (result) {
    toast.add({ title: t('organizations.deleted'), color: 'success' })
    open.value = false
  }
}
</script>

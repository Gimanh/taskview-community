<template>
  <div class="flex flex-col gap-2 p-2 rounded-md bg-elevated/50">
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm truncate">
          {{ group.displayName }}
        </p>
        <p class="text-xs text-dimmed">
          {{ t('scim.groups.members', { count: group.membersCount }) }}
        </p>
      </div>
      <UPopover v-model:open="adding">
        <UButton
          :label="t('scim.groups.addProject')"
          icon="i-lucide-plus"
          size="xs"
          variant="outline"
          :disabled="!projects.length"
        />
        <template #content>
          <OrgSsoScimGroupLinkForm
            :projects="projects"
            :saving="saving"
            @submit="link"
            @cancel="adding = false"
          />
        </template>
      </UPopover>
    </div>

    <div
      v-if="group.projects.length"
      class="flex flex-wrap gap-1"
    >
      <UBadge
        v-for="project in group.projects"
        :key="project.goalId"
        color="neutral"
        variant="subtle"
        class="gap-1"
      >
        {{ project.goalName }} · {{ project.roleName }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          variant="link"
          color="neutral"
          class="p-0"
          :aria-label="t('scim.groups.removeProject')"
          @click="unlink(project.goalId)"
        />
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'
import type { SsoScimGroup, SsoScimLinkableProject } from 'taskview-api'
import OrgSsoScimGroupLinkForm from './OrgSsoScimGroupLinkForm.vue'
import type { ScimGroupLink } from './OrgSsoScimGroupLinkForm.types'

const props = defineProps<{
  configId: number
  group: SsoScimGroup
  projects: SsoScimLinkableProject[]
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()

const adding = ref(false)
const saving = ref(false)

async function link(value: ScimGroupLink) {
  saving.value = true
  try {
    await $tvApi.sso.linkScimGroupProject({ configId: props.configId, groupId: props.group.id, ...value })
    adding.value = false
    emit('changed')
  } catch {
    toast.add({ title: t('scim.groups.linkFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function unlink(goalId: number) {
  try {
    await $tvApi.sso.unlinkScimGroupProject({ configId: props.configId, groupId: props.group.id, goalId })
    emit('changed')
  } catch {
    toast.add({ title: t('scim.groups.unlinkFailed'), color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 p-3 w-72">
    <UFormField :label="t('scim.groups.project')">
      <USelectMenu
        v-model="goalId"
        :items="projectItems"
        value-key="value"
        :placeholder="t('scim.groups.selectProject')"
        class="w-full"
      />
    </UFormField>
    <UFormField
      :label="t('scim.groups.role')"
      :hint="t('scim.groups.roleHint')"
    >
      <USelectMenu
        v-model="roleId"
        :items="roleItems"
        value-key="value"
        :placeholder="t('scim.groups.selectRole')"
        :disabled="!goalId"
        class="w-full"
      />
    </UFormField>
    <p
      v-if="goalId && !roleItems.length"
      class="text-xs text-dimmed"
    >
      {{ t('scim.groups.noRoles') }}
    </p>
    <div class="flex justify-end gap-2">
      <UButton
        :label="t('common.cancel')"
        variant="ghost"
        size="sm"
        @click="emit('cancel')"
      />
      <UButton
        :label="t('scim.groups.link')"
        size="sm"
        :loading="saving"
        :disabled="!goalId || !roleId"
        @click="submit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SsoScimLinkableProject } from 'taskview-api'
import type { ScimGroupLink } from './OrgSsoScimGroupLinkForm.types'

const props = defineProps<{
  projects: SsoScimLinkableProject[]
  saving: boolean
}>()

const emit = defineEmits<{
  submit: [value: ScimGroupLink]
  cancel: []
}>()

const { t } = useI18n()

const goalId = ref<number>()
const roleId = ref<number>()

const projectItems = computed(() => props.projects.map((project) => ({ label: project.name, value: project.goalId })))
const roleItems = computed(() =>
  (props.projects.find((project) => project.goalId === goalId.value)?.roles ?? [])
    .map((role) => ({ label: role.name, value: role.id })),
)

watch(goalId, () => {
  roleId.value = undefined
})

function submit() {
  if (!goalId.value || !roleId.value) return
  emit('submit', { goalId: goalId.value, roleId: roleId.value })
}
</script>

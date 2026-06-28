<template>
  <div class="flex flex-col gap-3">
    <UPopover
      v-model:open="open"
      :content="{ align: 'start' }"
      :ui="{ content: 'w-(--reka-popper-anchor-width) rounded-2xl' }"
    >
      <UButton
        color="neutral"
        variant="soft"
        size="xl"
        block
        icon="i-lucide-building-2"
        trailing-icon="i-lucide-chevron-down"
        :ui="{ base: 'rounded-xl', trailingIcon: 'ms-auto' }"
      >
        <span
          class="flex-1 text-left truncate"
          :class="currentOrg ? '' : 'text-muted'"
        >
          {{ currentOrg?.name ?? t('organizations.title') }}
        </span>
      </UButton>

      <template #content>
        <div class="p-1 flex flex-col gap-0.5 max-h-72 overflow-auto">
          <UButton
            v-for="org in organizations"
            :key="org.id"
            :label="org.name"
            icon="i-lucide-building-2"
            color="neutral"
            :variant="org.id === currentOrg?.id ? 'soft' : 'ghost'"
            block
            class="justify-start"
            @click="selectOrg(org)"
          />
          <USeparator class="my-1" />
          <UButton
            :label="t('organizations.create')"
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            block
            class="justify-start"
            @click="openCreate"
          />
        </div>
      </template>
    </UPopover>

    <div
      v-if="currentOrg"
      class="flex items-center justify-center gap-2 mb-3"
    >
      <UButton
        icon="i-lucide-user-plus"
        color="neutral"
        variant="soft"
        size="sm"
        :ui="{ base: 'rounded-lg' }"
        @click="isDetailOpen = true"
      />
      <UButton
        icon="i-lucide-pencil"
        color="neutral"
        variant="soft"
        size="sm"
        :ui="{ base: 'rounded-lg' }"
        @click="isDetailOpen = true"
      />
      <UButton
        icon="i-lucide-shield"
        color="neutral"
        variant="soft"
        size="sm"
        :ui="{ base: 'rounded-lg' }"
        @click="isDetailOpen = true"
      />
    </div>

    <OrgCreateModal
      v-model="isCreateOpen"
      @created="isCreateOpen = false"
    />
    <OrgDetailModal
      v-model="isDetailOpen"
      :organization="currentOrg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { Organization } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgSwitcher } from '@/composables/useOrgSwitcher'
import OrgCreateModal from '@/components/features/organizations/parts/OrgCreateModal.vue'
import OrgDetailModal from '@/components/features/organizations/parts/OrgDetailModal.vue'

const { t } = useI18n()
const orgStore = useOrganizationStore()
const { organizations, currentOrg } = storeToRefs(orgStore)
const { switchOrg } = useOrgSwitcher()

const open = ref(false)
const isCreateOpen = ref(false)
const isDetailOpen = ref(false)

function selectOrg(org: Organization) {
  open.value = false
  switchOrg(org)
}

function openCreate() {
  open.value = false
  isCreateOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-full lg:max-w-2xl m-0 lg:mx-auto">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">{{ t('organizations.title') }}</h2>
      <UButton
        :label="isMobile ? undefined : t('organizations.create')"
        icon="i-lucide-plus"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="orgStore.loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-6" />
    </div>

    <div v-else-if="orgStore.organizations.length === 0" class="text-center py-8 text-dimmed">
      {{ t('organizations.empty') }}
    </div>

    <div v-else class="flex flex-col gap-3">
      <UCard
        v-for="org in orgStore.organizations"
        :key="org.id"
        class="cursor-pointer hover:ring-primary transition-all"
        @click="selectOrg(org)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-building-2" class="size-5 text-dimmed" />
            <div>
              <p class="font-medium">{{ org.name }}</p>
              <p class="text-sm text-dimmed">{{ org.slug }}</p>
            </div>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
        </div>
      </UCard>
    </div>

    <OrgCreateModal v-model="showCreateModal" @created="onOrgCreated" />
    <OrgDetailModal v-model="showDetailModal" :organization="selectedOrg" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrganizationStore } from '@/stores/organization.store'
import { useTaskView } from '@/composables/useTaskView'
import OrgCreateModal from './parts/OrgCreateModal.vue'
import OrgDetailModal from './parts/OrgDetailModal.vue'

const { t } = useI18n()
const { isMobile } = useTaskView()
const orgStore = useOrganizationStore()

const showCreateModal = ref(false)
const showDetailModal = ref(false)
const selectedOrg = ref<any>(null)

onMounted(() => {
  orgStore.fetchOrganizations()
})

function selectOrg(org: any) {
  selectedOrg.value = org
  showDetailModal.value = true
}

function onOrgCreated() {
  showCreateModal.value = false
}
</script>

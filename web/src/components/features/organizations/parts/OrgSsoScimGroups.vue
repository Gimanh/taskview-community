<template>
  <div class="flex flex-col gap-2">
    <div>
      <p class="text-sm font-medium">
        {{ t('scim.groups.title') }}
      </p>
      <p class="text-xs text-dimmed">
        {{ t('scim.groups.hint') }}
      </p>
    </div>

    <USkeleton
      v-if="loading && !overview"
      class="h-12 w-full"
    />
    <p
      v-else-if="!overview?.groups.length"
      class="text-xs text-dimmed"
    >
      {{ t('scim.groups.empty') }}
    </p>
    <template v-else>
      <OrgSsoScimGroupItem
        v-for="group in overview.groups"
        :key="group.id"
        :config-id="configId"
        :group="group"
        :projects="overview.projects"
        @changed="load"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'
import type { SsoScimGroupsOverview } from 'taskview-api'
import OrgSsoScimGroupItem from './OrgSsoScimGroupItem.vue'

const props = defineProps<{
  configId: number
}>()

const { t } = useI18n()
const toast = useToast()

const overview = ref<SsoScimGroupsOverview | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    overview.value = await $tvApi.sso.fetchScimGroups(props.configId)
  } catch {
    toast.add({ title: t('scim.groups.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

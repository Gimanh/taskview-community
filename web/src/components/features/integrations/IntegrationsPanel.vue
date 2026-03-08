<template>
  <div class="p-4">
    <div
      v-if="!hasGoalSelected"
      class="flex flex-col items-center justify-center h-64 text-muted"
    >
      <UIcon
        name="i-lucide-plug"
        class="size-12 mb-4"
      />
      <p>{{ t('integrations.selectProject') }}</p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ projectName }}
        </h2>
        <UButton
          v-if="canManageIntegrations"
          :label="t('integrations.add')"
          icon="i-lucide-plus"
          color="primary"
          @click="isAddModalOpen = true"
        />
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center h-32"
      >
        <p>{{ t('common.loading') }}</p>
      </div>

      <div
        v-else-if="integrations.length === 0"
        class="flex flex-col items-center justify-center h-64 text-muted"
      >
        <UIcon
          name="i-lucide-plug"
          class="size-12 mb-4"
        />
        <p>{{ t('integrations.empty') }}</p>
      </div>

      <div
        v-else
        class="flex flex-col gap-3"
      >
        <!-- Pending integrations (OAuth done, repo not selected) -->
        <div
          v-for="item in pendingIntegrations"
          :key="'pending-' + item.id"
          class="flex items-center justify-between p-4 border border-dashed border-primary rounded-lg"
        >
          <div class="flex items-center gap-3">
            <UIcon
              :name="item.provider === 'github' ? 'i-mdi-github' : 'i-mdi-gitlab'"
              class="size-6"
            />
            <div>
              <p class="font-medium">
                {{ t('integrations.pendingSelectRepo') }}
              </p>
              <p class="text-sm text-muted">
                {{ item.provider === 'github' ? 'GitHub' : 'GitLab' }}
              </p>
            </div>
          </div>
          <div
            v-if="canManageIntegrations"
            class="flex items-center gap-2"
          >
            <UButton
              :label="t('integrations.selectRepo')"
              color="primary"
              size="sm"
              @click="openRepoSelect(item)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="handleRemove(item.id)"
            />
          </div>
        </div>

        <!-- Connected integrations -->
        <IntegrationItem
          v-for="item in connectedIntegrations"
          :key="item.id"
          :integration="item"
          :can-manage="canManageIntegrations"
          @toggle="handleToggle"
          @remove="handleRemove"
        />
      </div>
    </template>

    <AddIntegrationModal
      v-model:open="isAddModalOpen"
      :project-id="projectId"
    />

    <RepoSelectModal
      v-model:open="isRepoSelectOpen"
      :repos="repos"
      :loading="reposLoading"
      @select="handleRepoSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIntegrationsStore } from '@/stores/integrations.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import IntegrationItem from './parts/IntegrationItem.vue'
import AddIntegrationModal from './parts/AddIntegrationModal.vue'
import RepoSelectModal from './parts/RepoSelectModal.vue'
import type { IntegrationItem as IntegrationItemType, RepoItem } from 'taskview-api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const integrationsStore = useIntegrationsStore()

const { canManageIntegrations } = useGoalPermissions()
const { integrations, repos, reposLoading } = storeToRefs(integrationsStore)
const loading = ref(false)
const isAddModalOpen = ref(false)
const isRepoSelectOpen = ref(false)
const selectedPendingIntegration = ref<IntegrationItemType | null>(null)

const hasGoalSelected = computed(() => projectId.value > 0)

const projectName = computed(() => {
  const goal = goalsStore.goalMap.get(projectId.value)
  return goal?.name ?? ''
})

const connectedIntegrations = computed(() =>
  integrations.value.filter((i) => i.repoFullName),
)

const pendingIntegrations = computed(() =>
  integrations.value.filter((i) => !i.repoFullName),
)

async function fetchData() {
  if (!hasGoalSelected.value) return
  loading.value = true
  try {
    await integrationsStore.fetchIntegrations(projectId.value)
  } finally {
    loading.value = false
  }
}

watch(projectId, () => {
  fetchData()
}, { immediate: true })

onMounted(async () => {
  if (route.query.oauth === 'success') {
    router.replace({ query: {} })
    await fetchData()
    const pending = pendingIntegrations.value[0]
    if (pending) {
      openRepoSelect(pending)
    }
  }
})

async function openRepoSelect(item: IntegrationItemType) {
  selectedPendingIntegration.value = item
  await integrationsStore.fetchRepos(item.id)
  isRepoSelectOpen.value = true
}

async function handleToggle(item: IntegrationItemType) {
  await integrationsStore.toggleIntegration(item.id, !item.isActive)
}

async function handleRemove(id: number) {
  await integrationsStore.removeIntegration(id)
}

async function handleRepoSelect(repo: RepoItem) {
  if (!selectedPendingIntegration.value) return
  await integrationsStore.selectRepo(selectedPendingIntegration.value.id, repo)
  isRepoSelectOpen.value = false
  selectedPendingIntegration.value = null
}
</script>

<template>
  <div class="p-4">
    <UTabs
      v-model="activeTab"
      :items="tabs"
      class="w-full"
      :ui="{ list: 'rounded-2xl', trigger: 'rounded-xl', indicator: 'rounded-xl' }"
    >
      <template #personal>
        <div class="flex items-center justify-between mb-4 mt-2">
          <p class="text-sm text-muted">
            {{ t('messaging.personalHint') }}
          </p>
          <UButton
            :label="t('messaging.connect')"
            icon="i-lucide-plus"
            color="primary"
            @click="openConnect('user')"
          />
        </div>

        <div
          v-if="store.personalLoading"
          class="flex items-center justify-center h-32"
        >
          <p>{{ t('common.loading') }}</p>
        </div>

        <div
          v-else-if="store.personal.length === 0"
          class="flex flex-col items-center justify-center h-64 text-muted"
        >
          <UIcon
            name="i-lucide-send"
            class="size-12 mb-4"
          />
          <p>{{ t('messaging.personalEmpty') }}</p>
        </div>

        <div
          v-else
          class="flex flex-col gap-3"
        >
          <MessagingConnectionItem
            v-for="item in store.personal"
            :key="item.id"
            :connection="item"
            :can-manage="true"
            @toggle="(isActive) => store.togglePersonal(item.id, isActive)"
            @delete="handleDeletePersonal(item.id)"
            @update-events="(events) => store.updatePersonalEvents(item.id, events)"
          />
        </div>
      </template>

      <template #project>
        <div
          v-if="!hasProject"
          class="flex flex-col items-center justify-center h-64 text-muted"
        >
          <UIcon
            name="i-lucide-folder"
            class="size-12 mb-4"
          />
          <p>{{ t('messaging.selectProject') }}</p>
        </div>

        <div
          v-else-if="!canViewIntegrations"
          class="flex flex-col items-center justify-center h-64 text-muted"
        >
          <UIcon
            name="i-lucide-lock"
            class="size-12 mb-4"
          />
          <p>{{ t('messaging.noAccess') }}</p>
        </div>

        <template v-else>
          <div class="flex items-center justify-between mb-4 mt-2">
            <p class="text-sm text-muted">
              {{ t('messaging.projectHint') }}
            </p>
            <UButton
              v-if="canManageIntegrations"
              :label="t('messaging.connect')"
              icon="i-lucide-plus"
              color="primary"
              @click="openConnect('project')"
            />
          </div>

          <div
            v-if="store.projectLoading"
            class="flex items-center justify-center h-32"
          >
            <p>{{ t('common.loading') }}</p>
          </div>

          <div
            v-else-if="store.project.length === 0"
            class="flex flex-col items-center justify-center h-64 text-muted"
          >
            <UIcon
              name="i-lucide-send"
              class="size-12 mb-4"
            />
            <p>{{ t('messaging.projectEmpty') }}</p>
          </div>

          <div
            v-else
            class="flex flex-col gap-3"
          >
            <MessagingConnectionItem
              v-for="item in store.project"
              :key="item.id"
              :connection="item"
              :can-manage="canManageIntegrations"
              @toggle="(isActive) => store.toggleProject(item.id, projectId, isActive)"
              @delete="handleDeleteProject(item.id)"
              @update-events="(events) => store.updateProjectEvents(item.id, projectId, events)"
              @update-post-content="(postContent) => store.updateProjectPostContent(item.id, projectId, postContent)"
            />
          </div>
        </template>
      </template>
    </UTabs>

    <MessagingConnectModal
      v-model:open="isConnectOpen"
      :scope="connectScope"
      :goal-id="projectId"
      @connected="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessagingStore } from '@/stores/messaging.store'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import MessagingConnectionItem from './parts/MessagingConnectionItem.vue'
import MessagingConnectModal from './parts/MessagingConnectModal.vue'

const { t } = useI18n()
const store = useMessagingStore()
const { projectId, hasProject } = useAppRouteInfo()
const { canViewIntegrations, canManageIntegrations } = useGoalPermissions()

const activeTab = ref('project')
const isConnectOpen = ref(false)
const connectScope = ref<'user' | 'project'>('user')

const tabs = computed(() => [
  { label: t('messaging.tabs.project'), slot: 'project', value: 'project' },
  { label: t('messaging.tabs.personal'), slot: 'personal', value: 'personal' },
])

function openConnect(scope: 'user' | 'project') {
  connectScope.value = scope
  isConnectOpen.value = true
}

function refresh() {
  if (connectScope.value === 'project') fetchProject()
  else store.fetchPersonal()
}

function fetchProject() {
  if (hasProject.value && canViewIntegrations.value) store.fetchProject(projectId.value)
}

async function handleDeletePersonal(id: number) {
  await store.deletePersonal(id)
}

async function handleDeleteProject(id: number) {
  await store.deleteProject(id, projectId.value)
}

onMounted(() => store.fetchPersonal())
// Also react to canViewIntegrations: on a cold page load the goal permissions arrive
// after mount, so watching projectId alone would fetch before we're allowed and never retry.
watch([projectId, canViewIntegrations], fetchProject, { immediate: true })
</script>

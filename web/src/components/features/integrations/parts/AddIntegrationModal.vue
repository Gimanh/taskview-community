<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('integrations.addTitle') }}
      </h3>
    </template>
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ t('integrations.connectDescription') }}
        </p>
        <div class="flex gap-3">
          <UButton
            label="GitHub"
            icon="i-mdi-github"
            size="lg"
            variant="outline"
            class="flex-1 justify-center"
            @click="startOAuth('github')"
          />
          <UButton
            label="GitLab"
            icon="i-mdi-gitlab"
            size="lg"
            variant="outline"
            class="flex-1 justify-center"
            @click="startOAuth('gitlab')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTaskViewMainUrl } from '@/composables/useTaskViewMainUrl'
import $api from '@/helpers/axios'
import type { IntegrationProvider } from 'taskview-api'

const props = defineProps<{
  projectId: number
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

function startOAuth(provider: IntegrationProvider) {
  const baseUrl = useTaskViewMainUrl()
  const token = $api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '') || ''
  const url = `${baseUrl}/module/integrations/oauth/${provider}?projectId=${props.projectId}&token=${encodeURIComponent(token)}`
  window.location.href = url
}
</script>

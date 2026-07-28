<template>
  <div class="flex items-center min-w-0">
    <UButton
      :href="sourceUrl"
      target="_blank"
      rel="noopener noreferrer"
      variant="link"
      color="neutral"
      size="sm"
      :icon="provider.icon"
      :title="sourceUrl"
      class="min-w-0 text-muted hover:text-default"
      :ui="{ label: 'truncate' }"
      data-testid="task-source-link"
    >
      {{ issueRef }}
    </UButton>
    <UPopover :ui="{ content: 'rounded-2xl' }">
      <UButton
        icon="i-lucide-info"
        variant="ghost"
        color="neutral"
        size="xs"
        class="text-muted hover:text-default"
        :aria-label="t('tasks.sourceOfTruthTitle', { provider: provider.label })"
        data-testid="task-source-info"
      />
      <template #content>
        <div class="p-3 max-w-72 flex flex-col gap-1 text-sm">
          <p class="font-medium">
            {{ t('tasks.sourceOfTruthTitle', { provider: provider.label }) }}
          </p>
          <p class="text-muted">
            {{ t('tasks.sourceOfTruthDescription', { provider: provider.label }) }}
          </p>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { INTEGRATION_PROVIDERS } from '@/components/features/integrations/integrationProviders'
import type { IntegrationProviderMeta } from '@/components/features/integrations/integrationProviders.types'

const props = defineProps<{
  sourceUrl: string
}>()

const { t } = useI18n()

const provider = computed<IntegrationProviderMeta>(() => {
  const url = props.sourceUrl
  if (url.includes('github')) return INTEGRATION_PROVIDERS.github
  if (url.includes('gitlab')) return INTEGRATION_PROVIDERS.gitlab
  if (url.includes('gitea')) return INTEGRATION_PROVIDERS.gitea
  try {
    return { label: new URL(url).hostname, icon: 'i-lucide-external-link' }
  } catch {
    return { label: url, icon: 'i-lucide-external-link' }
  }
})

// "owner/repo#1" — the way git hosting itself writes issue references.
// GitLab's extra "-" path segment is dropped; anything unparseable falls
// back to the raw URL.
const issueRef = computed(() => {
  try {
    const url = new URL(props.sourceUrl)
    const segments = url.pathname.split('/').filter((s) => s && s !== '-')
    const issuesIndex = segments.indexOf('issues')
    if (issuesIndex > 0 && segments[issuesIndex + 1]) {
      return `${segments.slice(0, issuesIndex).join('/')}#${segments[issuesIndex + 1]}`
    }
  } catch {
    // not a URL — fall through to raw value
  }
  return props.sourceUrl
})
</script>

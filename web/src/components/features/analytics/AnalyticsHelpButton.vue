<template>
  <span class="inline-flex">
    <UTooltip :text="pick(props.help.summary)" :delay-duration="150">
      <UButton
        icon="i-lucide-circle-help"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :aria-label="t('analytics.help.aria')"
        @click="isOpen = true"
      />
    </UTooltip>

    <UModal v-model:open="isOpen" :title="pick(props.sectionTitle)">
      <template #body>
        <div class="flex flex-col gap-4">
          <div>
            <h4 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ pick(props.help.summary) }}
            </h4>
          </div>
          <p class="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {{ pick(props.help.details) }}
          </p>
        </div>
      </template>
    </UModal>
  </span>
</template>
<script setup lang="ts">
import type { AnalyticsSectionHelp, LocalizedText } from 'taskview-api'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalyticsLocale } from './composables/useAnalyticsLocale'

const props = defineProps<{
  help: AnalyticsSectionHelp
  sectionTitle: LocalizedText
}>()

const { t } = useI18n()
const { pick } = useAnalyticsLocale()
const isOpen = ref(false)
</script>



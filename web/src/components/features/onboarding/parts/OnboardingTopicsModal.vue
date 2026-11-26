<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('onboarding.topics.title')"
    :description="t('onboarding.topics.description')"
    :ui="{ content: isMobile ? '' : 'sm:max-w-lg', title: 'pe-8', description: 'pe-8' }"
  >
    <template #body>
      <div
        class="flex flex-col gap-2"
        data-testid="onboarding-topics"
      >
        <button
          v-for="topic in topics"
          :key="topic.id"
          type="button"
          class="flex items-center gap-3 p-3 rounded-2xl border border-default text-left cursor-pointer hover:bg-elevated transition-colors"
          :data-testid="`onboarding-topic-${topic.id}`"
          @click="emit('select', topic.id)"
        >
          <span class="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <UIcon
              :name="topic.icon"
              class="size-5"
            />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-highlighted">{{ t(topic.title) }}</span>
            <span class="block text-xs text-muted">{{ t(topic.description) }}</span>
          </span>
          <UIcon
            name="i-lucide-play"
            class="size-4 text-dimmed shrink-0"
          />
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'
import type { OnboardingTopic } from '../types'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  topics: OnboardingTopic[]
}>()

const emit = defineEmits<{
  select: [topicId: string]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('onboarding.offer.title')"
    :description="t('onboarding.offer.description')"
    :ui="{ content: isMobile ? '' : 'sm:max-w-md', title: 'pe-8', description: 'pe-8' }"
  >
    <template #body>
      <ul
        class="flex flex-col gap-3"
        data-testid="onboarding-offer"
      >
        <li
          v-for="point in points"
          :key="point.key"
          class="flex items-start gap-3"
        >
          <span class="flex items-center justify-center size-8 rounded-xl bg-primary/10 text-primary shrink-0">
            <UIcon
              :name="point.icon"
              class="size-4"
            />
          </span>
          <span class="text-sm pt-1.5">{{ t(`onboarding.offer.points.${point.key}`) }}</span>
        </li>
      </ul>
      <p class="text-xs text-dimmed mt-4">
        {{ t('onboarding.offer.hint') }}
      </p>
    </template>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
        <UButton
          :label="t('onboarding.offer.decline')"
          color="neutral"
          variant="soft"
          class="justify-center"
          data-testid="onboarding-offer-decline"
          @click="emit('decline')"
        />
        <UButton
          :label="t('onboarding.offer.start')"
          icon="i-lucide-sparkles"
          color="primary"
          class="justify-center"
          data-testid="onboarding-offer-start"
          @click="emit('start')"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  start: []
  decline: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const points = [
  { key: 'project', icon: 'i-lucide-folder-plus' },
  { key: 'team', icon: 'i-lucide-users' },
  { key: 'views', icon: 'i-lucide-kanban' },
]
</script>

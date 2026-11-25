<template>
  <UPopover
    :key="popoverKey"
    :open="visible"
    :reference="tour.reference.value"
    :content="contentProps"
    :dismissible="false"
    :arrow="anchored && !tour.stepDone.value"
    :ui="{ content: 'tv-onboarding-popover z-[70] w-[min(22rem,calc(100vw-1.5rem))] transition-opacity' }"
  >
    <template #content>
      <OnboardingExitQuestion
        v-if="step && tour.exitPending.value"
        @back="tour.cancelExit()"
        @later="emit('exitLater')"
        @never="emit('exitNever')"
      />
      <div
        v-else-if="step"
        class="p-4 flex flex-col gap-3"
        data-testid="onboarding-step"
        :data-step="step.id"
      >
        <div class="flex items-start justify-between gap-3">
          <p
            class="font-semibold text-highlighted leading-snug"
            data-testid="onboarding-step-title"
          >
            {{ t(step.title) }}
          </p>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            class="-mt-1 -me-1 shrink-0"
            :aria-label="t('onboarding.controls.exit')"
            data-testid="onboarding-exit"
            @click="tour.requestExit()"
          />
        </div>

        <p class="text-sm text-muted whitespace-pre-line">
          {{ t(step.body) }}
        </p>

        <p
          v-if="tour.stepDone.value"
          class="flex items-center gap-1.5 text-sm font-medium text-primary"
          data-testid="onboarding-step-done"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="size-4"
          />
          {{ t('onboarding.controls.done') }}
        </p>
        <p
          v-else-if="tour.waitsForAction.value"
          class="flex items-center gap-1.5 text-xs text-dimmed"
        >
          <span class="size-1.5 rounded-full bg-primary animate-pulse" />
          {{ t('onboarding.controls.waiting') }}
        </p>

        <UProgress
          :model-value="Math.round(tour.progress.value * 100)"
          size="xs"
          :aria-label="t('onboarding.controls.progress')"
        />

        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="tour.hasPrev.value"
            :label="t('onboarding.controls.back')"
            color="neutral"
            variant="ghost"
            size="md"
            data-testid="onboarding-back"
            @click="tour.prev()"
          />
          <span v-else />
          <UButton
            :label="nextLabel"
            :color="tour.waitsForAction.value && !tour.stepDone.value ? 'neutral' : 'primary'"
            :variant="tour.waitsForAction.value && !tour.stepDone.value ? 'soft' : 'solid'"
            size="md"
            data-testid="onboarding-next"
            @click="tour.next()"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OnboardingTour } from '../composables/useOnboardingTour.types'
import { useOnboardingLayerEpoch } from '../composables/useOnboardingLayerEpoch'
import { useOnboardingObstruction } from '../composables/useOnboardingObstruction'
import { useTaskView } from '@/composables/useTaskView'
import type { OnboardingStepSide } from '../types'
import OnboardingExitQuestion from './OnboardingExitQuestion.vue'

const props = defineProps<{
  tour: OnboardingTour
}>()

const emit = defineEmits<{
  exitLater: []
  exitNever: []
}>()

const SIDE_ROOM = 22 * 16 + 32

const { t } = useI18n()
const { isMobile } = useTaskView()

const step = computed(() => props.tour.current.value)
const visible = computed(() => props.tour.open.value && props.tour.ready.value)
const anchored = computed(() => props.tour.anchored.value)
const layerEpoch = useOnboardingLayerEpoch(() => props.tour.open.value)
const obstructed = useOnboardingObstruction({
  active: () => visible.value,
  target: () => props.tour.targetEl.value,
})

const popoverKey = computed(() => `${step.value?.id}:${layerEpoch.value}:${anchored.value}`)

const side = computed<OnboardingStepSide>(() => {
  const wanted = step.value?.side ?? 'bottom'
  if (!anchored.value) return 'top'
  const side = typeof wanted === 'string' ? wanted : isMobile.value ? wanted.mobile : wanted.desktop
  if (side !== 'left' && side !== 'right') return side
  // Without room beside the control (a phone, a full-screen dialog) the popover would end up outside the screen
  const rect = props.tour.targetEl.value?.getBoundingClientRect()
  if (!rect) return 'top'
  const room = side === 'left' ? rect.left : window.innerWidth - rect.right
  return room < SIDE_ROOM ? 'top' : side
})

const contentProps = computed(() => ({
  side: side.value,
  sideOffset: anchored.value ? 14 : 0,
  collisionPadding: 12,
  'data-onboarding-popover': '',
  'aria-label': step.value ? t(step.value.title) : undefined,
  'data-obstructed': obstructed.value ? '' : undefined,
  // The user is about to type into the highlighted control: the popover must not take the focus from it
  onOpenAutoFocus: (event: Event) => event.preventDefault(),
  onCloseAutoFocus: (event: Event) => event.preventDefault(),
}) as const)

const nextLabel = computed(() => {
  if (props.tour.isLast.value) return t('onboarding.controls.finish')
  if (props.tour.closesOnSkip.value) return t('onboarding.controls.exit')
  if (props.tour.waitsForAction.value && !props.tour.stepDone.value) return t('onboarding.controls.skip')
  return t('onboarding.controls.next')
})
</script>

<style>
.tv-onboarding-popover[data-obstructed] {
  opacity: 0;
}

/* The positioning wrapper keeps the popover's box, so it has to let the clicks through as well */
[data-reka-popper-content-wrapper]:has(> .tv-onboarding-popover[data-obstructed]) {
  pointer-events: none !important;
}

[data-reka-popper-content-wrapper]:has(> .tv-onboarding-popover[data-obstructed]) > .tv-onboarding-popover {
  pointer-events: none !important;
}
</style>

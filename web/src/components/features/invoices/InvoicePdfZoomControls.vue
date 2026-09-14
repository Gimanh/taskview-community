<template>
  <div class="flex items-center justify-end gap-1">
    <UButton
      icon="i-lucide-zoom-out"
      :aria-label="t('invoices.preview.zoomOut')"
      color="neutral"
      variant="ghost"
      size="sm"
      :disabled="model <= ZOOM_STEPS[0]"
      data-testid="invoice-pdf-zoom-out"
      @click="step(-1)"
    />
    <UButton
      :label="`${Math.round(model * 100)}%`"
      :aria-label="t('invoices.preview.fitWidth')"
      color="neutral"
      variant="ghost"
      size="sm"
      class="min-w-14 justify-center tabular-nums"
      data-testid="invoice-pdf-fit-width"
      @click="model = 1"
    />
    <UButton
      icon="i-lucide-zoom-in"
      :aria-label="t('invoices.preview.zoomIn')"
      color="neutral"
      variant="ghost"
      size="sm"
      :disabled="model >= ZOOM_STEPS[ZOOM_STEPS.length - 1]"
      data-testid="invoice-pdf-zoom-in"
      @click="step(1)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

const model = defineModel<number>({ required: true })

const { t } = useI18n()

function step(direction: 1 | -1) {
  const index = ZOOM_STEPS.findIndex(value => value >= model.value)
  const current = index === -1 ? ZOOM_STEPS.length - 1 : index
  const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))]
  if (next !== undefined) model.value = next
}
</script>

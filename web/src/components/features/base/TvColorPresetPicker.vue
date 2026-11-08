<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <button
        v-if="clearable"
        type="button"
        class="size-7 rounded-full flex items-center justify-center border border-dashed border-accented ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 transition-shadow"
        :class="model ? 'ring-transparent' : 'ring-primary'"
        :title="t('common.noColor')"
        :aria-label="t('common.noColor')"
        data-testid="color-preset-none"
        @click="model = null"
      >
        <UIcon
          name="i-lucide-ban"
          class="size-4 text-muted"
        />
      </button>
      <button
        v-for="preset in COLOR_PRESETS"
        :key="preset"
        type="button"
        class="size-7 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 transition-shadow"
        :class="isSelected(preset) ? 'ring-primary' : 'ring-transparent'"
        :style="{ backgroundColor: preset }"
        :aria-label="preset"
        :data-testid="`color-preset-${preset}`"
        @click="model = preset"
      >
        <UIcon
          v-if="isSelected(preset)"
          name="i-lucide-check"
          class="size-4"
          :style="{ color: contrastColor(preset) }"
        />
      </button>
    </div>

    <UColorPicker
      v-model="pickerValue"
      :ui="{ root: 'w-full', picker: 'w-full', selector: 'w-full' }"
      :data-testid="pickerTestId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { COLOR_PRESETS, contrastColor } from '@/helpers/color'

const props = withDefaults(defineProps<{
  clearable?: boolean
  fallback?: string
  pickerTestId?: string
}>(), {
  clearable: false,
  fallback: '#1E88E5',
  pickerTestId: undefined,
})

const model = defineModel<string | null>({ required: true })

const { t } = useI18n()

const pickerValue = computed({
  get: () => model.value ?? props.fallback,
  set: (value: string | undefined) => {
    if (value) model.value = value
  },
})

function isSelected(preset: string): boolean {
  return model.value?.toLowerCase() === preset.toLowerCase()
}
</script>

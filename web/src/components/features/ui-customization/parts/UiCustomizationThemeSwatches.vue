<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="flex flex-wrap gap-2"
  >
    <UTooltip
      v-for="color in colors"
      :key="color"
      :text="t(`uiCustomization.theme.colorNames.${color}`)"
    >
      <button
        type="button"
        role="radio"
        :aria-checked="model === color"
        :aria-label="t(`uiCustomization.theme.colorNames.${color}`)"
        :data-testid="`theme-swatch-${color}`"
        class="relative flex items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-(--ui-bg) transition focus-visible:ring-2 focus-visible:ring-(--ui-border-inverted)"
        :class="[
          kind === 'primary' ? 'size-8' : 'h-8 w-14',
          model === color ? 'ring-2 ring-(--ui-border-inverted)' : 'hover:scale-105',
        ]"
        :style="swatchStyle(color)"
        @click="model = color"
      >
        <UIcon
          v-if="model === color"
          name="i-lucide-check"
          class="size-4 text-white drop-shadow"
        />
      </button>
    </UTooltip>
  </div>
</template>

<script setup lang="ts" generic="T extends ThemePrimaryColor | ThemeNeutralColor">
import { useI18n } from 'vue-i18n'
import type { ThemeNeutralColor, ThemePrimaryColor } from 'taskview-api'
import { paletteVar } from './theme-palette'

const props = defineProps<{
  colors: readonly T[]
  kind: 'primary' | 'neutral'
  label: string
}>()

const model = defineModel<T | null>({ required: true })

const { t } = useI18n()

function swatchStyle(color: T) {
  if (props.kind === 'primary') return { background: paletteVar(color, 500) }
  return {
    background: `linear-gradient(90deg, ${paletteVar(color, 200)} 0 33%, ${paletteVar(color, 500)} 33% 66%, ${paletteVar(color, 800)} 66%)`,
  }
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-base font-medium text-highlighted">
          {{ t('uiCustomization.theme.custom.title') }}
        </h3>
        <p class="text-sm text-muted">
          {{ t('uiCustomization.theme.custom.hint') }}
        </p>
      </div>
      <USwitch
        :model-value="customActive"
        :aria-label="t('uiCustomization.theme.custom.title')"
        data-testid="theme-custom-switch"
        @update:model-value="setCustomActive"
      />
    </div>

    <div
      v-if="customActive && customTheme"
      class="flex flex-col gap-2 rounded-2xl border border-default p-3 lg:p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UTabs
          v-model="mode"
          :items="modeItems"
          :content="false"
          size="sm"
          :ui="{ list: 'rounded-xl', trigger: 'rounded-lg', indicator: 'rounded-lg' }"
        />
        <UButton
          icon="i-lucide-wand-sparkles"
          color="neutral"
          variant="ghost"
          size="sm"
          data-testid="theme-custom-refill"
          @click="refillCustomTheme"
        >
          {{ t('uiCustomization.theme.custom.refill') }}
        </UButton>
      </div>

      <p
        v-if="mode !== activeMode"
        class="text-xs text-muted"
      >
        {{ t(mode === 'dark' ? 'uiCustomization.theme.custom.otherModeDark' : 'uiCustomization.theme.custom.otherModeLight') }}
      </p>

      <div class="divide-y divide-default">
        <UiCustomizationThemeColorField
          v-for="key in CUSTOM_THEME_COLOR_KEYS"
          :key="key"
          :field="key"
          :label="t(`uiCustomization.theme.custom.fields.${key}`)"
          :hint="t(`uiCustomization.theme.custom.fields.${key}Hint`)"
          :model-value="customTheme[mode][key]"
          @update:model-value="(value) => update(key, value)"
        />
      </div>

      <UAlert
        v-if="contrast < MIN_TEXT_CONTRAST"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('uiCustomization.theme.custom.lowContrast', { ratio: contrast.toFixed(1) })"
        data-testid="theme-custom-low-contrast"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import { CUSTOM_THEME_COLOR_KEYS, type CustomThemeColorKey } from 'taskview-api'
import { useThemeColors } from '@/composables/useThemeColors'
import { contrastRatio } from '@/helpers/custom-theme'
import UiCustomizationThemeColorField from './UiCustomizationThemeColorField.vue'

const MIN_TEXT_CONTRAST = 4.5

const { t } = useI18n()
const { customActive, customTheme, setCustomActive, setCustomTheme, refillCustomTheme } = useThemeColors()
const { state: colorModeState } = useColorMode()

const activeMode = computed<'light' | 'dark'>(() => (colorModeState.value === 'dark' ? 'dark' : 'light'))
const mode = ref<'light' | 'dark'>(activeMode.value)

const modeItems = computed(() => [
  { value: 'light', label: t('uiCustomization.theme.custom.light'), icon: 'i-lucide-sun' },
  { value: 'dark', label: t('uiCustomization.theme.custom.dark'), icon: 'i-lucide-moon' },
])

const contrast = computed(() => {
  const palette = customTheme.value?.[mode.value]
  if (!palette) return Infinity
  return Math.min(contrastRatio(palette.text, palette.background), contrastRatio(palette.text, palette.surface))
})

function update(key: CustomThemeColorKey, value: string) {
  const theme = customTheme.value
  if (!theme) return
  setCustomTheme({ ...theme, [mode.value]: { ...theme[mode.value], [key]: value } })
}
</script>

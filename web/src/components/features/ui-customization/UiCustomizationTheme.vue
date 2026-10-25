<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-3">
      <div>
        <h3 class="text-base font-medium text-highlighted">
          {{ t('uiCustomization.theme.presetsTitle') }}
        </h3>
        <p class="text-sm text-muted">
          {{ t('uiCustomization.theme.presetsHint') }}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <UiCustomizationThemePreset
          v-for="preset in THEME_PRESETS"
          :key="preset.id"
          :preset="preset"
          :active="!customActive && preset.primary === colors.primary && preset.neutral === colors.neutral"
          @select="setColors(preset)"
        />
      </div>
    </section>

    <UFormField
      :label="t('uiCustomization.theme.primaryTitle')"
      :description="t('uiCustomization.theme.primaryHint')"
      :ui="{ container: 'mt-3' }"
    >
      <UiCustomizationThemeSwatches
        v-model="primary"
        :colors="THEME_PRIMARY_COLORS"
        kind="primary"
        :label="t('uiCustomization.theme.primaryTitle')"
      />
    </UFormField>

    <UFormField
      :label="t('uiCustomization.theme.neutralTitle')"
      :description="t('uiCustomization.theme.neutralHint')"
      :ui="{ container: 'mt-3' }"
    >
      <UiCustomizationThemeSwatches
        v-model="neutral"
        :colors="THEME_NEUTRAL_COLORS"
        kind="neutral"
        :label="t('uiCustomization.theme.neutralTitle')"
      />
    </UFormField>

    <UiCustomizationThemeCustom />

    <div>
      <UButton
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="soft"
        :disabled="isDefault"
        data-testid="theme-reset"
        @click="reset"
      >
        {{ t('uiCustomization.theme.reset') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { THEME_NEUTRAL_COLORS, THEME_PRIMARY_COLORS, type ThemeNeutralColor, type ThemePrimaryColor } from 'taskview-api'
import { useThemeColors } from '@/composables/useThemeColors'
import UiCustomizationThemePreset from './parts/UiCustomizationThemePreset.vue'
import UiCustomizationThemeSwatches from './parts/UiCustomizationThemeSwatches.vue'
import UiCustomizationThemeCustom from './parts/UiCustomizationThemeCustom.vue'
import { THEME_PRESETS } from './parts/theme-presets'

const { t } = useI18n()
const { colors, customActive, isDefault, setColors, reset } = useThemeColors()

const primary = computed<ThemePrimaryColor | null>({
  get: () => (customActive.value ? null : colors.value.primary),
  set: (value) => {
    if (value) setColors({ ...colors.value, primary: value })
  },
})

const neutral = computed<ThemeNeutralColor | null>({
  get: () => (customActive.value ? null : colors.value.neutral),
  set: (value) => {
    if (value) setColors({ ...colors.value, neutral: value })
  },
})
</script>

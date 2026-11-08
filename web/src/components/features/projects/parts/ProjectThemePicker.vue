<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <UiCustomizationThemeCard
      :label="t('projects.themeApp')"
      :vars="appVars"
      test-id="project-theme-app"
      :active="selected === null"
      @select="model = null"
    />
    <UiCustomizationThemeCard
      v-for="preset in THEME_PRESETS"
      :key="preset.id"
      :label="t(preset.labelKey)"
      :vars="palettePreviewVars(preset)"
      :test-id="`project-theme-preset-${preset.id}`"
      :active="selected !== null && 'preset' in selected && selected.preset === preset.id"
      @select="model = { preset: preset.id }"
    />
    <UiCustomizationThemeCard
      v-for="theme in savedThemes"
      :key="theme.id"
      :label="savedThemeName(theme)"
      :vars="customPreviewVars(theme)"
      :test-id="`project-theme-saved-${theme.id}`"
      :active="selected !== null && 'savedThemeId' in selected && selected.savedThemeId === theme.id"
      @select="model = { savedThemeId: theme.id }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectTheme } from 'taskview-api'
import { useThemeColors } from '@/composables/useThemeColors'
import { useSavedThemeName } from '@/composables/useSavedThemeName'
import UiCustomizationThemeCard from '@/components/features/ui-customization/parts/UiCustomizationThemeCard.vue'
import { THEME_PRESETS } from '@/components/features/ui-customization/parts/theme-presets'
import { customPreviewVars, palettePreviewVars } from '@/components/features/ui-customization/parts/theme-preview'

const model = defineModel<ProjectTheme | null>({ required: true })

const { t } = useI18n()
const { colors, savedThemes, activeSavedTheme, resolveTheme } = useThemeColors()
const { savedThemeName } = useSavedThemeName()

const selected = computed(() => (model.value && resolveTheme(model.value) ? model.value : null))

const appVars = computed(() => (activeSavedTheme.value ? customPreviewVars(activeSavedTheme.value) : palettePreviewVars(colors.value)))
</script>

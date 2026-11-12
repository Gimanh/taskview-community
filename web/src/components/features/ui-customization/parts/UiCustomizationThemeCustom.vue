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
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        size="sm"
        class="shrink-0"
        :disabled="!canSaveMore"
        :title="canSaveMore ? undefined : t('uiCustomization.theme.custom.limit', { max: MAX_SAVED_THEMES })"
        data-testid="theme-custom-create"
        @click="create"
      >
        {{ t('uiCustomization.theme.custom.create') }}
      </UButton>
    </div>

    <div
      v-if="savedThemes.length > 0"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      <UiCustomizationThemeCard
        v-for="theme in savedThemes"
        :key="theme.id"
        :label="savedThemeName(theme)"
        :vars="customPreviewVars(theme)"
        :test-id="`theme-saved-${theme.id}`"
        :active="activeSavedTheme?.id === theme.id"
        @select="activateSavedTheme(theme.id)"
      />
    </div>

    <UiCustomizationThemeCustomEditor
      v-if="activeSavedTheme"
      :key="activeSavedTheme.id"
      :theme="activeSavedTheme"
    />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { MAX_SAVED_THEMES } from 'taskview-api'
import { useThemeColors } from '@/composables/useThemeColors'
import { useSavedThemeName } from '@/composables/useSavedThemeName'
import UiCustomizationThemeCard from './UiCustomizationThemeCard.vue'
import UiCustomizationThemeCustomEditor from './UiCustomizationThemeCustomEditor.vue'
import { customPreviewVars } from './theme-preview'

const { t } = useI18n()
const { savedThemes, activeSavedTheme, canSaveMore, activateSavedTheme, createSavedTheme } = useThemeColors()
const { savedThemeName } = useSavedThemeName()

function create() {
  createSavedTheme(t('uiCustomization.theme.custom.defaultName', { n: savedThemes.value.length + 1 }))
}
</script>

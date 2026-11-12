<template>
  <div class="flex flex-col gap-2 rounded-2xl border border-default p-3 lg:p-4">
    <div class="flex items-center gap-2">
      <UInput
        v-model="name"
        :maxlength="SAVED_THEME_NAME_MAX_LENGTH"
        :placeholder="t('uiCustomization.theme.custom.untitled')"
        :aria-label="t('uiCustomization.theme.custom.name')"
        class="flex-1"
        :ui="{ base: 'rounded-lg' }"
        data-testid="theme-custom-name"
      />
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        :aria-label="t('uiCustomization.theme.custom.delete')"
        data-testid="theme-custom-delete"
        @click="isDeleteOpen = true"
      />
    </div>

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
        @click="refillSavedTheme(theme.id)"
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
        :model-value="theme[mode][key]"
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

    <UiCustomizationThemeDeleteDialog
      v-model:open="isDeleteOpen"
      :name="savedThemeName(theme)"
      @confirm="deleteSavedTheme(theme.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import { CUSTOM_THEME_COLOR_KEYS, SAVED_THEME_NAME_MAX_LENGTH, type CustomThemeColorKey, type SavedTheme } from 'taskview-api'
import { useThemeColors } from '@/composables/useThemeColors'
import { useSavedThemeName } from '@/composables/useSavedThemeName'
import { contrastRatio } from '@/helpers/custom-theme'
import UiCustomizationThemeColorField from './UiCustomizationThemeColorField.vue'
import UiCustomizationThemeDeleteDialog from './UiCustomizationThemeDeleteDialog.vue'

const MIN_TEXT_CONTRAST = 4.5

const props = defineProps<{
  theme: SavedTheme
}>()

const { t } = useI18n()
const { updateSavedTheme, refillSavedTheme, deleteSavedTheme } = useThemeColors()
const { savedThemeName } = useSavedThemeName()
const { state: colorModeState } = useColorMode()

const isDeleteOpen = ref(false)

const activeMode = computed<'light' | 'dark'>(() => (colorModeState.value === 'dark' ? 'dark' : 'light'))
const mode = ref<'light' | 'dark'>(activeMode.value)

const modeItems = computed(() => [
  { value: 'light', label: t('uiCustomization.theme.custom.light'), icon: 'i-lucide-sun' },
  { value: 'dark', label: t('uiCustomization.theme.custom.dark'), icon: 'i-lucide-moon' },
])

const name = computed({
  get: () => props.theme.name ?? '',
  set: (value: string) => {
    const next: SavedTheme = { ...props.theme, name: value.slice(0, SAVED_THEME_NAME_MAX_LENGTH) }
    if (!value.trim()) delete next.name
    updateSavedTheme(next)
  },
})

const contrast = computed(() => {
  const palette = props.theme[mode.value]
  return Math.min(contrastRatio(palette.text, palette.background), contrastRatio(palette.text, palette.surface))
})

function update(key: CustomThemeColorKey, value: string) {
  updateSavedTheme({ ...props.theme, [mode.value]: { ...props.theme[mode.value], [key]: value } })
}
</script>

import { computed, watch } from 'vue'
import {
  DEFAULT_THEME_NEUTRAL_COLOR,
  DEFAULT_THEME_PRIMARY_COLOR,
  THEME_NEUTRAL_COLORS,
  THEME_PRIMARY_COLORS,
  type CustomTheme,
  CUSTOM_THEME_COLOR_KEYS,
  type CustomThemePalette,
} from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { buildCustomThemeCss, cssColorToHex } from '@/helpers/custom-theme'
import { paletteVarName } from '@/components/features/ui-customization/parts/theme-palette'
import type { PaletteShade } from '@/components/features/ui-customization/parts/theme-palette.types'
import type { ThemeColors, ThemeSnapshot } from '@/composables/useThemeColors.types'

const CACHE_KEY = 'tv_theme_colors'
const CUSTOM_STYLE_ID = 'tv-custom-theme'

const DEFAULT_COLORS: ThemeColors = {
  primary: DEFAULT_THEME_PRIMARY_COLOR,
  neutral: DEFAULT_THEME_NEUTRAL_COLOR,
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function isCustomTheme(value: unknown): value is CustomTheme {
  const theme = value as CustomTheme | null
  return !!theme && [theme.light, theme.dark].every(
    (palette) => !!palette && CUSTOM_THEME_COLOR_KEYS.every((key) => HEX_COLOR.test(palette[key] ?? '')),
  )
}

function readCache(): ThemeSnapshot | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (THEME_PRIMARY_COLORS.includes(parsed?.primary) && THEME_NEUTRAL_COLORS.includes(parsed?.neutral)) {
      return { primary: parsed.primary, neutral: parsed.neutral, customTheme: isCustomTheme(parsed.customTheme) ? parsed.customTheme : null }
    }
  } catch {
    return null
  }
  return null
}

function writeCache(snapshot: ThemeSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    return
  }
}

function resolveShade(colors: ThemeColors, shade: PaletteShade, kind: keyof ThemeColors): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(paletteVarName(colors[kind], shade))
  return cssColorToHex(value.trim())
}

/** The palette theme expressed as custom colors, a starting point for editing a custom theme. */
function customThemeFrom(colors: ThemeColors): CustomTheme {
  const light: CustomThemePalette = {
    background: '#ffffff',
    surface: resolveShade(colors, 50, 'neutral'),
    border: resolveShade(colors, 200, 'neutral'),
    text: resolveShade(colors, 700, 'neutral'),
    accent: resolveShade(colors, 500, 'primary'),
  }
  const dark: CustomThemePalette = {
    background: resolveShade(colors, 900, 'neutral'),
    surface: resolveShade(colors, 800, 'neutral'),
    border: resolveShade(colors, 700, 'neutral'),
    text: resolveShade(colors, 200, 'neutral'),
    accent: resolveShade(colors, 400, 'primary'),
  }
  return { light, dark }
}

export function useThemeColors() {
  const store = useUiPreferencesStore()

  const colors = computed<ThemeColors>(() => ({
    primary: store.settings.primaryColor ?? DEFAULT_COLORS.primary,
    neutral: store.settings.neutralColor ?? DEFAULT_COLORS.neutral,
  }))

  const customActive = computed(() => store.settings.customThemeActive === 1 && !!store.settings.customTheme)

  const customTheme = computed(() => store.settings.customTheme ?? null)

  const isDefault = computed(
    () => !customActive.value
      && colors.value.primary === DEFAULT_COLORS.primary
      && colors.value.neutral === DEFAULT_COLORS.neutral,
  )

  function setColors(next: ThemeColors) {
    store.setSetting('primaryColor', next.primary === DEFAULT_COLORS.primary ? undefined : next.primary)
    store.setSetting('neutralColor', next.neutral === DEFAULT_COLORS.neutral ? undefined : next.neutral)
    store.setSetting('customThemeActive', undefined)
  }

  function setCustomActive(active: boolean) {
    if (active && !store.settings.customTheme) {
      store.setSetting('customTheme', customThemeFrom(colors.value))
    }
    store.setSetting('customThemeActive', active ? 1 : undefined)
  }

  function setCustomTheme(theme: CustomTheme) {
    store.setSetting('customTheme', theme)
  }

  function refillCustomTheme() {
    store.setSetting('customTheme', customThemeFrom(colors.value))
  }

  function reset() {
    setColors(DEFAULT_COLORS)
  }

  return { colors, customActive, customTheme, isDefault, setColors, setCustomActive, setCustomTheme, refillCustomTheme, reset }
}

/**
 * Applies the user's theme app-wide. The last choice is cached locally so the app
 * starts in the right colors before preferences arrive from the server.
 */
export function useThemeColorsSync() {
  const appConfig = useAppConfig()
  const store = useUiPreferencesStore()
  const { colors, customActive, customTheme } = useThemeColors()

  function applyCustom(theme: CustomTheme | null) {
    let style = document.getElementById(CUSTOM_STYLE_ID)
    if (!theme) {
      style?.remove()
      return
    }
    if (!style) {
      style = document.createElement('style')
      style.id = CUSTOM_STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = buildCustomThemeCss(theme)
  }

  function apply(snapshot: ThemeSnapshot) {
    appConfig.ui.colors.primary = snapshot.primary
    appConfig.ui.colors.neutral = snapshot.neutral
    applyCustom(snapshot.customTheme)
  }

  const cached = readCache()
  if (cached) apply(cached)

  watch(
    () => [store.loaded, colors.value, customActive.value, customTheme.value] as const,
    ([loaded, next, active, theme]) => {
      if (!loaded) return
      const snapshot: ThemeSnapshot = { ...next, customTheme: active ? theme : null }
      apply(snapshot)
      writeCache(snapshot)
    },
    { immediate: true, deep: true },
  )
}

import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  DEFAULT_THEME_NEUTRAL_COLOR,
  DEFAULT_THEME_PRIMARY_COLOR,
  MAX_SAVED_THEMES,
  THEME_NEUTRAL_COLORS,
  THEME_PRIMARY_COLORS,
  type CustomTheme,
  CUSTOM_THEME_COLOR_KEYS,
  type CustomThemePalette,
  type ProjectTheme,
  type SavedTheme,
} from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { buildCustomThemeCss, cssColorToHex } from '@/helpers/custom-theme'
import { paletteVarName } from '@/components/features/ui-customization/parts/theme-palette'
import { THEME_PRESETS } from '@/components/features/ui-customization/parts/theme-presets'
import type { PaletteShade } from '@/components/features/ui-customization/parts/theme-palette.types'
import type { ThemeCache, ThemeColors, ThemeSnapshot } from '@/composables/useThemeColors.types'

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

function parseSnapshot(value: unknown): ThemeSnapshot | null {
  const parsed = value as Partial<ThemeSnapshot> | null
  if (!THEME_PRIMARY_COLORS.includes(parsed?.primary as never) || !THEME_NEUTRAL_COLORS.includes(parsed?.neutral as never)) {
    return null
  }
  return {
    primary: parsed!.primary!,
    neutral: parsed!.neutral!,
    customTheme: isCustomTheme(parsed!.customTheme) ? parsed!.customTheme : null,
  }
}

function readCache(): ThemeCache | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    const global = parseSnapshot(parsed?.global ?? parsed)
    if (!global) return null
    const projects: Record<string, ThemeSnapshot> = {}
    for (const [id, value] of Object.entries(parsed?.projects ?? {})) {
      const snapshot = parseSnapshot(value)
      if (snapshot) projects[id] = snapshot
    }
    return { global, projects }
  } catch {
    return null
  }
}

function writeCache(cache: ThemeCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
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

function newThemeId(): string {
  return crypto.randomUUID()
}

export function useThemeColors() {
  const store = useUiPreferencesStore()

  const colors = computed<ThemeColors>(() => ({
    primary: store.settings.primaryColor ?? DEFAULT_COLORS.primary,
    neutral: store.settings.neutralColor ?? DEFAULT_COLORS.neutral,
  }))

  const savedThemes = computed<SavedTheme[]>(() => store.settings.savedThemes ?? [])

  const activeSavedTheme = computed<SavedTheme | null>(
    () => savedThemes.value.find((theme) => theme.id === store.settings.activeSavedThemeId) ?? null,
  )

  const customActive = computed(() => !!activeSavedTheme.value)

  const canSaveMore = computed(() => savedThemes.value.length < MAX_SAVED_THEMES)

  const isDefault = computed(
    () => !customActive.value
      && colors.value.primary === DEFAULT_COLORS.primary
      && colors.value.neutral === DEFAULT_COLORS.neutral,
  )

  const globalSnapshot = computed<ThemeSnapshot>(() => ({ ...colors.value, customTheme: activeSavedTheme.value }))

  function setColors(next: ThemeColors) {
    store.patchSettings({
      primaryColor: next.primary === DEFAULT_COLORS.primary ? undefined : next.primary,
      neutralColor: next.neutral === DEFAULT_COLORS.neutral ? undefined : next.neutral,
      activeSavedThemeId: undefined,
    })
  }

  function activateSavedTheme(id: string) {
    store.patchSettings({ activeSavedThemeId: id })
  }

  /** Saves a copy of the theme on screen as a new custom theme and turns it on. */
  function createSavedTheme(name: string): string | null {
    if (!canSaveMore.value) return null
    const base = activeSavedTheme.value ?? customThemeFrom(colors.value)
    const theme: SavedTheme = { id: newThemeId(), name, light: { ...base.light }, dark: { ...base.dark } }
    store.patchSettings({ savedThemes: [...savedThemes.value, theme], activeSavedThemeId: theme.id })
    return theme.id
  }

  function updateSavedTheme(theme: SavedTheme) {
    store.patchSettings({ savedThemes: savedThemes.value.map((item) => (item.id === theme.id ? theme : item)) })
  }

  function refillSavedTheme(id: string) {
    const theme = savedThemes.value.find((item) => item.id === id)
    if (theme) updateSavedTheme({ ...theme, ...customThemeFrom(colors.value) })
  }

  /** Projects that used the theme fall back to the app theme. */
  function deleteSavedTheme(id: string) {
    const projectThemes = Object.fromEntries(
      Object.entries(store.settings.projectThemes ?? {}).filter(([, theme]) => !('savedThemeId' in theme) || theme.savedThemeId !== id),
    )
    store.patchSettings({
      savedThemes: savedThemes.value.filter((theme) => theme.id !== id),
      activeSavedThemeId: store.settings.activeSavedThemeId === id ? undefined : store.settings.activeSavedThemeId,
      projectThemes: Object.keys(projectThemes).length > 0 ? projectThemes : undefined,
    })
  }

  /** A theme that no longer exists resolves to null, so the caller falls back to the app theme. */
  function resolveTheme(theme: ProjectTheme): ThemeSnapshot | null {
    if ('preset' in theme) {
      const preset = THEME_PRESETS.find((item) => item.id === theme.preset)
      return preset ? { primary: preset.primary, neutral: preset.neutral, customTheme: null } : null
    }
    const saved = savedThemes.value.find((item) => item.id === theme.savedThemeId)
    return saved ? { ...colors.value, customTheme: saved } : null
  }

  function reset() {
    setColors(DEFAULT_COLORS)
  }

  return {
    colors,
    savedThemes,
    activeSavedTheme,
    customActive,
    canSaveMore,
    isDefault,
    globalSnapshot,
    setColors,
    activateSavedTheme,
    createSavedTheme,
    updateSavedTheme,
    refillSavedTheme,
    deleteSavedTheme,
    resolveTheme,
    reset,
  }
}

/**
 * Applies the user's theme app-wide, or the theme picked for the project on screen.
 * The resolved themes are cached locally so the app starts in the right colors
 * before preferences arrive from the server.
 */
export function useThemeColorsSync() {
  const appConfig = useAppConfig()
  const store = useUiPreferencesStore()
  const route = useRoute()
  const { globalSnapshot, resolveTheme } = useThemeColors()

  const projectKey = computed(() => {
    const id = Number(route.params.projectId)
    return Number.isInteger(id) && id > 0 ? String(id) : null
  })

  const projectSnapshots = computed<Record<string, ThemeSnapshot>>(() => {
    const result: Record<string, ThemeSnapshot> = {}
    for (const [id, theme] of Object.entries(store.settings.projectThemes ?? {})) {
      const snapshot = resolveTheme(theme)
      if (snapshot) result[id] = snapshot
    }
    return result
  })

  const cached = readCache()

  const effective = computed<ThemeSnapshot | null>(() => {
    const key = projectKey.value
    if (!store.loaded) return cached ? (key && cached.projects[key]) || cached.global : null
    return (key && projectSnapshots.value[key]) || globalSnapshot.value
  })

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

  watch(
    effective,
    (snapshot) => {
      if (!snapshot) return
      appConfig.ui.colors.primary = snapshot.primary
      appConfig.ui.colors.neutral = snapshot.neutral
      applyCustom(snapshot.customTheme)
    },
    { immediate: true, deep: true },
  )

  watch(
    () => [store.loaded, globalSnapshot.value, projectSnapshots.value] as const,
    ([loaded, global, projects]) => {
      if (loaded) writeCache({ global, projects })
    },
    { immediate: true, deep: true },
  )
}

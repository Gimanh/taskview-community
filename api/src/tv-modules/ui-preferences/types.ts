import { type } from 'arktype'
import { MAX_PROJECT_THEMES, MAX_SAVED_THEMES, SAVED_THEME_NAME_MAX_LENGTH, THEME_NEUTRAL_COLORS, THEME_PRIMARY_COLORS } from 'taskview-api'

const MAX_SECTIONS = 20
const MAX_ITEMS_PER_SECTION = 200
const ID_MAX_LENGTH = 100
const ID_PATTERN = /^[a-zA-Z0-9_.\-:]+$/

const idArkType = type('string').narrow((v, ctx) => {
  if (v.length === 0 || v.length > ID_MAX_LENGTH) {
    return ctx.mustBe(`a string of 1..${ID_MAX_LENGTH} chars`)
  }
  if (!ID_PATTERN.test(v)) {
    return ctx.mustBe('a string matching [a-zA-Z0-9_.\\-:]+')
  }
  return true
})

export const UiPreferencesItemArkType = type({
  id: idArkType,
  order: 'number.integer >= 0',
  hidden: 'boolean',
  'width?': "'narrow' | 'wide'",
})

const UiPreferencesSectionArkType = UiPreferencesItemArkType.array().narrow((arr, ctx) => {
  if (arr.length > MAX_ITEMS_PER_SECTION) {
    return ctx.mustBe(`at most ${MAX_ITEMS_PER_SECTION} items per section`)
  }
  const seen = new Set<string>()
  for (const item of arr) {
    if (seen.has(item.id)) {
      return ctx.mustBe(`unique item ids (duplicate: ${item.id})`)
    }
    seen.add(item.id)
  }
  return true
})

export const UI_SETTINGS_KEY = '__settings__'

const firstDayOfWeekArkType = type('number.integer').narrow((v, ctx) =>
  v >= 0 && v <= 6 ? true : ctx.mustBe('an integer 0..6 (0=Sunday)'),
)

export const MAX_RECENT_PROJECTS = 50

const recentProjectIdsArkType = type('(number.integer >= 1)[]').narrow((ids, ctx) => {
  if (ids.length > MAX_RECENT_PROJECTS) {
    return ctx.mustBe(`at most ${MAX_RECENT_PROJECTS} project ids`)
  }
  if (new Set(ids).size !== ids.length) {
    return ctx.mustBe('unique project ids')
  }
  return true
})

const hexColorArkType = type(/^#[0-9a-fA-F]{6}$/)

const CustomThemePaletteArkType = type({
  '+': 'reject',
  background: hexColorArkType,
  surface: hexColorArkType,
  border: hexColorArkType,
  text: hexColorArkType,
  accent: hexColorArkType,
})

const themeIdArkType = type(/^[a-zA-Z0-9_-]{1,40}$/)

const savedThemeNameArkType = type('string').narrow((name, ctx) =>
  name.trim().length > 0 && name.length <= SAVED_THEME_NAME_MAX_LENGTH
    ? true
    : ctx.mustBe(`a non-empty name of at most ${SAVED_THEME_NAME_MAX_LENGTH} chars`),
)

const SavedThemeArkType = type({
  '+': 'reject',
  id: themeIdArkType,
  'name?': savedThemeNameArkType,
  light: CustomThemePaletteArkType,
  dark: CustomThemePaletteArkType,
})

const savedThemesArkType = SavedThemeArkType.array().narrow((themes, ctx) => {
  if (themes.length > MAX_SAVED_THEMES) {
    return ctx.mustBe(`at most ${MAX_SAVED_THEMES} saved themes`)
  }
  if (new Set(themes.map((theme) => theme.id)).size !== themes.length) {
    return ctx.mustBe('saved themes with unique ids')
  }
  return true
})

const ProjectThemeArkType = type({ '+': 'reject', preset: themeIdArkType })
  .or({ '+': 'reject', savedThemeId: themeIdArkType })

const PROJECT_ID_KEY = /^[1-9][0-9]{0,9}$/

const projectThemesArkType = type({ '[string]': ProjectThemeArkType }).narrow((themes, ctx) => {
  const keys = Object.keys(themes)
  if (keys.length > MAX_PROJECT_THEMES) {
    return ctx.mustBe(`at most ${MAX_PROJECT_THEMES} project themes`)
  }
  const invalid = keys.find((key) => !PROJECT_ID_KEY.test(key))
  return invalid === undefined ? true : ctx.mustBe(`keyed by project id (got "${invalid}")`)
})

export const UiSettingsArkType = type({
  'firstDayOfWeek?': firstDayOfWeekArkType,
  'defaultProjectId?': 'number.integer >= 1',
  'recentProjectIds?': recentProjectIdsArkType,
  'defaultView?': "'tasks' | 'kanban' | 'graph' | 'sprints' | 'calendar'",
  'calendarDragStep?': '5 | 10 | 15 | 30 | 60',
  'taskSortBy?': "'date' | 'priority'",
  'taskSortFirstNew?': '0 | 1',
  'showTaskId?': '0 | 1',
  'keyboardShortcuts?': '0 | 1',
  'primaryColor?': type.enumerated(...THEME_PRIMARY_COLORS),
  'neutralColor?': type.enumerated(...THEME_NEUTRAL_COLORS),
  'savedThemes?': savedThemesArkType,
  'activeSavedThemeId?': themeIdArkType,
  'projectThemes?': projectThemesArkType,
})

export type UiSettings = typeof UiSettingsArkType.infer

const SectionOrSettingsArkType = UiPreferencesSectionArkType.or(UiSettingsArkType)

export const UiPreferencesArkType = type({
  '[string]': SectionOrSettingsArkType,
}).narrow((obj, ctx) => {
  const keys = Object.keys(obj)
  if (keys.length > MAX_SECTIONS) {
    return ctx.mustBe(`at most ${MAX_SECTIONS} sections`)
  }
  for (const key of keys) {
    if (key.length === 0 || key.length > ID_MAX_LENGTH) {
      return ctx.mustBe(`section key length 1..${ID_MAX_LENGTH} (got "${key}")`)
    }
    if (!ID_PATTERN.test(key)) {
      return ctx.mustBe(`section key matching [a-zA-Z0-9_.\\-:]+ (got "${key}")`)
    }
    const value = (obj as Record<string, unknown>)[key]
    if (key === UI_SETTINGS_KEY) {
      if (Array.isArray(value)) {
        return ctx.mustBe(`"${UI_SETTINGS_KEY}" to be a settings object, not an array`)
      }
    } else if (!Array.isArray(value)) {
      return ctx.mustBe(`section "${key}" to be an array of items`)
    }
  }
  return true
})

export type UiPreferencesItem = typeof UiPreferencesItemArkType.infer
export type UiPreferences = typeof UiPreferencesArkType.infer

export type UpdateUiPreferencesArgs = {
  userId: number
  prefs: UiPreferences
}

export const MarkProjectUsedArkType = type({
  projectId: 'number.integer >= 1',
})

export type MarkProjectUsedArgs = {
  userId: number
  projectId: number
}

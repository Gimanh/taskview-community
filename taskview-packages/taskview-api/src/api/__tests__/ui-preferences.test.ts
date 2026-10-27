import { TvApi } from '@/tv'
import {
  THEME_NEUTRAL_COLORS,
  THEME_PRIMARY_COLORS,
  UI_SETTINGS_KEY,
  type CustomTheme,
  type UiPreferences,
  type UiSettings,
} from '@/api/ui-preferences.types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initApi } from './init-api'
import { expectApiError } from './automations-test-helpers'

/**
 * Preferences are one blob per user, so the suite works as the second user
 * and puts the original blob back at the end.
 */
describe('UI preferences: remembered task sort', () => {
  let api: TvApi
  let original: UiPreferences

  beforeAll(async () => {
    api = (await initApi()).$tvApiForSecondUser
    original = (await api.uiPreferences.fetch()) ?? {}
  })

  afterAll(async () => {
    await api.uiPreferences.update(original)
  })

  const settingsOf = (prefs: UiPreferences | null) => (prefs?.[UI_SETTINGS_KEY] ?? {}) as UiSettings

  it('stores the sort field and direction next to the other settings', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), defaultView: 'kanban', taskSortBy: 'priority', taskSortFirstNew: 0 },
    })
    expect(settingsOf(saved)).toMatchObject({ defaultView: 'kanban', taskSortBy: 'priority', taskSortFirstNew: 0 })

    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ taskSortBy: 'priority', taskSortFirstNew: 0 })
  })

  it('stores whether task cards show the task ID', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), showTaskId: 1 },
    })
    expect(settingsOf(saved)).toMatchObject({ showTaskId: 1 })
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ showTaskId: 1 })

    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { showTaskId: true as never } }),
      status: 400,
    })
  })

  it('stores whether keyboard shortcuts are turned off', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), keyboardShortcuts: 0 },
    })
    expect(settingsOf(saved)).toMatchObject({ keyboardShortcuts: 0 })
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ keyboardShortcuts: 0 })

    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { keyboardShortcuts: false as never } }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { keyboardShortcuts: 2 as never } }),
      status: 400,
    })
  })

  it('stores the theme accent and neutral colors', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), primaryColor: 'violet', neutralColor: 'stone' },
    })
    expect(settingsOf(saved)).toMatchObject({ primaryColor: 'violet', neutralColor: 'stone' })
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ primaryColor: 'violet', neutralColor: 'stone' })
  })

  it('accepts every color the theme picker offers', async () => {
    for (const primaryColor of THEME_PRIMARY_COLORS) {
      const saved = await api.uiPreferences.update({ [UI_SETTINGS_KEY]: { primaryColor } })
      expect(settingsOf(saved).primaryColor).toBe(primaryColor)
    }
    for (const neutralColor of THEME_NEUTRAL_COLORS) {
      const saved = await api.uiPreferences.update({ [UI_SETTINGS_KEY]: { neutralColor } })
      expect(settingsOf(saved).neutralColor).toBe(neutralColor)
    }
  })

  it('rejects a theme color outside the palette', async () => {
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { primaryColor: '#ff0000' as never } }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { primaryColor: 'zinc' as never } }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { neutralColor: 'blue' as never } }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { primaryColor: 'moss' as never } }),
      status: 400,
    })
  })

  const customTheme: CustomTheme = {
    light: { background: '#ffffff', surface: '#f4f7f5', border: '#d9e2dc', text: '#1f2a23', accent: '#16a34a' },
    dark: { background: '#1c2a20', surface: '#233a2c', border: '#2a4434', text: '#e2ebe5', accent: '#4ade80' },
  }

  it('stores a custom theme and whether it is turned on', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), customTheme, customThemeActive: 1 },
    })
    expect(settingsOf(saved)).toMatchObject({ customTheme, customThemeActive: 1 })
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ customTheme, customThemeActive: 1 })
  })

  it('rejects a custom theme color that is not a #rrggbb hex value', async () => {
    for (const value of ['red', '#fff', 'oklch(0.5 0.1 150)', '#000000;} body{display:none']) {
      await expectApiError({
        request: api.uiPreferences.update({
          [UI_SETTINGS_KEY]: { customTheme: { ...customTheme, dark: { ...customTheme.dark, background: value } } },
        }),
        status: 400,
      })
    }
  })

  it('rejects a custom theme with a missing or unknown color', async () => {
    const { accent: _accent, ...withoutAccent } = customTheme.light
    await expectApiError({
      request: api.uiPreferences.update({
        [UI_SETTINGS_KEY]: { customTheme: { ...customTheme, light: withoutAccent as never } },
      }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({
        [UI_SETTINGS_KEY]: { customTheme: { ...customTheme, light: { ...customTheme.light, shadow: '#000000' } as never } },
      }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { customThemeActive: 2 as never } }),
      status: 400,
    })
  })

  it('rejects a sort field or direction the task list does not support', async () => {
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { taskSortBy: 'name' as never } }),
      status: 400,
    })
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { taskSortFirstNew: 2 as never } }),
      status: 400,
    })
  })
})

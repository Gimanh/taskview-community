import { TvApi } from '@/tv'
import {
  THEME_NEUTRAL_COLORS,
  THEME_PRIMARY_COLORS,
  UI_SETTINGS_KEY,
  type CustomTheme,
  type SavedTheme,
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

  it('stores the project dashboard as the view a project opens on', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), defaultView: 'dashboard' },
    })
    expect(settingsOf(saved)).toMatchObject({ defaultView: 'dashboard' })
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ defaultView: 'dashboard' })
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

  const savedTheme: SavedTheme = { id: 'f6b7a7f2-2c7e-4d0e-9b1a-6a1c2c3d4e5f', name: 'Client work', ...customTheme }

  it('stores saved themes, the one turned on and the themes picked per project', async () => {
    const untitled: SavedTheme = { id: 'my-theme', ...customTheme }
    const settings: UiSettings = {
      savedThemes: [savedTheme, untitled],
      activeSavedThemeId: savedTheme.id,
      projectThemes: { 12: { preset: 'ocean' }, 7: { savedThemeId: untitled.id } },
    }
    const saved = await api.uiPreferences.update({ ...original, [UI_SETTINGS_KEY]: { ...settingsOf(original), ...settings } })
    expect(settingsOf(saved)).toMatchObject(settings)
    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject(settings)
  })

  it('keeps a project theme that points to a theme which no longer exists, so the app can fall back', async () => {
    const settings: UiSettings = { projectThemes: { 5: { savedThemeId: 'deleted-theme' }, 6: { preset: 'retired-preset' } } }
    const saved = await api.uiPreferences.update({ ...original, [UI_SETTINGS_KEY]: { ...settingsOf(original), ...settings } })
    expect(settingsOf(saved).projectThemes).toEqual(settings.projectThemes)
  })

  it('rejects a saved theme color that is not a #rrggbb hex value', async () => {
    for (const value of ['red', '#fff', 'oklch(0.5 0.1 150)', '#000000;} body{display:none']) {
      await expectApiError({
        request: api.uiPreferences.update({
          [UI_SETTINGS_KEY]: { savedThemes: [{ ...savedTheme, dark: { ...savedTheme.dark, background: value } }] },
        }),
        status: 400,
      })
    }
  })

  it('rejects saved themes with a bad id, name, color or extra field, duplicates, or more than the limit', async () => {
    const invalid: unknown[] = [
      [{ ...savedTheme, id: '' }],
      [{ ...savedTheme, id: 'has space' }],
      [{ ...savedTheme, id: 'x'.repeat(41) }],
      [{ ...savedTheme, name: '   ' }],
      [{ ...savedTheme, name: 'n'.repeat(61) }],
      [{ ...savedTheme, light: { ...savedTheme.light, shadow: '#000000' } }],
      [{ ...savedTheme, light: { background: '#ffffff' } }],
      [{ ...savedTheme, css: 'body{}' }],
      [savedTheme, { ...savedTheme, name: 'Copy' }],
      Array.from({ length: 21 }, (_, i) => ({ ...savedTheme, id: `theme-${i}` })),
    ]
    for (const savedThemes of invalid) {
      await expectApiError({
        request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { savedThemes: savedThemes as never } }),
        status: 400,
      })
    }
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { activeSavedThemeId: 'bad id' } }),
      status: 400,
    })
  })

  it('rejects project themes that are not keyed by project id or are not exactly one preset or saved theme', async () => {
    const invalid: unknown[] = [
      { abc: { preset: 'ocean' } },
      { 0: { preset: 'ocean' } },
      { '01': { preset: 'ocean' } },
      { 3: {} },
      { 3: { preset: 'ocean', savedThemeId: 'my-theme' } },
      { 3: { preset: 'ocean', color: '#ffffff' } },
      { 3: { preset: 'bad preset' } },
      { 3: 'ocean' },
    ]
    for (const projectThemes of invalid) {
      await expectApiError({
        request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { projectThemes: projectThemes as never } }),
        status: 400,
      })
    }
  })

  it('rejects more project themes than the limit', async () => {
    const projectThemes = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [String(i + 1), { preset: 'ocean' }]))
    await expectApiError({
      request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { projectThemes } }),
      status: 400,
    })
  })

  it('stores the recently used projects in order', async () => {
    const saved = await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), recentProjectIds: [12, 3, 7] },
    })
    expect(settingsOf(saved).recentProjectIds).toEqual([12, 3, 7])
    expect(settingsOf(await api.uiPreferences.fetch()).recentProjectIds).toEqual([12, 3, 7])
  })

  it('rejects recent projects that are not unique positive ids or exceed the limit', async () => {
    const invalid = [[1, 1], [0], [1.5], ['1'], Array.from({ length: 51 }, (_, i) => i + 1)]
    for (const recentProjectIds of invalid) {
      await expectApiError({
        request: api.uiPreferences.update({ [UI_SETTINGS_KEY]: { recentProjectIds: recentProjectIds as never } }),
        status: 400,
      })
    }
  })

  it('moves a used project to the front without touching other settings', async () => {
    await api.uiPreferences.update({
      ...original,
      [UI_SETTINGS_KEY]: { ...settingsOf(original), recentProjectIds: [12, 3, 7], defaultView: 'kanban' },
    })

    expect(await api.uiPreferences.markProjectUsed(7)).toEqual([7, 12, 3])
    expect(await api.uiPreferences.markProjectUsed(40)).toEqual([40, 7, 12, 3])

    expect(settingsOf(await api.uiPreferences.fetch())).toMatchObject({ recentProjectIds: [40, 7, 12, 3], defaultView: 'kanban' })
  })

  it('keeps only the most recent projects when marking one as used', async () => {
    const full = Array.from({ length: 50 }, (_, i) => i + 1)
    await api.uiPreferences.update({ ...original, [UI_SETTINGS_KEY]: { ...settingsOf(original), recentProjectIds: full } })

    const recent = await api.uiPreferences.markProjectUsed(100)
    expect(recent).toHaveLength(50)
    expect(recent?.[0]).toBe(100)
    expect(recent).not.toContain(50)
  })

  it('rejects marking something that is not a project id as used', async () => {
    for (const projectId of [0, -1, 1.5, '1']) {
      await expectApiError({ request: api.uiPreferences.markProjectUsed(projectId as never), status: 400 })
    }
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

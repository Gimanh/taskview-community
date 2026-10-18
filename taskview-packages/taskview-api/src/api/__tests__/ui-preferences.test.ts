import { TvApi } from '@/tv'
import { UI_SETTINGS_KEY, type UiPreferences, type UiSettings } from '@/api/ui-preferences.types'
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

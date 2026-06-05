import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { UI_SETTINGS_KEY, type UiPreferences, type UiPreferencesItem, type UiSettings } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

const SAVE_DEBOUNCE_MS = 250

type Sections = Record<string, UiPreferencesItem[]>

export const useUiPreferencesStore = defineStore('uiPreferences', () => {
  const prefs = ref<Sections>({})
  const settings = ref<UiSettings>({})
  const loaded = ref(false)
  const loading = ref(false)
  const saving = ref(false)

  function split(blob: UiPreferences): { sections: Sections; settings: UiSettings } {
    const { [UI_SETTINGS_KEY]: settingsEntry, ...sections } = blob
    return {
      sections: sections as Sections,
      settings: (settingsEntry as UiSettings | undefined) ?? {},
    }
  }

  async function fetch() {
    if (loading.value) return
    loading.value = true
    try {
      const result = await $tvApi.uiPreferences.fetch()
      const { sections, settings: s } = split(result ?? {})
      prefs.value = sections
      settings.value = s
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const flush = useDebounceFn(async () => {
    saving.value = true
    try {
      const payload: UiPreferences = { ...prefs.value }
      if (Object.keys(settings.value).length > 0) {
        payload[UI_SETTINGS_KEY] = settings.value
      }
      const result = await $tvApi.uiPreferences.update(payload)
      if (result) {
        const { sections, settings: s } = split(result)
        prefs.value = sections
        settings.value = s
      }
    } finally {
      saving.value = false
    }
  }, SAVE_DEBOUNCE_MS)

  function setSection(section: string, items: UiPreferencesItem[]) {
    prefs.value = { ...prefs.value, [section]: items }
    flush()
  }

  function getSection(section: string): UiPreferencesItem[] {
    return prefs.value[section] ?? []
  }

  function setSetting<K extends keyof UiSettings>(key: K, value: UiSettings[K]) {
    settings.value = { ...settings.value, [key]: value }
    flush()
  }

  return {
    prefs,
    settings,
    loaded,
    loading,
    saving,
    fetch,
    setSection,
    getSection,
    setSetting,
  }
})

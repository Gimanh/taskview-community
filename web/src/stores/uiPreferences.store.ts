import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { UiPreferences, UiPreferencesItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

const SAVE_DEBOUNCE_MS = 250

export const useUiPreferencesStore = defineStore('uiPreferences', () => {
  const prefs = ref<UiPreferences>({})
  const loaded = ref(false)
  const loading = ref(false)
  const saving = ref(false)

  async function fetch() {
    if (loading.value) return
    loading.value = true
    try {
      const result = await $tvApi.uiPreferences.fetch()
      prefs.value = result ?? {}
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const flush = useDebounceFn(async () => {
    saving.value = true
    try {
      const result = await $tvApi.uiPreferences.update(prefs.value)
      if (result) prefs.value = result
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

  return {
    prefs,
    loaded,
    loading,
    saving,
    fetch,
    setSection,
    getSection,
  }
})

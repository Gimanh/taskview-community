<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('uiCustomization.others.weekStart')"
                :description="t('uiCustomization.others.weekStartHint')">
      <USelectMenu v-model="weekStart"
                   :items="weekStartItems"
                   value-key="value"
                   class="w-full lg:w-72" />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FirstDayOfWeek } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

const { t } = useI18n()
const store = useUiPreferencesStore()

const DEFAULT = -1

const weekStart = computed<number>({
  get: () => store.settings.firstDayOfWeek ?? DEFAULT,
  set: (value) => {
    store.setSetting('firstDayOfWeek', value === DEFAULT ? undefined : (value as FirstDayOfWeek))
  },
})

const weekStartItems = computed(() => [
  { value: DEFAULT, label: t('uiCustomization.others.weekStartDefault') },
  { value: 1, label: t('uiCustomization.others.monday') },
  { value: 2, label: t('uiCustomization.others.tuesday') },
  { value: 3, label: t('uiCustomization.others.wednesday') },
  { value: 4, label: t('uiCustomization.others.thursday') },
  { value: 5, label: t('uiCustomization.others.friday') },
  { value: 6, label: t('uiCustomization.others.saturday') },
  { value: 0, label: t('uiCustomization.others.sunday') },
])
</script>

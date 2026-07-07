<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-elevated focus-visible:bg-elevated focus:outline-none"
    @click="onTap"
  >
    <SettingsIconTile
      icon="i-lucide-info"
      color="zinc"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
      {{ t('settings.version') }}
    </span>
    <span class="shrink-0 text-sm text-muted tabular-nums">
      v{{ appVersion }}{{ prodOrDev === 'dev' ? '_d' : '' }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUpdater } from '@/composables/useUpdater'
import { $ls } from '@/plugins/axios'
import SettingsIconTile from './SettingsIconTile.vue'

const { t } = useI18n()

const appVersion = APP_VERSION
const prodOrDev = ref<'prod' | 'dev'>('prod')
let counter = 0
let resetTimer: number
let toggleTimer: number

onMounted(async () => {
  prodOrDev.value = (await $ls.getValue('update_loading')) === 'dev' ? 'dev' : 'prod'
})

async function onTap() {
  counter++

  if (resetTimer) clearTimeout(resetTimer)
  if (toggleTimer) clearTimeout(toggleTimer)

  resetTimer = window.setTimeout(() => {
    counter = 0
  }, 500)

  if (counter === 7) {
    toggleTimer = window.setTimeout(async () => {
      const next = (await $ls.getValue('update_loading')) === 'dev' ? 'prod' : 'dev'
      await $ls.setValue('update_loading', next)
      prodOrDev.value = next
      await useUpdater(true)
      clearTimeout(toggleTimer)
    }, 2000)
  }
}
</script>

<template>
  <UModal
    v-model:open="shortcutsHelp.isOpen.value"
    :title="t('shortcuts.title')"
    :description="t('shortcuts.description')"
  >
    <template #body>
      <div
        class="flex flex-col gap-6"
        data-testid="shortcuts-help"
      >
        <UAlert
          v-if="!enabled"
          color="neutral"
          variant="soft"
          icon="i-lucide-keyboard-off"
          :title="t('shortcuts.turnedOff')"
          :actions="[{ label: t('shortcuts.openSettings'), color: 'neutral', variant: 'outline', onClick: openSettings }]"
        />

        <section
          v-for="scope in SHORTCUT_SCOPES"
          :key="scope"
          class="flex flex-col gap-1"
        >
          <h3 class="text-xs font-medium uppercase tracking-wide text-muted mb-1">
            {{ t(`shortcuts.scope.${scope}`) }}
          </h3>
          <div
            v-for="shortcut in shortcutsOfScope(scope)"
            :key="shortcut.labelKey"
            class="flex items-center justify-between gap-4 py-1.5"
          >
            <span class="text-sm">{{ t(shortcut.labelKey) }}</span>
            <span class="flex items-center gap-1 shrink-0">
              <UKbd
                v-for="kbd in shortcut.kbds"
                :key="kbd"
                :value="kbd"
              />
            </span>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { SHORTCUT_SCOPES, shortcutsOfScope } from '@/shortcuts/registry'
import { useShortcutsEnabled } from '@/shortcuts/useShortcutsEnabled'
import { useShortcutsHelp } from '@/shortcuts/useShortcutsHelp'

const { t } = useI18n()
const router = useRouter()
const enabled = useShortcutsEnabled()
const shortcutsHelp = useShortcutsHelp()

function openSettings() {
  shortcutsHelp.isOpen.value = false
  router.push({ name: 'ui-customization' })
}
</script>

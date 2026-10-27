<template>
  <MainScreenAddTaskDialog
    v-model="addTaskOpen"
    :title="t('msg.addTask')"
    :default-goal-id="currentGoalId"
    :default-list-id="currentListId"
    empty-deadline
  />

  <ShortcutsHelpModal />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import MainScreenAddTaskDialog from '@/components/features/main/screen-main/parts/MainScreenAddTaskDialog.vue'
import ShortcutsHelpModal from './ShortcutsHelpModal.vue'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { SHORTCUT_OPTIONS, isPlainKeyPress, openDialogCount } from '@/shortcuts/shortcut-guards'
import { SHORTCUTS, shortcutBinding } from '@/shortcuts/registry'
import { useShortcutsEnabled } from '@/shortcuts/useShortcutsEnabled'
import { useShortcutsHelp } from '@/shortcuts/useShortcutsHelp'

const { t } = useI18n()
const route = useRoute()
const { isOpen: isTaskOpen } = useTaskDetailPanel()
const enabled = useShortcutsEnabled()
const shortcutsHelp = useShortcutsHelp()

const addTaskOpen = ref(false)

const currentGoalId = computed(() => {
  const id = Number(route.params.projectId)
  return Number.isInteger(id) && id > 0 ? id : undefined
})

const currentListId = computed(() => {
  const id = Number(route.params.listId)

  return Number.isInteger(id) && id > 0 ? id : undefined
})

function canHandle(event: KeyboardEvent) {
  if (!enabled.value || !isPlainKeyPress(event)) return false
  return openDialogCount() <= (isTaskOpen.value ? 1 : 0)
}

function openAddTask(event: KeyboardEvent) {
  if (canHandle(event)) addTaskOpen.value = true
}

function openShortcutsHelp(event: KeyboardEvent) {
  if (canHandle(event)) shortcutsHelp.open()
}

defineShortcuts({ [shortcutBinding(SHORTCUTS.addTask)]: openAddTask }, SHORTCUT_OPTIONS)
// "?" is matched by the typed character: it sits on different keys in different layouts
defineShortcuts({ 'shift_?': openShortcutsHelp })
</script>

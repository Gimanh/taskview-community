<template>
  <div
    class="flex flex-col gap-4 p-2"
    data-testid="automations-project-tab"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-muted">
        {{ t('automations.description') }}
      </p>
      <UButton
        v-if="canManage"
        :label="t('automations.create')"
        icon="i-lucide-plus"
        data-testid="automation-create"
        @click="openCreate"
      />
    </div>

    <div
      v-if="loading && rules.length === 0"
      class="flex justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <UEmpty
      v-else-if="rules.length === 0"
      icon="i-lucide-workflow"
      :title="t('automations.empty')"
      :description="t('automations.emptyHint')"
    />

    <div
      v-else
      class="flex flex-col gap-2"
    >
      <AutomationRuleRow
        v-for="rule in rules"
        :key="rule.id"
        :rule="rule"
        :modules="modules"
        :can-manage="canManage"
        :toggling="togglingId === rule.id"
        @toggle="(enabled) => toggle({ rule, enabled })"
        @edit="openEdit(rule)"
        @delete="ruleToDelete = rule"
      />
    </div>

    <AutomationRuleFormDialog
      v-model:open="formOpen"
      :goal-id="goalId"
      :rule="editedRule"
    />
    <AutomationRuleDeleteDialog
      v-model:rule="ruleToDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationDataSourceName, AutomationRule } from 'taskview-api'
import AutomationRuleRow from './parts/AutomationRuleRow.vue'
import AutomationRuleFormDialog from './parts/AutomationRuleFormDialog.vue'
import AutomationRuleDeleteDialog from './parts/AutomationRuleDeleteDialog.vue'
import { useAutomationsStore } from '@/stores/automations.store'
import { useAutomationLabels } from '@/composables/useAutomationLabels'
import type { AutomationToggleRuleArgs } from '@/types/automations.types'

const props = defineProps<{
  goalId: number
  canManage: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const store = useAutomationsStore()
const { errorMessage } = useAutomationLabels()

const formOpen = ref(false)
const editedRule = ref<AutomationRule | null>(null)
const ruleToDelete = ref<AutomationRule | null>(null)
const togglingId = ref<number | null>(null)

const modules = computed(() => store.catalog?.modules ?? [])
const rules = computed(() => store.rulesFor(props.goalId))
const loading = computed(() => store.loadingGoals[props.goalId] ?? false)

function sourcesOf(): AutomationDataSourceName[] {
  const sources = new Set<AutomationDataSourceName>()
  for (const module of modules.value) {
    for (const item of [...module.events, ...module.actions]) {
      for (const definition of item.params) sources.add(definition.source)
    }
  }
  return [...sources]
}

async function load() {
  await store.fetchCatalog()
  await Promise.all([
    store.fetchRules(props.goalId),
    ...sourcesOf().map((source) => store.fetchOptions({ goalId: props.goalId, source })),
  ])
}

watch(() => props.goalId, load, { immediate: true })

function openCreate() {
  editedRule.value = null
  formOpen.value = true
}

function openEdit(rule: AutomationRule) {
  editedRule.value = rule
  formOpen.value = true
}

async function toggle(args: AutomationToggleRuleArgs) {
  togglingId.value = args.rule.id
  const result = await store.toggleRule(args)
  togglingId.value = null
  if (!result.ok) {
    toast.add({ title: errorMessage(result.error), color: 'error' })
    return
  }
  toast.add({ title: t(args.enabled ? 'automations.toasts.enabled' : 'automations.toasts.disabled'), color: 'success' })
}

async function confirmDelete() {
  const rule = ruleToDelete.value
  if (!rule) return
  ruleToDelete.value = null
  const deleted = await store.deleteRule(rule)
  toast.add(deleted
    ? { title: t('automations.toasts.deleted'), color: 'success' }
    : { title: t('automations.errors.deleteFailed'), color: 'error' })
}
</script>

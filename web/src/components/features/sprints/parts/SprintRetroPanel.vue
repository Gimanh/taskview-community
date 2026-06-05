<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('sprints.retro.title') }}
        </h3>
        <UButton
          v-if="canManage"
          :label="t('sprints.actions.saveRetro')"
          icon="i-lucide-save"
          size="sm"
          :loading="loading"
          :disabled="!dirty"
          @click="save"
        />
      </div>
    </template>

    <UTabs
      v-if="isMobile"
      :items="tabItems"
      class="w-full"
    >
      <template #content="{ item }">
        <UTextarea
          v-model="fields[item.value as RetroKey]"
          :rows="6"
          :disabled="!canManage"
          :placeholder="t(`sprints.retro.${item.value}Placeholder`)"
          class="mt-3 w-full"
        />
      </template>
    </UTabs>

    <div
      v-else
      class="grid grid-cols-3 gap-4"
    >
      <div
        v-for="key in retroKeys"
        :key="key"
        class="flex flex-col gap-2"
      >
        <label class="text-sm font-medium">{{ t(`sprints.retro.${key}`) }}</label>
        <UTextarea
          v-model="fields[key]"
          :rows="8"
          :disabled="!canManage"
          :placeholder="t(`sprints.retro.${key}Placeholder`)"
          class="w-full"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SprintRetro } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintsStore } from '@/stores/sprints.store'

type RetroKey = 'wentWell' | 'wentBad' | 'actionItems'

const props = defineProps<{
  sprintId: number
  retro: SprintRetro | null
  canManage: boolean
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const toast = useToast()
const sprintsStore = useSprintsStore()

const retroKeys: RetroKey[] = ['wentWell', 'wentBad', 'actionItems']

const fields = reactive<Record<RetroKey, string>>({
  wentWell: props.retro?.wentWell ?? '',
  wentBad: props.retro?.wentBad ?? '',
  actionItems: props.retro?.actionItems ?? '',
})

const loading = ref(false)

watch(
  () => props.retro,
  (retro) => {
    fields.wentWell = retro?.wentWell ?? ''
    fields.wentBad = retro?.wentBad ?? ''
    fields.actionItems = retro?.actionItems ?? ''
  },
)

const dirty = computed(
  () =>
    fields.wentWell !== (props.retro?.wentWell ?? '') ||
    fields.wentBad !== (props.retro?.wentBad ?? '') ||
    fields.actionItems !== (props.retro?.actionItems ?? ''),
)

const tabItems = computed(() =>
  retroKeys.map((key) => ({ value: key, label: t(`sprints.retro.${key}`) })),
)

async function save() {
  loading.value = true
  try {
    const ok = await sprintsStore.saveRetro({
      sprintId: props.sprintId,
      wentWell: fields.wentWell.trim() || null,
      wentBad: fields.wentBad.trim() || null,
      actionItems: fields.actionItems.trim() || null,
    })
    if (ok) toast.add({ title: t('sprints.toasts.retroSaved'), color: 'success' })
  } finally {
    loading.value = false
  }
}
</script>

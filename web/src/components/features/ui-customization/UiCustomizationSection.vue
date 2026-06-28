<template>
  <UCard variant="soft" data-testid="ui-customization-section">
    <template #header>
      <h3 class="font-semibold">
        {{ title }}
      </h3>
    </template>

    <div
      v-if="resolved.length === 0"
      class="py-6 text-center text-sm text-muted"
    >
      {{ t('uiCustomization.empty') }}
    </div>

    <draggable
      v-else
      :list="localItems"
      :animation="150"
      handle=".drag-handle"
      item-key="id"
      class="flex flex-col gap-2"
      @end="emitChange"
    >
      <template #item="{ element }">
        <UiCustomizationItem
          :label="element.label"
          :hidden="element.hidden"
          :width="element.width"
          @toggle="toggleHidden(element.id)"
          @toggle-width="toggleWidth(element.id)"
        />
      </template>
    </draggable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import type { UiPreferencesItem } from 'taskview-api'
import type { ResolvedItem } from '@/composables/useUiPreferences'
import UiCustomizationItem from './UiCustomizationItem.vue'

const props = defineProps<{
  title: string
  resolved: ResolvedItem[]
}>()

const emit = defineEmits<{
  change: [items: UiPreferencesItem[]]
}>()

const { t } = useI18n()

const localItems = ref<ResolvedItem[]>([])

watch(() => props.resolved, (next) => {
  localItems.value = next.map(r => ({ ...r }))
}, { immediate: true, deep: true })

const serialized = computed<UiPreferencesItem[]>(() =>
  localItems.value.map((item, idx) => ({
    id: item.id,
    order: idx,
    hidden: item.hidden,
    ...(item.width !== undefined ? { width: item.width } : {}),
  })),
)

function toggleHidden(id: string) {
  const target = localItems.value.find(item => item.id === id)
  if (!target) return
  target.hidden = !target.hidden
  emitChange()
}

function toggleWidth(id: string) {
  const target = localItems.value.find(item => item.id === id)
  if (!target || !target.width) return
  target.width = target.width === 'wide' ? 'narrow' : 'wide'
  emitChange()
}

function emitChange() {
  emit('change', serialized.value)
}
</script>

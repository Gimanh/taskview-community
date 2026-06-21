<template>
  <UPopover
    v-if="withActivator"
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{ content: 'rounded-2xl' }"
  >
    <UButton
      :disabled="disabled"
      color="neutral"
      variant="soft"
      block
      size="xl"
      :icon="activatorIcon || (multiple ? placeholderIcon : current?.icon) || placeholderIcon"
      :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :ui="activatorUi((multiple ? undefined : current?.iconClass) ?? 'text-muted')"
    >
      <span
        class="flex-1 text-left truncate min-w-0"
        :class="hasSelection ? '' : 'text-muted'"
        :style="!multiple && current?.color ? { color: current.color } : undefined"
      >{{ activatorLabel }}</span>
    </UButton>

    <template #content>
      <div class="p-2 min-w-56">
        <TvDropdownOptions
          v-model="model"
          :items="items"
          :disabled="disabled"
          :multiple="multiple"
          @update:model-value="onSelect"
        />
      </div>
    </template>
  </UPopover>

  <TvDropdownOptions
    v-else
    v-model="model"
    :items="items"
    :disabled="disabled"
    :multiple="multiple"
  />
</template>

<script setup lang="ts" generic="V, T = V">
import { ref, computed } from 'vue'
import TvDropdownOptions from '@/components/features/base/TvDropdownOptions.vue'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'
import type { TvDropdownOption } from '@/types/tvDropdown.types'

const model = defineModel<T>()

const {
  items,
  withActivator = true,
  disabled = false,
  placeholder = '',
  placeholderIcon = '',
  activatorIcon = '',
  multiple = false,
} = defineProps<{
  items: TvDropdownOption<V>[]
  withActivator?: boolean
  disabled?: boolean
  placeholder?: string
  placeholderIcon?: string
  /** Fixed activator icon — overrides the selected option's icon. */
  activatorIcon?: string
  multiple?: boolean
}>()

const { activatorUi } = useNuxtUiTaskItemStyles()

const open = ref(false)
const current = computed(() => items.find(o => o.value === (model.value as unknown as V)))
const selectedOptions = computed(() => {
  if (Array.isArray(model.value)) {
    const selected = model.value as V[]
    return items.filter(o => selected.includes(o.value))
  }
  return current.value ? [current.value] : []
})
const hasSelection = computed(() => selectedOptions.value.length > 0)
const activatorLabel = computed(() => {
  if (multiple) {
    return selectedOptions.value.length
      ? selectedOptions.value.map(o => o.label).join(', ')
      : placeholder
  }
  return current.value?.label ?? placeholder
})

function onSelect() {
  if (!multiple) open.value = false
}
</script>
